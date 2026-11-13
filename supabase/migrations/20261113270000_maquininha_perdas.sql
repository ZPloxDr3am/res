-- D-109: CONFERÊNCIA DA MAQUININHA E PERDAS
-- 1. Conferência: vendas no cartão (e Pix/vale com taxa) menos as taxas combinadas em Cadastros, na data em
--    que deviam cair (venda + dias, fim de semana passa para segunda), contra os créditos das maquininhas no
--    extrato importado (reconhecidos pelo nome: Rede, Cielo, Stone, Getnet, PagBank…). Só compara até o
--    último dia que o extrato cobre.
-- 2. Perdas: perda de produto pronto (baixa os insumos da ficha como perda) e resumo das perdas do período.
-- Pode rodar de novo.

create or replace function private.e_maquininha(p_descricao text)
returns boolean language sql immutable set search_path = '' as $$
  select p_descricao ~* '(redecard|\mrede\M|cielo|stone|getnet|pag ?seguro|pag ?bank|safra ?pay|mercado ?pago|sumup|\mvero\M|sipag|\mbin\M|\mton\M|infinite ?pay|granito|adiq|cabal|alelo|ticket|sodexo|pluxee|\mvr benef|ben visa|elo ?card|\mcredenciador|\madquir)';
$$;

create or replace function public.conferencia_maquininha(p_loja uuid, p_meses integer default 4)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  e       record;
  v_meses integer := least(greatest(coalesce(p_meses, 4), 1), 12);
  v_ini   date := (date_trunc('month', now()) - make_interval(months => v_meses - 1))::date;
  v_ate   date;
