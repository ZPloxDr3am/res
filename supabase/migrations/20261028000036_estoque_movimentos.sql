-- RES · 0036 · Movimentações do estoque com filtros e resumo (D-037).
-- Filtros: período (turnos 05:00 → 05:00 no fuso da loja), tipo, fornecedor (CNPJ da nota), insumo,
-- produto vendido (pedidos que tinham o produto) e busca (nota, pedido, observação).
-- Resumo do período filtrado: entradas, vendas (custo do que saiu), perdas e diferença de contagens,
-- em quantidade de movimentos e em R$ (quantidade × custo da hora). Pode rodar de novo sem erro.

create or replace function public.movimentos_estoque_filtro(p_loja uuid, p_filtro jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_est   uuid := private.estoque_da_loja(p_loja);
  v_fuso  text;
  v_ini   timestamptz;
  v_fim   timestamptz;
  v_tipos text[] := array(select jsonb_array_elements_text(coalesce(p_filtro -> 'tipos', '[]'::jsonb)));
  v_forn  text := nullif(regexp_replace(coalesce(p_filtro ->> 'fornecedor', ''), '\D', '', 'g'), '');
  v_ins   uuid := nullif(p_filtro ->> 'insumo', '')::uuid;
  v_prod  uuid := nullif(p_filtro ->> 'produto', '')::uuid;
  v_busca text := nullif(btrim(coalesce(p_filtro ->> 'busca', '')), '');
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  select fuso_horario into v_fuso from public.lojas where id = p_loja;
  v_ini := (coalesce(nullif(p_filtro ->> 'de', '')::date, current_date - 29) + time '05:00') at time zone v_fuso;
  v_fim := (coalesce(nullif(p_filtro ->> 'ate', '')::date, current_date) + 1 + time '05:00') at time zone v_fuso;
  if v_fim - v_ini > interval '370 days' then
    raise exception 'Escolha um período de até um ano.' using errcode = 'check_violation';
  end if;

  return (
    with m as (
      select m.*, i.nome as insumo, i.unidade, n.numero as nf_numero, n.emitente_nome, n.emitente_cnpj, p.numero as pedido_numero, l.nome as loja,
             round(m.quantidade * coalesce(m.custo_unit, 0) * 100) as valor
        from public.estoque_movimentos m
        join public.insumos i on i.id = m.insumo_id
        left join public.nfe_entradas n on n.id = m.nfe_id
        left join public.pedidos p on p.id = m.pedido_id
        left join public.lojas l on l.id = m.loja_id
       where m.estoque = v_est and m.criado_em >= v_ini and m.criado_em < v_fim
         and (cardinality(v_tipos) = 0 or m.tipo = any (v_tipos))
         and (v_forn is null or n.emitente_cnpj = v_forn)
         and (v_ins is null or m.insumo_id = v_ins)
         and (v_prod is null or (m.pedido_id is not null and exists (select 1 from public.pedido_itens pi where pi.pedido_id = m.pedido_id and pi.produto_id = v_prod)))
         and (v_busca is null or n.numero = v_busca or p.numero::text = ltrim(v_busca, '#') or m.motivo ilike '%' || v_busca || '%' or i.nome ilike '%' || v_busca || '%')
    )
    select jsonb_build_object(
      'inicio', v_ini, 'fim', v_fim,
      'total', (select count(*) from m),
      'resumo', jsonb_build_object(
        'entradas', (select coalesce(sum(valor), 0) from m where tipo in ('entrada_nfe', 'entrada')),
        'entradas_n', (select count(*) from m where tipo in ('entrada_nfe', 'entrada')),
        'notas', (select count(distinct nfe_id) from m where nfe_id is not null),
        'vendas', (select coalesce(-sum(valor), 0) from m where tipo in ('venda', 'estorno_venda')),
        'pedidos', (select count(distinct pedido_id) from m where tipo = 'venda'),
        'perdas', (select coalesce(-sum(valor), 0) from m where tipo = 'perda'),
        'perdas_n', (select count(*) from m where tipo = 'perda'),
        'contagens', (select coalesce(sum(valor), 0) from m where tipo = 'contagem'),
        'contagens_n', (select count(*) from m where tipo = 'contagem')),
      'por_insumo', coalesce((select jsonb_agg(x order by x.saida desc) from (
          select insumo, unidade,
                 sum(quantidade) filter (where quantidade > 0) as entrou,
                 -sum(quantidade) filter (where quantidade < 0) as saida,
                 coalesce(-sum(valor) filter (where tipo in ('venda', 'estorno_venda')), 0) as custo_vendas,
                 coalesce(-sum(valor) filter (where tipo = 'perda'), 0) as custo_perdas
            from m group by insumo, unidade order by 4 desc nulls last limit 15) x), '[]'::jsonb),
      'movimentos', coalesce((select jsonb_agg(jsonb_build_object(
                       'id', id, 'insumo', insumo, 'unidade', unidade, 'tipo', tipo, 'quantidade', quantidade,
                       'custo_unit', round(custo_unit * 100, 2), 'valor', valor, 'saldo_apos', saldo_apos, 'motivo', motivo,
                       'loja', loja, 'pedido', pedido_numero, 'nf', nf_numero, 'fornecedor', emitente_nome, 'em', criado_em)
                     order by criado_em desc, id desc)
                     from (select * from m order by criado_em desc, id desc limit 500) z), '[]'::jsonb),
      -- opções dos filtros
      'fornecedores', coalesce((select jsonb_agg(jsonb_build_object('cnpj', f.emitente_cnpj, 'nome', f.nome) order by f.nome)
                                 from (select emitente_cnpj, max(emitente_nome) as nome from public.nfe_entradas
                                        where estoque = v_est and emitente_cnpj is not null group by emitente_cnpj) f), '[]'::jsonb)));
end;
$$;

grant execute on function public.movimentos_estoque_filtro(uuid, jsonb) to authenticated;
revoke execute on function public.movimentos_estoque_filtro(uuid, jsonb) from anon, public;

-- ---------------------------------------------------------------------------- Meu estoque (D-038)
-- Produtos do cardápio com a ficha técnica: desta loja ou de todas as lojas do grupo em que a pessoa
-- cuida do estoque. Cada loja leva os insumos do seu estoque (o mesmo, quando agrupado).
create or replace function public.meu_estoque(p_loja uuid, p_todas boolean)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_conta uuid;
  v_lojas uuid[];
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  select conta_id into v_conta from public.lojas where id = p_loja;
  select coalesce(array_agg(l.id), array[]::uuid[]) into v_lojas
    from public.lojas l
   where l.id = p_loja or (p_todas and v_conta is not null and l.conta_id = v_conta and private.pode_estoque(l.id));
  return jsonb_build_object(
    'outras_lojas', (select count(*) from public.lojas l where v_conta is not null and l.conta_id = v_conta and l.id <> p_loja and private.pode_estoque(l.id)),
    'lojas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', l.id, 'nome', l.nome, 'estoque', private.estoque_da_loja(l.id),
               'produtos', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', p.id, 'nome', p.nome, 'categoria', s.nome, 'imagem_url', p.imagem_url,
                          'preco', case when p.preco is null then null else round(p.preco * 100) end,
                          'grupos', (select count(*) from public.produto_grupos pg where pg.produto_id = p.id),
                          'ficha', coalesce((select jsonb_agg(jsonb_build_object('insumo_id', f.insumo_id, 'quantidade', f.quantidade) order by lower(i.nome))
                                               from public.fichas_tecnicas f join public.insumos i on i.id = f.insumo_id
                                              where f.produto_id = p.id), '[]'::jsonb),
                          'custo', (select round(coalesce(sum(f.quantidade * i.custo_medio), 0) * 100, 2)
                                      from public.fichas_tecnicas f join public.insumos i on i.id = f.insumo_id
                                     where f.produto_id = p.id))
                        order by s.ordem nulls last, s.nome, p.ordem, p.nome)
                   from public.produtos p left join public.setores s on s.id = p.setor_id
                  where p.loja_id = l.id and not p.combo), '[]'::jsonb))
             order by (l.id <> p_loja), l.nome)
        from public.lojas l where l.id = any (v_lojas)), '[]'::jsonb),
    'insumos', coalesce((
      select jsonb_object_agg(e.est, coalesce((select jsonb_agg(private.insumo_json(i) order by lower(i.nome))
                                                 from public.insumos i where i.estoque = e.est and i.ativo), '[]'::jsonb))
        from (select distinct private.estoque_da_loja(x) as est from unnest(v_lojas) x) e), '{}'::jsonb));
