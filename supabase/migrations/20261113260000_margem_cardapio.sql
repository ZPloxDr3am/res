-- D-108: MARGEM E ENGENHARIA DE CARDÁPIO
-- * CMV alvo da loja (padrão 35%).
-- * Para cada produto: quanto vendeu no período, quanto faturou e quanto custou (ficha do produto + fichas
--   das opções escolhidas, como a baixa do estoque), sempre com o custo médio ATUAL dos insumos: quando a nota
--   traz o queijo mais caro, o CMV dos produtos já aparece maior.
-- * Insumos cujo custo subiu na última entrada (contra a anterior) e os itens do cardápio que usam cada um.
-- Pode rodar de novo.

alter table public.lojas add column if not exists cmv_alvo numeric(5, 2) not null default 35;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lojas_cmv_alvo') then
    alter table public.lojas add constraint lojas_cmv_alvo check (cmv_alvo between 5 and 90);
  end if;
end $$;
select private.liberar_colunas_lojas();

create or replace function public.definir_cmv_alvo(p_loja uuid, p_alvo numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.e_gestor(p_loja) then raise exception 'Só o dono ou o gerente.' using errcode = 'insufficient_privilege'; end if;
  if p_alvo is null or p_alvo < 5 or p_alvo > 90 then raise exception 'O CMV alvo vai de 5%% a 90%%.' using errcode = 'check_violation'; end if;
  update public.lojas set cmv_alvo = round(p_alvo, 2) where id = p_loja;
end;
$$;
revoke all on function public.definir_cmv_alvo(uuid, numeric) from public, anon;
grant execute on function public.definir_cmv_alvo(uuid, numeric) to authenticated;

create or replace function public.margem_cardapio(p_loja uuid, p_dias integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_dias integer := least(greatest(coalesce(p_dias, 30), 7), 180);
  v_est  uuid := private.estoque_da_loja(p_loja);
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Sem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'alvo', (select cmv_alvo from public.lojas where id = p_loja),
    'dias', v_dias,
    'produtos', coalesce((
      with ficha as (   -- custo atual de uma unidade da ficha de cada produto / opção
        select f.produto_id, f.opcao_id, sum(f.quantidade * i.custo_medio) as custo
          from public.fichas_tecnicas f join public.insumos i on i.id = f.insumo_id
         where f.loja_id = p_loja
         group by f.produto_id, f.opcao_id
      ), itens as (
        select it.id, it.produto_id, it.quantidade, it.total,
               fp.custo as custo_produto,
               (select sum(fo.custo * coalesce(o.fracao, o.quantidade))
                  from public.pedido_item_opcoes o join ficha fo on fo.opcao_id = o.opcao_id
                 where o.item_id = it.id) as custo_opcoes
          from public.pedido_itens it
          join public.pedidos p on p.id = it.pedido_id
          left join ficha fp on fp.produto_id = it.produto_id
         where p.loja_id = p_loja and p.status <> 'cancelado' and it.produto_id is not null
           and p.criado_em >= now() - make_interval(days => v_dias)
      ), vendas as (
        select produto_id, sum(quantidade) as vendidos, sum(total) as receita,
               sum((coalesce(custo_produto, 0) + coalesce(custo_opcoes, 0)) * quantidade) as custo,
               count(*) filter (where custo_produto is not null or custo_opcoes is not null) as com_ficha,
               count(*) as linhas
          from itens group by produto_id
      )
      select jsonb_agg(jsonb_build_object(
               'id', pr.id, 'nome', pr.nome, 'categoria', s.nome,
               'preco', round(pr.preco * 100),
               'vendidos', coalesce(v.vendidos, 0),
               'receita', round(coalesce(v.receita, 0) * 100),
               'custo', round(coalesce(v.custo, 0) * 100),
               -- custo confiável: a maioria das vendas teve ficha (do produto ou das opções)
               'custo_conhecido', coalesce(v.com_ficha::numeric / nullif(v.linhas, 0) >= 0.8, false),
               'custo_ficha', round((select fp.custo from ficha fp where fp.produto_id = pr.id) * 100))
             order by coalesce(v.receita, 0) desc, pr.nome)
        from public.produtos pr
        left join public.setores s on s.id = pr.setor_id
        left join vendas v on v.produto_id = pr.id
       where pr.loja_id = p_loja and not pr.combo
         and (v.produto_id is not null or exists (select 1 from ficha fp where fp.produto_id = pr.id))
    ), '[]'::jsonb),
    'insumos_subiram', case when v_est is null then '[]'::jsonb else coalesce((
      with ent as (
        select m.insumo_id, m.custo_unit, m.criado_em,
               row_number() over (partition by m.insumo_id order by m.criado_em desc, m.id desc) as n
          from public.estoque_movimentos m
         where m.estoque = v_est and m.tipo in ('entrada_nfe', 'entrada') and m.custo_unit > 0 and m.quantidade > 0
           and m.criado_em >= now() - interval '120 days'
      ), par as (
        select a.insumo_id, a.custo_unit as agora, b.custo_unit as antes, a.criado_em as em
          from ent a join ent b on b.insumo_id = a.insumo_id and b.n = 2
         where a.n = 1 and a.criado_em >= now() - make_interval(days => v_dias)
           and a.custo_unit >= b.custo_unit * 1.05
      )
      select jsonb_agg(jsonb_build_object(
               'id', i.id, 'nome', i.nome, 'unidade', i.unidade,
               'antes', round(par.antes, 4), 'agora', round(par.agora, 4), 'em', par.em,
               'variacao', round((par.agora / par.antes - 1) * 100, 1),
               'usado_em', coalesce((
                 select jsonb_agg(distinct x.nome) from (
                   select pr.nome from public.fichas_tecnicas f join public.produtos pr on pr.id = f.produto_id
                    where f.loja_id = p_loja and f.insumo_id = i.id
                   union
                   select o.nome from public.fichas_tecnicas f join public.opcoes o on o.id = f.opcao_id
                    where f.loja_id = p_loja and f.insumo_id = i.id
                   limit 12) x), '[]'::jsonb))
             order by (par.agora / par.antes) desc)
        from par join public.insumos i on i.id = par.insumo_id
    ), '[]'::jsonb) end
  );
end;
$$;
revoke all on function public.margem_cardapio(uuid, integer) from public, anon;
grant execute on function public.margem_cardapio(uuid, integer) to authenticated;

-- Bom dia (D-105) ganha "insumos que subiram" nos últimos 7 dias (D-108)
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

  select coalesce(round(sum(p.total) filter (where p.status <> 'cancelado') * 100), 0) as vendas,
         count(*) filter (where p.status <> 'cancelado') as pedidos,
         count(*) filter (where p.status = 'cancelado') as cancelados
    into v_on
    from public.pedidos p
   where p.loja_id = p_loja and p.criado_em >= v_ini - interval '1 day' and p.criado_em < v_ini;
  select coalesce(round(sum(p.total) * 100), 0) as vendas, count(*) as pedidos
    into v_sem
    from public.pedidos p
   where p.loja_id = p_loja and p.criado_em >= v_ini - interval '8 days' and p.criado_em < v_ini - interval '7 days' and p.status <> 'cancelado';

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
       where x.criado_em >= now() - interval '7 days' and x.antes > 0 and x.custo_unit >= x.antes * 1.05) end
  );
end;
$$;
revoke all on function public.resumo_manha(uuid) from public, anon;
grant execute on function public.resumo_manha(uuid) to authenticated;
