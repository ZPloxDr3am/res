-- 0063: modo movimento (D-062). Pode rodar de novo.
-- Cozinha apertou? A equipe soma +10/+20/+30/+45 min ao tempo de preparo e de entrega por um tempo
-- (1 h, 2 h ou até desligar). O cardápio mostra o prazo maior, o agendamento empurra os horários e
-- cada pedido feito nesse período guarda o acréscimo (pedidos.prazo_extra_min): o prazo dele não
-- muda depois que o movimento acaba, e os pedidos de antes não ficam "atrasados" de repente.

alter table public.lojas add column if not exists movimento_min smallint not null default 0;
alter table public.lojas add column if not exists movimento_ate timestamptz;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lojas_movimento_min') then
    alter table public.lojas add constraint lojas_movimento_min check (movimento_min between 0 and 90);
  end if;
end $$;
alter table public.pedidos add column if not exists prazo_extra_min smallint not null default 0;

create or replace function private.movimento_extra(p_loja uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select case when l.movimento_ate > now() then l.movimento_min else 0 end from public.lojas l where l.id = p_loja), 0);
$$;
grant execute on function private.movimento_extra(uuid) to anon, authenticated;

-- todo pedido novo guarda o acréscimo em vigor
create or replace function private.pedido_prazo_extra()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.prazo_extra_min := private.movimento_extra(new.loja_id);
  return new;
end;
$$;
drop trigger if exists pedidos_prazo_extra on public.pedidos;
create trigger pedidos_prazo_extra before insert on public.pedidos for each row execute function private.pedido_prazo_extra();

-- ligar (p_minutos > 0) por p_horas (null = até desligar, no máximo 12 h) ou desligar (0). Qualquer pessoa da equipe.
create or replace function public.definir_movimento(p_loja uuid, p_minutos integer, p_horas numeric default null)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare v_ate timestamptz;
begin
  if not private.e_membro(p_loja) then
    raise exception 'Loja não encontrada.' using errcode = 'no_data_found';
  end if;
  if p_minutos is null or p_minutos < 0 or p_minutos > 90 then
    raise exception 'O acréscimo vai de 5 a 90 minutos.' using errcode = 'check_violation';
  end if;
  if p_minutos = 0 then
    update public.lojas set movimento_min = 0, movimento_ate = null where id = p_loja;
    return null;
  end if;
  v_ate := now() + make_interval(secs => round(least(coalesce(p_horas, 12), 12) * 3600)::integer);
  update public.lojas set movimento_min = p_minutos, movimento_ate = v_ate where id = p_loja;
  return v_ate;
end;
$$;
revoke execute on function public.definir_movimento(uuid, integer, numeric) from anon, public;
grant execute on function public.definir_movimento(uuid, integer, numeric) to authenticated;

-- Abaixo: as funções que mostram prazos, iguais às últimas versões, somando o acréscimo.

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
    'prazo', coalesce(p.agendado_para, p.criado_em + make_interval(mins => l.prazo_entrega_min + coalesce(p.prazo_extra_min, 0))),
    'itens', coalesce((select jsonb_agg(jsonb_build_object('quantidade', i.quantidade, 'nome', i.nome) order by i.ordem)
                         from public.pedido_itens i where i.pedido_id = p.id), '[]'::jsonb),
    'entregador', p.entregador_nome, 'saiu_em', p.saiu_em, 'pronto_em', p.pronto_em, 'criado_em', p.criado_em)
  from public.lojas l, public.marcas m
  where l.id = p.loja_id and m.id = p.marca_id;
$$;



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
                                              'prazo', coalesce(p.agendado_para, p.criado_em + make_interval(mins => l.prazo_entrega_min + coalesce(p.prazo_extra_min, 0)))) order by p.rota_ordem nulls last, p.saiu_em)
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
    'pagamento', p.pagamento, 'troco_para', round(p.troco_para * 100), 'tempo_preparo_min', l.tempo_preparo_min + coalesce(p.prazo_extra_min, 0),
    'prazo', coalesce(p.agendado_para, p.criado_em + make_interval(mins => l.prazo_entrega_min + coalesce(p.prazo_extra_min, 0))),
    'previsao_chegada', case when p.status = 'em_entrega' then p.previsao_chegada end,
    'motoboy_nome', case when p.status = 'em_entrega' then split_part(btrim(p.entregador_nome), ' ', 1) end,
    'paradas_antes', case when p.status = 'em_entrega' then (
        select count(*) from public.pedidos q
         where q.entregador_id = p.entregador_id and q.status = 'em_entrega' and q.id <> p.id
           and q.rota_ordem is not null and p.rota_ordem is not null and q.rota_ordem < p.rota_ordem) end,
    'destino', case when p.status = 'em_entrega' and p.destino_lat is not null then jsonb_build_object('lat', p.destino_lat, 'lng', p.destino_lng) end,
    'fidelidade', jsonb_build_object(
        'cashback_usado', round(p.fid_cashback * 100), 'pontos_usados', p.fid_pontos,
        'cashback_ganho', (select round(coalesce(sum(f.valor), 0) * 100) from public.fidelidade_movimentos f where f.pedido_id = p.id and f.tipo = 'cashback' and f.natureza = 'ganho'),
        'pontos_ganhos', (select coalesce(sum(f.valor), 0)::int from public.fidelidade_movimentos f where f.pedido_id = p.id and f.tipo = 'pontos' and f.natureza = 'ganho')),
    'motoboy', (select jsonb_build_object('lat', ml.lat, 'lng', ml.lng, 'em', ml.em)
                  from public.motoboy_local ml
                 where p.status = 'em_entrega' and ml.entregador_id = p.entregador_id and ml.em > now() - interval '3 minutes'
                   -- só quando este pedido é a próxima parada
                   and not exists (select 1 from public.pedidos q
                                    where q.entregador_id = p.entregador_id and q.status = 'em_entrega' and q.id <> p.id
                                      and (p.rota_ordem is null or (q.rota_ordem is not null and q.rota_ordem < p.rota_ordem)))),
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



