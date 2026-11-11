-- Testes de 0048–0049: importador de cardápio (BeeFood → RES).
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000002f1', 'imp@example.com'),
  ('00000000-0000-0000-0000-0000000002f2', 'imp2@example.com'),
  ('00000000-0000-0000-0000-0000000002f3', 'imp3@example.com');
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
grant all on ids, saida to authenticated, anon;
create or replace function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where chave = p $$;
create or replace function pg_temp.v(p text) returns jsonb language sql as $$ select v from saida where chave = p $$;

select from pg_temp.como('00000000-0000-0000-0000-0000000002f1');
insert into ids values ('loja', public.criar_loja('Loja I', 'Pizza I', 'pizza-imp', 'Rui'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-imp';
insert into ids values ('setor_velho', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas antigas'));
insert into ids values ('velho', public.criar_produto(pg_temp.id('loja'), 'Pizza velha', pg_temp.id('setor_velho'), 50));
select from public.salvar_config_delivery(pg_temp.id('marca'), '{"status": "aberto", "pedido_minimo": 0, "aceita_entrega": true, "aceita_retirada": true, "formas_pagamento": ["dinheiro"], "areas": [{"bairro": "Centro", "taxa": 5}]}');
reset role;
-- sabor antigo com ficha (deve ser copiada para os novos "Calabresa")
insert into public.grupos_opcoes (id, loja_id, nome, pizza, min_qtd, max_qtd) values ('00000000-0000-0000-0000-0000000f0001', pg_temp.id('loja'), 'Sabores antigos', true, 1, 1);
insert into public.opcoes (id, loja_id, grupo_id, nome, preco) values ('00000000-0000-0000-0000-0000000f0002', pg_temp.id('loja'), '00000000-0000-0000-0000-0000000f0001', 'calabresa ', 0);
insert into public.insumos (id, estoque, nome, unidade) values ('00000000-0000-0000-0000-0000000f0003', pg_temp.id('loja'), 'Calabresa fatiada', 'KG');
insert into public.fichas_tecnicas (loja_id, opcao_id, insumo_id, quantidade) values (pg_temp.id('loja'), '00000000-0000-0000-0000-0000000f0002', '00000000-0000-0000-0000-0000000f0003', 0.1);

insert into saida values ('r1', private.importar_cardapio('pizza-imp', (select dados from private.cardapios_importados where chave = 'la-pizza')));
insert into saida values ('r2', private.importar_cardapio('pizza-imp', (select dados from private.cardapios_importados where chave = 'la-pizza')));
create or replace function pg_temp.k(p text) returns uuid language sql as $$ select alvo from private.importacoes where loja_id = pg_temp.id('loja') and chave = p $$;
insert into ids values ('grande', pg_temp.k('beefood:produto:2565017'));

-- pedido: Grande 35CM + Borda Catupiry + Atum (Especial), Bacon, Baiana + Sem adicional + Não, obrigado = 78,99 + 14 + 6 = 98,99
insert into saida select 'esc', jsonb_build_object(
  pg_temp.k('beefood:grupo:261297'), jsonb_build_object(pg_temp.k('beefood:opcao:261297:2551297'), 1),
  pg_temp.k('beefood:grupo:262273'), jsonb_build_object(pg_temp.k('beefood:opcao:262273:2564896'), 1, pg_temp.k('beefood:opcao:262273:2564897'), 1, pg_temp.k('beefood:opcao:262273:2564898'), 1),
  pg_temp.k('beefood:grupo:261282'), jsonb_build_object(pg_temp.k('beefood:opcao:261282:2565082'), 1),
  pg_temp.k('beefood:grupo:261306'), jsonb_build_object(pg_temp.k('beefood:opcao:261306:2551577'), 1));
insert into saida select 'esc2', (pg_temp.v('esc') - pg_temp.k('beefood:grupo:262273')::text) || jsonb_build_object(pg_temp.k('beefood:grupo:262273'), jsonb_build_object(pg_temp.k('beefood:opcao:262273:2564896'), 2));
set role anon;
insert into saida values ('ped', public.criar_pedido_publico('pizza-imp', jsonb_build_object('tipo', 'retirada', 'pagamento', 'dinheiro',
  'cliente', jsonb_build_object('nome', 'Ana', 'telefone', '47999990011'),
  'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('grande'), 'quantidade', 1, 'escolhas', pg_temp.v('esc'))))));
-- 2 sabores na Grande (precisa de 3): recusa
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizza-imp', '{"tipo":"retirada","pagamento":"dinheiro","cliente":{"nome":"Bia","telefone":"47999990012"},"itens":[{"produto_id":"%s","quantidade":1,"escolhas":%s}]}')$q$,
  pg_temp.id('grande'), pg_temp.v('esc2')), 'Escolha');
insert into saida values ('pub', public.cardapio_publico('pizza-imp'));
reset role;

\o
select case when pg_temp.v('r1') = pg_temp.v('r2') and (pg_temp.v('r2') ->> 'produtos')::int = 37 and (pg_temp.v('r2') ->> 'categorias')::int = 5 and (pg_temp.v('r2') ->> 'opcoes')::int = 584
            then 'ok importa 37 produtos, 5 categorias, 584 opções e não duplica ao repetir' else 'FALHOU contagens ' || pg_temp.v('r1')::text || ' / ' || pg_temp.v('r2')::text end;
select case when (select count(*) from private.importacoes where loja_id = pg_temp.id('loja')) = 5 + 37 + 17 + 584 then 'ok mapa sem duplicar' else 'FALHOU mapa' end;
select case when (select total from public.pedidos where loja_id = pg_temp.id('loja') and numero = (pg_temp.v('ped') ->> 'numero')::int) = 98.99 then 'ok preço igual ao BeeFood (98,99)' else 'FALHOU preço ' || (select total from public.pedidos where loja_id = pg_temp.id('loja') and numero = (pg_temp.v('ped') ->> 'numero')::int) end;
select case when not (select ativo from public.produto_marcas where produto_id = pg_temp.id('velho')) and not (select ativo from public.setor_marcas where setor_id = pg_temp.id('setor_velho')) then 'ok antigos pausados' else 'FALHOU antigos' end;
select case when jsonb_array_length(pg_temp.v('pub') -> 'setores') = 5 and (pg_temp.v('pub') -> 'setores' -> 0 ->> 'nome') = 'Combos mais vendidos' then 'ok cardápio público com 5 categorias na ordem' else 'FALHOU público ' || (pg_temp.v('pub') -> 'setores')::text end;
select case when (select count(*) from public.fichas_tecnicas f join public.opcoes o on o.id = f.opcao_id join private.importacoes i on i.alvo = o.id where o.loja_id = pg_temp.id('loja') and lower(o.nome) = 'calabresa') = 7 then 'ok ficha do sabor copiada (7 tamanhos/grupos)' else 'FALHOU ficha copiada' end;
select case when (select permite_repetir and min_qtd = 3 and max_qtd = 3 and pizza from public.grupos_opcoes where id = pg_temp.k('beefood:grupo:262273'))
             and (select not permite_repetir from public.grupos_opcoes where id = pg_temp.k('beefood:grupo:262277'))
             and (select fator_sabor = 3 from public.produtos where id = pg_temp.k('beefood:produto:2565017')) then 'ok regras dos sabores e fator' else 'FALHOU regras sabores' end;
