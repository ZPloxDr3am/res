-- RES · 0037 · Fechamento do mês e CMV (D-039).
-- CMV real = estoque inicial + compras − estoque final (em R$, a custo médio).
-- CMV teórico = o que as fichas técnicas baixaram nas vendas. A diferença mostra perdas, porção maior e desvios.
-- O estoque em qualquer data sai do último movimento antes dela (saldo e custo médio depois do movimento).
-- Pode rodar de novo sem erro.

alter table public.estoque_movimentos add column if not exists custo_medio_apos numeric(14, 4);

-- movimentos antigos: o último de cada insumo leva o custo médio atual; os demais, o custo da hora
update public.estoque_movimentos m set custo_medio_apos = i.custo_medio
  from public.insumos i
 where m.custo_medio_apos is null and i.id = m.insumo_id
   and m.id = (select max(x.id) from public.estoque_movimentos x where x.insumo_id = m.insumo_id);
update public.estoque_movimentos set custo_medio_apos = custo_unit where custo_medio_apos is null;

create or replace function private.mover_estoque(p_insumo uuid, p_loja uuid, p_tipo text, p_qtd numeric, p_custo numeric,
                                                 p_pedido uuid default null, p_nfe uuid default null, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.insumos;
begin
  select * into v from public.insumos where id = p_insumo for update;
  if p_qtd > 0 and p_custo is not null and p_tipo in ('entrada_nfe', 'entrada') then
    v.custo_medio := case when greatest(v.saldo, 0) + p_qtd <= 0 then p_custo
                          else (greatest(v.saldo, 0) * v.custo_medio + p_qtd * p_custo) / (greatest(v.saldo, 0) + p_qtd) end;
  end if;
  v.saldo := v.saldo + p_qtd;
  update public.insumos set saldo = v.saldo, custo_medio = v.custo_medio, atualizado_em = now() where id = p_insumo;
  insert into public.estoque_movimentos (estoque, loja_id, insumo_id, tipo, quantidade, custo_unit, saldo_apos, custo_medio_apos, pedido_id, nfe_id, motivo, criado_por)
  values (v.estoque, p_loja, p_insumo, p_tipo, p_qtd, coalesce(p_custo, v.custo_medio), v.saldo, v.custo_medio, p_pedido, p_nfe, p_motivo, auth.uid());
end;
$$;
revoke execute on function private.mover_estoque(uuid, uuid, text, numeric, numeric, uuid, uuid, text) from anon, public, authenticated;

-- Saldo e custo médio de cada insumo num instante (o último movimento antes dele).
create or replace function private.estoque_em(p_est uuid, p_t timestamptz)
returns table (insumo_id uuid, saldo numeric, custo numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (m.insumo_id) m.insumo_id, m.saldo_apos, coalesce(m.custo_medio_apos, m.custo_unit, 0)
    from public.estoque_movimentos m
   where m.estoque = p_est and m.criado_em < p_t
   order by m.insumo_id, m.criado_em desc, m.id desc;
$$;
revoke execute on function private.estoque_em(uuid, timestamptz) from anon, public, authenticated;

-- Resumo de um período (tudo em centavos).
create or replace function private.cmv_resumo(p_est uuid, p_lojas uuid[], p_ini timestamptz, p_fim timestamptz)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with ei as (select coalesce(sum(greatest(saldo, 0) * custo), 0) as v from private.estoque_em(p_est, p_ini)),
       ef as (select coalesce(sum(greatest(saldo, 0) * custo), 0) as v from private.estoque_em(p_est, least(p_fim, now()))),
       mv as (
         select coalesce(sum(m.quantidade * m.custo_unit) filter (where m.tipo in ('entrada_nfe', 'entrada')), 0) as compras,
                coalesce(-sum(m.quantidade * m.custo_unit) filter (where m.tipo in ('venda', 'estorno_venda')), 0) as teorico,
                coalesce(-sum(m.quantidade * m.custo_unit) filter (where m.tipo = 'perda'), 0) as perdas,
                coalesce(sum(m.quantidade * m.custo_unit) filter (where m.tipo = 'contagem'), 0) as contagens
           from public.estoque_movimentos m
          where m.estoque = p_est and m.criado_em >= p_ini and m.criado_em < p_fim),
       fat as (
         select coalesce(sum(p.total - p.taxa_entrega), 0) as v, count(*) as n
           from public.pedidos p
          where p.loja_id = any (p_lojas) and p.status = 'concluido' and p.concluido_em >= p_ini and p.concluido_em < p_fim)
  select jsonb_build_object(
           'estoque_inicial', round(ei.v * 100), 'compras', round(mv.compras * 100), 'estoque_final', round(ef.v * 100),
           'cmv_real', round((ei.v + mv.compras - ef.v) * 100), 'cmv_teorico', round(mv.teorico * 100),
           'perdas', round(mv.perdas * 100), 'contagens', round(mv.contagens * 100),
           'faturamento', round(fat.v * 100), 'pedidos', fat.n)
    from ei, ef, mv, fat;
$$;
revoke execute on function private.cmv_resumo(uuid, uuid[], timestamptz, timestamptz) from anon, public, authenticated;

-- Fechamento do mês: resumo, por insumo, contagem de fechamento e os últimos 6 meses.
-- p_mes: qualquer dia do mês (nulo = mês atual). Mês vai do dia 1 às 05:00 ao dia 1 seguinte às 05:00.
create or replace function public.fechamento_estoque(p_loja uuid, p_mes date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_est   uuid := private.estoque_da_loja(p_loja);
  v_fuso  text;
  v_mes   date;
  v_ini   timestamptz;
  v_fim   timestamptz;
  v_ate   timestamptz;
  v_lojas uuid[];
  v_hist  jsonb := '[]'::jsonb;
  k       integer;
  m       date;
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  select fuso_horario into v_fuso from public.lojas where id = p_loja;
  v_mes := date_trunc('month', coalesce(p_mes, ((now() at time zone v_fuso) - interval '5 hours')::date))::date;
  v_ini := (v_mes + time '05:00') at time zone v_fuso;
  v_fim := ((v_mes + interval '1 month')::date + time '05:00') at time zone v_fuso;
  v_ate := least(v_fim, now());
  select coalesce(array_agg(l.id), array[p_loja]) into v_lojas
    from public.lojas l where l.id = p_loja or private.estoque_da_loja(l.id) = v_est;

  for k in reverse 5..0 loop
    m := (v_mes - make_interval(months => k))::date;
    v_hist := v_hist || (jsonb_build_object('mes', to_char(m, 'YYYY-MM'))
                         || private.cmv_resumo(v_est, v_lojas, (m + time '05:00') at time zone v_fuso,
                                               ((m + interval '1 month')::date + time '05:00') at time zone v_fuso));
  end loop;

  return jsonb_build_object(
    'mes', to_char(v_mes, 'YYYY-MM'), 'inicio', v_ini, 'fim', v_fim, 'em_andamento', v_fim > now(),
    'lojas', (select jsonb_agg(l.nome order by l.nome) from public.lojas l where l.id = any (v_lojas)),
    'resumo', private.cmv_resumo(v_est, v_lojas, v_ini, v_fim),
    'historico', v_hist,
    -- contagem de fechamento: do último dia do mês até o dia 2 seguinte
    'contagem_fim', (select max(x.criado_em) from public.estoque_movimentos x
                      where x.estoque = v_est and x.tipo = 'contagem' and x.criado_em >= v_fim - interval '1 day' and x.criado_em < v_fim + interval '1 day'),
    'ultima_contagem', (select max(x.criado_em) from public.estoque_movimentos x where x.estoque = v_est and x.tipo = 'contagem' and x.criado_em < v_ate),
    'por_insumo', coalesce((
      with ei as (select * from private.estoque_em(v_est, v_ini)),
           ef as (select * from private.estoque_em(v_est, v_ate)),
           mv as (
             select x.insumo_id,
                    coalesce(sum(x.quantidade) filter (where x.tipo in ('entrada_nfe', 'entrada')), 0) as q_compras,
                    coalesce(sum(x.quantidade * x.custo_unit) filter (where x.tipo in ('entrada_nfe', 'entrada')), 0) as compras,
                    coalesce(-sum(x.quantidade) filter (where x.tipo in ('venda', 'estorno_venda')), 0) as q_teorico,
                    coalesce(-sum(x.quantidade * x.custo_unit) filter (where x.tipo in ('venda', 'estorno_venda')), 0) as teorico,
                    coalesce(-sum(x.quantidade * x.custo_unit) filter (where x.tipo = 'perda'), 0) as perdas
               from public.estoque_movimentos x
              where x.estoque = v_est and x.criado_em >= v_ini and x.criado_em < v_fim
              group by x.insumo_id),
           t as (
             select i.nome, i.unidade,
                    coalesce(greatest(ei.saldo, 0), 0) as q_ei, coalesce(greatest(ei.saldo, 0) * ei.custo, 0) as v_ei,
                    coalesce(mv.q_compras, 0) as q_compras, coalesce(mv.compras, 0) as compras,
                    coalesce(greatest(ef.saldo, 0), 0) as q_ef, coalesce(greatest(ef.saldo, 0) * ef.custo, 0) as v_ef,
                    coalesce(mv.q_teorico, 0) as q_teorico, coalesce(mv.teorico, 0) as teorico, coalesce(mv.perdas, 0) as perdas
               from public.insumos i
               left join ei on ei.insumo_id = i.id
               left join ef on ef.insumo_id = i.id
               left join mv on mv.insumo_id = i.id
              where i.estoque = v_est)
      select jsonb_agg(jsonb_build_object(
               'insumo', nome, 'unidade', unidade,
               'q_inicial', q_ei, 'inicial', round(v_ei * 100), 'q_compras', q_compras, 'compras', round(compras * 100),
               'q_final', q_ef, 'final', round(v_ef * 100),
               'q_real', round(q_ei + q_compras - q_ef, 3), 'real', round((v_ei + compras - v_ef) * 100),
               'q_teorico', round(q_teorico, 3), 'teorico', round(teorico * 100), 'perdas', round(perdas * 100))
             order by (v_ei + compras - v_ef) desc)
        from (select * from t where v_ei <> 0 or compras <> 0 or v_ef <> 0 or teorico <> 0 or perdas <> 0
               order by (v_ei + compras - v_ef) desc limit 80) t2), '[]'::jsonb));
end;
$$;
grant execute on function public.fechamento_estoque(uuid, date) to authenticated;
revoke execute on function public.fechamento_estoque(uuid, date) from anon, public;
