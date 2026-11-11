-- RES · 0022 · Cardápio novo (fase 2): combos com escolhas e categoria de up-sell (D-022).
--
-- * Combo é um produto (produtos.combo) com preço próprio, foto, categoria, promoção e cópias como
--   qualquer produto. Seus passos (combo_passos) dizem o que o cliente escolhe: "1 Pizza Gigante",
--   "1 refrigerante da categoria Bebidas"… Cada escolha monta o produto normalmente (sabores, borda).
-- * Preço do combo = preço do combo + os adicionais que a escolha cobra (sabor mais caro, borda),
--   isto é, o preço do item escolhido menos o preço base dele. Espelho em packages/core/src/combo.ts.
-- * No pedido, o combo é um item só; as escolhas viram linhas de opção ("Pizza: Pizza Gigante",
--   "Pizza Gigante · Sabores: 1/2 Calabresa"), que a comanda da cozinha já imprime.
-- * O pedido manda as escolhas do combo em escolhas.passos = [{passo_id, produto_id, escolhas}].
-- * setores.upsell: categoria sugerida no carrinho ("Peça também") e no pedido do balcão.

alter table public.produtos add column combo boolean not null default false;
alter table public.setores add column upsell boolean not null default false;

create table public.combo_passos (
  id         uuid primary key default gen_random_uuid(),
  loja_id    uuid not null,
  combo_id   uuid not null,
  ordem      integer not null default 0,
  titulo     text not null check (length(btrim(titulo)) between 1 and 80),
  quantidade smallint not null default 1 check (quantidade between 1 and 10),
  setor_id   uuid,                                 -- vale qualquer produto desta categoria
  produtos   uuid[] not null default '{}',        -- e/ou estes produtos
  foreign key (combo_id, loja_id) references public.produtos (id, loja_id) on delete cascade,
  foreign key (setor_id) references public.setores (id) on delete cascade,
  check (setor_id is not null or cardinality(produtos) > 0)
);
create index combo_passos_combo_idx on public.combo_passos (combo_id, ordem);
alter table public.combo_passos enable row level security;
create policy combo_passos_ler on public.combo_passos for select to authenticated using (private.e_membro(loja_id));
-- Escrita normal pela tela é salvar_combo (valida as escolhas); a política deixa duplicar_produto copiar.
create policy combo_passos_escrever on public.combo_passos for all to authenticated
  using (private.tem_permissao(loja_id, 'cardapio')) with check (private.tem_permissao(loja_id, 'cardapio'));
create trigger combo_passos_auditar after insert or update or delete on public.combo_passos for each row execute function private.auditar();

