-- Testes de 0047: taxa por raio em km.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000002e1', 'km@example.com'),
  ('00000000-0000-0000-0000-0000000002e2', 'km2@example.com'),
  ('00000000-0000-0000-0000-0000000002e3', 'km3@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000002e1');
insert into ids values ('loja', public.criar_loja('Loja K', 'Pizza K', 'pizza-km', 'Rui'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-km';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza', pg_temp.id('setor'), 50));
select from public.salvar_config_delivery(pg_temp.id('marca'), '{"status": "aberto", "pedido_minimo": 0, "aceita_entrega": true, "aceita_retirada": true, "formas_pagamento": ["dinheiro"], "areas": [{"bairro": "Centro", "taxa": 5}]}');
-- loja em Pomerode (-26.74, -49.18)
select from public.salvar_local_loja(pg_temp.id('loja'), 'Rua A', -26.74, -49.18);

-- sem faixas: bairro fora da lista continua recusado
reset role;
set role anon;
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizza-km', '{"tipo":"entrega","pagamento":"dinheiro","cliente":{"nome":"Ana","telefone":"47999990001"},"endereco":{"logradouro":"Rua B","bairro":"Testo Alto"},"destino":{"lat":-26.76,"lng":-49.18},"itens":[{"produto_id":"%s","quantidade":1,"escolhas":{}}]}')$q$, pg_temp.id('pz')), 'Ainda não entregamos');
reset role;

select from pg_temp.como('00000000-0000-0000-0000-0000000002e1');
select from public.salvar_faixas_km(pg_temp.id('marca'), '[{"ate_km": 3, "taxa": 6, "minutos_extra": 0}, {"ate_km": 6, "taxa": 9.5, "minutos_extra": 10}]');
select from pg_temp.esperar_erro(format($q$select public.salvar_faixas_km('%s', '[{"ate_km": 3, "taxa": 6}, {"ate_km": 3, "taxa": 7}]')$q$, pg_temp.id('marca')), 'mesmo km');
-- quem não é da loja não grava
select from pg_temp.como('00000000-0000-0000-0000-0000000002e3');
select from pg_temp.esperar_erro(format($q$select public.salvar_faixas_km('%s', '[]')$q$, pg_temp.id('marca')), 'Sem permissão');
reset role;

set role anon;
insert into saida values ('pub', public.faixas_km_publica('pizza-km'));
-- ~2,2 km: primeira faixa (R$ 6)
insert into saida values ('p1', public.criar_pedido_publico('pizza-km', format('{"tipo":"entrega","pagamento":"dinheiro","cliente":{"nome":"Ana","telefone":"47999990001"},"endereco":{"logradouro":"Rua B","bairro":"Testo Alto"},"destino":{"lat":-26.76,"lng":-49.18},"itens":[{"produto_id":"%s","quantidade":1,"escolhas":{}}]}', pg_temp.id('pz'))::jsonb));
-- ~4,4 km: segunda faixa (R$ 9,50)
insert into saida values ('p2', public.criar_pedido_publico('pizza-km', format('{"tipo":"entrega","pagamento":"dinheiro","cliente":{"nome":"Bia","telefone":"47999990002"},"endereco":{"logradouro":"Rua C","bairro":"Wunderwald"},"destino":{"lat":-26.78,"lng":-49.18},"itens":[{"produto_id":"%s","quantidade":1,"escolhas":{}}]}', pg_temp.id('pz'))::jsonb));
-- bairro da lista ganha da faixa
insert into saida values ('p3', public.criar_pedido_publico('pizza-km', format('{"tipo":"entrega","pagamento":"dinheiro","cliente":{"nome":"Cris","telefone":"47999990003"},"endereco":{"logradouro":"Rua D","bairro":"centro"},"destino":{"lat":-26.78,"lng":-49.18},"itens":[{"produto_id":"%s","quantidade":1,"escolhas":{}}]}', pg_temp.id('pz'))::jsonb));
-- ~11 km: fora da área
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizza-km', '{"tipo":"entrega","pagamento":"dinheiro","cliente":{"nome":"Davi","telefone":"47999990004"},"endereco":{"logradouro":"Rua E","bairro":"Longe"},"destino":{"lat":-26.84,"lng":-49.18},"itens":[{"produto_id":"%s","quantidade":1,"escolhas":{}}]}')$q$, pg_temp.id('pz')), 'fora da nossa área');
-- sem coordenadas e bairro fora da lista: recusa
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizza-km', '{"tipo":"entrega","pagamento":"dinheiro","cliente":{"nome":"Eva","telefone":"47999990005"},"endereco":{"logradouro":"Rua F","bairro":"Longe"},"itens":[{"produto_id":"%s","quantidade":1,"escolhas":{}}]}')$q$, pg_temp.id('pz')), 'Ainda não entregamos');
reset role;

\o
select case when (pg_temp.v('pub') -> 'faixas' -> 1 ->> 'taxa')::int = 950 and (pg_temp.v('pub') ->> 'lat')::numeric = -26.74 then 'ok faixas públicas' else 'FALHOU faixas públicas ' || pg_temp.v('pub')::text end;
select case when (select taxa_entrega from public.pedidos where numero = (pg_temp.v('p1') ->> 'numero')::int and loja_id = pg_temp.id('loja')) = 6 then 'ok faixa 1' else 'FALHOU faixa 1' end;
select case when (select taxa_entrega from public.pedidos where numero = (pg_temp.v('p2') ->> 'numero')::int and loja_id = pg_temp.id('loja')) = 9.5 then 'ok faixa 2' else 'FALHOU faixa 2' end;
select case when (select taxa_entrega from public.pedidos where numero = (pg_temp.v('p3') ->> 'numero')::int and loja_id = pg_temp.id('loja')) = 5 then 'ok bairro ganha' else 'FALHOU bairro ganha' end;
select case when (select distancia_reta_km between 2 and 2.5 and destino_lat = -26.76 from public.pedidos where numero = (pg_temp.v('p1') ->> 'numero')::int and loja_id = pg_temp.id('loja')) then 'ok destino e km gravados' else 'FALHOU destino' end;
select case when (select destino_lat = -26.78 and distancia_reta_km > 4 from public.pedidos where numero = (pg_temp.v('p3') ->> 'numero')::int and loja_id = pg_temp.id('loja')) then 'ok destino no bairro' else 'FALHOU destino bairro' end;
