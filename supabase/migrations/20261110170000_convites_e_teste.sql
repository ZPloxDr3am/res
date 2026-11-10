-- Etapa 1 da análise (D-082): cadastro só com convite, teste grátis com prazo e bloqueio de
-- pedidos novos quando a conta vence; painel da equipe RES para convites e contas.
-- Pode rodar de novo sem quebrar.

-- 1. Equipe RES (quem administra a plataforma). Quem entra aqui é liberado à mão pelo dono
--    no editor SQL (nada de e-mail no código): insert into private.equipe_res (user_id) select id from auth.users where email = '...';
create table if not exists private.equipe_res (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);
create or replace function private.e_equipe_res()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.equipe_res where user_id = auth.uid());
$$;
create or replace function public.sou_equipe_res()
returns boolean language sql stable security definer set search_path = '' as $$ select private.e_equipe_res(); $$;
grant execute on function public.sou_equipe_res() to authenticated;

-- 2. Configuração da plataforma (chave → valor)
create table if not exists private.config_plataforma (
  chave text primary key,
  valor text not null
);
insert into private.config_plataforma (chave, valor) values ('cadastro_modo', 'convite') on conflict (chave) do nothing;
create or replace function private.config_res(p_chave text, p_padrao text)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select valor from private.config_plataforma where chave = p_chave), p_padrao);
$$;
create or replace function public.cadastro_modo()
returns text language sql stable security definer set search_path = '' as $$ select private.config_res('cadastro_modo', 'convite'); $$;
grant execute on function public.cadastro_modo() to anon, authenticated;

-- 3. Convites de cadastro (código curto, uso único, com prazo)
create table if not exists public.convites_cadastro (
  codigo     text primary key check (codigo ~ '^[A-Z0-9]{6,12}$'),
  nota       text check (nota is null or length(nota) <= 200),
  dias_teste integer not null default 14 check (dias_teste between 1 and 90),
  criado_por uuid references auth.users (id) on delete set null,
  criado_em  timestamptz not null default now(),
  expira_em  timestamptz not null default now() + interval '30 days',
  usado_em   timestamptz,
  usado_por  uuid references auth.users (id) on delete set null,
  conta_id   uuid references public.contas (id) on delete set null
);
alter table public.convites_cadastro enable row level security;
drop policy if exists convites_equipe on public.convites_cadastro;
create policy convites_equipe on public.convites_cadastro for select to authenticated using (private.e_equipe_res());
grant select on public.convites_cadastro to authenticated;
revoke all on public.convites_cadastro from anon;

-- convite ainda vale? (a tela de cadastro confere antes de mostrar o formulário)
create or replace function public.convite_valido(p_codigo text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.convites_cadastro
                  where codigo = upper(btrim(coalesce(p_codigo, ''))) and usado_em is null and expira_em >= now());
$$;
revoke execute on function public.convite_valido(text) from public;
grant execute on function public.convite_valido(text) to anon, authenticated;

create or replace function public.criar_convite(p_nota text default null, p_dias_teste integer default 14, p_validade_dias integer default 30)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cod text;
  v_alfa constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES cria convites.' using errcode = 'insufficient_privilege';
  end if;
  loop
    v_cod := (select string_agg(substr(v_alfa, 1 + floor(random() * length(v_alfa))::int, 1), '') from generate_series(1, 8));
    exit when not exists (select 1 from public.convites_cadastro where codigo = v_cod);
  end loop;
  insert into public.convites_cadastro (codigo, nota, dias_teste, criado_por, expira_em)
  values (v_cod, nullif(left(btrim(coalesce(p_nota, '')), 200), ''), greatest(1, least(90, coalesce(p_dias_teste, 14))), auth.uid(),
          now() + make_interval(days => greatest(1, least(180, coalesce(p_validade_dias, 30)))));
  return v_cod;
end;
$$;
revoke execute on function public.criar_convite(text, integer, integer) from public, anon;
grant execute on function public.criar_convite(text, integer, integer) to authenticated;

