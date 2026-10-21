-- RES · 0011 · Duplicado não é barrado: categoria, produto ou grupo com nome que já existe
-- entra como "NOME-Cópia" (depois "NOME-Cópia 2", "NOME-Cópia 3"…). Vale para importar de
-- outra loja e para os botões Duplicar.

-- Nome livre a partir de um nome base, olhando os nomes que já existem (sem diferenciar maiúsculas).
-- "Pizza" → "Pizza" se livre; senão "Pizza-Cópia", "Pizza-Cópia 2"… Copiar uma cópia não empilha
-- ("Pizza-Cópia" vira "Pizza-Cópia 2", não "Pizza-Cópia-Cópia").
create or replace function private.nome_copia(p_nome text, p_existentes text[], p_max integer default 150)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_base text := regexp_replace(btrim(p_nome), '-Cópia( [0-9]+)?$', '');
  v_usados text[] := array(select lower(btrim(x)) from unnest(coalesce(p_existentes, '{}')) x);
  v_cand text := btrim(p_nome);
  i integer := 1;
begin
  if not (lower(v_cand) = any (v_usados)) then
    return left(v_cand, p_max);
  end if;
  loop
    v_cand := case when i = 1 then v_base || '-Cópia' else v_base || '-Cópia ' || i end;
    -- garante caber no limite cortando a base, nunca o "-Cópia"
    if length(v_cand) > p_max then
      v_cand := left(v_base, p_max - (length(v_cand) - length(v_base))) || substr(v_cand, length(v_base) + 1);
    end if;
    exit when not (lower(v_cand) = any (v_usados));
    i := i + 1;
  end loop;
  return v_cand;
end;
$$;
revoke execute on function private.nome_copia(text, text[], integer) from anon, public;
grant execute on function private.nome_copia(text, text[], integer) to authenticated;

