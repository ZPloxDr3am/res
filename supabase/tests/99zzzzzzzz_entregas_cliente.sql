-- Testes de 0028: previsão e motoboy para o cliente (só quando é a próxima parada), prazo da loja e relatório de tempos.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000001b1', 'cli@example.com'),
  ('00000000-0000-0000-0000-0000000001b2', 'moto11@equipe.res.invalid'),
  ('00000000-0000-0000-0000-0000000001b3', 'fora@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000001b1');
insert into ids values ('loja', public.criar_loja('Loja K', 'Pizza K', 'pizza-cli', 'Rui'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-cli';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza', pg_temp.id('setor'), 50));
select public.registrar_usuario_caixa(pg_temp.id('loja'), '00000000-0000-0000-0000-0000000001b2', 'moto11', 'Tico Moto', 'entregador');
insert into ids values ('ped', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 5,
  'cliente', jsonb_build_object('nome', 'Bia'), 'endereco', jsonb_build_object('logradouro', 'Rua 1', 'numero', '10', 'bairro', 'Centro'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
insert into ids values ('ped2', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 5,
  'cliente', jsonb_build_object('nome', 'Caio'), 'endereco', jsonb_build_object('logradouro', 'Rua 1', 'numero', '10', 'bairro', 'Centro'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
insert into ids values ('ped3', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 5,
  'cliente', jsonb_build_object('nome', 'Duda'), 'endereco', jsonb_build_object('logradouro', 'Rua 1', 'numero', '10', 'bairro', 'Centro'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
reset role;

create temp table tok as select id, qr_token, codigo from public.pedidos where id in (pg_temp.id('ped'), pg_temp.id('ped2'), pg_temp.id('ped3'));
grant select on tok to authenticated, anon;
select from pg_temp.como('00000000-0000-0000-0000-0000000001b2');
select public.motoboy_despachar((select qr_token from tok where id = pg_temp.id('ped')));
select public.motoboy_despachar((select qr_token from tok where id = pg_temp.id('ped2')));
select public.registrar_posicao(-27.12, -48.62, 8, 5, 90);
select public.registrar_rota(array[pg_temp.id('ped2'), pg_temp.id('ped')], array['2030-01-01 20:10+00', '2030-01-01 20:25+00']::timestamptz[]);
reset role;

-- cliente (sem login) acompanha
set role anon;
insert into saida values ('c2', public.acompanhar_pedido((select codigo from tok where id = pg_temp.id('ped2'))));
insert into saida values ('c1', public.acompanhar_pedido((select codigo from tok where id = pg_temp.id('ped'))));
insert into saida values ('c3', public.acompanhar_pedido((select codigo from tok where id = pg_temp.id('ped3'))));
reset role;
do $$ begin
  if pg_temp.v('c2') -> 'motoboy' = 'null'::jsonb or (pg_temp.v('c2') #>> '{motoboy,lat}')::float8 <> -27.12
     or (pg_temp.v('c2') ->> 'paradas_antes')::int <> 0 or (pg_temp.v('c2') ->> 'previsao_chegada')::timestamptz <> '2030-01-01 20:10+00'
     or pg_temp.v('c2') ->> 'motoboy_nome' <> 'Tico' then
    raise exception 'próxima parada deveria ver o motoboy: %', pg_temp.v('c2');
  end if;
  if pg_temp.v('c1') -> 'motoboy' <> 'null'::jsonb or (pg_temp.v('c1') ->> 'paradas_antes')::int <> 1 then
    raise exception 'segunda parada não vê o motoboy: %', pg_temp.v('c1');
  end if;
  if pg_temp.v('c3') -> 'motoboy' <> 'null'::jsonb or pg_temp.v('c3') -> 'prazo' is null or pg_temp.v('c3') -> 'previsao_chegada' <> 'null'::jsonb then
    raise exception 'pedido na loja: %', pg_temp.v('c3');
  end if;
end $$;

-- entregou o primeiro: agora o outro é a próxima parada
select from pg_temp.como('00000000-0000-0000-0000-0000000001b2');
select public.motoboy_entregar(pg_temp.id('ped2'));
reset role;
set role anon;
insert into saida values ('c1b', public.acompanhar_pedido((select codigo from tok where id = pg_temp.id('ped'))));
reset role;
do $$ begin
  if pg_temp.v('c1b') -> 'motoboy' = 'null'::jsonb then raise exception 'virou a próxima parada: %', pg_temp.v('c1b'); end if;
end $$;

-- prazo da loja
select from pg_temp.como('00000000-0000-0000-0000-0000000001b1');
select public.salvar_prazo_entrega(pg_temp.id('loja'), 45);
select from pg_temp.esperar_erro(format($q$select public.salvar_prazo_entrega('%s', 5)$q$, pg_temp.id('loja')), '10 a 240');
insert into saida values ('rel', public.relatorio_entregas(pg_temp.id('loja'), current_date - 1, current_date + 1));
select from pg_temp.esperar_erro(format($q$select public.relatorio_entregas('%s', current_date - 200, current_date)$q$, pg_temp.id('loja')), '93 dias');
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000001b3');
select from pg_temp.esperar_erro(format($q$select public.salvar_prazo_entrega('%s', 50)$q$, pg_temp.id('loja')), 'permissão');
select from pg_temp.esperar_erro(format($q$select public.relatorio_entregas('%s', current_date, current_date)$q$, pg_temp.id('loja')), 'relatórios');
select public.registrar_rota(array[pg_temp.id('ped')]);  -- não é o motoboy: não muda nada
reset role;
do $$
declare r jsonb := pg_temp.v('rel');
begin
  if (select prazo_entrega_min from public.lojas where id = pg_temp.id('loja')) <> 45 then raise exception 'prazo da loja'; end if;
  if (select rota_ordem from public.pedidos where id = pg_temp.id('ped')) <> 2 then raise exception 'outra pessoa mudou a rota'; end if;
  if (r ->> 'pedidos')::int <> 3 or (r ->> 'entregas')::int <> 1 or jsonb_array_length(r -> 'por_motoboy') <> 1
     or r #>> '{por_motoboy,0,motoboy}' <> 'Tico Moto' or r #>> '{por_bairro,0,bairro}' <> 'Centro' then
    raise exception 'relatório: %', r;
  end if;
end $$;

\o
\pset tuples_only on
select 'OK: cliente acompanha, prazo e relatório';
