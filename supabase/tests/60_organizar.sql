-- Testes da 0012: organizar cardápio (ordem e troca de categoria) e mover produtos.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000601', 'olga@example.com'),
                                          ('00000000-0000-0000-0000-000000000602', 'pedro@example.com');

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
grant all on ids to authenticated;
create or replace function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where chave = p $$;
create or replace function pg_temp.nomes(p_setor uuid) returns text language sql as $$
  select string_agg(nome, ',' order by ordem) from public.produtos where setor_id is not distinct from p_setor and loja_id = (select id from ids where chave = 'loja')
$$;

select from pg_temp.como('00000000-0000-0000-0000-000000000601');
insert into ids values ('loja', public.criar_loja('Loja O', 'Lanches O', 'lanches-o', 'Olga'));
insert into ids values ('lanches', public.salvar_setor(pg_temp.id('loja'), null, 'Lanches'));
insert into ids values ('bebidas', public.salvar_setor(pg_temp.id('loja'), null, 'Bebidas'));
insert into ids values ('sobremesas', public.salvar_setor(pg_temp.id('loja'), null, 'Sobremesas'));
insert into ids values ('xbacon', public.criar_produto(pg_temp.id('loja'), 'X-Bacon', pg_temp.id('lanches'), 30));
insert into ids values ('xsalada', public.criar_produto(pg_temp.id('loja'), 'X-Salada', pg_temp.id('lanches'), 25));
insert into ids values ('coca', public.criar_produto(pg_temp.id('loja'), 'Coca', pg_temp.id('lanches'), 8));
insert into ids values ('suco', public.criar_produto(pg_temp.id('loja'), 'Suco', pg_temp.id('bebidas'), 9));
insert into ids values ('pudim', public.criar_produto(pg_temp.id('loja'), 'Pudim', pg_temp.id('bebidas'), 12));

-- Arrumação completa: categorias em outra ordem, Coca vai para Bebidas (no topo), Pudim para Sobremesas.
create temp table saida (v jsonb);
grant all on saida to authenticated;
insert into saida select public.organizar_cardapio(pg_temp.id('loja'),
  array[pg_temp.id('bebidas'), pg_temp.id('lanches'), pg_temp.id('sobremesas')],
  jsonb_build_array(
    jsonb_build_object('id', pg_temp.id('coca'), 'setor', pg_temp.id('bebidas')),
    jsonb_build_object('id', pg_temp.id('suco'), 'setor', pg_temp.id('bebidas')),
    jsonb_build_object('id', pg_temp.id('xsalada'), 'setor', pg_temp.id('lanches')),
    jsonb_build_object('id', pg_temp.id('xbacon'), 'setor', pg_temp.id('lanches')),
    jsonb_build_object('id', pg_temp.id('pudim'), 'setor', pg_temp.id('sobremesas'))));
do $$
declare r jsonb := (select v from saida);
begin
  if (select string_agg(nome, ',' order by ordem) from public.setores where loja_id = pg_temp.id('loja')) <> 'Bebidas,Lanches,Sobremesas' then
    raise exception 'ordem das categorias: %', (select string_agg(nome, ',' order by ordem) from public.setores where loja_id = pg_temp.id('loja'));
  end if;
  if pg_temp.nomes(pg_temp.id('bebidas')) <> 'Coca,Suco' then raise exception 'bebidas: %', pg_temp.nomes(pg_temp.id('bebidas')); end if;
  if pg_temp.nomes(pg_temp.id('lanches')) <> 'X-Salada,X-Bacon' then raise exception 'lanches: %', pg_temp.nomes(pg_temp.id('lanches')); end if;
  if pg_temp.nomes(pg_temp.id('sobremesas')) <> 'Pudim' then raise exception 'sobremesas: %', pg_temp.nomes(pg_temp.id('sobremesas')); end if;
  if (r ->> 'movidos')::int <> 2 then raise exception 'movidos: %', r; end if;
end $$;

-- O cardápio do cliente segue a mesma ordem.
reset role;
do $$
declare c jsonb := public.cardapio_publico('lanches-o');
begin
  if (select string_agg(s ->> 'nome', ',' order by o) from jsonb_array_elements(c -> 'setores') with ordinality t(s, o)) not like 'Bebidas,Lanches%' then
    raise exception 'cardápio público fora de ordem: %', c -> 'setores';
  end if;
end $$;
select from pg_temp.como('00000000-0000-0000-0000-000000000601');

-- Mover vários para outra categoria: entram no fim, na ordem dada.
select public.mover_produtos(array[pg_temp.id('xbacon'), pg_temp.id('pudim')], pg_temp.id('bebidas'));
do $$ begin
  if pg_temp.nomes(pg_temp.id('bebidas')) <> 'Coca,Suco,X-Bacon,Pudim' then raise exception 'mover_produtos: %', pg_temp.nomes(pg_temp.id('bebidas')); end if;
  if pg_temp.nomes(pg_temp.id('sobremesas')) is not null then raise exception 'sobremesas deveria ficar vazia'; end if;
end $$;
-- Mover para "sem categoria".
select public.mover_produtos(array[pg_temp.id('pudim')], null);
do $$ begin
  if (select setor_id from public.produtos where id = pg_temp.id('pudim')) is not null then raise exception 'sem categoria'; end if;
end $$;

-- Erros: produto repetido, categoria de outra loja, sem permissão.
select from pg_temp.esperar_erro(format($q$select public.organizar_cardapio('%s', '{}', '[{"id":"%s"},{"id":"%s"}]')$q$,
  pg_temp.id('loja'), pg_temp.id('coca'), pg_temp.id('coca')), 'repetido');
select from pg_temp.como('00000000-0000-0000-0000-000000000602');
insert into ids values ('loja2', public.criar_loja('Loja P', 'Pastel P', 'pastel-p', 'Pedro'));
insert into ids values ('pasteis', public.salvar_setor(pg_temp.id('loja2'), null, 'Pastéis'));
select from pg_temp.esperar_erro(format($q$select public.mover_produtos(array['%s']::uuid[], null)$q$, pg_temp.id('coca')), 'permissão');
select from pg_temp.esperar_erro(format($q$select public.organizar_cardapio('%s', array['%s']::uuid[], '[]')$q$, pg_temp.id('loja'), pg_temp.id('bebidas')), 'permissão');
select from pg_temp.como('00000000-0000-0000-0000-000000000601');
select from pg_temp.esperar_erro(format($q$select public.mover_produtos(array['%s']::uuid[], '%s')$q$, pg_temp.id('coca'), pg_temp.id('pasteis')), 'não é desta loja');
select from pg_temp.esperar_erro(format($q$select public.organizar_cardapio('%s', array['%s']::uuid[], '[]')$q$, pg_temp.id('loja'), pg_temp.id('pasteis')), 'não é desta loja');
reset role;

\o
\pset tuples_only on
select 'OK: organizar cardápio';
