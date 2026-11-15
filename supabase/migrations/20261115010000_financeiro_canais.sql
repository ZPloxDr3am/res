-- D-118 · Integrações, etapa 7: financeiro por canal (comissão, repasse e conferência dos apps de delivery)
-- 1. canal_taxas: por loja e app — comissão (% dos itens, com ou sem a entrega), taxa do pagamento online,
--    valor fixo por pedido, ciclo de repasse e prazo. Sem cadastro, o pedido do app segue com as taxas da
--    forma de pagamento (como antes): nada muda para quem não preencher.
-- 2. DRE e fluxo de caixa usam a taxa do app quando ela existe (private.fin_taxa_venda).
-- 3. repasses_canais: por app e mês — vendas, recebido no app, subsídio do app nos cupons, comissão, repasse
--    esperado e o que caiu no extrato (crédito com o nome do app). Q-16: conferência por repasse, sem lançar
--    venda de novo (a venda já está no DRE).
-- Pode rodar de novo.

create table if not exists public.canal_taxas (
  loja_id          uuid not null references public.lojas (id) on delete cascade,
  canal            text not null references public.canais (chave),
  comissao_pct     numeric(5, 2) not null default 0 check (comissao_pct between 0 and 50),
  comissao_entrega boolean not null default false,
  pagamento_pct    numeric(5, 2) not null default 0 check (pagamento_pct between 0 and 10),
  fixa             numeric(8, 2) not null default 0 check (fixa between 0 and 100),
  ciclo            text not null default 'semanal' check (ciclo in ('semanal', 'quinzenal', 'mensal')),
  dias_repasse     smallint not null default 7 check (dias_repasse between 0 and 60),
  atualizado_em    timestamptz not null default now(),
  primary key (loja_id, canal)
);
alter table public.canal_taxas enable row level security;
drop policy if exists canal_taxas_gestor on public.canal_taxas;
create policy canal_taxas_gestor on public.canal_taxas for all to authenticated using (private.e_gestor(loja_id)) with check (private.e_gestor(loja_id));
grant select, insert, update, delete on public.canal_taxas to authenticated;
revoke all on public.canal_taxas from anon;

-- taxa de uma venda: app (comissão + pagamento online + fixa; venda paga na entrega soma a maquininha) ou a da forma
create or replace function private.fin_taxa_venda(p_loja uuid, p_canal text, p_pagamento public.forma_pagamento,
                                                  p_subtotal numeric, p_taxa_entrega numeric, p_total numeric)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select round((coalesce(p_subtotal, 0) + case when ct.comissao_entrega then coalesce(p_taxa_entrega, 0) else 0 end) * ct.comissao_pct / 100
                  + case when p_pagamento = 'online' then coalesce(p_total, 0) * ct.pagamento_pct / 100
                         else coalesce((select coalesce(p_total, 0) * t.percentual / 100 + t.fixa from public.fin_taxas t where t.loja_id = p_loja and t.forma = p_pagamento), 0) end
                  + ct.fixa, 2)
       from public.canal_taxas ct where p_canal is not null and ct.loja_id = p_loja and ct.canal = p_canal),
    (select coalesce(p_total, 0) * t.percentual / 100 + t.fixa from public.fin_taxas t where t.loja_id = p_loja and t.forma = p_pagamento),
    0);
$$;
revoke all on function private.fin_taxa_venda(uuid, text, public.forma_pagamento, numeric, numeric, numeric) from public, anon, authenticated;

-- crédito no extrato que veio do app (pelo nome)
create or replace function private.e_credito_canal(p_canal text, p_descricao text)
returns boolean language sql immutable set search_path = '' as $$
  select case p_canal
    when 'ifood' then p_descricao ~* 'i ?food'
    when '99food' then p_descricao ~* '(99 ?food|99 ?tecnologia|99 ?pay)'
    when 'keeta' then p_descricao ~* '(keeta|meituan)'
    when 'aiqfome' then p_descricao ~* '(aiq ?fome|magalu|magazine luiza)'
    when 'deliverymuch' then p_descricao ~* 'delivery ?much'
    when 'rappi' then p_descricao ~* 'rappi'
    else false end;
$$;

