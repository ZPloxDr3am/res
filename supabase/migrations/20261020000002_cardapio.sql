-- RES · 0002 · Cardápio: setores, produtos, marcas por canal, grupos de opções, opções,
-- complementos e tabelas de preço. Regras do estudo: R-001, R-002, R-007, R-008, R-010,
-- R-011, R-012, R-013, R-014, R-015, R-016 (com as correções de docs/decisoes.md).

create type public.formacao_preco as enum ('soma', 'brinde', 'maior', 'proporcional');
create type public.unidade_medida as enum ('UN', 'KG', 'G', 'L', 'ML', 'PCT', 'CX', 'DZ', 'FD', 'BD', 'SC', 'PT', 'CP', 'PC', 'FT', 'PQ', 'GF', 'LT', 'BN');
create type public.etiqueta_produto as enum ('novo', 'recomendado', 'mais_vendido', 'edicao_limitada', 'esgotado');
create type public.comportamento_tabela as enum ('alterar_preco', 'ocultar', 'rodizio');

-- ---------------------------------------------------------------------------
-- Setores (categorias)
-- ---------------------------------------------------------------------------

create table public.setores (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references public.lojas (id) on delete cascade,
  nome          text not null check (length(btrim(nome)) between 1 and 150),
  nome_publico  text check (nome_publico is null or length(nome_publico) <= 150),
  delivery      boolean not null default true,   -- R-002
  presencial    boolean not null default true,   -- R-002
  imagem_url    text,
  ordem         integer not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, loja_id)
);
create index setores_loja_idx on public.setores (loja_id, ordem);

create table public.setor_marcas (
  loja_id  uuid not null,
  setor_id uuid not null,
  marca_id uuid not null,
  ativo    boolean not null default true,
  ordem    integer not null default 0,
  primary key (setor_id, marca_id),
  foreign key (setor_id, loja_id) references public.setores (id, loja_id) on delete cascade,
  foreign key (marca_id, loja_id) references public.marcas (id, loja_id) on delete cascade
);

-- R-001: setor precisa estar em pelo menos uma marca (verificado no fim da transação).
create or replace function private.setor_exige_marca()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_setor uuid;
begin
  if tg_table_name = 'setores' then
    v_setor := new.id;
  else
    v_setor := old.setor_id;
  end if;
  if exists (select 1 from public.setores s where s.id = v_setor)
     and not exists (select 1 from public.setor_marcas sm where sm.setor_id = v_setor) then
    raise exception 'O setor precisa estar em pelo menos uma marca' using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger setores_exige_marca after insert on public.setores
  deferrable initially deferred for each row execute function private.setor_exige_marca();
create constraint trigger setor_marcas_exige_marca after delete or update on public.setor_marcas
  deferrable initially deferred for each row execute function private.setor_exige_marca();

-- ---------------------------------------------------------------------------
-- Produtos
-- ---------------------------------------------------------------------------

create table public.produtos (
  id                       uuid primary key default gen_random_uuid(),
  loja_id                  uuid not null references public.lojas (id) on delete cascade,
  setor_id                 uuid,
  nome                     text not null check (length(btrim(nome)) between 1 and 150),  -- R-007: único campo obrigatório
  descricao                text check (descricao is null or length(descricao) <= 1000),
  observacoes_internas     text,
  codigo                   text,
  codigo_barras            text,
  etiqueta                 public.etiqueta_produto,
  unidade                  public.unidade_medida not null default 'UN',
  preco                    numeric(12, 2) check (preco is null or preco >= 0),         -- R-007: opcional
  custo_base               numeric(12, 2) check (custo_base is null or custo_base >= 0),
  destaque                 boolean not null default false,
  destaque_impressao       boolean not null default false,
  cobra_taxa_servico       boolean not null default true,
  so_agendamento           boolean not null default false,
  balanca                  boolean not null default false,
  validade_dias            integer check (validade_dias is null or validade_dias >= 0),
  nome_producao            text,
  controla_estoque         boolean not null default false,
  aceita_estoque_negativo  boolean not null default true,
  estoque_minimo           numeric(12, 3),
  restricoes               text[] not null default '{}'
    check (restricoes <@ array['vegetariano', 'vegano', 'organico', 'sem_gluten', 'sem_acucar', 'zero_lactose', 'natural', 'gelado']),
  serve_pessoas            integer check (serve_pessoas is null or serve_pessoas between 1 and 50),
  imagem_url               text,
  ordem                    integer not null default 0,
  criado_em                timestamptz not null default now(),
  atualizado_em            timestamptz not null default now(),
  unique (id, loja_id),
  -- R-016: excluir o setor deixa o produto sem setor (sem perder o loja_id).
  foreign key (setor_id, loja_id) references public.setores (id, loja_id) on delete set null (setor_id)
);
create index produtos_loja_setor_idx on public.produtos (loja_id, setor_id, ordem);

