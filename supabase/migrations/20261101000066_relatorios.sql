-- 0066: relatórios — curva ABC, cancelamentos e calendário (D-065). Pode rodar de novo.
-- Uma função só, com o período e as lojas, para as lojas em que a pessoa tem "relatórios".
-- Curva ABC: produtos (valor dos itens), sabores de pizza (em pizzas inteiras: meia = 0,5) e
-- adicionais/bordas/complementos (o que foi escolhido, com o valor cobrado). Pedidos cancelados não entram.
-- Cancelamentos: cada um com motivo, etapa em que foi cancelado, canal, valor e quem cancelou.

create index if not exists pedidos_loja_criado_idx on public.pedidos (loja_id, criado_em);

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
               where p.loja_id = any (v_lojas) and p.criado_em >= p_inicio and p.criado_em < p_fim and p.status <> 'cancelado'
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
               where p.loja_id = any (v_lojas) and p.criado_em >= p_inicio and p.criado_em < p_fim and p.status <> 'cancelado'
               group by coalesce(o.opcao_id::text, lower(o.grupo_nome) || '|' || lower(o.nome))) x), '[]'::jsonb),
    'pedidos', (select count(*) from public.pedidos p where p.loja_id = any (v_lojas) and p.criado_em >= p_inicio and p.criado_em < p_fim),
    'faturamento', (select coalesce(round(sum(p.total) * 100), 0) from public.pedidos p
                     where p.loja_id = any (v_lojas) and p.criado_em >= p_inicio and p.criado_em < p_fim and p.status <> 'cancelado'),
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
        from (select (p.criado_em at time zone v_fuso)::date as dia,
                     coalesce(round(sum(p.total) filter (where p.status <> 'cancelado') * 100), 0) as valor,
                     count(*) filter (where p.status <> 'cancelado') as n,
                     count(*) filter (where p.status = 'cancelado') as canc
                from public.pedidos p
               where p.loja_id = any (v_lojas) and p.criado_em >= p_inicio and p.criado_em < p_fim
               group by 1) d), '{}'::jsonb)
  );
end;
$$;
revoke execute on function public.relatorio_vendas(uuid[], timestamptz, timestamptz) from anon, public;
grant execute on function public.relatorio_vendas(uuid[], timestamptz, timestamptz) to authenticated;
