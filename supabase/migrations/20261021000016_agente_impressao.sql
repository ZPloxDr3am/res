-- RES · 0016 · Etapa 4 (parte 3): agente de impressão do Windows (D-015).
--
-- O agente não tem login de pessoa. Ele é pareado com a loja por um código de uso único
-- (gerado no painel por quem tem a permissão "impressoras", válido por 10 minutos) e recebe
-- um token próprio. O banco guarda só o hash do token. Todas as chamadas do agente passam
-- por funções que conferem o token; ele não lê tabela nenhuma direto.
-- Ciclo do agente (a cada poucos segundos): agente_sincronizar → imprime → agente_resultado.

create table public.agentes (
  id                  uuid primary key default gen_random_uuid(),
  loja_id             uuid not null references public.lojas (id) on delete cascade,
  nome                text not null check (length(btrim(nome)) between 1 and 80),
  token_hash          text not null unique,
  versao              text,
  impressoras_windows jsonb not null default '[]',   -- nomes das impressoras instaladas no computador
  ultimo_sinal        timestamptz,
  criado_por          uuid,
  criado_em           timestamptz not null default now()
);
create index agentes_loja_idx on public.agentes (loja_id);

create table private.agente_codigos (
  codigo     text primary key,
  loja_id    uuid not null references public.lojas (id) on delete cascade,
  expira_em  timestamptz not null,
  criado_por uuid
);

alter table public.agentes enable row level security;
alter table private.agente_codigos enable row level security;
-- token_hash nunca sai: o painel lê por uma visão sem ele
create policy agentes_ler on public.agentes for select to authenticated using (false);
create view public.agentes_loja with (security_invoker = false) as
  select a.id, a.loja_id, a.nome, a.versao, a.impressoras_windows, a.ultimo_sinal, a.criado_em
    from public.agentes a
   where private.e_membro(a.loja_id);
grant select on public.agentes_loja to authenticated;
revoke all on public.agentes_loja from anon, public;

alter table public.impressoes add column agente_id uuid references public.agentes (id) on delete set null;

create or replace function private.hash_token(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$ select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex') $$;

create or replace function private.agente_do_token(p_token text)
returns public.agentes
language sql
stable
set search_path = ''
as $$ select * from public.agentes where token_hash = private.hash_token(p_token) and length(coalesce(p_token, '')) >= 40 $$;

-- ---------------------------------------------------------------------------
-- Painel: código de pareamento ("Conectar computador")
-- ---------------------------------------------------------------------------
create or replace function public.gerar_codigo_agente(p_loja uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alfa constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   -- sem 0/O, 1/I
  v_cod  text;
begin
  if not private.tem_permissao(p_loja, 'impressoras') then
    raise exception 'Você não tem permissão para conectar computadores de impressão.' using errcode = 'insufficient_privilege';
  end if;
  delete from private.agente_codigos where expira_em < now() or loja_id = p_loja;
  select string_agg(substr(v_alfa, 1 + (get_byte(b, i) % length(v_alfa)), 1), '' order by i)
    into v_cod
    from (select uuid_send(gen_random_uuid()) as b) x, generate_series(0, 7) i;
  insert into private.agente_codigos (codigo, loja_id, expira_em, criado_por) values (v_cod, p_loja, now() + interval '10 minutes', auth.uid());
  return jsonb_build_object('codigo', substr(v_cod, 1, 4) || '-' || substr(v_cod, 5, 4), 'expira_em', now() + interval '10 minutes');
end;
$$;

-- Agente: troca o código por um token (uma vez). Devolve o token só nesta resposta.
create or replace function public.parear_agente(p_codigo text, p_nome text, p_versao text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cod   private.agente_codigos;
  v_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_id    uuid;
begin
  delete from private.agente_codigos
   where codigo = upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g')) and expira_em > now()
  returning * into v_cod;
  if not found then
    perform pg_sleep(1);   -- freia tentativa às cegas
    raise exception 'Código inválido ou vencido. Gere um novo no painel (Impressoras → Conectar computador).' using errcode = 'invalid_parameter_value';
  end if;
  insert into public.agentes (loja_id, nome, token_hash, versao, criado_por, ultimo_sinal)
  values (v_cod.loja_id, left(coalesce(nullif(btrim(p_nome), ''), 'Computador'), 80), private.hash_token(v_token), left(p_versao, 20), v_cod.criado_por, now())
  returning id into v_id;
  return jsonb_build_object('token', v_token, 'agente_id', v_id, 'loja', (select nome from public.lojas where id = v_cod.loja_id));
end;
$$;

-- ---------------------------------------------------------------------------
-- Agente: sincronizar. p_estado:
-- { versao, impressoras_windows: ["EPSON TM-T20X-II Receipt", ...],
--   alcance: [{id, ok, erro?}] }   -- impressoras do RES que este computador alcança agora
-- Devolve a loja, as impressoras (com parâmetros) e os cupons a imprimir, já marcados "imprimindo".
-- ---------------------------------------------------------------------------
create or replace function public.agente_sincronizar(p_token text, p_estado jsonb default '{}')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ag    public.agentes;
  v_ok    uuid[];
  v_cup   jsonb;
begin
  v_ag := private.agente_do_token(p_token);
  if v_ag.id is null then
    raise exception 'Este computador foi desconectado da loja. Pareie de novo.' using errcode = 'insufficient_privilege';
  end if;

  update public.agentes set
    ultimo_sinal = now(),
    versao = coalesce(left(p_estado ->> 'versao', 20), versao),
    impressoras_windows = case when jsonb_typeof(p_estado -> 'impressoras_windows') = 'array' then p_estado -> 'impressoras_windows' else impressoras_windows end
  where id = v_ag.id;

  -- alcance: só impressoras desta loja
  select coalesce(array_agg(i.id), '{}') into v_ok
    from jsonb_array_elements(coalesce(p_estado -> 'alcance', '[]'::jsonb)) a
    join public.impressoras i on i.id = (a ->> 'id')::uuid and i.loja_id = v_ag.loja_id
   where (a ->> 'ok')::boolean;
  update public.impressoras i set ultimo_sinal = now(), ultimo_erro = null where i.id = any (v_ok);
  update public.impressoras i set ultimo_erro = left(a ->> 'erro', 200)
    from jsonb_array_elements(coalesce(p_estado -> 'alcance', '[]'::jsonb)) a
   where i.id = (a ->> 'id')::uuid and i.loja_id = v_ag.loja_id and not (a ->> 'ok')::boolean;

  -- cupons: pendentes (ou presos "imprimindo" há mais de 2 min, ou com erro e menos de 3 tentativas
  -- nos últimos 30 min) das impressoras que este computador alcança
  with alvo as (
    select x.id from public.impressoes x
     where x.loja_id = v_ag.loja_id and x.impressora_id = any (v_ok)
       and x.criado_em > now() - interval '24 hours'
       and (x.status = 'pendente'
            or (x.status = 'imprimindo' and coalesce(x.impresso_em, x.criado_em) < now() - interval '2 minutes')
            or (x.status = 'erro' and x.tentativas < 3 and x.criado_em > now() - interval '30 minutes'))
     order by x.criado_em
     limit 20
     for update skip locked
  ), marcados as (
    update public.impressoes x set status = 'imprimindo', agente_id = v_ag.id, impresso_em = now()
      from alvo where x.id = alvo.id
    returning x.*
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', m.id, 'tipo', m.tipo, 'motivo', m.motivo, 'titulo', m.titulo, 'conteudo', m.conteudo, 'layout', m.layout,
           'impressora_id', m.impressora_id) order by m.criado_em), '[]'::jsonb)
    into v_cup from marcados m;

  return jsonb_build_object(
    'agente', v_ag.nome,
    'loja', (select nome from public.lojas where id = v_ag.loja_id),
    'impressoras', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', i.id, 'nome', i.nome, 'modelo', i.modelo, 'protocolo', i.protocolo, 'conexao', i.conexao, 'endereco', i.endereco,
               'colunas', i.colunas, 'pagina_codigo', i.pagina_codigo, 'espaco_linhas', i.espaco_linhas, 'pular_linhas', i.pular_linhas,
               'corte', i.corte, 'gaveta', i.gaveta) order by i.nome)
        from public.impressoras i where i.loja_id = v_ag.loja_id and i.ativo), '[]'::jsonb),
    'cupons', v_cup
  );
