-- 0062: Financeiro por loja ou do grupo todo (D-061). Pode rodar de novo.
-- Segue a mesma escolha da Gestão Empresarial (gestao_conta.modo, D-053):
--   "cada loja separada": cada loja tem seu financeiro (e quem gere as lojas vê o grupo somado);
--   "o grupo todo junto": um financeiro só para as lojas da conta (lançamentos, categorias, fornecedores,
--   contas bancárias); cada lançamento pode dizer de qual loja é (loja_ref) ou ficar do grupo.
--   Só o titular da conta mexe no do grupo (como na planilha de custos do grupo).
-- grupo_id = a conta (contas.id) dona do registro; fin_lancamentos.conta_id continua sendo o caixa/banco.
-- As taxas das formas de pagamento continuam por loja (cada loja tem sua maquininha).

-- 1. dono do registro: uma loja OU um grupo
do $$
declare t text;
begin
  foreach t in array array['fin_categorias', 'fin_fornecedores', 'fin_contas', 'fin_lancamentos'] loop
    execute format('alter table public.%I add column if not exists grupo_id uuid references public.contas (id) on delete cascade', t);
    execute format('alter table public.%I alter column loja_id drop not null', t);
    if not exists (select 1 from pg_constraint where conname = t || '_dono') then
      execute format('alter table public.%I add constraint %I check (num_nonnulls(loja_id, grupo_id) = 1)', t, t || '_dono');
    end if;
  end loop;
end $$;
alter table public.fin_lancamentos add column if not exists loja_ref uuid references public.lojas (id) on delete set null;

create unique index if not exists fin_categorias_grupo_nome on public.fin_categorias (grupo_id, tipo, nome) where grupo_id is not null;
create unique index if not exists fin_fornecedores_grupo_doc on public.fin_fornecedores (grupo_id, documento) where grupo_id is not null and documento is not null;
create unique index if not exists fin_lanc_origem_grupo on public.fin_lancamentos (grupo_id, origem, origem_id, competencia) where grupo_id is not null and origem <> 'manual';
create index if not exists fin_lanc_grupo_venc on public.fin_lancamentos (grupo_id, vencimento) where grupo_id is not null;
create index if not exists fin_lanc_grupo_comp on public.fin_lancamentos (grupo_id, competencia) where grupo_id is not null;

-- automático dos custos fixos no modo grupo
alter table public.gestao_conta add column if not exists custos_auto boolean not null default false;
alter table public.gestao_conta add column if not exists dia_custos smallint not null default 10;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'gestao_conta_dia_custos') then
    alter table public.gestao_conta add constraint gestao_conta_dia_custos check (dia_custos between 1 and 31);
  end if;
end $$;

