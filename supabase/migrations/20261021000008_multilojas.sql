-- RES · 0008 · Multilojas. Conta (o cliente que assina o RES) → várias lojas → várias marcas
-- (cada marca = um cardápio com link próprio). O pacote limita quantas lojas e quantos
-- cardápios a conta pode ter; o banco garante o limite.
-- O titular da conta entra como "dono" em todas as lojas dela; a equipe entra por convite
-- só na loja em que trabalha. Assim as regras de acesso (RLS) por loja continuam as mesmas.

create table public.contas (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null check (length(btrim(nome)) between 1 and 120),
  plano            text not null default 'basico',
  limite_lojas     integer not null default 1 check (limite_lojas >= 1),
  limite_cardapios integer check (limite_cardapios is null or limite_cardapios >= 1),  -- null = sem limite
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

create table public.contas_titulares (
  conta_id  uuid not null references public.contas (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (conta_id, user_id)
);
create index contas_titulares_user_idx on public.contas_titulares (user_id);

alter table public.lojas add column conta_id uuid references public.contas (id) on delete restrict;
create index lojas_conta_idx on public.lojas (conta_id);

create trigger contas_atualizado before update on public.contas for each row execute function private.tocar_atualizado_em();

-- Lojas que já existiam: uma conta por dono (lojas do mesmo dono ficam na mesma conta).
-- Contas criadas antes dos pacotes ficam com o pacote do piloto: 3 lojas e 3 cardápios.
do $$
declare
  r record;
  v_conta uuid;
begin
  for r in
    select distinct on (d.user_id) d.user_id, l.nome
      from public.lojas l
      join lateral (select m.user_id from public.membros m where m.loja_id = l.id and m.papel = 'dono' order by m.criado_em limit 1) d on true
     order by d.user_id, l.criado_em
  loop
    insert into public.contas (nome, plano, limite_lojas, limite_cardapios) values (r.nome, 'piloto', 3, 3) returning id into v_conta;
    insert into public.contas_titulares (conta_id, user_id) values (v_conta, r.user_id);
    update public.lojas l set conta_id = v_conta
     where l.conta_id is null
       and (select m.user_id from public.membros m where m.loja_id = l.id and m.papel = 'dono' order by m.criado_em limit 1) = r.user_id;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Limites do pacote (valem para qualquer caminho de inserção)
-- ---------------------------------------------------------------------------
create or replace function private.limite_lojas()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_limite integer;
begin
  if new.conta_id is null then
    return new;
  end if;
  select limite_lojas into v_limite from public.contas where id = new.conta_id for update;
  if (select count(*) from public.lojas where conta_id = new.conta_id) >= v_limite then
    raise exception 'Seu pacote permite % loja(s). Fale com a gente para ampliar.', v_limite using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger lojas_limite before insert or update of conta_id on public.lojas for each row execute function private.limite_lojas();

create or replace function private.limite_cardapios()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_conta  uuid;
  v_limite integer;
begin
  select l.conta_id into v_conta from public.lojas l where l.id = new.loja_id;
  if v_conta is null then
    return new;
  end if;
  select limite_cardapios into v_limite from public.contas where id = v_conta for update;
  if v_limite is not null and (select count(*) from public.marcas m join public.lojas l on l.id = m.loja_id where l.conta_id = v_conta) >= v_limite then
    raise exception 'Seu pacote permite % cardápio(s). Fale com a gente para ampliar.', v_limite using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger marcas_limite before insert on public.marcas for each row execute function private.limite_cardapios();

-- ---------------------------------------------------------------------------
-- RLS das contas: o titular vê e renomeia a conta; limites só a equipe RES muda (sem política).
-- ---------------------------------------------------------------------------
alter table public.contas enable row level security;
alter table public.contas_titulares enable row level security;

create or replace function private.e_titular(p_conta uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.contas_titulares t where t.conta_id = p_conta and t.user_id = auth.uid());
$$;
grant execute on function private.e_titular(uuid) to authenticated;

create policy contas_ler on public.contas for select to authenticated
  using (private.e_titular(id) or exists (select 1 from public.lojas l where l.conta_id = contas.id and private.e_membro(l.id)));
create policy contas_titulares_ler on public.contas_titulares for select to authenticated using (private.e_titular(conta_id));

-- Não deixa ninguém mudar plano/limites pelo app (só nome).
create or replace function private.proteger_plano()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('authenticated', 'anon')
     and (new.plano, new.limite_lojas, new.limite_cardapios) is distinct from (old.plano, old.limite_lojas, old.limite_cardapios) then
    raise exception 'O pacote só pode ser alterado pela equipe RES.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
create trigger contas_proteger_plano before update on public.contas for each row execute function private.proteger_plano();
create policy contas_renomear on public.contas for update to authenticated using (private.e_titular(id)) with check (private.e_titular(id));

-- ---------------------------------------------------------------------------
-- Criar loja: grupos de acesso padrão + titulares da conta como donos.
-- ---------------------------------------------------------------------------
create or replace function private.montar_loja(p_conta uuid, p_nome text, p_marca text, p_slug text, p_nome_dono text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_loja  uuid;
  v_admin uuid;
begin
  insert into public.lojas (nome, conta_id) values (p_nome, p_conta) returning id into v_loja;
  insert into public.marcas (loja_id, nome, slug) values (v_loja, p_marca, lower(btrim(p_slug)));

  insert into public.grupos_acesso (loja_id, nome, permissoes)
  values (v_loja, 'Administrador', array(select chave from public.recursos_acesso order by chave))
  returning id into v_admin;
  insert into public.grupos_acesso (loja_id, nome, permissoes)
  values (v_loja, 'Funcionário', array['cardapio', 'clientes', 'estoque', 'pdv', 'mesas', 'caixa', 'pedidos_delivery']);

  -- todos os titulares da conta são donos da loja nova
  insert into public.membros (loja_id, user_id, nome, papel, grupo_acesso_id)
  select v_loja, t.user_id,
         coalesce(case when t.user_id = auth.uid() then nullif(btrim(p_nome_dono), '') end,
                  (select m.nome from public.membros m where m.user_id = t.user_id order by m.criado_em limit 1),
                  'Dono'),
         'dono', v_admin
    from public.contas_titulares t where t.conta_id = p_conta;
  return v_loja;
end;
$$;
revoke execute on function private.montar_loja(uuid, text, text, text, text) from anon, public;

-- Primeira loja (cadastro): cria a conta (pacote básico: 1 loja, 1 cardápio) e a loja.
create or replace function public.criar_loja(p_nome text, p_marca text, p_slug text, p_nome_dono text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_conta uuid;
begin
  if v_user is null then
    raise exception 'É preciso estar autenticado' using errcode = 'insufficient_privilege';
  end if;
  -- quem já tem conta cria a loja nela (respeitando o pacote)
  select conta_id into v_conta from public.contas_titulares where user_id = v_user order by criado_em limit 1;
  if v_conta is null then
    insert into public.contas (nome, limite_lojas, limite_cardapios) values (p_nome, 1, 1) returning id into v_conta;
    insert into public.contas_titulares (conta_id, user_id) values (v_conta, v_user);
  end if;
  return private.montar_loja(v_conta, p_nome, p_marca, p_slug, p_nome_dono);
end;
$$;

-- Nova loja numa conta (titular).
create or replace function public.criar_loja_na_conta(p_conta uuid, p_nome text, p_marca text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.e_titular(p_conta) then
    raise exception 'Só o titular da conta cria lojas.' using errcode = 'insufficient_privilege';
  end if;
  return private.montar_loja(p_conta, p_nome, p_marca, p_slug, null);
end;
$$;

-- Novo cardápio (marca) numa loja. Endereço do link único em todo o RES.
create or replace function public.criar_marca(p_loja uuid, p_nome text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.tem_permissao(p_loja, 'dados_empresa') then
    raise exception 'Você não tem permissão para criar cardápios nesta loja.' using errcode = 'insufficient_privilege';
  end if;
  insert into public.marcas (loja_id, nome, slug, ordem)
  values (p_loja, btrim(p_nome), lower(btrim(p_slug)), coalesce((select max(ordem) + 1 from public.marcas where loja_id = p_loja), 0))
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Equipe por loja: convite por e-mail. Quem entra com aquele e-mail ganha acesso só à loja.
-- ---------------------------------------------------------------------------
create table public.convites (
  id         uuid primary key default gen_random_uuid(),
  loja_id    uuid not null references public.lojas (id) on delete cascade,
  email      text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nome       text not null check (length(btrim(nome)) between 1 and 120),
  papel      public.papel_membro not null default 'funcionario' check (papel <> 'dono'),
  grupo_acesso_id uuid,
  convidado_por uuid,
  criado_em  timestamptz not null default now(),
  aceito_em  timestamptz,
  foreign key (grupo_acesso_id, loja_id) references public.grupos_acesso (id, loja_id) on delete set null (grupo_acesso_id)
);
create unique index convites_pendentes_idx on public.convites (loja_id, lower(email)) where aceito_em is null;
alter table public.convites enable row level security;
create policy convites_ler on public.convites for select to authenticated using (private.tem_permissao(loja_id, 'equipe'));
create policy convites_apagar on public.convites for delete to authenticated using (private.tem_permissao(loja_id, 'equipe'));

create or replace function public.convidar(p_loja uuid, p_email text, p_nome text, p_papel public.papel_membro default 'funcionario', p_grupo uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_grupo uuid := p_grupo;
begin
  if not private.tem_permissao(p_loja, 'equipe') then
    raise exception 'Você não tem permissão para convidar pessoas.' using errcode = 'insufficient_privilege';
  end if;
  if v_grupo is null and p_papel = 'funcionario' then
    select id into v_grupo from public.grupos_acesso where loja_id = p_loja and nome = 'Funcionário';
  end if;
  insert into public.convites (loja_id, email, nome, papel, grupo_acesso_id, convidado_por)
  values (p_loja, lower(btrim(p_email)), btrim(p_nome), p_papel, v_grupo, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- Chamado depois do login: transforma os convites do e-mail da pessoa em acesso às lojas.
create or replace function public.aceitar_convites()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(nullif(auth.jwt() ->> 'email', ''));
  v_n integer := 0;
  c record;
begin
  if auth.uid() is null or v_email is null then
    return 0;
  end if;
  for c in select * from public.convites where lower(email) = v_email and aceito_em is null for update loop
    insert into public.membros (loja_id, user_id, nome, papel, grupo_acesso_id)
    values (c.loja_id, auth.uid(), c.nome, c.papel, c.grupo_acesso_id)
    on conflict (loja_id, user_id) do update set ativo = true, papel = excluded.papel, grupo_acesso_id = excluded.grupo_acesso_id;
    update public.convites set aceito_em = now() where id = c.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Resumo de vendas por loja num período, com o período anterior de mesmo tamanho
-- para comparar (hoje × ontem, 7 dias × 7 anteriores…). Só lojas em que a pessoa
-- tem "relatorios". Vendido = pedidos não cancelados. Valores em centavos.
-- ---------------------------------------------------------------------------
create or replace function public.resumo_vendas(p_lojas uuid[], p_inicio timestamptz, p_fim timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lojas uuid[];
  v_dur   interval := p_fim - p_inicio;
begin
  if p_fim <= p_inicio or v_dur > interval '400 days' then
    raise exception 'Período inválido.' using errcode = 'invalid_parameter_value';
  end if;
  select coalesce(array_agg(id), '{}') into v_lojas
    from unnest(p_lojas) id where private.tem_permissao(id, 'relatorios');

  return jsonb_build_object(
    'atual', private.metricas_vendas(v_lojas, p_inicio, p_fim),
    'anterior', private.metricas_vendas(v_lojas, p_inicio - v_dur, p_inicio),
    'dias', coalesce((
      select jsonb_agg(jsonb_build_object('dia', d.dia, 'loja_id', d.loja_id, 'faturamento', d.fat, 'pedidos', d.n) order by d.dia, d.loja_id)
        from (
          select (p.criado_em at time zone l.fuso_horario)::date as dia, p.loja_id,
                 round(sum(p.total) * 100) as fat, count(*) as n
            from public.pedidos p join public.lojas l on l.id = p.loja_id
           where p.loja_id = any (v_lojas) and p.criado_em >= p_inicio and p.criado_em < p_fim and p.status <> 'cancelado'
           group by 1, 2
        ) d), '[]'::jsonb)
  );
end;
$$;

create or replace function private.metricas_vendas(p_lojas uuid[], p_inicio timestamptz, p_fim timestamptz)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'loja_id', l.id, 'loja', l.nome,
           'pedidos', coalesce(x.pedidos, 0), 'faturamento', coalesce(x.fat, 0), 'cancelados', coalesce(x.cancelados, 0),
           'valor_cancelado', coalesce(x.valor_cancelado, 0), 'taxas_entrega', coalesce(x.taxas, 0),
           'entrega', coalesce(x.entrega, 0), 'retirada', coalesce(x.retirada, 0), 'balcao', coalesce(x.balcao, 0),
           'online', coalesce(x.online, 0))
         order by l.nome), '[]'::jsonb)
    from public.lojas l
    left join lateral (
      select count(*) filter (where p.status <> 'cancelado') as pedidos,
             round(sum(p.total) filter (where p.status <> 'cancelado') * 100) as fat,
             count(*) filter (where p.status = 'cancelado') as cancelados,
             round(sum(p.total) filter (where p.status = 'cancelado') * 100) as valor_cancelado,
             round(sum(p.taxa_entrega) filter (where p.status <> 'cancelado') * 100) as taxas,
             count(*) filter (where p.status <> 'cancelado' and p.tipo = 'entrega') as entrega,
             count(*) filter (where p.status <> 'cancelado' and p.tipo = 'retirada') as retirada,
             count(*) filter (where p.status <> 'cancelado' and p.tipo = 'balcao') as balcao,
             count(*) filter (where p.status <> 'cancelado' and p.origem = 'cardapio_digital') as online
        from public.pedidos p
       where p.loja_id = l.id and p.criado_em >= p_inicio and p.criado_em < p_fim
    ) x on true
   where l.id = any (p_lojas);
$$;
create index pedidos_loja_criado_idx on public.pedidos (loja_id, criado_em);

do $$
declare f text;
begin
  foreach f in array array[
    'public.criar_loja_na_conta(uuid, text, text, text)',
    'public.criar_marca(uuid, text, text)',
    'public.convidar(uuid, text, text, public.papel_membro, uuid)',
    'public.aceitar_convites()',
    'public.resumo_vendas(uuid[], timestamptz, timestamptz)'] loop
    execute format('grant execute on function %s to authenticated', f);
    execute format('revoke execute on function %s from anon, public', f);
  end loop;
end;
$$;
revoke execute on function private.metricas_vendas(uuid[], timestamptz, timestamptz) from anon, public;