end;
$$;

-- Agente: resultado de um cupom.
create or replace function public.agente_resultado(p_token text, p_impressao uuid, p_ok boolean, p_erro text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ag public.agentes;
begin
  v_ag := private.agente_do_token(p_token);
  if v_ag.id is null then
    raise exception 'Este computador foi desconectado da loja. Pareie de novo.' using errcode = 'insufficient_privilege';
  end if;
  update public.impressoes set
    status = case when p_ok then 'impresso' else 'erro' end,
    impresso_por = case when p_ok then 'agente' else impresso_por end,
    impresso_em = now(),
    tentativas = tentativas + 1,
    erro = case when p_ok then null else left(coalesce(p_erro, 'Falha ao imprimir'), 300) end
   where id = p_impressao and loja_id = v_ag.loja_id and agente_id = v_ag.id;
  if not p_ok then
    update public.impressoras set ultimo_erro = left(coalesce(p_erro, 'Falha ao imprimir'), 200)
     where id = (select impressora_id from public.impressoes where id = p_impressao) and loja_id = v_ag.loja_id;
  end if;
end;
$$;

-- Painel: desconectar um computador.
create or replace function public.remover_agente(p_agente uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid;
begin
  select loja_id into v_loja from public.agentes where id = p_agente;
  if v_loja is null or not private.tem_permissao(v_loja, 'impressoras') then
    raise exception 'Computador não encontrado.' using errcode = 'no_data_found';
  end if;
  delete from public.agentes where id = p_agente;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array['public.gerar_codigo_agente(uuid)', 'public.remover_agente(uuid)'] loop
    execute format('grant execute on function %s to authenticated', f);
    execute format('revoke execute on function %s from anon, public', f);
  end loop;
  -- o agente usa a chave pública (anon) + o próprio token
  foreach f in array array['public.parear_agente(text, text, text)', 'public.agente_sincronizar(text, jsonb)', 'public.agente_resultado(text, uuid, boolean, text)'] loop
    execute format('revoke execute on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
  end loop;
  foreach f in array array['private.hash_token(text)', 'private.agente_do_token(text)'] loop
    execute format('revoke execute on function %s from anon, public', f);
  end loop;
end;
$$;