-- 2. quem pode: loja → dono/gerente dela; grupo → titular da conta
create or replace function private.fin_pode(p_loja uuid, p_grupo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_loja is not null then private.e_gestor(p_loja)
              when p_grupo is not null then private.e_titular(p_grupo)
              else false end;
$$;
grant execute on function private.fin_pode(uuid, uuid) to authenticated;

-- financeiro de uma loja: o dela, ou o do grupo quando a conta escolheu "o grupo todo junto"
create or replace function private.fin_escopo(p_loja uuid, out loja uuid, out grupo uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select case when coalesce(g.modo, 'separado') = 'grupo' and l.conta_id is not null then null else l.id end,
         case when coalesce(g.modo, 'separado') = 'grupo' then l.conta_id end
    from public.lojas l left join public.gestao_conta g on g.conta_id = l.conta_id
   where l.id = p_loja;
$$;

create or replace function private.fin_exigir(p_loja uuid, out loja uuid, out grupo uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  select e.loja, e.grupo into loja, grupo from private.fin_escopo(p_loja) e;
  if loja is null and grupo is null then
    raise exception 'Loja não encontrada.' using errcode = 'no_data_found';
  end if;
  if not private.fin_pode(loja, grupo) then
    if grupo is not null then
      raise exception 'O financeiro deste grupo é controlado junto, pelo titular da conta.' using errcode = 'insufficient_privilege';
    end if;
    raise exception 'Só o dono ou o gerente acessam o Financeiro.' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['fin_categorias', 'fin_fornecedores', 'fin_contas', 'fin_lancamentos'] loop
    execute format('drop policy if exists %1$s_gestor on public.%1$I', t);
    execute format('create policy %1$s_gestor on public.%1$I for all to authenticated using (private.fin_pode(loja_id, grupo_id)) with check (private.fin_pode(loja_id, grupo_id))', t);
  end loop;
end $$;

-- o histórico de alterações precisa de loja: lançamentos do grupo não entram nele
drop trigger if exists fin_lancamentos_auditar on public.fin_lancamentos;
create trigger fin_lancamentos_auditar after insert or update on public.fin_lancamentos
  for each row when (new.loja_id is not null) execute function private.auditar();
drop trigger if exists fin_lancamentos_auditar_apagar on public.fin_lancamentos;
create trigger fin_lancamentos_auditar_apagar after delete on public.fin_lancamentos
  for each row when (old.loja_id is not null) execute function private.auditar();

-- categoria, fornecedor e caixa/banco do mesmo dono; loja_ref só no grupo e de uma loja dele
create or replace function private.fin_mesma_loja()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.categoria_id is not null and not exists (select 1 from public.fin_categorias c where c.id = new.categoria_id and c.tipo = new.tipo
       and c.loja_id is not distinct from new.loja_id and c.grupo_id is not distinct from new.grupo_id) then
    raise exception 'Categoria inválida para este lançamento.' using errcode = 'check_violation';
  end if;
  if new.fornecedor_id is not null and not exists (select 1 from public.fin_fornecedores f where f.id = new.fornecedor_id
       and f.loja_id is not distinct from new.loja_id and f.grupo_id is not distinct from new.grupo_id) then
    raise exception 'Fornecedor de outra loja.' using errcode = 'check_violation';
  end if;
  if new.conta_id is not null and not exists (select 1 from public.fin_contas c where c.id = new.conta_id
       and c.loja_id is not distinct from new.loja_id and c.grupo_id is not distinct from new.grupo_id) then
    raise exception 'Conta de outra loja.' using errcode = 'check_violation';
  end if;
  if new.loja_ref is not null and (new.grupo_id is null or not exists (select 1 from public.lojas l where l.id = new.loja_ref and l.conta_id = new.grupo_id)) then
    raise exception 'Loja de fora do grupo.' using errcode = 'check_violation';
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;

-- 3. modelo pronto para o dono do financeiro (loja ou grupo) + taxas da loja
create or replace function private.fin_semear(p_loja uuid, p_grupo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.fin_categorias where loja_id is not distinct from p_loja and grupo_id is not distinct from p_grupo) then
    insert into public.fin_categorias (loja_id, grupo_id, tipo, linha, grupo, nome, ordem)
    select p_loja, p_grupo, x.tipo, x.linha, x.grupo, x.nome, x.ordem from (values
      ('despesa', 'custo_vendas', 'Custo das vendas', 'Insumos / CMV (ingredientes)', 1),
      ('despesa', 'custo_vendas', 'Custo das vendas', 'Bebidas para revenda', 2),
      ('despesa', 'custo_vendas', 'Custo das vendas', 'Embalagens', 3),
      ('despesa', 'custo_vendas', 'Custo das vendas', 'Gás', 4),
      ('despesa', 'impostos', 'Impostos', 'Impostos sobre vendas (Simples Nacional)', 10),
      ('despesa', 'impostos', 'Impostos', 'ICMS / ISS', 11),
      ('despesa', 'impostos', 'Impostos', 'Alvará e taxas', 12),
      ('despesa', 'despesas_operacionais', 'Ocupação', 'Aluguel', 20),
      ('despesa', 'despesas_operacionais', 'Ocupação', 'Condomínio e IPTU', 21),
      ('despesa', 'despesas_operacionais', 'Ocupação', 'Energia elétrica', 22),
      ('despesa', 'despesas_operacionais', 'Ocupação', 'Água e esgoto', 23),
      ('despesa', 'despesas_operacionais', 'Ocupação', 'Internet e telefone', 24),
      ('despesa', 'despesas_operacionais', 'Ocupação', 'Manutenção e limpeza', 25),
      ('despesa', 'despesas_operacionais', 'Ocupação', 'Seguro', 26),
      ('despesa', 'despesas_operacionais', 'Pessoal', 'Salários', 30),
      ('despesa', 'despesas_operacionais', 'Pessoal', 'Encargos (INSS, FGTS, férias, 13º)', 31),
      ('despesa', 'despesas_operacionais', 'Pessoal', 'Vale-transporte e alimentação', 32),
      ('despesa', 'despesas_operacionais', 'Pessoal', 'Motoboys e freelancers', 33),
      ('despesa', 'despesas_operacionais', 'Pessoal', 'Rescisões', 34),
      ('despesa', 'despesas_operacionais', 'Pessoal', 'Pró-labore dos sócios', 35),
      ('despesa', 'despesas_operacionais', 'Vendas', 'Comissão de aplicativos (iFood e outros)', 40),
      ('despesa', 'despesas_operacionais', 'Vendas', 'Marketing e anúncios', 41),
      ('despesa', 'despesas_operacionais', 'Vendas', 'Maquininha (aluguel)', 42),
      ('despesa', 'despesas_operacionais', 'Administrativo', 'Contador', 50),
      ('despesa', 'despesas_operacionais', 'Administrativo', 'Sistemas e aplicativos', 51),
      ('despesa', 'despesas_operacionais', 'Administrativo', 'Material de escritório', 52),
      ('despesa', 'despesas_operacionais', 'Administrativo', 'Outras despesas fixas', 53),
      ('despesa', 'despesas_financeiras', 'Financeiro', 'Tarifas bancárias', 60),
      ('despesa', 'despesas_financeiras', 'Financeiro', 'Juros e multas', 61),
      ('despesa', 'despesas_financeiras', 'Financeiro', 'Parcelas de empréstimos e equipamentos', 62),
      ('despesa', 'outras_despesas', 'Investimentos', 'Equipamentos e móveis', 70),
      ('despesa', 'outras_despesas', 'Investimentos', 'Reformas', 71),
      ('despesa', 'retiradas', 'Sócios', 'Distribuição de lucros', 80),
      ('receita', 'outras_receitas', 'Outras receitas', 'Encomendas e eventos', 1),
      ('receita', 'outras_receitas', 'Outras receitas', 'Venda de equipamentos', 2),
      ('receita', 'outras_receitas', 'Outras receitas', 'Outras receitas', 3),
      ('receita', 'aportes', 'Sócios', 'Aporte dos sócios / empréstimo recebido', 10)
    ) as x (tipo, linha, grupo, nome, ordem);
  end if;
  if not exists (select 1 from public.fin_contas where loja_id is not distinct from p_loja and grupo_id is not distinct from p_grupo) then
    insert into public.fin_contas (loja_id, grupo_id, nome, tipo, ordem)
    values (p_loja, p_grupo, case when p_grupo is null then 'Caixa da loja' else 'Caixa do grupo' end, 'caixa', 1);
  end if;
end;
$$;
revoke execute on function private.fin_semear(uuid, uuid) from anon, public, authenticated;

create or replace function public.preparar_financeiro(p_loja uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare e record;
begin
  select * into e from private.fin_exigir(p_loja);
  perform private.fin_semear(e.loja, e.grupo);
  -- taxas: sempre da loja (só quem gere a loja)
  if private.e_gestor(p_loja) then
    insert into public.fin_taxas (loja_id, forma)
    select p_loja, f from unnest(enum_range(null::public.forma_pagamento)) f
    on conflict do nothing;
  end if;
end;
$$;

-- 4. lançamento novo no financeiro da loja (ou do grupo). No grupo, p_dados.loja_ref diz de qual loja é.
create or replace function public.criar_lancamento(p_loja uuid, p_dados jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  e       record;
  v_modo  text := coalesce(p_dados ->> 'modo', 'unico');
  v_vezes integer := greatest(1, coalesce((p_dados ->> 'vezes')::integer, 1));
  v_total numeric := round((p_dados ->> 'valor')::numeric, 2);
  v_venc  date := (p_dados ->> 'vencimento')::date;
  v_comp  date := coalesce(nullif(p_dados ->> 'competencia', '')::date, v_venc);
  v_serie uuid := case when coalesce(p_dados ->> 'modo', 'unico') = 'unico' then null else gen_random_uuid() end;
  v_ref   uuid := nullif(p_dados ->> 'loja_ref', '')::uuid;
  v_valor numeric;
  v_prim  uuid;
  v_id    uuid;
  k       integer;
begin
  select * into e from private.fin_exigir(p_loja);
  if v_modo not in ('unico', 'parcelado', 'recorrente') then
    raise exception 'Tipo de lançamento inválido.' using errcode = 'check_violation';
  end if;
  if v_modo = 'unico' then v_vezes := 1; end if;
  if v_vezes > 60 then
    raise exception 'Até 60 vezes.' using errcode = 'check_violation';
  end if;
  if v_total is null or v_total <= 0 then
    raise exception 'Informe o valor.' using errcode = 'check_violation';
  end if;
  if v_venc is null then
    raise exception 'Informe o vencimento.' using errcode = 'check_violation';
  end if;
  if e.grupo is null then v_ref := null; end if;
  for k in 1 .. v_vezes loop
    v_valor := case when v_modo = 'parcelado'
                    then case when k < v_vezes then round(v_total / v_vezes, 2) else v_total - round(v_total / v_vezes, 2) * (v_vezes - 1) end
                    else v_total end;
    insert into public.fin_lancamentos (loja_id, grupo_id, loja_ref, tipo, descricao, valor, vencimento, competencia, categoria_id, fornecedor_id, conta_id, forma,
                                        pago_em, serie, parcela, parcelas, recorrente, observacao)
    values (e.loja, e.grupo, v_ref, p_dados ->> 'tipo', btrim(p_dados ->> 'descricao'), v_valor,
            (v_venc + make_interval(months => k - 1))::date,
            case when v_modo = 'recorrente' then (v_comp + make_interval(months => k - 1))::date else v_comp end,
            nullif(p_dados ->> 'categoria', '')::uuid, nullif(p_dados ->> 'fornecedor', '')::uuid, nullif(p_dados ->> 'conta', '')::uuid,
            nullif(btrim(coalesce(p_dados ->> 'forma', '')), ''),
            case when k = 1 and coalesce((p_dados ->> 'pago')::boolean, false) then coalesce(nullif(p_dados ->> 'pago_em', '')::date, current_date) end,
            v_serie, case when v_modo = 'unico' then null else k end, case when v_modo = 'unico' then null else v_vezes end,
            v_modo = 'recorrente', nullif(btrim(coalesce(p_dados ->> 'observacao', '')), ''))
    returning id into v_id;
    if k = 1 then v_prim := v_id; end if;
  end loop;
  return v_prim;
end;
$$;

-- 5. custos fixos → contas do mês: da loja (modo separado) ou do grupo (modo grupo, planilha do grupo)
create or replace function public.gerar_contas_custos(p_loja uuid, p_mes date, p_dia integer default null, p_meses integer default 1)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  e       record;
  v_mes0  date := date_trunc('month', p_mes)::date;
  v_mes   date;
  v_dia   integer;
  v_venc  date;
  v_novos integer := 0;
  n       integer;
  k       integer;
begin
  select * into e from private.fin_exigir(p_loja);
  if coalesce(p_meses, 1) not between 1 and 24 then
    raise exception 'De 1 a 24 meses.' using errcode = 'check_violation';
  end if;
  perform private.fin_semear(e.loja, e.grupo);
  v_dia := greatest(1, least(31, coalesce(p_dia,
             case when e.grupo is null then (select dia_custos from public.fin_config where loja_id = e.loja)
                  else (select dia_custos from public.gestao_conta where conta_id = e.grupo) end, 10)));
  for k in 0 .. coalesce(p_meses, 1) - 1 loop
    v_mes := (v_mes0 + make_interval(months => k))::date;
    v_venc := least(v_mes + (v_dia - 1), (v_mes + interval '1 month' - interval '1 day')::date);
    if e.grupo is null then
      insert into public.fin_lancamentos (loja_id, tipo, descricao, valor, vencimento, competencia, categoria_id, origem, origem_id, recorrente)
      select e.loja, 'despesa', c.nome, c.valor, v_venc, v_mes,
             coalesce((select fc.id from public.fin_categorias fc where fc.loja_id = e.loja and fc.tipo = 'despesa' and lower(fc.nome) = lower(c.nome)),
                      (select fc.id from public.fin_categorias fc where fc.loja_id = e.loja and fc.tipo = 'despesa' and fc.nome = 'Outras despesas fixas')),
             'custo', c.id, true
        from public.custos c
       where c.tipo = 'fixo' and c.valor > 0 and c.loja_id = e.loja
      on conflict (loja_id, origem, origem_id, competencia) where origem <> 'manual' do nothing;
    else
      insert into public.fin_lancamentos (grupo_id, tipo, descricao, valor, vencimento, competencia, categoria_id, origem, origem_id, recorrente)
      select e.grupo, 'despesa', c.nome, c.valor, v_venc, v_mes,
             coalesce((select fc.id from public.fin_categorias fc where fc.grupo_id = e.grupo and fc.tipo = 'despesa' and lower(fc.nome) = lower(c.nome)),
                      (select fc.id from public.fin_categorias fc where fc.grupo_id = e.grupo and fc.tipo = 'despesa' and fc.nome = 'Outras despesas fixas')),
             'custo', c.id, true
        from public.custos c
       where c.tipo = 'fixo' and c.valor > 0 and c.conta_id = e.grupo
      on conflict (grupo_id, origem, origem_id, competencia) where grupo_id is not null and origem <> 'manual' do nothing;
    end if;
    get diagnostics n = row_count;
    v_novos := v_novos + n;
  end loop;
  -- valor novo na planilha: corrige o que ainda não foi pago, deste mês em diante
  update public.fin_lancamentos f
     set valor = c.valor, descricao = c.nome
    from public.custos c
   where f.loja_id is not distinct from e.loja and f.grupo_id is not distinct from e.grupo
     and f.origem = 'custo' and f.origem_id = c.id and f.pago_em is null
     and f.competencia >= date_trunc('month', now() at time zone 'America/Sao_Paulo')::date
     and c.valor > 0 and (f.valor <> c.valor or f.descricao <> c.nome);
  return v_novos;
end;
$$;

create or replace function public.config_custos_financeiro(p_loja uuid, p_auto boolean, p_dia integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare e record;
begin
  select * into e from private.fin_exigir(p_loja);
  if e.grupo is null then
    insert into public.fin_config (loja_id, custos_auto, dia_custos) values (e.loja, coalesce(p_auto, false), greatest(1, least(31, coalesce(p_dia, 10))))
    on conflict (loja_id) do update set custos_auto = excluded.custos_auto, dia_custos = excluded.dia_custos;
  else
    update public.gestao_conta set custos_auto = coalesce(p_auto, false), dia_custos = greatest(1, least(31, coalesce(p_dia, 10))) where conta_id = e.grupo;
  end if;
  if p_auto then
    return public.gerar_contas_custos(p_loja, (now() at time zone 'America/Sao_Paulo')::date, p_dia, 2);
  end if;
  return 0;
end;
$$;

-- 6. NF-e do estoque (são por loja) → conta a pagar no financeiro da loja ou do grupo (com loja_ref)
create or replace function public.nfe_sem_conta(p_loja uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'numero', n.numero, 'emissao', n.emissao, 'emitente', n.emitente_nome,
                                               'cnpj', n.emitente_cnpj, 'valor', n.valor_total) order by n.emissao desc), '[]'::jsonb)
    from public.nfe_entradas n, private.fin_escopo(p_loja) e
   where private.fin_pode(e.loja, e.grupo) and n.loja_id = p_loja and coalesce(n.valor_total, 0) > 0
     and coalesce(n.emissao, n.criado_em) > now() - interval '90 days'
     and not exists (select 1 from public.fin_lancamentos f where f.origem = 'nfe' and f.origem_id = n.id);
$$;

create or replace function public.lancar_nfe(p_loja uuid, p_nfe uuid, p_vencimento date, p_vezes integer default 1, p_pago boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  e       record;
  v_n     public.nfe_entradas;
  v_forn  uuid;
  v_cat   uuid;
  v_id    uuid;
  v_serie uuid := case when coalesce(p_vezes, 1) > 1 then gen_random_uuid() end;
  v_vezes integer := greatest(1, least(12, coalesce(p_vezes, 1)));
  k       integer;
begin
  select * into e from private.fin_exigir(p_loja);
  select * into v_n from public.nfe_entradas where id = p_nfe and loja_id = p_loja;
  if not found or coalesce(v_n.valor_total, 0) <= 0 then
    raise exception 'Nota não encontrada.' using errcode = 'no_data_found';
  end if;
  if exists (select 1 from public.fin_lancamentos where origem = 'nfe' and origem_id = p_nfe) then
    raise exception 'Esta nota já foi lançada.' using errcode = 'unique_violation';
  end if;
  perform private.fin_semear(e.loja, e.grupo);
  if v_n.emitente_cnpj ~ '^[0-9]{14}$' then
    select id into v_forn from public.fin_fornecedores
     where loja_id is not distinct from e.loja and grupo_id is not distinct from e.grupo and documento = v_n.emitente_cnpj;
    if v_forn is null then
      insert into public.fin_fornecedores (loja_id, grupo_id, nome, documento)
      values (e.loja, e.grupo, left(coalesce(nullif(btrim(v_n.emitente_nome), ''), 'Fornecedor ' || v_n.emitente_cnpj), 120), v_n.emitente_cnpj)
      returning id into v_forn;
    end if;
  end if;
  select id into v_cat from public.fin_categorias
   where loja_id is not distinct from e.loja and grupo_id is not distinct from e.grupo and tipo = 'despesa' and nome = 'Insumos / CMV (ingredientes)';
  for k in 1 .. v_vezes loop
    insert into public.fin_lancamentos (loja_id, grupo_id, loja_ref, tipo, descricao, valor, vencimento, competencia, categoria_id, fornecedor_id,
                                        pago_em, serie, parcela, parcelas, origem, origem_id)
    values (e.loja, e.grupo, case when e.grupo is not null then p_loja end, 'despesa',
            left('NF-e ' || coalesce(v_n.numero, '') || ' · ' || coalesce(v_n.emitente_nome, ''), 120),
            case when k < v_vezes then round(v_n.valor_total / v_vezes, 2) else v_n.valor_total - round(v_n.valor_total / v_vezes, 2) * (v_vezes - 1) end,
            (p_vencimento + make_interval(months => k - 1))::date,
            coalesce((v_n.emissao at time zone 'America/Sao_Paulo')::date, current_date), v_cat, v_forn,
            case when p_pago and k = 1 then current_date end,
            v_serie, case when v_vezes > 1 then k end, case when v_vezes > 1 then v_vezes end,
            case when k = 1 then 'nfe' else 'manual' end, case when k = 1 then p_nfe end)
    returning id into v_id;
  end loop;
  return v_id;
end;
$$;

-- 7. DRE: lojas pedidas + lançamentos do grupo. Lançamento do grupo entra quando é de uma das lojas
--    (loja_ref) ou, sem loja, quando o DRE pega todas as lojas do grupo.
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
           coalesce(sum(p.total * coalesce(t.percentual, 0) / 100 + coalesce(t.fixa, 0)), 0) as taxas,
           count(*) as pedidos
      into r
      from public.pedidos p
      left join public.fin_taxas t on t.loja_id = p.loja_id and t.forma = p.pagamento
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

-- 8. vendas recentes para o fluxo de caixa: a loja, ou todas do grupo quando o financeiro é do grupo
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
             round(sum(p.total - p.total * coalesce(t.percentual, 0) / 100 - coalesce(t.fixa, 0)), 2) as liquido,
             coalesce(max(t.dias), 0) as dias
        from public.pedidos p
        left join public.fin_taxas t on t.loja_id = p.loja_id and t.forma = p.pagamento
       where p.loja_id in (select id from lojas) and p.status = 'concluido' and p.concluido_em >= now() - interval '28 days'
       group by p.pagamento) x;
$$;
