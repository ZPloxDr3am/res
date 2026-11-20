-- D-126 (Issue #165): faturamento com regra única.
-- Venda = pedido CONCLUÍDO, pela DATA DE CONCLUSÃO, em todas as telas (antes: Resumo, Meta, Relatórios e Bom dia
-- contavam qualquer pedido não cancelado pela data de criação; Gestão e Financeiro, só concluídos).
-- Cancelamentos continuam pela data do pedido. Operação passa a somar acréscimos; a composição ganha "acrescimos".
-- Cada função parte da versão mais recente (arquivo indicado). Pode rodar de novo.

-- de 20261021000008_multilojas.sql
create or replace function private.metricas_vendas(p_lojas uuid[], p_inicio timestamptz, p_fim timestamptz)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'loja_id', l.id, 'loja', l.nome,
           'pedidos', coalesce(x.pedidos, 0), 'faturamento', coalesce(x.fat, 0), 'cancelados', coalesce(c.cancelados, 0),
           'valor_cancelado', coalesce(c.valor_cancelado, 0), 'taxas_entrega', coalesce(x.taxas, 0),
           'entrega', coalesce(x.entrega, 0), 'retirada', coalesce(x.retirada, 0), 'balcao', coalesce(x.balcao, 0),
           'online', coalesce(x.online, 0))
         order by l.nome), '[]'::jsonb)
    from public.lojas l
  left join lateral (
    -- D-126: venda = pedido concluído, pela data de conclusão
    select count(*) as pedidos,
           round(sum(p.total) * 100) as fat,
           round(sum(p.taxa_entrega) * 100) as taxas,
           count(*) filter (where p.tipo = 'entrega') as entrega,
           count(*) filter (where p.tipo = 'retirada') as retirada,
           count(*) filter (where p.tipo = 'balcao') as balcao,
           count(*) filter (where p.origem = 'cardapio_digital') as online
      from public.pedidos p
     where p.loja_id = l.id and p.status = 'concluido' and p.concluido_em >= p_inicio and p.concluido_em < p_fim
  ) x on true
  left join lateral (
    -- cancelamentos continuam pela data do pedido
    select count(*) as cancelados, round(sum(p.total) * 100) as valor_cancelado
      from public.pedidos p
     where p.loja_id = l.id and p.status = 'cancelado' and p.criado_em >= p_inicio and p.criado_em < p_fim
  ) c on true
   where l.id = any (p_lojas);
$$;

-- de 20261021000013_resumo_composicao.sql
create or replace function private.composicao_vendas(p_lojas uuid[], p_inicio timestamptz, p_fim timestamptz)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'loja_id', m.loja_id, 'marca_id', m.id, 'marca', m.nome,
           'pedidos', coalesce(x.pedidos, 0),
           'produtos', coalesce(x.produtos, 0),
           'frete', coalesce(x.frete, 0),
           'descontos', coalesce(x.descontos, 0),
    'acrescimos', coalesce(x.acrescimos, 0),
           'total', coalesce(x.total, 0))
         order by m.loja_id, m.ordem, m.nome), '[]'::jsonb)
    from public.marcas m
    left join lateral (
      select count(*) as pedidos,
             round(sum(p.subtotal) * 100) as produtos,
             round(sum(p.taxa_entrega) * 100) as frete,
             round(sum(p.desconto) * 100) as descontos,
           round(sum(coalesce(p.acrescimo, 0)) * 100) as acrescimos,
             round(sum(p.total) * 100) as total
        from public.pedidos p
       where p.marca_id = m.id and p.loja_id = m.loja_id
         and p.status = 'concluido' and p.concluido_em >= p_inicio and p.concluido_em < p_fim
    ) x on true
   where m.loja_id = any (p_lojas);
$$;

