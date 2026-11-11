-- Cadastro completo da empresa (D-077): CNPJ (ou CPF de quem ainda não tem), razão social, endereço
-- estruturado, telefones e dados do responsável; respostas comerciais na conta. Pode rodar de novo.

alter table public.lojas add column if not exists razao_social text check (razao_social is null or length(btrim(razao_social)) between 2 and 160);
alter table public.lojas add column if not exists nome_fantasia text check (nome_fantasia is null or length(btrim(nome_fantasia)) between 1 and 120);
alter table public.lojas add column if not exists cpf text check (cpf is null or cpf ~ '^[0-9]{11}$');
alter table public.lojas add column if not exists inscricao_estadual text check (inscricao_estadual is null or length(inscricao_estadual) <= 20);
alter table public.lojas add column if not exists telefone text check (telefone is null or telefone ~ '^[0-9]{10,13}$');
alter table public.lojas add column if not exists email_contato text check (email_contato is null or email_contato ~ '^\S+@\S+\.\S+$');
alter table public.lojas add column if not exists cep text check (cep is null or cep ~ '^[0-9]{8}$');
alter table public.lojas add column if not exists logradouro text check (logradouro is null or length(logradouro) <= 160);
alter table public.lojas add column if not exists numero text check (numero is null or length(numero) <= 20);
alter table public.lojas add column if not exists complemento text check (complemento is null or length(complemento) <= 80);
alter table public.lojas add column if not exists bairro text check (bairro is null or length(bairro) <= 80);
alter table public.lojas add column if not exists uf text check (uf is null or uf ~ '^[A-Z]{2}$');

alter table public.contas add column if not exists responsavel_nome text;
alter table public.contas add column if not exists responsavel_telefone text check (responsavel_telefone is null or responsavel_telefone ~ '^[0-9]{10,13}$');
alter table public.contas add column if not exists responsavel_email text;
alter table public.contas add column if not exists info_comercial jsonb not null default '{}'::jsonb;

-- um CNPJ (ou CPF) só abre uma conta pelo cadastro (evita teste grátis repetido)
create index if not exists lojas_cnpj_idx on public.lojas (cnpj) where cnpj is not null;
create index if not exists lojas_cpf_idx on public.lojas (cpf) where cpf is not null;

-- Validação de CNPJ/CPF (dígitos verificadores), igual à do @res/core
create or replace function private.documento_valido(p text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  d  text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
  s  int;
  r  int;
  i  int;
  pe int[];
begin
  if d ~ '^(\d)\1*$' then
    return false;
  end if;
  if length(d) = 11 then
    for k in 9..10 loop
      s := 0;
      for i in 1..k loop s := s + substr(d, i, 1)::int * (k + 2 - i); end loop;
      r := (s * 10) % 11;
      if r = 10 then r := 0; end if;
      if r <> substr(d, k + 1, 1)::int then return false; end if;
    end loop;
    return true;
  elsif length(d) = 14 then
    for k in 12..13 loop
      pe := case when k = 12 then array[5,4,3,2,9,8,7,6,5,4,3,2] else array[6,5,4,3,2,9,8,7,6,5,4,3,2] end;
      s := 0;
      for i in 1..k loop s := s + substr(d, i, 1)::int * pe[i]; end loop;
      r := s % 11;
      r := case when r < 2 then 0 else 11 - r end;
      if r <> substr(d, k + 1, 1)::int then return false; end if;
    end loop;
    return true;
  end if;
  return false;
end;
$$;

-- Cadastro sozinho, agora com a empresa completa (mesma assinatura da D-076)
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
begin
  if v_user is null then
    raise exception 'É preciso estar autenticado' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.membros where user_id = v_user and ativo) then
    raise exception 'Você já tem uma loja no RES.' using errcode = 'check_violation';
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

  v_loja := public.criar_loja(left(v_nome, 120), p ->> 'restaurante', p ->> 'slug', p ->> 'nome');
  select conta_id into v_conta from public.lojas where id = v_loja;
  update public.contas
     set origem = 'cadastro', aceite_termos_em = now(), aceite_termos_versao = left(p ->> 'aceite_versao', 20), aceite_termos_por = v_user,
         nome = left(coalesce(nullif(btrim(e ->> 'razao_social'), ''), v_nome), 120),
         responsavel_nome = left(btrim(p ->> 'nome'), 120),
         responsavel_telefone = case when length(v_zap) <= 11 then '55' || v_zap else v_zap end,
         responsavel_email = (select email from auth.users where id = v_user),
         info_comercial = coalesce(p -> 'comercial', '{}'::jsonb)
   where id = v_conta;
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

