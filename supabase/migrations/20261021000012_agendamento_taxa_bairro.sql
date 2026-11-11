-- RES · 0012 · Etapa 3c (parte 1): pedidos agendados e taxa por bairro no pedido do balcão.
--
-- Agendamento (D-011):
--   * cada marca diz quantos dias à frente aceita agendar (0 = não aceita);
--   * o cliente do cardápio digital escolhe um horário dentro do funcionamento, a partir de
--     agora + tempo de preparo; com a loja fechada, só dá para pedir agendado;
--   * pedido agendado entra como "novo" e não passa pelo aceite automático: o quadro o guarda
--     em "Agendados" e o traz para "Novo" (com alerta) quando chega a hora de preparar;
--   * a equipe também pode agendar pelo painel (até 30 dias, sem a regra de horário).
-- Taxa por bairro no painel: pedido de entrega sem taxa informada usa a taxa do bairro da marca.

alter table public.marcas
  add column agendamento_dias smallint not null default 0 check (agendamento_dias between 0 and 7);

alter table public.pedidos
  add column agendado_para timestamptz;
create index pedidos_agendados_idx on public.pedidos (loja_id, agendado_para) where agendado_para is not null;

-- ---------------------------------------------------------------------------
-- Dentro do horário cadastrado (ignora o "abrir/fechar agora"). "fecha" < "abre" = passa da meia-noite.
-- ---------------------------------------------------------------------------
create or replace function private.dentro_do_horario(p_marca uuid, p_quando timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  with m as (
    select mc.id, (p_quando at time zone l.fuso_horario) as local
      from public.marcas mc join public.lojas l on l.id = mc.loja_id
     where mc.id = p_marca
  )
  select coalesce((
    select exists (
             select 1 from public.marca_horarios h
              where h.marca_id = m.id
                and (
                  (h.dia_semana = extract(dow from m.local)
                    and ((h.abre < h.fecha and m.local::time >= h.abre and m.local::time < h.fecha)
                      or (h.abre > h.fecha and m.local::time >= h.abre)))
                  or (h.dia_semana = (extract(dow from m.local)::int + 6) % 7
                    and h.abre > h.fecha and m.local::time < h.fecha)
                ))
      from m), false);
$$;

-- Mesma regra de antes, agora apoiada em dentro_do_horario.
create or replace function private.marca_aberta(p_marca uuid, p_agora timestamptz default now())
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select case mc.status_cardapio
             when 'aberto' then true
             when 'fechado' then false
             else private.dentro_do_horario(mc.id, p_agora)
           end
      from public.marcas mc
     where mc.id = p_marca and mc.ativa), false);
$$;

-- Horários que o cliente pode escolher: de 15 em 15 min, a partir de agora + preparo,
-- até agendamento_dias à frente, só dentro do funcionamento. Lista vazia = não agenda.
create or replace function private.horarios_agendamento(p_marca uuid, p_agora timestamptz default now())
returns timestamptz[]
language sql
stable
set search_path = ''
as $$
  with m as (
    select mc.id, mc.agendamento_dias, l.tempo_preparo_min
      from public.marcas mc join public.lojas l on l.id = mc.loja_id
     where mc.id = p_marca and mc.ativa and mc.agendamento_dias > 0
  ),
  inicio as (
    -- arredonda para cima no próximo múltiplo de 15 min
    select m.*, to_timestamp(ceil(extract(epoch from p_agora + make_interval(mins => m.tempo_preparo_min)) / 900) * 900) as t0
      from m
  )
  select coalesce(array_agg(s order by s), '{}')
    from inicio i
    cross join lateral generate_series(i.t0, p_agora + make_interval(days => i.agendamento_dias), interval '15 minutes') s
   where private.dentro_do_horario(i.id, s);
$$;

-- Confere um horário pedido pelo cliente. Lança erro com mensagem para o usuário.
create or replace function private.validar_agendamento(p_marca uuid, p_quando timestamptz, p_agora timestamptz default now())
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_dias  smallint;
  v_prep  integer;
  v_fuso  text;
begin
  select mc.agendamento_dias, l.tempo_preparo_min, l.fuso_horario into v_dias, v_prep, v_fuso
    from public.marcas mc join public.lojas l on l.id = mc.loja_id where mc.id = p_marca;
  if coalesce(v_dias, 0) = 0 then
    raise exception 'Esta loja não aceita pedidos agendados.' using errcode = 'check_violation';
  end if;
  if p_quando < p_agora + make_interval(mins => v_prep) then
    raise exception 'Escolha um horário a partir de %.', to_char((p_agora + make_interval(mins => v_prep)) at time zone v_fuso, 'HH24:MI')
      using errcode = 'check_violation';
  end if;
  if p_quando > p_agora + make_interval(days => v_dias) then
    raise exception 'Dá para agendar com até % dia(s) de antecedência.', v_dias using errcode = 'check_violation';
  end if;
  if not private.dentro_do_horario(p_marca, p_quando) then
    raise exception 'A loja não funciona nesse horário.' using errcode = 'check_violation';
  end if;
end;
$$;

