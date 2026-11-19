-- Auditoria de engenharia (19/11/2026), P2: a equipe só via erro abrindo o painel da empresa.
-- Agora, a cada 5 minutos, o banco junta o que precisa de atenção e avisa por e-mail (Resend) e por
-- WhatsApp (CallMeBot), cada canal só se a chave dele estiver no Vault:
--   1. erro novo (que não aparecia havia 7 dias) registrado pelo painel ou pelo servidor;
--   2. fila de impressão parada (cupom sem sair há mais de 5 min) numa impressora que usa o agente;
--   3. pedido de app que nem a nova tentativa automática conseguiu processar (parado há 15 min).
-- Cada alerta sai uma vez (tabela private.alertas_enviados); a impressão repete no máximo 1 vez por hora por loja.
-- Segredos (o dono cadastra no Vault, nunca no código):
--   alerta_resend_chave, alerta_email_para (e opcional alerta_email_de) e/ou alerta_whatsapp_numero, alerta_callmebot_chave.
-- Pode rodar de novo.

create table if not exists private.alertas_enviados (
  id         bigserial primary key,
  tipo       text not null,
  chave      text not null,
  enviado_em timestamptz not null default now(),
  unique (tipo, chave)
);
alter table private.alertas_enviados enable row level security;

-- O que avisar agora (não envia nada).
create or replace function private.alertas_pendentes(p_agora timestamptz default now())
returns table (tipo text, chave text, texto text)
language sql
stable
security definer
set search_path = ''
as $$
  select * from (
    -- 1. erro novo
    select 'erro'::text, e.hash,
           format('Erro novo (%s): %s%s', e.origem, left(e.mensagem, 140), coalesce(' · ' || left(e.caminho, 60), ''))
      from (select distinct on (x.hash) x.hash, x.origem, x.mensagem, x.caminho
              from private.erros_app x
             where x.primeiro_em > p_agora - interval '15 minutes'
             order by x.hash, x.primeiro_em) e
     where not exists (select 1 from private.erros_app v
                        where v.hash = e.hash
                          and v.primeiro_em <= p_agora - interval '15 minutes'
                          and v.primeiro_em > p_agora - interval '7 days')
    union all
    -- 2. fila de impressão parada (só impressoras que o agente já alcançou)
    select 'impressao'::text, i.loja_id::text || ':' || to_char(date_trunc('hour', p_agora), 'YYYYMMDDHH24'),
           format('Impressão parada em %s: %s cupom(ns) sem sair há mais de 5 min.', l.nome, count(*))
      from public.impressoes i
      join public.impressoras imp on imp.id = i.impressora_id and imp.ultimo_sinal is not null
      join public.lojas l on l.id = i.loja_id
     where i.status in ('pendente', 'imprimindo', 'erro')
       and i.criado_em < p_agora - interval '5 minutes'
       and i.criado_em > p_agora - interval '2 hours'
     group by i.loja_id, l.nome
    union all
    -- 3. pedido de app parado mesmo depois da nova tentativa automática
    select 'app'::text, e.canal || ':' || e.evento_id,
           format('Pedido de app parado (%s, %s): %s', e.canal, e.codigo, coalesce(left(e.erro, 140), 'ainda não processado'))
      from private.marketplace_eventos e
     where e.processado_em is null
       and e.corpo is not null
       and e.recebido_em < p_agora - interval '15 minutes'
       and e.recebido_em > p_agora - interval '6 hours'
  ) a (tipo, chave, texto)
  where not exists (select 1 from private.alertas_enviados s where s.tipo = a.tipo and s.chave = a.chave);
$$;
revoke all on function private.alertas_pendentes(timestamptz) from public, anon, authenticated;

-- Envia um texto pelos canais configurados. Devolve os canais usados (nunca as chaves).
create or replace function private.alerta_enviar(p_assunto text, p_texto text)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_resend text; v_para text; v_de text; v_numero text; v_cmb text;
  v_canais text[] := '{}';