-- Lojas e equipe → Dados da empresa: editar CNPJ/CPF, razão social, telefones e endereço
create or replace function public.salvar_dados_empresa(p_loja uuid, e jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc text := regexp_replace(coalesce(e ->> 'documento', ''), '\D', '', 'g');
  v_tel text := regexp_replace(coalesce(e ->> 'telefone', ''), '\D', '', 'g');
  v_cep text := regexp_replace(coalesce(e ->> 'cep', ''), '\D', '', 'g');
  v_conta uuid;
begin
  if not private.tem_permissao(p_loja, 'dados_empresa') then
    raise exception 'Sem permissão para os dados da empresa.' using errcode = 'insufficient_privilege';
  end if;
  select conta_id into v_conta from public.lojas where id = p_loja;
  if v_doc <> '' and not private.documento_valido(v_doc) then
    raise exception '% inválido.', case when length(v_doc) = 11 then 'CPF' else 'CNPJ' end using errcode = 'check_violation';
  end if;
  if length(v_doc) = 14 and coalesce(btrim(e ->> 'razao_social'), '') = '' then
    raise exception 'Informe a razão social.' using errcode = 'check_violation';
  end if;
  -- o mesmo documento pode estar em lojas do mesmo grupo, nunca de outro cliente do RES
  if v_doc <> '' and exists (select 1 from public.lojas where id <> p_loja and conta_id is distinct from v_conta and (cnpj = v_doc or cpf = v_doc)) then
    raise exception 'Esse documento já está em outra conta do RES.' using errcode = 'unique_violation';
  end if;
  if v_tel <> '' and length(v_tel) not between 10 and 13 then
    raise exception 'Telefone da loja inválido (com DDD).' using errcode = 'check_violation';
  end if;
  if v_cep <> '' and length(v_cep) <> 8 then
    raise exception 'CEP inválido.' using errcode = 'check_violation';
  end if;
  if coalesce(e ->> 'uf', '') <> '' and e ->> 'uf' !~ '^[A-Z]{2}$' then
    raise exception 'UF inválida.' using errcode = 'check_violation';
  end if;
  update public.lojas
     set cnpj = case when length(v_doc) = 14 then v_doc end,
         cpf = case when length(v_doc) = 11 then v_doc end,
         razao_social = case when length(v_doc) = 14 then nullif(left(btrim(e ->> 'razao_social'), 160), '') end,
         nome_fantasia = nullif(left(btrim(e ->> 'nome_fantasia'), 120), ''),
         inscricao_estadual = case when length(v_doc) = 14 then nullif(left(btrim(e ->> 'inscricao_estadual'), 20), '') end,
         telefone = case when v_tel = '' then null when length(v_tel) <= 11 then '55' || v_tel else v_tel end,
         email_contato = case when coalesce(e ->> 'email', '') ~ '^\S+@\S+\.\S+$' then lower(btrim(e ->> 'email')) end,
         cep = nullif(v_cep, ''),
         logradouro = nullif(left(btrim(e ->> 'logradouro'), 160), ''),
         numero = nullif(left(btrim(e ->> 'numero'), 20), ''),
         complemento = nullif(left(btrim(e ->> 'complemento'), 80), ''),
         bairro = nullif(left(btrim(e ->> 'bairro'), 80), ''),
         cidade = coalesce(nullif(left(btrim(e ->> 'cidade'), 80), ''), cidade),
         uf = nullif(e ->> 'uf', ''),
         endereco = case when coalesce(btrim(e ->> 'logradouro'), '') = '' then endereco
                         else left(concat_ws(' - ', concat_ws(', ', btrim(e ->> 'logradouro'), coalesce(nullif(btrim(e ->> 'numero'), ''), 's/n'), nullif(btrim(e ->> 'complemento'), '')), nullif(btrim(e ->> 'bairro'), '')), 200) end,
         -- endereço novo com ponto do CEP: atualiza o ponto de saída das entregas
         lat = case when (e ->> 'lat') ~ '^-?[0-9.]+$' then (e ->> 'lat')::float else lat end,
         lng = case when (e ->> 'lng') ~ '^-?[0-9.]+$' then (e ->> 'lng')::float else lng end
   where id = p_loja;
end;
$$;
revoke execute on function public.salvar_dados_empresa(uuid, jsonb) from public, anon;
grant execute on function public.salvar_dados_empresa(uuid, jsonb) to authenticated;
