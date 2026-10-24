-- RES · 0024 · Comanda do combo organizada (D-024).
--
-- * pedido_item_opcoes ganha "ordem": as linhas saem na ordem em que foram escolhidas (antes a
--   comanda ordenava pelo id, que é aleatório — num combo isso embaralhava pizza e sabores).
-- * dados_cupom marca as linhas de passo do combo ('passo': sem grupo e sem opção de origem), para a
--   comanda imprimir em blocos: > PIZZA GIGANTE 40CM / - 1/2 Calabresa … > REFRIGERANTE 2L / - Kuat.

alter table public.pedido_item_opcoes add column ordem integer not null default 0;

-- gravação do pedido (20261021000012_agendam) + ordem das opções
create or replace function private.inserir_pedido(p_loja uuid, p_marca uuid, p_dados jsonb, p_origem public.origem_pedido, p_user uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_tipo     public.tipo_pedido := (p_dados ->> 'tipo')::public.tipo_pedido;
  v_canal    text;
  v_pag      public.forma_pagamento := (p_dados ->> 'pagamento')::public.forma_pagamento;
  v_taxa     numeric(12, 2) := coalesce((p_dados ->> 'taxa_entrega')::numeric, 0);
  v_desc     numeric(12, 2) := coalesce((p_dados ->> 'desconto')::numeric, 0);
  v_troco    numeric(12, 2) := (p_dados ->> 'troco_para')::numeric;
  v_tel      text := nullif(regexp_replace(coalesce(p_dados #>> '{cliente,telefone}', ''), '\D', '', 'g'), '');
  v_agend    timestamptz := nullif(p_dados ->> 'agendado_para', '')::timestamptz;
  v_end      jsonb;
  v_numero   integer;
  v_pedido   uuid;
  v_item     uuid;
  v_auto     boolean;
  v_sub      numeric(12, 2) := 0;
  it         record;
  v_calc     jsonb;
begin
  if not exists (select 1 from public.marcas m where m.id = p_marca and m.loja_id = p_loja) then
    raise exception 'Marca não encontrada' using errcode = 'no_data_found';
  end if;
  if jsonb_typeof(p_dados -> 'itens') is distinct from 'array' or jsonb_array_length(p_dados -> 'itens') = 0 then
    raise exception 'Adicione pelo menos um item.' using errcode = 'check_violation';
  end if;
  if jsonb_array_length(p_dados -> 'itens') > 50 then
    raise exception 'Pedido com itens demais.' using errcode = 'check_violation';
  end if;
  if v_taxa < 0 or v_desc < 0 then
    raise exception 'Valores não podem ser negativos.' using errcode = 'check_violation';
  end if;
  if v_agend is not null and (v_agend <= now() or v_agend > now() + interval '30 days') then
    raise exception 'O horário agendado precisa estar nos próximos 30 dias.' using errcode = 'check_violation';
  end if;

  v_canal := case when v_tipo = 'balcao' then 'presencial' else 'delivery' end;
  if v_tipo <> 'entrega' then
    v_taxa := 0;
  else
    v_end := jsonb_strip_nulls(jsonb_build_object(
      'logradouro', nullif(btrim(left(p_dados #>> '{endereco,logradouro}', 150)), ''),
      'numero', nullif(btrim(left(p_dados #>> '{endereco,numero}', 20)), ''),
      'complemento', nullif(btrim(left(p_dados #>> '{endereco,complemento}', 100)), ''),
      'bairro', nullif(btrim(left(p_dados #>> '{endereco,bairro}', 80)), ''),
      'referencia', nullif(btrim(left(p_dados #>> '{endereco,referencia}', 150)), '')));
    if not (v_end ? 'logradouro' and v_end ? 'bairro') then
      raise exception 'Informe rua e bairro para entrega.' using errcode = 'check_violation';
    end if;
  end if;

  insert into private.contador_pedidos as c (loja_id, ultimo) values (p_loja, 1)
  on conflict (loja_id) do update set ultimo = c.ultimo + 1
  returning ultimo into v_numero;

  select l.aceite_automatico and v_agend is null into v_auto from public.lojas l where l.id = p_loja;

  insert into public.pedidos (loja_id, marca_id, numero, status, tipo, origem, cliente_nome, cliente_telefone, endereco,
                              subtotal, taxa_entrega, desconto, total, pagamento, troco_para, observacao, criado_por, aceito_em, agendado_para)
  values (p_loja, p_marca, v_numero, case when v_auto then 'em_preparo'::public.status_pedido else 'novo'::public.status_pedido end, v_tipo, p_origem,
          btrim(coalesce(p_dados #>> '{cliente,nome}', '')), v_tel, v_end,
          0, v_taxa, 0, v_taxa, v_pag, null, nullif(btrim(p_dados ->> 'observacao'), ''), p_user,
          case when v_auto then now() end, v_agend)
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
           nullif(btrim(left(it.j ->> 'observacao', 300)), ''), it.ord - 1
      from public.produtos p where p.id = (it.j ->> 'produto_id')::uuid
    returning id into v_item;

    insert into public.pedido_item_opcoes (loja_id, item_id, grupo_id, grupo_nome, opcao_id, nome, quantidade, preco, fracao, ordem)
    select p_loja, v_item, (o ->> 'grupo_id')::uuid, o ->> 'grupo_nome', (o ->> 'opcao_id')::uuid, o ->> 'nome',
           (o ->> 'quantidade')::integer, (o ->> 'preco')::numeric / 100, (o ->> 'fracao')::numeric, n::integer
      from jsonb_array_elements(v_calc -> 'opcoes') with ordinality as x(o, n);

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

  insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por)
  values (p_loja, v_pedido, null, 'novo', case when v_agend is not null then 'Agendado' end, p_user);
  if v_auto then
    insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por) values (p_loja, v_pedido, 'novo', 'em_preparo', 'Aceite automático', null);
  end if;

  return v_pedido;
end;
$$;

-- dados da comanda (20261023000019_motoboy) + passo do combo e ordem
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
    'endereco', p.endereco,
    'observacao', p.observacao,
    'pagamento', p.pagamento, 'troco_para', round(p.troco_para * 100),
    'subtotal', round(p.subtotal * 100), 'taxa_entrega', round(p.taxa_entrega * 100), 'desconto', round(p.desconto * 100),
    'total', round(p.total * 100),
    'qr', case when p.tipo = 'entrega' then p.qr_token end,
    -- já pago (online ou marcado no painel): a comanda e o celular dizem NÃO COBRAR
    'pago', p.pagamento = 'online' or p.pago_em is not null,
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
