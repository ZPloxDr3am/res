-- RES · 0013 · Resumo: composição das vendas (produtos, frete, descontos) por cardápio/marca,
-- no período e no período anterior de mesmo tamanho. Só pedidos não cancelados, em centavos.
-- Acréscimos e taxa de serviço ainda não existem no pedido (entram com caixa/salão); o resumo mostra 0.

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
           'total', coalesce(x.total, 0))
         order by m.loja_id, m.ordem, m.nome), '[]'::jsonb)
    from public.marcas m
    left join lateral (
      select count(*) as pedidos,
             round(sum(p.subtotal) * 100) as produtos,
             round(sum(p.taxa_entrega) * 100) as frete,
             round(sum(p.desconto) * 100) as descontos,
             round(sum(p.total) * 100) as total
        from public.pedidos p
       where p.marca_id = m.id and p.loja_id = m.loja_id
         and p.criado_em >= p_inicio and p.criado_em < p_fim and p.status <> 'cancelado'
    ) x on true
   where m.loja_id = any (p_lojas);
$$;
revoke execute on function private.composicao_vendas(uuid[], timestamptz, timestamptz) from anon, public;

-- resumo_vendas (0008) + composicao / composicao_anterior.
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
          select (p.criado_em at time zone l.fuso_horario)::date as dia, p.loja_id,
                 round(sum(p.total) * 100) as fat, count(*) as n
            from public.pedidos p join public.lojas l on l.id = p.loja_id
           where p.loja_id = any (v_lojas) and p.criado_em >= p_inicio and p.criado_em < p_fim and p.status <> 'cancelado'
           group by 1, 2
        ) d), '[]'::jsonb)
  );
end;
$$;
