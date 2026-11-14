-- D-114 · Integrações, etapa 3: iFood pronto para a homologação (spec, seção 4; critérios da 4.8).
--   * token do app guardado no banco (vale 6 h para todas as lojas): renova só perto de vencer, mesmo com
--     várias instâncias do servidor — a homologação reprova token pedido a cada chamada;
--   * KEEPALIVE: quais lojas estão abertas agora (pausa e horário da marca) → o iFood deixa só elas online;
--   * eventos: resultado gravado (erro aparece no card e dá para reprocessar), status externo, entregador do
--     iFood (ADR/GTO/AAO/CLT/AAD), cancelamento solicitado (CAR/CARF), pedido alterado (OPA) e endereço
--     alterado (DAR) refazem itens e valores enquanto o pedido não saiu;
--   * pausar a loja no RES (D-034) avisa o iFood (interrupção) e reabrir tira a interrupção.
-- Pode rodar de novo.

-- 1. Token do app ------------------------------------------------------------------------------------
create table if not exists private.marketplace_app_tokens (
  canal     text primary key references public.canais (chave),
  token     text not null,
  expira_em timestamptz not null,
  gerado_em timestamptz not null default now()
);
revoke all on private.marketplace_app_tokens from public, anon, authenticated;
create or replace function public.marketplace_app_token_ler(p_canal text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('token', token, 'expira_em', expira_em) from private.marketplace_app_tokens where canal = p_canal;
$$;
create or replace function public.marketplace_app_token_gravar(p_canal text, p_token text, p_expira_em timestamptz)
returns void language sql security definer set search_path = '' as $$
  insert into private.marketplace_app_tokens (canal, token, expira_em) values (p_canal, p_token, p_expira_em)
  on conflict (canal) do update set token = excluded.token, expira_em = excluded.expira_em, gerado_em = now();
$$;
revoke all on function public.marketplace_app_token_ler(text) from public, anon, authenticated;
revoke all on function public.marketplace_app_token_gravar(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.marketplace_app_token_ler(text) to service_role;
grant execute on function public.marketplace_app_token_gravar(text, text, timestamptz) to service_role;

-- 2. KEEPALIVE: das lojas que o app perguntou, as que estão abertas agora ------------------------------
create or replace function public.marketplace_abertas(p_canal text, p_merchants text[])
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct ml.merchant_id), '{}')
    from public.marketplace_lojas ml
   where ml.canal = p_canal and ml.ativo and ml.estado = 'conectado' and ml.merchant_id = any (p_merchants)
     and private.marca_aberta(ml.marca_id);
$$;
revoke all on function public.marketplace_abertas(text, text[]) from public, anon, authenticated;
grant execute on function public.marketplace_abertas(text, text[]) to service_role;

-- 3. Resultado do evento (erro no card, reprocessar) ---------------------------------------------------
create or replace function public.marketplace_evento_resultado(p_canal text, p_evento_id text, p_erro text)
returns void language sql security definer set search_path = '' as $$
  update private.marketplace_eventos
     set processado_em = case when p_erro is null then now() else processado_em end,
         erro = left(p_erro, 500), tentativas = tentativas + 1
   where canal = p_canal and evento_id = p_evento_id;
$$;
revoke all on function public.marketplace_evento_resultado(text, text, text) from public, anon, authenticated;
grant execute on function public.marketplace_evento_resultado(text, text, text) to service_role;