create or replace function public.resumo_vendas(p_lojas uuid[], p_inicio timestamptz, p_fim timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lojas uuid[];
  v_dur   interval := p_fim - p_inicio;
begin
  if p_fim <= p_inicio or v_dur > interval '400 days' then
    raise exception 'Período inválido.' using errcode = 'invalid_parameter_value';
  end if;
  select coalesce(array_agg(id), '{}') into v_lojas
    from unnest(p_lojas) id where private.tem_permissao(id, 'relatorios');

  return jsonb_build_object(
    'atual', private.metricas_vendas(v_lojas, p_inicio, p_fim),
    'anterior', private.metricas_vendas(v_lojas, p_inicio - v_dur, p_inicio),
    'composicao', private.composicao_vendas(v_lojas, p_inicio, p_fim),
    'composicao_anterior', private.composicao_vendas(v_lojas, p_inicio - v_dur, p_inicio),
    'dias', coalesce((
      select jsonb_agg(jsonb_build_object('dia', d.dia, 'loja_id', d.loja_id, 'faturamento', d.fat, 'pedidos', d.n) order by d.dia, d.loja_id)
        from (
          select (p.concluido_em at time zone l.fuso_horario)::date as dia, p.loja_id,
                 round(sum(p.total) * 100) as fat, count(*) as n
            from public.pedidos p join public.lojas l on l.id = p.loja_id
           where p.loja_id = any (v_lojas) and p.status = 'concluido' and p.concluido_em >= p_inicio and p.concluido_em < p_fim
           group by 1, 2
        ) d), '[]'::jsonb)
  );
end;
$$;

-- de 20261101000065_meta_vendas.sql
create or replace function public.meta_vendas(p_lojas uuid[], p_mes date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lojas uuid[];
  v_fuso  text;
  v_mes   date := date_trunc('month', p_mes)::date;
  v_hoje  date;
  v_ini   timestamptz;
  v_fim   timestamptz;
begin
  select coalesce(array_agg(id), '{}') into v_lojas from unnest(p_lojas) id where private.tem_permissao(id, 'relatorios');
  if cardinality(v_lojas) = 0 then
    return null;
  end if;
  select fuso_horario into v_fuso from public.lojas where id = v_lojas[1];
  v_fuso := coalesce(v_fuso, 'America/Sao_Paulo');
  v_hoje := (now() at time zone v_fuso)::date;
  v_ini := v_mes::timestamp at time zone v_fuso;
  v_fim := (v_mes + interval '1 month')::timestamp at time zone v_fuso;
  return jsonb_build_object(
    'mes', v_mes,
    'hoje', v_hoje,
    'lojas', (
      select jsonb_agg(jsonb_build_object(
               'loja_id', l.id, 'loja', l.nome,
               'meta', (select round(m.valor * 100) from public.metas_vendas m where m.loja_id = l.id and m.mes <= v_mes order by m.mes desc limit 1),
               'meta_do_mes', exists (select 1 from public.metas_vendas m where m.loja_id = l.id and m.mes = v_mes),
               'vendido', (select coalesce(round(sum(p.total) * 100), 0) from public.pedidos p
                            where p.loja_id = l.id and p.status = 'concluido' and p.concluido_em >= v_ini and p.concluido_em < v_fim))
             order by l.nome)
        from public.lojas l where l.id = any (v_lojas)),
    -- vendido por dia do mês (todas as lojas pedidas)
    'dias', coalesce((
      select jsonb_object_agg(d.dia, d.v)
        from (select (p.concluido_em at time zone v_fuso)::date as dia, round(sum(p.total) * 100) as v
                from public.pedidos p
               where p.loja_id = any (v_lojas) and p.status = 'concluido' and p.concluido_em >= v_ini and p.concluido_em < v_fim
               group by 1) d), '{}'::jsonb),
    -- média de cada dia da semana (0 = domingo) nas 8 semanas antes de hoje
    'media_semana', (
      select jsonb_agg(coalesce(x.v, 0) order by g.dow)
        from generate_series(0, 6) g(dow)
        left join (select extract(dow from (p.concluido_em at time zone v_fuso))::int as dow, round(sum(p.total) * 100 / 8) as v
                     from public.pedidos p
                    where p.loja_id = any (v_lojas) and p.status = 'concluido'
                      and p.concluido_em >= ((v_hoje - 56)::timestamp at time zone v_fuso) and p.concluido_em < (v_hoje::timestamp at time zone v_fuso)
                    group by 1) x on x.dow = g.dow),
    'dias_com_historico', (select count(distinct (p.concluido_em at time zone v_fuso)::date) from public.pedidos p
                            where p.loja_id = any (v_lojas) and p.status = 'concluido'
                              and p.concluido_em >= ((v_hoje - 56)::timestamp at time zone v_fuso) and p.concluido_em < (v_hoje::timestamp at time zone v_fuso)),
    -- mês anterior: até o mesmo dia e inteiro
    'anterior_ate_hoje', (select coalesce(round(sum(p.total) * 100), 0) from public.pedidos p
                           where p.loja_id = any (v_lojas) and p.status = 'concluido'
                             and p.concluido_em >= ((v_mes - interval '1 month')::timestamp at time zone v_fuso)
                             and p.concluido_em < (((v_mes - interval '1 month') + make_interval(days => least(extract(day from v_hoje)::int, 28)))::timestamp at time zone v_fuso)),
    'anterior_total', (select coalesce(round(sum(p.total) * 100), 0) from public.pedidos p
                        where p.loja_id = any (v_lojas) and p.status = 'concluido'
                          and p.concluido_em >= ((v_mes - interval '1 month')::timestamp at time zone v_fuso) and p.concluido_em < v_ini)
  );
end;
$$;

-- de 20261101000066_relatorios.sql
create or replace function public.relatorio_vendas(p_lojas uuid[], p_inicio timestamptz, p_fim timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lojas uuid[];
  v_fuso  text;
begin
  if p_fim <= p_inicio or p_fim - p_inicio > interval '400 days' then
    raise exception 'Período inválido.' using errcode = 'invalid_parameter_value';
  end if;
  select coalesce(array_agg(id), '{}') into v_lojas from unnest(p_lojas) id where private.tem_permissao(id, 'relatorios');
  if cardinality(v_lojas) = 0 then
    return null;
  end if;
  select fuso_horario into v_fuso from public.lojas where id = v_lojas[1];
  v_fuso := coalesce(v_fuso, 'America/Sao_Paulo');
  return jsonb_build_object(
    'produtos', coalesce((
      select jsonb_agg(jsonb_build_object('nome', x.nome, 'qtd', x.qtd, 'valor', x.valor) order by x.valor desc)
        from (select max(i.nome) as nome, sum(i.quantidade) as qtd, round(sum(i.total) * 100) as valor
                from public.pedido_itens i join public.pedidos p on p.id = i.pedido_id
               where p.loja_id = any (v_lojas) and p.status = 'concluido' and p.concluido_em >= p_inicio and p.concluido_em < p_fim
               group by coalesce(i.produto_id::text, lower(i.nome))) x), '[]'::jsonb),
    'opcoes', coalesce((
      select jsonb_agg(jsonb_build_object('grupo', x.grupo, 'nome', x.nome, 'qtd', x.qtd, 'valor', x.valor, 'sabor', x.sabor) order by x.valor desc, x.qtd desc)
        from (select max(o.grupo_nome) as grupo, max(o.nome) as nome,
                     round(sum(o.quantidade * i.quantidade * coalesce(o.fracao, 1)), 2) as qtd,
                     round(sum(o.preco * o.quantidade * i.quantidade) * 100) as valor,
                     bool_or(o.fracao is not null) as sabor
                from public.pedido_item_opcoes o
                join public.pedido_itens i on i.id = o.item_id
                join public.pedidos p on p.id = i.pedido_id
               where p.loja_id = any (v_lojas) and p.status = 'concluido' and p.concluido_em >= p_inicio and p.concluido_em < p_fim
               group by coalesce(o.opcao_id::text, lower(o.grupo_nome) || '|' || lower(o.nome))) x), '[]'::jsonb),
    'pedidos', (select count(*) from public.pedidos p where p.loja_id = any (v_lojas) and p.status = 'concluido' and p.concluido_em >= p_inicio and p.concluido_em < p_fim),
    'faturamento', (select coalesce(round(sum(p.total) * 100), 0) from public.pedidos p
                     where p.loja_id = any (v_lojas) and p.status = 'concluido' and p.concluido_em >= p_inicio and p.concluido_em < p_fim),
    'cancelados', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'numero', p.numero, 'loja_id', p.loja_id, 'criado_em', p.criado_em, 'cancelado_em', p.cancelado_em,
               'valor', round(p.total * 100), 'motivo', coalesce(nullif(btrim(p.motivo_cancelamento), ''), 'Sem motivo'),
               'origem', p.origem, 'tipo', p.tipo, 'pagamento', p.pagamento, 'cliente', p.cliente_nome,
               'etapa', ev.de, 'por', coalesce(mb.nome, case when ev.id is not null and ev.por is null then 'Automático' end))
             order by p.cancelado_em desc)
        from public.pedidos p
        left join lateral (select e.id, e.de, e.por from public.pedido_eventos e
                            where e.pedido_id = p.id and e.para = 'cancelado' order by e.em desc limit 1) ev on true
        left join public.membros mb on mb.loja_id = p.loja_id and mb.user_id = ev.por
       where p.loja_id = any (v_lojas) and p.criado_em >= p_inicio and p.criado_em < p_fim and p.status = 'cancelado'), '[]'::jsonb),
    'dias', coalesce((
      select jsonb_object_agg(d.dia, jsonb_build_object('valor', d.valor, 'pedidos', d.n, 'cancelados', d.canc))
        from (select u.dia, sum(u.valor) as valor, sum(u.n) as n, sum(u.canc) as canc
                from (select (p.concluido_em at time zone v_fuso)::date as dia, round(sum(p.total) * 100) as valor, count(*) as n, 0 as canc
                        from public.pedidos p
                       where p.loja_id = any (v_lojas) and p.status = 'concluido' and p.concluido_em >= p_inicio and p.concluido_em < p_fim
                       group by 1
                      union all
                      select (p.criado_em at time zone v_fuso)::date, 0, 0, count(*)
                        from public.pedidos p
                       where p.loja_id = any (v_lojas) and p.status = 'cancelado' and p.criado_em >= p_inicio and p.criado_em < p_fim
                       group by 1) u
               group by u.dia) d), '{}'::jsonb)
  );
