-- RES · 0001 · Base multiloja: lojas, marcas, membros, grupos de acesso, auditoria.
-- Decisões: docs/decisoes.md (D-002, D-004, D-007).

create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------------

create or replace function private.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lojas e marcas
-- ---------------------------------------------------------------------------

create table public.lojas (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null check (length(btrim(nome)) between 1 and 120),
  cnpj          text check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  fuso_horario  text not null default 'America/Sao_Paulo',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.marcas (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references public.lojas (id) on delete cascade,
  nome          text not null check (length(btrim(nome)) between 1 and 120),
  slug          text not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{1,58}[a-z0-9])?$'),
  ativa         boolean not null default true,
  ordem         integer not null default 0,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (id, loja_id)
);
create index marcas_loja_idx on public.marcas (loja_id);

-- ---------------------------------------------------------------------------
-- Pessoas e permissões
-- ---------------------------------------------------------------------------

-- Recursos que um grupo de acesso pode liberar. Lista espelhada em packages/core/src/permissoes.ts.
create table public.recursos_acesso (
  chave     text primary key,
  categoria text not null,
  descricao text not null
);

insert into public.recursos_acesso (chave, categoria, descricao) values
  ('cardapio',             'Cadastros',    'Cadastro de cardápio'),
  ('cardapio_visibilidade','Cadastros',    'Exibir / ocultar produtos'),
  ('formas_recebimento',   'Cadastros',    'Formas de recebimento'),
  ('mesas_comandas',       'Cadastros',    'Mesas e comandas'),
  ('clientes',             'Clientes',     'Clientes'),
  ('fiado',                'Clientes',     'Fiado'),
  ('avaliacoes',           'Clientes',     'Avaliações'),
  ('cardapio_digital',     'Configurações','Cardápio digital'),
  ('ia',                   'Configurações','Inteligência artificial'),
  ('equipe',               'Empresa',      'Funcionários e usuários'),
  ('dados_empresa',        'Empresa',      'Dados da empresa e marcas'),
  ('caixas_cadastro',      'Empresa',      'Cadastro de caixas'),
  ('historico_alteracoes', 'Empresa',      'Histórico de alterações'),
  ('impressoras',          'Empresa',      'Impressoras'),
  ('plano',                'Empresa',      'Plano e assinatura'),
  ('fiscal',               'Fiscal',       'Notas fiscais e configuração fiscal'),
  ('estoque',              'Gestão',       'Estoque'),
  ('financeiro',           'Gestão',       'Financeiro'),
  ('whatsapp',             'Gestão',       'WhatsApp'),
  ('pagamentos_online',    'Gestão',       'Pix e pagamento online'),
  ('integracoes',          'Gestão',       'Aplicativos e integrações'),
  ('fidelidade',           'Gestão',       'Fidelidade e cupons'),
  ('marketing',            'Marketing',    'Campanhas e marketing'),
  ('relatorios',           'Relatórios',   'Desempenho e relatórios'),
  ('pdv',                  'Venda',        'PDV'),
  ('historico_vendas',     'Venda',        'Histórico de vendas'),
  ('mesas',                'Venda',        'Venda em mesas'),
  ('caixa',                'Venda',        'Abrir e fechar caixa'),
  ('pedidos_delivery',     'Venda',        'Pedidos delivery'),
  ('kds',                  'Venda',        'KDS (cozinha)');

create table public.grupos_acesso (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references public.lojas (id) on delete cascade,
  nome          text not null check (length(btrim(nome)) between 1 and 60),
  permissoes    text[] not null default '{}',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (loja_id, nome),
  unique (id, loja_id)
);

create type public.papel_membro as enum ('dono', 'gerente', 'funcionario', 'garcom', 'entregador');

