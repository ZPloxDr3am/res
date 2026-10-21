-- RES · 0006 · Cardápio digital do cliente: configuração de delivery por marca (horários,
-- bairros e taxas, pedido mínimo, formas de pagamento, abrir/fechar), leitura pública do
-- cardápio, pedido feito pelo próprio cliente e acompanhamento por código secreto.
-- O cliente não faz login: tudo que é público passa por funções que devolvem só o necessário.

create type public.status_cardapio as enum ('auto', 'aberto', 'fechado');

alter table public.marcas
  add column status_cardapio public.status_cardapio not null default 'auto',
  add column pedido_minimo   numeric(12, 2) not null default 0 check (pedido_minimo >= 0),
  add column aceita_entrega  boolean not null default true,
  add column aceita_retirada boolean not null default true,
  add column formas_pagamento public.forma_pagamento[] not null default array['dinheiro', 'pix', 'cartao_credito', 'cartao_debito']::public.forma_pagamento[]
    check (cardinality(formas_pagamento) > 0 and not ('online' = any (formas_pagamento))),
  add column mensagem_cardapio text check (mensagem_cardapio is null or length(mensagem_cardapio) <= 300);

alter table public.pedidos
  add column codigo uuid not null default gen_random_uuid();
create unique index pedidos_codigo_idx on public.pedidos (codigo);
create index pedidos_marca_telefone_idx on public.pedidos (marca_id, cliente_telefone, criado_em desc);

-- Horário de funcionamento por marca. "fecha" menor que "abre" = passa da meia-noite.
create table public.marca_horarios (
  loja_id    uuid not null,
  marca_id   uuid not null,
  dia_semana smallint not null check (dia_semana between 0 and 6),  -- 0 = domingo
  abre       time not null,
  fecha      time not null,
  primary key (marca_id, dia_semana, abre),
  foreign key (marca_id, loja_id) references public.marcas (id, loja_id) on delete cascade,
  check (abre <> fecha)
);

-- Bairros atendidos e taxa de entrega de cada um.
create table public.areas_entrega (
  id       uuid primary key default gen_random_uuid(),
  loja_id  uuid not null,
  marca_id uuid not null,
  bairro   text not null check (length(btrim(bairro)) between 1 and 80),
  taxa     numeric(12, 2) not null default 0 check (taxa >= 0),
  ativo    boolean not null default true,
  foreign key (marca_id, loja_id) references public.marcas (id, loja_id) on delete cascade
);
create unique index areas_entrega_bairro_idx on public.areas_entrega (marca_id, lower(btrim(bairro)));

alter table public.marca_horarios enable row level security;
alter table public.areas_entrega enable row level security;
create policy marca_horarios_ler on public.marca_horarios for select to authenticated using (private.e_membro(loja_id));
create policy areas_entrega_ler on public.areas_entrega for select to authenticated using (private.e_membro(loja_id));
-- Escrita só por salvar_config_delivery (abaixo), que confere a permissão "cardapio_digital".

create trigger marca_horarios_auditar after insert or update or delete on public.marca_horarios for each row execute function private.auditar();
create trigger areas_entrega_auditar after insert or update or delete on public.areas_entrega for each row execute function private.auditar();

-- ---------------------------------------------------------------------------
-- Aberta agora? Usa o fuso da loja. Status manual ("aberto"/"fechado") vence o horário.
-- ---------------------------------------------------------------------------
create or replace function private.marca_aberta(p_marca uuid, p_agora timestamptz default now())
returns boolean
language sql
stable
set search_path = ''
as $$
  with m as (
    select mc.id, mc.status_cardapio, (p_agora at time zone l.fuso_horario) as local
      from public.marcas mc join public.lojas l on l.id = mc.loja_id
     where mc.id = p_marca and mc.ativa
  )
  select coalesce((
    select case m.status_cardapio
             when 'aberto' then true
             when 'fechado' then false
             else exists (
               select 1 from public.marca_horarios h
                where h.marca_id = m.id
                  and (
                    (h.dia_semana = extract(dow from m.local)
                      and ((h.abre < h.fecha and m.local::time >= h.abre and m.local::time < h.fecha)
                        or (h.abre > h.fecha and m.local::time >= h.abre)))
                    or (h.dia_semana = (extract(dow from m.local)::int + 6) % 7
                      and h.abre > h.fecha and m.local::time < h.fecha)
                  ))
           end
      from m), false);
