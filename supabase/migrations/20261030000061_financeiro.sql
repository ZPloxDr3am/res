-- 0061: Financeiro (D-060). Pode rodar de novo.
-- Contas a pagar e a receber (único, parcelado ou recorrente), categorias ligadas às linhas do DRE,
-- fornecedores, contas (caixa/banco) e taxas por forma de pagamento.
-- O que o RES já sabe entra sozinho: vendas e taxas (pedidos), CMV real (estoque), contas do mês
-- a partir dos custos fixos (Gestão Empresarial) e NF-e importadas como contas a pagar.
-- Só dono e gerente da loja.

-- linhas do DRE a que cada categoria pertence
--   outras_receitas, aportes (fora do DRE), impostos, custo_vendas, despesas_operacionais,
--   despesas_financeiras, outras_despesas, retiradas (abaixo do lucro: distribuição aos sócios)
create table if not exists public.fin_categorias (
  id        uuid primary key default gen_random_uuid(),
  loja_id   uuid not null references public.lojas (id) on delete cascade,
  tipo      text not null check (tipo in ('despesa', 'receita')),
  linha     text not null check (linha in ('outras_receitas', 'aportes', 'impostos', 'custo_vendas', 'despesas_operacionais', 'despesas_financeiras', 'outras_despesas', 'retiradas')),
  grupo     text not null check (length(btrim(grupo)) between 1 and 60),
  nome      text not null check (length(btrim(nome)) between 1 and 60),
  ativo     boolean not null default true,
  ordem     integer not null default 0,
  check ((tipo = 'receita') = (linha in ('outras_receitas', 'aportes'))),
  unique (loja_id, tipo, nome)
);

create table if not exists public.fin_fornecedores (
  id         uuid primary key default gen_random_uuid(),
  loja_id    uuid not null references public.lojas (id) on delete cascade,
  nome       text not null check (length(btrim(nome)) between 1 and 120),
  documento  text check (documento is null or documento ~ '^([0-9]{11}|[0-9]{14})$'),
  telefone   text check (telefone is null or telefone ~ '^[0-9]{10,13}$'),
  observacao text check (observacao is null or length(observacao) <= 200),
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);
create unique index if not exists fin_fornecedores_doc on public.fin_fornecedores (loja_id, documento) where documento is not null;

create table if not exists public.fin_contas (
  id      uuid primary key default gen_random_uuid(),
  loja_id uuid not null references public.lojas (id) on delete cascade,
  nome    text not null check (length(btrim(nome)) between 1 and 60),
  tipo    text not null default 'banco' check (tipo in ('caixa', 'banco', 'carteira')),
  ativo   boolean not null default true,
  ordem   integer not null default 0
);

-- taxa de cada forma de recebimento das vendas: % + valor fixo por venda, e em quantos dias cai
create table if not exists public.fin_taxas (
  loja_id    uuid not null references public.lojas (id) on delete cascade,
  forma      public.forma_pagamento not null,
  percentual numeric(5, 2) not null default 0 check (percentual between 0 and 50),
  fixa       numeric(8, 2) not null default 0 check (fixa between 0 and 100),
  dias       smallint not null default 0 check (dias between 0 and 60),
  primary key (loja_id, forma)
);

