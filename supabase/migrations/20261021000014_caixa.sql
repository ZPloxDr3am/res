-- RES · 0014 · Etapa 4 (parte 1): caixa e usuários de caixa.
--
-- Caixas da loja (cadastro) com operadores definidos; sessão aberta com troco contado por
-- cédula; pedidos concluídos entram no caixa aberto; sangria e suprimento; fechamento cego
-- (o operador informa o que contou sem ver o esperado; o banco calcula sobra/falta).
-- Usuários de caixa: login por "usuário" (sem e-mail) — a conta no Auth é criada pelo servidor
-- do painel com a chave service_role (nunca no navegador, D-008) e registrada aqui (D-012).
-- Valores de contagem em centavos ({"20000": 2} = duas notas de R$ 200); demais em reais.

create type public.tipo_movimento_caixa as enum ('venda', 'sangria', 'suprimento');
create type public.status_sessao_caixa as enum ('aberto', 'fechado');

-- ---------------------------------------------------------------------------
-- Usuários de caixa (login por usuário)
-- ---------------------------------------------------------------------------
create table public.usuarios_login (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  usuario   text not null unique check (usuario ~ '^[a-z0-9][a-z0-9._-]{2,29}$'),
  loja_id   uuid not null references public.lojas (id) on delete cascade,  -- loja que criou
  criado_por uuid,
  criado_em timestamptz not null default now()
);
alter table public.usuarios_login enable row level security;
create policy usuarios_login_ler on public.usuarios_login for select to authenticated
  using (user_id = auth.uid() or private.tem_permissao(loja_id, 'equipe'));

