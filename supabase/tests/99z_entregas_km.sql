-- Testes de 0020: bairros com valor do motoboy e km, despacho grava valor/km, rota real, ajuste e fechamento.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e7', 'dona@example.com'),
  ('00000000-0000-0000-0000-0000000000e8', 'moto7@equipe.res.invalid'),
  ('00000000-0000-0000-0000-0000000000e9', 'caixa7@equipe.res.invalid');

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
create temp table tokens (chave text primary key, t text);
grant all on ids, saida, tokens to authenticated;
create or replace function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where chave = p $$;
create or replace function pg_temp.v(p text) returns jsonb language sql as $$ select v from saida where chave = p $$;
create or replace function pg_temp.token(p text) returns text language sql as $$ select t from tokens where chave = p $$;

-- turno das 05:00 às 05:00
do $$ begin
  if private.inicio_turno('2026-10-24 01:30-03') <> '2026-10-23 05:00-03' then raise exception 'madrugada é do turno anterior'; end if;
  if private.inicio_turno('2026-10-23 19:00-03') <> '2026-10-23 05:00-03' then raise exception 'noite é do turno do dia'; end if;
  if private.inicio_turno('2026-10-23 05:00-03') <> '2026-10-23 05:00-03' then raise exception '05:00 abre o turno'; end if;
end $$;

select from pg_temp.como('00000000-0000-0000-0000-0000000000e7');
insert into ids values ('loja', public.criar_loja('Loja K', 'Pizza K', 'pizza-k', 'Dona'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-k';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza', pg_temp.id('setor'), 40));
select public.registrar_usuario_caixa(pg_temp.id('loja'), '00000000-0000-0000-0000-0000000000e8', 'moto7', 'Lia Moto', 'entregador');
select public.registrar_usuario_caixa(pg_temp.id('loja'), '00000000-0000-0000-0000-0000000000e9', 'caixa7', 'Caixa K');

-- local da loja e bairros
select public.salvar_local_loja(pg_temp.id('loja'), 'Rua XV, 100', -26.74, -49.17);
select from pg_temp.esperar_erro(format($q$select public.salvar_local_loja('%s', 'x y z', -26.7, null)$q$, pg_temp.id('loja')), 'juntas');
select public.salvar_areas_entrega(pg_temp.id('marca'), jsonb_build_array(
  jsonb_build_object('bairro', 'Centro', 'taxa', 5, 'valor_motoboy', 7, 'km', 2.4),
  jsonb_build_object('bairro', 'Testo Salto', 'taxa', 9, 'km', 6.8),
  jsonb_build_object('bairro', '  ', 'taxa', 1)));  -- linha vazia é ignorada
select from pg_temp.esperar_erro(format($q$select public.salvar_areas_entrega('%s', '[{"bairro":"Centro","taxa":1},{"bairro":" centro ","taxa":2}]')$q$, pg_temp.id('marca')), 'duas vezes');
-- tela Delivery antiga salva áreas: mantém valor do motoboy e km
select public.salvar_config_delivery(pg_temp.id('marca'), jsonb_build_object('areas', jsonb_build_array(
  jsonb_build_object('bairro', 'Centro', 'taxa', 6, 'ativo', true), jsonb_build_object('bairro', 'Testo Salto', 'taxa', 9, 'ativo', true))));
reset role;
do $$ begin
  if (select (lat, lng, endereco) from public.lojas where id = pg_temp.id('loja')) <> (-26.74::float8, -49.17::float8, 'Rua XV, 100'::text) then raise exception 'local da loja'; end if;
  if (select count(*) from public.areas_entrega where marca_id = pg_temp.id('marca')) <> 2 then raise exception 'áreas'; end if;
  if (select (taxa, valor_motoboy, km) from public.areas_entrega where bairro = 'Centro' and marca_id = pg_temp.id('marca')) <> (6::numeric, 7::numeric, 2.4::numeric) then
    raise exception 'config antiga apagou valor/km: %', (select row(taxa, valor_motoboy, km) from public.areas_entrega where bairro = 'Centro' and marca_id = pg_temp.id('marca'));
  end if;
end $$;

-- caixa (funcionário sem cardápio digital) não mexe nos bairros
select from pg_temp.como('00000000-0000-0000-0000-0000000000e9');
select from pg_temp.esperar_erro(format($q$select public.salvar_areas_entrega('%s', '[]')$q$, pg_temp.id('marca')), 'permissão');
reset role;

