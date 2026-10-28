-- 0052: Gestão Empresarial (D-050). Pode rodar de novo.
-- Custos fixos e variáveis (planilha com modelo pronto), funcionários, faltas e advertências.
-- Tudo por loja e só para dono/gerente: CPF e dados dos funcionários são dados pessoais (LGPD).

-- dados do empregador que vão nos documentos
create table if not exists public.gestao_empresa (
  loja_id        uuid primary key references public.lojas (id) on delete cascade,
  razao_social   text check (razao_social is null or length(razao_social) <= 150),
  cnpj           text check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  endereco       text check (endereco is null or length(endereco) <= 200),
  cidade         text check (cidade is null or length(cidade) <= 80),
  uf             text check (uf is null or uf ~ '^[A-Z]{2}$'),
  cep            text check (cep is null or cep ~ '^[0-9]{8}$'),
  responsavel    text check (responsavel is null or length(responsavel) <= 120),
  cargo_responsavel text check (cargo_responsavel is null or length(cargo_responsavel) <= 60),
  faturamento_base numeric(14, 2) check (faturamento_base is null or faturamento_base >= 0),
  atualizado_em  timestamptz not null default now()
);

create table if not exists public.custos (
  id         uuid primary key default gen_random_uuid(),
  loja_id    uuid not null references public.lojas (id) on delete cascade,
  tipo       text not null check (tipo in ('fixo', 'variavel')),
  nome       text not null check (length(btrim(nome)) between 1 and 80),
  forma      text not null default 'valor' check (forma in ('valor', 'percentual')),
  valor      numeric(14, 2) not null default 0 check (valor >= 0),
  observacao text check (observacao is null or length(observacao) <= 200),
  ordem      integer not null default 0,
  criado_em  timestamptz not null default now(),
  check (tipo = 'variavel' or forma = 'valor'),
  check (forma = 'valor' or valor <= 100)
);
create index if not exists custos_loja_idx on public.custos (loja_id, tipo, ordem);

create table if not exists public.funcionarios (
  id          uuid primary key default gen_random_uuid(),
  loja_id     uuid not null references public.lojas (id) on delete cascade,
  nome        text not null check (length(btrim(nome)) between 2 and 120),
  cpf         text check (cpf is null or cpf ~ '^[0-9]{11}$'),
  rg          text check (rg is null or length(rg) <= 30),
  ctps        text check (ctps is null or length(ctps) <= 30),
  pis         text check (pis is null or length(pis) <= 20),
  cargo       text check (cargo is null or length(cargo) <= 60),
  admissao    date,
  nascimento  date,
  telefone    text check (telefone is null or length(telefone) <= 20),
  endereco    text check (endereco is null or length(endereco) <= 200),
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);
create index if not exists funcionarios_loja_idx on public.funcionarios (loja_id, ativo, nome);

create table if not exists public.funcionario_registros (
  id              uuid primary key default gen_random_uuid(),
  loja_id         uuid not null references public.lojas (id) on delete cascade,
  funcionario_id  uuid not null references public.funcionarios (id) on delete cascade,
  tipo            text not null check (tipo in ('falta', 'advertencia')),
  numero          integer not null,
  data            date not null,
  data_fim        date,
  justificada     boolean,
  motivo          text not null check (length(btrim(motivo)) between 2 and 120),
  descricao       text check (descricao is null or length(descricao) <= 2000),
  testemunha1     text check (testemunha1 is null or length(testemunha1) <= 120),
  testemunha2     text check (testemunha2 is null or length(testemunha2) <= 120),
  criado_por      uuid default auth.uid(),
  criado_em       timestamptz not null default now(),
  check (data_fim is null or data_fim >= data),
  check (tipo = 'falta' or (data_fim is null and justificada is null)),
  unique (loja_id, tipo, numero)
);
create index if not exists funcionario_registros_idx on public.funcionario_registros (loja_id, tipo, data desc);

create table if not exists private.contadores_registro (
  loja_id uuid not null references public.lojas (id) on delete cascade,
  tipo    text not null,
  ultimo  integer not null,
  primary key (loja_id, tipo)
);

-- número sequencial por loja e tipo (aparece no documento: "Advertência nº 3")
create or replace function private.numerar_registro()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select loja_id from public.funcionarios where id = new.funcionario_id) is distinct from new.loja_id then
    raise exception 'Funcionário de outra loja.' using errcode = 'check_violation';
  end if;
  -- contador próprio: número de documento já impresso nunca é reaproveitado, mesmo se o registro for excluído
  insert into private.contadores_registro (loja_id, tipo, ultimo)
  values (new.loja_id, new.tipo, coalesce((select max(numero) from public.funcionario_registros where loja_id = new.loja_id and tipo = new.tipo), 0) + 1)
  on conflict (loja_id, tipo) do update set ultimo = private.contadores_registro.ultimo + 1
  returning ultimo into new.numero;
  return new;
