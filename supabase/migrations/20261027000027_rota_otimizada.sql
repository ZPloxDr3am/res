-- RES · 0027 · Rota otimizada com várias entregas (D-027).
--
-- * lojas.prazo_entrega_min: em quanto tempo a loja promete entregar (padrão 35 min). O prazo de cada
--   pedido = agendado_para ou criado_em + prazo. O app do motoboy usa o prazo para priorizar o
--   pedido mais atrasado na ordem das entregas.
-- * pedidos.rota_ordem: a ordem sugerida (o app do motoboy grava; o painel ao vivo desenha a rota).
-- * entrega_json leva destino, prazo e ordem; motoboy_painel e rastreio_ao_vivo listam na ordem da rota.

alter table public.lojas add column prazo_entrega_min smallint not null default 35 check (prazo_entrega_min between 10 and 240);
alter table public.pedidos add column rota_ordem smallint;

-- O app grava a ordem sugerida das entregas que estão com o motoboy (só as dele, em rota).
create or replace function public.registrar_rota(p_pedidos uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.pedidos p
     set rota_ordem = x.n
    from unnest(p_pedidos) with ordinality as x(id, n)
   where p.id = x.id and p.entregador_id = auth.uid() and p.status = 'em_entrega';
end;
$$;
grant execute on function public.registrar_rota(uuid[]) to authenticated;
revoke execute on function public.registrar_rota(uuid[]) from anon, public;

-- dados da entrega (20261023000020_entrega) + destino, prazo e ordem
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
    'destino_lat', p.destino_lat, 'destino_lng', p.destino_lng, 'rota_ordem', p.rota_ordem,
    'prazo', coalesce(p.agendado_para, p.criado_em + make_interval(mins => l.prazo_entrega_min)),
    'itens', coalesce((select jsonb_agg(jsonb_build_object('quantidade', i.quantidade, 'nome', i.nome) order by i.ordem)
                         from public.pedido_itens i where i.pedido_id = p.id), '[]'::jsonb),
    'entregador', p.entregador_nome, 'saiu_em', p.saiu_em, 'pronto_em', p.pronto_em, 'criado_em', p.criado_em)
  from public.lojas l, public.marcas m
  where l.id = p.loja_id and m.id = p.marca_id;
$$;

-- tela do motoboy (20261023000020_entrega): entregas na ordem da rota
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
    'em_rota', coalesce((select jsonb_agg(private.entrega_json(p) order by p.rota_ordem nulls last, p.saiu_em)
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

-- painel ao vivo (20261027000026_rastrei): entregas na ordem da rota, com prazo
create or replace function public.rastreio_ao_vivo(p_loja uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_grupo uuid := private.grupo_da_loja(p_loja);
  v_lojas uuid[] := private.lojas_grupo(p_loja);
begin
  if not private.tem_permissao(p_loja, 'pedidos_delivery') then
    raise exception 'Você não tem acesso às entregas.' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'grupo', v_grupo,
    'lojas', coalesce((select jsonb_agg(jsonb_build_object('nome', l.nome, 'lat', l.lat, 'lng', l.lng)) from public.lojas l where l.id = any (v_lojas) and l.lat is not null), '[]'::jsonb),
    'motoboys', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.entregador_id, 'nome', m.nome, 'lat', m.lat, 'lng', m.lng, 'precisao', m.precisao, 'velocidade', m.velocidade,
               'rumo', m.rumo, 'em', m.em,
               'entregas', coalesce((select jsonb_agg(jsonb_build_object(
                                              'id', p.id, 'numero', p.numero, 'loja', l.nome, 'cliente', p.cliente_nome,
                                              'bairro', p.endereco ->> 'bairro',
                                              'endereco', concat_ws(', ', p.endereco ->> 'logradouro', p.endereco ->> 'numero'),
                                              'saiu_em', p.saiu_em, 'distancia_km', p.distancia_km,
                                              'destino_lat', p.destino_lat, 'destino_lng', p.destino_lng, 'rota_ordem', p.rota_ordem,
                                              'prazo', coalesce(p.agendado_para, p.criado_em + make_interval(mins => l.prazo_entrega_min))) order by p.rota_ordem nulls last, p.saiu_em)
                                       from public.pedidos p join public.lojas l on l.id = p.loja_id
                                      where p.entregador_id = m.entregador_id and p.status = 'em_entrega'), '[]'::jsonb),
               'rota', coalesce((select jsonb_agg(jsonb_build_array(x.lat, x.lng) order by x.em)
                                   from (select mp.lat, mp.lng, mp.em from public.motoboy_posicoes mp
                                          where mp.entregador_id = m.entregador_id
                                            and mp.em >= coalesce((select min(p.saiu_em) from public.pedidos p where p.entregador_id = m.entregador_id and p.status = 'em_entrega'), now() - interval '2 hours')
                                          order by mp.em desc limit 600) x), '[]'::jsonb))
             order by m.nome)
        from public.motoboy_local m
       where m.grupo = v_grupo
         and exists (select 1 from public.pedidos p where p.entregador_id = m.entregador_id and p.status = 'em_entrega')), '[]'::jsonb));
end;
$$;
