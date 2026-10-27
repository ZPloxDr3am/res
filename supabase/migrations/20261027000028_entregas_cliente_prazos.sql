-- RES · 0028 · Previsão para o cliente, rastreio pelo cliente, prazo por loja e relatório de tempos (D-028).
--
-- * pedidos.previsao_chegada: a hora prevista de chegada calculada pela rota do motoboy (D-027).
-- * acompanhar_pedido (página pública do cliente) mostra a previsão de entrega, quantas entregas o
--   motoboy faz antes da sua e — só quando o pedido do cliente é a PRÓXIMA parada — onde o motoboy
--   está (posição dos últimos 3 min). Antes disso o cliente não vê o motoboy (privacidade das
--   outras entregas).
-- * salvar_prazo_entrega: o dono muda o prazo da loja (Entregas → Bairros e preços).
-- * relatorio_entregas: tempos de cada etapa e atrasos por dia, bairro, motoboy e loja.

alter table public.pedidos add column previsao_chegada timestamptz;

-- 0027 + hora prevista de cada parada
drop function public.registrar_rota(uuid[]);
create function public.registrar_rota(p_pedidos uuid[], p_chegadas timestamptz[] default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.pedidos p
     set rota_ordem = x.n,
         previsao_chegada = case when p_chegadas is null then p.previsao_chegada else p_chegadas[x.n] end
    from unnest(p_pedidos) with ordinality as x(id, n)
   where p.id = x.id and p.entregador_id = auth.uid() and p.status = 'em_entrega';
end;
$$;
grant execute on function public.registrar_rota(uuid[], timestamptz[]) to authenticated;
revoke execute on function public.registrar_rota(uuid[], timestamptz[]) from anon, public;

-- Acompanhamento do cliente (0012) + prazo, previsão e motoboy a caminho.
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
    'prazo', coalesce(p.agendado_para, p.criado_em + make_interval(mins => l.prazo_entrega_min)),
    'previsao_chegada', case when p.status = 'em_entrega' then p.previsao_chegada end,
    'motoboy_nome', case when p.status = 'em_entrega' then split_part(btrim(p.entregador_nome), ' ', 1) end,
    'paradas_antes', case when p.status = 'em_entrega' then (
        select count(*) from public.pedidos q
         where q.entregador_id = p.entregador_id and q.status = 'em_entrega' and q.id <> p.id
           and q.rota_ordem is not null and p.rota_ordem is not null and q.rota_ordem < p.rota_ordem) end,
    'destino', case when p.status = 'em_entrega' and p.destino_lat is not null then jsonb_build_object('lat', p.destino_lat, 'lng', p.destino_lng) end,
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

-- Prazo de entrega da loja (minutos), na tela Entregas.
create or replace function public.salvar_prazo_entrega(p_loja uuid, p_minutos integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (private.tem_permissao(p_loja, 'cardapio_digital') or private.tem_permissao(p_loja, 'dados_empresa')) then
    raise exception 'Você não tem permissão para mudar o prazo de entrega.' using errcode = 'insufficient_privilege';
  end if;
  if p_minutos is null or p_minutos not between 10 and 240 then
    raise exception 'O prazo de entrega vai de 10 a 240 minutos.' using errcode = 'check_violation';
  end if;
  update public.lojas set prazo_entrega_min = p_minutos where id = p_loja;
end;
$$;

-- Tempos e atrasos (turnos 05:00 → 05:00 de p_de até p_ate), lojas do grupo que a pessoa gere.
create or replace function public.relatorio_entregas(p_loja uuid, p_de date, p_ate date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_fuso  text;
  v_lojas uuid[];
  v_ini   timestamptz;
  v_fim   timestamptz;
begin
  select fuso_horario into v_fuso from public.lojas where id = p_loja;
  select array_agg(x) into v_lojas from unnest(private.lojas_grupo(p_loja)) x
   where private.e_gestor(x) or private.tem_permissao(x, 'relatorios');
  if v_fuso is null or v_lojas is null then
    raise exception 'Você não tem acesso aos relatórios.' using errcode = 'insufficient_privilege';
  end if;
  if p_ate < p_de or p_ate - p_de > 92 then
    raise exception 'Escolha um período de até 93 dias.' using errcode = 'check_violation';
  end if;
  v_ini := (p_de + time '05:00') at time zone v_fuso;
  v_fim := (p_ate + 1 + time '05:00') at time zone v_fuso;

  return (
    with base as (
      select p.*, l.nome as loja_nome, nullif(btrim(p.endereco ->> 'bairro'), '') as bairro,
             coalesce(p.agendado_para, p.criado_em + make_interval(mins => l.prazo_entrega_min)) as prazo,
             ((p.criado_em at time zone v_fuso) - interval '5 hours')::date as dia
        from public.pedidos p join public.lojas l on l.id = p.loja_id
       where p.loja_id = any (v_lojas) and p.criado_em >= v_ini and p.criado_em < v_fim and p.status <> 'cancelado'
    ),
    ent as (
      select b.*, extract(epoch from b.concluido_em - b.prazo) / 60 as atraso
        from base b where b.tipo = 'entrega' and b.status = 'concluido'
    ),
    min_ as (
      select
        round(avg(extract(epoch from aceito_em - criado_em) / 60) filter (where agendado_para is null))           as aceite,
        round(avg(extract(epoch from pronto_em - aceito_em) / 60))                                                 as preparo,
        round(avg(extract(epoch from saiu_em - pronto_em) / 60) filter (where tipo = 'entrega'))                   as expedicao,
        round(avg(extract(epoch from concluido_em - saiu_em) / 60) filter (where tipo = 'entrega'))                as rua,
        round(avg(extract(epoch from concluido_em - criado_em) / 60) filter (where tipo = 'entrega' and agendado_para is null)) as total
      from base
    )
    select jsonb_build_object(
      'inicio', v_ini, 'fim', v_fim,
      'pedidos', (select count(*) from base),
      'entregas', (select count(*) from ent),
      'atrasados', (select count(*) from ent where atraso > 0),
      'atraso_medio', (select round(avg(atraso)) from ent where atraso > 0),
      'tempos', (select to_jsonb(min_) from min_),
      'por_dia', coalesce((select jsonb_agg(x order by x.dia) from (
          select dia, count(*) as entregas, count(*) filter (where atraso > 0) as atrasados,
                 round(avg(extract(epoch from concluido_em - criado_em) / 60) filter (where agendado_para is null)) as total
            from ent group by dia) x), '[]'::jsonb),
      'por_bairro', coalesce((select jsonb_agg(x order by x.atrasados desc, x.entregas desc) from (
          select coalesce(bairro, '(sem bairro)') as bairro, count(*) as entregas, count(*) filter (where atraso > 0) as atrasados,
                 round(avg(atraso) filter (where atraso > 0)) as atraso_medio,
                 round(avg(extract(epoch from concluido_em - saiu_em) / 60)) as rua
            from ent group by 1 order by 3 desc, 2 desc limit 20) x), '[]'::jsonb),
      'por_motoboy', coalesce((select jsonb_agg(x order by x.entregas desc) from (
          select coalesce(entregador_nome, '(sem motoboy)') as motoboy, count(*) as entregas, count(*) filter (where atraso > 0) as atrasados,
                 round(avg(extract(epoch from concluido_em - saiu_em) / 60)) as rua
            from ent group by 1) x), '[]'::jsonb),
      'por_loja', coalesce((select jsonb_agg(x order by x.loja) from (
          select b.loja_nome as loja, count(*) as pedidos,
                 round(avg(extract(epoch from b.pronto_em - b.aceito_em) / 60)) as preparo,
                 (select count(*) from ent e where e.loja_id = b.loja_id) as entregas,
                 (select count(*) from ent e where e.loja_id = b.loja_id and e.atraso > 0) as atrasados
            from base b group by b.loja_id, b.loja_nome) x), '[]'::jsonb)
    ));
end;
$$;

grant execute on function public.salvar_prazo_entrega(uuid, integer), public.relatorio_entregas(uuid, date, date) to authenticated;
revoke execute on function public.salvar_prazo_entrega(uuid, integer), public.relatorio_entregas(uuid, date, date) from anon, public;
