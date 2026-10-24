-- RES · 0020 · Etapa 5 (parte 2): km da entrega, valor do motoboy e fechamento da noite (D-020).
--
-- * Loja ganha endereço e coordenadas (ponto de saída das entregas).
-- * Cada bairro atendido (por cardápio) tem: taxa do cliente, VALOR DO MOTOBOY (vazio = igual à taxa)
--   e o km de referência da loja até o bairro (calculado pelo mapa ou digitado).
-- * Ao ler o QR, o pedido grava o valor do motoboy e o km do bairro; o app do motoboy depois troca
--   o km pelo da rota real até o endereço (OpenStreetMap), quando consegue.
-- * Fechamento da noite por motoboy (lojas do grupo): entregas, km, valor a receber, dinheiro em
--   mãos e o acerto. O "dia" das entregas vai das 05:00 às 05:00 (pizzaria fecha depois da meia-noite).

alter table public.lojas
  add column endereco text check (endereco is null or length(btrim(endereco)) between 3 and 200),
  add column lat double precision check (lat between -90 and 90),
  add column lng double precision check (lng between -180 and 180);

alter table public.areas_entrega
  add column valor_motoboy numeric(12, 2) check (valor_motoboy >= 0),
  add column km numeric(6, 2) check (km >= 0 and km < 1000);

alter table public.pedidos
  add column valor_motoboy   numeric(12, 2) check (valor_motoboy >= 0),
  add column distancia_km    numeric(6, 2) check (distancia_km >= 0 and distancia_km < 1000),
  add column distancia_fonte text check (distancia_fonte in ('rota', 'reta', 'bairro', 'manual'));
create index pedidos_saiu_idx on public.pedidos (loja_id, saiu_em) where entregador_id is not null;

-- Início do turno que contém p_quando: 05:00 do dia (ou do dia anterior, de madrugada), no fuso da loja.
create or replace function private.inicio_turno(p_quando timestamptz, p_fuso text default 'America/Sao_Paulo')
returns timestamptz
language sql
immutable
set search_path = ''
as $$
  select (date_trunc('day', (p_quando at time zone p_fuso) - interval '5 hours') + interval '5 hours') at time zone p_fuso;
$$;

-- Bairro cadastrado do pedido (mesma regra da taxa: sem diferença de maiúsculas e espaços).
create or replace function private.area_do_pedido(p public.pedidos)
returns public.areas_entrega
language sql
stable
set search_path = ''
as $$
  select a.* from public.areas_entrega a
   where a.marca_id = p.marca_id and lower(btrim(a.bairro)) = lower(btrim(coalesce(p.endereco ->> 'bairro', '')))
   limit 1;
$$;
revoke execute on function private.area_do_pedido(public.pedidos) from anon, public;

