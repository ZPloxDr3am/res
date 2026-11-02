-- 0068: relatório de operação (D-067). Pode rodar de novo.
-- Valores (descontos, frete, frete grátis, cupons), tempos (aceite, preparo, rota, entrega e % no prazo),
-- horário de pico (dia da semana × hora), canais, formas de pagamento, clientes novos x recorrentes,
-- pedidos por login (quem lançou no balcão) e motoboys (entregas, tempo de rota, km).
-- Valores em centavos, tempos em minutos. Mesma permissão do Resumo ("relatórios").

create or replace function public.relatorio_operacao(p_lojas uuid[], p_inicio timestamptz, p_fim timestamptz)
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
  return (
    with ped as (
      select p.*, l.prazo_entrega_min
        from public.pedidos p join public.lojas l on l.id = p.loja_id
       where p.loja_id = any (v_lojas) and p.criado_em >= p_inicio and p.criado_em < p_fim
    ),
    ok as (select * from ped where status <> 'cancelado'),
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
          'acrescimos', 0)
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
          from (select origem::text as origem, tipo::text as tipo, count(*) filter (where status <> 'cancelado') as n,
                       coalesce(round(sum(total) filter (where status <> 'cancelado') * 100), 0) as v, count(*) filter (where status = 'cancelado') as c
                  from ped group by 1, 2) x), '[]'::jsonb),
      'pagamentos', coalesce((
        select jsonb_agg(jsonb_build_object('forma', x.f, 'pedidos', x.n, 'valor', x.v) order by x.v desc)
          from (select pagamento::text as f, count(*) as n, round(sum(total) * 100) as v from ok group by 1) x), '[]'::jsonb),
      'clientes', (select jsonb_build_object(
          'com_telefone', count(distinct cliente_telefone),
          'novos', count(distinct o.cliente_telefone) filter (where not exists (
                     select 1 from public.pedidos q where q.loja_id = any (v_lojas) and q.cliente_telefone = o.cliente_telefone
                        and q.status <> 'cancelado' and q.criado_em < p_inicio)),
          'pedidos_sem_telefone', count(*) filter (where cliente_telefone is null))
        from ok o),
      'bairros', coalesce((
        select jsonb_agg(jsonb_build_object('bairro', x.b, 'pedidos', x.n, 'valor', x.v) order by x.n desc)
          from (select initcap(lower(btrim(endereco ->> 'bairro'))) as b, count(*) as n, round(sum(total) * 100) as v
                  from ok where tipo = 'entrega' and coalesce(btrim(endereco ->> 'bairro'), '') <> '' group by 1 order by 2 desc limit 15) x), '[]'::jsonb),
      'pessoas', coalesce((
        select jsonb_agg(jsonb_build_object('nome', x.nome, 'pedidos', x.n, 'valor', x.v, 'descontos', x.d, 'cancelados', x.c) order by x.n desc)
          from (select coalesce((select m.nome from public.membros m where m.user_id = p.criado_por and m.loja_id = p.loja_id limit 1), 'Sem nome') as nome,
                       count(*) filter (where p.status <> 'cancelado') as n,
                       coalesce(round(sum(p.total) filter (where p.status <> 'cancelado') * 100), 0) as v,
                       coalesce(round(sum(p.desconto) filter (where p.status <> 'cancelado') * 100), 0) as d,
                       count(*) filter (where p.status = 'cancelado') as c
                  from ped p where p.origem = 'painel' and p.criado_por is not null group by 1) x), '[]'::jsonb),
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
$$;
revoke execute on function public.relatorio_operacao(uuid[], timestamptz, timestamptz) from anon, public;
grant execute on function public.relatorio_operacao(uuid[], timestamptz, timestamptz) to authenticated;