-- DRE (recriada a partir de 20261101000062_financeiro_grupo.sql): taxa do app quando cadastrada
create or replace function public.dre_financeiro(p_lojas uuid[], p_ano integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_fuso   text;
  v_res    jsonb := '[]'::jsonb;
  v_grupos uuid[];
  v_todos  uuid[];
  m        integer;
  v_ini    timestamptz;
  v_fim    timestamptz;
  v_dini   date;
  v_dfim   date;
  v_cmv    numeric;
  v_mov    boolean;
  r        record;
  l        record;
begin
  if p_lojas is null or cardinality(p_lojas) = 0 then
    raise exception 'Só o dono ou o gerente acessam o Financeiro.' using errcode = 'insufficient_privilege';
  end if;
  -- cada loja: precisa poder ver o financeiro dela (o da loja, ou o do grupo)
  if exists (select 1 from unnest(p_lojas) x, private.fin_escopo(x) e where not private.fin_pode(e.loja, e.grupo)) then
    raise exception 'Só o dono ou o gerente acessam o Financeiro.' using errcode = 'insufficient_privilege';
  end if;
  -- grupos cujas lojas estão todas no pedido (aí os lançamentos "do grupo" sem loja entram)
  select array_agg(distinct l2.conta_id) into v_grupos from public.lojas l2 where l2.id = any (p_lojas) and l2.conta_id is not null;
  select array_agg(g) into v_todos from unnest(coalesce(v_grupos, '{}')) g
   where not exists (select 1 from public.lojas l3 where l3.conta_id = g and not (l3.id = any (p_lojas)));
  select fuso_horario into v_fuso from public.lojas where id = p_lojas[1];
  v_fuso := coalesce(v_fuso, 'America/Sao_Paulo');
  for m in 1 .. 12 loop
    v_dini := make_date(p_ano, m, 1);
    v_dfim := (v_dini + interval '1 month')::date;
    v_ini := v_dini::timestamp at time zone v_fuso;
    v_fim := v_dfim::timestamp at time zone v_fuso;
    select coalesce(sum(p.total), 0) as vendas,
           coalesce(sum(private.fin_taxa_venda(p.loja_id, p.externo_canal, p.pagamento, p.subtotal, p.taxa_entrega, p.total)), 0) as taxas,
           count(*) as pedidos
      into r
      from public.pedidos p
     where p.loja_id = any (p_lojas) and p.status = 'concluido' and p.concluido_em >= v_ini and p.concluido_em < v_fim;
    v_cmv := 0;
    v_mov := false;
    if v_ini < now() then
      for l in select private.estoque_da_loja(x) as est, array_agg(x) as lojas from unnest(p_lojas) x group by 1 loop
        if exists (select 1 from public.estoque_movimentos em where em.estoque = l.est and em.criado_em >= v_ini and em.criado_em < v_fim) then
          v_mov := true;
          v_cmv := v_cmv + ((private.cmv_resumo(l.est, l.lojas, v_ini, v_fim) ->> 'cmv_real')::numeric / 100);
        end if;
      end loop;
    end if;
    v_res := v_res || jsonb_build_object(
      'mes', m,
      'vendas', round(r.vendas, 2),
      'pedidos', r.pedidos,
      'taxas', round(r.taxas, 2),
      'cmv_estoque', case when v_mov then round(v_cmv, 2) end,
      'linhas', coalesce((
        select jsonb_object_agg(x.linha, x.v)
          from (select c.linha, round(sum(f.valor), 2) as v
                  from public.fin_lancamentos f join public.fin_categorias c on c.id = f.categoria_id
                 where (f.loja_id = any (p_lojas) or f.loja_ref = any (p_lojas) or (f.grupo_id = any (coalesce(v_todos, '{}')) and f.loja_ref is null))
                   and f.competencia >= v_dini and f.competencia < v_dfim
                 group by c.linha) x), '{}'::jsonb),
      'sem_categoria', coalesce((
        select jsonb_object_agg(x.tipo, x.v)
          from (select f.tipo, round(sum(f.valor), 2) as v
                  from public.fin_lancamentos f
                 where (f.loja_id = any (p_lojas) or f.loja_ref = any (p_lojas) or (f.grupo_id = any (coalesce(v_todos, '{}')) and f.loja_ref is null))
                   and f.categoria_id is null
                   and f.competencia >= v_dini and f.competencia < v_dfim
                 group by f.tipo) x), '{}'::jsonb)
    );
  end loop;
  return jsonb_build_object('ano', p_ano, 'meses', v_res);
end;
$$;


-- vendas dos últimos 28 dias para o fluxo de caixa (recriada a partir de 20261101000062): líquido com a taxa do app
create or replace function public.vendas_recentes_financeiro(p_loja uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with e as (select * from private.fin_escopo(p_loja)),
       lojas as (
         select l.id from public.lojas l, e
          where private.fin_pode(e.loja, e.grupo)
            and (l.id = e.loja or (e.grupo is not null and l.conta_id = e.grupo)))
  select coalesce(jsonb_agg(jsonb_build_object('forma', x.forma, 'bruto', x.bruto, 'liquido', x.liquido, 'dias', x.dias)), '[]'::jsonb)
    from (
      select p.pagamento as forma, round(sum(p.total), 2) as bruto,
             round(sum(p.total - private.fin_taxa_venda(p.loja_id, p.externo_canal, p.pagamento, p.subtotal, p.taxa_entrega, p.total)), 2) as liquido,
             coalesce(max(t.dias), 0) as dias
        from public.pedidos p
        left join public.fin_taxas t on t.loja_id = p.loja_id and t.forma = p.pagamento
       where p.loja_id in (select id from lojas) and p.status = 'concluido' and p.concluido_em >= now() - interval '28 days'
       group by p.pagamento) x;
$$;


-- repasses dos apps por mês (até p_meses), com o que caiu no extrato importado
create or replace function public.repasses_canais(p_loja uuid, p_meses integer default 3)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  e       record;
  v_meses integer := least(greatest(coalesce(p_meses, 3), 1), 12);
  v_ini   date := (date_trunc('month', now()) - make_interval(months => v_meses - 1))::date;
begin
  select * into e from private.fin_exigir(p_loja);
  return jsonb_build_object(
    'ate', (select max(x.data) from public.fin_extrato x where x.loja_id is not distinct from e.loja and x.grupo_id is not distinct from e.grupo),
    'canais', coalesce((
      with lojas as (
        select l.id, coalesce(l.fuso_horario, 'America/Sao_Paulo') as fuso from public.lojas l
         where l.id = e.loja or (e.grupo is not null and l.conta_id = e.grupo)
      ), ped as (
        select p.externo_canal as canal, to_char((p.concluido_em at time zone lj.fuso)::date, 'YYYY-MM') as mes, p.total, p.pagamento,
               coalesce((select sum(coalesce((b ->> 'marketplace')::numeric, 0)) from jsonb_array_elements(case when jsonb_typeof(p.beneficios) = 'array' then p.beneficios else '[]'::jsonb end) b), 0) as subsidio,
               case when ct.loja_id is null then null
                    else round((p.subtotal + case when ct.comissao_entrega then p.taxa_entrega else 0 end) * ct.comissao_pct / 100, 2) end as comissao,
               case when ct.loja_id is null then null
                    else round(case when p.pagamento = 'online' then p.total * ct.pagamento_pct / 100 else 0 end + ct.fixa, 2) end as taxa
          from public.pedidos p
          join lojas lj on lj.id = p.loja_id
          left join public.canal_taxas ct on ct.loja_id = p.loja_id and ct.canal = p.externo_canal
         where p.externo_canal is not null and p.status = 'concluido' and p.concluido_em >= v_ini - interval '1 day'
      ), meses as (
        select canal, mes, count(*) as pedidos, sum(total) as vendas,
               sum(case when pagamento = 'online' then total else 0 end) as online, sum(subsidio) as subsidio,
               sum(comissao) as comissao, sum(taxa) as taxa, bool_and(comissao is not null) as configurado
          from ped where mes >= to_char(v_ini, 'YYYY-MM') group by canal, mes
      ), credito as (
        select c.chave as canal, to_char(x.data, 'YYYY-MM') as mes, sum(x.valor) as recebido
          from public.fin_extrato x cross join public.canais c
         where x.loja_id is not distinct from e.loja and x.grupo_id is not distinct from e.grupo
           and x.valor > 0 and x.data >= v_ini and private.e_credito_canal(c.chave, x.descricao)
         group by 1, 2
      ), chaves as (
        select distinct canal from meses
        union select distinct canal from credito
        union select ct.canal from public.canal_taxas ct join lojas lj on lj.id = ct.loja_id
      )
      select jsonb_agg(jsonb_build_object(
               'canal', k.canal, 'nome', c.nome,
               'taxas', (select to_jsonb(ct) - 'loja_id' - 'atualizado_em' from public.canal_taxas ct where ct.loja_id = p_loja and ct.canal = k.canal),
               'meses', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'mes', g.mes,
                          'pedidos', coalesce(m.pedidos, 0),
                          'vendas', round(coalesce(m.vendas, 0) * 100),
                          'online', round(coalesce(m.online, 0) * 100),
                          'subsidio', round(coalesce(m.subsidio, 0) * 100),
                          'comissao', case when m.configurado then round(m.comissao * 100) end,
                          'taxa', case when m.configurado then round(m.taxa * 100) end,
                          'repasse', case when m.configurado then round((m.online + m.subsidio - m.comissao - m.taxa) * 100) end,
                          'recebido', round(coalesce(cr.recebido, 0) * 100)) order by g.mes desc)
                   from (select to_char(s, 'YYYY-MM') as mes from generate_series(v_ini, now()::date, interval '1 month') s) g
                   left join meses m on m.canal = k.canal and m.mes = g.mes
                   left join credito cr on cr.canal = k.canal and cr.mes = g.mes), '[]'::jsonb))
             order by c.ordem)
        from chaves k join public.canais c on c.chave = k.canal
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.repasses_canais(uuid, integer) from public, anon;
grant execute on function public.repasses_canais(uuid, integer) to authenticated;