-- Cria ou atualiza um combo. p_dados: {nome, descricao, preco, setor_id, passos: [{titulo, quantidade, setor_id, produtos}]}
create or replace function public.salvar_combo(p_loja uuid, p_combo uuid, p_dados jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id    uuid := p_combo;
  v_nome  text := btrim(coalesce(p_dados ->> 'nome', ''));
  v_setor uuid := nullif(p_dados ->> 'setor_id', '')::uuid;
  v_preco numeric := (p_dados ->> 'preco')::numeric;
  ps      record;
begin
  if not private.tem_permissao(p_loja, 'cardapio') then
    raise exception 'Você não tem permissão para mudar o cardápio.' using errcode = 'insufficient_privilege';
  end if;
  if v_nome = '' then
    raise exception 'Dê um nome ao combo.' using errcode = 'check_violation';
  end if;
  if v_preco is null or v_preco < 0 then
    raise exception 'Informe o preço do combo.' using errcode = 'check_violation';
  end if;
  if v_setor is not null and not exists (select 1 from public.setores s where s.id = v_setor and s.loja_id = p_loja) then
    raise exception 'Categoria não encontrada.' using errcode = 'no_data_found';
  end if;
  if jsonb_typeof(p_dados -> 'passos') is distinct from 'array' or jsonb_array_length(p_dados -> 'passos') = 0 then
    raise exception 'Diga o que vem no combo (pelo menos uma escolha).' using errcode = 'check_violation';
  end if;
  if jsonb_array_length(p_dados -> 'passos') > 10 then
    raise exception 'No máximo 10 escolhas por combo.' using errcode = 'check_violation';
  end if;
  for ps in select e.j, e.ord from jsonb_array_elements(p_dados -> 'passos') with ordinality e(j, ord) loop
    if btrim(coalesce(ps.j ->> 'titulo', '')) = '' then
      raise exception 'A escolha % está sem título.', ps.ord using errcode = 'check_violation';
    end if;
    if nullif(ps.j ->> 'setor_id', '') is null and coalesce(jsonb_array_length(ps.j -> 'produtos'), 0) = 0 then
      raise exception 'Em "%", escolha uma categoria ou produtos.', ps.j ->> 'titulo' using errcode = 'check_violation';
    end if;
    if nullif(ps.j ->> 'setor_id', '') is not null and not exists (select 1 from public.setores s where s.id = (ps.j ->> 'setor_id')::uuid and s.loja_id = p_loja) then
      raise exception 'Categoria não encontrada em "%".', ps.j ->> 'titulo' using errcode = 'no_data_found';
    end if;
    if exists (select 1 from jsonb_array_elements_text(coalesce(ps.j -> 'produtos', '[]'::jsonb)) x
                where not exists (select 1 from public.produtos p where p.id = x::uuid and p.loja_id = p_loja and not p.combo)) then
      raise exception 'Produto inválido em "%" (combo não entra em outro combo).', ps.j ->> 'titulo' using errcode = 'check_violation';
    end if;
  end loop;

  if v_id is null then
    v_id := public.criar_produto(p_loja, v_nome, v_setor, v_preco, nullif(btrim(p_dados ->> 'descricao'), ''));
    update public.produtos set combo = true where id = v_id;
  else
    update public.produtos
       set nome = v_nome, descricao = nullif(btrim(p_dados ->> 'descricao'), ''), preco = v_preco, setor_id = v_setor
     where id = v_id and loja_id = p_loja and combo;
    if not found then
      raise exception 'Combo não encontrado.' using errcode = 'no_data_found';
    end if;
  end if;

  delete from public.combo_passos where combo_id = v_id;
  insert into public.combo_passos (loja_id, combo_id, ordem, titulo, quantidade, setor_id, produtos)
  select p_loja, v_id, e.ord - 1, btrim(e.j ->> 'titulo'), greatest(1, least(10, coalesce((e.j ->> 'quantidade')::smallint, 1))),
         nullif(e.j ->> 'setor_id', '')::uuid,
         coalesce((select array_agg(distinct x::uuid) from jsonb_array_elements_text(coalesce(e.j -> 'produtos', '[]'::jsonb)) x), '{}')
    from jsonb_array_elements(p_dados -> 'passos') with ordinality e(j, ord);
  return v_id;
end;
$$;

-- Preço de um combo montado (mesmo formato de preco_item). p_passos: [{passo_id, produto_id, escolhas}]
create or replace function private.preco_combo(p_combo uuid, p_marca uuid, p_canal text, p_passos jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_prod   record;
  v_pm     public.produto_marcas;
  v_filho  record;
  v_base   bigint;
  v_extra  bigint := 0;
  v_n      integer;
  v_calc   jsonb;
  v_opcoes jsonb := '[]'::jsonb;
  ps       record;
  esc      jsonb;
begin
  select * into v_prod from public.produtos where id = p_combo;
  select * into v_pm from public.produto_marcas where produto_id = p_combo and marca_id = p_marca;
  if not found or not v_pm.ativo or not (case p_canal when 'delivery' then v_pm.delivery else v_pm.presencial end) then
    raise exception '"%" não está disponível neste canal.', v_prod.nome using errcode = 'check_violation';
  end if;
  v_base := round(100 * coalesce(private.promo_vigente(v_pm),
                                 case p_canal when 'delivery' then v_pm.preco_delivery else v_pm.preco_presencial end,
                                 v_prod.preco, 0));
  if jsonb_typeof(p_passos) is distinct from 'array' then
    raise exception 'Monte o combo "%".', v_prod.nome using errcode = 'check_violation';
  end if;
  if exists (select 1 from jsonb_array_elements(p_passos) e
              where not exists (select 1 from public.combo_passos cp where cp.combo_id = p_combo and cp.id::text = e ->> 'passo_id')) then
    raise exception 'Escolha inválida no combo "%".', v_prod.nome using errcode = 'check_violation';
  end if;

  for ps in select * from public.combo_passos cp where cp.combo_id = p_combo order by cp.ordem loop
    select count(*) into v_n from jsonb_array_elements(p_passos) e where e ->> 'passo_id' = ps.id::text;
    if v_n <> ps.quantidade then
      raise exception 'Escolha % em "%" (combo "%").', ps.quantidade, ps.titulo, v_prod.nome using errcode = 'check_violation';
    end if;
    for esc in select e from jsonb_array_elements(p_passos) e where e ->> 'passo_id' = ps.id::text loop
      select * into v_filho from public.produtos p
       where p.id = (esc ->> 'produto_id')::uuid and p.loja_id = v_prod.loja_id and not p.combo
         and (p.id = any (ps.produtos) or (ps.setor_id is not null and p.setor_id = ps.setor_id));
      if not found then
        raise exception 'Produto que não vale em "%" (combo "%").', ps.titulo, v_prod.nome using errcode = 'check_violation';
      end if;
      v_calc := private.preco_item(v_filho.id, p_marca, p_canal, coalesce(esc -> 'escolhas', '{}'::jsonb));
      v_extra := v_extra + greatest(0, (v_calc ->> 'unitario')::bigint - (v_calc ->> 'base')::bigint);
      v_opcoes := v_opcoes
        || jsonb_build_array(jsonb_build_object('grupo_id', null, 'grupo_nome', ps.titulo, 'opcao_id', null, 'nome', v_filho.nome, 'quantidade', 1, 'preco', 0, 'fracao', null))
        || coalesce((select jsonb_agg(o || jsonb_build_object('grupo_nome', v_filho.nome || ' · ' || (o ->> 'grupo_nome'))) from jsonb_array_elements(v_calc -> 'opcoes') o), '[]'::jsonb);
    end loop;
  end loop;
  return jsonb_build_object('base', v_base, 'unitario', v_base + v_extra, 'opcoes', v_opcoes);
end;
$$;
revoke execute on function private.preco_combo(uuid, uuid, text, jsonb) from anon, public;
revoke execute on function public.salvar_combo(uuid, uuid, jsonb) from anon, public;
grant execute on function public.salvar_combo(uuid, uuid, jsonb) to authenticated;

-- preço do item (20261024000021_promoca) + combo
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
  -- combo: preço do combo + adicionais das escolhas (0022)
  if v_prod.combo then
    return private.preco_combo(p_produto, p_marca, p_canal, coalesce(p_escolhas -> 'passos', '[]'::jsonb));
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

-- cardápio público (20261024000021_promoca) + passos do combo
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
    'combo', p.combo,
    'passos', case when p.combo then coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', cp.id, 'titulo', cp.titulo, 'quantidade', cp.quantidade,
               'produtos', coalesce((
                 select jsonb_agg(private.produto_publico(c.id, p_marca) order by c.ordem, c.nome)
                   from public.produtos c
                   join public.produto_marcas cpm on cpm.produto_id = c.id and cpm.marca_id = p_marca and cpm.ativo and cpm.delivery
                  where not c.combo and (c.id = any (cp.produtos) or (cp.setor_id is not null and c.setor_id = cp.setor_id))), '[]'::jsonb))
             order by cp.ordem)
        from public.combo_passos cp where cp.combo_id = p.id), '[]'::jsonb) end,
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