create or replace function public.cancelar_convite(p_codigo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES mexe em convites.' using errcode = 'insufficient_privilege';
  end if;
  update public.convites_cadastro set expira_em = now() - interval '1 second' where codigo = p_codigo and usado_em is null;
end;
$$;
revoke execute on function public.cancelar_convite(text) from public, anon;
grant execute on function public.cancelar_convite(text) to authenticated;

-- 4. Situação da conta: teste com prazo, ativa (paga até), suspensa
alter table public.contas add column if not exists situacao text not null default 'ativa';
alter table public.contas add column if not exists teste_ate timestamptz;
alter table public.contas add column if not exists pago_ate timestamptz;
alter table public.contas add column if not exists situacao_nota text;
do $$ begin
  alter table public.contas add constraint contas_situacao check (situacao in ('teste', 'ativa', 'suspensa'));
exception when duplicate_object then null;
end $$;

-- liberada = pode receber pedido novo. Ativa sem "pago até" = piloto / sem prazo.
create or replace function private.conta_liberada(p_conta uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((
    select case c.situacao
             when 'ativa' then c.pago_ate is null or c.pago_ate >= now()
             when 'teste' then c.teste_ate is null or c.teste_ate >= now()
             else false end
      from public.contas c where c.id = p_conta), true);
$$;

-- pedido novo só entra com a conta liberada (cardápio digital, painel, iFood, API). Os dados ficam.
create or replace function private.pedido_conta_liberada()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_conta uuid;
begin
  select conta_id into v_conta from public.lojas where id = new.loja_id;
  if v_conta is not null and not private.conta_liberada(v_conta) then
    raise exception 'O acesso ao RES desta loja está pausado (teste ou assinatura vencida). Fale com o time do RES para reativar.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists pedidos_0_conta_liberada on public.pedidos;
create trigger pedidos_0_conta_liberada before insert on public.pedidos for each row execute function private.pedido_conta_liberada();

-- situação da conta da loja (faixa no painel)
create or replace function public.situacao_conta(p_loja uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('situacao', c.situacao, 'teste_ate', c.teste_ate, 'pago_ate', c.pago_ate, 'liberada', private.conta_liberada(c.id))
    from public.lojas l join public.contas c on c.id = l.conta_id
   where l.id = p_loja and private.e_membro(p_loja);
$$;
grant execute on function public.situacao_conta(uuid) to authenticated;

-- 5. Painel da equipe RES: contas e ações
create or replace function public.contas_da_plataforma()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', c.id, 'nome', c.nome, 'origem', c.origem, 'situacao', c.situacao, 'teste_ate', c.teste_ate, 'pago_ate', c.pago_ate,
             'liberada', private.conta_liberada(c.id), 'criado_em', c.criado_em, 'limite_lojas', c.limite_lojas,
             'responsavel', c.responsavel_nome, 'telefone', c.responsavel_telefone, 'email', c.responsavel_email,
             'comercial', c.info_comercial, 'nota', c.situacao_nota,
             'lojas', (select jsonb_agg(jsonb_build_object('nome', l.nome, 'cidade', l.cidade, 'uf', l.uf,
                                        'pedidos_7d', (select count(*) from public.pedidos p where p.loja_id = l.id and p.criado_em > now() - interval '7 days'),
                                        'cardapio_aberto', exists (select 1 from public.marcas m where m.loja_id = l.id and m.status_cardapio <> 'fechado'))
                                        order by l.nome)
                         from public.lojas l where l.conta_id = c.id))
           order by c.criado_em desc)
      from public.contas c), '[]'::jsonb);
end;
$$;
grant execute on function public.contas_da_plataforma() to authenticated;

create or replace function public.mudar_situacao_conta(p_conta uuid, p_acao text, p_dias integer default null, p_nota text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.contas where id = p_conta) then
    raise exception 'Conta não encontrada.' using errcode = 'no_data_found';
  end if;
  if p_acao = 'ativar' then          -- pagou: ativa até hoje + N dias (sem dias = sem prazo)
    update public.contas set situacao = 'ativa', pago_ate = case when p_dias is null then null else now() + make_interval(days => p_dias) end where id = p_conta;
  elsif p_acao = 'estender_teste' then
    update public.contas set situacao = 'teste', teste_ate = greatest(coalesce(teste_ate, now()), now()) + make_interval(days => coalesce(p_dias, 7)) where id = p_conta;
  elsif p_acao = 'suspender' then
    update public.contas set situacao = 'suspensa' where id = p_conta;
  else
    raise exception 'Ação inválida.' using errcode = 'check_violation';
  end if;
  if p_nota is not null then
    update public.contas set situacao_nota = left(btrim(p_nota), 300) where id = p_conta;
  end if;
end;
$$;
revoke execute on function public.mudar_situacao_conta(uuid, text, integer, text) from public, anon;
grant execute on function public.mudar_situacao_conta(uuid, text, integer, text) to authenticated;

