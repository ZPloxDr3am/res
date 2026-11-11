-- Etapa 2 da análise (D-084): erros do navegador e do servidor ficam registrados e aparecem no
-- painel da empresa. Sem serviço de fora. Pode rodar de novo sem quebrar.

create table if not exists private.erros_app (
  id          bigint generated always as identity primary key,
  hash        text not null,
  hora        timestamptz not null,               -- agrupa o mesmo erro por hora
  origem      text not null check (origem in ('navegador', 'servidor')),
  mensagem    text not null,
  pilha       text,
  caminho     text,
  digest      text,
  navegador   text,
  user_id     uuid,
  loja_id     uuid,
  vezes       integer not null default 1,
  primeiro_em timestamptz not null default now(),
  ultimo_em   timestamptz not null default now(),
  unique (hash, hora)
);
create index if not exists erros_app_ultimo on private.erros_app (ultimo_em desc);

-- quem estiver na página (logado ou não) registra; textos cortados, mesmo erro só soma "vezes",
-- e um teto por hora segura enxurrada
create or replace function public.registrar_erro(p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_msg  text := left(coalesce(nullif(btrim(p ->> 'mensagem'), ''), 'Erro sem mensagem'), 500);
  v_cam  text := left(p ->> 'caminho', 300);
  v_ori  text := case when p ->> 'origem' = 'servidor' then 'servidor' else 'navegador' end;
  v_hora timestamptz := date_trunc('hour', now());
  v_hash text;
  v_loja uuid;
begin
  if (select count(*) from private.erros_app where hora = v_hora) >= 500 then
    return;
  end if;
  v_hash := md5(v_ori || '|' || v_msg || '|' || coalesce(regexp_replace(v_cam, '[0-9a-f-]{36}|\d+', '#', 'g'), ''));
  if coalesce(p ->> 'loja_id', '') ~ '^[0-9a-f-]{36}$' then
    v_loja := (p ->> 'loja_id')::uuid;
  end if;
  insert into private.erros_app (hash, hora, origem, mensagem, pilha, caminho, digest, navegador, user_id, loja_id)
  values (v_hash, v_hora, v_ori, v_msg, left(p ->> 'pilha', 4000), v_cam, left(p ->> 'digest', 100), left(p ->> 'navegador', 300), auth.uid(), v_loja)
  on conflict (hash, hora) do update set vezes = private.erros_app.vezes + 1, ultimo_em = now(),
    user_id = coalesce(excluded.user_id, private.erros_app.user_id), loja_id = coalesce(excluded.loja_id, private.erros_app.loja_id);
end;
$$;
revoke execute on function public.registrar_erro(jsonb) from public;
grant execute on function public.registrar_erro(jsonb) to anon, authenticated;

-- painel da empresa: erros agrupados dos últimos dias
create or replace function public.erros_recentes(p_dias integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((
    select jsonb_agg(g order by g.ultimo_em desc)
      from (select e.hash, max(e.origem) as origem, max(e.mensagem) as mensagem, max(e.caminho) as caminho, max(e.pilha) as pilha,
                   max(e.digest) as digest, sum(e.vezes) as vezes, min(e.primeiro_em) as primeiro_em, max(e.ultimo_em) as ultimo_em,
                   count(distinct e.user_id) as pessoas,
                   (select string_agg(distinct l.nome, ', ') from private.erros_app e2 join public.lojas l on l.id = e2.loja_id where e2.hash = e.hash) as lojas
              from private.erros_app e
             where e.ultimo_em > now() - make_interval(days => greatest(1, least(90, p_dias)))
             group by e.hash) g), '[]'::jsonb);
end;
$$;
grant execute on function public.erros_recentes(integer) to authenticated;

-- limpeza: guarda 90 dias
create or replace function private.limpar_erros_app()
returns void language sql security definer set search_path = '' as $$
  delete from private.erros_app where ultimo_em < now() - interval '90 days';
$$;
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('res-limpar-erros', '17 4 * * *', 'select private.limpar_erros_app()');
  end if;
exception when others then raise notice 'limpeza de erros não agendada: %', sqlerrm;
end $$;

-- números da plataforma ganham os erros das últimas 24 h
create or replace function public.erros_24h()
returns integer language sql stable security definer set search_path = '' as $$
  select case when private.e_equipe_res() then coalesce((select sum(vezes)::int from private.erros_app where ultimo_em > now() - interval '24 hours'), 0) end;
$$;
grant execute on function public.erros_24h() to authenticated;