create table public.produto_marcas (
  loja_id            uuid not null,
  produto_id         uuid not null,
  marca_id           uuid not null,
  ativo              boolean not null default true,
  delivery           boolean not null default true,
  presencial         boolean not null default true,
  totem              boolean not null default true,
  preco_delivery     numeric(12, 2) check (preco_delivery is null or preco_delivery >= 0),
  preco_presencial   numeric(12, 2) check (preco_presencial is null or preco_presencial >= 0),
  preco_promocional  numeric(12, 2) check (preco_promocional is null or preco_promocional >= 0),
  gera_cashback      boolean not null default true,
  ordem              integer not null default 0,
  primary key (produto_id, marca_id),
  foreign key (produto_id, loja_id) references public.produtos (id, loja_id) on delete cascade,
  foreign key (marca_id, loja_id) references public.marcas (id, loja_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Complementos, grupos de opções e opções
-- ---------------------------------------------------------------------------

create table public.complementos (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references public.lojas (id) on delete cascade,
  nome          text not null check (length(btrim(nome)) between 1 and 150),
  descricao     text,
  preco         numeric(12, 2) not null default 0 check (preco >= 0),
  custo_base    numeric(12, 2) check (custo_base is null or custo_base >= 0),
  codigo        text,
  unidade       public.unidade_medida not null default 'UN',
  destaque_impressao boolean not null default false,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, loja_id)
);
create index complementos_loja_idx on public.complementos (loja_id);

create table public.grupos_opcoes (
  id              uuid primary key default gen_random_uuid(),
  loja_id         uuid not null references public.lojas (id) on delete cascade,
  nome            text not null check (length(btrim(nome)) between 1 and 100),
  ativo           boolean not null default true,
  delivery        boolean not null default true,
  presencial      boolean not null default true,
  obrigatorio     boolean not null default false,
  pizza           boolean not null default false,                 -- R-014: independente da formação
  formacao        public.formacao_preco not null default 'soma',  -- R-013
  min_qtd         integer not null default 0 check (min_qtd >= 0),
  max_qtd         integer not null default 1 check (max_qtd >= 1),
  permite_repetir boolean not null default false,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  unique (id, loja_id),
  constraint grupo_max_ge_min check (max_qtd >= min_qtd),                       -- R-012
  constraint grupo_obrigatorio_min check (not obrigatorio or min_qtd >= 1)      -- R-011 (D-003: sem correção silenciosa)
);
create index grupos_opcoes_loja_idx on public.grupos_opcoes (loja_id);

create table public.opcoes (
  id               uuid primary key default gen_random_uuid(),
  loja_id          uuid not null,
  grupo_id         uuid not null,
  complemento_id   uuid,
  produto_id       uuid,
  nome             text check (nome is null or length(nome) <= 150),     -- opcional: opção "livre"
  preco            numeric(12, 2) check (preco is null or preco >= 0),  -- sobrepõe o preço do item neste grupo
  preco_delivery   numeric(12, 2) check (preco_delivery is null or preco_delivery >= 0),
  preco_presencial numeric(12, 2) check (preco_presencial is null or preco_presencial >= 0),
  min_qtd          integer not null default 0 check (min_qtd >= 0),
  max_qtd          integer not null default 1 check (max_qtd >= 1),
  ativo            boolean not null default true,
  delivery         boolean not null default true,
  presencial       boolean not null default true,
  ordem            integer not null default 0,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  foreign key (grupo_id, loja_id) references public.grupos_opcoes (id, loja_id) on delete cascade,
  foreign key (complemento_id, loja_id) references public.complementos (id, loja_id) on delete cascade,
  foreign key (produto_id, loja_id) references public.produtos (id, loja_id) on delete cascade,
  constraint opcao_alvo check (num_nonnulls(complemento_id, produto_id) <= 1 and (num_nonnulls(complemento_id, produto_id) = 1 or nome is not null)),
  constraint opcao_max_ge_min check (max_qtd >= min_qtd)
);
create index opcoes_grupo_idx on public.opcoes (grupo_id, ordem);

create table public.produto_grupos (
  loja_id    uuid not null,
  produto_id uuid not null,
  grupo_id   uuid not null,
  ordem      integer not null default 0,
  primary key (produto_id, grupo_id),
  foreign key (produto_id, loja_id) references public.produtos (id, loja_id) on delete cascade,
  foreign key (grupo_id, loja_id) references public.grupos_opcoes (id, loja_id) on delete cascade
);
create index produto_grupos_grupo_idx on public.produto_grupos (grupo_id);

-- ---------------------------------------------------------------------------
-- Tabelas de preço: preço programado, ocultar item, rodízio (E-008)
-- ---------------------------------------------------------------------------

create table public.tabelas_preco (
  id                     uuid primary key default gen_random_uuid(),
  loja_id                uuid not null references public.lojas (id) on delete cascade,
  nome                   text not null check (length(btrim(nome)) between 1 and 100),
  comportamento          public.comportamento_tabela not null,
  produto_gatilho_id     uuid,
  ativo                  boolean not null default true,
  canal_delivery         boolean not null default true,
  canal_presencial       boolean not null default true,
  canal_cardapio_digital boolean not null default true,
  criado_em              timestamptz not null default now(),
  atualizado_em          timestamptz not null default now(),
  unique (id, loja_id),
  foreign key (produto_gatilho_id, loja_id) references public.produtos (id, loja_id) on delete restrict,
  constraint rodizio_regras check (
    comportamento <> 'rodizio'
    or (produto_gatilho_id is not null and not canal_delivery and canal_presencial)
  )
);

create table public.tabela_preco_horarios (
  loja_id    uuid not null,
  tabela_id  uuid not null,
  dia_semana smallint not null check (dia_semana between 0 and 6),  -- 0 = domingo
  inicio     time not null,
  fim        time not null,
  primary key (tabela_id, dia_semana, inicio),
  foreign key (tabela_id, loja_id) references public.tabelas_preco (id, loja_id) on delete cascade,
  check (fim <> inicio)
);

create table public.tabela_preco_marcas (
  loja_id   uuid not null,
  tabela_id uuid not null,
  marca_id  uuid not null,
  primary key (tabela_id, marca_id),
  foreign key (tabela_id, loja_id) references public.tabelas_preco (id, loja_id) on delete cascade,
  foreign key (marca_id, loja_id) references public.marcas (id, loja_id) on delete cascade
);

create table public.tabela_preco_itens (
  loja_id    uuid not null,
  tabela_id  uuid not null,
  produto_id uuid not null,
  preco      numeric(12, 2) check (preco is null or preco >= 0),
  primary key (tabela_id, produto_id),
  foreign key (tabela_id, loja_id) references public.tabelas_preco (id, loja_id) on delete cascade,
  foreign key (produto_id, loja_id) references public.produtos (id, loja_id) on delete cascade
);

-- ---------------------------------------------------------------------------
-- Gatilhos: atualizado_em e auditoria
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['setores', 'produtos', 'complementos', 'grupos_opcoes', 'opcoes', 'tabelas_preco'] loop
    execute format('create trigger %1$s_atualizado before update on public.%1$s for each row execute function private.tocar_atualizado_em()', t);
  end loop;
  foreach t in array array['setores', 'produtos', 'produto_marcas', 'setor_marcas', 'complementos', 'grupos_opcoes', 'opcoes', 'produto_grupos', 'tabelas_preco', 'tabela_preco_itens'] loop
    execute format('create trigger %1$s_auditar after insert or update or delete on public.%1$s for each row execute function private.auditar()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security: membros leem; quem tem "cardapio" escreve
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['setores', 'setor_marcas', 'produtos', 'produto_marcas', 'complementos', 'grupos_opcoes', 'opcoes', 'produto_grupos',
                           'tabelas_preco', 'tabela_preco_horarios', 'tabela_preco_marcas', 'tabela_preco_itens'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %1$s_ler on public.%1$I for select to authenticated using (private.e_membro(loja_id))', t);
    execute format('create policy %1$s_escrever on public.%1$I for all to authenticated using (private.tem_permissao(loja_id, %2$L)) with check (private.tem_permissao(loja_id, %2$L))',
                   t, case when t like 'tabela%' then 'cardapio_visibilidade' else 'cardapio' end);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Operações atômicas (D-005). Rodam com os direitos de quem chama (RLS vale).
-- ---------------------------------------------------------------------------

-- Salvar setor e suas marcas numa transação (R-001, R-002).
create or replace function public.salvar_setor(
  p_loja uuid,
  p_id uuid,
  p_nome text,
  p_nome_publico text default null,
  p_delivery boolean default true,
  p_presencial boolean default true,
  p_marcas uuid[] default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := p_id;
  v_marcas uuid[] := coalesce(p_marcas, array(select m.id from public.marcas m where m.loja_id = p_loja order by m.ordem));
begin
  if cardinality(v_marcas) = 0 then
    raise exception 'O setor precisa estar em pelo menos uma marca' using errcode = 'check_violation';
  end if;

  if v_id is null then
    insert into public.setores (loja_id, nome, nome_publico, delivery, presencial, ordem)
    values (p_loja, p_nome, p_nome_publico, p_delivery, p_presencial,
            coalesce((select max(s.ordem) + 1 from public.setores s where s.loja_id = p_loja), 0))
    returning id into v_id;
  else
    update public.setores
       set nome = p_nome, nome_publico = p_nome_publico, delivery = p_delivery, presencial = p_presencial
     where id = v_id and loja_id = p_loja;
    if not found then
      raise exception 'Setor não encontrado' using errcode = 'no_data_found';
    end if;
  end if;

  delete from public.setor_marcas where setor_id = v_id and marca_id <> all (v_marcas);
  insert into public.setor_marcas (loja_id, setor_id, marca_id)
  select p_loja, v_id, unnest(v_marcas)
  on conflict (setor_id, marca_id) do nothing;

  return v_id;
end;
$$;

-- Criar produto já ligado às marcas: todas, com todos os canais (R-008, D-010), ou só as indicadas.
create or replace function public.criar_produto(
  p_loja uuid,
  p_nome text,
  p_setor uuid default null,
  p_preco numeric default null,
  p_descricao text default null,
  p_marcas uuid[] default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.produtos (loja_id, setor_id, nome, preco, descricao, ordem)
  values (p_loja, p_setor, p_nome, p_preco, p_descricao,
          coalesce((select max(p.ordem) + 1 from public.produtos p where p.loja_id = p_loja and p.setor_id is not distinct from p_setor), 0))
  returning id into v_id;

  insert into public.produto_marcas (loja_id, produto_id, marca_id)
  select p_loja, v_id, m.id
  from public.marcas m
  where m.loja_id = p_loja and (p_marcas is null or m.id = any (p_marcas));

  return v_id;
end;
$$;

-- Criar grupo de opções já vinculado ao produto, com as opções, numa transação (R-015 corrigido).
-- p_opcoes: [{ "complemento_id"?: uuid, "produto_id"?: uuid, "nome"?: text, "preco"?: number, "max_qtd"?: int }]
create or replace function public.criar_grupo_vinculado(
  p_produto uuid,
  p_nome text,
  p_formacao public.formacao_preco default 'soma',
  p_obrigatorio boolean default false,
  p_min integer default 0,
  p_max integer default 1,
  p_pizza boolean default false,
  p_opcoes jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_loja uuid;
  v_grupo uuid;
  v_ordem integer;
begin
  select p.loja_id into v_loja from public.produtos p where p.id = p_produto;
  if v_loja is null then
    raise exception 'Produto não encontrado' using errcode = 'no_data_found';
  end if;

  insert into public.grupos_opcoes (loja_id, nome, formacao, obrigatorio, min_qtd, max_qtd, pizza)
  values (v_loja, p_nome, p_formacao, p_obrigatorio, p_min, p_max, p_pizza)
  returning id into v_grupo;

  insert into public.opcoes (loja_id, grupo_id, complemento_id, produto_id, nome, preco, max_qtd, ordem)
  select v_loja, v_grupo,
         nullif(o ->> 'complemento_id', '')::uuid,
         nullif(o ->> 'produto_id', '')::uuid,
         o ->> 'nome',
         (o ->> 'preco')::numeric,
         coalesce((o ->> 'max_qtd')::integer, 1),
         ord - 1
  from jsonb_array_elements(p_opcoes) with ordinality as e(o, ord);

  select coalesce(max(pg.ordem) + 1, 0) into v_ordem from public.produto_grupos pg where pg.produto_id = p_produto;
  insert into public.produto_grupos (loja_id, produto_id, grupo_id, ordem) values (v_loja, p_produto, v_grupo, v_ordem);

  return v_grupo;
end;
$$;

grant execute on function public.salvar_setor(uuid, uuid, text, text, boolean, boolean, uuid[]) to authenticated;
grant execute on function public.criar_produto(uuid, text, uuid, numeric, text, uuid[]) to authenticated;
grant execute on function public.criar_grupo_vinculado(uuid, text, public.formacao_preco, boolean, integer, integer, boolean, jsonb) to authenticated;
revoke execute on function public.salvar_setor(uuid, uuid, text, text, boolean, boolean, uuid[]) from anon;
revoke execute on function public.criar_produto(uuid, text, uuid, numeric, text, uuid[]) from anon;
revoke execute on function public.criar_grupo_vinculado(uuid, text, public.formacao_preco, boolean, integer, integer, boolean, jsonb) from anon;
