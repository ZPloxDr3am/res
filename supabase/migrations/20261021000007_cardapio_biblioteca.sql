-- RES · 0007 · Cardápio fácil de montar: duplicar produto, categoria e grupo; grupos de opções
-- como biblioteca (criados uma vez, ligados a quantos produtos quiser).
-- Tudo roda com os direitos de quem chama: a RLS de "cardapio" continua valendo.

-- Grupo sem produto (biblioteca). Mesmos campos de criar_grupo_vinculado.
create or replace function public.criar_grupo(
  p_loja uuid,
  p_nome text,
  p_formacao public.formacao_preco default 'soma',
  p_obrigatorio boolean default false,
  p_min integer default 0,
  p_max integer default 1,
  p_pizza boolean default false,
  p_permite_repetir boolean default false,
  p_opcoes jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_grupo uuid;
begin
  if jsonb_array_length(coalesce(p_opcoes, '[]'::jsonb)) = 0 then
    raise exception 'O grupo precisa de pelo menos uma opção' using errcode = 'check_violation';
  end if;
  insert into public.grupos_opcoes (loja_id, nome, formacao, obrigatorio, min_qtd, max_qtd, pizza, permite_repetir)
  values (p_loja, p_nome, p_formacao, p_obrigatorio, p_min, p_max, p_pizza, p_permite_repetir)
  returning id into v_grupo;

  insert into public.opcoes (loja_id, grupo_id, nome, preco, max_qtd, ordem)
  select p_loja, v_grupo, e.j ->> 'nome', (e.j ->> 'preco')::numeric,
         coalesce((e.j ->> 'max_qtd')::integer, greatest(1, p_max)), e.ord - 1
    from jsonb_array_elements(p_opcoes) with ordinality as e(j, ord);
  return v_grupo;
end;
$$;

-- Tirar o grupo do produto NÃO apaga mais o grupo: ele fica na biblioteca para reusar.
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
end;
$$;

-- Grupos de um produto, na ordem da lista (marca/desmarca e ordena de uma vez).
create or replace function public.definir_grupos_do_produto(p_produto uuid, p_grupos uuid[])
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_loja uuid;
begin
  select loja_id into v_loja from public.produtos where id = p_produto;
  if v_loja is null then
    raise exception 'Produto não encontrado' using errcode = 'no_data_found';
  end if;
  if exists (select 1 from unnest(p_grupos) g(id)
              where not exists (select 1 from public.grupos_opcoes go where go.id = g.id and go.loja_id = v_loja)) then
    raise exception 'Grupo não encontrado' using errcode = 'no_data_found';
  end if;

  delete from public.produto_grupos where produto_id = p_produto and grupo_id <> all (p_grupos);
  insert into public.produto_grupos (loja_id, produto_id, grupo_id, ordem)
  select v_loja, p_produto, g.id, g.pos - 1 from unnest(p_grupos) with ordinality as g(id, pos)
  on conflict (produto_id, grupo_id) do update set ordem = excluded.ordem;
end;
$$;

-- Produtos que usam um grupo (aplica o grupo em vários produtos de uma vez).
-- Quem entra vai para o fim da lista de grupos do produto; quem já estava mantém a posição.
create or replace function public.definir_produtos_do_grupo(p_grupo uuid, p_produtos uuid[])
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_loja uuid;
begin
  select loja_id into v_loja from public.grupos_opcoes where id = p_grupo;
  if v_loja is null then
    raise exception 'Grupo não encontrado' using errcode = 'no_data_found';
  end if;
  if exists (select 1 from unnest(p_produtos) p(id)
              where not exists (select 1 from public.produtos pr where pr.id = p.id and pr.loja_id = v_loja)) then
    raise exception 'Produto não encontrado' using errcode = 'no_data_found';
  end if;

  delete from public.produto_grupos where grupo_id = p_grupo and produto_id <> all (p_produtos);
  insert into public.produto_grupos (loja_id, produto_id, grupo_id, ordem)
  select v_loja, p.id,
         p_grupo, coalesce((select max(pg.ordem) + 1 from public.produto_grupos pg where pg.produto_id = p.id), 0)
    from unnest(p_produtos) p(id)
  on conflict (produto_id, grupo_id) do nothing;
end;
$$;

-- Duplicar produto: copia dados, preços/canais por marca e os grupos ligados (os mesmos grupos,
-- não cópias, para mudar em um lugar só). A cópia entra logo abaixo do original.
create or replace function public.duplicar_produto(p_produto uuid, p_setor uuid default null, p_sufixo text default ' (cópia)')
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_novo uuid;
  v_orig public.produtos;
  v_setor uuid;
begin
  select * into v_orig from public.produtos where id = p_produto;
  if not found then
    raise exception 'Produto não encontrado' using errcode = 'no_data_found';
  end if;
  v_setor := coalesce(p_setor, v_orig.setor_id);

  -- abre espaço logo abaixo do original (mesmo setor)
  if v_setor is not distinct from v_orig.setor_id then
    update public.produtos set ordem = ordem + 1
     where loja_id = v_orig.loja_id and setor_id is not distinct from v_setor and ordem > v_orig.ordem;
  end if;

  insert into public.produtos (loja_id, setor_id, nome, descricao, observacoes_internas, codigo, codigo_barras, etiqueta, unidade, preco,
                               custo_base, destaque, destaque_impressao, cobra_taxa_servico, so_agendamento, balanca, validade_dias,
                               nome_producao, controla_estoque, aceita_estoque_negativo, estoque_minimo, restricoes, serve_pessoas,
                               imagem_url, ordem)
  select loja_id, v_setor, left(nome || coalesce(p_sufixo, ''), 150), descricao, observacoes_internas, null, null, etiqueta, unidade, preco,
         custo_base, destaque, destaque_impressao, cobra_taxa_servico, so_agendamento, balanca, validade_dias,
         nome_producao, controla_estoque, aceita_estoque_negativo, estoque_minimo, restricoes, serve_pessoas,
         imagem_url,
         case when v_setor is not distinct from v_orig.setor_id then v_orig.ordem + 1
              else coalesce((select max(p.ordem) + 1 from public.produtos p where p.loja_id = v_orig.loja_id and p.setor_id is not distinct from v_setor), 0) end
    from public.produtos where id = p_produto
  returning id into v_novo;

  insert into public.produto_marcas (loja_id, produto_id, marca_id, ativo, delivery, presencial, totem, preco_delivery, preco_presencial, preco_promocional, gera_cashback, ordem)
  select loja_id, v_novo, marca_id, ativo, delivery, presencial, totem, preco_delivery, preco_presencial, preco_promocional, gera_cashback, ordem
    from public.produto_marcas where produto_id = p_produto;

  insert into public.produto_grupos (loja_id, produto_id, grupo_id, ordem)
  select loja_id, v_novo, grupo_id, ordem from public.produto_grupos where produto_id = p_produto;

  return v_novo;
end;
$$;

-- Duplicar categoria: nova categoria com as mesmas marcas e canais e cópia de todos os produtos
-- (com os mesmos nomes; ela já se chama "(cópia)").
create or replace function public.duplicar_setor(p_setor uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_orig public.setores;
  v_novo uuid;
  p record;
begin
  select * into v_orig from public.setores where id = p_setor;
  if not found then
    raise exception 'Categoria não encontrada' using errcode = 'no_data_found';
  end if;

  update public.setores set ordem = ordem + 1 where loja_id = v_orig.loja_id and ordem > v_orig.ordem;
  insert into public.setores (loja_id, nome, nome_publico, delivery, presencial, imagem_url, ordem)
  values (v_orig.loja_id, left(v_orig.nome || ' (cópia)', 150), v_orig.nome_publico, v_orig.delivery, v_orig.presencial, v_orig.imagem_url, v_orig.ordem + 1)
  returning id into v_novo;
  insert into public.setor_marcas (loja_id, setor_id, marca_id, ativo, ordem)
  select loja_id, v_novo, marca_id, ativo, ordem from public.setor_marcas where setor_id = p_setor;

  for p in select id from public.produtos where setor_id = p_setor order by ordem, nome loop
    perform public.duplicar_produto(p.id, v_novo, '');
  end loop;
  return v_novo;
end;
$$;

-- Duplicar grupo: cópia independente com as mesmas opções (para fazer uma variação),
-- sem ligar a nenhum produto.
create or replace function public.duplicar_grupo(p_grupo uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_novo uuid;
begin
  insert into public.grupos_opcoes (loja_id, nome, ativo, delivery, presencial, obrigatorio, pizza, formacao, min_qtd, max_qtd, permite_repetir)
  select loja_id, left(nome || ' (cópia)', 100), ativo, delivery, presencial, obrigatorio, pizza, formacao, min_qtd, max_qtd, permite_repetir
    from public.grupos_opcoes where id = p_grupo
  returning id into v_novo;
  if v_novo is null then
    raise exception 'Grupo não encontrado' using errcode = 'no_data_found';
  end if;
  insert into public.opcoes (loja_id, grupo_id, complemento_id, produto_id, nome, preco, preco_delivery, preco_presencial, min_qtd, max_qtd, ativo, delivery, presencial, ordem)
  select loja_id, v_novo, complemento_id, produto_id, nome, preco, preco_delivery, preco_presencial, min_qtd, max_qtd, ativo, delivery, presencial, ordem
    from public.opcoes where grupo_id = p_grupo;
  return v_novo;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.criar_grupo(uuid, text, public.formacao_preco, boolean, integer, integer, boolean, boolean, jsonb)',
    'public.definir_grupos_do_produto(uuid, uuid[])',
    'public.definir_produtos_do_grupo(uuid, uuid[])',
    'public.duplicar_produto(uuid, uuid, text)',
    'public.duplicar_setor(uuid)',
    'public.duplicar_grupo(uuid)'] loop
    execute format('grant execute on function %s to authenticated', f);
    execute format('revoke execute on function %s from anon, public', f);
  end loop;
end;
$$;
