-- RES · 0021 · Cardápio novo (fase 1): promoção De/Por com dias, horário e validade (D-021).
--
-- * produto_marcas ganha a agenda da promoção: dias da semana (0 = domingo; vazio = todos), horário
--   (início/fim; fim antes do início = passa da meia-noite e conta no dia em que começou) e último dia.
-- * private.promo_vigente diz se o preço promocional vale AGORA (fuso da loja). Usada no preço do
--   item (pedido do balcão e do cardápio digital) e no cardápio público (preço riscado).
-- * As cópias (duplicar produto, importar de outra loja, compartilhar catálogo) levam a agenda junto.
-- Espelho em packages/core/src/promocao.ts (mesmas regras, testes com os mesmos casos).

alter table public.produto_marcas
  add column promo_dias   smallint[] check (promo_dias is null or promo_dias <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  add column promo_inicio time,
  add column promo_fim    time,
  add column promo_ate    date,
  add constraint produto_marcas_promo_horario check ((promo_inicio is null) = (promo_fim is null) and (promo_inicio is null or promo_inicio <> promo_fim));

create or replace function private.promo_vigente(p_pm public.produto_marcas, p_quando timestamptz default now())
returns numeric
language plpgsql
stable
set search_path = ''
as $$
declare
  v_fuso  text;
  v_local timestamp;
  v_hora  time;
  v_dia   date;
begin
  if p_pm.preco_promocional is null then
    return null;
  end if;
  select fuso_horario into v_fuso from public.lojas where id = p_pm.loja_id;
  v_local := p_quando at time zone coalesce(v_fuso, 'America/Sao_Paulo');
  v_hora := v_local::time;
  v_dia := v_local::date;
  if p_pm.promo_inicio is not null then
    if p_pm.promo_inicio < p_pm.promo_fim then
      if not (v_hora >= p_pm.promo_inicio and v_hora < p_pm.promo_fim) then
        return null;
      end if;
    elsif v_hora < p_pm.promo_fim then
      v_dia := v_dia - 1;            -- madrugada: conta no dia em que a promoção começou
    elsif v_hora < p_pm.promo_inicio then
      return null;
    end if;
  end if;
  if coalesce(cardinality(p_pm.promo_dias), 0) > 0 and not (extract(dow from v_dia)::smallint = any (p_pm.promo_dias)) then
    return null;
  end if;
  if p_pm.promo_ate is not null and v_dia > p_pm.promo_ate then
    return null;
  end if;
  return p_pm.preco_promocional;
end;
$$;
revoke execute on function private.promo_vigente(public.produto_marcas, timestamptz) from anon, public;

-- preço do item (20261021000005_pedidos): promocional só quando a agenda da promoção vale agora
create or replace function private.preco_item(p_produto uuid, p_marca uuid, p_canal text, p_escolhas jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_prod     record;
  v_pm       public.produto_marcas;
  v_base     bigint;
  v_unitario bigint;
  g          record;
  v_esc      jsonb;
  v_total_q  integer;
  v_min      integer;
  v_valor    bigint;
  v_linhas   jsonb := '[]'::jsonb;
  v_desconhecida text;
  v_rows     jsonb;
  v_grupo_linhas jsonb;
begin
  if p_canal not in ('delivery', 'presencial') then
    raise exception 'Canal inválido' using errcode = 'invalid_parameter_value';
  end if;
  select * into v_prod from public.produtos where id = p_produto;
  if not found then
    raise exception 'Produto não encontrado' using errcode = 'no_data_found';
  end if;
  select * into v_pm from public.produto_marcas where produto_id = p_produto and marca_id = p_marca;
  if not found or not v_pm.ativo or not (case p_canal when 'delivery' then v_pm.delivery else v_pm.presencial end) then
    raise exception '"%" não está disponível neste canal.', v_prod.nome using errcode = 'check_violation';
  end if;

  -- promocional → preço do canal → preço padrão → 0
  v_base := round(100 * coalesce(private.promo_vigente(v_pm),
                                 case p_canal when 'delivery' then v_pm.preco_delivery else v_pm.preco_presencial end,
                                 v_prod.preco, 0));
  v_unitario := v_base;

  -- grupo escolhido que não pertence ao produto
  select k into v_desconhecida from jsonb_object_keys(coalesce(p_escolhas, '{}'::jsonb)) k
   where not exists (select 1 from public.produto_grupos pg where pg.produto_id = p_produto and pg.grupo_id::text = k)
   limit 1;
  if v_desconhecida is not null then
    raise exception 'Grupo de opções não pertence a "%".', v_prod.nome using errcode = 'check_violation';
  end if;

  for g in
    select go.* from public.produto_grupos pg join public.grupos_opcoes go on go.id = pg.grupo_id
     where pg.produto_id = p_produto
       and go.ativo and (case p_canal when 'delivery' then go.delivery else go.presencial end)
     order by pg.ordem
  loop
    v_esc := coalesce(p_escolhas -> g.id::text, '{}'::jsonb);

    -- escolhas com preço resolvido (preço do canal → preço da opção → preço do item)
    select coalesce(jsonb_agg(jsonb_build_object(
             'opcao_id', o.id, 'nome', coalesce(o.nome, c.nome, p.nome), 'q', (e.value)::numeric,
             'preco', round(100 * coalesce(case p_canal when 'delivery' then o.preco_delivery else o.preco_presencial end, o.preco, c.preco, p.preco, 0)),
             'visivel', o.id is not null and o.ativo and (case p_canal when 'delivery' then o.delivery else o.presencial end),
             'max_qtd', o.max_qtd)), '[]'::jsonb)
      into v_rows
      from jsonb_each_text(v_esc) e
      left join public.opcoes o on o.id::text = e.key and o.grupo_id = g.id
      left join public.complementos c on c.id = o.complemento_id
      left join public.produtos p on p.id = o.produto_id
     where e.value ~ '^-?[0-9]+(\.[0-9]+)?$' and (e.value)::numeric > 0;

    if exists (select 1 from jsonb_to_recordset(v_rows) r(visivel boolean) where not r.visivel) then
      raise exception 'Opção indisponível em "%".', g.nome using errcode = 'check_violation';
    end if;
    if exists (select 1 from jsonb_to_recordset(v_rows) r(q numeric) where r.q <> trunc(r.q)) then
      raise exception 'Quantidade inválida em "%".', g.nome using errcode = 'check_violation';
    end if;

    select coalesce(sum(r.q), 0) into v_total_q from jsonb_to_recordset(v_rows) r(q integer);
    v_min := case when g.obrigatorio then greatest(1, g.min_qtd) else g.min_qtd end;
    if v_total_q < v_min then
      raise exception 'Escolha pelo menos % em "%".', v_min, g.nome using errcode = 'check_violation';
    end if;
    if v_total_q > g.max_qtd then
      raise exception 'Escolha no máximo % em "%".', g.max_qtd, g.nome using errcode = 'check_violation';
    end if;
    if not g.permite_repetir and exists (select 1 from jsonb_to_recordset(v_rows) r(q integer) where r.q > 1) then
      raise exception 'Uma opção não pode repetir em "%".', g.nome using errcode = 'check_violation';
    end if;
    if exists (select 1 from jsonb_to_recordset(v_rows) r(q integer, max_qtd integer) where r.q > r.max_qtd) then
      raise exception 'Quantidade acima do limite de uma opção em "%".', g.nome using errcode = 'check_violation';
    end if;

    if v_total_q > 0 then
      select case g.formacao
               when 'brinde' then 0
               when 'soma' then sum(r.preco * r.q)
               when 'maior' then max(r.preco)
               when 'proporcional' then round(sum(r.preco * r.q)::numeric / v_total_q)
             end,
             jsonb_agg(jsonb_build_object(
               'grupo_id', g.id, 'grupo_nome', g.nome, 'opcao_id', r.opcao_id, 'nome', r.nome, 'quantidade', r.q,
               'preco', r.preco, 'fracao', case when g.pizza then round(r.q::numeric / v_total_q, 4) end))
        into v_valor, v_grupo_linhas
        from jsonb_to_recordset(v_rows) r(opcao_id uuid, nome text, q integer, preco bigint);
      v_unitario := v_unitario + v_valor;
      v_linhas := v_linhas || v_grupo_linhas;
    end if;
  end loop;

  return jsonb_build_object('base', v_base, 'unitario', v_unitario, 'opcoes', v_linhas);
end;
$$;

-- cardápio público (20261021000006_cardapi): preço riscado só com a promoção valendo
create or replace function private.produto_publico(p_produto uuid, p_marca uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'nome', p.nome, 'descricao', p.descricao, 'imagem_url', p.imagem_url, 'etiqueta', p.etiqueta,
    'preco', round(100 * coalesce(private.promo_vigente(pm), pm.preco_delivery, p.preco, 0)),
    'preco_original', case when private.promo_vigente(pm) is not null then round(100 * coalesce(pm.preco_delivery, p.preco, 0)) end,
    'grupos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', g.id, 'nome', g.nome, 'formacao', g.formacao, 'obrigatorio', g.obrigatorio, 'pizza', g.pizza,
               'min', g.min_qtd, 'max', g.max_qtd, 'permite_repetir', g.permite_repetir,
               'opcoes', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', o.id, 'nome', coalesce(o.nome, c.nome, op.nome), 'max', o.max_qtd,
                          'preco', round(100 * coalesce(o.preco_delivery, o.preco, c.preco, op.preco, 0)))
                        order by o.ordem)
                   from public.opcoes o
                   left join public.complementos c on c.id = o.complemento_id
                   left join public.produtos op on op.id = o.produto_id
                  where o.grupo_id = g.id and o.ativo and o.delivery), '[]'::jsonb))
             order by pg.ordem)
        from public.produto_grupos pg join public.grupos_opcoes g on g.id = pg.grupo_id
       where pg.produto_id = p.id and g.ativo and g.delivery), '[]'::jsonb))
  from public.produtos p
  join public.produto_marcas pm on pm.produto_id = p.id and pm.marca_id = p_marca
  where p.id = p_produto;