-- três entregas: Centro (valor do motoboy 7), Testo Salto (sem valor → taxa 9), bairro fora da tabela (taxa do pedido 4)
select from pg_temp.como('00000000-0000-0000-0000-0000000000e7');
insert into ids values ('a', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega',
  'cliente', jsonb_build_object('nome', 'Ana'), 'endereco', jsonb_build_object('logradouro', 'Rua 1', 'bairro', 'centro'),
  'pagamento', 'dinheiro', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
insert into ids values ('b', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega',
  'cliente', jsonb_build_object('nome', 'Bia'), 'endereco', jsonb_build_object('logradouro', 'Rua 2', 'bairro', 'Testo Salto'),
  'pagamento', 'cartao_credito', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
insert into ids values ('c', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega',
  'cliente', jsonb_build_object('nome', 'Cid'), 'endereco', jsonb_build_object('logradouro', 'Rua 3', 'bairro', 'Longe'),
  'pagamento', 'pix', 'taxa_entrega', 4, 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
reset role;
insert into tokens select k, (select qr_token from public.pedidos where id = pg_temp.id(k)) from unnest(array['a', 'b', 'c']) k;

select from pg_temp.como('00000000-0000-0000-0000-0000000000e8');
insert into saida values ('da', public.motoboy_despachar(pg_temp.token('a')));
insert into saida values ('db', public.motoboy_despachar(pg_temp.token('b')));
insert into saida values ('dc', public.motoboy_despachar(pg_temp.token('c')));
-- o app mediu a rota real do pedido A; linha reta não troca rota
select public.registrar_distancia(pg_temp.id('a'), 3.17, 'rota');
select public.registrar_distancia(pg_temp.id('a'), 1.2, 'reta');
select public.registrar_distancia(pg_temp.id('c'), 11.5, 'reta');
select from pg_temp.esperar_erro(format($q$select public.registrar_distancia('%s', 900, 'rota')$q$, pg_temp.id('a')), 'inválida');
select from pg_temp.esperar_erro(format($q$select public.ajustar_entrega('%s', 1, null)$q$, pg_temp.id('a')), 'não encontrado');  -- motoboy não ajusta o próprio valor
select public.motoboy_entregar(pg_temp.id('a'));
select public.motoboy_entregar(pg_temp.id('b'));
insert into saida values ('painel', public.motoboy_painel());
reset role;
do $$
declare p jsonb := pg_temp.v('painel');
begin
  if (pg_temp.v('da') ->> 'valor_motoboy')::int <> 700 or (pg_temp.v('da') ->> 'distancia_km')::numeric <> 2.4 or pg_temp.v('da') ->> 'distancia_fonte' <> 'bairro'
     or (pg_temp.v('da') ->> 'loja_lat')::float8 <> -26.74 then
    raise exception 'despacho A: %', pg_temp.v('da');
  end if;
  if (pg_temp.v('db') ->> 'valor_motoboy')::int <> 900 or (pg_temp.v('db') ->> 'distancia_km')::numeric <> 6.8 then raise exception 'despacho B: %', pg_temp.v('db'); end if;
  if (pg_temp.v('dc') ->> 'valor_motoboy')::int <> 400 or pg_temp.v('dc') ->> 'distancia_km' is not null then raise exception 'despacho C: %', pg_temp.v('dc'); end if;
  if (select (distancia_km, distancia_fonte) from public.pedidos where id = pg_temp.id('a')) <> (3.17::numeric, 'rota'::text) then raise exception 'rota A'; end if;
  if (select (distancia_km, distancia_fonte) from public.pedidos where id = pg_temp.id('c')) <> (11.5::numeric, 'reta'::text) then raise exception 'reta C'; end if;
  -- turno: A (7,00, 3,17 km, dinheiro 46) + B (9,00, 6,8 km, cartão 49)
  if (p #>> '{hoje,entregas}')::int <> 2 or (p #>> '{hoje,a_receber}')::int <> 1600 or (p #>> '{hoje,km}')::numeric <> 9.97
     or (p #>> '{hoje,cobrado_dinheiro}')::int <> 4600 or jsonb_array_length(p -> 'feitas') <> 2 or jsonb_array_length(p -> 'em_rota') <> 1 then
    raise exception 'painel do turno: %', p;
  end if;
end $$;

-- gestora ajusta C (valor e km manual); a rota medida depois não sobrescreve
select from pg_temp.como('00000000-0000-0000-0000-0000000000e7');
select public.ajustar_entrega(pg_temp.id('c'), 8, 12);
select public.registrar_distancia(pg_temp.id('c'), 10, 'rota');
reset role;
-- caixa vê o fechamento; motoboy não
select from pg_temp.como('00000000-0000-0000-0000-0000000000e9');
insert into saida values ('f', public.fechamento_motoboys(pg_temp.id('loja'), ((now() at time zone 'America/Sao_Paulo') - interval '5 hours')::date));
insert into saida values ('f0', public.fechamento_motoboys(pg_temp.id('loja'), ((now() at time zone 'America/Sao_Paulo') - interval '5 hours')::date - 1));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000000e8');
select from pg_temp.esperar_erro(format($q$select public.fechamento_motoboys('%s', current_date)$q$, pg_temp.id('loja')), 'acesso');
reset role;
do $$
declare f jsonb := pg_temp.v('f');
begin
  if (select (valor_motoboy, distancia_km, distancia_fonte) from public.pedidos where id = pg_temp.id('c')) <> (8::numeric, 12::numeric, 'manual'::text) then raise exception 'ajuste C'; end if;
  if (select count(*) from public.pedido_eventos where pedido_id = pg_temp.id('c') and motivo like 'Entrega ajustada%') <> 1 then raise exception 'evento do ajuste'; end if;
  if jsonb_array_length(f -> 'entregas') <> 3 or jsonb_array_length(pg_temp.v('f0') -> 'entregas') <> 0 then raise exception 'fechamento: %', f; end if;
  if (select sum((e ->> 'valor_motoboy')::int) from jsonb_array_elements(f -> 'entregas') e) <> 2400 then raise exception 'soma motoboy: %', f; end if;
  if (select count(*) from jsonb_array_elements(f -> 'entregas') e where e ->> 'entregador' = 'Lia Moto' and e ? 'pago' and e ? 'distancia_km') <> 3 then raise exception 'campos: %', f; end if;
end $$;

\o
\pset tuples_only on
select 'OK: km, valor do motoboy e fechamento';