-- ---------------------------------------------------------------------------
-- Cadastro: local da loja e tabela de bairros
-- ---------------------------------------------------------------------------
create or replace function public.salvar_local_loja(p_loja uuid, p_endereco text, p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (private.tem_permissao(p_loja, 'cardapio_digital') or private.tem_permissao(p_loja, 'dados_empresa')) then
    raise exception 'Você não tem permissão para mudar o endereço da loja.' using errcode = 'insufficient_privilege';
  end if;
  if (p_lat is null) <> (p_lng is null) then
    raise exception 'Informe latitude e longitude juntas.' using errcode = 'check_violation';
  end if;
  update public.lojas set endereco = nullif(btrim(coalesce(p_endereco, '')), ''), lat = p_lat, lng = p_lng where id = p_loja;
end;
$$;

-- Substitui a tabela de bairros de um cardápio. p_areas: [{bairro, taxa, valor_motoboy?, km?, ativo?}] em reais.
create or replace function public.salvar_areas_entrega(p_marca uuid, p_areas jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid;
  v_rep  text;
begin
  select loja_id into v_loja from public.marcas where id = p_marca;
  if v_loja is null or not private.tem_permissao(v_loja, 'cardapio_digital') then
    raise exception 'Você não tem permissão para mudar os bairros e taxas.' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(coalesce(p_areas, '[]'::jsonb)) <> 'array' then
    raise exception 'Lista de bairros inválida.' using errcode = 'invalid_parameter_value';
  end if;
  select min(btrim(a ->> 'bairro')) into v_rep
    from jsonb_array_elements(p_areas) a
   group by lower(btrim(a ->> 'bairro')) having count(*) > 1;
  if v_rep is not null then
    raise exception 'O bairro "%" aparece duas vezes.', v_rep using errcode = 'unique_violation';
  end if;

  delete from public.areas_entrega where marca_id = p_marca;
  insert into public.areas_entrega (loja_id, marca_id, bairro, taxa, valor_motoboy, km, ativo)
  select v_loja, p_marca, btrim(a ->> 'bairro'),
         coalesce((a ->> 'taxa')::numeric, 0),
         nullif(a ->> 'valor_motoboy', '')::numeric,
         nullif(a ->> 'km', '')::numeric,
         coalesce((a ->> 'ativo')::boolean, true)
    from jsonb_array_elements(p_areas) a
   where btrim(coalesce(a ->> 'bairro', '')) <> '';
end;
$$;

-- A tela "Delivery" antiga ainda salva áreas pelo salvar_config_delivery: mantém valor do motoboy e km
-- dos bairros que continuam na lista.
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
    perform public.salvar_areas_entrega(p_marca, (
      select coalesce(jsonb_agg(a || jsonb_build_object('valor_motoboy', x.valor_motoboy, 'km', x.km)), '[]'::jsonb)
        from jsonb_array_elements(p_config -> 'areas') a
        left join public.areas_entrega x on x.marca_id = p_marca and lower(btrim(x.bairro)) = lower(btrim(a ->> 'bairro'))));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Entrega: dados para o celular, despacho e km
-- ---------------------------------------------------------------------------
create or replace function private.entrega_json(p public.pedidos)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'numero', p.numero, 'status', p.status, 'loja', l.nome, 'cidade', l.cidade, 'marca', m.nome,
    'cliente', p.cliente_nome, 'telefone', p.cliente_telefone, 'endereco', p.endereco, 'observacao', p.observacao,
    'pagamento', p.pagamento, 'total', round(p.total * 100), 'troco_para', round(p.troco_para * 100),
    -- pago online ou marcado como pago no painel (ex.: Pix antecipado) não se cobra; o resto se cobra na porta
    'cobrar', p.pagamento <> 'online' and p.pago_em is null,
    'pago_em', p.pago_em,
    'taxa_entrega', round(p.taxa_entrega * 100),
    'valor_motoboy', round(p.valor_motoboy * 100),
    'distancia_km', p.distancia_km, 'distancia_fonte', p.distancia_fonte,
    'loja_lat', l.lat, 'loja_lng', l.lng,
    'itens', coalesce((select jsonb_agg(jsonb_build_object('quantidade', i.quantidade, 'nome', i.nome) order by i.ordem)
                         from public.pedido_itens i where i.pedido_id = p.id), '[]'::jsonb),
    'entregador', p.entregador_nome, 'saiu_em', p.saiu_em, 'pronto_em', p.pronto_em, 'criado_em', p.criado_em)
  from public.lojas l, public.marcas m
  where l.id = p.loja_id and m.id = p.marca_id;
$$;
revoke execute on function private.entrega_json(public.pedidos) from anon, public;

-- Escaneou o QR: o pedido sai com este motoboy (0018) + grava valor do motoboy e km do bairro.
create or replace function public.motoboy_despachar(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped  public.pedidos;
  v_area public.areas_entrega;
  v_nome text;
begin
  select * into v_ped from public.pedidos where qr_token = btrim(coalesce(p_token, '')) for update;
  if not found then
    raise exception 'QR não reconhecido. Confira se é a comanda de um pedido do RES.' using errcode = 'no_data_found';
  end if;
  v_nome := private.motoboy_no_grupo(v_ped.loja_id);
  if v_nome is null then
    raise exception 'Seu usuário não é motoboy desta loja.' using errcode = 'insufficient_privilege';
  end if;
  if v_ped.tipo <> 'entrega' then
    raise exception 'O pedido #% é para %, não tem entrega.', v_ped.numero, case v_ped.tipo when 'retirada' then 'retirar' else 'o balcão' end using errcode = 'check_violation';
  end if;
  if v_ped.status = 'em_entrega' then
    if v_ped.entregador_id = auth.uid() then
      return private.entrega_json(v_ped);   -- escaneou de novo: segue com ele
    end if;
    raise exception 'O pedido #% já saiu com %.', v_ped.numero, coalesce(v_ped.entregador_nome, 'outro motoboy') using errcode = 'check_violation';
  end if;
  if v_ped.status in ('concluido', 'cancelado') then
    raise exception 'O pedido #% está %.', v_ped.numero, case v_ped.status when 'concluido' then 'entregue' else 'cancelado' end using errcode = 'check_violation';
  end if;

  if v_ped.status = 'novo' then
    insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por) values (v_ped.loja_id, v_ped.id, 'novo', 'em_preparo', 'Despacho pelo QR', auth.uid());
  end if;
  if v_ped.status in ('novo', 'em_preparo') then
    insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por) values (v_ped.loja_id, v_ped.id, 'em_preparo', 'pronto', 'Despacho pelo QR', auth.uid());
  end if;
  v_area := private.area_do_pedido(v_ped);
  update public.pedidos set
    status = 'em_entrega',
    aceito_em = coalesce(aceito_em, now()),
    pronto_em = coalesce(pronto_em, now()),
    saiu_em = now(),
    entregador_id = auth.uid(),
    entregador_nome = v_nome,
    -- valor do motoboy: o do bairro (vazio = taxa do bairro); bairro fora da tabela = taxa cobrada no pedido
    valor_motoboy = coalesce(valor_motoboy, v_area.valor_motoboy, v_area.taxa, taxa_entrega),
    distancia_km = coalesce(distancia_km, v_area.km),
    distancia_fonte = case when distancia_km is not null then distancia_fonte when v_area.km is not null then 'bairro' end
  where id = v_ped.id
  returning * into v_ped;
  insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por)
  values (v_ped.loja_id, v_ped.id, 'pronto', 'em_entrega', 'Saiu com ' || v_nome, auth.uid());
  return private.entrega_json(v_ped);
