-- RES · 0017 · Impressora do grupo de lojas (D-016).
--
-- Lojas da mesma conta (o grupo) costumam dividir a mesma cozinha e as mesmas impressoras.
-- Agora uma impressora cadastrada em qualquer loja vale para todas as lojas do grupo:
--  * aparece e pode ser usada nas regras de todas;
--  * loja do grupo sem regras ganha na hora "uma impressora só" com ela (já sai imprimindo);
--  * um computador com o RES Impressão atende os cupons de todas as lojas do grupo.
-- A loja em que foi cadastrada fica só como "dona" do registro.

-- Lojas do grupo (mesma conta). Loja sem conta: só ela.
create or replace function private.lojas_grupo(p_loja uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(l2.id), array[p_loja])
    from public.lojas l
    join public.lojas l2 on l2.conta_id = l.conta_id
   where l.id = p_loja and l.conta_id is not null;
$$;

create or replace function private.e_membro_grupo(p_loja uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select exists (select 1 from unnest(private.lojas_grupo(p_loja)) x where private.e_membro(x)) $$;

-- Pode mexer nas impressoras do grupo desta loja (permissão "impressoras" em alguma loja do grupo).
create or replace function private.configura_impressoras_grupo(p_loja uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select exists (select 1 from unnest(private.lojas_grupo(p_loja)) x where private.tem_permissao(x, 'impressoras')) $$;

grant execute on function private.e_membro_grupo(uuid) to authenticated;
revoke execute on function private.lojas_grupo(uuid) from anon, public;
revoke execute on function private.configura_impressoras_grupo(uuid) from anon, public;

-- Quem é de qualquer loja do grupo vê as impressoras do grupo.
drop policy impressoras_ler on public.impressoras;
create policy impressoras_ler on public.impressoras for select to authenticated using (private.e_membro_grupo(loja_id));

-- Loja do grupo sem regra (ou sem impressora padrão) passa a usar esta impressora.
create or replace function private.aplicar_impressora_no_grupo(p_impressora uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_loja uuid;
begin
  select loja_id into v_loja from public.impressoras where id = p_impressora and ativo;
  if v_loja is null then
    return;
  end if;
  insert into public.impressao_config (loja_id, modo_destino, impressora_padrao)
  select x, 'unica', p_impressora from unnest(private.lojas_grupo(v_loja)) x
  on conflict (loja_id) do update set impressora_padrao = excluded.impressora_padrao, atualizado_em = now()
   where public.impressao_config.impressora_padrao is null;
end;
$$;
revoke execute on function private.aplicar_impressora_no_grupo(uuid) from anon, public;

create or replace function public.salvar_impressora(p_loja uuid, p_id uuid, p_dados jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_id;
begin
  if not private.tem_permissao(p_loja, 'impressoras') then
    raise exception 'Você não tem permissão para configurar impressoras.' using errcode = 'insufficient_privilege';
  end if;
  -- nome único no grupo (as lojas veem a mesma lista)
  if exists (select 1 from public.impressoras i
              where i.loja_id = any (private.lojas_grupo(p_loja)) and i.id is distinct from v_id
                and lower(btrim(i.nome)) = lower(btrim(p_dados ->> 'nome'))) then
    raise exception 'impressoras_nome_idx: já existe uma impressora com esse nome no grupo.' using errcode = 'unique_violation';
  end if;
  if v_id is null then
    insert into public.impressoras (loja_id, nome, modelo, protocolo, conexao, endereco, colunas, pagina_codigo, espaco_linhas, pular_linhas, corte, gaveta, ativo)
    values (p_loja, btrim(p_dados ->> 'nome'), p_dados ->> 'modelo', p_dados ->> 'protocolo', coalesce(p_dados ->> 'conexao', 'usb'),
            nullif(btrim(p_dados ->> 'endereco'), ''), coalesce((p_dados ->> 'colunas')::smallint, 48), coalesce(p_dados ->> 'pagina_codigo', '860'),
            coalesce((p_dados ->> 'espaco_linhas')::smallint, 0), coalesce((p_dados ->> 'pular_linhas')::smallint, 4),
            coalesce((p_dados ->> 'corte')::boolean, true), coalesce((p_dados ->> 'gaveta')::boolean, false), coalesce((p_dados ->> 'ativo')::boolean, true))
    returning id into v_id;
  else
    update public.impressoras set
      nome = btrim(p_dados ->> 'nome'), modelo = p_dados ->> 'modelo', protocolo = p_dados ->> 'protocolo',
      conexao = coalesce(p_dados ->> 'conexao', conexao), endereco = nullif(btrim(p_dados ->> 'endereco'), ''),
      colunas = coalesce((p_dados ->> 'colunas')::smallint, colunas), pagina_codigo = coalesce(p_dados ->> 'pagina_codigo', pagina_codigo),
      espaco_linhas = coalesce((p_dados ->> 'espaco_linhas')::smallint, espaco_linhas), pular_linhas = coalesce((p_dados ->> 'pular_linhas')::smallint, pular_linhas),
      corte = coalesce((p_dados ->> 'corte')::boolean, corte), gaveta = coalesce((p_dados ->> 'gaveta')::boolean, gaveta),
      ativo = coalesce((p_dados ->> 'ativo')::boolean, ativo)
    where id = v_id and loja_id = any (private.lojas_grupo(p_loja));
    if not found then
      raise exception 'Impressora não encontrada.' using errcode = 'no_data_found';
    end if;
  end if;
  perform private.aplicar_impressora_no_grupo(v_id);
  return v_id;
end;
$$;

create or replace function public.excluir_impressora(p_impressora uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid;
begin
  select loja_id into v_loja from public.impressoras where id = p_impressora;
  if v_loja is null or not private.configura_impressoras_grupo(v_loja) then
    raise exception 'Impressora não encontrada.' using errcode = 'no_data_found';
  end if;
  update public.impressoes set impressora_id = null where impressora_id = p_impressora and status in ('pendente', 'erro');
  delete from public.impressoras where id = p_impressora;
end;
$$;

create or replace function public.imprimir_teste(p_impressora uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_i  public.impressoras;
  v_id uuid;
begin
  select * into v_i from public.impressoras where id = p_impressora;
  if not found or not private.configura_impressoras_grupo(v_i.loja_id) then
    raise exception 'Impressora não encontrada' using errcode = 'no_data_found';
  end if;
  insert into public.impressoes (loja_id, impressora_id, tipo, motivo, titulo, conteudo, criado_por)
  values (v_i.loja_id, v_i.id, 'teste', 'teste', 'Teste · ' || v_i.nome,
          jsonb_build_object('teste', true, 'impressora', v_i.nome, 'modelo', v_i.modelo, 'protocolo', v_i.protocolo,
                             'colunas', v_i.colunas, 'pagina_codigo', v_i.pagina_codigo,
                             'loja', (select nome from public.lojas where id = v_i.loja_id), 'criado_em', now()),
          auth.uid())
  returning id into v_id;
  return private.cupons(array[v_id]);
end;
$$;

-- Regras da loja podem usar qualquer impressora do grupo.
create or replace function public.salvar_config_impressao(p_loja uuid, p_config jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  k text;
begin
  if not private.tem_permissao(p_loja, 'impressoras') then
    raise exception 'Você não tem permissão para configurar impressoras.' using errcode = 'insufficient_privilege';
  end if;
  if exists (
    select 1 from (
      select nullif(p_config ->> 'impressora_padrao', '')::uuid as i union all
      select nullif(p_config ->> 'via_pedido_impressora', '')::uuid union all
      select nullif(p_config ->> 'marketplace_impressora', '')::uuid union all
      select nullif(d ->> 'impressora_id', '')::uuid from jsonb_array_elements(coalesce(p_config -> 'destinos', '[]'::jsonb)) d
    ) t
    where t.i is not null and not exists (select 1 from public.impressoras x where x.id = t.i and x.loja_id = any (private.lojas_grupo(p_loja)))) then
    raise exception 'Impressora inválida.' using errcode = 'check_violation';
  end if;
  for k in select jsonb_object_keys(coalesce(p_config -> 'canais', '{}'::jsonb)) loop
    if k not in ('painel', 'cardapio_digital', 'marketplace') or (p_config -> 'canais' ->> k) not in ('automatico', 'manual') then
      raise exception 'Canal inválido: %', k using errcode = 'check_violation';
    end if;
  end loop;
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_config -> 'destinos', '[]'::jsonb)) d
     where nullif(d ->> 'impressora_id', '') is not null and not (case d ->> 'tipo'
                  when 'setor' then exists (select 1 from public.setores s where s.id = (d ->> 'alvo_id')::uuid and s.loja_id = p_loja)
                  when 'produto' then exists (select 1 from public.produtos p where p.id = (d ->> 'alvo_id')::uuid and p.loja_id = p_loja)
                  else false end)) then
    raise exception 'Setor ou produto inválido.' using errcode = 'check_violation';
  end if;

  insert into public.impressao_config as c (loja_id, modo_destino, impressora_padrao, agrupamento, canais, via_pedido_impressora, via_pedido_auto, marketplace_impressora, marketplace_modo)
  values (p_loja,
          coalesce(p_config ->> 'modo_destino', 'unica'), nullif(p_config ->> 'impressora_padrao', '')::uuid, coalesce(p_config ->> 'agrupamento', 'completo'),
          '{"painel": "automatico", "cardapio_digital": "automatico", "marketplace": "automatico"}'::jsonb || coalesce(p_config -> 'canais', '{}'::jsonb),
          nullif(p_config ->> 'via_pedido_impressora', '')::uuid, coalesce((p_config ->> 'via_pedido_auto')::boolean, false),
          nullif(p_config ->> 'marketplace_impressora', '')::uuid, coalesce(p_config ->> 'marketplace_modo', 'sem_vinculo'))
  on conflict (loja_id) do update set
    modo_destino = excluded.modo_destino, impressora_padrao = excluded.impressora_padrao, agrupamento = excluded.agrupamento,
    canais = excluded.canais, via_pedido_impressora = excluded.via_pedido_impressora, via_pedido_auto = excluded.via_pedido_auto,
    marketplace_impressora = excluded.marketplace_impressora, marketplace_modo = excluded.marketplace_modo, atualizado_em = now();

  if p_config ? 'destinos' then
    delete from public.impressao_destinos where loja_id = p_loja;
    insert into public.impressao_destinos (loja_id, tipo, alvo_id, impressora_id)
    select distinct on (d ->> 'tipo', d ->> 'alvo_id') p_loja, d ->> 'tipo', (d ->> 'alvo_id')::uuid, (d ->> 'impressora_id')::uuid
      from jsonb_array_elements(p_config -> 'destinos') d
     where nullif(d ->> 'impressora_id', '') is not null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Agente: atende o grupo inteiro da loja em que foi pareado.
-- ---------------------------------------------------------------------------
create or replace function public.agente_sincronizar(p_token text, p_estado jsonb default '{}')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ag     public.agentes;
  v_grupo  uuid[];
  v_ok     uuid[];
  v_cup    jsonb;
begin
  v_ag := private.agente_do_token(p_token);
  if v_ag.id is null then
    raise exception 'Este computador foi desconectado da loja. Pareie de novo.' using errcode = 'insufficient_privilege';
  end if;
  v_grupo := private.lojas_grupo(v_ag.loja_id);

  update public.agentes set
    ultimo_sinal = now(),
    versao = coalesce(left(p_estado ->> 'versao', 20), versao),
    impressoras_windows = case when jsonb_typeof(p_estado -> 'impressoras_windows') = 'array' then p_estado -> 'impressoras_windows' else impressoras_windows end
  where id = v_ag.id;

  select coalesce(array_agg(i.id), '{}') into v_ok
    from jsonb_array_elements(coalesce(p_estado -> 'alcance', '[]'::jsonb)) a
    join public.impressoras i on i.id = (a ->> 'id')::uuid and i.loja_id = any (v_grupo)
   where (a ->> 'ok')::boolean;
  update public.impressoras i set ultimo_sinal = now(), ultimo_erro = null where i.id = any (v_ok);
  update public.impressoras i set ultimo_erro = left(a ->> 'erro', 200)
    from jsonb_array_elements(coalesce(p_estado -> 'alcance', '[]'::jsonb)) a
   where i.id = (a ->> 'id')::uuid and i.loja_id = any (v_grupo) and not (a ->> 'ok')::boolean;

  with alvo as (
    select x.id from public.impressoes x
     where x.loja_id = any (v_grupo) and x.impressora_id = any (v_ok)
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
    'loja', (select coalesce(c.nome, l.nome) from public.lojas l left join public.contas c on c.id = l.conta_id where l.id = v_ag.loja_id),
    'impressoras', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', i.id, 'nome', i.nome, 'modelo', i.modelo, 'protocolo', i.protocolo, 'conexao', i.conexao, 'endereco', i.endereco,
               'colunas', i.colunas, 'pagina_codigo', i.pagina_codigo, 'espaco_linhas', i.espaco_linhas, 'pular_linhas', i.pular_linhas,
               'corte', i.corte, 'gaveta', i.gaveta) order by i.nome)
        from public.impressoras i where i.loja_id = any (v_grupo) and i.ativo), '[]'::jsonb),
    'cupons', v_cup
  );
