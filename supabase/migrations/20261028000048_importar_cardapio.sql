-- 0048: importador de cardápio (BeeFood → RES), D-049. Pode rodar de novo.
-- Recebe o cardápio já convertido (setores, grupos com opções, produtos) e grava numa marca:
--  • o que já existia na marca fica PAUSADO (setor e produto fora do cardápio; pedidos antigos intactos);
--  • cada item importado é lembrado em private.importacoes (rodar de novo atualiza, não duplica);
--  • fichas técnicas de opções/produtos antigos com o mesmo nome são copiadas para os novos.

create table if not exists private.importacoes (
  loja_id  uuid not null references public.lojas (id) on delete cascade,
  chave    text not null,
  alvo     uuid not null,
  em       timestamptz not null default now(),
  primary key (loja_id, chave)
);

create or replace function private.importar_cardapio(p_slug text, p_dados jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_marca  public.marcas;
  v_loja   uuid;
  v_id     uuid;
  v_g      uuid;
  s        jsonb;
  g        jsonb;
  o        jsonb;
  p        jsonb;
  k        text;
  v_ord    int;
  v_n      jsonb := '{}'::jsonb;
  v_opcs   uuid[];
begin
  select * into v_marca from public.marcas where slug = lower(btrim(p_slug));
  if not found then
    raise exception 'Marca "%" não encontrada.', p_slug;
  end if;
  v_loja := v_marca.loja_id;

  -- 1) pausa o que existe hoje nesta marca (o importado volta a ficar ativo logo abaixo)
  update public.setor_marcas sm set ativo = false
   where sm.marca_id = v_marca.id and sm.ativo
     and not exists (select 1 from private.importacoes i where i.loja_id = v_loja and i.alvo = sm.setor_id);
  update public.produto_marcas pm set ativo = false
   where pm.marca_id = v_marca.id and pm.ativo
     and not exists (select 1 from private.importacoes i where i.loja_id = v_loja and i.alvo = pm.produto_id);

  -- 2) categorias
  for s in select * from jsonb_array_elements(p_dados -> 'setores') loop
    k := s ->> 'chave';
    select alvo into v_id from private.importacoes where loja_id = v_loja and chave = k;
    if v_id is null or not exists (select 1 from public.setores where id = v_id) then
      insert into public.setores (loja_id, nome, delivery, presencial, ordem)
      values (v_loja, s ->> 'nome', true, true, (s ->> 'ordem')::int) returning id into v_id;
      insert into private.importacoes (loja_id, chave, alvo) values (v_loja, k, v_id)
        on conflict (loja_id, chave) do update set alvo = excluded.alvo, em = now();
    else
      update public.setores set nome = s ->> 'nome', delivery = true, presencial = true, ordem = (s ->> 'ordem')::int where id = v_id;
    end if;
    insert into public.setor_marcas (loja_id, setor_id, marca_id, ativo, ordem)
    values (v_loja, v_id, v_marca.id, true, (s ->> 'ordem')::int)
    on conflict (setor_id, marca_id) do update set ativo = true, ordem = excluded.ordem;
  end loop;

  -- 3) grupos e opções
  for g in select * from jsonb_array_elements(p_dados -> 'grupos') loop
    k := g ->> 'chave';
    select alvo into v_g from private.importacoes where loja_id = v_loja and chave = k;
    if v_g is null or not exists (select 1 from public.grupos_opcoes where id = v_g) then
      insert into public.grupos_opcoes (loja_id, nome, obrigatorio, pizza, formacao, min_qtd, max_qtd, permite_repetir)
      values (v_loja, g ->> 'nome', (g ->> 'obrigatorio')::boolean, (g ->> 'pizza')::boolean, (g ->> 'formacao')::public.formacao_preco,
              (g ->> 'min')::int, (g ->> 'max')::int, (g ->> 'permite_repetir')::boolean)
      returning id into v_g;
      insert into private.importacoes (loja_id, chave, alvo) values (v_loja, k, v_g)
        on conflict (loja_id, chave) do update set alvo = excluded.alvo, em = now();
    else
      update public.grupos_opcoes
         set nome = g ->> 'nome', ativo = true, delivery = true, presencial = true, obrigatorio = (g ->> 'obrigatorio')::boolean,
             pizza = (g ->> 'pizza')::boolean, formacao = (g ->> 'formacao')::public.formacao_preco,
             min_qtd = (g ->> 'min')::int, max_qtd = (g ->> 'max')::int, permite_repetir = (g ->> 'permite_repetir')::boolean
       where id = v_g;
    end if;
    v_opcs := '{}';
    for o in select * from jsonb_array_elements(g -> 'opcoes') loop
      k := o ->> 'chave';
      select alvo into v_id from private.importacoes where loja_id = v_loja and chave = k;
      if v_id is null or not exists (select 1 from public.opcoes where id = v_id and grupo_id = v_g) then
        insert into public.opcoes (loja_id, grupo_id, nome, preco, max_qtd, ordem, descricao, imagem_url)
        values (v_loja, v_g, o ->> 'nome', (o ->> 'preco')::numeric, (o ->> 'max')::int, (o ->> 'ordem')::int,
                nullif(o ->> 'descricao', ''), nullif(o ->> 'imagem', ''))
        returning id into v_id;
        insert into private.importacoes (loja_id, chave, alvo) values (v_loja, k, v_id)
          on conflict (loja_id, chave) do update set alvo = excluded.alvo, em = now();
      else
        update public.opcoes
           set nome = o ->> 'nome', preco = (o ->> 'preco')::numeric, preco_delivery = null, preco_presencial = null,
               min_qtd = 0, max_qtd = (o ->> 'max')::int, ordem = (o ->> 'ordem')::int, ativo = true, delivery = true, presencial = true,
               descricao = nullif(o ->> 'descricao', ''), imagem_url = nullif(o ->> 'imagem', ''), complemento_id = null, produto_id = null
         where id = v_id;
      end if;
      v_opcs := v_opcs || v_id;
    end loop;
    -- opção que saiu do BeeFood desde a última importação: desliga
    update public.opcoes set ativo = false where grupo_id = v_g and not (id = any (v_opcs));
  end loop;

  -- 4) produtos
  for p in select * from jsonb_array_elements(p_dados -> 'produtos') loop
    k := p ->> 'chave';
    select alvo into v_id from private.importacoes where loja_id = v_loja and chave = k;
    if v_id is null or not exists (select 1 from public.produtos where id = v_id) then
      insert into public.produtos (loja_id, setor_id, nome, preco)
      values (v_loja, (select alvo from private.importacoes where loja_id = v_loja and chave = p ->> 'setor'), p ->> 'nome', (p ->> 'preco')::numeric)
      returning id into v_id;
      insert into private.importacoes (loja_id, chave, alvo) values (v_loja, k, v_id)
        on conflict (loja_id, chave) do update set alvo = excluded.alvo, em = now();
    end if;
    update public.produtos
       set setor_id = (select alvo from private.importacoes where loja_id = v_loja and chave = p ->> 'setor'),
           nome = p ->> 'nome', descricao = nullif(p ->> 'descricao', ''), preco = (p ->> 'preco')::numeric,
           imagem_url = nullif(p ->> 'imagem', ''), ordem = (p ->> 'ordem')::int,
           serve_pessoas = nullif(p ->> 'serve', '')::int,
           restricoes = coalesce((select array_agg(x) from jsonb_array_elements_text(p -> 'restricoes') x), '{}'),
           fator_sabor = coalesce(nullif(p ->> 'fator', '')::numeric, fator_sabor),
           etiqueta = null, combo = false
     where id = v_id;
    insert into public.produto_marcas (loja_id, produto_id, marca_id, ativo, delivery, presencial, preco_delivery, preco_presencial, preco_promocional, ordem)
    values (v_loja, v_id, v_marca.id, true, true, true, nullif(p ->> 'preco_delivery', '')::numeric, nullif(p ->> 'preco_presencial', '')::numeric, null, (p ->> 'ordem')::int)
    on conflict (produto_id, marca_id) do update
       set ativo = true, delivery = true, presencial = true, preco_delivery = excluded.preco_delivery,
           preco_presencial = excluded.preco_presencial, preco_promocional = null, ordem = excluded.ordem;
    delete from public.produto_grupos where produto_id = v_id;
    v_ord := 0;
    for k in select jsonb_array_elements_text(p -> 'grupos') loop
      v_ord := v_ord + 1;
      insert into public.produto_grupos (loja_id, produto_id, grupo_id, ordem)
      values (v_loja, v_id, (select alvo from private.importacoes where loja_id = v_loja and chave = k), v_ord);
    end loop;
  end loop;

  -- 5) fichas técnicas: copia de item antigo com o mesmo nome (só para quem ainda não tem ficha)
  insert into public.fichas_tecnicas (loja_id, opcao_id, insumo_id, quantidade)
  select v_loja, n.id, f.insumo_id, f.quantidade
    from public.opcoes n
    join private.importacoes i on i.alvo = n.id and i.loja_id = v_loja
    join public.grupos_opcoes ng on ng.id = n.grupo_id
    cross join lateral (
      select a.id from public.opcoes a join public.grupos_opcoes ag on ag.id = a.grupo_id
       where a.loja_id = v_loja and a.id <> n.id and ag.pizza = ng.pizza
         and lower(btrim(a.nome)) = lower(btrim(n.nome))
         and not exists (select 1 from private.importacoes x where x.loja_id = v_loja and x.alvo = a.id)
         and exists (select 1 from public.fichas_tecnicas ff where ff.opcao_id = a.id)
       limit 1) src
    join public.fichas_tecnicas f on f.opcao_id = src.id
   where n.loja_id = v_loja and not exists (select 1 from public.fichas_tecnicas e where e.opcao_id = n.id);
  insert into public.fichas_tecnicas (loja_id, produto_id, insumo_id, quantidade)
  select v_loja, n.id, f.insumo_id, f.quantidade
    from public.produtos n
    join private.importacoes i on i.alvo = n.id and i.loja_id = v_loja
    cross join lateral (
      select a.id from public.produtos a
       where a.loja_id = v_loja and a.id <> n.id and lower(btrim(a.nome)) = lower(btrim(n.nome))
         and not exists (select 1 from private.importacoes x where x.loja_id = v_loja and x.alvo = a.id)
         and exists (select 1 from public.fichas_tecnicas ff where ff.produto_id = a.id)
       limit 1) src
    join public.fichas_tecnicas f on f.produto_id = src.id
   where n.loja_id = v_loja and not exists (select 1 from public.fichas_tecnicas e where e.produto_id = n.id);

  -- resumo para conferir
  select jsonb_build_object(
    'categorias', (select count(*) from public.setor_marcas sm join private.importacoes i on i.alvo = sm.setor_id where sm.marca_id = v_marca.id and sm.ativo),
    'produtos', (select count(*) from public.produto_marcas pm join private.importacoes i on i.alvo = pm.produto_id where pm.marca_id = v_marca.id and pm.ativo),
    'grupos', jsonb_array_length(p_dados -> 'grupos'),
    'opcoes', (select count(*) from public.opcoes op join private.importacoes i on i.alvo = op.id where op.loja_id = v_loja and op.ativo),
    'pausados_produtos', (select count(*) from public.produto_marcas pm where pm.marca_id = v_marca.id and not pm.ativo),
    'pausadas_categorias', (select count(*) from public.setor_marcas sm where sm.marca_id = v_marca.id and not sm.ativo))
  into v_n;
  return v_n;
end;
$$;
revoke execute on function private.importar_cardapio(text, jsonb) from public, anon, authenticated;