end;
$$;

-- de 20261119191000_relatorio_operacao_rapido.sql
create or replace function public.relatorio_operacao(p_lojas uuid[], p_inicio timestamp with time zone, p_fim timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_lojas uuid[];
  v_fuso  text;
begin
  if p_fim <= p_inicio or p_fim - p_inicio > interval '400 days' then
    raise exception 'Período inválido.' using errcode = 'invalid_parameter_value';
  end if;
  select coalesce(array_agg(id), '{}') into v_lojas from unnest(p_lojas) id where private.tem_permissao(id, 'relatorios');
  if cardinality(v_lojas) = 0 then
    return null;
  end if;
  select fuso_horario into v_fuso from public.lojas where id = v_lojas[1];
  v_fuso := coalesce(v_fuso, 'America/Sao_Paulo');
  return (
    with ped as (
      select p.*, l.prazo_entrega_min
        from public.pedidos p join public.lojas l on l.id = p.loja_id
       where p.loja_id = any (v_lojas) and p.criado_em >= p_inicio and p.criado_em < p_fim
    ),
    -- D-126: venda = concluído no período, pela data de conclusão; ped (data do pedido) fica só para os cancelamentos
    ok as (
      select p.*, l.prazo_entrega_min
        from public.pedidos p join public.lojas l on l.id = p.loja_id
       where p.loja_id = any (v_lojas) and p.status = 'concluido' and p.concluido_em >= p_inicio and p.concluido_em < p_fim
    ),
    entregues as (select * from ok where tipo = 'entrega' and status = 'concluido' and concluido_em is not null)
    select jsonb_build_object(
      'valores', (select jsonb_build_object(
          'pedidos', count(*),
          'faturamento', coalesce(round(sum(total) * 100), 0),
          'produtos', coalesce(round(sum(subtotal) * 100), 0),
          'frete', coalesce(round(sum(taxa_entrega) * 100), 0),
          'frete_gratis', coalesce(round(sum(taxa_entrega) filter (where frete_gratis is not null) * 100), 0),
          'frete_gratis_pedidos', count(*) filter (where frete_gratis is not null),
          'descontos', coalesce(round(sum(desconto) * 100), 0),
          'pedidos_com_desconto', count(*) filter (where desconto > 0),
          'cupons', coalesce(round(sum(desconto - case when frete_gratis is not null then taxa_entrega else 0 end) filter (where cupom_id is not null) * 100), 0),
          'cupons_pedidos', count(*) filter (where cupom_id is not null),
          'acrescimos', coalesce(round(sum(acrescimo) * 100), 0))
        from ok),
      'tempos', (select jsonb_build_object(
          'aceite', round(avg(extract(epoch from aceito_em - criado_em) / 60) filter (where aceito_em is not null and agendado_para is null)::numeric, 1),
          'preparo', round(avg(extract(epoch from pronto_em - aceito_em) / 60) filter (where pronto_em is not null and aceito_em is not null and agendado_para is null)::numeric, 1),
          'espera_motoboy', round(avg(extract(epoch from saiu_em - pronto_em) / 60) filter (where saiu_em is not null and pronto_em is not null and tipo = 'entrega')::numeric, 1),
          'rota', round(avg(extract(epoch from concluido_em - saiu_em) / 60) filter (where concluido_em is not null and saiu_em is not null and tipo = 'entrega')::numeric, 1),
          'total_entrega', round(avg(extract(epoch from concluido_em - criado_em) / 60) filter (where concluido_em is not null and tipo = 'entrega' and agendado_para is null)::numeric, 1),
          'entregas', count(*) filter (where tipo = 'entrega' and status = 'concluido'),
          'no_prazo', count(*) filter (where tipo = 'entrega' and status = 'concluido' and concluido_em is not null
                                         and concluido_em <= coalesce(agendado_para + interval '10 minutes', criado_em + make_interval(mins => prazo_entrega_min + coalesce(prazo_extra_min, 0)))))
        from ok),
      'pico', coalesce((
        select jsonb_agg(jsonb_build_object('dow', x.dow, 'hora', x.hora, 'pedidos', x.n, 'valor', x.v))
          from (select extract(dow from criado_em at time zone v_fuso)::int as dow, extract(hour from criado_em at time zone v_fuso)::int as hora,
                       count(*) as n, round(sum(total) * 100) as v
                  from ok group by 1, 2) x), '[]'::jsonb),
      'canais', coalesce((
        select jsonb_agg(jsonb_build_object('origem', x.origem, 'tipo', x.tipo, 'pedidos', x.n, 'valor', x.v, 'cancelados', x.c) order by x.v desc)
          from (select u.origem, u.tipo, sum(u.n) as n, sum(u.v) as v, sum(u.c) as c
                  from (select origem::text as origem, tipo::text as tipo, count(*) as n, coalesce(round(sum(total) * 100), 0) as v, 0 as c
                          from ok group by 1, 2
                        union all
                        select origem::text, tipo::text, 0, 0, count(*) from ped where status = 'cancelado' group by 1, 2) u
                 group by 1, 2) x), '[]'::jsonb),
      'pagamentos', coalesce((
        select jsonb_agg(jsonb_build_object('forma', x.f, 'pedidos', x.n, 'valor', x.v) order by x.v desc)
          from (select pagamento::text as f, count(*) as n, round(sum(total) * 100) as v from ok group by 1) x), '[]'::jsonb),
      'clientes', (select jsonb_build_object(
          'com_telefone', count(distinct cliente_telefone),
          -- novos: telefones do período sem pedido antes dele (conferido uma vez por telefone, não por pedido)
          'novos', (select count(*) from (select distinct t.cliente_telefone from ok t where t.cliente_telefone is not null) tel
                     where not exists (select 1 from public.pedidos q where q.loja_id = any (v_lojas) and q.cliente_telefone = tel.cliente_telefone
                                          and q.status <> 'cancelado' and q.criado_em < p_inicio)),
          'pedidos_sem_telefone', count(*) filter (where cliente_telefone is null))
        from ok o),
      'bairros', coalesce((
        select jsonb_agg(jsonb_build_object('bairro', x.b, 'pedidos', x.n, 'valor', x.v) order by x.n desc)
          from (select initcap(lower(btrim(endereco ->> 'bairro'))) as b, count(*) as n, round(sum(total) * 100) as v
                  from ok where tipo = 'entrega' and coalesce(btrim(endereco ->> 'bairro'), '') <> '' group by 1 order by 2 desc limit 15) x), '[]'::jsonb),
      'pessoas', coalesce((
        select jsonb_agg(jsonb_build_object('nome', x.nome, 'pedidos', x.n, 'valor', x.v, 'descontos', x.d, 'cancelados', x.c) order by x.n desc)
          from (select coalesce((select m.nome from public.membros m where m.user_id = u.criado_por and m.loja_id = u.loja_id limit 1), 'Sem nome') as nome,
                       sum(u.n) as n, sum(u.v) as v, sum(u.d) as d, sum(u.c) as c
                  from (select p.criado_por, p.loja_id, count(*) as n, coalesce(round(sum(p.total) * 100), 0) as v,
                               coalesce(round(sum(p.desconto) * 100), 0) as d, 0 as c
                          from ok p where p.origem = 'painel' and p.criado_por is not null group by 1, 2
                        union all
                        select p.criado_por, p.loja_id, 0, 0, 0, count(*)
                          from ped p where p.status = 'cancelado' and p.origem = 'painel' and p.criado_por is not null group by 1, 2) u
                 group by 1) x), '[]'::jsonb),
      'motoboys', coalesce((
        select jsonb_agg(jsonb_build_object('nome', x.nome, 'entregas', x.n, 'rota', x.rota, 'total', x.tot, 'km', x.km, 'no_prazo', x.prazo) order by x.n desc)
          from (select coalesce(nullif(btrim(e.entregador_nome), ''), 'Sem nome') as nome, count(*) as n,
                       round(avg(extract(epoch from e.concluido_em - e.saiu_em) / 60) filter (where e.saiu_em is not null)::numeric, 1) as rota,
                       round(avg(extract(epoch from e.concluido_em - e.criado_em) / 60) filter (where e.agendado_para is null)::numeric, 1) as tot,
                       round(coalesce(sum(e.distancia_reta_km), 0), 1) as km,
                       count(*) filter (where e.concluido_em <= coalesce(e.agendado_para + interval '10 minutes', e.criado_em + make_interval(mins => e.prazo_entrega_min + coalesce(e.prazo_extra_min, 0))))  as prazo
                  from entregues e group by 1) x), '[]'::jsonb)
    )
  );
end;
$function$;

-- de 20261113290000_avaliacao_pedido.sql
create or replace function public.resumo_manha(p_loja uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_fuso text;
  v_hoje date;
  v_ini  timestamptz;
  v_est  uuid;
  e      record;
  v_fin  jsonb;
  v_estq jsonb;
  v_on   record;
  v_sem  record;
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente.' using errcode = 'insufficient_privilege';
  end if;
  select coalesce(fuso_horario, 'America/Sao_Paulo') into v_fuso from public.lojas where id = p_loja;
  v_hoje := (now() at time zone v_fuso)::date;
  v_ini := (v_hoje::timestamp) at time zone v_fuso; -- meia-noite de hoje no fuso da loja

  -- D-126: venda = concluído, pela data de conclusão; cancelados pela data do pedido
  select coalesce(round(sum(p.total) filter (where p.status = 'concluido' and p.concluido_em >= v_ini - interval '1 day' and p.concluido_em < v_ini) * 100), 0) as vendas,
         count(*) filter (where p.status = 'concluido' and p.concluido_em >= v_ini - interval '1 day' and p.concluido_em < v_ini) as pedidos,
         count(*) filter (where p.status = 'cancelado' and p.criado_em >= v_ini - interval '1 day' and p.criado_em < v_ini) as cancelados
    into v_on
    from public.pedidos p
   where p.loja_id = p_loja
     and ((p.concluido_em >= v_ini - interval '1 day' and p.concluido_em < v_ini) or (p.criado_em >= v_ini - interval '1 day' and p.criado_em < v_ini));
  select coalesce(round(sum(p.total) * 100), 0) as vendas, count(*) as pedidos
    into v_sem
    from public.pedidos p
   where p.loja_id = p_loja and p.status = 'concluido' and p.concluido_em >= v_ini - interval '8 days' and p.concluido_em < v_ini - interval '7 days';

  -- financeiro: o da loja, ou o do grupo quando quem vê é o titular
  select * into e from private.fin_escopo(p_loja);
  if private.fin_pode(e.loja, e.grupo) then
    select jsonb_build_object(
             'vencem_hoje', count(*) filter (where vencimento = v_hoje),
             'valor_hoje', coalesce(round(sum(valor) filter (where vencimento = v_hoje) * 100), 0),
             'vencidas', count(*) filter (where vencimento < v_hoje),
             'valor_vencidas', coalesce(round(sum(valor) filter (where vencimento < v_hoje) * 100), 0),
             'extrato_pendente', (select count(*) from public.fin_extrato x
                                   where x.loja_id is not distinct from e.loja and x.grupo_id is not distinct from e.grupo
                                     and x.lancamento_id is null and x.ignorado is null))
      into v_fin
      from public.fin_lancamentos
     where loja_id is not distinct from e.loja and grupo_id is not distinct from e.grupo
       and tipo = 'despesa' and pago_em is null and vencimento <= v_hoje
       and (e.grupo is null or loja_ref is null or loja_ref = p_loja);
  end if;

  v_est := private.estoque_da_loja(p_loja);
  if v_est is not null then
    select jsonb_build_object(
             'abaixo_minimo', (select count(*) from public.insumos i
                                where i.estoque = v_est and i.ativo and i.controla and i.minimo > 0 and i.saldo <= i.minimo),
             'pausados', (select count(*) from public.produtos p where p.loja_id = p_loja and p.pausado_estoque))
      into v_estq;
  end if;

  return jsonb_build_object(
    'dia', v_hoje,
    'ontem', jsonb_build_object('vendas', v_on.vendas, 'pedidos', v_on.pedidos, 'cancelados', v_on.cancelados),
    'semana_passada', jsonb_build_object('vendas', v_sem.vendas, 'pedidos', v_sem.pedidos),
    'agendados_hoje', (select count(*) from public.pedidos p
                        where p.loja_id = p_loja and p.status <> 'cancelado'
                          and p.agendado_para >= v_ini and p.agendado_para < v_ini + interval '1 day'),
    'financeiro', v_fin,
    'estoque', v_estq,
    'nfe_para_entrada', (select count(*) from public.nfe_recebidas n where n.loja_id = p_loja and n.status = 'disponivel'),
    'motoboys_pendentes', (select count(*) from public.motoboy_solicitacoes s where s.loja_id = p_loja and s.status = 'pendente'),
    'insumos_subiram', case when v_est is null then 0 else (
      select count(*) from (
        select m.insumo_id, m.custo_unit, m.criado_em,
               lag(m.custo_unit) over (partition by m.insumo_id order by m.criado_em, m.id) as antes
          from public.estoque_movimentos m
         where m.estoque = v_est and m.tipo in ('entrada_nfe', 'entrada') and m.custo_unit > 0 and m.quantidade > 0
           and m.criado_em >= now() - interval '120 days') x
       where x.criado_em >= now() - interval '7 days' and x.antes > 0 and x.custo_unit >= x.antes * 1.05) end,
    'avaliacoes_ruins', (select count(*) from public.avaliacoes_pedido a
                          where a.loja_id = p_loja and a.nota <= 3 and a.resolvido_em is null and a.criado_em >= now() - interval '7 days')
  );
end;
$$;