end;
$$;
drop trigger if exists funcionario_registros_numero on public.funcionario_registros;
create trigger funcionario_registros_numero before insert on public.funcionario_registros
  for each row execute function private.numerar_registro();

-- RLS: só dono e gerente da loja
do $$
declare t text;
begin
  foreach t in array array['gestao_empresa', 'custos', 'funcionarios', 'funcionario_registros'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %1$s_gestor on public.%1$I', t);
    execute format('create policy %1$s_gestor on public.%1$I for all to authenticated using (private.e_gestor(loja_id)) with check (private.e_gestor(loja_id))', t);
  end loop;
end $$;
-- histórico de alterações só nos custos e nos dados da empresa: os dados dos funcionários (CPF etc.)
-- não vão para a auditoria, que pode ser aberta por quem tem "histórico de alterações" sem ser gestor
drop trigger if exists custos_auditar on public.custos;
create trigger custos_auditar after insert or update or delete on public.custos for each row execute function private.auditar();
drop trigger if exists gestao_empresa_auditar on public.gestao_empresa;
create trigger gestao_empresa_auditar after insert or update or delete on public.gestao_empresa for each row execute function private.auditar();
grant select, insert, update, delete on public.gestao_empresa, public.custos, public.funcionarios, public.funcionario_registros to authenticated;
revoke all on public.gestao_empresa, public.custos, public.funcionarios, public.funcionario_registros from anon;

-- planilha pré-pronta: cria as linhas do modelo uma única vez (o dono preenche e acrescenta as dele)
create or replace function public.preparar_gestao(p_loja uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente acessam a Gestão Empresarial.' using errcode = 'insufficient_privilege';
  end if;
  insert into public.gestao_empresa (loja_id, cnpj, endereco, cidade)
  select l.id, l.cnpj, l.endereco, l.cidade from public.lojas l where l.id = p_loja
  on conflict (loja_id) do nothing;
  if not exists (select 1 from public.custos where loja_id = p_loja) then
    insert into public.custos (loja_id, tipo, nome, forma, ordem) values
      (p_loja, 'fixo', 'Aluguel', 'valor', 1),
      (p_loja, 'fixo', 'Condomínio e IPTU', 'valor', 2),
      (p_loja, 'fixo', 'Energia elétrica', 'valor', 3),
      (p_loja, 'fixo', 'Água e esgoto', 'valor', 4),
      (p_loja, 'fixo', 'Gás', 'valor', 5),
      (p_loja, 'fixo', 'Internet e telefone', 'valor', 6),
      (p_loja, 'fixo', 'Salários', 'valor', 7),
      (p_loja, 'fixo', 'Encargos (INSS, FGTS, férias, 13º)', 'valor', 8),
      (p_loja, 'fixo', 'Vale-transporte e alimentação', 'valor', 9),
      (p_loja, 'fixo', 'Pró-labore dos sócios', 'valor', 10),
      (p_loja, 'fixo', 'Contador', 'valor', 11),
      (p_loja, 'fixo', 'Sistemas e aplicativos', 'valor', 12),
      (p_loja, 'fixo', 'Maquininha (aluguel)', 'valor', 13),
      (p_loja, 'fixo', 'Seguro', 'valor', 14),
      (p_loja, 'fixo', 'Manutenção e limpeza', 'valor', 15),
      (p_loja, 'fixo', 'Marketing e anúncios', 'valor', 16),
      (p_loja, 'fixo', 'Parcelas de empréstimos e equipamentos', 'valor', 17),
      (p_loja, 'variavel', 'Insumos / CMV (ingredientes)', 'percentual', 1),
      (p_loja, 'variavel', 'Embalagens', 'percentual', 2),
      (p_loja, 'variavel', 'Impostos sobre vendas (Simples Nacional)', 'percentual', 3),
      (p_loja, 'variavel', 'Taxas de cartão e Pix', 'percentual', 4),
      (p_loja, 'variavel', 'Comissão de aplicativos (iFood e outros)', 'percentual', 5),
      (p_loja, 'variavel', 'Motoboys / entregas', 'valor', 6),
      (p_loja, 'variavel', 'Comissões e gorjetas da equipe', 'percentual', 7),
      (p_loja, 'variavel', 'Perdas e desperdício', 'percentual', 8);
  end if;
end;
$$;
revoke execute on function public.preparar_gestao(uuid) from anon, public;
grant execute on function public.preparar_gestao(uuid) to authenticated;