end;
$$;

-- O app mediu a rota até o endereço: troca o km do bairro pelo real. Não mexe em km ajustado à mão.
create or replace function public.registrar_distancia(p_pedido uuid, p_km numeric, p_fonte text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped public.pedidos;
begin
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if not found or not (v_ped.entregador_id = auth.uid() or private.tem_permissao(v_ped.loja_id, 'pedidos_delivery')) then
    raise exception 'Pedido não encontrado' using errcode = 'no_data_found';
  end if;
  if p_fonte not in ('rota', 'reta') or p_km is null or p_km < 0 or p_km > 300 then
    raise exception 'Distância inválida.' using errcode = 'check_violation';
  end if;
  if v_ped.distancia_fonte = 'manual' or (v_ped.distancia_fonte = 'rota' and p_fonte = 'reta') then
    return;
  end if;
  update public.pedidos set distancia_km = round(p_km, 2), distancia_fonte = p_fonte where id = p_pedido;
end;
$$;

-- Gestor corrige o valor do motoboy e/ou o km de uma entrega (fechamento da noite). null = não muda.
create or replace function public.ajustar_entrega(p_pedido uuid, p_valor_motoboy numeric, p_km numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped public.pedidos;
begin
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if not found or not (private.e_gestor(v_ped.loja_id) or private.tem_permissao(v_ped.loja_id, 'caixa')) then
    raise exception 'Pedido não encontrado' using errcode = 'no_data_found';
  end if;
  if v_ped.entregador_id is null then
    raise exception 'O pedido #% não saiu com motoboy.', v_ped.numero using errcode = 'check_violation';
  end if;
  if p_valor_motoboy < 0 or p_km < 0 or p_km > 300 then
    raise exception 'Valor inválido.' using errcode = 'check_violation';
  end if;
  update public.pedidos set
    valor_motoboy = coalesce(p_valor_motoboy, valor_motoboy),
    distancia_km = coalesce(round(p_km, 2), distancia_km),
    distancia_fonte = case when p_km is not null then 'manual' else distancia_fonte end
  where id = p_pedido;
  insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por)
  values (v_ped.loja_id, p_pedido, v_ped.status, v_ped.status,
          concat_ws(' · ', 'Entrega ajustada',
                    case when p_valor_motoboy is not null then 'motoboy R$ ' || to_char(p_valor_motoboy, 'FM999990.00') end,
                    case when p_km is not null then to_char(p_km, 'FM9990.0') || ' km' end),
          auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Fechamento da noite: entregas que saíram com motoboy no turno (05:00 → 05:00), lojas do grupo
-- em que a pessoa é gestora ou opera caixa. Valores em centavos; a soma é feita no app (core).
-- ---------------------------------------------------------------------------
create or replace function public.fechamento_motoboys(p_loja uuid, p_dia date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_fuso   text;
  v_inicio timestamptz;
  v_lojas  uuid[];
begin
  select fuso_horario into v_fuso from public.lojas where id = p_loja;
  select array_agg(x) into v_lojas from unnest(private.lojas_grupo(p_loja)) x
   where private.e_gestor(x) or private.tem_permissao(x, 'caixa');
  if v_fuso is null or v_lojas is null then
    raise exception 'Você não tem acesso ao fechamento dos motoboys.' using errcode = 'insufficient_privilege';
  end if;
  v_inicio := (p_dia + time '05:00') at time zone v_fuso;
  return jsonb_build_object(
    'inicio', v_inicio, 'fim', v_inicio + interval '1 day',
    'entregas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'numero', p.numero, 'loja', l.nome, 'status', p.status,
               'entregador_id', p.entregador_id, 'entregador', p.entregador_nome,
               'bairro', p.endereco ->> 'bairro', 'saiu_em', p.saiu_em, 'concluido_em', p.concluido_em,
               'pagamento', p.pagamento, 'pago', p.pagamento = 'online' or p.pago_em is not null,
               'total', round(p.total * 100), 'taxa_entrega', round(p.taxa_entrega * 100),
               'valor_motoboy', round(coalesce(p.valor_motoboy, p.taxa_entrega) * 100),
               'distancia_km', p.distancia_km, 'distancia_fonte', p.distancia_fonte)
             order by p.entregador_nome, p.saiu_em)
        from public.pedidos p join public.lojas l on l.id = p.loja_id
       where p.loja_id = any (v_lojas) and p.entregador_id is not null
         and p.saiu_em >= v_inicio and p.saiu_em < v_inicio + interval '1 day'
         and p.status in ('em_entrega', 'concluido')), '[]'::jsonb));
