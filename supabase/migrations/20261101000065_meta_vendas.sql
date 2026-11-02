-- 0065: meta de vendas do mês com projeção (D-064). Pode rodar de novo.
-- Uma meta por loja e mês (vale a última definida até ela ser trocada). Com várias lojas, "todas as lojas"
-- soma as metas. A projeção usa a média de cada dia da semana nas últimas 8 semanas (sexta vende mais
-- que segunda), então funciona melhor que "vendido ÷ dias × 30". Valores em centavos, como o Resumo.

create table if not exists public.metas_vendas (
  loja_id   uuid not null references public.lojas (id) on delete cascade,
  mes       date not null check (extract(day from mes) = 1),
  valor     numeric(14, 2) not null check (valor > 0),
  criado_por uuid default auth.uid(),
  atualizado_em timestamptz not null default now(),
  primary key (loja_id, mes)
);
alter table public.metas_vendas enable row level security;
drop policy if exists metas_ler on public.metas_vendas;
create policy metas_ler on public.metas_vendas for select to authenticated using (private.tem_permissao(loja_id, 'relatorios'));
drop policy if exists metas_gestor on public.metas_vendas;
create policy metas_gestor on public.metas_vendas for all to authenticated using (private.e_gestor(loja_id)) with check (private.e_gestor(loja_id));
grant select, insert, update, delete on public.metas_vendas to authenticated;
revoke all on public.metas_vendas from anon;

-- Define a meta do mês (p_valor nulo ou 0 = tira a meta deste mês).
create or replace function public.salvar_meta_vendas(p_loja uuid, p_mes date, p_valor numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_mes date := date_trunc('month', p_mes)::date;
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente definem a meta.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(p_valor, 0) <= 0 then
    delete from public.metas_vendas where loja_id = p_loja and mes = v_mes;
    return;
  end if;
  insert into public.metas_vendas (loja_id, mes, valor) values (p_loja, v_mes, round(p_valor, 2))
  on conflict (loja_id, mes) do update set valor = excluded.valor, atualizado_em = now(), criado_por = auth.uid();
end;
$$;
revoke execute on function public.salvar_meta_vendas(uuid, date, numeric) from anon, public;
grant execute on function public.salvar_meta_vendas(uuid, date, numeric) to authenticated;

-- Tudo que a tela da meta precisa, das lojas que a pessoa vê nos relatórios.
create or replace function public.meta_vendas(p_lojas uuid[], p_mes date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lojas uuid[];
  v_fuso  text;
  v_mes   date := date_trunc('month', p_mes)::date;
  v_hoje  date;
  v_ini   timestamptz;
  v_fim   timestamptz;
begin
  select coalesce(array_agg(id), '{}') into v_lojas from unnest(p_lojas) id where private.tem_permissao(id, 'relatorios');
  if cardinality(v_lojas) = 0 then
    return null;
  end if;
  select fuso_horario into v_fuso from public.lojas where id = v_lojas[1];
  v_fuso := coalesce(v_fuso, 'America/Sao_Paulo');
  v_hoje := (now() at time zone v_fuso)::date;
  v_ini := v_mes::timestamp at time zone v_fuso;
  v_fim := (v_mes + interval '1 month')::timestamp at time zone v_fuso;
  return jsonb_build_object(
    'mes', v_mes,
    'hoje', v_hoje,
    'lojas', (
      select jsonb_agg(jsonb_build_object(
               'loja_id', l.id, 'loja', l.nome,
               'meta', (select round(m.valor * 100) from public.metas_vendas m where m.loja_id = l.id and m.mes <= v_mes order by m.mes desc limit 1),
               'meta_do_mes', exists (select 1 from public.metas_vendas m where m.loja_id = l.id and m.mes = v_mes),
               'vendido', (select coalesce(round(sum(p.total) * 100), 0) from public.pedidos p
                            where p.loja_id = l.id and p.status <> 'cancelado' and p.criado_em >= v_ini and p.criado_em < v_fim))
             order by l.nome)
        from public.lojas l where l.id = any (v_lojas)),
    -- vendido por dia do mês (todas as lojas pedidas)
    'dias', coalesce((
      select jsonb_object_agg(d.dia, d.v)
        from (select (p.criado_em at time zone v_fuso)::date as dia, round(sum(p.total) * 100) as v
                from public.pedidos p
               where p.loja_id = any (v_lojas) and p.status <> 'cancelado' and p.criado_em >= v_ini and p.criado_em < v_fim
               group by 1) d), '{}'::jsonb),
    -- média de cada dia da semana (0 = domingo) nas 8 semanas antes de hoje
    'media_semana', (
      select jsonb_agg(coalesce(x.v, 0) order by g.dow)
        from generate_series(0, 6) g(dow)
        left join (select extract(dow from (p.criado_em at time zone v_fuso))::int as dow, round(sum(p.total) * 100 / 8) as v
                     from public.pedidos p
                    where p.loja_id = any (v_lojas) and p.status <> 'cancelado'
                      and p.criado_em >= ((v_hoje - 56)::timestamp at time zone v_fuso) and p.criado_em < (v_hoje::timestamp at time zone v_fuso)
                    group by 1) x on x.dow = g.dow),
    'dias_com_historico', (select count(distinct (p.criado_em at time zone v_fuso)::date) from public.pedidos p
                            where p.loja_id = any (v_lojas) and p.status <> 'cancelado'
                              and p.criado_em >= ((v_hoje - 56)::timestamp at time zone v_fuso) and p.criado_em < (v_hoje::timestamp at time zone v_fuso)),
    -- mês anterior: até o mesmo dia e inteiro
    'anterior_ate_hoje', (select coalesce(round(sum(p.total) * 100), 0) from public.pedidos p
                           where p.loja_id = any (v_lojas) and p.status <> 'cancelado'
                             and p.criado_em >= ((v_mes - interval '1 month')::timestamp at time zone v_fuso)
                             and p.criado_em < (((v_mes - interval '1 month') + make_interval(days => least(extract(day from v_hoje)::int, 28)))::timestamp at time zone v_fuso)),
    'anterior_total', (select coalesce(round(sum(p.total) * 100), 0) from public.pedidos p
                        where p.loja_id = any (v_lojas) and p.status <> 'cancelado'
                          and p.criado_em >= ((v_mes - interval '1 month')::timestamp at time zone v_fuso) and p.criado_em < v_ini)
  );
end;
$$;
revoke execute on function public.meta_vendas(uuid[], date) from anon, public;
grant execute on function public.meta_vendas(uuid[], date) to authenticated;
