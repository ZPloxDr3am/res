-- Testes de 0045: vitrine do cardápio (capa, logo, cor, redes, ingredientes, selo e Mais pedido).
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000002d1', 'vit@example.com'),
  ('00000000-0000-0000-0000-0000000002d2', 'moto19@equipe.res.invalid'),
  ('00000000-0000-0000-0000-0000000002d3', 'fora5@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000002d1');
insert into ids values ('loja', public.criar_loja('Loja V', 'Pizza V', 'pizza-vit', 'Ana'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-vit';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza V', pg_temp.id('setor'), 50));
insert into ids values ('sabores', public.criar_grupo_vinculado(pg_temp.id('pz'), 'Sabores', 'proporcional', true, 1, 2, true,
  '[{"nome":"Calabresa","preco":50},{"nome":"Queijo","preco":50}]'));
insert into ids select 'o_cal', id from public.opcoes where nome = 'Calabresa' and grupo_id = pg_temp.id('sabores');
insert into ids select 'o_que', id from public.opcoes where nome = 'Queijo' and grupo_id = pg_temp.id('sabores');
select public.salvar_vitrine(pg_temp.id('marca'), '{"logo_url": "https://x.co/l.png", "cor": "#C8102E", "instagram": "@lapizza.itp", "whatsapp": "(47) 99920-1943", "descricao": "Pizzas"}');
select from pg_temp.esperar_erro(format($q$select public.salvar_vitrine('%s', '{"cor": "vermelho"}')$q$, pg_temp.id('marca')), 'marcas_vitrine');
select public.salvar_detalhe_opcao(pg_temp.id('o_que'), 'mussarela e orégano', 'recomendado');
update public.produtos set serve_pessoas = 3, restricoes = array['gelado'] where id = pg_temp.id('pz');
-- 3 pedidos com calabresa → "Mais pedido"
select public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'balcao', 'cliente', jsonb_build_object('nome', 'Ana'), 'pagamento', 'pix',
  'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1, 'escolhas', jsonb_build_object(pg_temp.id('sabores'), jsonb_build_object(pg_temp.id('o_cal'), 1))))))
  from generate_series(1, 3);
select from pg_temp.como('00000000-0000-0000-0000-0000000002d3');
select from pg_temp.esperar_erro(format($q$select public.salvar_vitrine('%s', '{}')$q$, pg_temp.id('marca')), 'permissão');
reset role;
set role anon;
insert into saida values ('vit', public.vitrine_publica('pizza-vit'));
reset role;
do $$
declare v jsonb := pg_temp.v('vit');
begin
  if v ->> 'cor' <> '#c8102e' or v ->> 'instagram' <> 'lapizza.itp' or v ->> 'whatsapp' <> '47999201943' or v ->> 'logo_url' <> 'https://x.co/l.png' then raise exception 'vitrine: %', v; end if;
  if v #>> array['opcoes', pg_temp.id('o_cal')::text, 'selo'] <> 'mais_pedido' or v #>> array['opcoes', pg_temp.id('o_que')::text, 'selo'] <> 'recomendado'
     or v #>> array['opcoes', pg_temp.id('o_que')::text, 'descricao'] <> 'mussarela e orégano' then raise exception 'opções: %', v -> 'opcoes'; end if;
  if (v #>> array['produtos', pg_temp.id('pz')::text, 'serve'])::int <> 3 or v #>> '{loja,nome}' <> 'Loja V' then raise exception 'produtos/loja: %', v; end if;
end $$;

\o
\pset tuples_only on
select 'OK: vitrine';