$$;

-- ---------------------------------------------------------------------------
-- Cardápio público de uma marca (pelo endereço/slug). Só o que o cliente pode ver:
-- marca ativa, setores do delivery, produtos ativos no delivery, opções ativas.
-- Preços já resolvidos para o delivery, em centavos.
-- ---------------------------------------------------------------------------
create or replace function public.cardapio_publico(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_marca public.marcas;
  v_loja  public.lojas;
begin
  select * into v_marca from public.marcas where slug = lower(btrim(p_slug)) and ativa;
  if not found then
    return null;
  end if;
  select * into v_loja from public.lojas where id = v_marca.loja_id;

  return jsonb_build_object(
    'marca', jsonb_build_object(
      'id', v_marca.id, 'nome', v_marca.nome, 'slug', v_marca.slug,
      'aberta', private.marca_aberta(v_marca.id),
      'status', v_marca.status_cardapio,
      'mensagem', v_marca.mensagem_cardapio,
      'pedido_minimo', round(v_marca.pedido_minimo * 100),
      'aceita_entrega', v_marca.aceita_entrega,
      'aceita_retirada', v_marca.aceita_retirada,
      'formas_pagamento', to_jsonb(v_marca.formas_pagamento),
      'tempo_preparo_min', v_loja.tempo_preparo_min,
      'fuso', v_loja.fuso_horario,
      'horarios', coalesce((select jsonb_agg(jsonb_build_object('dia', h.dia_semana, 'abre', to_char(h.abre, 'HH24:MI'), 'fecha', to_char(h.fecha, 'HH24:MI')) order by h.dia_semana, h.abre)
                             from public.marca_horarios h where h.marca_id = v_marca.id), '[]'::jsonb),
      'areas', coalesce((select jsonb_agg(jsonb_build_object('bairro', a.bairro, 'taxa', round(a.taxa * 100)) order by a.bairro)
                          from public.areas_entrega a where a.marca_id = v_marca.id and a.ativo), '[]'::jsonb)
    ),
    'setores', coalesce((
      select jsonb_agg(s.obj order by s.ordem, s.nome)
        from (
          select st.ordem, st.nome,
                 jsonb_build_object('id', st.id, 'nome', coalesce(nullif(btrim(st.nome_publico), ''), st.nome), 'produtos', prods.lista) as obj
            from public.setores st
            join public.setor_marcas sm on sm.setor_id = st.id and sm.marca_id = v_marca.id and sm.ativo
            cross join lateral (
              select jsonb_agg(private.produto_publico(p.id, v_marca.id) order by p.ordem, p.nome) as lista
                from public.produtos p
                join public.produto_marcas pm on pm.produto_id = p.id and pm.marca_id = v_marca.id and pm.ativo and pm.delivery
               where p.setor_id = st.id
            ) prods
           where st.delivery and prods.lista is not null
        ) s), '[]'::jsonb)
  );
end;
$$;

create or replace function private.produto_publico(p_produto uuid, p_marca uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'nome', p.nome, 'descricao', p.descricao, 'imagem_url', p.imagem_url, 'etiqueta', p.etiqueta,
    'preco', round(100 * coalesce(pm.preco_promocional, pm.preco_delivery, p.preco, 0)),
    'preco_original', case when pm.preco_promocional is not null then round(100 * coalesce(pm.preco_delivery, p.preco, 0)) end,
    'grupos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', g.id, 'nome', g.nome, 'formacao', g.formacao, 'obrigatorio', g.obrigatorio, 'pizza', g.pizza,
               'min', g.min_qtd, 'max', g.max_qtd, 'permite_repetir', g.permite_repetir,
               'opcoes', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', o.id, 'nome', coalesce(o.nome, c.nome, op.nome), 'max', o.max_qtd,
                          'preco', round(100 * coalesce(o.preco_delivery, o.preco, c.preco, op.preco, 0)))
                        order by o.ordem)
                   from public.opcoes o
                   left join public.complementos c on c.id = o.complemento_id
                   left join public.produtos op on op.id = o.produto_id
                  where o.grupo_id = g.id and o.ativo and o.delivery), '[]'::jsonb))
             order by pg.ordem)
        from public.produto_grupos pg join public.grupos_opcoes g on g.id = pg.grupo_id
       where pg.produto_id = p.id and g.ativo and g.delivery), '[]'::jsonb))
  from public.produtos p
  join public.produto_marcas pm on pm.produto_id = p.id and pm.marca_id = p_marca
  where p.id = p_produto;
