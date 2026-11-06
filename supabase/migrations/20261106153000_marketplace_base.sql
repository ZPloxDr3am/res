-- Marketplaces, base para o iFood (D-074). Pode rodar de novo.
-- Deixa o RES pronto para receber pedidos de marketplace antes de existir a conta do iFood:
--   * o pedido guarda o que a homologação do iFood exige mostrar: nº do iFood, código de retirada,
--     bandeira do cartão, troco, cupom com quem paga (loja × iFood), CPF/CNPJ, observação da entrega,
--     acréscimos (taxa de serviço / pedido mínimo) e se a entrega é do próprio iFood;
--   * loja ↔ merchant do iFood (com modo "teste"), eventos sem repetição, itens do iFood ligados aos
--     produtos do RES (ficha técnica e estoque) e fila do que precisa voltar para o iFood
--     (confirmar, pronto, saiu, cancelar);
--   * simulador: no modo teste, o painel cria pedidos e eventos iguais aos do iFood.
-- A chamada à API do iFood (token, polling, webhook) fica no servidor (apps/web/lib/marketplace).

-- 1. Pedido
alter table public.pedidos add column if not exists acrescimo numeric(12, 2) not null default 0;
alter table public.pedidos add column if not exists externo_canal text;
alter table public.pedidos add column if not exists externo_id text;
alter table public.pedidos add column if not exists externo_codigo text;
alter table public.pedidos add column if not exists codigo_retirada text;
alter table public.pedidos add column if not exists cartao_bandeira text;
alter table public.pedidos add column if not exists documento_cliente text;
alter table public.pedidos add column if not exists localizador text;
alter table public.pedidos add column if not exists observacao_entrega text;
alter table public.pedidos add column if not exists beneficios jsonb;
alter table public.pedidos add column if not exists entrega_marketplace boolean not null default false;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_acrescimo_positivo') then
    alter table public.pedidos add constraint pedidos_acrescimo_positivo check (acrescimo >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pedidos_externo_canal') then
    alter table public.pedidos add constraint pedidos_externo_canal check (externo_canal is null or externo_canal in ('ifood'));
  end if;
  -- o total passa a contar o acréscimo (vale também para a taxa de serviço do salão, depois)
  if exists (select 1 from pg_constraint where conname = 'pedido_total' and pg_get_constraintdef(oid) not like '%acrescimo%') then
    alter table public.pedidos drop constraint pedido_total;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'pedido_total') then
    alter table public.pedidos add constraint pedido_total check (total = subtotal + taxa_entrega + acrescimo - desconto);
  end if;
end $$;
create unique index if not exists pedidos_externo_idx on public.pedidos (externo_canal, externo_id) where externo_id is not null;

-- 2. Loja ↔ merchant
create table if not exists public.marketplace_lojas (
  id           uuid primary key default gen_random_uuid(),
  loja_id      uuid not null references public.lojas (id) on delete cascade,
  marca_id     uuid not null,
  canal        text not null default 'ifood' check (canal in ('ifood')),
  merchant_id  text not null check (length(btrim(merchant_id)) between 1 and 80),
  modo         text not null default 'teste' check (modo in ('teste', 'producao')),
  ativo        boolean not null default true,
  conectado_em timestamptz not null default now(),
  ultimo_evento_em timestamptz,
  foreign key (marca_id, loja_id) references public.marcas (id, loja_id) on delete cascade,
  unique (canal, merchant_id),
  unique (loja_id, canal, marca_id)
);
alter table public.marketplace_lojas enable row level security;
drop policy if exists marketplace_lojas_ler on public.marketplace_lojas;
create policy marketplace_lojas_ler on public.marketplace_lojas for select to authenticated using (private.e_membro(loja_id));
drop policy if exists marketplace_lojas_gestor on public.marketplace_lojas;
create policy marketplace_lojas_gestor on public.marketplace_lojas for all to authenticated using (private.e_gestor(loja_id)) with check (private.e_gestor(loja_id));
grant select, insert, update, delete on public.marketplace_lojas to authenticated;
revoke all on public.marketplace_lojas from anon;

