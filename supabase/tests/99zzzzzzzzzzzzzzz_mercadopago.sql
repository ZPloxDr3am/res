-- Testes de 0041: Mercado Pago (token só no servidor, permissões).
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000002c1', 'mp@example.com'),
  ('00000000-0000-0000-0000-0000000002c2', 'moto18@equipe.res.invalid'),
  ('00000000-0000-0000-0000-0000000002c3', 'fora4@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000002c1');
insert into ids values ('loja', public.criar_loja('Loja MP', 'Pizza MP', 'pizza-mp', 'Ana'));
select from pg_temp.esperar_erro(format($q$select public.salvar_mp('%s', 'TEST-123', null, null, null)$q$, pg_temp.id('loja')), 'APP_USR');
select public.salvar_mp(pg_temp.id('loja'), 'APP_USR-1234567890abcdefghij-XYZ9', 'loja@exemplo.com', 123, 'LOJA MP');
select public.mp_aceitar_ao_pagar(pg_temp.id('loja'), false);
insert into saida values ('st', public.mp_status(pg_temp.id('loja')));
-- o token não é lido por ninguém logado
select from pg_temp.esperar_erro($q$select access_token from public.mp_contas$q$, 'permission denied');
select from pg_temp.como('00000000-0000-0000-0000-0000000002c3');
select from pg_temp.esperar_erro(format($q$select public.mp_status('%s')$q$, pg_temp.id('loja')), 'gestores');
reset role;
set role anon;
select from pg_temp.esperar_erro($q$select * from public.mp_pagamentos$q$, 'permission denied');
reset role;
do $$ begin
  if not (pg_temp.v('st') ->> 'conectado')::boolean or pg_temp.v('st') ->> 'final' <> 'XYZ9' or pg_temp.v('st') ? 'access_token'
     or (pg_temp.v('st') ->> 'aceitar_ao_pagar')::boolean then
    raise exception 'mp_status: %', pg_temp.v('st');
  end if;
end $$;
-- pedido Pix do cardápio com MP: não aceita na criação (mesmo com aceite automático), não imprime; pago libera
reset role;
update public.lojas set aceite_automatico = true where id = pg_temp.id('loja');
select from pg_temp.como('00000000-0000-0000-0000-0000000002c1');
insert into ids select 'marca', id from public.marcas where slug = 'pizza-mp';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza MP', pg_temp.id('setor'), 50));
reset role;
insert into ids values ('ped', private.inserir_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'retirada',
  'cliente', jsonb_build_object('nome', 'Lia', 'telefone', '47996731809'), 'pagamento', 'pix',
  'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1))), 'cardapio_digital', null));
insert into ids values ('ped2', private.inserir_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'retirada',
  'cliente', jsonb_build_object('nome', 'Rui', 'telefone', '47996731808'), 'pagamento', 'dinheiro',
  'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1))), 'cardapio_digital', null));
insert into ids values ('ped3', private.inserir_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'balcao',
  'cliente', jsonb_build_object('nome', 'Leo', 'telefone', '47996731807'), 'pagamento', 'pix',
  'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1))), 'painel', null));
do $$ begin
  if (select status from public.pedidos where id = pg_temp.id('ped3')) <> 'novo' or not (select aguarda_pagamento from public.pedidos where id = pg_temp.id('ped3')) then
    raise exception 'pix do painel deveria esperar';
  end if;
  if (select status from public.pedidos where id = pg_temp.id('ped')) <> 'novo' or not (select aguarda_pagamento from public.pedidos where id = pg_temp.id('ped')) then
    raise exception 'pix deveria esperar: %', (select status from public.pedidos where id = pg_temp.id('ped'));
  end if;
  if (select status from public.pedidos where id = pg_temp.id('ped2')) <> 'em_preparo' or (select aguarda_pagamento from public.pedidos where id = pg_temp.id('ped2')) then
    raise exception 'dinheiro segue o aceite automático';
  end if;
end $$;
update public.pedidos set pago_em = now() where id in (pg_temp.id('ped'), pg_temp.id('ped3'));
update public.pedidos set criado_em = now() - interval '1 hour' where id = pg_temp.id('ped2');
do $$ begin
  if (select aguarda_pagamento from public.pedidos where id = pg_temp.id('ped')) then raise exception 'pago deveria liberar'; end if;
  if private.cancelar_pix_nao_pago() <> 0 then raise exception 'não deveria cancelar pedido pago nem em dinheiro'; end if;
end $$;
select from pg_temp.como('00000000-0000-0000-0000-0000000002c1');
select public.desconectar_mp(pg_temp.id('loja'));
reset role;
do $$ begin if exists (select 1 from public.mp_contas) then raise exception 'desconectar'; end if; end $$;

\o
\pset tuples_only on
select 'OK: Mercado Pago';