$$;

-- ---------------------------------------------------------------------------
-- Gravação do pedido, comum ao painel e ao cardápio digital (era o corpo de criar_pedido).
-- Quem chama já conferiu permissão/regras de origem. Taxa de entrega chega pronta.
-- ---------------------------------------------------------------------------
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

  select l.aceite_automatico into v_auto from public.lojas l where l.id = p_loja;

  insert into public.pedidos (loja_id, marca_id, numero, status, tipo, origem, cliente_nome, cliente_telefone, endereco,
                              subtotal, taxa_entrega, desconto, total, pagamento, troco_para, observacao, criado_por, aceito_em)
  values (p_loja, p_marca, v_numero, case when v_auto then 'em_preparo'::public.status_pedido else 'novo'::public.status_pedido end, v_tipo, p_origem,
          btrim(coalesce(p_dados #>> '{cliente,nome}', '')), v_tel, v_end,
          0, v_taxa, 0, v_taxa, v_pag, null, nullif(btrim(p_dados ->> 'observacao'), ''), p_user,
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
           nullif(btrim(left(it.j ->> 'observacao', 300)), ''), it.ord - 1
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

  insert into public.pedido_eventos (loja_id, pedido_id, de, para, por) values (p_loja, v_pedido, null, 'novo', p_user);
  if v_auto then
    insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por) values (p_loja, v_pedido, 'novo', 'em_preparo', 'Aceite automático', null);
  end if;

  return v_pedido;
end;
$$;
revoke execute on function private.inserir_pedido(uuid, uuid, jsonb, public.origem_pedido, uuid) from anon, public;

-- Pedido lançado pela equipe no painel (mesma assinatura de antes).
create or replace function public.criar_pedido(p_loja uuid, p_marca uuid, p_dados jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.tem_permissao(p_loja, 'pedidos_delivery') then
    raise exception 'Você não tem permissão para lançar pedidos.' using errcode = 'insufficient_privilege';
  end if;
  return private.inserir_pedido(p_loja, p_marca, p_dados, 'painel', auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Pedido feito pelo cliente no cardápio digital. Regras de quem vende pela internet:
-- loja aberta, tipo aceito, bairro atendido (taxa vem do cadastro, nunca do cliente),
-- pedido mínimo, forma de pagamento aceita, sem desconto, telefone obrigatório e
-- limite contra pedidos repetidos. Devolve número e código de acompanhamento.
-- ---------------------------------------------------------------------------
create or replace function public.criar_pedido_publico(p_slug text, p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_marca  public.marcas;
  v_tipo   public.tipo_pedido := (p_dados ->> 'tipo')::public.tipo_pedido;
  v_pag    public.forma_pagamento := (p_dados ->> 'pagamento')::public.forma_pagamento;
  v_tel    text := regexp_replace(coalesce(p_dados #>> '{cliente,telefone}', ''), '\D', '', 'g');
  v_bairro text := btrim(coalesce(p_dados #>> '{endereco,bairro}', ''));
  v_taxa   numeric(12, 2) := 0;
  v_dados  jsonb;
  v_pedido uuid;
  v_ped    record;
  it       jsonb;
begin
  select * into v_marca from public.marcas where slug = lower(btrim(p_slug)) and ativa;
  if not found then
    raise exception 'Cardápio não encontrado.' using errcode = 'no_data_found';
  end if;
  if not private.marca_aberta(v_marca.id) then
    raise exception 'A loja está fechada agora.' using errcode = 'check_violation';
  end if;
  if v_tipo = 'balcao' or (v_tipo = 'entrega' and not v_marca.aceita_entrega) or (v_tipo = 'retirada' and not v_marca.aceita_retirada) then
    raise exception 'Esse tipo de pedido não está disponível.' using errcode = 'check_violation';
  end if;
  if v_pag = 'online' or not (v_pag = any (v_marca.formas_pagamento)) then
    raise exception 'Forma de pagamento não aceita.' using errcode = 'check_violation';
  end if;
  if length(btrim(coalesce(p_dados #>> '{cliente,nome}', ''))) < 2 then
    raise exception 'Informe seu nome.' using errcode = 'check_violation';
  end if;
  if v_tel !~ '^[0-9]{10,13}$' then
    raise exception 'Informe um telefone com DDD.' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.pedidos p
       where p.marca_id = v_marca.id and p.cliente_telefone = v_tel and p.criado_em > now() - interval '10 minutes') >= 3 then
    raise exception 'Recebemos vários pedidos seguidos deste telefone. Aguarde alguns minutos ou fale com a loja.' using errcode = 'check_violation';
  end if;

  if v_tipo = 'entrega' then
    select a.taxa into v_taxa from public.areas_entrega a
     where a.marca_id = v_marca.id and a.ativo and lower(a.bairro) = lower(v_bairro);
    if not found then
      raise exception 'Ainda não entregamos no bairro "%".', v_bairro using errcode = 'check_violation';
    end if;
  end if;

  -- Só produtos que o cliente enxerga: dentro de um setor do delivery desta marca e sem etiqueta "esgotado".
  for it in select jsonb_array_elements(coalesce(p_dados -> 'itens', '[]'::jsonb)) loop
    if not exists (
      select 1 from public.produtos p
       where p.id = (it ->> 'produto_id')::uuid and p.loja_id = v_marca.loja_id
         and p.etiqueta is distinct from 'esgotado'
         and exists (
               select 1 from public.setores s join public.setor_marcas sm on sm.setor_id = s.id
                where s.id = p.setor_id and s.delivery and sm.marca_id = v_marca.id and sm.ativo)) then
      raise exception 'Um dos produtos não está disponível agora.' using errcode = 'check_violation';
    end if;
  end loop;

  v_dados := jsonb_build_object(
    'tipo', v_tipo,
    'cliente', jsonb_build_object('nome', left(btrim(p_dados #>> '{cliente,nome}'), 120), 'telefone', v_tel),
    'endereco', case when v_tipo = 'entrega' then (p_dados -> 'endereco') || jsonb_build_object('bairro', v_bairro) end,
    'itens', p_dados -> 'itens',
    'taxa_entrega', v_taxa,
    'desconto', 0,
    'pagamento', v_pag,
    'troco_para', p_dados -> 'troco_para',
    'observacao', left(p_dados ->> 'observacao', 500));

  v_pedido := private.inserir_pedido(v_marca.loja_id, v_marca.id, v_dados, 'cardapio_digital', null);

  select numero, codigo, subtotal, total into v_ped from public.pedidos where id = v_pedido;
  if v_ped.subtotal < v_marca.pedido_minimo then
    raise exception 'O pedido mínimo é de R$ %.', replace(to_char(v_marca.pedido_minimo, 'FM999990.00'), '.', ',') using errcode = 'check_violation';
  end if;
  return jsonb_build_object('numero', v_ped.numero, 'codigo', v_ped.codigo, 'total', round(v_ped.total * 100));
end;
$$;

-- Acompanhamento pelo cliente: só quem tem o código (secreto, aleatório) vê o pedido.
create or replace function public.acompanhar_pedido(p_codigo uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'numero', p.numero, 'status', p.status, 'tipo', p.tipo, 'marca', m.nome, 'slug', m.slug,
    'criado_em', p.criado_em, 'aceito_em', p.aceito_em, 'pronto_em', p.pronto_em, 'saiu_em', p.saiu_em,
    'concluido_em', p.concluido_em, 'cancelado_em', p.cancelado_em, 'motivo_cancelamento', p.motivo_cancelamento,
    'subtotal', round(p.subtotal * 100), 'taxa_entrega', round(p.taxa_entrega * 100), 'total', round(p.total * 100),
    'pagamento', p.pagamento, 'troco_para', round(p.troco_para * 100), 'tempo_preparo_min', l.tempo_preparo_min,
    'itens', coalesce((select jsonb_agg(jsonb_build_object(
                          'nome', i.nome, 'quantidade', i.quantidade, 'total', round(i.total * 100),
                          'opcoes', coalesce((select jsonb_agg(jsonb_build_object('nome', o.nome, 'quantidade', o.quantidade, 'fracao', o.fracao))
                                                from public.pedido_item_opcoes o where o.item_id = i.id), '[]'::jsonb))
                        order by i.ordem)
                         from public.pedido_itens i where i.pedido_id = p.id), '[]'::jsonb))
  from public.pedidos p
  join public.marcas m on m.id = p.marca_id
  join public.lojas l on l.id = p.loja_id
  where p.codigo = p_codigo;
$$;

-- ---------------------------------------------------------------------------
-- Configuração de delivery da marca, salva de uma vez (D-005). p_config:
-- { status, pedido_minimo, aceita_entrega, aceita_retirada, formas_pagamento: [...], mensagem,
--   horarios: [{dia, abre, fecha}], areas: [{bairro, taxa, ativo?}] }   (valores em reais)
-- ---------------------------------------------------------------------------
create or replace function public.salvar_config_delivery(p_marca uuid, p_config jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid;
begin
  select loja_id into v_loja from public.marcas where id = p_marca;
  if v_loja is null or not private.tem_permissao(v_loja, 'cardapio_digital') then
    raise exception 'Você não tem permissão para configurar o cardápio digital.' using errcode = 'insufficient_privilege';
  end if;

  -- Cada campo só muda se veio no p_config (o botão de abrir/fechar manda só o status).
  update public.marcas set
    status_cardapio   = case when p_config ? 'status' then (p_config ->> 'status')::public.status_cardapio else status_cardapio end,
    pedido_minimo     = case when p_config ? 'pedido_minimo' then coalesce((p_config ->> 'pedido_minimo')::numeric, 0) else pedido_minimo end,
    aceita_entrega    = case when p_config ? 'aceita_entrega' then (p_config ->> 'aceita_entrega')::boolean else aceita_entrega end,
    aceita_retirada   = case when p_config ? 'aceita_retirada' then (p_config ->> 'aceita_retirada')::boolean else aceita_retirada end,
    formas_pagamento  = case when p_config ? 'formas_pagamento'
                             then coalesce((select array_agg(distinct f::public.forma_pagamento) from jsonb_array_elements_text(p_config -> 'formas_pagamento') f), '{}')
                             else formas_pagamento end,
    mensagem_cardapio = case when p_config ? 'mensagem' then nullif(btrim(p_config ->> 'mensagem'), '') else mensagem_cardapio end
  where id = p_marca;

  if exists (select 1 from public.marcas where id = p_marca and not (aceita_entrega or aceita_retirada)) then
    raise exception 'Aceite pelo menos entrega ou retirada.' using errcode = 'check_violation';
  end if;

  if p_config ? 'horarios' then
    delete from public.marca_horarios where marca_id = p_marca;
    insert into public.marca_horarios (loja_id, marca_id, dia_semana, abre, fecha)
    select v_loja, p_marca, (h ->> 'dia')::smallint, (h ->> 'abre')::time, (h ->> 'fecha')::time
      from jsonb_array_elements(p_config -> 'horarios') h;
  end if;

  if p_config ? 'areas' then
    delete from public.areas_entrega where marca_id = p_marca;
    insert into public.areas_entrega (loja_id, marca_id, bairro, taxa, ativo)
    select v_loja, p_marca, btrim(a ->> 'bairro'), coalesce((a ->> 'taxa')::numeric, 0), coalesce((a ->> 'ativo')::boolean, true)
      from jsonb_array_elements(p_config -> 'areas') a;
  end if;
end;
$$;

grant execute on function public.cardapio_publico(text) to anon, authenticated;
grant execute on function public.criar_pedido_publico(text, jsonb) to anon, authenticated;
grant execute on function public.acompanhar_pedido(uuid) to anon, authenticated;
grant execute on function public.salvar_config_delivery(uuid, jsonb) to authenticated;
revoke execute on function public.salvar_config_delivery(uuid, jsonb) from anon, public;
revoke execute on function private.marca_aberta(uuid, timestamptz) from anon, public;
revoke execute on function private.produto_publico(uuid, uuid) from anon, public;
