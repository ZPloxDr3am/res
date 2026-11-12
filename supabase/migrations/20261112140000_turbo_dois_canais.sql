-- D-098: Turbo-Vendas nos dois canais — manual (toque e envia) e WhatsApp oficial (API) — em todas as abas.
-- * Fila: mostra se cada mensagem sai pelo oficial; o texto manual passa a ser o mesmo do modelo aprovado;
--   o que falhou no oficial volta para a fila para envio manual.
-- * Campanha já nasce com o modelo escolhido.
-- * Resultados por canal: manual × oficial (entregues, lidas, falhas).
-- Pode rodar de novo.

-- texto do modelo preenchido com as variáveis do envio
create or replace function private.turbo_preencher(p_corpo text, p_vars jsonb)
returns text language plpgsql immutable set search_path = '' as $$
declare k text; t text := p_corpo;
begin
  for k in select jsonb_object_keys(coalesce(p_vars, '{}'::jsonb)) loop
    t := replace(t, '{' || k || '}', coalesce(p_vars ->> k, ''));
  end loop;
  return t;
end;
$$;

create or replace function public.turbo_fila(p_loja uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_oficial boolean := exists (select 1 from private.whatsapp_contas w where w.loja_id = p_loja);
begin
  perform private.turbo_pode(p_loja);
  return coalesce((select jsonb_agg(jsonb_build_object(
             'id', e.id, 'nome', e.nome, 'telefone', e.telefone, 'cupom', e.cupom, 'criado_em', e.criado_em,
             'mensagem', case when m.id is not null then private.turbo_preencher(m.corpo, e.variaveis) else e.mensagem end,
             'origem', coalesce(c.nome, a.tipo),
             'oficial', v_oficial and m.status = 'aprovado',
             'modelo', m.nome,
             'falhou', e.status = 'erro', 'erro', e.erro) order by e.status = 'erro' desc, e.criado_em)
           from (select * from public.turbo_envios where loja_id = p_loja and status in ('fila', 'erro') order by criado_em limit 300) e
           left join public.whatsapp_modelos m on m.id = e.modelo_id
           left join public.turbo_campanhas c on c.id = e.campanha_id left join public.turbo_automacoes a on a.id = e.automacao_id), '[]'::jsonb);
end;
$$;

-- marcar: vale também para o que falhou no oficial (enviar à mão, pular, sair)
create or replace function public.turbo_marcar(p_loja uuid, p_envio uuid, p_acao text)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.turbo_envios;
begin
  perform private.turbo_pode(p_loja);
  select * into e from public.turbo_envios where id = p_envio and loja_id = p_loja;
  if not found then raise exception 'Envio não encontrado.' using errcode = 'no_data_found'; end if;
  if p_acao = 'enviado' then
    update public.turbo_envios set status = 'enviado', enviado_em = now(), enviado_por = auth.uid(), wa_id = null, erro = null
     where id = e.id and status in ('fila', 'erro');
  elsif p_acao = 'pular' then
    update public.turbo_envios set status = 'pulado' where id = e.id and status in ('fila', 'erro');
  elsif p_acao = 'sair' then
    update public.clientes set marketing_optout_em = now() where grupo = private.grupo_da_loja(p_loja) and telefone = e.telefone;
    update public.turbo_envios set status = 'pulado' where telefone = e.telefone and status in ('fila', 'erro') and loja_id = any (private.lojas_grupo(p_loja));
  else
    raise exception 'Ação inválida.' using errcode = 'check_violation';
  end if;
end;
$$;

-- campanha já com o modelo do oficial
drop function if exists public.turbo_criar_campanha(uuid, text, jsonb, text, text, integer, timestamptz);
create or replace function public.turbo_criar_campanha(p_loja uuid, p_nome text, p_publico jsonb, p_mensagem text, p_cupom text, p_janela integer, p_quando timestamptz, p_modelo uuid default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform private.turbo_pode(p_loja);
  if p_cupom is not null and p_cupom <> '' and not exists (select 1 from public.cupons where loja_id = p_loja and codigo = upper(p_cupom)) then
    raise exception 'Cupom % não existe nesta loja (crie em Cupons).', upper(p_cupom) using errcode = 'check_violation';
  end if;
  if p_modelo is not null and not exists (select 1 from public.whatsapp_modelos where id = p_modelo and loja_id = p_loja) then
    raise exception 'Modelo não encontrado.' using errcode = 'no_data_found';
  end if;
  insert into public.turbo_campanhas (loja_id, nome, publico, mensagem, cupom, janela_dias, agendada_para, status, criado_por, modelo_id)
  values (p_loja, btrim(p_nome), coalesce(p_publico, '{}'::jsonb), btrim(p_mensagem), nullif(upper(btrim(coalesce(p_cupom, ''))), ''),
          greatest(1, least(coalesce(p_janela, 5), 30)), p_quando, case when p_quando is not null and p_quando > now() then 'agendada' else 'rascunho' end, auth.uid(), p_modelo)
  returning id into v_id;
  if p_quando is null or p_quando <= now() then
    return private.turbo_gerar_campanha(v_id);
  end if;
  return 0;
end;
$$;
grant execute on function public.turbo_criar_campanha(uuid, text, jsonb, text, text, integer, timestamptz, uuid) to authenticated;

-- resultados por canal (30 dias por padrão)
create or replace function public.turbo_canais(p_loja uuid, p_dias integer default 30)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.turbo_pode(p_loja);
  return (
    with e as (select * from public.turbo_envios where loja_id = p_loja and coalesce(enviado_em, criado_em) > now() - make_interval(days => p_dias))
    select jsonb_build_object(
      'manual', jsonb_build_object(
         'enviados', (select count(*) from e where status = 'enviado' and wa_id is null),
         'conversoes', (select count(*) from e where wa_id is null and pedido_id is not null),
         'receita', (select coalesce(sum(valor), 0) from e where wa_id is null and pedido_id is not null)),
      'oficial', jsonb_build_object(
         'enviados', (select count(*) from e where status = 'enviado' and wa_id is not null),
         'entregues', (select count(*) from e where wa_id is not null and entregue_em is not null),
         'lidas', (select count(*) from e where wa_id is not null and lido_em is not null),
         'falhas', (select count(*) from e where status = 'erro'),
         'conversoes', (select count(*) from e where wa_id is not null and pedido_id is not null),
         'receita', (select coalesce(sum(valor), 0) from e where wa_id is not null and pedido_id is not null)),
      'conectado', exists (select 1 from private.whatsapp_contas w where w.loja_id = p_loja)));
end;
$$;
grant execute on function public.turbo_canais(uuid, integer) to authenticated;
