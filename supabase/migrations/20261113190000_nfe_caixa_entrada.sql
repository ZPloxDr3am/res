-- D-102: CAIXA DE ENTRADA DE NF-e. Com o certificado A1 (e-CNPJ) do restaurante, o RES busca sozinho na
-- SEFAZ (Distribuição de DF-e do Ambiente Nacional) as notas emitidas contra o CNPJ da loja, manda a
-- "Ciência da Operação" e baixa o XML completo; o dono só confere e dá entrada no estoque.
-- * Certificado e senha ficam no Vault do Supabase (criptografados); nenhuma função devolve isso ao app,
--   só a de serviço que o servidor usa para falar com a SEFAZ.
-- * Regra da SEFAZ contra consumo indevido: sem novidade (137) ou fila em dia, nova busca só após 1 hora.
-- Pode rodar de novo.

-- 1. Segredos: Vault no Supabase; tabela privada só onde não há Vault (banco de testes)
create table if not exists private.nfe_segredos (id uuid primary key default gen_random_uuid(), valor text not null);
revoke all on private.nfe_segredos from public, anon, authenticated;

create or replace function private.nfe_guardar(p_id uuid, p_valor text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid := p_id;
begin
  if to_regclass('vault.secrets') is not null then
    if v is not null and exists (select 1 from vault.secrets where id = v) then
      execute 'select vault.update_secret($1, $2)' using v, p_valor;
    else
      execute 'select vault.create_secret($1, $2, $3)' into v using p_valor, 'res_nfe_' || gen_random_uuid(), 'Certificado A1 (caixa de entrada de NF-e)';
    end if;
  else
    insert into private.nfe_segredos (id, valor) values (coalesce(v, gen_random_uuid()), p_valor)
    on conflict (id) do update set valor = excluded.valor returning id into v;
  end if;
  return v;
end;
$$;

create or replace function private.nfe_ler(p_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v text;
begin
  if p_id is null then return null; end if;
  if to_regclass('vault.decrypted_secrets') is not null then
    execute 'select decrypted_secret from vault.decrypted_secrets where id = $1' into v using p_id;
  else
    select valor into v from private.nfe_segredos where id = p_id;
  end if;
  return v;
end;
$$;

create or replace function private.nfe_apagar(p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_id is null then return; end if;
  if to_regclass('vault.secrets') is not null then
    execute 'delete from vault.secrets where id = $1' using p_id;
  else
    delete from private.nfe_segredos where id = p_id;
  end if;
end;
$$;
revoke execute on function private.nfe_guardar(uuid, text), private.nfe_ler(uuid), private.nfe_apagar(uuid) from public, anon, authenticated;

-- 2. Certificado por loja e notas recebidas
create table if not exists private.nfe_certificados (
  loja_id          uuid primary key references public.lojas (id) on delete cascade,
  cnpj             text not null check (cnpj ~ '^[0-9]{14}$'),   -- CNPJ consultado (o da loja)
  cnpj_certificado text not null check (cnpj_certificado ~ '^[0-9]{14}$'),
  titular          text,
  validade         timestamptz not null,
  uf               text not null check (uf ~ '^[A-Z]{2}$'),
  ambiente         smallint not null default 1 check (ambiente in (1, 2)),
  segredo_pfx      uuid not null,
  segredo_senha    uuid not null,
  ult_nsu          text not null default '000000000000000' check (ult_nsu ~ '^[0-9]{15}$'),
  max_nsu          text,
  proxima_consulta timestamptz not null default now(),
  ultima_consulta  timestamptz,
  ultimo_status    text,
  ultimo_erro      text,
  criado_por       uuid,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);
revoke all on private.nfe_certificados from public, anon, authenticated;

create table if not exists public.nfe_recebidas (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references public.lojas (id) on delete cascade,
  chave         text not null check (chave ~ '^[0-9]{44}$'),
  nsu           text,
  emitente_cnpj text,
  emitente_nome text,
  emissao       timestamptz,
  valor_total   numeric(14, 2),
  situacao      text not null default 'autorizada' check (situacao in ('autorizada', 'denegada', 'cancelada')),
  xml           text,
  status        text not null default 'resumo' check (status in ('resumo', 'ciencia', 'disponivel', 'importada', 'ignorada')),
  ciencia_em    timestamptz,
  erro          text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (loja_id, chave)
);
create index if not exists nfe_recebidas_loja on public.nfe_recebidas (loja_id, emissao desc);
alter table public.nfe_recebidas enable row level security;
revoke all on public.nfe_recebidas from anon, authenticated;

-- 3. Telas (dono, gerente ou quem cuida do estoque)
create or replace function public.nfe_auto_situacao(p_loja uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not private.pode_estoque(p_loja) then raise exception 'Sem acesso ao estoque.' using errcode = 'insufficient_privilege'; end if;
  return jsonb_build_object(
    'pode_configurar', private.e_gestor(p_loja),
    'cnpj_loja', (select l.cnpj from public.lojas l where l.id = p_loja),
    'uf_loja', (select l.uf from public.lojas l where l.id = p_loja),
    'certificado', (select jsonb_build_object('cnpj', c.cnpj, 'cnpj_certificado', c.cnpj_certificado, 'titular', c.titular, 'validade', c.validade,
                      'ultima_consulta', c.ultima_consulta, 'proxima_consulta', c.proxima_consulta, 'ultimo_status', c.ultimo_status, 'ultimo_erro', c.ultimo_erro,
                      'em_dia', c.max_nsu is not null and c.ult_nsu >= c.max_nsu)
                    from private.nfe_certificados c where c.loja_id = p_loja),
    'notas', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'chave', n.chave, 'emitente_cnpj', n.emitente_cnpj, 'emitente_nome', n.emitente_nome,
                         'emissao', n.emissao, 'valor_total', n.valor_total, 'situacao', n.situacao, 'status', n.status, 'tem_xml', n.xml is not null,
                         'ciencia_em', n.ciencia_em, 'erro', n.erro, 'recebida_em', n.criado_em) order by n.emissao desc nulls last)
                       from (select * from public.nfe_recebidas where loja_id = p_loja and (status <> 'ignorada' or atualizado_em > now() - interval '30 days')
                             order by emissao desc nulls last limit 200) n), '[]'::jsonb));
