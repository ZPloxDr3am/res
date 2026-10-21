-- RES · 0005 · Pedidos de delivery: pedido, itens com as opções escolhidas (cópia do nome e
-- preço no momento da venda), histórico de status, numeração por loja e aceite automático.
-- O preço é recalculado aqui, a partir do cardápio, com as mesmas regras de
-- packages/core/src/preco.ts (D-009). O valor enviado pela tela nunca é confiado.

create type public.status_pedido as enum ('novo', 'em_preparo', 'pronto', 'em_entrega', 'concluido', 'cancelado');
create type public.tipo_pedido as enum ('entrega', 'retirada', 'balcao');
create type public.forma_pagamento as enum ('dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'vale_refeicao', 'online');
create type public.origem_pedido as enum ('painel', 'cardapio_digital', 'ifood', 'whatsapp');

alter table public.lojas
  add column aceite_automatico boolean not null default false,
  add column tempo_preparo_min integer not null default 30 check (tempo_preparo_min between 1 and 240);

create table private.contador_pedidos (
  loja_id uuid primary key references public.lojas (id) on delete cascade,
  ultimo  integer not null default 0
);

create table public.pedidos (
  id                  uuid primary key default gen_random_uuid(),
  loja_id             uuid not null references public.lojas (id) on delete cascade,
  marca_id            uuid not null,
  numero              integer not null,
  status              public.status_pedido not null default 'novo',
  tipo                public.tipo_pedido not null,
  origem              public.origem_pedido not null default 'painel',
  cliente_nome        text not null check (length(btrim(cliente_nome)) between 1 and 120),
  cliente_telefone    text check (cliente_telefone is null or cliente_telefone ~ '^[0-9]{10,13}$'),
  endereco            jsonb,
  subtotal            numeric(12, 2) not null check (subtotal >= 0),
  taxa_entrega        numeric(12, 2) not null default 0 check (taxa_entrega >= 0),
  desconto            numeric(12, 2) not null default 0 check (desconto >= 0),
  total               numeric(12, 2) not null check (total >= 0),
  pagamento           public.forma_pagamento not null,
  troco_para          numeric(12, 2) check (troco_para is null or troco_para >= 0),
  observacao          text check (observacao is null or length(observacao) <= 500),
  motivo_cancelamento text,
  criado_por          uuid,
  criado_em           timestamptz not null default now(),
  aceito_em           timestamptz,
  pronto_em           timestamptz,
  saiu_em             timestamptz,
  concluido_em        timestamptz,
  cancelado_em        timestamptz,
  atualizado_em       timestamptz not null default now(),
  unique (id, loja_id),
  unique (loja_id, numero),
  foreign key (marca_id, loja_id) references public.marcas (id, loja_id) on delete restrict,
  constraint pedido_total check (total = subtotal + taxa_entrega - desconto),
  constraint pedido_endereco check (tipo <> 'entrega' or (endereco ? 'logradouro' and endereco ? 'bairro')),
  constraint pedido_cancelamento check ((status = 'cancelado') = (cancelado_em is not null))
);
create index pedidos_loja_status_idx on public.pedidos (loja_id, status, criado_em desc);

create table public.pedido_itens (
  id             uuid primary key default gen_random_uuid(),
  loja_id        uuid not null,
  pedido_id      uuid not null,
  produto_id     uuid,
  nome           text not null,
  quantidade     integer not null check (quantidade between 1 and 99),
  preco_base     numeric(12, 2) not null,
  preco_unitario numeric(12, 2) not null,
  total          numeric(12, 2) not null,
  observacao     text check (observacao is null or length(observacao) <= 300),
  ordem          integer not null default 0,
  unique (id, loja_id),
  foreign key (pedido_id, loja_id) references public.pedidos (id, loja_id) on delete cascade,
  foreign key (produto_id, loja_id) references public.produtos (id, loja_id) on delete set null (produto_id),
  constraint item_total check (total = preco_unitario * quantidade)
);
create index pedido_itens_pedido_idx on public.pedido_itens (pedido_id, ordem);

create table public.pedido_item_opcoes (
  id         uuid primary key default gen_random_uuid(),
  loja_id    uuid not null,
  item_id    uuid not null,
  grupo_id   uuid,
  grupo_nome text not null,
  opcao_id   uuid,
  nome       text not null,
  quantidade integer not null check (quantidade >= 1),
  preco      numeric(12, 2) not null,
  fracao     numeric(6, 4),           -- pizza: 0.5 = meia (R-014)
  foreign key (item_id, loja_id) references public.pedido_itens (id, loja_id) on delete cascade
);
create index pedido_item_opcoes_item_idx on public.pedido_item_opcoes (item_id);

create table public.pedido_eventos (
  id         bigint generated always as identity primary key,
  loja_id    uuid not null,
  pedido_id  uuid not null,
  de         public.status_pedido,
  para       public.status_pedido not null,
  motivo     text,
  por        uuid,
  em         timestamptz not null default now(),
  foreign key (pedido_id, loja_id) references public.pedidos (id, loja_id) on delete cascade
);
create index pedido_eventos_pedido_idx on public.pedido_eventos (pedido_id, em);

create trigger pedidos_atualizado before update on public.pedidos for each row execute function private.tocar_atualizado_em();

-- ---------------------------------------------------------------------------
-- RLS: quem tem "pedidos_delivery" vê e mexe nos pedidos da loja, sempre pelas funções abaixo.
-- ---------------------------------------------------------------------------
alter table public.pedidos enable row level security;
alter table public.pedido_itens enable row level security;
alter table public.pedido_item_opcoes enable row level security;
alter table public.pedido_eventos enable row level security;
alter table private.contador_pedidos enable row level security;

create policy pedidos_ler on public.pedidos for select to authenticated using (private.tem_permissao(loja_id, 'pedidos_delivery'));
create policy pedido_itens_ler on public.pedido_itens for select to authenticated using (private.tem_permissao(loja_id, 'pedidos_delivery'));
create policy pedido_item_opcoes_ler on public.pedido_item_opcoes for select to authenticated using (private.tem_permissao(loja_id, 'pedidos_delivery'));
create policy pedido_eventos_ler on public.pedido_eventos for select to authenticated using (private.tem_permissao(loja_id, 'pedidos_delivery'));
-- Sem políticas de escrita: inserir e mudar status só por criar_pedido / mudar_status_pedido.

-- ---------------------------------------------------------------------------
-- Preço de um item (espelho de calcularItem em packages/core/src/preco.ts).
-- p_escolhas: { "<grupo_id>": { "<opcao_id>": quantidade } }
-- Devolve { base, unitario, opcoes: [{grupo_id, grupo_nome, opcao_id, nome, quantidade, preco, fracao}] }
-- Valores em centavos (inteiros). Lança erro com mensagem para o usuário se a escolha não vale.
-- ---------------------------------------------------------------------------
create or replace function private.preco_item(p_produto uuid, p_marca uuid, p_canal text, p_escolhas jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_prod     record;
  v_pm       record;
  v_base     bigint;
  v_unitario bigint;
  g          record;
  v_esc      jsonb;
  v_total_q  integer;
  v_min      integer;
  v_valor    bigint;
  v_linhas   jsonb := '[]'::jsonb;
  v_desconhecida text;
  v_rows     jsonb;
  v_grupo_linhas jsonb;
begin
  if p_canal not in ('delivery', 'presencial') then
    raise exception 'Canal inválido' using errcode = 'invalid_parameter_value';
  end if;
  select * into v_prod from public.produtos where id = p_produto;
  if not found then
    raise exception 'Produto não encontrado' using errcode = 'no_data_found';
  end if;
  select * into v_pm from public.produto_marcas where produto_id = p_produto and marca_id = p_marca;
  if not found or not v_pm.ativo or not (case p_canal when 'delivery' then v_pm.delivery else v_pm.presencial end) then
    raise exception '"%" não está disponível neste canal.', v_prod.nome using errcode = 'check_violation';
  end if;

  -- promocional → preço do canal → preço padrão → 0
  v_base := round(100 * coalesce(v_pm.preco_promocional,
                                 case p_canal when 'delivery' then v_pm.preco_delivery else v_pm.preco_presencial end,
                                 v_prod.preco, 0));
  v_unitario := v_base;

  -- grupo escolhido que não pertence ao produto
  select k into v_desconhecida from jsonb_object_keys(coalesce(p_escolhas, '{}'::jsonb)) k
   where not exists (select 1 from public.produto_grupos pg where pg.produto_id = p_produto and pg.grupo_id::text = k)
   limit 1;
  if v_desconhecida is not null then
    raise exception 'Grupo de opções não pertence a "%".', v_prod.nome using errcode = 'check_violation';
  end if;

  for g in
    select go.* from public.produto_grupos pg join public.grupos_opcoes go on go.id = pg.grupo_id
     where pg.produto_id = p_produto
       and go.ativo and (case p_canal when 'delivery' then go.delivery else go.presencial end)
     order by pg.ordem
  loop
    v_esc := coalesce(p_escolhas -> g.id::text, '{}'::jsonb);

    -- escolhas com preço resolvido (preço do canal → preço da opção → preço do item)
    select coalesce(jsonb_agg(jsonb_build_object(
             'opcao_id', o.id, 'nome', coalesce(o.nome, c.nome, p.nome), 'q', (e.value)::numeric,
             'preco', round(100 * coalesce(case p_canal when 'delivery' then o.preco_delivery else o.preco_presencial end, o.preco, c.preco, p.preco, 0)),
             'visivel', o.id is not null and o.ativo and (case p_canal when 'delivery' then o.delivery else o.presencial end),
             'max_qtd', o.max_qtd)), '[]'::jsonb)
      into v_rows
      from jsonb_each_text(v_esc) e
      left join public.opcoes o on o.id::text = e.key and o.grupo_id = g.id
      left join public.complementos c on c.id = o.complemento_id
      left join public.produtos p on p.id = o.produto_id
     where e.value ~ '^-?[0-9]+(\.[0-9]+)?$' and (e.value)::numeric > 0;

    if exists (select 1 from jsonb_to_recordset(v_rows) r(visivel boolean) where not r.visivel) then
      raise exception 'Opção indisponível em "%".', g.nome using errcode = 'check_violation';
    end if;
    if exists (select 1 from jsonb_to_recordset(v_rows) r(q numeric) where r.q <> trunc(r.q)) then
      raise exception 'Quantidade inválida em "%".', g.nome using errcode = 'check_violation';
    end if;

    select coalesce(sum(r.q), 0) into v_total_q from jsonb_to_recordset(v_rows) r(q integer);
    v_min := case when g.obrigatorio then greatest(1, g.min_qtd) else g.min_qtd end;
    if v_total_q < v_min then
      raise exception 'Escolha pelo menos % em "%".', v_min, g.nome using errcode = 'check_violation';
    end if;
    if v_total_q > g.max_qtd then
      raise exception 'Escolha no máximo % em "%".', g.max_qtd, g.nome using errcode = 'check_violation';
    end if;
    if not g.permite_repetir and exists (select 1 from jsonb_to_recordset(v_rows) r(q integer) where r.q > 1) then
      raise exception 'Uma opção não pode repetir em "%".', g.nome using errcode = 'check_violation';
    end if;
    if exists (select 1 from jsonb_to_recordset(v_rows) r(q integer, max_qtd integer) where r.q > r.max_qtd) then
      raise exception 'Quantidade acima do limite de uma opção em "%".', g.nome using errcode = 'check_violation';
    end if;

    if v_total_q > 0 then
      select case g.formacao
               when 'brinde' then 0
               when 'soma' then sum(r.preco * r.q)
               when 'maior' then max(r.preco)
               when 'proporcional' then round(sum(r.preco * r.q)::numeric / v_total_q)
             end,
             jsonb_agg(jsonb_build_object(
               'grupo_id', g.id, 'grupo_nome', g.nome, 'opcao_id', r.opcao_id, 'nome', r.nome, 'quantidade', r.q,
               'preco', r.preco, 'fracao', case when g.pizza then round(r.q::numeric / v_total_q, 4) end))
        into v_valor, v_grupo_linhas
        from jsonb_to_recordset(v_rows) r(opcao_id uuid, nome text, q integer, preco bigint);
      v_unitario := v_unitario + v_valor;
      v_linhas := v_linhas || v_grupo_linhas;
    end if;
  end loop;

  return jsonb_build_object('base', v_base, 'unitario', v_unitario, 'opcoes', v_linhas);
end;
$$;

-- Fluxo de status (espelho de proximosStatus em packages/core/src/pedido.ts).
create or replace function private.transicao_valida(p_de public.status_pedido, p_para public.status_pedido, p_tipo public.tipo_pedido)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_de
    when 'novo' then p_para in ('em_preparo', 'cancelado')
    when 'em_preparo' then p_para in ('pronto', 'cancelado')
    when 'pronto' then p_para in (case when p_tipo = 'entrega' then 'em_entrega'::public.status_pedido else 'concluido'::public.status_pedido end, 'cancelado')
    when 'em_entrega' then p_para in ('concluido', 'cancelado')
    else false
  end;
$$;

-- ---------------------------------------------------------------------------
-- Criar pedido. p_dados:
-- { tipo, cliente: {nome, telefone?}, endereco?: {logradouro, numero?, complemento?, bairro, referencia?},
--   itens: [{ produto_id, quantidade, observacao?, escolhas? }], taxa_entrega?, desconto?, pagamento,
--   troco_para?, observacao? }   (valores em reais)
-- ---------------------------------------------------------------------------
create or replace function public.criar_pedido(p_loja uuid, p_marca uuid, p_dados jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user     uuid := auth.uid();
  v_tipo     public.tipo_pedido := (p_dados ->> 'tipo')::public.tipo_pedido;
  v_canal    text;
  v_pag      public.forma_pagamento := (p_dados ->> 'pagamento')::public.forma_pagamento;
  v_taxa     numeric(12, 2) := coalesce((p_dados ->> 'taxa_entrega')::numeric, 0);
  v_desc     numeric(12, 2) := coalesce((p_dados ->> 'desconto')::numeric, 0);
  v_troco    numeric(12, 2) := (p_dados ->> 'troco_para')::numeric;
  v_tel      text := nullif(regexp_replace(coalesce(p_dados #>> '{cliente,telefone}', ''), '\D', '', 'g'), '');
  v_end      jsonb;
  v_numero   integer;
  v_pedido   uuid;
  v_item     uuid;
  v_auto     boolean;
  v_sub      numeric(12, 2) := 0;
  it         record;
  v_calc     jsonb;
begin
  -- Hoje só a equipe lança pedidos (o cardápio digital terá sua própria porta de entrada).
  if v_user is null or not private.tem_permissao(p_loja, 'pedidos_delivery') then
    raise exception 'Você não tem permissão para lançar pedidos.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.marcas m where m.id = p_marca and m.loja_id = p_loja) then
    raise exception 'Marca não encontrada' using errcode = 'no_data_found';
  end if;
  if jsonb_typeof(p_dados -> 'itens') <> 'array' or jsonb_array_length(p_dados -> 'itens') = 0 then
    raise exception 'Adicione pelo menos um item.' using errcode = 'check_violation';
  end if;
  if v_taxa < 0 or v_desc < 0 then
    raise exception 'Valores não podem ser negativos.' using errcode = 'check_violation';
  end if;

  v_canal := case when v_tipo = 'balcao' then 'presencial' else 'delivery' end;
  if v_tipo <> 'entrega' then
    v_taxa := 0;
  else
    v_end := jsonb_strip_nulls(jsonb_build_object(
      'logradouro', nullif(btrim(p_dados #>> '{endereco,logradouro}'), ''),
      'numero', nullif(btrim(p_dados #>> '{endereco,numero}'), ''),
      'complemento', nullif(btrim(p_dados #>> '{endereco,complemento}'), ''),
      'bairro', nullif(btrim(p_dados #>> '{endereco,bairro}'), ''),
      'referencia', nullif(btrim(p_dados #>> '{endereco,referencia}'), '')));
    if not (v_end ? 'logradouro' and v_end ? 'bairro') then
      raise exception 'Informe rua e bairro para entrega.' using errcode = 'check_violation';
    end if;
  end if;

  insert into private.contador_pedidos as c (loja_id, ultimo) values (p_loja, 1)
  on conflict (loja_id) do update set ultimo = c.ultimo + 1
  returning ultimo into v_numero;

  select l.aceite_automatico into v_auto from public.lojas l where l.id = p_loja;

  insert into public.pedidos (loja_id, marca_id, numero, status, tipo, origem, cliente_nome, cliente_telefone, endereco,
                              subtotal, taxa_entrega, desconto, total, pagamento, troco_para, observacao, criado_por, aceito_em)
  values (p_loja, p_marca, v_numero, case when v_auto then 'em_preparo'::public.status_pedido else 'novo'::public.status_pedido end, v_tipo, 'painel',
          btrim(coalesce(p_dados #>> '{cliente,nome}', '')), v_tel, v_end,
          0, v_taxa, 0, v_taxa, v_pag, null, nullif(btrim(p_dados ->> 'observacao'), ''), v_user,
          case when v_auto then now() end)
  returning id into v_pedido;

  for it in
    select e.j, e.ord from jsonb_array_elements(p_dados -> 'itens') with ordinality as e(j, ord)
  loop
    if not exists (select 1 from public.produtos p where p.id = (it.j ->> 'produto_id')::uuid and p.loja_id = p_loja) then
      raise exception 'Produto não encontrado' using errcode = 'no_data_found';
    end if;
    if (it.j ->> 'quantidade')::numeric is null or (it.j ->> 'quantidade')::numeric not between 1 and 99
       or (it.j ->> 'quantidade')::numeric <> trunc((it.j ->> 'quantidade')::numeric) then
      raise exception 'Quantidade deve ser de 1 a 99.' using errcode = 'check_violation';
    end if;
    v_calc := private.preco_item((it.j ->> 'produto_id')::uuid, p_marca, v_canal, coalesce(it.j -> 'escolhas', '{}'::jsonb));

    insert into public.pedido_itens (loja_id, pedido_id, produto_id, nome, quantidade, preco_base, preco_unitario, total, observacao, ordem)
    select p_loja, v_pedido, p.id, p.nome, (it.j ->> 'quantidade')::integer,
           (v_calc ->> 'base')::numeric / 100, (v_calc ->> 'unitario')::numeric / 100,
           (v_calc ->> 'unitario')::numeric / 100 * (it.j ->> 'quantidade')::integer,
           nullif(btrim(it.j ->> 'observacao'), ''), it.ord - 1
      from public.produtos p where p.id = (it.j ->> 'produto_id')::uuid
    returning id into v_item;

    insert into public.pedido_item_opcoes (loja_id, item_id, grupo_id, grupo_nome, opcao_id, nome, quantidade, preco, fracao)
    select p_loja, v_item, (o ->> 'grupo_id')::uuid, o ->> 'grupo_nome', (o ->> 'opcao_id')::uuid, o ->> 'nome',
           (o ->> 'quantidade')::integer, (o ->> 'preco')::numeric / 100, (o ->> 'fracao')::numeric
      from jsonb_array_elements(v_calc -> 'opcoes') o;

    v_sub := v_sub + (v_calc ->> 'unitario')::numeric / 100 * (it.j ->> 'quantidade')::integer;
  end loop;

  if v_desc > v_sub then
    raise exception 'O desconto não pode passar do subtotal.' using errcode = 'check_violation';
  end if;
  if v_pag = 'dinheiro' and v_troco is not null and v_troco < v_sub + v_taxa - v_desc then
    raise exception 'O valor para troco é menor que o total.' using errcode = 'check_violation';
  end if;

  update public.pedidos
     set subtotal = v_sub, desconto = v_desc, total = v_sub + v_taxa - v_desc,
         troco_para = case when v_pag = 'dinheiro' then v_troco end
   where id = v_pedido;

  insert into public.pedido_eventos (loja_id, pedido_id, de, para, por) values (p_loja, v_pedido, null, 'novo', v_user);
  if v_auto then
    insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por) values (p_loja, v_pedido, 'novo', 'em_preparo', 'Aceite automático', null);
  end if;

  return v_pedido;
end;
$$;

-- Mudar o status seguindo o fluxo. Cancelar exige motivo.
create or replace function public.mudar_status_pedido(p_pedido uuid, p_status public.status_pedido, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped record;
begin
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if not found or not private.tem_permissao(v_ped.loja_id, 'pedidos_delivery') then
    raise exception 'Pedido não encontrado' using errcode = 'no_data_found';
  end if;
  if not private.transicao_valida(v_ped.status, p_status, v_ped.tipo) then
    raise exception 'Não dá para ir de "%" para "%".', v_ped.status, p_status using errcode = 'check_violation';
  end if;
  if p_status = 'cancelado' and coalesce(btrim(p_motivo), '') = '' then
    raise exception 'Informe o motivo do cancelamento.' using errcode = 'check_violation';
  end if;

  update public.pedidos set
    status = p_status,
    aceito_em = case when p_status = 'em_preparo' then now() else aceito_em end,
    pronto_em = case when p_status = 'pronto' then now() else pronto_em end,
    saiu_em = case when p_status = 'em_entrega' then now() else saiu_em end,
    concluido_em = case when p_status = 'concluido' then now() else concluido_em end,
    cancelado_em = case when p_status = 'cancelado' then now() else cancelado_em end,
    motivo_cancelamento = case when p_status = 'cancelado' then btrim(p_motivo) else motivo_cancelamento end
  where id = p_pedido;

  insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por)
  values (v_ped.loja_id, p_pedido, v_ped.status, p_status, nullif(btrim(p_motivo), ''), auth.uid());
end;
$$;

grant execute on function public.criar_pedido(uuid, uuid, jsonb) to authenticated;
grant execute on function public.mudar_status_pedido(uuid, public.status_pedido, text) to authenticated;
revoke execute on function public.criar_pedido(uuid, uuid, jsonb) from anon, public;
revoke execute on function public.mudar_status_pedido(uuid, public.status_pedido, text) from anon, public;
revoke execute on function private.preco_item(uuid, uuid, text, jsonb) from anon, public;

-- Tempo real: o quadro de pedidos recebe novos pedidos e mudanças de status (a RLS filtra por loja).
alter publication supabase_realtime add table public.pedidos;