end;
$$;

-- Tela do motoboy (0019) + valor a receber, km e acerto do turno (05:00 → 05:00).
create or replace function public.motoboy_painel()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lojas  uuid[];
  v_nome   text;
  v_inicio timestamptz := private.inicio_turno(now());
begin
  select array_agg(distinct x), min(m.nome) into v_lojas, v_nome
    from public.membros m, unnest(private.lojas_grupo(m.loja_id)) x
   where m.user_id = auth.uid() and m.ativo and m.papel in ('entregador', 'dono', 'gerente');
  if v_lojas is null then
    return null;
  end if;
  return jsonb_build_object(
    'nome', v_nome,
    'em_rota', coalesce((select jsonb_agg(private.entrega_json(p) order by p.saiu_em)
                           from public.pedidos p where p.entregador_id = auth.uid() and p.status = 'em_entrega'), '[]'::jsonb),
    'prontos', coalesce((select jsonb_agg(jsonb_build_object('numero', p.numero, 'loja', l.nome, 'bairro', p.endereco ->> 'bairro', 'pronto_em', p.pronto_em, 'status', p.status) order by p.criado_em)
                           from public.pedidos p join public.lojas l on l.id = p.loja_id
                          where p.loja_id = any (v_lojas) and p.tipo = 'entrega' and p.status in ('pronto', 'em_preparo')
                            and p.criado_em > now() - interval '12 hours'), '[]'::jsonb),
    'hoje', (select jsonb_build_object(
                      'entregas', count(*),
                      'cobrado_dinheiro', coalesce(round(sum(p.total) filter (where p.pagamento = 'dinheiro' and p.pago_em is null) * 100), 0),
                      'cobrado_outros', coalesce(round(sum(p.total) filter (where p.pagamento not in ('dinheiro', 'online') and p.pago_em is null) * 100), 0),
                      'taxas', coalesce(round(sum(p.taxa_entrega) * 100), 0),
                      'a_receber', coalesce(round(sum(coalesce(p.valor_motoboy, p.taxa_entrega)) * 100), 0),
                      'km', coalesce(sum(p.distancia_km), 0))
               from public.pedidos p
              where p.entregador_id = auth.uid() and p.status = 'concluido' and p.saiu_em >= v_inicio),
    'feitas', coalesce((select jsonb_agg(jsonb_build_object('numero', p.numero, 'loja', l.nome, 'bairro', p.endereco ->> 'bairro',
                                                             'valor_motoboy', round(coalesce(p.valor_motoboy, p.taxa_entrega) * 100),
                                                             'distancia_km', p.distancia_km, 'concluido_em', p.concluido_em) order by p.concluido_em desc)
                          from public.pedidos p join public.lojas l on l.id = p.loja_id
                         where p.entregador_id = auth.uid() and p.status = 'concluido' and p.saiu_em >= v_inicio), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.salvar_local_loja(uuid, text, double precision, double precision), public.salvar_areas_entrega(uuid, jsonb),
  public.registrar_distancia(uuid, numeric, text), public.ajustar_entrega(uuid, numeric, numeric), public.fechamento_motoboys(uuid, date) to authenticated;
revoke execute on function public.salvar_local_loja(uuid, text, double precision, double precision), public.salvar_areas_entrega(uuid, jsonb),
  public.registrar_distancia(uuid, numeric, text), public.ajustar_entrega(uuid, numeric, numeric), public.fechamento_motoboys(uuid, date) from anon, public;
revoke execute on function private.inicio_turno(timestamptz, text) from anon, public;
