-- Testes de 0022: combo com escolhas, preço, pedido, cardápio público, cópia e categoria de up-sell.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f8', 'combo@example.com'),
  ('00000000-0000-0000-0000-0000000000f9', 'caixa8@equipe.res.invalid');
create or replace function pg_temp.como(p_user text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user, false);
  execute 'set role authenticated';
end; $$;
create or replace function pg_temp.esperar_erro(p_sql text, p_trecho text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_trecho in sqlerrm) = 0 and position(p_trecho in sqlstate) = 0 then
      raise exception 'Erro inesperado: % (esperava "%")', sqlerrm, p_trecho;
    end if;
    return;
  end;
  raise exception 'Deveria ter falhado: %', p_sql;
end; $$;
create temp table ids (chave text primary key, id uuid);
create temp table saida (chave text primary key, v jsonb);
grant all on ids, saida to authenticated;
create or replace function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where chave = p $$;
create or replace function pg_temp.v(p text) returns jsonb language sql as $$ select v from saida where chave = p $$;

select from pg_temp.como('00000000-0000-0000-0000-0000000000f8');
insert into ids values ('loja', public.criar_loja('Loja C', 'Pizza C', 'pizza-c', 'Cris'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-c';
insert into ids values ('pizzas', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('bebidas', public.salvar_setor(pg_temp.id('loja'), null, 'Bebidas'));
insert into ids values ('combos', public.salvar_setor(pg_temp.id('loja'), null, 'Combos'));
insert into ids values ('gigante', public.criar_produto(pg_temp.id('loja'), 'Pizza Gigante', pg_temp.id('pizzas'), 91.99));
insert into ids values ('coca', public.criar_produto(pg_temp.id('loja'), 'Coca 2L', pg_temp.id('bebidas'), 15));
insert into ids values ('guarana', public.criar_produto(pg_temp.id('loja'), 'Guaraná 2L', pg_temp.id('bebidas'), 14));
insert into ids values ('sabores', public.criar_grupo(pg_temp.id('loja'), 'Sabores', 'maior', true, 1, 2, true, false,
  '[{"nome":"Calabresa"},{"nome":"Costela","preco":6}]'));
select from public.definir_produtos_do_grupo(pg_temp.id('sabores'), array[pg_temp.id('gigante')]);
update public.setores set upsell = true where id = pg_temp.id('bebidas');
reset role;
insert into ids select 'calabresa', id from public.opcoes where grupo_id = pg_temp.id('sabores') and nome = 'Calabresa';
insert into ids select 'costela', id from public.opcoes where grupo_id = pg_temp.id('sabores') and nome = 'Costela';

-- montar o combo
select from pg_temp.como('00000000-0000-0000-0000-0000000000f8');
select from pg_temp.esperar_erro(format($q$select public.salvar_combo('%s', null, '{"nome":"X","preco":10,"passos":[]}')$q$, pg_temp.id('loja')), 'pelo menos uma escolha');
select from pg_temp.esperar_erro(format($q$select public.salvar_combo('%s', null, '{"nome":"X","preco":10,"passos":[{"titulo":"Nada"}]}')$q$, pg_temp.id('loja')), 'categoria ou produtos');
insert into ids values ('combo', public.salvar_combo(pg_temp.id('loja'), null, jsonb_build_object(
  'nome', 'Combo Família', 'descricao', 'Gigante + refri 2L', 'preco', 99.90, 'setor_id', pg_temp.id('combos'),
  'passos', jsonb_build_array(
    jsonb_build_object('titulo', 'Pizza', 'produtos', jsonb_build_array(pg_temp.id('gigante'))),
    jsonb_build_object('titulo', 'Refri 2L', 'setor_id', pg_temp.id('bebidas'))))));
select from pg_temp.esperar_erro(format($q$select public.salvar_combo('%s', null, '{"nome":"Y","preco":10,"passos":[{"titulo":"C","produtos":["%s"]}]}')$q$, pg_temp.id('loja'), pg_temp.id('combo')), 'combo não entra');
reset role;
insert into ids select 'p_pizza', id from public.combo_passos where combo_id = pg_temp.id('combo') and ordem = 0;
insert into ids select 'p_refri', id from public.combo_passos where combo_id = pg_temp.id('combo') and ordem = 1;

-- preço: 99,90 + 6,00 (Costela é o sabor mais caro na formação "maior")
do $$
declare
  v_esc jsonb := jsonb_build_object('passos', jsonb_build_array(
    jsonb_build_object('passo_id', pg_temp.id('p_pizza'), 'produto_id', pg_temp.id('gigante'),
                       'escolhas', jsonb_build_object(pg_temp.id('sabores'), jsonb_build_object(pg_temp.id('calabresa'), 1, pg_temp.id('costela'), 1))),
    jsonb_build_object('passo_id', pg_temp.id('p_refri'), 'produto_id', pg_temp.id('guarana'))));
  v jsonb;
begin
  v := private.preco_item(pg_temp.id('combo'), pg_temp.id('marca'), 'delivery', v_esc);
  if (v ->> 'base')::int <> 9990 or (v ->> 'unitario')::int <> 10590 then raise exception 'preço do combo: %', v; end if;
  if jsonb_array_length(v -> 'opcoes') <> 4 or v #>> '{0,grupo_nome}' <> 'Pizza' or v #>> '{0,nome}' <> 'Pizza Gigante'
     or v #>> '{1,grupo_nome}' <> 'Pizza Gigante · Sabores' or v #>> '{3,nome}' <> 'Guaraná 2L' then
    raise exception 'linhas do combo: %', v -> 'opcoes';
  end if;
end $$;
do $$ begin
  -- falta a bebida
  begin
    perform private.preco_item(pg_temp.id('combo'), pg_temp.id('marca'), 'delivery', jsonb_build_object('passos', jsonb_build_array(
      jsonb_build_object('passo_id', pg_temp.id('p_pizza'), 'produto_id', pg_temp.id('gigante'), 'escolhas', jsonb_build_object(pg_temp.id('sabores'), jsonb_build_object(pg_temp.id('calabresa'), 1))))));
    raise exception 'sem bebida deveria falhar';
  exception when check_violation then
    if sqlerrm not like '%Refri 2L%' then raise; end if;
  end;
  -- produto que não vale no passo
  begin
    perform private.preco_item(pg_temp.id('combo'), pg_temp.id('marca'), 'delivery', jsonb_build_object('passos', jsonb_build_array(
      jsonb_build_object('passo_id', pg_temp.id('p_pizza'), 'produto_id', pg_temp.id('coca')),
      jsonb_build_object('passo_id', pg_temp.id('p_refri'), 'produto_id', pg_temp.id('coca')))));
    raise exception 'coca como pizza deveria falhar';
  exception when check_violation then
    if sqlerrm not like '%não vale%' then raise; end if;
  end;
end $$;

-- pedido com o combo: um item, total 105,90, linhas de opção para a cozinha
select from pg_temp.como('00000000-0000-0000-0000-0000000000f8');
insert into ids values ('pedido', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'balcao', 'pagamento', 'pix',
  'cliente', jsonb_build_object('nome', 'Duda'),
  'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('combo'), 'quantidade', 2, 'escolhas', jsonb_build_object('passos', jsonb_build_array(
    jsonb_build_object('passo_id', pg_temp.id('p_pizza'), 'produto_id', pg_temp.id('gigante'), 'escolhas', jsonb_build_object(pg_temp.id('sabores'), jsonb_build_object(pg_temp.id('calabresa'), 1))),
    jsonb_build_object('passo_id', pg_temp.id('p_refri'), 'produto_id', pg_temp.id('coca')))))))));
