-- D-113 · Integrações, etapa 2: pedido canônico. Todo canal traduz o pedido para o mesmo formato
-- (packages/core PedidoExterno) e entra por marketplace_receber_pedido → private.receber_pedido_externo, agora
-- genérica: conexão pelo id do app OU pela URL (Open Delivery), origem = canal, balcão, telefone mascarado
-- (não vira WhatsApp), item sem vínculo entra como texto e o pedido fica sinalizado (Q-13), e o mapa guarda o
-- corpo original, o total informado pelo app e o prazo. O preço é o do app: não recalcula.
-- Base: 20261106153000_marketplace_base.sql (D-074). Pode rodar de novo.

alter table public.marketplace_pedidos add column if not exists marketplace_loja_id uuid references public.marketplace_lojas (id) on delete set null;
alter table public.marketplace_pedidos add column if not exists itens_sem_vinculo smallint not null default 0;
alter table public.marketplace_pedidos add column if not exists telefone_mascarado boolean not null default false;
alter table public.marketplace_pedidos add column if not exists prazo_min integer;
alter table public.marketplace_pedidos add column if not exists entregador jsonb;
alter table public.marketplace_pedidos add column if not exists cancelamento_solicitado jsonb;

create or replace function private.receber_pedido_externo(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ml     public.marketplace_lojas;
  v_canal  text := p ->> 'canal';
  v_nome   text;
  v_sem    integer := 0;
  v_prod   uuid;
  v_id     uuid;
  v_numero integer;
  v_auto   boolean;
  v_item   uuid;
  v_tipo   public.tipo_pedido := (p ->> 'tipo')::public.tipo_pedido;
  v_agend  timestamptz := nullif(p ->> 'agendado_para', '')::timestamptz;
  v_end    jsonb;
  it       jsonb;
  op       jsonb;
  k        integer := 0;
  j        integer;
begin
  -- Open Delivery: a conexão vem pela URL (marketplace_loja_id); os outros, pelo id da loja no app
  if nullif(p ->> 'marketplace_loja_id', '') is not null then
    select * into v_ml from public.marketplace_lojas where id = (p ->> 'marketplace_loja_id')::uuid and canal = v_canal and ativo;
  else
    select * into v_ml from public.marketplace_lojas where canal = v_canal and merchant_id = p ->> 'merchant_id' and ativo;
  end if;
  if not found then
    raise exception 'Loja do marketplace não conectada ao RES (% %).', v_canal, coalesce(p ->> 'merchant_id', p ->> 'marketplace_loja_id') using errcode = 'no_data_found';
  end if;
  select nome into v_nome from public.canais where chave = v_canal;
  select id into v_id from public.pedidos where externo_canal = v_canal and externo_id = p ->> 'externo_id';
  if v_id is not null then
    return v_id;
  end if;
  if v_tipo = 'entrega' then
    v_end := jsonb_strip_nulls(jsonb_build_object(
      'logradouro', coalesce(nullif(p #>> '{endereco,logradouro}', ''), 'Endereço no ' || v_nome),
      'numero', p #>> '{endereco,numero}',
      'bairro', coalesce(nullif(p #>> '{endereco,bairro}', ''), '—'),
      'complemento', p #>> '{endereco,complemento}',
      'referencia', p #>> '{endereco,referencia}',
      'cidade', p #>> '{endereco,cidade}',
      'cep', p #>> '{endereco,cep}'));
  end if;
  insert into private.contador_pedidos as c (loja_id, ultimo) values (v_ml.loja_id, 1)
  on conflict (loja_id) do update set ultimo = c.ultimo + 1
  returning ultimo into v_numero;
  select l.aceite_automatico and v_agend is null into v_auto from public.lojas l where l.id = v_ml.loja_id;

  insert into public.pedidos (
    loja_id, marca_id, numero, status, tipo, origem, cliente_nome, cliente_telefone, endereco,
    subtotal, taxa_entrega, acrescimo, desconto, total, pagamento, troco_para, observacao, aceito_em, agendado_para, pago_em,
    externo_canal, externo_id, externo_codigo, codigo_retirada, cartao_bandeira, documento_cliente, localizador,
    observacao_entrega, beneficios, entrega_marketplace, destino_lat, destino_lng)
  values (
    v_ml.loja_id, v_ml.marca_id, v_numero, case when v_auto then 'em_preparo'::public.status_pedido else 'novo'::public.status_pedido end,
    v_tipo, v_canal::public.origem_pedido, left(coalesce(nullif(btrim(p #>> '{cliente,nome}'), ''), 'Cliente ' || v_nome), 120),
    case when coalesce((p ->> 'telefone_mascarado')::boolean, false) then null else nullif(p #>> '{cliente,telefone}', '') end, v_end,
    (p ->> 'subtotal')::numeric, (p ->> 'taxa_entrega')::numeric, coalesce((p ->> 'acrescimo')::numeric, 0), (p ->> 'desconto')::numeric,
    (p ->> 'subtotal')::numeric + (p ->> 'taxa_entrega')::numeric + coalesce((p ->> 'acrescimo')::numeric, 0) - (p ->> 'desconto')::numeric,
    (p ->> 'pagamento')::public.forma_pagamento, nullif(p ->> 'troco_para', '')::numeric, left(p ->> 'observacao', 500),
    case when v_auto then now() end, v_agend, case when (p ->> 'pago_online')::boolean then now() end,
    v_canal, p ->> 'externo_id', left(p ->> 'externo_codigo', 20), left(p ->> 'codigo_retirada', 20), left(p ->> 'cartao_bandeira', 40),
    left(p #>> '{cliente,documento}', 14), left(p #>> '{cliente,localizador}', 20), left(p ->> 'observacao_entrega', 300),
    nullif(p -> 'beneficios', '[]'::jsonb), coalesce((p ->> 'entrega_pelo_marketplace')::boolean, p ->> 'entregue_por' = 'marketplace', false),
    nullif(p #>> '{endereco,lat}', '')::double precision, nullif(p #>> '{endereco,lng}', '')::double precision)
  returning id into v_id;

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

  insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por)
  values (v_ml.loja_id, v_id, null, 'novo', 'Pedido do ' || v_nome || ' #' || coalesce(p ->> 'externo_codigo', ''), null);
  -- o mapa (criado pelo gatilho do pedido) ganha o corpo original e o que só interessa ao canal
  update public.marketplace_pedidos
     set corpo_original = p -> 'corpo_original', url_detalhes = left(p ->> 'url_detalhes', 500),
         total_externo = nullif(p ->> 'total_externo', '')::numeric, status_externo = 'CREATED',
         itens_sem_vinculo = v_sem, telefone_mascarado = coalesce((p ->> 'telefone_mascarado')::boolean, false),
         prazo_min = nullif(p ->> 'prazo_min', '')::integer, marketplace_loja_id = v_ml.id, atualizado_em = now()
   where pedido_id = v_id;
  if v_auto then
    insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por) values (v_ml.loja_id, v_id, 'novo', 'em_preparo', 'Aceite automático', null);
    perform private.enfileirar_marketplace(v_id, 'confirm', '{}'::jsonb);
  end if;
  update public.marketplace_lojas set ultimo_evento_em = now(), ultimo_sinal = now() where id = v_ml.id;
  return v_id;
end;
$$;

