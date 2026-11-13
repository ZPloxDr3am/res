-- D-110: PREVISÃO DE COMPRA E PRODUÇÃO. Média do consumo de cada dia da semana (últimas 4 semanas completas,
-- sem contar hoje): insumos pela baixa das vendas (estoque_movimentos), produtos pelos pedidos da loja.
-- A projeção (quando acaba, quanto comprar, o que preparar) é feita no @res/core.
-- Pode rodar de novo.

create or replace function public.previsao_estoque(p_loja uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_est  uuid := private.estoque_da_loja(p_loja);
  v_fuso text;
  v_hoje date;
  v_ini  timestamptz;
  v_fim  timestamptz;
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  select coalesce(fuso_horario, 'America/Sao_Paulo') into v_fuso from public.lojas where id = p_loja;
  v_hoje := (now() at time zone v_fuso)::date;
  v_fim := v_hoje::timestamp at time zone v_fuso;          -- meia-noite de hoje
  v_ini := (v_hoje - 28)::timestamp at time zone v_fuso;   -- 4 semanas antes
  return jsonb_build_object(
    'hoje', v_hoje,
    'insumos', coalesce((
      with c as (
        select m.insumo_id, extract(dow from (m.criado_em at time zone v_fuso))::int as d, -sum(m.quantidade) / 4 as q
          from public.estoque_movimentos m
         where m.estoque = v_est and m.tipo in ('venda', 'estorno_venda') and m.criado_em >= v_ini and m.criado_em < v_fim
         group by 1, 2
      )
      select jsonb_agg(jsonb_build_object(
               'id', i.id, 'nome', i.nome, 'unidade', i.unidade, 'saldo', i.saldo, 'minimo', i.minimo, 'custo', round(i.custo_medio * 100, 2),  -- centavos por unidade
               'fornecedor', (select n.emitente_nome from public.estoque_movimentos m join public.nfe_entradas n on n.id = m.nfe_id
                               where m.insumo_id = i.id and m.tipo = 'entrada_nfe' order by m.criado_em desc limit 1),
               'dow', (select jsonb_agg(round(coalesce((select c.q from c where c.insumo_id = i.id and c.d = g), 0), 3) order by g)
                         from generate_series(0, 6) g))
             order by i.nome)
        from public.insumos i
       where i.estoque = v_est and i.ativo and i.controla and exists (select 1 from c where c.insumo_id = i.id and c.q > 0)
    ), '[]'::jsonb),
    'produtos', coalesce((
      with v as (
        select it.produto_id, extract(dow from (p.criado_em at time zone v_fuso))::int as d, sum(it.quantidade)::numeric / 4 as q
          from public.pedido_itens it join public.pedidos p on p.id = it.pedido_id
         where p.loja_id = p_loja and p.status <> 'cancelado' and it.produto_id is not null and p.criado_em >= v_ini and p.criado_em < v_fim
         group by 1, 2
      ), top as (
        select produto_id from v group by produto_id order by sum(q) desc limit 60
      )
      select jsonb_agg(jsonb_build_object(
               'id', pr.id, 'nome', pr.nome,
               'dow', (select jsonb_agg(round(coalesce((select v.q from v where v.produto_id = pr.id and v.d = g), 0), 2) order by g)
                         from generate_series(0, 6) g))
             order by pr.nome)
        from top join public.produtos pr on pr.id = top.produto_id
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.previsao_estoque(uuid) from public, anon;
grant execute on function public.previsao_estoque(uuid) to authenticated;
