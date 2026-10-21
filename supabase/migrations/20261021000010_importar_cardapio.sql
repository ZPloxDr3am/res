-- RES · 0010 · Começar um cardápio a partir de outro.
-- 1) Outra loja do grupo: copia categorias, produtos (com foto e preços), e os grupos de opções.
-- 2) Outra marca da mesma loja: compartilha o mesmo catálogo (cada marca com seus preços e
--    liga/desliga), sem duplicar produtos.

-- Copia categorias (todas, ou só as escolhidas) de uma loja para outra do mesmo grupo.
-- Regras para não duplicar quando importar de novo:
--  - categoria com o mesmo nome no destino recebe os produtos (não cria outra);
--  - produto com o mesmo nome já na categoria de destino é pulado;
--  - grupo de opções com o mesmo nome e as mesmas opções no destino é reaproveitado.
-- Preços por marca vêm da marca de origem escolhida (ou a primeira) e valem para todas as marcas do destino.
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
  n_pulados integer := 0;
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
    select id into v_setor_d from public.setores where loja_id = p_destino and lower(btrim(nome)) = lower(btrim(s.nome)) limit 1;
    if v_setor_d is null then
      insert into public.setores (loja_id, nome, nome_publico, delivery, presencial, imagem_url, ordem)
      values (p_destino, s.nome, s.nome_publico, s.delivery, s.presencial, s.imagem_url,
              coalesce((select max(ordem) + 1 from public.setores where loja_id = p_destino), 0))
      returning id into v_setor_d;
      insert into public.setor_marcas (loja_id, setor_id, marca_id)
      select p_destino, v_setor_d, unnest(v_marcas_d);
      n_setores := n_setores + 1;
    end if;

    for p in select * from public.produtos where setor_id = s.id order by ordem, nome loop
      if exists (select 1 from public.produtos where setor_id = v_setor_d and lower(btrim(nome)) = lower(btrim(p.nome))) then
        n_pulados := n_pulados + 1;
        continue;
      end if;

      insert into public.produtos (loja_id, setor_id, nome, descricao, observacoes_internas, etiqueta, unidade, preco, custo_base,
                                   destaque, destaque_impressao, cobra_taxa_servico, so_agendamento, balanca, validade_dias,
                                   nome_producao, restricoes, serve_pessoas, imagem_url, ordem)
      values (p_destino, v_setor_d, p.nome, p.descricao, p.observacoes_internas, p.etiqueta, p.unidade, p.preco, p.custo_base,
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
            values (p_destino, g.nome, g.ativo, g.delivery, g.presencial, g.obrigatorio, g.pizza, g.formacao, g.min_qtd, g.max_qtd, g.permite_repetir)
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

  return jsonb_build_object('categorias', n_setores, 'produtos', n_produtos, 'grupos', n_grupos, 'pulados', n_pulados);
end;
$$;

-- Marca nova da mesma loja passa a usar o catálogo de outra marca (mesmas categorias e
-- produtos, com a mesma disponibilidade e preços de partida; depois cada uma ajusta os seus).
create or replace function public.compartilhar_catalogo(p_marca_nova uuid, p_marca_base uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid;
  n_s integer;
  n_p integer;
begin
  select loja_id into v_loja from public.marcas where id = p_marca_nova;
  if v_loja is null or not exists (select 1 from public.marcas where id = p_marca_base and loja_id = v_loja) or p_marca_nova = p_marca_base then
    raise exception 'As duas marcas precisam ser da mesma loja.' using errcode = 'invalid_parameter_value';
  end if;
  if not private.tem_permissao(v_loja, 'cardapio') then
    raise exception 'Você não tem permissão para alterar o cardápio.' using errcode = 'insufficient_privilege';
  end if;

  insert into public.setor_marcas (loja_id, setor_id, marca_id, ativo, ordem)
  select loja_id, setor_id, p_marca_nova, ativo, ordem from public.setor_marcas where marca_id = p_marca_base
  on conflict (setor_id, marca_id) do nothing;
  get diagnostics n_s = row_count;

  insert into public.produto_marcas (loja_id, produto_id, marca_id, ativo, delivery, presencial, totem, preco_delivery, preco_presencial, preco_promocional, gera_cashback, ordem)
  select loja_id, produto_id, p_marca_nova, ativo, delivery, presencial, totem, preco_delivery, preco_presencial, preco_promocional, gera_cashback, ordem
    from public.produto_marcas where marca_id = p_marca_base
  on conflict (produto_id, marca_id) do nothing;
  get diagnostics n_p = row_count;

  return jsonb_build_object('categorias', n_s, 'produtos', n_p);
end;
$$;

grant execute on function public.importar_cardapio(uuid, uuid, uuid[], uuid) to authenticated;
grant execute on function public.compartilhar_catalogo(uuid, uuid) to authenticated;
revoke execute on function public.importar_cardapio(uuid, uuid, uuid[], uuid) from anon, public;
revoke execute on function public.compartilhar_catalogo(uuid, uuid) from anon, public;
