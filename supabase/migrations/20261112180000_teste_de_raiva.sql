-- D-101: correções do teste de raiva (12/11/2026). Pode rodar de novo.
-- 1. Quadro de pedidos: índices para o filtro "abertos ou fechados nas últimas 12 h". Sem eles o banco lia a
--    tabela inteira de pedidos (de todas as lojas) a cada atualização do quadro: 76 ms com 450 mil pedidos → 0,2 ms.
create index if not exists pedidos_abertos_idx on public.pedidos (loja_id, criado_em) where status not in ('concluido', 'cancelado');
create index if not exists pedidos_loja_concluido_idx on public.pedidos (loja_id, concluido_em) where concluido_em is not null;
create index if not exists pedidos_loja_cancelado_idx on public.pedidos (loja_id, cancelado_em) where cancelado_em is not null;

-- 2. KDS: duas estações marcando itens do mesmo pedido ao mesmo tempo deixavam 1 em cada 30 pedidos preso em
--    "em preparo" com tudo pronto. Agora o pedido é travado durante a marcação.
create or replace function public.kds_marcar(p_loja uuid, p_pedido uuid, p_itens uuid[], p_pronto boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare v public.pedidos;
begin
  if not private.equipe_operacao(p_loja) then
    raise exception 'Você não tem acesso à cozinha.' using errcode = 'insufficient_privilege';
  end if;
  -- trava o pedido: duas telas marcando itens ao mesmo tempo não deixam o pedido preso em "em preparo"
  select * into v from public.pedidos where id = p_pedido and loja_id = p_loja for update;
  if not found then raise exception 'Pedido não encontrado.' using errcode = 'no_data_found'; end if;
  update public.pedido_itens set kds_pronto_em = case when p_pronto then coalesce(kds_pronto_em, now()) else null end
   where pedido_id = p_pedido and id = any (p_itens);
  if p_pronto and v.status = 'em_preparo' and not exists (select 1 from public.pedido_itens where pedido_id = p_pedido and kds_pronto_em is null) then
    perform private.salao_status(p_pedido, 'pronto');
    return 'pronto';
  end if;
  if not p_pronto and v.status = 'pronto' and v.pronto_em > now() - interval '3 minutes' then
    update public.pedidos set status = 'em_preparo', pronto_em = null where id = p_pedido;
    insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por) values (p_loja, p_pedido, 'pronto', 'em_preparo', 'desfeito na cozinha', auth.uid());
    return 'em_preparo';
  end if;
  return v.status::text;
end;
$$;
grant execute on function public.kds_marcar(uuid, uuid, uuid[], boolean) to authenticated;

-- 3. QR na mesa: o freio de 20 s deixava passar 4 de 15 cliques simultâneos, e dava para mandar 40 itens × 99
--    (R$ 43 mil) para a cozinha. Agora a mesa é travada e o pedido tem limite.
create or replace function public.salao_pedido_qr(p_token text, p_slug text, p_itens jsonb, p_nome text, p_obs text)
returns integer language plpgsql security definer set search_path = '' as $$
declare l public.salao_locais; v_marca uuid; v_conta uuid; v_ped uuid;
begin
  -- trava a mesa: cliques simultâneos esperam a vez (o freio de 20 s vale de verdade)
  select * into l from public.salao_locais where qr_token = p_token and ativo for update;
  if not found or not private.loja_tem_modulo(l.loja_id, 'salao') then
    raise exception 'Mesa não encontrada. Chame o garçom.' using errcode = 'no_data_found';
  end if;
  select id into v_marca from public.marcas where slug = lower(btrim(p_slug)) and loja_id = l.loja_id and ativa;
  if v_marca is null then raise exception 'Cardápio não encontrado.' using errcode = 'no_data_found'; end if;
  -- pedido da mesa é de gente, não de robô: no máximo 30 itens e 20 de cada
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 or jsonb_array_length(p_itens) > 30
     or exists (select 1 from jsonb_array_elements(p_itens) x where coalesce((x ->> 'quantidade')::int, 1) > 20) then
    raise exception 'Pedido grande demais pelo QR. Chame o garçom.' using errcode = 'check_violation';
  end if;
  -- freio contra cliques repetidos: 1 rodada a cada 20 s por mesa
  if exists (select 1 from public.pedidos p join public.salao_contas c on c.id = p.salao_conta_id
              where c.local_id = l.id and p.salao_qr and p.criado_em > now() - interval '20 seconds') then
    raise exception 'Pedido recebido há pouco. Aguarde uns segundos para pedir de novo.' using errcode = 'check_violation';
  end if;
  v_conta := private.salao_abrir(l.loja_id, l.id, 1, p_nome);
  v_ped := private.salao_rodada(l.loja_id, v_conta, v_marca, p_itens, p_obs, 'cardapio_digital', true, p_nome);
  return (select numero from public.pedidos where id = v_ped);
