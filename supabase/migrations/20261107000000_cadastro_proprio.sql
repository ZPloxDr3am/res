-- Cadastro sozinho (D-076): o restaurante cria a conta e a loja pelo site, começa com o cardápio
-- fechado e segue os "Primeiros passos" até abrir. Pode rodar de novo sem quebrar.

alter table public.lojas add column if not exists tipo_restaurante text;
-- lojas que já existem não veem "Primeiros passos" (entra true nelas); as novas começam com false
alter table public.lojas add column if not exists primeiros_passos_ocultos boolean not null default true;
alter table public.lojas alter column primeiros_passos_ocultos set default false;
alter table public.contas add column if not exists origem text not null default 'equipe';
alter table public.contas add column if not exists aceite_termos_em timestamptz;
alter table public.contas add column if not exists aceite_termos_versao text;
alter table public.contas add column if not exists aceite_termos_por uuid references auth.users (id) on delete set null;
do $$ begin
  alter table public.lojas add constraint lojas_tipo_restaurante check (tipo_restaurante is null or tipo_restaurante in ('pizzaria', 'hamburgueria', 'lanchonete', 'restaurante', 'japones', 'acai', 'doceria', 'outro'));
exception when duplicate_object then null;
end $$;

-- 1. Endereço do cardápio livre? (a tela do cadastro confere enquanto a pessoa digita)
create or replace function public.slug_disponivel(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(btrim(p_slug)) ~ '^[a-z0-9]([a-z0-9-]{1,58}[a-z0-9])?$'
     and not exists (select 1 from public.marcas where slug = lower(btrim(p_slug)));
$$;
revoke execute on function public.slug_disponivel(text) from public;
grant execute on function public.slug_disponivel(text) to anon, authenticated;

-- 2. Cria a loja do cadastro: conta própria (1 loja, 1 cardápio), cidade, tipo, WhatsApp, aceite dos
--    termos e cardápio FECHADO (abre no último passo). Só para quem ainda não tem loja.
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
  v_zap   text := regexp_replace(coalesce(p ->> 'whatsapp', ''), '\D', '', 'g');
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
  if coalesce(btrim(p ->> 'cidade'), '') = '' then
    raise exception 'Informe a cidade.' using errcode = 'check_violation';
  end if;
  if length(v_zap) not between 10 and 13 then
    raise exception 'WhatsApp inválido (com DDD).' using errcode = 'check_violation';
  end if;
  v_loja := public.criar_loja(p ->> 'restaurante', p ->> 'restaurante', p ->> 'slug', p ->> 'nome');
  select conta_id into v_conta from public.lojas where id = v_loja;
  update public.contas
     set origem = 'cadastro', aceite_termos_em = now(), aceite_termos_versao = left(p ->> 'aceite_versao', 20), aceite_termos_por = v_user
   where id = v_conta;
  update public.lojas
     set cidade = left(btrim(p ->> 'cidade'), 80),
         tipo_restaurante = case when p ->> 'tipo' in ('pizzaria', 'hamburgueria', 'lanchonete', 'restaurante', 'japones', 'acai', 'doceria', 'outro') then p ->> 'tipo' end
   where id = v_loja;
  update public.marcas
     set whatsapp = case when length(v_zap) <= 11 then '55' || v_zap else v_zap end,
         status_cardapio = 'fechado'
   where loja_id = v_loja;
  return v_loja;
end;
$$;
revoke execute on function public.criar_loja_cadastro(jsonb) from public, anon;
grant execute on function public.criar_loja_cadastro(jsonb) to authenticated;

-- 3. Cardápio de exemplo (só em loja sem nenhum produto). Mesmas funções do painel, numa operação só.
create or replace function public.criar_cardapio_exemplo(p_loja uuid, p jsonb)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  c       jsonb;
  pr      jsonb;
  v_setor uuid;
  n       integer := 0;
begin
  if not private.tem_permissao(p_loja, 'cardapio') then
    raise exception 'Sem permissão para o cardápio.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.produtos where loja_id = p_loja) then
    raise exception 'O cardápio de exemplo só entra numa loja sem produtos.' using errcode = 'check_violation';
  end if;
  for c in select * from jsonb_array_elements(coalesce(p -> 'categorias', '[]'::jsonb)) loop
    v_setor := public.salvar_setor(p_loja, null, c ->> 'categoria');
    for pr in select * from jsonb_array_elements(coalesce(c -> 'produtos', '[]'::jsonb)) loop
      perform public.criar_produto(p_loja, pr ->> 'nome', v_setor, (pr ->> 'preco')::numeric, p ->> 'descricao');
      n := n + 1;
    end loop;
  end loop;
  return n;
end;
$$;
revoke execute on function public.criar_cardapio_exemplo(uuid, jsonb) from public, anon;
grant execute on function public.criar_cardapio_exemplo(uuid, jsonb) to authenticated;

-- 4. O que já foi feito na loja (tela Primeiros passos)
create or replace function public.primeiros_passos(p_loja uuid, p_descricao_exemplo text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_marca public.marcas;
  v_loja  public.lojas;
begin
  if not private.e_membro(p_loja) then
    raise exception 'Loja não encontrada.' using errcode = 'no_data_found';
  end if;
  select * into v_loja from public.lojas where id = p_loja;
  select * into v_marca from public.marcas where loja_id = p_loja and not evento order by ordem, criado_em limit 1;
  return jsonb_build_object(
    'cidade', coalesce(btrim(v_loja.cidade), '') <> '',
    'whatsapp', coalesce(v_marca.whatsapp, '') <> '',
    'produtos', (select count(*) from public.produtos pr where pr.loja_id = p_loja
                  and (coalesce(pr.preco, 0) > 0 or exists (select 1 from public.produto_marcas pm where pm.produto_id = pr.id and coalesce(pm.preco_delivery, 0) > 0))),
    'produtos_exemplo', (select count(*) from public.produtos where loja_id = p_loja and descricao = p_descricao_exemplo),
    'logo', coalesce(v_marca.logo_url, '') <> '',
    'horarios', (select count(*) from public.marca_horarios where loja_id = p_loja),
    'entrega', exists (select 1 from public.areas_entrega where loja_id = p_loja and ativo)
               or exists (select 1 from public.faixas_km where loja_id = p_loja)
               or (v_marca.aceita_retirada and not v_marca.aceita_entrega),
    'impressoras', (select count(*) from public.impressoras where loja_id = p_loja),
    'equipe', (select count(*) from public.membros where loja_id = p_loja and ativo),
    'cardapio_aberto', v_marca.status_cardapio is distinct from 'fechado',
    'slug', v_marca.slug,
    'marca_id', v_marca.id,
    'tipo', v_loja.tipo_restaurante,
    'ocultos', v_loja.primeiros_passos_ocultos
  );
end;
$$;
revoke execute on function public.primeiros_passos(uuid, text) from public, anon;
grant execute on function public.primeiros_passos(uuid, text) to authenticated;
