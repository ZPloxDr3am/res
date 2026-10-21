-- Testes da 0007: duplicar produto/categoria/grupo e grupos como biblioteca.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000b7', 'hana@example.com');

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

select from pg_temp.como('00000000-0000-0000-0000-0000000000b7');
insert into ids values ('loja', public.criar_loja('Loja H', 'Pizzaria H', 'pizzaria-h', 'Hana'));
insert into ids select 'marca', id from public.marcas where slug = 'pizzaria-h';
insert into ids values ('pizzas', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('bebidas', public.salvar_setor(pg_temp.id('loja'), null, 'Bebidas'));
insert into ids values ('grande', public.criar_produto(pg_temp.id('loja'), 'Grande', pg_temp.id('pizzas'), 80));
insert into ids values ('media', public.criar_produto(pg_temp.id('loja'), 'Média', pg_temp.id('pizzas'), 60));
insert into ids values ('broto', public.criar_produto(pg_temp.id('loja'), 'Broto', pg_temp.id('pizzas'), 40));

-- Biblioteca: grupo criado sem produto e aplicado a vários de uma vez.
insert into ids values ('sabores', public.criar_grupo(pg_temp.id('loja'), 'Sabores', 'proporcional', true, 1, 2, true, false,
  '[{"nome":"Calabresa"},{"nome":"Camarão","preco":6}]'));
insert into ids values ('borda', public.criar_grupo(pg_temp.id('loja'), 'Borda', 'soma', false, 0, 1, false, false, '[{"nome":"Catupiry","preco":8}]'));
select from pg_temp.esperar_erro(format($q$select public.criar_grupo('%s', 'Vazio', 'soma', false, 0, 1, false, false, '[]')$q$, pg_temp.id('loja')), 'pelo menos uma opção');
select from public.definir_produtos_do_grupo(pg_temp.id('sabores'), array[pg_temp.id('grande'), pg_temp.id('media'), pg_temp.id('broto')]);
select from public.definir_produtos_do_grupo(pg_temp.id('borda'), array[pg_temp.id('grande'), pg_temp.id('media')]);
do $$ begin
  if (select count(*) from public.produto_grupos where grupo_id = pg_temp.id('sabores')) <> 3 then raise exception 'aplicar sabores em 3'; end if;
  if (select ordem from public.produto_grupos where produto_id = pg_temp.id('grande') and grupo_id = pg_temp.id('borda')) <> 1 then raise exception 'borda deveria vir depois de sabores'; end if;
end $$;
-- Tirar da Broto e da Média pela tela do grupo.
select from public.definir_produtos_do_grupo(pg_temp.id('borda'), array[pg_temp.id('grande')]);
do $$ begin
  if (select count(*) from public.produto_grupos where grupo_id = pg_temp.id('borda')) <> 1 then raise exception 'borda só na grande'; end if;
end $$;
-- Pela tela do produto: ordem invertida (borda antes de sabores).
select from public.definir_grupos_do_produto(pg_temp.id('grande'), array[pg_temp.id('borda'), pg_temp.id('sabores')]);
do $$ begin
  if (select string_agg(g.nome, ',' order by pg.ordem) from public.produto_grupos pg join public.grupos_opcoes g on g.id = pg.grupo_id where pg.produto_id = pg_temp.id('grande')) <> 'Borda,Sabores' then
    raise exception 'ordem dos grupos do produto';
  end if;
end $$;
select from public.definir_grupos_do_produto(pg_temp.id('grande'), array[pg_temp.id('sabores')]);
do $$ begin
  if exists (select 1 from public.produto_grupos where produto_id = pg_temp.id('grande') and grupo_id = pg_temp.id('borda')) then raise exception 'desmarcar borda'; end if;
  if not exists (select 1 from public.grupos_opcoes where id = pg_temp.id('borda')) then raise exception 'borda deveria ficar na biblioteca'; end if;
end $$;

-- Duplicar produto: copia preços por marca e os MESMOS grupos; entra logo abaixo.
update public.produto_marcas set preco_delivery = 85, presencial = false where produto_id = pg_temp.id('grande');
insert into ids values ('grande2', public.duplicar_produto(pg_temp.id('grande')));
do $$
declare n record;
begin
  select * into n from public.produtos where id = pg_temp.id('grande2');
  if n.nome <> 'Grande-Cópia' or n.setor_id <> pg_temp.id('pizzas') or n.preco <> 80 then raise exception 'duplicar_produto: %', n; end if;
  if (select (preco_delivery, presencial) from public.produto_marcas where produto_id = n.id) <> (85::numeric, false) then raise exception 'preços/canais não copiados'; end if;
  if not exists (select 1 from public.produto_grupos where produto_id = n.id and grupo_id = pg_temp.id('sabores')) then raise exception 'grupos não copiados'; end if;
  if (select string_agg(nome, ',' order by ordem) from public.produtos where setor_id = pg_temp.id('pizzas')) <> 'Grande,Grande-Cópia,Média,Broto' then
    raise exception 'cópia deveria vir logo abaixo: %', (select string_agg(nome, ',' order by ordem) from public.produtos where setor_id = pg_temp.id('pizzas'));
  end if;
end $$;
-- Duplicar para outra categoria.
insert into ids values ('broto_beb', public.duplicar_produto(pg_temp.id('broto'), pg_temp.id('bebidas'), ''));
do $$ begin
  if (select (nome, setor_id) from public.produtos where id = pg_temp.id('broto_beb')) <> ('Broto-Cópia'::text, pg_temp.id('bebidas')) then raise exception 'duplicar para outra categoria'; end if;
end $$;

-- Duplicar categoria inteira.
insert into ids values ('pizzas2', public.duplicar_setor(pg_temp.id('pizzas')));
do $$ begin
  if (select nome from public.setores where id = pg_temp.id('pizzas2')) <> 'Pizzas-Cópia' then raise exception 'nome da categoria copiada'; end if;
  if (select count(*) from public.produtos where setor_id = pg_temp.id('pizzas2')) <> 4 then raise exception 'produtos da categoria copiada'; end if;
  if (select count(*) from public.setor_marcas where setor_id = pg_temp.id('pizzas2')) <> 1 then raise exception 'marcas da categoria copiada'; end if;
  if (select string_agg(nome, ',' order by ordem) from public.setores where loja_id = pg_temp.id('loja')) <> 'Pizzas,Pizzas-Cópia,Bebidas' then raise exception 'ordem das categorias'; end if;
  if (select count(*) from public.produto_grupos where grupo_id = pg_temp.id('sabores')) <> 9 then
    raise exception 'sabores deveria estar em 9 produtos (3 + cópia + broto copiado + 4 da categoria copiada): %', (select count(*) from public.produto_grupos where grupo_id = pg_temp.id('sabores'));
  end if;
  -- produtos da categoria copiada também viram cópia (o original continua na loja)
  if (select string_agg(nome, ',' order by ordem) from public.produtos where setor_id = pg_temp.id('pizzas2')) <> 'Grande-Cópia 2,Grande-Cópia 3,Média-Cópia,Broto-Cópia 2' then
    raise exception 'nomes na categoria copiada: %', (select string_agg(nome, ',' order by ordem) from public.produtos where setor_id = pg_temp.id('pizzas2'));
  end if;
end $$;

-- Regra do nome de cópia.
reset role;
do $$ begin
  if private.nome_copia('Pizza', array['Coca']) <> 'Pizza' then raise exception 'nome livre'; end if;
  if private.nome_copia('Pizza', array['pizza ']) <> 'Pizza-Cópia' then raise exception 'primeira cópia'; end if;
  if private.nome_copia('Pizza', array['Pizza', 'Pizza-Cópia']) <> 'Pizza-Cópia 2' then raise exception 'segunda cópia'; end if;
  if private.nome_copia('Pizza-Cópia', array['Pizza', 'Pizza-Cópia']) <> 'Pizza-Cópia 2' then raise exception 'cópia da cópia não empilha'; end if;
  if length(private.nome_copia(repeat('x', 100), array[repeat('x', 100)], 100)) <> 100
     or private.nome_copia(repeat('x', 100), array[repeat('x', 100)], 100) not like '%-Cópia' then raise exception 'limite de tamanho'; end if;
end $$;
select from pg_temp.como('00000000-0000-0000-0000-0000000000b7');

-- Duplicar grupo: cópia independente, sem produtos.
insert into ids values ('sabores2', public.duplicar_grupo(pg_temp.id('sabores')));
do $$ begin
  if (select nome from public.grupos_opcoes where id = pg_temp.id('sabores2')) <> 'Sabores-Cópia' then raise exception 'nome do grupo copiado'; end if;
  if (select count(*) from public.opcoes where grupo_id = pg_temp.id('sabores2')) <> 2 then raise exception 'opções do grupo copiado'; end if;
  if exists (select 1 from public.produto_grupos where grupo_id = pg_temp.id('sabores2')) then raise exception 'grupo copiado não deveria ter produtos'; end if;
end $$;
reset role;

-- Outra loja não mexe.
select from pg_temp.como('00000000-0000-0000-0000-0000000000d1');
select from pg_temp.esperar_erro(format($q$select public.duplicar_produto('%s')$q$, pg_temp.id('grande')), 'não encontrado');
select from pg_temp.esperar_erro(format($q$select public.definir_produtos_do_grupo('%s', '{}')$q$, pg_temp.id('sabores')), 'não encontrado');
select from pg_temp.esperar_erro(format($q$select public.duplicar_setor('%s')$q$, pg_temp.id('pizzas')), 'não encontrada');
reset role;

\o
\pset tuples_only on
select 'OK: biblioteca de grupos e duplicar';