create or replace function public.vitrine_publica(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with m as (select * from public.marcas where slug = lower(btrim(p_slug)) and ativa),
       l as (select l.* from public.lojas l join m on m.loja_id = l.id),
       vend as (
         select o.opcao_id, o.grupo_id, count(distinct i.pedido_id) as n
           from public.pedido_item_opcoes o
           join public.pedido_itens i on i.id = o.item_id
           join public.pedidos p on p.id = i.pedido_id
          where p.loja_id = (select id from l) and p.status <> 'cancelado' and p.criado_em > now() - interval '60 days' and o.opcao_id is not null
          group by o.opcao_id, o.grupo_id),
       top as (select opcao_id from (select v.*, row_number() over (partition by grupo_id order by n desc) as r from vend v where n >= 3) x where r <= 3)
  select jsonb_build_object(
    'logo_url', m.logo_url, 'capa_url', m.capa_url, 'cor', m.cor, 'descricao', m.descricao,
    'instagram', m.instagram, 'whatsapp', m.whatsapp,
    'loja', jsonb_build_object('nome', l.nome, 'cnpj', l.cnpj, 'endereco', l.endereco, 'cidade', l.cidade,
                               'prazo_entrega_min', l.prazo_entrega_min + private.movimento_extra(l.id), 'tempo_preparo_min', l.tempo_preparo_min + private.movimento_extra(l.id), 'movimento_min', private.movimento_extra(l.id)),
    'produtos', coalesce((select jsonb_object_agg(p.id, jsonb_build_object('serve', p.serve_pessoas, 'restricoes', p.restricoes))
                            from public.produtos p where p.loja_id = m.loja_id and (p.serve_pessoas is not null or cardinality(p.restricoes) > 0)), '{}'::jsonb),
    'opcoes', coalesce((select jsonb_object_agg(o.id, jsonb_build_object('descricao', o.descricao,
                                  'selo', case when o.id in (select opcao_id from top) then 'mais_pedido' else o.selo end))
                          from public.opcoes o
                         where o.loja_id = m.loja_id and o.ativo and (o.descricao is not null or o.selo is not null or o.id in (select opcao_id from top))), '{}'::jsonb))
  from m, l;
$$;



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
      'tempo_preparo_min', v_loja.tempo_preparo_min + private.movimento_extra(v_loja.id),
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
                 jsonb_build_object('id', st.id, 'nome', coalesce(nullif(btrim(st.nome_publico), ''), st.nome), 'upsell', st.upsell, 'produtos', prods.lista) as obj
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



create or replace function private.horarios_agendamento(p_marca uuid, p_agora timestamptz default now())
returns timestamptz[]
language sql
stable
set search_path = ''
as $$
  with m as (
    select mc.id, mc.agendamento_dias, l.tempo_preparo_min + private.movimento_extra(l.id) as tempo_preparo_min,
           greatest(p_agora, coalesce(l.pausa_ate, p_agora)) as base
      from public.marcas mc join public.lojas l on l.id = mc.loja_id
     where mc.id = p_marca and mc.ativa and mc.agendamento_dias > 0
  ),
  inicio as (
    -- arredonda para cima no próximo múltiplo de 15 min
    select m.*, to_timestamp(ceil(extract(epoch from m.base + make_interval(mins => m.tempo_preparo_min)) / 900) * 900) as t0
      from m
  )
  select coalesce(array_agg(s order by s), '{}')
    from inicio i
    cross join lateral generate_series(i.t0, p_agora + make_interval(days => i.agendamento_dias), interval '15 minutes') s
   where private.dentro_do_horario(i.id, s);
$$;



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
  v_pre   boolean;
  v_ent   timestamptz;
begin
  select mc.agendamento_dias, l.tempo_preparo_min + private.movimento_extra(l.id), l.fuso_horario, mc.prevenda, mc.prevenda_entrega into v_dias, v_prep, v_fuso, v_pre, v_ent
    from public.marcas mc join public.lojas l on l.id = mc.loja_id where mc.id = p_marca;
  if v_pre then
    if p_quando is distinct from v_ent then
      raise exception 'Na pré-venda o pedido é para a data do evento.' using errcode = 'check_violation';
    end if;
    if v_ent < p_agora then
      raise exception 'A pré-venda deste evento já terminou.' using errcode = 'check_violation';
    end if;
    return;
  end if;
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