-- 3. Itens do iFood ↔ produtos do RES (aprendidos sozinhos a cada pedido)
create table if not exists public.marketplace_itens (
  loja_id    uuid not null references public.lojas (id) on delete cascade,
  canal      text not null default 'ifood',
  chave      text not null,               -- externalCode do iFood, ou o nome em minúsculas
  nome       text not null,
  tipo       text not null default 'item' check (tipo in ('item', 'opcao')),
  produto_id uuid references public.produtos (id) on delete set null,
  opcao_id   uuid references public.opcoes (id) on delete set null,
  vezes      integer not null default 0,
  visto_em   timestamptz not null default now(),
  primary key (loja_id, canal, tipo, chave)
);
alter table public.marketplace_itens enable row level security;
drop policy if exists marketplace_itens_ler on public.marketplace_itens;
create policy marketplace_itens_ler on public.marketplace_itens for select to authenticated using (private.e_membro(loja_id));
drop policy if exists marketplace_itens_escrever on public.marketplace_itens;
create policy marketplace_itens_escrever on public.marketplace_itens for update to authenticated
  using (private.tem_permissao(loja_id, 'cardapio')) with check (private.tem_permissao(loja_id, 'cardapio'));
grant select, update on public.marketplace_itens to authenticated;
revoke all on public.marketplace_itens from anon;

-- 4. Eventos recebidos (sem repetição) e fila de volta para o marketplace
create table if not exists private.marketplace_eventos (
  id           bigserial primary key,
  canal        text not null,
  evento_id    text not null,
  codigo       text not null,
  externo_id   text,
  merchant_id  text,
  recebido_em  timestamptz not null default now(),
  processado_em timestamptz,
  erro         text,
  unique (canal, evento_id)
);
create table if not exists public.marketplace_saida (
  id          bigserial primary key,
  loja_id     uuid not null references public.lojas (id) on delete cascade,
  pedido_id   uuid not null references public.pedidos (id) on delete cascade,
  canal       text not null,
  externo_id  text not null,
  acao        text not null check (acao in ('confirm', 'readyToPickup', 'dispatch', 'requestCancellation')),
  payload     jsonb not null default '{}'::jsonb,
  situacao    text not null default 'pendente' check (situacao in ('pendente', 'enviado', 'erro', 'simulado')),
  tentativas  smallint not null default 0,
  erro        text,
  criado_em   timestamptz not null default now(),
  enviado_em  timestamptz
);
create index if not exists marketplace_saida_pendente on public.marketplace_saida (criado_em) where situacao in ('pendente', 'erro');
alter table public.marketplace_saida enable row level security;
drop policy if exists marketplace_saida_ler on public.marketplace_saida;
create policy marketplace_saida_ler on public.marketplace_saida for select to authenticated using (private.e_membro(loja_id));
grant select on public.marketplace_saida to authenticated;
revoke all on public.marketplace_saida from anon;

