-- RES · 0004 · Edição completa do cardápio: grupos com opções, reaproveitar grupo em
-- vários produtos (ex.: "Sabores" em todos os tamanhos de pizza), reordenar e fotos.

-- ---------------------------------------------------------------------------
-- Salvar grupo existente e sincronizar as opções numa transação (D-005).
-- p_opcoes: [{ "id"?: uuid, "nome": text, "preco"?: number, "max_qtd"?: int, "ativo"?: bool }]
-- Opção com id é atualizada; sem id é criada; a que sumiu da lista é removida.
-- ---------------------------------------------------------------------------
create or replace function public.salvar_grupo(
  p_grupo uuid,
  p_nome text,
  p_formacao public.formacao_preco,
  p_obrigatorio boolean,
  p_min integer,
  p_max integer,
  p_pizza boolean,
  p_permite_repetir boolean,
  p_opcoes jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_loja uuid;
begin
  update public.grupos_opcoes
     set nome = p_nome, formacao = p_formacao, obrigatorio = p_obrigatorio,
         min_qtd = p_min, max_qtd = p_max, pizza = p_pizza, permite_repetir = p_permite_repetir
   where id = p_grupo
  returning loja_id into v_loja;
  if v_loja is null then
    raise exception 'Grupo não encontrado' using errcode = 'no_data_found';
  end if;
  if jsonb_array_length(coalesce(p_opcoes, '[]'::jsonb)) = 0 then
    raise exception 'O grupo precisa de pelo menos uma opção' using errcode = 'check_violation';
  end if;

  delete from public.opcoes o
   where o.grupo_id = p_grupo
     and o.id not in (select (e ->> 'id')::uuid from jsonb_array_elements(p_opcoes) e where e ? 'id' and e ->> 'id' <> '');

  update public.opcoes o
     set nome = e.j ->> 'nome',
         preco = (e.j ->> 'preco')::numeric,
         max_qtd = coalesce((e.j ->> 'max_qtd')::integer, o.max_qtd),
         ativo = coalesce((e.j ->> 'ativo')::boolean, o.ativo),
         ordem = e.ord - 1
    from jsonb_array_elements(p_opcoes) with ordinality as e(j, ord)
   where o.grupo_id = p_grupo and e.j ? 'id' and e.j ->> 'id' <> '' and o.id = (e.j ->> 'id')::uuid;

  insert into public.opcoes (loja_id, grupo_id, nome, preco, max_qtd, ativo, ordem)
  select v_loja, p_grupo, e.j ->> 'nome', (e.j ->> 'preco')::numeric,
         coalesce((e.j ->> 'max_qtd')::integer, greatest(1, p_max)), coalesce((e.j ->> 'ativo')::boolean, true), e.ord - 1
    from jsonb_array_elements(p_opcoes) with ordinality as e(j, ord)
   where not (e.j ? 'id') or e.j ->> 'id' = '';

  return p_grupo;
end;
$$;

-- criar_grupo_vinculado passa a receber "permite repetir" (ex.: pizza com 2/3 do mesmo sabor).
drop function public.criar_grupo_vinculado(uuid, text, public.formacao_preco, boolean, integer, integer, boolean, jsonb);
create function public.criar_grupo_vinculado(
  p_produto uuid,
  p_nome text,
  p_formacao public.formacao_preco default 'soma',
  p_obrigatorio boolean default false,
  p_min integer default 0,
  p_max integer default 1,
  p_pizza boolean default false,
  p_opcoes jsonb default '[]'::jsonb,
  p_permite_repetir boolean default false
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_loja uuid;
  v_grupo uuid;
begin
  select p.loja_id into v_loja from public.produtos p where p.id = p_produto;
  if v_loja is null then
    raise exception 'Produto não encontrado' using errcode = 'no_data_found';
  end if;

  insert into public.grupos_opcoes (loja_id, nome, formacao, obrigatorio, min_qtd, max_qtd, pizza, permite_repetir)
  values (v_loja, p_nome, p_formacao, p_obrigatorio, p_min, p_max, p_pizza, p_permite_repetir)
  returning id into v_grupo;

  insert into public.opcoes (loja_id, grupo_id, complemento_id, produto_id, nome, preco, max_qtd, ordem)
  select v_loja, v_grupo,
         nullif(e.j ->> 'complemento_id', '')::uuid,
         nullif(e.j ->> 'produto_id', '')::uuid,
         e.j ->> 'nome',
         (e.j ->> 'preco')::numeric,
         coalesce((e.j ->> 'max_qtd')::integer, greatest(1, p_max)),
         e.ord - 1
  from jsonb_array_elements(p_opcoes) with ordinality as e(j, ord);

  insert into public.produto_grupos (loja_id, produto_id, grupo_id, ordem)
  values (v_loja, p_produto, v_grupo,
          coalesce((select max(pg.ordem) + 1 from public.produto_grupos pg where pg.produto_id = p_produto), 0));

  return v_grupo;
end;
$$;
grant execute on function public.criar_grupo_vinculado(uuid, text, public.formacao_preco, boolean, integer, integer, boolean, jsonb, boolean) to authenticated;
revoke execute on function public.criar_grupo_vinculado(uuid, text, public.formacao_preco, boolean, integer, integer, boolean, jsonb, boolean) from anon, public;

-- Ligar um grupo que já existe a outro produto (mesma loja).
create or replace function public.vincular_grupo(p_produto uuid, p_grupo uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_loja uuid;
begin
  select p.loja_id into v_loja from public.produtos p
   where p.id = p_produto and exists (select 1 from public.grupos_opcoes g where g.id = p_grupo and g.loja_id = p.loja_id);
  if v_loja is null then
    raise exception 'Produto ou grupo não encontrado' using errcode = 'no_data_found';
  end if;
  insert into public.produto_grupos (loja_id, produto_id, grupo_id, ordem)
  values (v_loja, p_produto, p_grupo,
          coalesce((select max(pg.ordem) + 1 from public.produto_grupos pg where pg.produto_id = p_produto), 0))
  on conflict (produto_id, grupo_id) do nothing;
end;
$$;

-- Desligar o grupo do produto. Se nenhum produto usar mais o grupo, ele é apagado junto.
create or replace function public.desvincular_grupo(p_produto uuid, p_grupo uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.produto_grupos where produto_id = p_produto and grupo_id = p_grupo;
  if not found then
    raise exception 'Vínculo não encontrado' using errcode = 'no_data_found';
  end if;
  delete from public.grupos_opcoes g
   where g.id = p_grupo and not exists (select 1 from public.produto_grupos pg where pg.grupo_id = g.id);
end;
$$;

-- Reordenar setores, produtos (dentro do setor) ou opções (dentro do grupo): a posição na lista vira a ordem.
create or replace function public.reordenar(p_tabela text, p_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_tabela not in ('setores', 'produtos', 'opcoes') then
    raise exception 'Tabela não pode ser reordenada: %', p_tabela using errcode = 'invalid_parameter_value';
  end if;
  execute format(
    'update public.%I t set ordem = x.pos - 1 from unnest($1) with ordinality as x(id, pos) where t.id = x.id and t.ordem is distinct from x.pos - 1',
    p_tabela) using p_ids;
end;
$$;

grant execute on function public.salvar_grupo(uuid, text, public.formacao_preco, boolean, integer, integer, boolean, boolean, jsonb) to authenticated;
grant execute on function public.vincular_grupo(uuid, uuid) to authenticated;
grant execute on function public.desvincular_grupo(uuid, uuid) to authenticated;
grant execute on function public.reordenar(text, uuid[]) to authenticated;
revoke execute on function public.salvar_grupo(uuid, text, public.formacao_preco, boolean, integer, integer, boolean, boolean, jsonb) from anon, public;
revoke execute on function public.vincular_grupo(uuid, uuid) from anon, public;
revoke execute on function public.desvincular_grupo(uuid, uuid) from anon, public;
revoke execute on function public.reordenar(text, uuid[]) from anon, public;

-- ---------------------------------------------------------------------------
-- Fotos do cardápio no Supabase Storage: bucket público para leitura; só quem tem
-- "cardapio" grava, e só dentro da pasta da própria loja ({loja_id}/arquivo).
-- (Ignorado onde não há Storage, como no Postgres dos testes.)
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is null then
    return;
  end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('cardapio', 'cardapio', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
  on conflict (id) do nothing;

  execute $p$
    create policy cardapio_fotos_gravar on storage.objects for insert to authenticated
    with check (bucket_id = 'cardapio'
      and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      and private.tem_permissao(((storage.foldername(name))[1])::uuid, 'cardapio'))
  $p$;
  execute $p$
    create policy cardapio_fotos_alterar on storage.objects for update to authenticated
    using (bucket_id = 'cardapio'
      and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      and private.tem_permissao(((storage.foldername(name))[1])::uuid, 'cardapio'))
  $p$;
  execute $p$
    create policy cardapio_fotos_apagar on storage.objects for delete to authenticated
    using (bucket_id = 'cardapio'
      and (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
      and private.tem_permissao(((storage.foldername(name))[1])::uuid, 'cardapio'))
  $p$;
end;
$$;

-- A tela não expõe limite por opção: cada opção pode ir até o máximo do grupo
-- (a repetição continua controlada por "permite repetir"). Ajusta as opções já criadas.
update public.opcoes o
   set max_qtd = g.max_qtd
  from public.grupos_opcoes g
 where o.grupo_id = g.id and o.max_qtd < g.max_qtd;