-- Importar de outra loja: sempre importa; o que já existe com o mesmo nome entra como NOME-Cópia.
create or replace function public.importar_cardapio(
  p_origem uuid,
  p_destino uuid,
  p_setores uuid[] default null,
  p_marca_origem uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta_o uuid;
  v_conta_d uuid;
  v_marca_o uuid := p_marca_origem;
  v_marcas_d uuid[];
  v_mapa_grupos jsonb := '{}'::jsonb;
  v_setor_d uuid;
  v_prod_d uuid;
  v_grupo_d uuid;
  n_setores integer := 0;
  n_produtos integer := 0;
  n_grupos integer := 0;
  n_renomeados integer := 0;
  v_nome text;
  s record;
  p record;
  g record;
begin
  if p_origem = p_destino then
    raise exception 'Escolha uma loja diferente desta.' using errcode = 'invalid_parameter_value';
  end if;
  if not private.tem_permissao(p_origem, 'cardapio') or not private.tem_permissao(p_destino, 'cardapio') then
    raise exception 'Você precisa ter acesso ao cardápio das duas lojas.' using errcode = 'insufficient_privilege';
  end if;
  select conta_id into v_conta_o from public.lojas where id = p_origem;
  select conta_id into v_conta_d from public.lojas where id = p_destino;
  if v_conta_o is null or v_conta_o is distinct from v_conta_d then
    raise exception 'Só dá para importar entre lojas do mesmo grupo.' using errcode = 'insufficient_privilege';
  end if;
  if v_marca_o is null then
    select id into v_marca_o from public.marcas where loja_id = p_origem order by ordem, nome limit 1;
  elsif not exists (select 1 from public.marcas where id = v_marca_o and loja_id = p_origem) then
    raise exception 'Marca de origem não é desta loja.' using errcode = 'invalid_parameter_value';
  end if;
  select coalesce(array_agg(id order by ordem), '{}') into v_marcas_d from public.marcas where loja_id = p_destino;

  for s in
    select * from public.setores
     where loja_id = p_origem and (p_setores is null or id = any (p_setores))
     order by ordem, nome
  loop
    v_nome := private.nome_copia(s.nome, array(select nome from public.setores where loja_id = p_destino));
    if v_nome <> s.nome then
      n_renomeados := n_renomeados + 1;
    end if;
    insert into public.setores (loja_id, nome, nome_publico, delivery, presencial, imagem_url, ordem)
    values (p_destino, v_nome, s.nome_publico, s.delivery, s.presencial, s.imagem_url,
            coalesce((select max(ordem) + 1 from public.setores where loja_id = p_destino), 0))
    returning id into v_setor_d;
    insert into public.setor_marcas (loja_id, setor_id, marca_id)
    select p_destino, v_setor_d, unnest(v_marcas_d);
    n_setores := n_setores + 1;

    for p in select * from public.produtos where setor_id = s.id order by ordem, nome loop
      -- produto com nome que já existe na loja de destino entra como NOME-Cópia
      v_nome := private.nome_copia(p.nome, array(select nome from public.produtos where loja_id = p_destino), 150);
      if v_nome <> p.nome then
        n_renomeados := n_renomeados + 1;
      end if;

      insert into public.produtos (loja_id, setor_id, nome, descricao, observacoes_internas, etiqueta, unidade, preco, custo_base,
                                   destaque, destaque_impressao, cobra_taxa_servico, so_agendamento, balanca, validade_dias,
                                   nome_producao, restricoes, serve_pessoas, imagem_url, ordem)
      values (p_destino, v_setor_d, v_nome, p.descricao, p.observacoes_internas, p.etiqueta, p.unidade, p.preco, p.custo_base,
              p.destaque, p.destaque_impressao, p.cobra_taxa_servico, p.so_agendamento, p.balanca, p.validade_dias,
              p.nome_producao, p.restricoes, p.serve_pessoas, p.imagem_url,
              coalesce((select max(ordem) + 1 from public.produtos where setor_id = v_setor_d), 0))
      returning id into v_prod_d;

      -- disponibilidade e preços da marca de origem, em todas as marcas do destino
      insert into public.produto_marcas (loja_id, produto_id, marca_id, ativo, delivery, presencial, totem, preco_delivery, preco_presencial, preco_promocional)
      select p_destino, v_prod_d, md.id,
             coalesce(pm.ativo, true), coalesce(pm.delivery, true), coalesce(pm.presencial, true), coalesce(pm.totem, true),
             pm.preco_delivery, pm.preco_presencial, pm.preco_promocional
        from unnest(v_marcas_d) md(id)
        left join public.produto_marcas pm on pm.produto_id = p.id and pm.marca_id = v_marca_o;

      for g in
        select go.*, pg.ordem as ordem_no_produto
          from public.produto_grupos pg join public.grupos_opcoes go on go.id = pg.grupo_id
         where pg.produto_id = p.id
         order by pg.ordem
      loop
        v_grupo_d := (v_mapa_grupos ->> g.id::text)::uuid;
        if v_grupo_d is null then
          -- mesmo nome e mesmas opções no destino? reaproveita
          select d.id into v_grupo_d
            from public.grupos_opcoes d
           where d.loja_id = p_destino and lower(btrim(d.nome)) = lower(btrim(g.nome))
             and (select array_agg(lower(coalesce(o.nome, '')) order by o.ordem, o.nome) from public.opcoes o where o.grupo_id = d.id)
                 is not distinct from
                 (select array_agg(lower(coalesce(o.nome, '')) order by o.ordem, o.nome) from public.opcoes o where o.grupo_id = g.id)
           limit 1;
          if v_grupo_d is null then
            insert into public.grupos_opcoes (loja_id, nome, ativo, delivery, presencial, obrigatorio, pizza, formacao, min_qtd, max_qtd, permite_repetir)
            values (p_destino, private.nome_copia(g.nome, array(select x.nome from public.grupos_opcoes x where x.loja_id = p_destino), 100), g.ativo, g.delivery, g.presencial, g.obrigatorio, g.pizza, g.formacao, g.min_qtd, g.max_qtd, g.permite_repetir)
            returning id into v_grupo_d;
            -- opções "livres" (com nome) são copiadas; as que apontam para complemento/produto da origem viram livres com o nome e preço
            insert into public.opcoes (loja_id, grupo_id, nome, preco, preco_delivery, preco_presencial, min_qtd, max_qtd, ativo, delivery, presencial, ordem)
            select p_destino, v_grupo_d, coalesce(o.nome, c.nome, op.nome), coalesce(o.preco, c.preco, op.preco),
                   o.preco_delivery, o.preco_presencial, o.min_qtd, o.max_qtd, o.ativo, o.delivery, o.presencial, o.ordem
              from public.opcoes o
              left join public.complementos c on c.id = o.complemento_id
              left join public.produtos op on op.id = o.produto_id
             where o.grupo_id = g.id;
            n_grupos := n_grupos + 1;
          end if;
          v_mapa_grupos := v_mapa_grupos || jsonb_build_object(g.id::text, v_grupo_d);
        end if;
        insert into public.produto_grupos (loja_id, produto_id, grupo_id, ordem)
        values (p_destino, v_prod_d, v_grupo_d, g.ordem_no_produto)
        on conflict (produto_id, grupo_id) do nothing;
      end loop;

      n_produtos := n_produtos + 1;
    end loop;
  end loop;

  return jsonb_build_object('categorias', n_setores, 'produtos', n_produtos, 'grupos', n_grupos, 'renomeados', n_renomeados);
end;
$$;


-- Duplicar produto: copia dados, preços/canais por marca e os grupos ligados (os mesmos grupos,
-- não cópias, para mudar em um lugar só). A cópia entra logo abaixo do original.
create or replace function public.duplicar_produto(p_produto uuid, p_setor uuid default null, p_sufixo text default null)
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
  select loja_id, v_setor,
         -- nome livre na loja: NOME-Cópia, NOME-Cópia 2… (p_sufixo é aceito por compatibilidade e ignorado)
         private.nome_copia(nome, array(select pr.nome from public.produtos pr where pr.loja_id = v_orig.loja_id), 150), descricao, observacoes_internas, null, null, etiqueta, unidade, preco,
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

-- Duplicar categoria: nova categoria (NOME-Cópia) com as mesmas marcas e canais e cópia de todos os produtos
-- (cada um como NOME-Cópia, porque o original continua na loja).
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
  values (v_orig.loja_id, private.nome_copia(v_orig.nome, array(select st.nome from public.setores st where st.loja_id = v_orig.loja_id)), v_orig.nome_publico, v_orig.delivery, v_orig.presencial, v_orig.imagem_url, v_orig.ordem + 1)
  returning id into v_novo;
  insert into public.setor_marcas (loja_id, setor_id, marca_id, ativo, ordem)
  select loja_id, v_novo, marca_id, ativo, ordem from public.setor_marcas where setor_id = p_setor;

  for p in select id from public.produtos where setor_id = p_setor order by ordem, nome loop
    perform public.duplicar_produto(p.id, v_novo);
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
  select loja_id, private.nome_copia(nome, array(select x.nome from public.grupos_opcoes x where x.loja_id = g.loja_id), 100), ativo, delivery, presencial, obrigatorio, pizza, formacao, min_qtd, max_qtd, permite_repetir
    from public.grupos_opcoes g where id = p_grupo
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