-- 5. Item do marketplace → produto do RES: pelo vínculo aprendido; senão o externalCode é o id do
--    produto no RES (quando o cardápio do iFood é montado com ele); senão o mesmo nome na loja.
create or replace function private.produto_do_marketplace(p_loja uuid, p_canal text, p_tipo text, p_chave text, p_nome text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v uuid;
begin
  select case when p_tipo = 'item' then produto_id else opcao_id end into v
    from public.marketplace_itens where loja_id = p_loja and canal = p_canal and tipo = p_tipo and chave = p_chave;
  if v is null and p_chave ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    if p_tipo = 'item' then
      select id into v from public.produtos where id = p_chave::uuid and loja_id = p_loja;
    else
      select o.id into v from public.opcoes o where o.id = p_chave::uuid and o.loja_id = p_loja;
    end if;
  end if;
  if v is null and p_tipo = 'item' then
    select id into v from public.produtos where loja_id = p_loja and lower(btrim(nome)) = lower(btrim(p_nome)) order by criado_em limit 1;
  end if;
  insert into public.marketplace_itens (loja_id, canal, tipo, chave, nome, produto_id, opcao_id, vezes)
  values (p_loja, p_canal, p_tipo, p_chave, left(p_nome, 200), case when p_tipo = 'item' then v end, case when p_tipo = 'opcao' then v end, 1)
  on conflict (loja_id, canal, tipo, chave) do update
     set vezes = marketplace_itens.vezes + 1, visto_em = now(), nome = excluded.nome,
         produto_id = coalesce(marketplace_itens.produto_id, excluded.produto_id),
         opcao_id = coalesce(marketplace_itens.opcao_id, excluded.opcao_id);
  return v;
end;
$$;

-- 6. Recebe um pedido já traduzido (packages/core normalizarPedidoIfood). Idempotente: o mesmo
--    pedido do marketplace nunca entra duas vezes. Devolve o id do pedido no RES.
create or replace function private.receber_pedido_externo(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ml     public.marketplace_lojas;
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
  select * into v_ml from public.marketplace_lojas
   where canal = p ->> 'canal' and merchant_id = p ->> 'merchant_id' and ativo;
  if not found then
    raise exception 'Loja do marketplace não conectada ao RES (%).', p ->> 'merchant_id' using errcode = 'no_data_found';
  end if;
  select id into v_id from public.pedidos where externo_canal = p ->> 'canal' and externo_id = p ->> 'externo_id';
  if v_id is not null then
    return v_id;
  end if;
  if v_tipo = 'entrega' then
    v_end := jsonb_strip_nulls(jsonb_build_object(
      'logradouro', coalesce(nullif(p #>> '{endereco,logradouro}', ''), 'Endereço no iFood'),
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
    v_tipo, 'ifood', left(coalesce(nullif(btrim(p #>> '{cliente,nome}'), ''), 'Cliente iFood'), 120), nullif(p #>> '{cliente,telefone}', ''), v_end,
    (p ->> 'subtotal')::numeric, (p ->> 'taxa_entrega')::numeric, coalesce((p ->> 'acrescimo')::numeric, 0), (p ->> 'desconto')::numeric,
    (p ->> 'subtotal')::numeric + (p ->> 'taxa_entrega')::numeric + coalesce((p ->> 'acrescimo')::numeric, 0) - (p ->> 'desconto')::numeric,
    (p ->> 'pagamento')::public.forma_pagamento, nullif(p ->> 'troco_para', '')::numeric, left(p ->> 'observacao', 500),
    case when v_auto then now() end, v_agend, case when (p ->> 'pago_online')::boolean then now() end,
    p ->> 'canal', p ->> 'externo_id', left(p ->> 'externo_codigo', 20), left(p ->> 'codigo_retirada', 20), left(p ->> 'cartao_bandeira', 40),
    left(p #>> '{cliente,documento}', 14), left(p #>> '{cliente,localizador}', 20), left(p ->> 'observacao_entrega', 300),
    nullif(p -> 'beneficios', '[]'::jsonb), coalesce((p ->> 'entrega_pelo_marketplace')::boolean, false),
    nullif(p #>> '{endereco,lat}', '')::double precision, nullif(p #>> '{endereco,lng}', '')::double precision)
  returning id into v_id;

  for it in select * from jsonb_array_elements(p -> 'itens') loop
    k := k + 1;
    insert into public.pedido_itens (loja_id, pedido_id, produto_id, nome, quantidade, preco_base, preco_unitario, total, observacao, ordem)
    values (v_ml.loja_id, v_id,
            private.produto_do_marketplace(v_ml.loja_id, p ->> 'canal', 'item', coalesce(nullif(it ->> 'externo_codigo', ''), lower(btrim(it ->> 'nome'))), it ->> 'nome'),
            left(it ->> 'nome', 200), (it ->> 'quantidade')::integer, (it ->> 'preco_unitario')::numeric, (it ->> 'preco_unitario')::numeric,
            (it ->> 'preco_unitario')::numeric * (it ->> 'quantidade')::integer, left(it ->> 'observacao', 300), k)
    returning id into v_item;
    j := 0;
    for op in select * from jsonb_array_elements(coalesce(it -> 'opcoes', '[]'::jsonb)) loop
      j := j + 1;
      insert into public.pedido_item_opcoes (loja_id, item_id, grupo_nome, opcao_id, nome, quantidade, preco, ordem)
      values (v_ml.loja_id, v_item, left(coalesce(op ->> 'grupo', 'Opções'), 120),
              private.produto_do_marketplace(v_ml.loja_id, p ->> 'canal', 'opcao', coalesce(nullif(op ->> 'externo_codigo', ''), lower(btrim(op ->> 'nome'))), op ->> 'nome'),
              left(op ->> 'nome', 200), (op ->> 'quantidade')::integer, (op ->> 'preco')::numeric, j);
    end loop;
  end loop;

  insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por)
  values (v_ml.loja_id, v_id, null, 'novo', 'Pedido do iFood #' || coalesce(p ->> 'externo_codigo', ''), null);
  if v_auto then
    insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por) values (v_ml.loja_id, v_id, 'novo', 'em_preparo', 'Aceite automático', null);
    perform private.enfileirar_marketplace(v_id, 'confirm', '{}'::jsonb);
  end if;
  update public.marketplace_lojas set ultimo_evento_em = now() where id = v_ml.id;
  return v_id;
end;
$$;

-- 7. Fila de volta: no modo teste fica "simulado" (nada sai do RES)
create or replace function private.enfileirar_marketplace(p_pedido uuid, p_acao text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v record;
begin
  select pd.loja_id, pd.externo_canal, pd.externo_id, coalesce(ml.modo, 'teste') as modo into v
    from public.pedidos pd left join public.marketplace_lojas ml on ml.loja_id = pd.loja_id and ml.marca_id = pd.marca_id and ml.canal = pd.externo_canal
   where pd.id = p_pedido;
  if v.externo_id is null then
    return;
  end if;
  insert into public.marketplace_saida (loja_id, pedido_id, canal, externo_id, acao, payload, situacao, enviado_em)
  values (v.loja_id, p_pedido, v.externo_canal, v.externo_id, p_acao, coalesce(p_payload, '{}'::jsonb),
          case when v.modo = 'teste' then 'simulado' else 'pendente' end, case when v.modo = 'teste' then now() end);
end;
$$;

-- Mudou o status no RES → o que avisar o marketplace (igual a acaoParaIfood do core).
-- Mudança que veio do próprio marketplace não volta (res.origem_externa).
create or replace function private.pedido_para_marketplace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_acao text;
begin
  if new.externo_id is null or new.status = old.status or coalesce(current_setting('res.origem_externa', true), '') = '1' then
    return new;
  end if;
  v_acao := case
    when new.status = 'cancelado' then 'requestCancellation'
    when old.status = 'novo' and new.status = 'em_preparo' then 'confirm'
    when new.status = 'pronto' and (new.tipo = 'retirada' or new.entrega_marketplace) then 'readyToPickup'
    when new.status = 'em_entrega' and new.tipo = 'entrega' and not new.entrega_marketplace then 'dispatch'
  end;
  if v_acao = 'confirm' and exists (select 1 from public.marketplace_saida s where s.pedido_id = new.id and s.acao = 'confirm') then
    v_acao := null;
  end if;
  if v_acao is not null then
    perform private.enfileirar_marketplace(new.id, v_acao,
      case when v_acao = 'requestCancellation'
           then jsonb_build_object('cancellationCode', coalesce(substring(new.motivo_cancelamento from '^\s*\[?(\d{3})'), '501'),
                                   'reason', coalesce(new.motivo_cancelamento, 'Cancelado pela loja'))
           else '{}'::jsonb end);
  end if;
  return new;
end;
$$;
drop trigger if exists pedidos_marketplace on public.pedidos;
create trigger pedidos_marketplace after update of status on public.pedidos for each row execute function private.pedido_para_marketplace();

-- 8. Evento do marketplace sobre um pedido que já existe (confirmado em outro app, cancelado pelo cliente…)
create or replace function private.aplicar_evento_externo(p_canal text, p_externo_id text, p_codigo text, p_motivo text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped  public.pedidos;
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
         motivo_cancelamento = case when v_para = 'cancelado' then coalesce(left(p_motivo, 300), 'Cancelado no iFood') else motivo_cancelamento end
   where id = v_ped.id;
  insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por)
  values (v_ped.loja_id, v_ped.id, v_ped.status, v_para, 'iFood: ' || coalesce(p_motivo, p_codigo), null);
  perform set_config('res.origem_externa', '', true);
  return v_para::text;
end;
$$;

-- 9. Portas de entrada
-- Servidor (rota do webhook/polling, com a chave de serviço): registra o evento uma vez só.
create or replace function public.marketplace_registrar_evento(p_canal text, p_evento_id text, p_codigo text, p_externo_id text, p_merchant_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.marketplace_eventos (canal, evento_id, codigo, externo_id, merchant_id)
  values (p_canal, p_evento_id, p_codigo, p_externo_id, p_merchant_id)
  on conflict (canal, evento_id) do nothing;
  return found;
end;
$$;
create or replace function public.marketplace_receber_pedido(p jsonb)
returns uuid language sql security definer set search_path = '' as $$ select private.receber_pedido_externo(p); $$;
create or replace function public.marketplace_aplicar_evento(p_canal text, p_externo_id text, p_codigo text, p_motivo text default null)
returns text language sql security definer set search_path = '' as $$ select private.aplicar_evento_externo(p_canal, p_externo_id, p_codigo, p_motivo); $$;
create or replace function public.marketplace_marcar_saida(p_id bigint, p_ok boolean, p_erro text default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.marketplace_saida
     set situacao = case when p_ok then 'enviado' else 'erro' end, tentativas = tentativas + 1,
         erro = case when p_ok then null else left(p_erro, 500) end, enviado_em = case when p_ok then now() end
   where id = p_id;
$$;
revoke execute on function public.marketplace_registrar_evento(text, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.marketplace_receber_pedido(jsonb) from public, anon, authenticated;
revoke execute on function public.marketplace_aplicar_evento(text, text, text, text) from public, anon, authenticated;
revoke execute on function public.marketplace_marcar_saida(bigint, boolean, text) from public, anon, authenticated;
grant execute on function public.marketplace_registrar_evento(text, text, text, text, text) to service_role;
grant execute on function public.marketplace_receber_pedido(jsonb) to service_role;
grant execute on function public.marketplace_aplicar_evento(text, text, text, text) to service_role;
grant execute on function public.marketplace_marcar_saida(bigint, boolean, text) to service_role;

-- Painel (dono/gerente), só no modo teste: simula pedido e eventos do iFood.
create or replace function public.simular_pedido_marketplace(p_loja uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.marketplace_lojas where loja_id = p_loja and canal = p ->> 'canal' and merchant_id = p ->> 'merchant_id' and modo = 'teste') then
    raise exception 'O simulador só funciona com a loja do iFood em modo teste.' using errcode = 'check_violation';
  end if;
  return private.receber_pedido_externo(p);
end;
$$;
create or replace function public.simular_evento_marketplace(p_pedido uuid, p_codigo text, p_motivo text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v public.pedidos;
begin
  select * into v from public.pedidos where id = p_pedido;
  if not found or not private.e_gestor(v.loja_id) then
    raise exception 'Pedido não encontrado.' using errcode = 'no_data_found';
  end if;
  if not exists (select 1 from public.marketplace_lojas where loja_id = v.loja_id and marca_id = v.marca_id and canal = v.externo_canal and modo = 'teste') then
    raise exception 'O simulador só funciona com a loja do iFood em modo teste.' using errcode = 'check_violation';
  end if;
  return private.aplicar_evento_externo(v.externo_canal, v.externo_id, p_codigo, p_motivo);
end;
$$;
revoke execute on function public.simular_pedido_marketplace(uuid, jsonb) from public, anon;
revoke execute on function public.simular_evento_marketplace(uuid, text, text) from public, anon;
grant execute on function public.simular_pedido_marketplace(uuid, jsonb) to authenticated;
grant execute on function public.simular_evento_marketplace(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Cupom: o snapshot leva os dados do marketplace (número do app, código de retirada,
-- bandeira, CPF/CNPJ, acréscimo e o desconto dividido loja × app). Base: 20261024000024.
-- ---------------------------------------------------------------------------
create or replace function private.dados_cupom(p_pedido uuid, p_itens uuid[] default null, p_setor text default null)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'loja', l.nome, 'marca', m.nome, 'marca_id', m.id, 'numero', p.numero, 'tipo_pedido', p.tipo, 'origem', p.origem,
    'criado_em', p.criado_em, 'agendado_para', p.agendado_para, 'fuso', l.fuso_horario, 'setor', p_setor,
    'cliente', jsonb_build_object('nome', p.cliente_nome, 'telefone', p.cliente_telefone),
    'endereco', p.endereco, 'cidade', l.cidade,
    'observacao', p.observacao,
    'pagamento', p.pagamento, 'troco_para', round(p.troco_para * 100),
    'subtotal', round(p.subtotal * 100), 'taxa_entrega', round(p.taxa_entrega * 100), 'desconto', round(p.desconto * 100),
    'acrescimo', round(p.acrescimo * 100),
    'total', round(p.total * 100),
    -- entregador do app não usa o QR do motoboy da loja
    'qr', case when p.tipo = 'entrega' and not p.entrega_marketplace then p.qr_token end,
    -- já pago (online ou marcado no painel): a comanda e o celular dizem NÃO COBRAR
    'pago', p.pagamento = 'online' or p.pago_em is not null,
    'externo_codigo', p.externo_codigo, 'codigo_retirada', p.codigo_retirada, 'cartao_bandeira', p.cartao_bandeira,
    'documento_cliente', p.documento_cliente, 'entrega_marketplace', p.entrega_marketplace,
    'observacao_entrega', p.observacao_entrega,
    'desconto_loja', (select round(coalesce(sum((b ->> 'loja')::numeric), 0) * 100) from jsonb_array_elements(coalesce(p.beneficios, '[]'::jsonb)) b),
    'desconto_marketplace', (select round(coalesce(sum((b ->> 'marketplace')::numeric), 0) * 100) from jsonb_array_elements(coalesce(p.beneficios, '[]'::jsonb)) b),
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
               'quantidade', i.quantidade, 'nome', i.nome, 'total', round(i.total * 100), 'observacao', i.observacao,
               'opcoes', coalesce((select jsonb_agg(jsonb_build_object('grupo', o.grupo_nome, 'nome', o.nome, 'quantidade', o.quantidade, 'fracao', o.fracao,
                                                    'passo', o.grupo_id is null and o.opcao_id is null) order by o.ordem, o.id)
                                     from public.pedido_item_opcoes o where o.item_id = i.id), '[]'::jsonb))
             order by i.ordem)
        from public.pedido_itens i
       where i.pedido_id = p.id and (p_itens is null or i.id = any (p_itens))), '[]'::jsonb))
  from public.pedidos p
  join public.marcas m on m.id = p.marca_id
  join public.lojas l on l.id = p.loja_id
  where p.id = p_pedido;
$$;