create or replace function public.definir_cadastro_modo(p_modo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  if p_modo not in ('convite', 'aberto') then
    raise exception 'Modo inválido.' using errcode = 'check_violation';
  end if;
  insert into private.config_plataforma (chave, valor) values ('cadastro_modo', p_modo)
  on conflict (chave) do update set valor = excluded.valor;
end;
$$;
revoke execute on function public.definir_cadastro_modo(text) from public, anon;
grant execute on function public.definir_cadastro_modo(text) to authenticated;


-- 7. Conta nova só nasce pelo cadastro (com convite e teste) ou pela equipe RES. Quem já é titular
--    continua criando lojas na própria conta (respeitando o pacote).
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
  select conta_id into v_conta from public.contas_titulares where user_id = v_user order by criado_em limit 1;
  if v_conta is null then
    if coalesce(current_setting('res.cadastro_ok', true), '') <> '1' and not private.e_equipe_res()
       and private.config_res('cadastro_modo', 'convite') <> 'aberto' then
      raise exception 'Para criar a conta do restaurante, use o cadastro com o convite do time do RES.' using errcode = 'insufficient_privilege';
    end if;
    insert into public.contas (nome, limite_lojas, limite_cardapios) values (p_nome, 1, 1) returning id into v_conta;
    insert into public.contas_titulares (conta_id, user_id) values (v_conta, v_user);
    -- conta nova fora do cadastro (equipe ou modo aberto) também começa em teste
    if coalesce(current_setting('res.cadastro_ok', true), '') <> '1' then
      update public.contas set situacao = 'teste', teste_ate = now() + interval '14 days' where id = v_conta;
    end if;
  end if;
  return private.montar_loja(v_conta, p_nome, p_marca, p_slug, p_nome_dono);
end;
$$;

-- 6. Cadastro: exige convite (modo convite), marca o convite e começa o teste
create or replace function public.criar_loja_cadastro(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user  uuid := auth.uid();
  v_loja  uuid;
  v_conta uuid;
  e       jsonb := coalesce(p -> 'empresa', '{}'::jsonb);
  v_doc   text := regexp_replace(coalesce(e ->> 'documento', ''), '\D', '', 'g');
  v_zap   text := regexp_replace(coalesce(p ->> 'whatsapp', ''), '\D', '', 'g');
  v_tel   text := regexp_replace(coalesce(e ->> 'telefone', ''), '\D', '', 'g');
  v_cep   text := regexp_replace(coalesce(e ->> 'cep', ''), '\D', '', 'g');
  v_nome  text := btrim(coalesce(nullif(e ->> 'nome_fantasia', ''), p ->> 'restaurante'));
  v_conv  public.convites_cadastro;
begin
  if v_user is null then
    raise exception 'É preciso estar autenticado' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.membros where user_id = v_user and ativo) then
    raise exception 'Você já tem uma loja no RES.' using errcode = 'check_violation';
  end if;
  -- D-082: cadastro só com convite válido (enquanto a cobrança não abre o cadastro para todos)
  if private.config_res('cadastro_modo', 'convite') <> 'aberto' then
    select * into v_conv from public.convites_cadastro
     where codigo = upper(btrim(coalesce(p ->> 'convite', ''))) for update;
    if not found or v_conv.usado_em is not null or v_conv.expira_em < now() then
      raise exception 'Convite inválido, já usado ou vencido. Peça um novo ao time do RES.' using errcode = 'check_violation';
    end if;
  end if;
  if coalesce(p ->> 'aceite_versao', '') = '' then
    raise exception 'É preciso aceitar os Termos de Uso e a Política de Privacidade.' using errcode = 'check_violation';
  end if;
  if length(v_zap) not between 10 and 13 then
    raise exception 'WhatsApp do responsável inválido (com DDD).' using errcode = 'check_violation';
  end if;
  if not private.documento_valido(v_doc) then
    raise exception '% inválido.', case when length(v_doc) = 11 then 'CPF' else 'CNPJ' end using errcode = 'check_violation';
  end if;
  if length(v_doc) = 14 and coalesce(btrim(e ->> 'razao_social'), '') = '' then
    raise exception 'Informe a razão social.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.lojas where (length(v_doc) = 14 and cnpj = v_doc) or (length(v_doc) = 11 and cpf = v_doc)) then
    raise exception 'Esse % já tem conta no RES. Fale com a gente para liberar outra loja.', case when length(v_doc) = 11 then 'CPF' else 'CNPJ' end
      using errcode = 'unique_violation';
  end if;
  if length(v_tel) not between 10 and 13 then
    raise exception 'Telefone da loja inválido (com DDD).' using errcode = 'check_violation';
  end if;
  if length(v_cep) <> 8 or coalesce(btrim(e ->> 'logradouro'), '') = '' or coalesce(btrim(e ->> 'bairro'), '') = ''
     or coalesce(btrim(e ->> 'cidade'), '') = '' or coalesce(e ->> 'uf', '') !~ '^[A-Z]{2}$' then
    raise exception 'Endereço incompleto (CEP, rua, bairro, cidade e UF).' using errcode = 'check_violation';
  end if;

  perform set_config('res.cadastro_ok', '1', true);
  v_loja := public.criar_loja(left(v_nome, 120), p ->> 'restaurante', p ->> 'slug', p ->> 'nome');
  perform set_config('res.cadastro_ok', '', true);
  select conta_id into v_conta from public.lojas where id = v_loja;
  update public.contas
     set origem = 'cadastro', aceite_termos_em = now(), aceite_termos_versao = left(p ->> 'aceite_versao', 20), aceite_termos_por = v_user,
         nome = left(coalesce(nullif(btrim(e ->> 'razao_social'), ''), v_nome), 120),
         responsavel_nome = left(btrim(p ->> 'nome'), 120),
         responsavel_telefone = case when length(v_zap) <= 11 then '55' || v_zap else v_zap end,
         responsavel_email = (select email from auth.users where id = v_user),
         info_comercial = coalesce(p -> 'comercial', '{}'::jsonb),
         situacao = 'teste', teste_ate = now() + make_interval(days => coalesce(v_conv.dias_teste, 14))
   where id = v_conta;
  if v_conv.codigo is not null then
    update public.convites_cadastro set usado_em = now(), usado_por = v_user, conta_id = v_conta where codigo = v_conv.codigo;
  end if;
  update public.lojas
     set cnpj = case when length(v_doc) = 14 then v_doc end,
         cpf = case when length(v_doc) = 11 then v_doc end,
         razao_social = nullif(left(btrim(e ->> 'razao_social'), 160), ''),
         nome_fantasia = nullif(left(btrim(e ->> 'nome_fantasia'), 120), ''),
         inscricao_estadual = nullif(left(btrim(e ->> 'inscricao_estadual'), 20), ''),
         telefone = case when length(v_tel) <= 11 then '55' || v_tel else v_tel end,
         email_contato = case when coalesce(e ->> 'email', '') ~ '^\S+@\S+\.\S+$' then lower(btrim(e ->> 'email')) end,
         cep = v_cep,
         logradouro = left(btrim(e ->> 'logradouro'), 160),
         numero = nullif(left(btrim(e ->> 'numero'), 20), ''),
         complemento = nullif(left(btrim(e ->> 'complemento'), 80), ''),
         bairro = left(btrim(e ->> 'bairro'), 80),
         cidade = left(btrim(e ->> 'cidade'), 80),
         uf = e ->> 'uf',
         endereco = left(concat_ws(' - ', concat_ws(', ', btrim(e ->> 'logradouro'), coalesce(nullif(btrim(e ->> 'numero'), ''), 's/n'), nullif(btrim(e ->> 'complemento'), '')), btrim(e ->> 'bairro')), 200),
         lat = case when (e ->> 'lat') ~ '^-?[0-9.]+$' and abs((e ->> 'lat')::float) <= 90 then (e ->> 'lat')::float end,
         lng = case when (e ->> 'lng') ~ '^-?[0-9.]+$' and abs((e ->> 'lng')::float) <= 180 then (e ->> 'lng')::float end,
         tipo_restaurante = case when p ->> 'tipo' in ('pizzaria', 'hamburgueria', 'lanchonete', 'restaurante', 'japones', 'acai', 'doceria', 'outro') then p ->> 'tipo' end
   where id = v_loja;
  -- WhatsApp do cardápio: o celular da loja; se a loja só tem fixo, o do responsável
  update public.marcas
     set whatsapp = case when length(v_tel) = 11 then '55' || v_tel
                         when length(v_tel) = 13 then v_tel
                         when length(v_zap) <= 11 then '55' || v_zap else v_zap end,
         status_cardapio = 'fechado'
   where loja_id = v_loja;
  return v_loja;
end;
$$;
revoke execute on function public.criar_loja_cadastro(jsonb) from public, anon;
grant execute on function public.criar_loja_cadastro(jsonb) to authenticated;