-- cardápio público (20261021000006_cardapi) + categoria de up-sell
create or replace function public.cardapio_publico(p_slug text)
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
  select * into v_marca from public.marcas where slug = lower(btrim(p_slug)) and ativa;
  if not found then
    return null;
  end if;
  select * into v_loja from public.lojas where id = v_marca.loja_id;

  return jsonb_build_object(
    'marca', jsonb_build_object(
      'id', v_marca.id, 'nome', v_marca.nome, 'slug', v_marca.slug,
      'aberta', private.marca_aberta(v_marca.id),
      'status', v_marca.status_cardapio,
      'mensagem', v_marca.mensagem_cardapio,
      'pedido_minimo', round(v_marca.pedido_minimo * 100),
      'aceita_entrega', v_marca.aceita_entrega,
      'aceita_retirada', v_marca.aceita_retirada,
      'formas_pagamento', to_jsonb(v_marca.formas_pagamento),
      'tempo_preparo_min', v_loja.tempo_preparo_min,
      'fuso', v_loja.fuso_horario,
      'horarios', coalesce((select jsonb_agg(jsonb_build_object('dia', h.dia_semana, 'abre', to_char(h.abre, 'HH24:MI'), 'fecha', to_char(h.fecha, 'HH24:MI')) order by h.dia_semana, h.abre)
                             from public.marca_horarios h where h.marca_id = v_marca.id), '[]'::jsonb),
      'areas', coalesce((select jsonb_agg(jsonb_build_object('bairro', a.bairro, 'taxa', round(a.taxa * 100)) order by a.bairro)
                          from public.areas_entrega a where a.marca_id = v_marca.id and a.ativo), '[]'::jsonb)
    ),
    'setores', coalesce((
      select jsonb_agg(s.obj order by s.ordem, s.nome)
        from (
          select st.ordem, st.nome,
                 jsonb_build_object('id', st.id, 'nome', coalesce(nullif(btrim(st.nome_publico), ''), st.nome), 'upsell', st.upsell, 'produtos', prods.lista) as obj
            from public.setores st
            join public.setor_marcas sm on sm.setor_id = st.id and sm.marca_id = v_marca.id and sm.ativo
            cross join lateral (
              select jsonb_agg(private.produto_publico(p.id, v_marca.id) order by p.ordem, p.nome) as lista
                from public.produtos p
                join public.produto_marcas pm on pm.produto_id = p.id and pm.marca_id = v_marca.id and pm.ativo and pm.delivery
               where p.setor_id = st.id
            ) prods
           where st.delivery and prods.lista is not null
        ) s), '[]'::jsonb)
  );
end;
$$;

-- duplicar_produto (0021) + combo
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

  -- combo: a cópia continua combo, com as mesmas escolhas (0022)
  if v_orig.combo then
    update public.produtos set combo = true where id = v_novo;
    insert into public.combo_passos (loja_id, combo_id, ordem, titulo, quantidade, setor_id, produtos)
    select loja_id, v_novo, ordem, titulo, quantidade, setor_id, produtos from public.combo_passos where combo_id = p_produto;
  end if;

  return v_novo;
end;
$$;

-- importar_cardapio (0021) sem combos
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

    for p in select * from public.produtos where setor_id = s.id and not combo order by ordem, nome loop  -- combos não vêm (as escolhas apontam para produtos da outra loja)
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