begin
  if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null
     or to_regclass('vault.decrypted_secrets') is null then
    return v_canais;
  end if;
  execute $q$select max(decrypted_secret) filter (where name = 'alerta_resend_chave'),
                    max(decrypted_secret) filter (where name = 'alerta_email_para'),
                    max(decrypted_secret) filter (where name = 'alerta_email_de'),
                    max(decrypted_secret) filter (where name = 'alerta_whatsapp_numero'),
                    max(decrypted_secret) filter (where name = 'alerta_callmebot_chave')
               from vault.decrypted_secrets$q$
     into v_resend, v_para, v_de, v_numero, v_cmb;

  if coalesce(v_resend, '') <> '' and coalesce(v_para, '') <> '' then
    execute 'select net.http_post(url := $1, body := $2, params := ''{}''::jsonb, headers := $3, timeout_milliseconds := 15000)'
      using 'https://api.resend.com/emails',
            jsonb_build_object('from', coalesce(nullif(v_de, ''), 'SINO alertas <onboarding@resend.dev>'),
                               'to', string_to_array(replace(v_para, ' ', ''), ','),
                               'subject', left(p_assunto, 150), 'text', p_texto),
            jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_resend);
    v_canais := array_append(v_canais, 'email');
  end if;

  if coalesce(v_numero, '') <> '' and coalesce(v_cmb, '') <> '' and to_regprocedure('net.http_get(text,jsonb,jsonb,integer)') is not null then
    execute 'select net.http_get(url := $1, params := $2, headers := ''{}''::jsonb, timeout_milliseconds := 15000)'
      using 'https://api.callmebot.com/whatsapp.php',
            jsonb_build_object('phone', regexp_replace(v_numero, '\D', '', 'g'), 'apikey', v_cmb, 'text', left(p_texto, 1000));
    v_canais := array_append(v_canais, 'whatsapp');
  end if;
  return v_canais;
end;
$$;
revoke all on function private.alerta_enviar(text, text) from public, anon, authenticated;

-- A cada 5 minutos: junta os alertas novos numa mensagem só.
create or replace function private.alertas_tique()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_linhas text[];
  v_tipos  text[];
  v_chaves text[];
  v_total  int;
  v_canais text[];
begin
  select count(*), array_agg('- ' || texto order by tipo, texto), array_agg(tipo), array_agg(chave)
    into v_total, v_linhas, v_tipos, v_chaves
    from private.alertas_pendentes(now());
  if v_total = 0 then return; end if;
  v_canais := private.alerta_enviar(
    format('SINO: %s alerta(s)', v_total),
    format(E'SINO · %s alerta(s)\n%s%s\nPainel: https://res-iqzs.vercel.app/empresa/erros',
           v_total, array_to_string(v_linhas[1:10], E'\n'),
           case when v_total > 10 then format(E'\n… e mais %s', v_total - 10) else '' end));
  -- sem canal configurado não marca como enviado: quando configurar, recebe o que estiver valendo
  if cardinality(v_canais) > 0 then
    insert into private.alertas_enviados (tipo, chave)
    select t, c from unnest(v_tipos, v_chaves) as u (t, c) on conflict do nothing;
  end if;
end;
$$;
revoke all on function private.alertas_tique() from public, anon, authenticated;

-- Para a equipe RES conferir a configuração: manda uma mensagem de teste e diz por quais canais saiu.
create or replace function public.testar_alertas()
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- equipe RES logada, ou o dono no SQL Editor do Supabase (sessão do postgres, sem usuário do app)
  if not (private.e_equipe_res() or (auth.uid() is null and session_user = 'postgres')) then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  return private.alerta_enviar('SINO: teste de alerta', 'SINO · teste de alerta. Se chegou, os avisos de erro estão ligados.');
end;
$$;
revoke all on function public.testar_alertas() from public, anon;
grant execute on function public.testar_alertas() to authenticated;

-- limpa o registro de alertas com mais de 30 dias junto com a rodada
create or replace function private.alertas_limpar()
returns void language sql security definer set search_path = '' as $$
  delete from private.alertas_enviados where enviado_em < now() - interval '30 days';
$$;
revoke all on function private.alertas_limpar() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('res-alertas', '*/5 * * * *', 'select private.alertas_tique()');
    perform cron.schedule('res-alertas-limpar', '41 5 * * *', 'select private.alertas_limpar()');
  end if;
exception when others then raise notice 'Alertas não agendados: %', sqlerrm;
end $$;