end;
$$;

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
   where id = p_impressao and loja_id = any (private.lojas_grupo(v_ag.loja_id)) and agente_id = v_ag.id;
  if not p_ok then
    update public.impressoras set ultimo_erro = left(coalesce(p_erro, 'Falha ao imprimir'), 200)
     where id = (select impressora_id from public.impressoes where id = p_impressao) and loja_id = any (private.lojas_grupo(v_ag.loja_id));
  end if;
end;
$$;

-- Computadores: visíveis para o grupo, desconectar por quem configura impressoras no grupo.
create or replace view public.agentes_loja with (security_invoker = false) as
  select a.id, a.loja_id, a.nome, a.versao, a.impressoras_windows, a.ultimo_sinal, a.criado_em
    from public.agentes a
   where private.e_membro_grupo(a.loja_id);

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
  if v_loja is null or not private.configura_impressoras_grupo(v_loja) then
    raise exception 'Computador não encontrado.' using errcode = 'no_data_found';
  end if;
  delete from public.agentes where id = p_agente;
end;
$$;

-- Já existentes: cada impressora ativa vale para as lojas do grupo que ainda não têm impressora padrão.
do $$
declare r record;
begin
  for r in select id from public.impressoras where ativo order by criado_em loop
    perform private.aplicar_impressora_no_grupo(r.id);
  end loop;
end;
$$;