create table public.membros (
  id               uuid primary key default gen_random_uuid(),
  loja_id          uuid not null references public.lojas (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  nome             text not null check (length(btrim(nome)) between 1 and 120),
  papel            public.papel_membro not null default 'funcionario',
  grupo_acesso_id  uuid,
  ativo            boolean not null default true,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  unique (loja_id, user_id),
  foreign key (grupo_acesso_id, loja_id) references public.grupos_acesso (id, loja_id) on delete set null (grupo_acesso_id)
);
create index membros_user_idx on public.membros (user_id);

-- ---------------------------------------------------------------------------
-- Funções de autorização (security definer: leem membros sem esbarrar no RLS)
-- ---------------------------------------------------------------------------

create or replace function private.e_membro(p_loja uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membros m
    where m.loja_id = p_loja and m.user_id = auth.uid() and m.ativo
  );
$$;

create or replace function private.e_gestor(p_loja uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.membros m
    where m.loja_id = p_loja and m.user_id = auth.uid() and m.ativo
      and m.papel in ('dono', 'gerente')
  );
$$;

create or replace function private.tem_permissao(p_loja uuid, p_recurso text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.membros m
    left join public.grupos_acesso g on g.id = m.grupo_acesso_id
    where m.loja_id = p_loja and m.user_id = auth.uid() and m.ativo
      and (m.papel in ('dono', 'gerente') or p_recurso = any (coalesce(g.permissoes, '{}')))
  );
$$;

grant usage on schema private to authenticated;
grant execute on function private.e_membro(uuid), private.e_gestor(uuid), private.tem_permissao(uuid, text) to authenticated;

-- Permissões de um grupo só podem citar recursos existentes.
create or replace function private.validar_permissoes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  invalidos text[];
begin
  select array_agg(p) into invalidos
  from unnest(new.permissoes) p
  where not exists (select 1 from public.recursos_acesso r where r.chave = p);
  if invalidos is not null then
    raise exception 'Recurso de acesso desconhecido: %', array_to_string(invalidos, ', ')
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger grupos_acesso_validar before insert or update on public.grupos_acesso
  for each row execute function private.validar_permissoes();

-- ---------------------------------------------------------------------------
-- Auditoria calculada no servidor (D-004)
-- ---------------------------------------------------------------------------

create table public.auditoria (
  id          bigint generated always as identity primary key,
  loja_id     uuid not null references public.lojas (id) on delete cascade,
  tabela      text not null,
  registro_id uuid,
  operacao    text not null check (operacao in ('INSERT', 'UPDATE', 'DELETE')),
  usuario_id  uuid,
  em          timestamptz not null default now(),
  alteracoes  jsonb not null
);
create index auditoria_loja_em_idx on public.auditoria (loja_id, em desc);

create or replace function private.auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  antes   jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  depois  jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  linha   jsonb := coalesce(depois, antes);
  v_loja  uuid  := coalesce((linha ->> 'loja_id')::uuid, case when tg_table_name = 'lojas' then (linha ->> 'id')::uuid end);
  difs    jsonb := '{}'::jsonb;
  k       text;
begin
  if v_loja is null then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(depois) loop
      if k not in ('atualizado_em') and (antes -> k) is distinct from (depois -> k) then
        difs := difs || jsonb_build_object(k, jsonb_build_object('antes', antes -> k, 'depois', depois -> k));
      end if;
    end loop;
    if difs = '{}'::jsonb then
      return new; -- nada mudou: nada a registrar (paridade com o histórico do BeeFood)
    end if;
  elsif tg_op = 'INSERT' then
    difs := jsonb_build_object('depois', depois);
  else
    difs := jsonb_build_object('antes', antes);
  end if;

  -- Ao apagar a própria loja (cascata), não há onde registrar.
  if tg_op = 'DELETE' and not exists (select 1 from public.lojas l where l.id = v_loja) then
    return old;
  end if;

  insert into public.auditoria (loja_id, tabela, registro_id, operacao, usuario_id, alteracoes)
  values (v_loja, tg_table_name, (linha ->> 'id')::uuid, tg_op, auth.uid(), difs);
  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- Gatilhos comuns
-- ---------------------------------------------------------------------------

create trigger lojas_atualizado before update on public.lojas for each row execute function private.tocar_atualizado_em();
create trigger marcas_atualizado before update on public.marcas for each row execute function private.tocar_atualizado_em();
create trigger grupos_acesso_atualizado before update on public.grupos_acesso for each row execute function private.tocar_atualizado_em();
create trigger membros_atualizado before update on public.membros for each row execute function private.tocar_atualizado_em();

create trigger lojas_auditar after update on public.lojas for each row execute function private.auditar();
create trigger marcas_auditar after insert or update or delete on public.marcas for each row execute function private.auditar();
create trigger grupos_acesso_auditar after insert or update or delete on public.grupos_acesso for each row execute function private.auditar();
create trigger membros_auditar after insert or update or delete on public.membros for each row execute function private.auditar();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.lojas enable row level security;
alter table public.marcas enable row level security;
alter table public.recursos_acesso enable row level security;
alter table public.grupos_acesso enable row level security;
alter table public.membros enable row level security;
alter table public.auditoria enable row level security;

create policy lojas_ler on public.lojas for select to authenticated using (private.e_membro(id));
create policy lojas_editar on public.lojas for update to authenticated
  using (private.tem_permissao(id, 'dados_empresa')) with check (private.tem_permissao(id, 'dados_empresa'));
-- Criação de loja só pela função criar_loja (abaixo); exclusão não é exposta ao cliente.

create policy marcas_ler on public.marcas for select to authenticated using (private.e_membro(loja_id));
create policy marcas_escrever on public.marcas for all to authenticated
  using (private.tem_permissao(loja_id, 'dados_empresa')) with check (private.tem_permissao(loja_id, 'dados_empresa'));

create policy recursos_ler on public.recursos_acesso for select to authenticated using (true);

create policy grupos_ler on public.grupos_acesso for select to authenticated using (private.e_membro(loja_id));
create policy grupos_escrever on public.grupos_acesso for all to authenticated
  using (private.tem_permissao(loja_id, 'equipe')) with check (private.tem_permissao(loja_id, 'equipe'));

create policy membros_ler on public.membros for select to authenticated using (private.e_membro(loja_id));
create policy membros_escrever on public.membros for all to authenticated
  using (private.tem_permissao(loja_id, 'equipe')) with check (private.tem_permissao(loja_id, 'equipe'));

create policy auditoria_ler on public.auditoria for select to authenticated
  using (private.tem_permissao(loja_id, 'historico_alteracoes'));
-- Sem políticas de escrita: só o gatilho (security definer) grava.

-- Ninguém além do dono rebaixa ou remove o último dono.
create or replace function private.proteger_dono()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_loja uuid := coalesce(old.loja_id, new.loja_id);
begin
  if old.papel = 'dono' and (tg_op = 'DELETE' or new.papel <> 'dono' or not new.ativo) then
    if not exists (
      select 1 from public.membros m
      where m.loja_id = v_loja and m.papel = 'dono' and m.ativo and m.id <> old.id
    ) and exists (select 1 from public.lojas l where l.id = v_loja) then
      raise exception 'A loja precisa de pelo menos um dono ativo' using errcode = 'check_violation';
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger membros_proteger_dono before update or delete on public.membros
  for each row execute function private.proteger_dono();

-- ---------------------------------------------------------------------------
-- Criar loja (atômico: loja + primeira marca + dono + grupos padrão)
-- ---------------------------------------------------------------------------

create or replace function public.criar_loja(p_nome text, p_marca text, p_slug text, p_nome_dono text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_loja uuid;
  v_admin uuid;
begin
  if v_user is null then
    raise exception 'É preciso estar autenticado' using errcode = 'insufficient_privilege';
  end if;

  insert into public.lojas (nome) values (p_nome) returning id into v_loja;
  insert into public.marcas (loja_id, nome, slug) values (v_loja, p_marca, p_slug);

  insert into public.grupos_acesso (loja_id, nome, permissoes)
  values (v_loja, 'Administrador', array(select chave from public.recursos_acesso order by chave))
  returning id into v_admin;

  insert into public.grupos_acesso (loja_id, nome, permissoes)
  values (v_loja, 'Funcionário', array['cardapio', 'clientes', 'estoque', 'pdv', 'mesas', 'caixa', 'pedidos_delivery']);

  insert into public.membros (loja_id, user_id, nome, papel, grupo_acesso_id)
  values (v_loja, v_user, p_nome_dono, 'dono', v_admin);

  return v_loja;
end;
$$;

revoke execute on function public.criar_loja(text, text, text, text) from public, anon;
grant execute on function public.criar_loja(text, text, text, text) to authenticated;