-- Permissão da pessoa logada num recurso da loja (para o servidor do painel conferir antes de agir).
create or replace function public.posso(p_loja uuid, p_recurso text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select private.tem_permissao(p_loja, p_recurso) $$;

-- Domínio dos e-mails internos dos usuários de caixa (nunca recebem e-mail).
create or replace function private.dominio_usuarios() returns text language sql immutable as $$ select 'equipe.res.invalid' $$;

-- Registra um usuário recém-criado no Auth como membro da loja. Só quem cuida da equipe;
-- só contas internas (e-mail do domínio de usuários) e ainda sem loja.
create or replace function public.registrar_usuario_caixa(
  p_loja uuid, p_user uuid, p_usuario text, p_nome text,
  p_papel public.papel_membro default 'funcionario', p_grupo uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario text := lower(btrim(p_usuario));
  v_grupo   uuid := p_grupo;
  v_id      uuid;
begin
  if not private.tem_permissao(p_loja, 'equipe') then
    raise exception 'Você não tem permissão para criar usuários.' using errcode = 'insufficient_privilege';
  end if;
  if p_papel = 'dono' then
    raise exception 'Usuário de caixa não pode ser dono.' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_user and lower(u.email) = v_usuario || '@' || private.dominio_usuarios()) then
    raise exception 'Conta de usuário inválida.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.membros m where m.user_id = p_user) then
    raise exception 'Essa conta já está em uso.' using errcode = 'check_violation';
  end if;
  if length(btrim(coalesce(p_nome, ''))) = 0 then
    raise exception 'Informe o nome da pessoa.' using errcode = 'check_violation';
  end if;
  if v_grupo is null and p_papel = 'funcionario' then
    select id into v_grupo from public.grupos_acesso where loja_id = p_loja and nome = 'Funcionário';
  end if;
  if v_grupo is not null and not exists (select 1 from public.grupos_acesso g where g.id = v_grupo and g.loja_id = p_loja) then
    raise exception 'Grupo de acesso inválido.' using errcode = 'check_violation';
  end if;

  insert into public.usuarios_login (user_id, usuario, loja_id, criado_por) values (p_user, v_usuario, p_loja, auth.uid());
  insert into public.membros (loja_id, user_id, nome, papel, grupo_acesso_id)
  values (p_loja, p_user, btrim(p_nome), p_papel, v_grupo)
  returning id into v_id;
  return v_id;
end;
$$;

-- Pode trocar a senha deste usuário? (usuário de caixa criado nesta loja, e quem pede cuida da equipe)
create or replace function public.pode_gerir_usuario(p_loja uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.tem_permissao(p_loja, 'equipe')
     and exists (select 1 from public.usuarios_login u where u.user_id = p_user and u.loja_id = p_loja)
     and not exists (select 1 from public.membros m where m.user_id = p_user and m.papel = 'dono');
$$;

-- ---------------------------------------------------------------------------
-- Caixas, sessões e movimentos
-- ---------------------------------------------------------------------------
create table public.caixas (
  id        uuid primary key default gen_random_uuid(),
  loja_id   uuid not null references public.lojas (id) on delete cascade,
  nome      text not null check (length(btrim(nome)) between 1 and 40),
  ativo     boolean not null default true,
  ordem     integer not null default 0,
  criado_em timestamptz not null default now(),
  unique (id, loja_id)
);
create unique index caixas_nome_idx on public.caixas (loja_id, lower(btrim(nome)));

-- Quem opera cada caixa. Caixa sem operadores: qualquer pessoa com permissão "caixa".
create table public.caixa_operadores (
  caixa_id uuid not null,
  loja_id  uuid not null,
  user_id  uuid not null references auth.users (id) on delete cascade,
  primary key (caixa_id, user_id),
  foreign key (caixa_id, loja_id) references public.caixas (id, loja_id) on delete cascade
);

create table public.caixa_sessoes (
  id                  uuid primary key default gen_random_uuid(),
  loja_id             uuid not null,
  caixa_id            uuid not null,
  numero              integer not null,
  status              public.status_sessao_caixa not null default 'aberto',
  aberto_por          uuid not null,
  aberto_em           timestamptz not null default now(),
  abertura            numeric(12, 2) not null default 0 check (abertura >= 0),
  contagem_abertura   jsonb,
  fechado_por         uuid,
  fechado_em          timestamptz,
  contagem_fechamento jsonb,
  informado           jsonb,   -- {forma: reais} que o operador declarou
  esperado            jsonb,   -- {forma: reais} calculado no fechamento
  observacao          text check (observacao is null or length(observacao) <= 500),
  unique (id, loja_id),
  unique (loja_id, numero),
  foreign key (caixa_id, loja_id) references public.caixas (id, loja_id) on delete restrict,
  constraint sessao_fechada check ((status = 'fechado') = (fechado_em is not null))
);
create unique index caixa_sessoes_uma_aberta_idx on public.caixa_sessoes (caixa_id) where status = 'aberto';
create index caixa_sessoes_loja_idx on public.caixa_sessoes (loja_id, aberto_em desc);

create table public.caixa_movimentos (
  id        bigint generated always as identity primary key,
  loja_id   uuid not null,
  sessao_id uuid not null,
  tipo      public.tipo_movimento_caixa not null,
  forma     public.forma_pagamento not null,
  valor     numeric(12, 2) not null check (valor > 0),
  descricao text check (descricao is null or length(descricao) <= 200),
  pedido_id uuid,
  por       uuid,
  em        timestamptz not null default now(),
  foreign key (sessao_id, loja_id) references public.caixa_sessoes (id, loja_id) on delete cascade,
  constraint sangria_em_dinheiro check (tipo = 'venda' or forma = 'dinheiro')
);
create index caixa_movimentos_sessao_idx on public.caixa_movimentos (sessao_id, em);

alter table public.pedidos add column caixa_sessao_id uuid;
create index pedidos_caixa_idx on public.pedidos (caixa_sessao_id);

create trigger caixas_auditar after insert or update or delete on public.caixas for each row execute function private.auditar();
create trigger caixa_sessoes_auditar after insert or update on public.caixa_sessoes for each row execute function private.auditar();

alter table public.caixas enable row level security;
alter table public.caixa_operadores enable row level security;
alter table public.caixa_sessoes enable row level security;
alter table public.caixa_movimentos enable row level security;
create policy caixas_ler on public.caixas for select to authenticated using (private.e_membro(loja_id));
create policy caixa_operadores_ler on public.caixa_operadores for select to authenticated using (private.e_membro(loja_id));
create policy caixa_sessoes_ler on public.caixa_sessoes for select to authenticated
  using (private.tem_permissao(loja_id, 'caixa') or private.tem_permissao(loja_id, 'relatorios'));
-- Movimentos com valores: só quem vê relatórios ou cadastra caixas (fechamento cego para o operador).
create policy caixa_movimentos_ler on public.caixa_movimentos for select to authenticated
  using (private.tem_permissao(loja_id, 'relatorios') or private.tem_permissao(loja_id, 'caixas_cadastro'));
-- Escrita só pelas funções abaixo.

-- Pode operar este caixa agora?
create or replace function private.pode_operar(p_caixa uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.caixas c
     where c.id = p_caixa and c.ativo
       and private.tem_permissao(c.loja_id, 'caixa')
       and (private.e_gestor(c.loja_id)
            or not exists (select 1 from public.caixa_operadores o where o.caixa_id = c.id)
            or exists (select 1 from public.caixa_operadores o where o.caixa_id = c.id and o.user_id = auth.uid())));
$$;

-- Vê valores do caixa (esperado, totais): gestor, relatórios ou cadastro de caixas.
create or replace function private.ve_valores_caixa(p_loja uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.e_gestor(p_loja) or private.tem_permissao(p_loja, 'relatorios') or private.tem_permissao(p_loja, 'caixas_cadastro');
$$;

-- Soma de uma contagem {"centavos": quantidade} em reais. Recusa notas/moedas desconhecidas.
create or replace function private.total_contagem(p_contagem jsonb)
returns numeric
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_total bigint := 0;
  k text;
  q text;
begin
  if p_contagem is null then
    return 0;
  end if;
  if jsonb_typeof(p_contagem) <> 'object' then
    raise exception 'Contagem inválida.' using errcode = 'check_violation';
  end if;
  for k, q in select key, value from jsonb_each_text(p_contagem) loop
    if k not in ('20000', '10000', '5000', '2000', '1000', '500', '200', '100', '50', '25', '10', '5') then
      raise exception 'Cédula ou moeda desconhecida: %', k using errcode = 'check_violation';
    end if;
    if q !~ '^[0-9]{1,5}$' then
      raise exception 'Quantidade inválida na contagem.' using errcode = 'check_violation';
    end if;
    v_total := v_total + k::bigint * q::bigint;
  end loop;
  return v_total / 100.0;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cadastro de caixas
-- ---------------------------------------------------------------------------
create or replace function public.salvar_caixa(p_loja uuid, p_id uuid, p_nome text, p_ativo boolean default true, p_operadores uuid[] default '{}')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_id;
begin
  if not private.tem_permissao(p_loja, 'caixas_cadastro') then
    raise exception 'Você não tem permissão para cadastrar caixas.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from unnest(coalesce(p_operadores, '{}')) u
              where not exists (select 1 from public.membros m where m.loja_id = p_loja and m.user_id = u and m.ativo)) then
    raise exception 'Operador não faz parte da equipe desta loja.' using errcode = 'check_violation';
  end if;
  if v_id is null then
    insert into public.caixas (loja_id, nome, ativo, ordem)
    values (p_loja, btrim(p_nome), coalesce(p_ativo, true), coalesce((select max(ordem) + 1 from public.caixas where loja_id = p_loja), 0))
    returning id into v_id;
  else
    update public.caixas set nome = btrim(p_nome), ativo = coalesce(p_ativo, ativo) where id = v_id and loja_id = p_loja;
    if not found then
      raise exception 'Caixa não encontrado.' using errcode = 'no_data_found';
    end if;
    if not coalesce(p_ativo, true) and exists (select 1 from public.caixa_sessoes s where s.caixa_id = v_id and s.status = 'aberto') then
      raise exception 'Feche o caixa antes de desativá-lo.' using errcode = 'check_violation';
    end if;
  end if;
  delete from public.caixa_operadores where caixa_id = v_id;
  insert into public.caixa_operadores (caixa_id, loja_id, user_id)
  select distinct v_id, p_loja, u from unnest(coalesce(p_operadores, '{}')) u;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Abrir, movimentar e fechar
-- ---------------------------------------------------------------------------
-- p_dados: { contagem?: {"centavos": qtd}, valor?: reais }  (contagem vence o valor)
create or replace function public.abrir_caixa(p_caixa uuid, p_dados jsonb default '{}')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caixa public.caixas;
  v_valor numeric(12, 2);
  v_id    uuid;
begin
  select * into v_caixa from public.caixas where id = p_caixa for update;
  if not found or not private.pode_operar(p_caixa) then
    raise exception 'Você não pode operar este caixa.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.caixa_sessoes where caixa_id = p_caixa and status = 'aberto') then
    raise exception 'Este caixa já está aberto.' using errcode = 'check_violation';
  end if;
  v_valor := case when p_dados ? 'contagem' and jsonb_typeof(p_dados -> 'contagem') = 'object'
                  then private.total_contagem(p_dados -> 'contagem')
                  else coalesce((p_dados ->> 'valor')::numeric, 0) end;
  if v_valor < 0 then
    raise exception 'Valor inválido.' using errcode = 'check_violation';
  end if;

  insert into public.caixa_sessoes (loja_id, caixa_id, numero, aberto_por, abertura, contagem_abertura)
  values (v_caixa.loja_id, p_caixa,
          coalesce((select max(numero) from public.caixa_sessoes where loja_id = v_caixa.loja_id), 0) + 1,
          auth.uid(), v_valor, case when p_dados ? 'contagem' then p_dados -> 'contagem' end)
  returning id into v_id;
  return v_id;
end;
$$;

-- Totais da sessão por forma: vendas, sangrias, suprimentos e o esperado de cada forma.
create or replace function private.totais_sessao(p_sessao uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with s as (select * from public.caixa_sessoes where id = p_sessao),
  v as (
    select m.forma, count(*) filter (where m.tipo = 'venda') as qtd,
           coalesce(sum(m.valor) filter (where m.tipo = 'venda'), 0) as vendas,
           coalesce(sum(m.valor) filter (where m.tipo = 'sangria'), 0) as sangrias,
           coalesce(sum(m.valor) filter (where m.tipo = 'suprimento'), 0) as suprimentos
      from public.caixa_movimentos m where m.sessao_id = p_sessao group by m.forma
  ),
  formas as (
    select f::public.forma_pagamento as forma from unnest(enum_range(null::public.forma_pagamento)) f
  )
  select jsonb_build_object(
    'abertura', (select abertura from s),
    'sangrias', coalesce((select sum(sangrias) from v), 0),
    'suprimentos', coalesce((select sum(suprimentos) from v), 0),
    'formas', coalesce(jsonb_agg(jsonb_build_object(
        'forma', f.forma,
        'quantidade', coalesce(v.qtd, 0),
        'vendas', coalesce(v.vendas, 0),
        'esperado', case when f.forma = 'dinheiro'
                         then (select abertura from s) + coalesce(v.vendas, 0) + coalesce(v.suprimentos, 0) - coalesce(v.sangrias, 0)
                         else coalesce(v.vendas, 0) end)
      order by array_position(enum_range(null::public.forma_pagamento), f.forma))
      filter (where f.forma = 'dinheiro' or v.qtd > 0), '[]'::jsonb))
  from formas f left join v on v.forma = f.forma;
$$;

-- Sangria (retirada) ou suprimento (reforço) de dinheiro.
create or replace function public.movimentar_caixa(p_sessao uuid, p_tipo public.tipo_movimento_caixa, p_valor numeric, p_descricao text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.caixa_sessoes;
  v_dinheiro numeric;
begin
  select * into v_s from public.caixa_sessoes where id = p_sessao for update;
  if not found or not private.pode_operar(v_s.caixa_id) then
    raise exception 'Você não pode operar este caixa.' using errcode = 'insufficient_privilege';
  end if;
  if v_s.status <> 'aberto' then
    raise exception 'O caixa está fechado.' using errcode = 'check_violation';
  end if;
  if p_tipo not in ('sangria', 'suprimento') then
    raise exception 'Use sangria ou suprimento.' using errcode = 'check_violation';
  end if;
  if p_valor is null or p_valor <= 0 then
    raise exception 'Informe um valor maior que zero.' using errcode = 'check_violation';
  end if;
  if p_tipo = 'sangria' then
    select (f ->> 'esperado')::numeric into v_dinheiro
      from jsonb_array_elements(private.totais_sessao(p_sessao) -> 'formas') f where f ->> 'forma' = 'dinheiro';
    if p_valor > coalesce(v_dinheiro, 0) then
      raise exception 'A sangria é maior que o dinheiro que deveria estar no caixa.' using errcode = 'check_violation';
    end if;
  end if;
  insert into public.caixa_movimentos (loja_id, sessao_id, tipo, forma, valor, descricao, por)
  values (v_s.loja_id, p_sessao, p_tipo, 'dinheiro', round(p_valor, 2), nullif(btrim(left(p_descricao, 200)), ''), auth.uid());
end;
$$;

-- Fechamento cego. p_dados: { contagem?: {"centavos": qtd}, informado: {forma: reais}, observacao? }
-- O dinheiro informado é a contagem (quando vier). Devolve o resumo com sobra/falta por forma.
create or replace function public.fechar_caixa(p_sessao uuid, p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s        public.caixa_sessoes;
  v_tot      jsonb;
  v_inf      jsonb := coalesce(p_dados -> 'informado', '{}'::jsonb);
  v_esperado jsonb := '{}'::jsonb;
  f          jsonb;
  k          text;
begin
  select * into v_s from public.caixa_sessoes where id = p_sessao for update;
  if not found or not private.pode_operar(v_s.caixa_id) then
    raise exception 'Você não pode operar este caixa.' using errcode = 'insufficient_privilege';
  end if;
  if v_s.status <> 'aberto' then
    raise exception 'Este caixa já foi fechado.' using errcode = 'check_violation';
  end if;
  if jsonb_typeof(v_inf) <> 'object' then
    raise exception 'Valores informados inválidos.' using errcode = 'check_violation';
  end if;
  for k in select jsonb_object_keys(v_inf) loop
    if k not in (select unnest(enum_range(null::public.forma_pagamento))::text) or k = 'online' then
      raise exception 'Forma de pagamento inválida: %', k using errcode = 'check_violation';
    end if;
    if (v_inf ->> k) !~ '^[0-9]+(\.[0-9]{1,2})?$' then
      raise exception 'Valor inválido em %.', k using errcode = 'check_violation';
    end if;
  end loop;
  if p_dados ? 'contagem' and jsonb_typeof(p_dados -> 'contagem') = 'object' then
    v_inf := v_inf || jsonb_build_object('dinheiro', private.total_contagem(p_dados -> 'contagem'));
  end if;
  if not v_inf ? 'dinheiro' then
    raise exception 'Informe o dinheiro contado na gaveta.' using errcode = 'check_violation';
  end if;

  v_tot := private.totais_sessao(p_sessao);
  for f in select jsonb_array_elements(v_tot -> 'formas') loop
    if f ->> 'forma' <> 'online' then
      v_esperado := v_esperado || jsonb_build_object(f ->> 'forma', (f ->> 'esperado')::numeric);
    end if;
  end loop;

  update public.caixa_sessoes set
    status = 'fechado', fechado_por = auth.uid(), fechado_em = now(),
    contagem_fechamento = case when p_dados ? 'contagem' then p_dados -> 'contagem' end,
    informado = v_inf, esperado = v_esperado,
    observacao = nullif(btrim(left(p_dados ->> 'observacao', 500)), '')
  where id = p_sessao;

  return public.resumo_caixa(p_sessao);
end;
$$;

-- Resumo de uma sessão para a tela. Enquanto aberta, quem só opera vê quantidades, não valores
-- (fechamento cego). Fechada, todos com acesso ao caixa veem o resultado.
create or replace function public.resumo_caixa(p_sessao uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_s     public.caixa_sessoes;
  v_ve    boolean;
  v_tot   jsonb;
  v_dif   jsonb := '[]'::jsonb;
  k       text;
begin
  select * into v_s from public.caixa_sessoes where id = p_sessao;
  if not found or not (private.tem_permissao(v_s.loja_id, 'caixa') or private.tem_permissao(v_s.loja_id, 'relatorios')) then
    return null;
  end if;
  v_ve := private.ve_valores_caixa(v_s.loja_id) or v_s.status = 'fechado';
  v_tot := private.totais_sessao(p_sessao);

  if v_s.status = 'fechado' then
    for k in select distinct x from (select jsonb_object_keys(v_s.esperado) x union select jsonb_object_keys(v_s.informado)) t loop
      v_dif := v_dif || jsonb_build_array(jsonb_build_object(
        'forma', k,
        'esperado', coalesce((v_s.esperado ->> k)::numeric, 0),
        'informado', coalesce((v_s.informado ->> k)::numeric, 0),
        'diferenca', coalesce((v_s.informado ->> k)::numeric, 0) - coalesce((v_s.esperado ->> k)::numeric, 0)));
    end loop;
  end if;

  return jsonb_build_object(
    'id', v_s.id, 'numero', v_s.numero, 'status', v_s.status,
    'caixa', (select nome from public.caixas where id = v_s.caixa_id), 'caixa_id', v_s.caixa_id,
    'aberto_em', v_s.aberto_em, 'fechado_em', v_s.fechado_em,
    'aberto_por', (select m.nome from public.membros m where m.user_id = v_s.aberto_por and m.loja_id = v_s.loja_id),
    'fechado_por', (select m.nome from public.membros m where m.user_id = v_s.fechado_por and m.loja_id = v_s.loja_id),
    'abertura', v_s.abertura,
    've_valores', v_ve,
    'observacao', v_s.observacao,
    'formas', (select coalesce(jsonb_agg(case when v_ve then f else f - 'vendas' - 'esperado' end), '[]'::jsonb) from jsonb_array_elements(v_tot -> 'formas') f),
    'sangrias', case when v_ve then v_tot -> 'sangrias' end,
    'suprimentos', case when v_ve then v_tot -> 'suprimentos' end,
    'pedidos', (select count(*) from public.pedidos p where p.caixa_sessao_id = v_s.id),
    'movimentos', coalesce((
      select jsonb_agg(jsonb_build_object('tipo', m.tipo, 'valor', m.valor, 'descricao', m.descricao, 'em', m.em,
                                          'por', (select mb.nome from public.membros mb where mb.user_id = m.por and mb.loja_id = m.loja_id))
                       order by m.em)
        from public.caixa_movimentos m where m.sessao_id = v_s.id and m.tipo <> 'venda'), '[]'::jsonb),
    'diferencas', case when v_s.status = 'fechado' then v_dif end
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Venda entra no caixa quando o pedido é concluído.
-- Qual caixa: o aberto que a pessoa que concluiu opera (ou abriu); senão o aberto mais antigo da loja;
-- sem caixa aberto, o pedido fica "sem caixa" até alguém vincular (vincular_pedidos_sem_caixa).
-- Pago online não entra na gaveta, mas aparece no resumo como informativo.
-- ---------------------------------------------------------------------------
create or replace function private.registrar_venda_caixa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sessao uuid;
begin
  if new.status = 'concluido' and old.status is distinct from 'concluido' and new.caixa_sessao_id is null then
    select s.id into v_sessao
      from public.caixa_sessoes s
     where s.loja_id = new.loja_id and s.status = 'aberto'
     order by (s.aberto_por = auth.uid()
               or exists (select 1 from public.caixa_operadores o where o.caixa_id = s.caixa_id and o.user_id = auth.uid())) desc,
              s.aberto_em
     limit 1;
    if v_sessao is not null and new.total > 0 then
      new.caixa_sessao_id := v_sessao;
      insert into public.caixa_movimentos (loja_id, sessao_id, tipo, forma, valor, descricao, pedido_id, por)
      values (new.loja_id, v_sessao, 'venda', new.pagamento, new.total, 'Pedido #' || new.numero, new.id, auth.uid());
    end if;
  end if;
  return new;
end;
$$;
create trigger pedidos_venda_caixa before update of status on public.pedidos
  for each row execute function private.registrar_venda_caixa();

-- Pedidos concluídos nas últimas 24 h que ficaram sem caixa entram nesta sessão.
create or replace function public.vincular_pedidos_sem_caixa(p_sessao uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_s public.caixa_sessoes;
  v_n integer;
begin
  select * into v_s from public.caixa_sessoes where id = p_sessao for update;
  if not found or not private.pode_operar(v_s.caixa_id) then
    raise exception 'Você não pode operar este caixa.' using errcode = 'insufficient_privilege';
  end if;
  if v_s.status <> 'aberto' then
    raise exception 'O caixa está fechado.' using errcode = 'check_violation';
  end if;
  with p as (
    update public.pedidos set caixa_sessao_id = p_sessao
     where loja_id = v_s.loja_id and status = 'concluido' and caixa_sessao_id is null and total > 0
       and concluido_em > now() - interval '24 hours'
    returning id, numero, pagamento, total
  )
  insert into public.caixa_movimentos (loja_id, sessao_id, tipo, forma, valor, descricao, pedido_id, por)
  select v_s.loja_id, p_sessao, 'venda', p.pagamento, p.total, 'Pedido #' || p.numero, p.id, auth.uid() from p;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Caixas que a pessoa pode operar agora, com a sessão aberta (se houver) e pedidos sem caixa.
create or replace function public.meus_caixas(p_loja uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'caixas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'nome', c.nome,
               'pode_operar', private.pode_operar(c.id),
               'operadores', coalesce((select jsonb_agg(m.nome order by m.nome) from public.caixa_operadores o
                                         join public.membros m on m.user_id = o.user_id and m.loja_id = c.loja_id
                                        where o.caixa_id = c.id), '[]'::jsonb),
               'sessao', (select jsonb_build_object('id', s.id, 'numero', s.numero, 'aberto_em', s.aberto_em,
                                                    'aberto_por', (select m.nome from public.membros m where m.user_id = s.aberto_por and m.loja_id = s.loja_id))
                            from public.caixa_sessoes s where s.caixa_id = c.id and s.status = 'aberto'))
             order by c.ordem, c.nome)
        from public.caixas c where c.loja_id = p_loja and c.ativo), '[]'::jsonb),
    'sem_caixa', (select count(*) from public.pedidos p
                   where p.loja_id = p_loja and p.status = 'concluido' and p.caixa_sessao_id is null and p.total > 0
                     and p.concluido_em > now() - interval '24 hours'),
    've_valores', private.ve_valores_caixa(p_loja),
    'cadastra', private.tem_permissao(p_loja, 'caixas_cadastro')
  )
  where private.tem_permissao(p_loja, 'caixa') or private.tem_permissao(p_loja, 'relatorios');
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.registrar_usuario_caixa(uuid, uuid, text, text, public.papel_membro, uuid)',
    'public.pode_gerir_usuario(uuid, uuid)',
    'public.posso(uuid, text)',
    'public.salvar_caixa(uuid, uuid, text, boolean, uuid[])',
    'public.abrir_caixa(uuid, jsonb)',
    'public.movimentar_caixa(uuid, public.tipo_movimento_caixa, numeric, text)',
    'public.fechar_caixa(uuid, jsonb)',
    'public.resumo_caixa(uuid)',
    'public.vincular_pedidos_sem_caixa(uuid)',
    'public.meus_caixas(uuid)'] loop
    execute format('grant execute on function %s to authenticated', f);
    execute format('revoke execute on function %s from anon, public', f);
  end loop;
  foreach f in array array[
    'private.pode_operar(uuid)', 'private.ve_valores_caixa(uuid)', 'private.total_contagem(jsonb)',
    'private.totais_sessao(uuid)', 'private.registrar_venda_caixa()', 'private.dominio_usuarios()'] loop
    execute format('revoke execute on function %s from anon, public', f);
  end loop;
end;
$$;

-- Lojas que já existem ganham um "Caixa 1" (quem tem permissão "caixa" opera).
insert into public.caixas (loja_id, nome) select l.id, 'Caixa 1' from public.lojas l
 where not exists (select 1 from public.caixas c where c.loja_id = l.id);

-- Loja nova já nasce com um caixa.
create or replace function private.caixa_inicial()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.caixas (loja_id, nome) values (new.id, 'Caixa 1');
  return new;
end;
$$;
create trigger lojas_caixa_inicial after insert on public.lojas for each row execute function private.caixa_inicial();
revoke execute on function private.caixa_inicial() from anon, public;