create table if not exists public.fin_lancamentos (
  id           uuid primary key default gen_random_uuid(),
  loja_id      uuid not null references public.lojas (id) on delete cascade,
  tipo         text not null check (tipo in ('despesa', 'receita')),
  descricao    text not null check (length(btrim(descricao)) between 1 and 120),
  valor        numeric(14, 2) not null check (valor > 0),
  vencimento   date not null,
  competencia  date not null,
  categoria_id uuid references public.fin_categorias (id) on delete set null,
  fornecedor_id uuid references public.fin_fornecedores (id) on delete set null,
  conta_id     uuid references public.fin_contas (id) on delete set null,
  forma        text check (forma is null or length(forma) <= 40),
  pago_em      date,
  serie        uuid,
  parcela      smallint check (parcela is null or parcela >= 1),
  parcelas     smallint check (parcelas is null or parcelas between 1 and 120),
  recorrente   boolean not null default false,
  origem       text not null default 'manual' check (origem in ('manual', 'custo', 'nfe')),
  origem_id    uuid,
  observacao   text check (observacao is null or length(observacao) <= 300),
  criado_por   uuid default auth.uid(),
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists fin_lanc_venc on public.fin_lancamentos (loja_id, vencimento);
create index if not exists fin_lanc_comp on public.fin_lancamentos (loja_id, competencia);
create index if not exists fin_lanc_serie on public.fin_lancamentos (serie) where serie is not null;
-- uma conta por custo fixo por mês, uma por NF-e
create unique index if not exists fin_lanc_origem on public.fin_lancamentos (loja_id, origem, origem_id, competencia) where origem <> 'manual';

-- categoria, fornecedor e conta precisam ser da mesma loja
create or replace function private.fin_mesma_loja()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.categoria_id is not null and not exists (select 1 from public.fin_categorias where id = new.categoria_id and loja_id = new.loja_id and tipo = new.tipo) then
    raise exception 'Categoria inválida para este lançamento.' using errcode = 'check_violation';
  end if;
  if new.fornecedor_id is not null and not exists (select 1 from public.fin_fornecedores where id = new.fornecedor_id and loja_id = new.loja_id) then
    raise exception 'Fornecedor de outra loja.' using errcode = 'check_violation';
  end if;
  if new.conta_id is not null and not exists (select 1 from public.fin_contas where id = new.conta_id and loja_id = new.loja_id) then
    raise exception 'Conta de outra loja.' using errcode = 'check_violation';
  end if;
  new.atualizado_em := now();
  return new;
end;
$$;
drop trigger if exists fin_lancamentos_loja on public.fin_lancamentos;
create trigger fin_lancamentos_loja before insert or update on public.fin_lancamentos
  for each row execute function private.fin_mesma_loja();

do $$
declare t text;
begin
  foreach t in array array['fin_categorias', 'fin_fornecedores', 'fin_contas', 'fin_taxas', 'fin_lancamentos'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %1$s_gestor on public.%1$I', t);
    execute format('create policy %1$s_gestor on public.%1$I for all to authenticated using (private.e_gestor(loja_id)) with check (private.e_gestor(loja_id))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
drop trigger if exists fin_lancamentos_auditar on public.fin_lancamentos;
create trigger fin_lancamentos_auditar after insert or update or delete on public.fin_lancamentos for each row execute function private.auditar();

-- modelo pronto: categorias (ligadas ao DRE), uma conta "Caixa da loja" e as taxas zeradas
create or replace function public.preparar_financeiro(p_loja uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente acessam o Financeiro.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.fin_categorias where loja_id = p_loja) then
    insert into public.fin_categorias (loja_id, tipo, linha, grupo, nome, ordem)
    select p_loja, x.tipo, x.linha, x.grupo, x.nome, x.ordem from (values
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
  if not exists (select 1 from public.fin_contas where loja_id = p_loja) then
    insert into public.fin_contas (loja_id, nome, tipo, ordem) values (p_loja, 'Caixa da loja', 'caixa', 1);
  end if;
  insert into public.fin_taxas (loja_id, forma)
  select p_loja, f from unnest(enum_range(null::public.forma_pagamento)) f
  on conflict do nothing;
end;
$$;
revoke execute on function public.preparar_financeiro(uuid) from anon, public;
grant execute on function public.preparar_financeiro(uuid) to authenticated;

-- Novo lançamento: único, parcelado (o valor é dividido) ou recorrente (o mesmo valor por N meses).
-- p_dados: tipo, descricao, valor (total), vencimento, competencia, categoria, fornecedor, conta, forma,
--          pago (bool, só no único/1ª parcela), modo ('unico'|'parcelado'|'recorrente'), vezes, observacao
create or replace function public.criar_lancamento(p_loja uuid, p_dados jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_modo  text := coalesce(p_dados ->> 'modo', 'unico');
  v_vezes integer := greatest(1, coalesce((p_dados ->> 'vezes')::integer, 1));
  v_total numeric := round((p_dados ->> 'valor')::numeric, 2);
  v_venc  date := (p_dados ->> 'vencimento')::date;
  v_comp  date := coalesce(nullif(p_dados ->> 'competencia', '')::date, v_venc);
  v_serie uuid := case when v_modo = 'unico' then null else gen_random_uuid() end;
  v_valor numeric;
  v_prim  uuid;
  v_id    uuid;
  k       integer;
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente acessam o Financeiro.' using errcode = 'insufficient_privilege';
  end if;
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
  for k in 1 .. v_vezes loop
    v_valor := case when v_modo = 'parcelado'
                    then case when k < v_vezes then round(v_total / v_vezes, 2) else v_total - round(v_total / v_vezes, 2) * (v_vezes - 1) end
                    else v_total end;
    insert into public.fin_lancamentos (loja_id, tipo, descricao, valor, vencimento, competencia, categoria_id, fornecedor_id, conta_id, forma,
                                        pago_em, serie, parcela, parcelas, recorrente, observacao)
    values (p_loja, p_dados ->> 'tipo', btrim(p_dados ->> 'descricao'), v_valor,
            (v_venc + make_interval(months => k - 1))::date,
            case when v_modo = 'recorrente' then (v_comp + make_interval(months => k - 1))::date
                 when v_modo = 'parcelado' then v_comp  -- compra parcelada: a despesa é do mês da compra
                 else v_comp end,
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
revoke execute on function public.criar_lancamento(uuid, jsonb) from anon, public;
grant execute on function public.criar_lancamento(uuid, jsonb) to authenticated;

-- Preferências do financeiro: custos fixos entram sozinhos todo mês, com o dia de vencimento
create table if not exists public.fin_config (
  loja_id     uuid primary key references public.lojas (id) on delete cascade,
  custos_auto boolean not null default false,
  dia_custos  smallint not null default 10 check (dia_custos between 1 and 31)
);
alter table public.fin_config enable row level security;
drop policy if exists fin_config_gestor on public.fin_config;
create policy fin_config_gestor on public.fin_config for all to authenticated using (private.e_gestor(loja_id)) with check (private.e_gestor(loja_id));
grant select, insert, update on public.fin_config to authenticated;
revoke all on public.fin_config from anon;

-- Traz os custos fixos com valor (da loja ou, no modo grupo, do grupo) como contas a pagar, mês a mês,
-- a partir de p_mes por p_meses meses. Não duplica (uma conta por custo por mês). Se o valor mudou
-- na planilha, atualiza as contas ainda não pagas daqui para frente. Devolve quantas criou.
drop function if exists public.gerar_contas_custos(uuid, date, integer);
create or replace function public.gerar_contas_custos(p_loja uuid, p_mes date, p_dia integer default null, p_meses integer default 1)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mes0  date := date_trunc('month', p_mes)::date;
  v_mes   date;
  v_dia   integer;
  v_venc  date;
  v_conta uuid;
  v_grupo boolean;
  v_novos integer := 0;
  n       integer;
  k       integer;
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente acessam o Financeiro.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(p_meses, 1) not between 1 and 24 then
    raise exception 'De 1 a 24 meses.' using errcode = 'check_violation';
  end if;
  perform public.preparar_financeiro(p_loja);
  v_dia := greatest(1, least(31, coalesce(p_dia, (select dia_custos from public.fin_config where loja_id = p_loja), 10)));
  select l.conta_id, coalesce(g.modo = 'grupo', false) into v_conta, v_grupo
    from public.lojas l left join public.gestao_conta g on g.conta_id = l.conta_id where l.id = p_loja;
  for k in 0 .. coalesce(p_meses, 1) - 1 loop
    v_mes := (v_mes0 + make_interval(months => k))::date;
    v_venc := least(v_mes + (v_dia - 1), (v_mes + interval '1 month' - interval '1 day')::date);
    insert into public.fin_lancamentos (loja_id, tipo, descricao, valor, vencimento, competencia, categoria_id, origem, origem_id, recorrente)
    select p_loja, 'despesa', c.nome, c.valor, v_venc, v_mes,
           coalesce((select fc.id from public.fin_categorias fc where fc.loja_id = p_loja and fc.tipo = 'despesa' and lower(fc.nome) = lower(c.nome)),
                    (select fc.id from public.fin_categorias fc where fc.loja_id = p_loja and fc.tipo = 'despesa' and fc.nome = 'Outras despesas fixas')),
           'custo', c.id, true
      from public.custos c
     where c.tipo = 'fixo' and c.valor > 0
       and (case when v_grupo then c.conta_id = v_conta else c.loja_id = p_loja end)
    on conflict (loja_id, origem, origem_id, competencia) where origem <> 'manual' do nothing;
    get diagnostics n = row_count;
    v_novos := v_novos + n;
  end loop;
  -- valor novo na planilha: corrige o que ainda não foi pago, deste mês em diante
  update public.fin_lancamentos f
     set valor = c.valor, descricao = c.nome
    from public.custos c
   where f.loja_id = p_loja and f.origem = 'custo' and f.origem_id = c.id and f.pago_em is null
     and f.competencia >= date_trunc('month', now() at time zone 'America/Sao_Paulo')::date
     and c.valor > 0 and (f.valor <> c.valor or f.descricao <> c.nome);
  return v_novos;
end;
$$;
revoke execute on function public.gerar_contas_custos(uuid, date, integer, integer) from anon, public;
grant execute on function public.gerar_contas_custos(uuid, date, integer, integer) to authenticated;

-- Liga/desliga o automático e o dia. Ao ligar, já traz este mês e o próximo.
create or replace function public.config_custos_financeiro(p_loja uuid, p_auto boolean, p_dia integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente acessam o Financeiro.' using errcode = 'insufficient_privilege';
  end if;
  insert into public.fin_config (loja_id, custos_auto, dia_custos) values (p_loja, coalesce(p_auto, false), greatest(1, least(31, coalesce(p_dia, 10))))
  on conflict (loja_id) do update set custos_auto = excluded.custos_auto, dia_custos = excluded.dia_custos;
  if p_auto then
    return public.gerar_contas_custos(p_loja, (now() at time zone 'America/Sao_Paulo')::date, p_dia, 2);
  end if;
  return 0;
end;
$$;
revoke execute on function public.config_custos_financeiro(uuid, boolean, integer) from anon, public;
grant execute on function public.config_custos_financeiro(uuid, boolean, integer) to authenticated;

-- NF-e importadas no estoque que ainda não viraram conta a pagar (últimos 90 dias)
create or replace function public.nfe_sem_conta(p_loja uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'numero', n.numero, 'emissao', n.emissao, 'emitente', n.emitente_nome,
                                               'cnpj', n.emitente_cnpj, 'valor', n.valor_total) order by n.emissao desc), '[]'::jsonb)
    from public.nfe_entradas n
   where private.e_gestor(p_loja) and n.loja_id = p_loja and coalesce(n.valor_total, 0) > 0
     and coalesce(n.emissao, n.criado_em) > now() - interval '90 days'
     and not exists (select 1 from public.fin_lancamentos f where f.loja_id = p_loja and f.origem = 'nfe' and f.origem_id = n.id);
$$;
revoke execute on function public.nfe_sem_conta(uuid) from anon, public;
grant execute on function public.nfe_sem_conta(uuid) to authenticated;

-- Lança uma NF-e como conta a pagar (fornecedor criado pelo CNPJ). p_vezes > 1 = boleto parcelado.
create or replace function public.lancar_nfe(p_loja uuid, p_nfe uuid, p_vencimento date, p_vezes integer default 1, p_pago boolean default false)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n     public.nfe_entradas;
  v_forn  uuid;
  v_cat   uuid;
  v_id    uuid;
  v_serie uuid := case when coalesce(p_vezes, 1) > 1 then gen_random_uuid() end;
  v_vezes integer := greatest(1, least(12, coalesce(p_vezes, 1)));
  k       integer;
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente acessam o Financeiro.' using errcode = 'insufficient_privilege';
  end if;
  select * into v_n from public.nfe_entradas where id = p_nfe and loja_id = p_loja;
  if not found or coalesce(v_n.valor_total, 0) <= 0 then
    raise exception 'Nota não encontrada.' using errcode = 'no_data_found';
  end if;
  if exists (select 1 from public.fin_lancamentos where loja_id = p_loja and origem = 'nfe' and origem_id = p_nfe) then
    raise exception 'Esta nota já foi lançada.' using errcode = 'unique_violation';
  end if;
  perform public.preparar_financeiro(p_loja);
  if v_n.emitente_cnpj ~ '^[0-9]{14}$' then
    insert into public.fin_fornecedores (loja_id, nome, documento)
    values (p_loja, left(coalesce(nullif(btrim(v_n.emitente_nome), ''), 'Fornecedor ' || v_n.emitente_cnpj), 120), v_n.emitente_cnpj)
    on conflict (loja_id, documento) where documento is not null do nothing;
    select id into v_forn from public.fin_fornecedores where loja_id = p_loja and documento = v_n.emitente_cnpj;
  end if;
  select id into v_cat from public.fin_categorias where loja_id = p_loja and tipo = 'despesa' and nome = 'Insumos / CMV (ingredientes)';
  for k in 1 .. v_vezes loop
    -- só a 1ª parcela leva origem (a trava de "nota já lançada" usa ela)
    insert into public.fin_lancamentos (loja_id, tipo, descricao, valor, vencimento, competencia, categoria_id, fornecedor_id,
                                        pago_em, serie, parcela, parcelas, origem, origem_id)
    values (p_loja, 'despesa', left('NF-e ' || coalesce(v_n.numero, '') || ' · ' || coalesce(v_n.emitente_nome, ''), 120),
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
revoke execute on function public.lancar_nfe(uuid, uuid, date, integer, boolean) from anon, public;
grant execute on function public.lancar_nfe(uuid, uuid, date, integer, boolean) to authenticated;

-- DRE do ano, mês a mês, para uma ou várias lojas (todas precisam ser do gestor). Valores em reais.
-- Receita de pedidos = pedidos concluídos no mês (total, com taxa de entrega).
-- Taxas = % + fixa de cada forma de pagamento configurada.
-- Custo das vendas = CMV real do estoque quando o estoque teve movimento no mês; senão, as contas
-- lançadas em "Custo das vendas" (competência). Assim não conta duas vezes.
create or replace function public.dre_financeiro(p_lojas uuid[], p_ano integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_fuso  text;
  v_res   jsonb := '[]'::jsonb;
  m       integer;
  v_ini   timestamptz;
  v_fim   timestamptz;
  v_dini  date;
  v_est   uuid;
  v_cmv   numeric;
  v_mov   boolean;
  r       record;
  l       record;
begin
  if p_lojas is null or cardinality(p_lojas) = 0 or exists (select 1 from unnest(p_lojas) x where not private.e_gestor(x)) then
    raise exception 'Só o dono ou o gerente acessam o Financeiro.' using errcode = 'insufficient_privilege';
  end if;
  select fuso_horario into v_fuso from public.lojas where id = p_lojas[1];
  v_fuso := coalesce(v_fuso, 'America/Sao_Paulo');
  for m in 1 .. 12 loop
    v_dini := make_date(p_ano, m, 1);
    v_ini := v_dini::timestamp at time zone v_fuso;
    v_fim := (v_dini + interval '1 month')::timestamp at time zone v_fuso;
    select coalesce(sum(p.total), 0) as vendas,
           coalesce(sum(p.total * coalesce(t.percentual, 0) / 100 + coalesce(t.fixa, 0)), 0) as taxas,
           count(*) as pedidos
      into r
      from public.pedidos p
      left join public.fin_taxas t on t.loja_id = p.loja_id and t.forma = p.pagamento
     where p.loja_id = any (p_lojas) and p.status = 'concluido' and p.concluido_em >= v_ini and p.concluido_em < v_fim;
    -- CMV real por estoque (lojas que dividem estoque contam uma vez)
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
                 where f.loja_id = any (p_lojas) and f.competencia >= v_dini and f.competencia < (v_dini + interval '1 month')::date
                 group by c.linha) x), '{}'::jsonb),
      'sem_categoria', coalesce((
        select jsonb_object_agg(x.tipo, x.v)
          from (select f.tipo, round(sum(f.valor), 2) as v
                  from public.fin_lancamentos f
                 where f.loja_id = any (p_lojas) and f.categoria_id is null
                   and f.competencia >= v_dini and f.competencia < (v_dini + interval '1 month')::date
                 group by f.tipo) x), '{}'::jsonb)
    );
  end loop;
  return jsonb_build_object('ano', p_ano, 'meses', v_res);
end;
$$;
revoke execute on function public.dre_financeiro(uuid[], integer) from anon, public;
grant execute on function public.dre_financeiro(uuid[], integer) to authenticated;

-- Vendas dos últimos 28 dias por forma (para a previsão do fluxo de caixa), líquidas de taxa e com o prazo de cada forma.
create or replace function public.vendas_recentes_financeiro(p_loja uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('forma', x.forma, 'bruto', x.bruto, 'liquido', x.liquido, 'dias', x.dias)), '[]'::jsonb)
    from (
      select p.pagamento as forma, round(sum(p.total), 2) as bruto,
             round(sum(p.total - p.total * coalesce(t.percentual, 0) / 100 - coalesce(t.fixa, 0)), 2) as liquido,
             coalesce(max(t.dias), 0) as dias
        from public.pedidos p
        left join public.fin_taxas t on t.loja_id = p.loja_id and t.forma = p.pagamento
       where private.e_gestor(p_loja) and p.loja_id = p_loja and p.status = 'concluido' and p.concluido_em >= now() - interval '28 days'
       group by p.pagamento) x;
$$;
revoke execute on function public.vendas_recentes_financeiro(uuid) from anon, public;
grant execute on function public.vendas_recentes_financeiro(uuid) to authenticated;