end;
$$;
grant execute on function public.nfe_auto_situacao(uuid) to authenticated;

-- o servidor já abriu o .pfx com a senha (e conferiu o CNPJ) antes de chamar
create or replace function public.nfe_auto_salvar_certificado(p_loja uuid, p_pfx_base64 text, p_senha text, p_cnpj_certificado text,
                                                              p_titular text, p_validade timestamptz, p_ambiente smallint default 1)
returns void language plpgsql security definer set search_path = '' as $$
declare l public.lojas; c private.nfe_certificados; v_cnpj text;
begin
  if not private.e_gestor(p_loja) then raise exception 'Só o dono ou o gerente cadastram o certificado.' using errcode = 'insufficient_privilege'; end if;
  select * into l from public.lojas where id = p_loja;
  if coalesce(l.uf, '') = '' then raise exception 'Cadastre a UF da loja (Configurações da loja) antes do certificado.' using errcode = 'check_violation'; end if;
  if p_cnpj_certificado !~ '^[0-9]{14}$' then raise exception 'O certificado precisa ser um e-CNPJ (A1 da empresa).' using errcode = 'check_violation'; end if;
  v_cnpj := coalesce(l.cnpj, p_cnpj_certificado);
  if left(v_cnpj, 8) <> left(p_cnpj_certificado, 8) then
    raise exception 'O certificado é do CNPJ %, que não é o desta loja (%).', p_cnpj_certificado, v_cnpj using errcode = 'check_violation';
  end if;
  if p_validade < now() then raise exception 'Este certificado está vencido.' using errcode = 'check_violation'; end if;
  if length(coalesce(p_pfx_base64, '')) < 100 or length(p_pfx_base64) > 200000 then raise exception 'Arquivo de certificado inválido.' using errcode = 'check_violation'; end if;
  select * into c from private.nfe_certificados where loja_id = p_loja;
  insert into private.nfe_certificados (loja_id, cnpj, cnpj_certificado, titular, validade, uf, ambiente, segredo_pfx, segredo_senha, criado_por)
  values (p_loja, v_cnpj, p_cnpj_certificado, left(p_titular, 160), p_validade, l.uf, coalesce(p_ambiente, 1),
          private.nfe_guardar(c.segredo_pfx, p_pfx_base64), private.nfe_guardar(c.segredo_senha, p_senha), auth.uid())
  on conflict (loja_id) do update set cnpj = excluded.cnpj, cnpj_certificado = excluded.cnpj_certificado, titular = excluded.titular,
        validade = excluded.validade, uf = excluded.uf, ambiente = excluded.ambiente, segredo_pfx = excluded.segredo_pfx,
        segredo_senha = excluded.segredo_senha, ultimo_erro = null, atualizado_em = now(),
        -- troca de CNPJ recomeça a fila; o mesmo CNPJ continua de onde parou
        ult_nsu = case when nfe_certificados.cnpj = excluded.cnpj then nfe_certificados.ult_nsu else '000000000000000' end,
        max_nsu = case when nfe_certificados.cnpj = excluded.cnpj then nfe_certificados.max_nsu else null end;