end;
$$;

-- Leva a ficha de um produto para o produto de mesmo nome nas outras lojas do grupo.
-- Insumos vão pelo nome no estoque de cada loja; se faltar algum, aquela loja fica de fora (e é avisada).
create or replace function public.copiar_ficha(p_loja uuid, p_produto uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta  uuid;
  v_nome   text;
  r        record;
  v_itens  jsonb;
  v_faltam text[];
  v_feitas text[] := array[]::text[];
  v_fora   jsonb := '[]'::jsonb;
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  select p.nome, l.conta_id into v_nome, v_conta
    from public.produtos p join public.lojas l on l.id = p.loja_id
   where p.id = p_produto and p.loja_id = p_loja;
  if v_nome is null then
    raise exception 'Produto não encontrado.' using errcode = 'no_data_found';
  end if;
  for r in
    select p.id as produto, l.id as loja, l.nome as loja_nome
      from public.produtos p join public.lojas l on l.id = p.loja_id
     where v_conta is not null and l.conta_id = v_conta and l.id <> p_loja and not p.combo
       and lower(btrim(p.nome)) = lower(btrim(v_nome)) and private.pode_estoque(l.id)
  loop
    select coalesce(jsonb_agg(jsonb_build_object('insumo_id', d.id, 'quantidade', f.quantidade)) filter (where d.id is not null), '[]'::jsonb),
           coalesce(array_agg(o.nome) filter (where d.id is null), array[]::text[])
      into v_itens, v_faltam
      from public.fichas_tecnicas f
      join public.insumos o on o.id = f.insumo_id
      left join lateral (select i.id from public.insumos i
                          where i.estoque = private.estoque_da_loja(r.loja) and i.ativo and lower(btrim(i.nome)) = lower(btrim(o.nome))
                          order by i.criado_em limit 1) d on true
     where f.produto_id = p_produto;
    if cardinality(v_faltam) > 0 then
      v_fora := v_fora || jsonb_build_object('loja', r.loja_nome, 'faltam', to_jsonb(v_faltam));
    else
      perform public.salvar_ficha(r.loja, r.produto, null, v_itens);
      v_feitas := v_feitas || r.loja_nome;
    end if;
  end loop;
  return jsonb_build_object('copiadas', to_jsonb(v_feitas), 'fora', v_fora);
end;
$$;

-- ---------------------------------------------------------------------------- Contagem (D-038)
-- Tela de contagem: insumos com origem (veio de NF-e ou foi cadastrado à mão) e a última contagem.
create or replace function public.contagem_painel(p_loja uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_est uuid := private.estoque_da_loja(p_loja);
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'de_nfe', coalesce((select jsonb_agg(distinct m.insumo_id) from public.estoque_movimentos m
                         where m.estoque = v_est and m.tipo = 'entrada_nfe'), '[]'::jsonb),
    'ultima', coalesce((select jsonb_object_agg(x.insumo_id, x.em)
                          from (select m.insumo_id, max(m.criado_em) as em from public.estoque_movimentos m
                                 where m.estoque = v_est and m.tipo = 'contagem' group by m.insumo_id) x), '{}'::jsonb));
end;
$$;

-- Salva uma contagem inteira de uma vez: o saldo de cada item passa a ser o contado.
-- Devolve quantos itens mudaram e a diferença em R$ (centavos; negativo = faltou).
create or replace function public.salvar_contagem(p_loja uuid, p_itens jsonb, p_obs text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  e       jsonb;
  v       public.insumos;
  v_qtd   numeric;
  v_n     integer := 0;
  v_dif   numeric := 0;
  v_obs   text := coalesce(nullif(btrim(left(coalesce(p_obs, ''), 200)), ''), 'Contagem de estoque');
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Nenhum item contado.' using errcode = 'check_violation';
  end if;
  for e in select * from jsonb_array_elements(p_itens) loop
    v_qtd := (e ->> 'quantidade')::numeric;
    select * into v from public.insumos where id = (e ->> 'insumo_id')::uuid and estoque = private.estoque_da_loja(p_loja) and ativo;
    if v.id is null or v_qtd is null or v_qtd < 0 then
      raise exception 'Confira os itens da contagem.' using errcode = 'check_violation';
    end if;
    if v_qtd <> v.saldo then
      v_n := v_n + 1;
      v_dif := v_dif + (v_qtd - v.saldo) * v.custo_medio;
      perform public.ajustar_estoque(p_loja, v.id, 'contagem', v_qtd, null, v_obs);
    end if;
  end loop;
  return jsonb_build_object('itens', jsonb_array_length(p_itens), 'mudaram', v_n, 'diferenca', round(v_dif * 100));
end;
$$;

grant execute on function public.meu_estoque(uuid, boolean), public.copiar_ficha(uuid, uuid), public.contagem_painel(uuid),
  public.salvar_contagem(uuid, jsonb, text) to authenticated;
revoke execute on function public.meu_estoque(uuid, boolean), public.copiar_ficha(uuid, uuid), public.contagem_painel(uuid),
  public.salvar_contagem(uuid, jsonb, text) from anon, public;