-- 4. O que o evento diz sobre o pedido, além do status: entregador, cancelamento solicitado ----------------
create or replace function public.marketplace_evento_info(p_canal text, p_externo_id text, p_codigo text, p_dados jsonb default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.marketplace_pedidos mp
     set status_externo = left(p_codigo, 40),
         entregador = case when p_dados ? 'entregador' then coalesce(mp.entregador, '{}'::jsonb) || (p_dados -> 'entregador') || jsonb_build_object('etapa', p_codigo, 'em', now())
                           else mp.entregador end,
         cancelamento_solicitado = case
           when p_codigo in ('CAR', 'CANCELLATION_REQUESTED') then coalesce(p_dados -> 'cancelamento', '{}'::jsonb) || jsonb_build_object('em', now())
           when p_codigo in ('CARF', 'CANCELLATION_REQUEST_FAILED') then coalesce(mp.cancelamento_solicitado, '{}'::jsonb) || jsonb_build_object('negado', coalesce(p_dados ->> 'motivo', 'negado'), 'negado_em', now())
           else mp.cancelamento_solicitado end,
         atualizado_em = now()
   where mp.canal = p_canal and mp.externo_id = p_externo_id;
end;
$$;
revoke all on function public.marketplace_evento_info(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.marketplace_evento_info(text, text, text, jsonb) to service_role;

-- 5. Pedido alterado pelo app (OPA) ou endereço alterado (DAR): refaz itens, valores e endereço -----------
create or replace function private.atualizar_pedido_externo(p jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped   public.pedidos;
  v_ml    public.marketplace_lojas;
  v_id    uuid;
  v_canal text := p ->> 'canal';
  v_sem   integer := 0;
  v_prod  uuid;
  v_item  uuid;
  v_end   jsonb;
  it      jsonb;
  op      jsonb;
  k       integer := 0;
  j       integer;
begin
  select * into v_ped from public.pedidos where externo_canal = v_canal and externo_id = p ->> 'externo_id' for update;
  if not found then
    return 'sem_pedido';
  end if;
  if v_ped.status in ('em_entrega', 'concluido', 'cancelado') then
    return 'ignorado';
  end if;
  select * into v_ml from public.marketplace_lojas where loja_id = v_ped.loja_id and marca_id = v_ped.marca_id and canal = v_canal;
  v_id := v_ped.id;
  if v_ped.tipo = 'entrega' and p -> 'endereco' is not null and jsonb_typeof(p -> 'endereco') = 'object' then
    v_end := jsonb_strip_nulls(jsonb_build_object(
      'logradouro', coalesce(nullif(p #>> '{endereco,logradouro}', ''), v_ped.endereco ->> 'logradouro'),
      'numero', p #>> '{endereco,numero}', 'bairro', coalesce(nullif(p #>> '{endereco,bairro}', ''), v_ped.endereco ->> 'bairro'),
      'complemento', p #>> '{endereco,complemento}', 'referencia', p #>> '{endereco,referencia}',
      'cidade', p #>> '{endereco,cidade}', 'cep', p #>> '{endereco,cep}'));
  else
    v_end := v_ped.endereco;
  end if;
  delete from public.pedido_itens where pedido_id = v_id;
  for it in select * from jsonb_array_elements(p -> 'itens') loop
    k := k + 1;
    v_prod := private.produto_do_marketplace(v_ml.loja_id, v_canal, 'item', coalesce(nullif(it ->> 'externo_codigo', ''), lower(btrim(it ->> 'nome'))), it ->> 'nome');
    if v_prod is null then
      v_sem := v_sem + 1;   -- Q-13: entra como texto e o pedido fica sinalizado
    end if;
    insert into public.pedido_itens (loja_id, pedido_id, produto_id, nome, quantidade, preco_base, preco_unitario, total, observacao, ordem)
    values (v_ml.loja_id, v_id, v_prod,
            left(it ->> 'nome', 200), (it ->> 'quantidade')::integer, (it ->> 'preco_unitario')::numeric, (it ->> 'preco_unitario')::numeric,
            (it ->> 'preco_unitario')::numeric * (it ->> 'quantidade')::integer, left(it ->> 'observacao', 300), k)
    returning id into v_item;
    j := 0;
    for op in select * from jsonb_array_elements(coalesce(it -> 'opcoes', '[]'::jsonb)) loop
      j := j + 1;
      insert into public.pedido_item_opcoes (loja_id, item_id, grupo_nome, opcao_id, nome, quantidade, preco, ordem)
      values (v_ml.loja_id, v_item, left(coalesce(op ->> 'grupo', 'Opções'), 120),
              private.produto_do_marketplace(v_ml.loja_id, v_canal, 'opcao', coalesce(nullif(op ->> 'externo_codigo', ''), lower(btrim(op ->> 'nome'))), op ->> 'nome'),
              left(op ->> 'nome', 200), (op ->> 'quantidade')::integer, (op ->> 'preco')::numeric, j);
    end loop;
  end loop;


  update public.pedidos
     set subtotal = (p ->> 'subtotal')::numeric, taxa_entrega = (p ->> 'taxa_entrega')::numeric,
         acrescimo = coalesce((p ->> 'acrescimo')::numeric, 0), desconto = (p ->> 'desconto')::numeric,
         total = (p ->> 'subtotal')::numeric + (p ->> 'taxa_entrega')::numeric + coalesce((p ->> 'acrescimo')::numeric, 0) - (p ->> 'desconto')::numeric,
         endereco = v_end,
         destino_lat = coalesce(nullif(p #>> '{endereco,lat}', '')::double precision, destino_lat),
         destino_lng = coalesce(nullif(p #>> '{endereco,lng}', '')::double precision, destino_lng),
         observacao_entrega = coalesce(left(p ->> 'observacao_entrega', 300), observacao_entrega),
         beneficios = coalesce(nullif(p -> 'beneficios', '[]'::jsonb), beneficios),
         atualizado_em = now()
   where id = v_id;
  insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por)
  values (v_ped.loja_id, v_id, v_ped.status, v_ped.status, left(coalesce(p ->> 'motivo_alteracao', 'Pedido alterado no app'), 300), null);
  update public.marketplace_pedidos
     set corpo_original = coalesce(p -> 'corpo_original', corpo_original), total_externo = coalesce(nullif(p ->> 'total_externo', '')::numeric, total_externo),
         itens_sem_vinculo = v_sem, atualizado_em = now()
   where pedido_id = v_id;
  return 'atualizado';
end;
$$;
create or replace function public.marketplace_atualizar_pedido(p jsonb)
returns text language sql security definer set search_path = '' as $$ select private.atualizar_pedido_externo(p); $$;
revoke all on function public.marketplace_atualizar_pedido(jsonb) from public, anon, authenticated;
grant execute on function public.marketplace_atualizar_pedido(jsonb) to service_role;

-- 6. Evento de status: mensagem com o nome do canal (era fixo "iFood"). Base: D-074.
create or replace function private.aplicar_evento_externo(p_canal text, p_externo_id text, p_codigo text, p_motivo text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped  public.pedidos;
  v_nome text := coalesce((select nome from public.canais where chave = p_canal), p_canal);
  v_para public.status_pedido;
  ordem  text[] := array['novo', 'em_preparo', 'pronto', 'em_entrega', 'concluido'];
begin
  select * into v_ped from public.pedidos where externo_canal = p_canal and externo_id = p_externo_id for update;
  if not found then
    return 'sem_pedido';
  end if;
  v_para := case p_codigo
    when 'CFM' then 'em_preparo' when 'CONFIRMED' then 'em_preparo'
    when 'RTP' then 'pronto' when 'READY_TO_PICKUP' then 'pronto'
    when 'DSP' then 'em_entrega' when 'DISPATCHED' then 'em_entrega'
    when 'CON' then 'concluido' when 'CONCLUDED' then 'concluido'
    when 'CAN' then 'cancelado' when 'CANCELLED' then 'cancelado'
  end;
  if v_para is null or v_ped.status = 'cancelado' or v_ped.status = 'concluido' or v_ped.status = v_para then
    return 'ignorado';
  end if;
  -- não volta etapa (ex.: confirmado chega depois de "pronto" no RES)
  if v_para <> 'cancelado' and array_position(ordem, v_para::text) < array_position(ordem, v_ped.status::text) then
    return 'ignorado';
  end if;
  perform set_config('res.origem_externa', '1', true);
  update public.pedidos
     set status = v_para,
         aceito_em = case when v_para = 'em_preparo' then coalesce(aceito_em, now()) else aceito_em end,
         pronto_em = case when v_para = 'pronto' then coalesce(pronto_em, now()) else pronto_em end,
         saiu_em = case when v_para = 'em_entrega' then coalesce(saiu_em, now()) else saiu_em end,
         concluido_em = case when v_para = 'concluido' then now() else concluido_em end,
         cancelado_em = case when v_para = 'cancelado' then now() else cancelado_em end,
         motivo_cancelamento = case when v_para = 'cancelado' then coalesce(left(p_motivo, 300), 'Cancelado no ' || v_nome) else motivo_cancelamento end
   where id = v_ped.id;
  insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por)
  values (v_ped.loja_id, v_ped.id, v_ped.status, v_para, v_nome || ': ' || coalesce(p_motivo, p_codigo), null);
  perform set_config('res.origem_externa', '', true);
  return v_para::text;
end;
$$;


-- 7. Pausar/reabrir a loja (D-034) avisa os apps conectados em produção -------------------------------------
create or replace function private.loja_pausa_para_marketplace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare ml record;
begin
  if new.pausa_ate is not distinct from old.pausa_ate then
    return new;
  end if;
  for ml in select id, canal from public.marketplace_lojas where loja_id = new.id and ativo and modo = 'producao' and estado = 'conectado' and canal = 'ifood' loop
    insert into public.marketplace_saida (loja_id, canal, acao, payload, marketplace_loja_id)
    values (new.id, ml.canal,
            case when new.pausa_ate is not null and new.pausa_ate > now() then 'pausar' else 'abrir' end,
            case when new.pausa_ate is not null and new.pausa_ate > now()
                 then jsonb_build_object('fim', new.pausa_ate, 'descricao', 'Pausa pelo RES') else '{}'::jsonb end,
            ml.id);
  end loop;
  return new;
end;
$$;
drop trigger if exists lojas_pausa_marketplace on public.lojas;
create trigger lojas_pausa_marketplace after update of pausa_ate on public.lojas for each row execute function private.loja_pausa_para_marketplace();