insert into ids values ('copia', public.duplicar_produto(pg_temp.id('combo')));
reset role;
do $$ begin
  if (select (subtotal, total) from public.pedidos where id = pg_temp.id('pedido')) <> (199.80::numeric, 199.80::numeric) then raise exception 'total do pedido'; end if;
  if (select count(*) from public.pedido_itens where pedido_id = pg_temp.id('pedido')) <> 1 then raise exception 'um item só'; end if;
  if (select count(*) from public.pedido_item_opcoes o join public.pedido_itens i on i.id = o.item_id where i.pedido_id = pg_temp.id('pedido')) <> 3 then raise exception 'linhas'; end if;
  if not (select combo from public.produtos where id = pg_temp.id('copia')) or (select count(*) from public.combo_passos where combo_id = pg_temp.id('copia')) <> 2 then raise exception 'cópia do combo'; end if;
end $$;

-- comanda (0024): linhas do combo na ordem escolhida, com o passo marcado
do $$
declare o jsonb := private.dados_cupom(pg_temp.id('pedido')) #> '{itens,0,opcoes}';
begin
  if (o #>> '{0,passo}')::boolean is not true or o #>> '{0,nome}' <> 'Pizza Gigante' or (o #>> '{1,passo}')::boolean or o #>> '{1,nome}' <> 'Calabresa'
     or (o #>> '{2,passo}')::boolean is not true or o #>> '{2,nome}' <> 'Coca 2L' then
    raise exception 'comanda do combo: %', o;
  end if;
end $$;

-- cardápio público: combo com passos e produtos; Bebidas marcada como up-sell
insert into saida values ('pub', public.cardapio_publico('pizza-c'));
do $$
declare
  c jsonb := (select p from jsonb_array_elements(pg_temp.v('pub') -> 'setores') s, jsonb_array_elements(s -> 'produtos') p where p ->> 'nome' = 'Combo Família');
begin
  if not (c ->> 'combo')::boolean or jsonb_array_length(c -> 'passos') <> 2 or jsonb_array_length(c #> '{passos,1,produtos}') <> 2
     or jsonb_array_length(c #> '{passos,0,produtos,0,grupos}') <> 1 then
    raise exception 'combo público: %', c;
  end if;
  if (select (s ->> 'upsell')::boolean from jsonb_array_elements(pg_temp.v('pub') -> 'setores') s where s ->> 'nome' = 'Bebidas') is not true then raise exception 'upsell'; end if;
end $$;

\o
\pset tuples_only on
select 'OK: combos e up-sell';