-- Taxa do bairro (sem diferença de maiúsculas e espaços). null = bairro não atendido.
create or replace function private.taxa_bairro(p_marca uuid, p_bairro text)
returns numeric
language sql
stable
set search_path = ''
as $$
  select a.taxa from public.areas_entrega a
   where a.marca_id = p_marca and a.ativo and lower(btrim(a.bairro)) = lower(btrim(coalesce(p_bairro, '')))
   limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Gravação do pedido (0006) + agendado_para. Pedido agendado não passa pelo aceite automático.
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

  insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por)
  values (p_loja, v_pedido, null, 'novo', case when v_agend is not null then 'Agendado' end, p_user);
  if v_auto then
    insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por) values (p_loja, v_pedido, 'novo', 'em_preparo', 'Aceite automático', null);
  end if;

  return v_pedido;
end;
$$;
revoke execute on function private.inserir_pedido(uuid, uuid, jsonb, public.origem_pedido, uuid) from anon, public;

-- Pedido lançado pela equipe. Entrega sem taxa informada (ausente ou null) usa a taxa do bairro.
create or replace function public.criar_pedido(p_loja uuid, p_marca uuid, p_dados jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dados jsonb := p_dados;
begin
  if auth.uid() is null or not private.tem_permissao(p_loja, 'pedidos_delivery') then
    raise exception 'Você não tem permissão para lançar pedidos.' using errcode = 'insufficient_privilege';
  end if;
  if v_dados ->> 'tipo' = 'entrega' and v_dados ->> 'taxa_entrega' is null then
    v_dados := v_dados || jsonb_build_object('taxa_entrega', coalesce(private.taxa_bairro(p_marca, v_dados #>> '{endereco,bairro}'), 0));
  end if;
  return private.inserir_pedido(p_loja, p_marca, v_dados, 'painel', auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Pedido do cliente (0006) + agendamento: com "agendado_para" a loja pode estar fechada agora,
-- mas o horário precisa valer (validar_agendamento).
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
  v_agend  timestamptz := nullif(p_dados ->> 'agendado_para', '')::timestamptz;
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
  if v_agend is not null then
    perform private.validar_agendamento(v_marca.id, v_agend);
  elsif not private.marca_aberta(v_marca.id) then
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
    v_taxa := private.taxa_bairro(v_marca.id, v_bairro);
    if v_taxa is null then
      raise exception 'Ainda não entregamos no bairro "%".', v_bairro using errcode = 'check_violation';
    end if;
  end if;

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
    'observacao', left(p_dados ->> 'observacao', 500),
    'agendado_para', v_agend);

  v_pedido := private.inserir_pedido(v_marca.loja_id, v_marca.id, v_dados, 'cardapio_digital', null);

  select numero, codigo, subtotal, total into v_ped from public.pedidos where id = v_pedido;
  if v_ped.subtotal < v_marca.pedido_minimo then
    raise exception 'O pedido mínimo é de R$ %.', replace(to_char(v_marca.pedido_minimo, 'FM999990.00'), '.', ',') using errcode = 'check_violation';
  end if;
  return jsonb_build_object('numero', v_ped.numero, 'codigo', v_ped.codigo, 'total', round(v_ped.total * 100));
end;
$$;

-- Horários para o cliente escolher (ISO, UTC). Público, como o cardápio.
create or replace function public.horarios_agendamento(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'dias', m.agendamento_dias,
           'horarios', to_jsonb(private.horarios_agendamento(m.id)))
    from public.marcas m
   where m.slug = lower(btrim(p_slug)) and m.ativa;
$$;

-- Acompanhamento (0006) + agendado_para.
create or replace function public.acompanhar_pedido(p_codigo uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'numero', p.numero, 'status', p.status, 'tipo', p.tipo, 'marca', m.nome, 'slug', m.slug, 'fuso', l.fuso_horario,
    'criado_em', p.criado_em, 'agendado_para', p.agendado_para, 'aceito_em', p.aceito_em, 'pronto_em', p.pronto_em, 'saiu_em', p.saiu_em,
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
-- Configuração de delivery (0006) + agendamento_dias.
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

  update public.marcas set
    status_cardapio   = case when p_config ? 'status' then (p_config ->> 'status')::public.status_cardapio else status_cardapio end,
    pedido_minimo     = case when p_config ? 'pedido_minimo' then coalesce((p_config ->> 'pedido_minimo')::numeric, 0) else pedido_minimo end,
    aceita_entrega    = case when p_config ? 'aceita_entrega' then (p_config ->> 'aceita_entrega')::boolean else aceita_entrega end,
    aceita_retirada   = case when p_config ? 'aceita_retirada' then (p_config ->> 'aceita_retirada')::boolean else aceita_retirada end,
    formas_pagamento  = case when p_config ? 'formas_pagamento'
                             then coalesce((select array_agg(distinct f::public.forma_pagamento) from jsonb_array_elements_text(p_config -> 'formas_pagamento') f), '{}')
                             else formas_pagamento end,
    mensagem_cardapio = case when p_config ? 'mensagem' then nullif(btrim(p_config ->> 'mensagem'), '') else mensagem_cardapio end,
    agendamento_dias  = case when p_config ? 'agendamento_dias' then coalesce((p_config ->> 'agendamento_dias')::smallint, 0) else agendamento_dias end
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

grant execute on function public.horarios_agendamento(text) to anon, authenticated;
revoke execute on function private.dentro_do_horario(uuid, timestamptz) from anon, public;
revoke execute on function private.horarios_agendamento(uuid, timestamptz) from anon, public;
revoke execute on function private.validar_agendamento(uuid, timestamptz, timestamptz) from anon, public;
revoke execute on function private.taxa_bairro(uuid, text) from anon, public;