begin
  select * into e from private.fin_exigir(p_loja);
  select max(x.data) into v_ate from public.fin_extrato x
   where x.loja_id is not distinct from e.loja and x.grupo_id is not distinct from e.grupo;
  return jsonb_build_object(
    'ate', v_ate,
    'meses', coalesce((
      with lojas as (
        select l.id, coalesce(l.fuso_horario, 'America/Sao_Paulo') as fuso from public.lojas l
         where l.id = e.loja or (e.grupo is not null and l.conta_id = e.grupo)
      ), vendas as (
        select v.total, v.liquido,
               v.d + case extract(isodow from v.d) when 6 then 2 when 7 then 1 else 0 end as cai
          from (
            select p.total,
                   p.total - p.total * coalesce(t.percentual, 0) / 100 - coalesce(t.fixa, 0) as liquido,
                   ((p.concluido_em at time zone lj.fuso)::date + coalesce(t.dias, 0)) as d
              from public.pedidos p
              join lojas lj on lj.id = p.loja_id
              left join public.fin_taxas t on t.loja_id = p.loja_id and t.forma = p.pagamento
             where p.status = 'concluido' and p.concluido_em >= v_ini - interval '75 days'
               and p.pagamento in ('cartao_credito', 'cartao_debito', 'vale_refeicao', 'pix')
               -- Pix só quando passa pela maquininha (tem taxa); Pix direto cai na conta com o nome do cliente
               and (p.pagamento <> 'pix' or coalesce(t.percentual, 0) > 0 or coalesce(t.fixa, 0) > 0)) v
      ), esp as (
        select to_char(cai, 'YYYY-MM') as mes, round(sum(total) * 100) as bruto, round(sum(liquido) * 100) as esperado, count(*) as n
          from vendas where cai >= v_ini and cai <= coalesce(v_ate, v_ini - 1) group by 1
      ), rec as (
        select to_char(x.data, 'YYYY-MM') as mes, round(sum(x.valor) * 100) as recebido
          from public.fin_extrato x
         where x.loja_id is not distinct from e.loja and x.grupo_id is not distinct from e.grupo
           and x.valor > 0 and x.data >= v_ini and private.e_maquininha(x.descricao)
         group by 1
      )
      select jsonb_agg(jsonb_build_object('mes', m.mes, 'bruto', coalesce(esp.bruto, 0), 'esperado', coalesce(esp.esperado, 0),
                                          'recebido', coalesce(rec.recebido, 0), 'vendas', coalesce(esp.n, 0)) order by m.mes desc)
        from (select to_char(g, 'YYYY-MM') as mes from generate_series(v_ini, now()::date, interval '1 month') g) m
        left join esp on esp.mes = m.mes
        left join rec on rec.mes = m.mes
    ), '[]'::jsonb),
    'adquirentes', coalesce((
      select jsonb_agg(jsonb_build_object('descricao', d.descricao, 'valor', d.valor, 'n', d.n) order by d.valor desc)
        from (select x.descricao, round(sum(x.valor) * 100) as valor, count(*) as n
                from public.fin_extrato x
               where x.loja_id is not distinct from e.loja and x.grupo_id is not distinct from e.grupo
                 and x.valor > 0 and x.data >= v_ini and private.e_maquininha(x.descricao)
               group by x.descricao order by 2 desc limit 15) d
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.conferencia_maquininha(uuid, integer) from public, anon;
grant execute on function public.conferencia_maquininha(uuid, integer) to authenticated;

-- perda de um produto pronto (a pizza que caiu): sai como perda o que a ficha do produto usa
create or replace function public.perda_produto(p_loja uuid, p_produto uuid, p_qtd integer, p_motivo text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nome text;
  f      record;
  n      integer := 0;
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  if p_qtd is null or p_qtd < 1 or p_qtd > 99 then
    raise exception 'Quantidade de 1 a 99.' using errcode = 'check_violation';
  end if;
  if length(btrim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'Informe o motivo da perda.' using errcode = 'check_violation';
  end if;
  select nome into v_nome from public.produtos where id = p_produto and loja_id = p_loja;
  if v_nome is null then
    raise exception 'Produto não encontrado.' using errcode = 'no_data_found';
  end if;
  for f in select ft.insumo_id, ft.quantidade from public.fichas_tecnicas ft
             join public.insumos i on i.id = ft.insumo_id and i.ativo
            where ft.produto_id = p_produto and ft.loja_id = p_loja loop
    perform private.mover_estoque(f.insumo_id, p_loja, 'perda', -(f.quantidade * p_qtd), null, null, null,
                                  left(format('%s × %s — %s', v_nome, p_qtd, btrim(p_motivo)), 200));
    n := n + 1;
  end loop;
  if n = 0 then
    raise exception 'Este produto não tem ficha técnica: registre a perda pelos insumos.' using errcode = 'check_violation';
  end if;
  return n;
end;
$$;
revoke all on function public.perda_produto(uuid, uuid, integer, text) from public, anon;
grant execute on function public.perda_produto(uuid, uuid, integer, text) to authenticated;

create or replace function public.perdas_periodo(p_loja uuid, p_dias integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_est  uuid := private.estoque_da_loja(p_loja);
  v_dias integer := least(greatest(coalesce(p_dias, 30), 7), 180);
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'perdas', coalesce((
      select jsonb_agg(jsonb_build_object('insumo', i.nome, 'unidade', i.unidade, 'quantidade', -m.quantidade,
                                          'valor', round(-m.quantidade * coalesce(m.custo_unit, 0) * 100), 'motivo', m.motivo, 'em', m.criado_em)
                       order by m.criado_em desc)
        from (select * from public.estoque_movimentos
               where estoque = v_est and tipo = 'perda' and criado_em >= now() - make_interval(days => v_dias)
               order by criado_em desc limit 1000) m
        join public.insumos i on i.id = m.insumo_id), '[]'::jsonb),
    'consumo_vendas', coalesce((
      select round(-sum(m.quantidade * coalesce(m.custo_unit, 0)) * 100)
        from public.estoque_movimentos m
       where m.estoque = v_est and m.tipo in ('venda', 'estorno_venda') and m.criado_em >= now() - make_interval(days => v_dias)), 0)
  );
end;
$$;
revoke all on function public.perdas_periodo(uuid, integer) from public, anon;
grant execute on function public.perdas_periodo(uuid, integer) to authenticated;