$$;

-- public.duplicar_produto (20261021000011_copias_) + agenda da promoção na cópia
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

  insert into public.produto_marcas (loja_id, produto_id, marca_id, ativo, delivery, presencial, totem, preco_delivery, preco_presencial, preco_promocional, promo_dias, promo_inicio, promo_fim, promo_ate, gera_cashback, ordem)
  select loja_id, v_novo, marca_id, ativo, delivery, presencial, totem, preco_delivery, preco_presencial, preco_promocional, promo_dias, promo_inicio, promo_fim, promo_ate, gera_cashback, ordem
    from public.produto_marcas where produto_id = p_produto;

  insert into public.produto_grupos (loja_id, produto_id, grupo_id, ordem)
  select loja_id, v_novo, grupo_id, ordem from public.produto_grupos where produto_id = p_produto;

  return v_novo;
end;
$$;

-- public.importar_cardapio (20261021000011_copias_) + agenda da promoção na cópia
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
      insert into public.produto_marcas (loja_id, produto_id, marca_id, ativo, delivery, presencial, totem, preco_delivery, preco_presencial, preco_promocional, promo_dias, promo_inicio, promo_fim, promo_ate)
      select p_destino, v_prod_d, md.id,
             coalesce(pm.ativo, true), coalesce(pm.delivery, true), coalesce(pm.presencial, true), coalesce(pm.totem, true),
             pm.preco_delivery, pm.preco_presencial, pm.preco_promocional, pm.promo_dias, pm.promo_inicio, pm.promo_fim, pm.promo_ate
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

-- public.compartilhar_catalogo (20261021000010_importa) + agenda da promoção na cópia
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

  insert into public.produto_marcas (loja_id, produto_id, marca_id, ativo, delivery, presencial, totem, preco_delivery, preco_presencial, preco_promocional, promo_dias, promo_inicio, promo_fim, promo_ate, gera_cashback, ordem)
  select loja_id, produto_id, p_marca_nova, ativo, delivery, presencial, totem, preco_delivery, preco_presencial, preco_promocional, promo_dias, promo_inicio, promo_fim, promo_ate, gera_cashback, ordem
    from public.produto_marcas where marca_id = p_marca_base
  on conflict (produto_id, marca_id) do nothing;
  get diagnostics n_p = row_count;

  return jsonb_build_object('categorias', n_s, 'produtos', n_p);
end;
$$;