end;
$$;
grant execute on function public.nfe_auto_salvar_certificado(uuid, text, text, text, text, timestamptz, smallint) to authenticated;

create or replace function public.nfe_auto_remover(p_loja uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare c private.nfe_certificados;
begin
  if not private.e_gestor(p_loja) then raise exception 'Só o dono ou o gerente.' using errcode = 'insufficient_privilege'; end if;
  delete from private.nfe_certificados where loja_id = p_loja returning * into c;
  if found then
    perform private.nfe_apagar(c.segredo_pfx);
    perform private.nfe_apagar(c.segredo_senha);
  end if;
end;
$$;
grant execute on function public.nfe_auto_remover(uuid) to authenticated;

create or replace function public.nfe_auto_xml(p_loja uuid, p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  if not private.pode_estoque(p_loja) then raise exception 'Sem acesso ao estoque.' using errcode = 'insufficient_privilege'; end if;
  select xml into v from public.nfe_recebidas where id = p_id and loja_id = p_loja;
  if v is null then raise exception 'O XML desta nota ainda não chegou da SEFAZ.' using errcode = 'no_data_found'; end if;
  return v;
end;
$$;
grant execute on function public.nfe_auto_xml(uuid, uuid) to authenticated;

create or replace function public.nfe_auto_ignorar(p_loja uuid, p_id uuid, p_ignorar boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.pode_estoque(p_loja) then raise exception 'Sem acesso ao estoque.' using errcode = 'insufficient_privilege'; end if;
  update public.nfe_recebidas
     set status = case when p_ignorar then 'ignorada' when xml is not null then 'disponivel' when ciencia_em is not null then 'ciencia' else 'resumo' end,
         atualizado_em = now()
   where id = p_id and loja_id = p_loja and status <> 'importada';
end;
$$;
grant execute on function public.nfe_auto_ignorar(uuid, uuid, boolean) to authenticated;

-- 4. Servidor (chave de serviço): credenciais, registro do que veio e ciência
create or replace function public.nfe_auto_credenciais(p_loja uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('cnpj', c.cnpj, 'uf', c.uf, 'ambiente', c.ambiente, 'ult_nsu', c.ult_nsu,
                            'pfx', private.nfe_ler(c.segredo_pfx), 'senha', private.nfe_ler(c.segredo_senha),
                            'pode_consultar', c.proxima_consulta <= now(), 'proxima', c.proxima_consulta)
    from private.nfe_certificados c where c.loja_id = p_loja;
$$;

create or replace function public.nfe_auto_lojas_devidas()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select c.loja_id from private.nfe_certificados c
   where c.proxima_consulta <= now() and c.validade > now()
   order by c.proxima_consulta limit 20;
$$;

-- p_docs: [{tipo: resumo|completa|evento, nsu, chave, emitenteCnpj, emitenteNome, emissao, valor (centavos), situacao, xml, tpEvento}]
create or replace function public.nfe_auto_registrar(p_loja uuid, p_docs jsonb, p_ult_nsu text, p_max_nsu text, p_status text, p_erro text, p_proxima timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare d jsonb; v_novas integer := 0; v_xmls integer := 0; v_ja boolean;
begin
  for d in select * from jsonb_array_elements(coalesce(p_docs, '[]'::jsonb)) loop
    continue when coalesce(d ->> 'chave', '') !~ '^[0-9]{44}$';
    v_ja := exists (select 1 from public.nfe_recebidas where loja_id = p_loja and chave = d ->> 'chave');
    if d ->> 'tipo' = 'evento' then
      if d ->> 'tpEvento' = '110111' then -- cancelamento pelo emitente
        update public.nfe_recebidas set situacao = 'cancelada', atualizado_em = now() where loja_id = p_loja and chave = d ->> 'chave';
      end if;
      continue;
    end if;
    insert into public.nfe_recebidas (loja_id, chave, nsu, emitente_cnpj, emitente_nome, emissao, valor_total, situacao, xml, status)
    values (p_loja, d ->> 'chave', d ->> 'nsu', d ->> 'emitenteCnpj', left(d ->> 'emitenteNome', 160), (d ->> 'emissao')::timestamptz,
            (d ->> 'valor')::numeric / 100, coalesce(d ->> 'situacao', 'autorizada'),
            case when d ->> 'tipo' = 'completa' then d ->> 'xml' end,
            case when d ->> 'tipo' = 'completa' then 'disponivel' else 'resumo' end)
    on conflict (loja_id, chave) do update set
      nsu = coalesce(excluded.nsu, nfe_recebidas.nsu),
      emitente_nome = coalesce(nullif(excluded.emitente_nome, ''), nfe_recebidas.emitente_nome),
      situacao = case when nfe_recebidas.situacao = 'cancelada' then 'cancelada' else excluded.situacao end,
      xml = coalesce(excluded.xml, nfe_recebidas.xml),
      status = case when nfe_recebidas.status in ('importada', 'ignorada') then nfe_recebidas.status
                    when excluded.xml is not null then 'disponivel' else nfe_recebidas.status end,
      erro = case when excluded.xml is not null then null else nfe_recebidas.erro end,
      atualizado_em = now();
    if not v_ja then v_novas := v_novas + 1; end if;
    if d ->> 'tipo' = 'completa' then v_xmls := v_xmls + 1; end if;
  end loop;
  -- nota que já entrou no estoque pelo arquivo não aparece como pendente
  update public.nfe_recebidas r set status = 'importada', atualizado_em = now()
   where r.loja_id = p_loja and r.status in ('resumo', 'ciencia', 'disponivel')
     and exists (select 1 from public.nfe_entradas e where e.chave = r.chave and e.estoque = private.estoque_da_loja(p_loja));
  update private.nfe_certificados set
    ult_nsu = coalesce(case when p_ult_nsu ~ '^[0-9]{1,15}$' then lpad(p_ult_nsu, 15, '0') end, ult_nsu),
    max_nsu = coalesce(case when p_max_nsu ~ '^[0-9]{1,15}$' then lpad(p_max_nsu, 15, '0') end, max_nsu),
    ultima_consulta = now(), ultimo_status = p_status, ultimo_erro = p_erro,
    proxima_consulta = greatest(coalesce(p_proxima, now() + interval '61 minutes'), now()), atualizado_em = now()
   where loja_id = p_loja;
  return jsonb_build_object('novas', v_novas, 'xmls', v_xmls);
end;
$$;

-- chaves que pedem ciência: resumo de nota autorizada, emitida nos últimos p_dias, sem tentativa na última hora
create or replace function public.nfe_auto_para_ciencia(p_loja uuid, p_dias integer default 30)
returns setof text language sql stable security definer set search_path = '' as $$
  select r.chave from public.nfe_recebidas r
   where r.loja_id = p_loja and r.status = 'resumo' and r.situacao = 'autorizada' and r.xml is null
     and r.emissao > now() - make_interval(days => greatest(1, least(coalesce(p_dias, 30), 90)))
     and (r.erro is null or r.atualizado_em < now() - interval '1 hour')
   order by r.emissao desc limit 20;
$$;

-- p_resultado: [{chave, ok, erro}]
create or replace function public.nfe_auto_ciencia(p_loja uuid, p_resultado jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare d jsonb;
begin
  for d in select * from jsonb_array_elements(coalesce(p_resultado, '[]'::jsonb)) loop
    update public.nfe_recebidas set
      status = case when (d ->> 'ok')::boolean and status = 'resumo' then 'ciencia' else status end,
      ciencia_em = case when (d ->> 'ok')::boolean then coalesce(ciencia_em, now()) else ciencia_em end,
      erro = case when (d ->> 'ok')::boolean then null else left(d ->> 'erro', 300) end,
      atualizado_em = now()
     where loja_id = p_loja and chave = d ->> 'chave';
  end loop;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array['public.nfe_auto_credenciais(uuid)', 'public.nfe_auto_lojas_devidas()', 'public.nfe_auto_registrar(uuid, jsonb, text, text, text, text, timestamptz)',
                           'public.nfe_auto_para_ciencia(uuid, integer)', 'public.nfe_auto_ciencia(uuid, jsonb)'] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- 5. Nota que entra no estoque (pela caixa de entrada ou pelo arquivo) sai da lista de pendentes
create or replace function private.nfe_recebida_importada()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.nfe_recebidas r set status = 'importada', atualizado_em = now()
   where r.chave = new.chave and private.estoque_da_loja(r.loja_id) = new.estoque and r.status <> 'importada';
  return new;
end;
$$;
drop trigger if exists nfe_entradas_marca_recebida on public.nfe_entradas;
create trigger nfe_entradas_marca_recebida after insert on public.nfe_entradas for each row execute function private.nfe_recebida_importada();

-- 6. Agendador: a cada 15 min chama o servidor se alguma loja está na hora (cada loja respeita a 1 hora da SEFAZ)
create or replace function private.nfe_tique()
returns void language plpgsql security definer set search_path = '' as $$
declare v_segredo text; v_url text;
begin
  if not exists (select 1 from public.nfe_auto_lojas_devidas())
     or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null
     or to_regclass('vault.decrypted_secrets') is null then
    return;
  end if;
  execute 'select max(decrypted_secret) filter (where name = ''marketplace_cron_segredo''), max(decrypted_secret) filter (where name = ''res_url'') from vault.decrypted_secrets'
     into v_segredo, v_url;
  if coalesce(v_segredo, '') = '' then return; end if;
  execute 'select net.http_post(url := $1, body := ''{}''::jsonb, params := ''{}''::jsonb, headers := $2, timeout_milliseconds := 25000)'
    using rtrim(coalesce(nullif(v_url, ''), 'https://res-iqzs.vercel.app'), '/') || '/api/nfe/sincronizar',
          jsonb_build_object('Content-Type', 'application/json', 'X-RES-Chave', v_segredo);
end;
$$;
revoke execute on function private.nfe_tique() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('res-nfe', '7,22,37,52 * * * *', 'select private.nfe_tique()');
  end if;
exception when others then raise notice 'Caixa de NF-e não agendada: %', sqlerrm;
end $$;