end;
$$;
grant execute on function public.salao_pedido_qr(text, text, jsonb, text, text) to anon, authenticated;

-- 4. Faturamento dos últimos N dias por loja, somado no banco (a tela de Gestão baixava os pedidos e somava no
--    servidor; acima de 1.000 pedidos a API corta a lista e o total saía menor).
create or replace function public.faturamento_lojas(p_lojas uuid[], p_dias integer default 30)
returns table (loja_id uuid, total numeric) language sql stable security definer set search_path = '' as $$
  select p.loja_id, coalesce(sum(p.total), 0)
    from public.pedidos p
   where p.loja_id = any (p_lojas) and private.e_membro(p.loja_id)
     and p.status = 'concluido' and p.concluido_em >= now() - make_interval(days => greatest(1, least(coalesce(p_dias, 30), 366)))
   group by p.loja_id;
$$;
revoke execute on function public.faturamento_lojas(uuid[], integer) from public, anon;
grant execute on function public.faturamento_lojas(uuid[], integer) to authenticated;

-- 5. Carrinho abandonado (Turbo-Vendas): qualquer um podia gravar milhares de telefones inventados.
create or replace function public.turbo_carrinho(p_slug text, p_telefone text, p_nome text, p_itens text, p_total numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare v_marca uuid; v_loja uuid; v_tel text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
begin
  select m.id, m.loja_id into v_marca, v_loja from public.marcas m where m.slug = p_slug and m.ativa;
  if v_loja is null or v_tel !~ '^[0-9]{10,13}$' then return; end if;
  if not exists (select 1 from public.turbo_automacoes a where a.loja_id = v_loja and a.tipo = 'carrinho' and a.ativo) then return; end if;
  -- freio contra robô enchendo a fila (e, com o WhatsApp oficial, a conta da Meta) de telefones inventados:
  -- no máximo 60 carrinhos novos por loja a cada 10 min; quem já está na lista continua sendo atualizado
  if not exists (select 1 from public.turbo_carrinhos c where c.loja_id = v_loja and c.telefone = v_tel)
     and (select count(*) from public.turbo_carrinhos c where c.loja_id = v_loja and c.atualizado_em > now() - interval '10 minutes') >= 60 then
    return;
  end if;
  insert into public.turbo_carrinhos (loja_id, marca_id, telefone, nome, itens, total, atualizado_em)
  values (v_loja, v_marca, v_tel, left(btrim(p_nome), 120), left(p_itens, 400), p_total, now())
  on conflict (loja_id, telefone) do update set nome = coalesce(excluded.nome, turbo_carrinhos.nome), itens = excluded.itens, total = excluded.total,
                                                atualizado_em = now(), marca_id = excluded.marca_id, convertido_em = null;
end;
$$;
grant execute on function public.turbo_carrinho(text, text, text, text, numeric) to anon, authenticated;

-- 6. Cardápio digital: com telefones diferentes, um script fez 100 pedidos falsos (R$ 108 mil) em 2 segundos.
--    Freio por loja, além do freio por telefone que já existia.
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
  v_lat    double precision := nullif(p_dados #>> '{destino,lat}', '')::double precision;
  v_lng    double precision := nullif(p_dados #>> '{destino,lng}', '')::double precision;
  v_km     jsonb;
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
  -- freio da loja (D-101): um robô trocando o telefone a cada pedido enchia o quadro e a impressora.
  -- Mais de 25 pedidos do cardápio esperando aceite, ou mais de 60 em 10 minutos, segura os próximos.
  if (select count(*) from public.pedidos p where p.marca_id = v_marca.id and p.origem = 'cardapio_digital' and p.status = 'novo'
        and p.criado_em > now() - interval '30 minutes') >= 25
     or (select count(*) from public.pedidos p where p.marca_id = v_marca.id and p.origem = 'cardapio_digital'
        and p.criado_em > now() - interval '10 minutes') >= 60 then
    raise exception 'A loja está recebendo muitos pedidos agora. Tente de novo em alguns minutos ou fale com a loja.' using errcode = 'check_violation';
  end if;

  if v_tipo = 'entrega' then
    if v_lat is not null and (v_lat not between -90 and 90 or v_lng is null or v_lng not between -180 and 180) then
      v_lat := null; v_lng := null;
    end if;
    v_taxa := private.taxa_bairro(v_marca.id, v_bairro);
    if v_taxa is null then
      -- fora da lista de bairros: faixa de km (D-048)
      v_km := private.taxa_km(v_marca.id, v_lat, v_lng);
      if v_km is null and exists (select 1 from public.faixas_km where marca_id = v_marca.id) and v_lat is not null then
        raise exception 'Seu endereço fica fora da nossa área de entrega.' using errcode = 'check_violation';
      elsif v_km is null then
        raise exception 'Ainda não entregamos no bairro "%".', v_bairro using errcode = 'check_violation';
      end if;
      v_taxa := (v_km ->> 'taxa')::numeric;
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
    'troco_para', null,   -- conferido depois do cupom (0023)
    'observacao', left(p_dados ->> 'observacao', 500),
    'agendado_para', v_agend);

  v_pedido := private.inserir_pedido(v_marca.loja_id, v_marca.id, v_dados, 'cardapio_digital', null);
  if v_tipo = 'entrega' and v_lat is not null then
    update public.pedidos set destino_lat = v_lat, destino_lng = v_lng,
           distancia_reta_km = private.km_reta(l.lat, l.lng, v_lat, v_lng)
      from public.lojas l where pedidos.id = v_pedido and l.id = pedidos.loja_id and l.lat is not null;
    update public.pedidos set destino_lat = v_lat, destino_lng = v_lng where id = v_pedido and destino_lat is null;
  end if;

  -- frete grátis automático por área/valor/produto (0067), antes do cupom
  perform private.aplicar_frete_gratis(v_pedido);
  if nullif(btrim(p_dados ->> 'cupom'), '') is not null then
    perform private.aplicar_cupom(v_pedido, p_dados ->> 'cupom');
  end if;
  -- cashback / recompensa de pontos (0032): só com a prova de um pedido anterior deste cliente
  if jsonb_typeof(p_dados -> 'fidelidade') = 'object' then
    perform private.aplicar_fidelidade(v_pedido, p_dados -> 'fidelidade', true,
      case when coalesce(p_dados ->> 'fidelidade_prova', '') ~* '^[0-9a-f-]{36}$' then (p_dados ->> 'fidelidade_prova')::uuid end);
  end if;
  if v_pag = 'dinheiro' and nullif(p_dados ->> 'troco_para', '') is not null then
    if (p_dados ->> 'troco_para')::numeric < (select total from public.pedidos where id = v_pedido) then
      raise exception 'O valor para troco é menor que o total.' using errcode = 'check_violation';
    end if;
    update public.pedidos set troco_para = (p_dados ->> 'troco_para')::numeric where id = v_pedido;
  end if;

  select numero, codigo, subtotal, total into v_ped from public.pedidos where id = v_pedido;
  if v_ped.subtotal < v_marca.pedido_minimo then
    raise exception 'O pedido mínimo é de R$ %.', replace(to_char(v_marca.pedido_minimo, 'FM999990.00'), '.', ',') using errcode = 'check_violation';
  end if;
  return jsonb_build_object('numero', v_ped.numero, 'codigo', v_ped.codigo, 'total', round(v_ped.total * 100));  -- (0032: inalterado)
end;
$$;
