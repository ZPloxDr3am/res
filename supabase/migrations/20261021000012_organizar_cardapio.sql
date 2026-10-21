-- RES · 0012 · Organizar o cardápio: trocar produtos de categoria e definir a ordem em que
-- categorias e produtos aparecem para o cliente.

-- Salva a arrumação inteira de uma vez (tudo ou nada):
--   p_setores  = ids das categorias na ordem desejada;
--   p_produtos = [{"id": produto, "setor": categoria ou null}, …] na ordem desejada; a posição
--                dentro de cada categoria vira a ordem do produto.
-- Só mexe no que é da loja; quem não tem permissão de cardápio é barrado.
create or replace function public.organizar_cardapio(p_loja uuid, p_setores uuid[], p_produtos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  n_setores integer := 0;
  n_produtos integer := 0;
  n_movidos integer := 0;
begin
  if not private.tem_permissao(p_loja, 'cardapio') then
    raise exception 'Você não tem permissão para alterar o cardápio.' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(coalesce(p_produtos, '[]'::jsonb)) <> 'array' then
    raise exception 'Lista de produtos inválida.' using errcode = 'invalid_parameter_value';
  end if;
  if exists (select 1 from unnest(coalesce(p_setores, '{}')) x(id)
              where not exists (select 1 from public.setores s where s.id = x.id and s.loja_id = p_loja)) then
    raise exception 'Categoria que não é desta loja.' using errcode = 'invalid_parameter_value';
  end if;

  if exists (select 1 from jsonb_array_elements(coalesce(p_produtos, '[]'::jsonb)) e
              where not exists (select 1 from public.produtos p where p.id = (e ->> 'id')::uuid and p.loja_id = p_loja)) then
    raise exception 'Produto que não é desta loja.' using errcode = 'invalid_parameter_value';
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p_produtos, '[]'::jsonb)) e
              where nullif(e ->> 'setor', '') is not null
                and not exists (select 1 from public.setores s where s.id = (e ->> 'setor')::uuid and s.loja_id = p_loja)) then
    raise exception 'Categoria que não é desta loja.' using errcode = 'invalid_parameter_value';
  end if;
  if (select count(*) <> count(distinct e ->> 'id') from jsonb_array_elements(coalesce(p_produtos, '[]'::jsonb)) e) then
    raise exception 'Produto repetido na lista.' using errcode = 'invalid_parameter_value';
  end if;

  update public.setores s set ordem = x.pos - 1
    from unnest(coalesce(p_setores, '{}')) with ordinality as x(id, pos)
   where s.id = x.id and s.loja_id = p_loja and s.ordem is distinct from x.pos - 1;
  get diagnostics n_setores = row_count;

  with o as (
    select (e ->> 'id')::uuid as id, nullif(e ->> 'setor', '')::uuid as setor, ord
      from jsonb_array_elements(coalesce(p_produtos, '[]'::jsonb)) with ordinality as t(e, ord)
  )
  select count(*) into n_movidos
    from o join public.produtos p on p.id = o.id
   where p.setor_id is distinct from o.setor;

  with o as (
    select (e ->> 'id')::uuid as id, nullif(e ->> 'setor', '')::uuid as setor, ord
      from jsonb_array_elements(coalesce(p_produtos, '[]'::jsonb)) with ordinality as t(e, ord)
  ), r as (
    select id, setor, (row_number() over (partition by setor order by ord) - 1)::integer as nova from o
  )
  update public.produtos p set setor_id = r.setor, ordem = r.nova
    from r
   where p.id = r.id and p.loja_id = p_loja
     and (p.setor_id is distinct from r.setor or p.ordem is distinct from r.nova);
  get diagnostics n_produtos = row_count;

  return jsonb_build_object('categorias', n_setores, 'produtos', n_produtos, 'movidos', n_movidos);
end;
$$;

-- Leva produtos para outra categoria (ou para "sem categoria" com null), no fim da lista dela,
-- na ordem em que vieram.
create or replace function public.mover_produtos(p_produtos uuid[], p_setor uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid;
  v_base integer;
  n integer;
begin
  select loja_id into v_loja from public.produtos where id = p_produtos[1];
  if v_loja is null then
    raise exception 'Produto não encontrado' using errcode = 'no_data_found';
  end if;
  if not private.tem_permissao(v_loja, 'cardapio') then
    raise exception 'Você não tem permissão para alterar o cardápio.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from unnest(p_produtos) x(id) where not exists (select 1 from public.produtos p where p.id = x.id and p.loja_id = v_loja)) then
    raise exception 'Todos os produtos precisam ser da mesma loja.' using errcode = 'invalid_parameter_value';
  end if;
  if p_setor is not null and not exists (select 1 from public.setores where id = p_setor and loja_id = v_loja) then
    raise exception 'Categoria que não é desta loja.' using errcode = 'invalid_parameter_value';
  end if;

  select coalesce(max(ordem) + 1, 0) into v_base
    from public.produtos
   where loja_id = v_loja and setor_id is not distinct from p_setor and not (id = any (p_produtos));

  update public.produtos p set setor_id = p_setor, ordem = v_base + x.pos - 1
    from unnest(p_produtos) with ordinality as x(id, pos)
   where p.id = x.id;
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.organizar_cardapio(uuid, uuid[], jsonb) to authenticated;
grant execute on function public.mover_produtos(uuid[], uuid) to authenticated;
revoke execute on function public.organizar_cardapio(uuid, uuid[], jsonb) from anon, public;
revoke execute on function public.mover_produtos(uuid[], uuid) from anon, public;
