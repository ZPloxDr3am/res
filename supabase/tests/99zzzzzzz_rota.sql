-- Testes de 0027: rota com várias entregas (ordem gravada só pelo motoboy dono, prazo, painel na ordem).
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000001a1', 'rota@example.com'),
  ('00000000-0000-0000-0000-0000000001a2', 'moto10@equipe.res.invalid'),
  ('00000000-0000-0000-0000-0000000001a3', 'fora@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000001a1');
insert into ids values ('loja', public.criar_loja('Loja Q', 'Pizza Q', 'pizza-q', 'Rui'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-q';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza', pg_temp.id('setor'), 50));
select public.registrar_usuario_caixa(pg_temp.id('loja'), '00000000-0000-0000-0000-0000000001a2', 'moto10', 'Rui Moto', 'entregador');
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
update public.lojas set prazo_entrega_min = 40 where id = pg_temp.id('loja');

create temp table tok as select id, qr_token from public.pedidos where id in (pg_temp.id('ped'), pg_temp.id('ped2'), pg_temp.id('ped3'));
grant select on tok to authenticated;
select from pg_temp.como('00000000-0000-0000-0000-0000000001a2');
select public.motoboy_despachar((select qr_token from tok where id = pg_temp.id('ped')));
select public.motoboy_despachar((select qr_token from tok where id = pg_temp.id('ped2')));
-- ped3 fica na loja: não entra na rota
select public.registrar_rota(array[pg_temp.id('ped2'), pg_temp.id('ped'), pg_temp.id('ped3')]);
insert into saida values ('painel', public.motoboy_painel());
reset role;

-- outra pessoa não mexe na ordem
select from pg_temp.como('00000000-0000-0000-0000-0000000001a3');
select public.registrar_rota(array[pg_temp.id('ped'), pg_temp.id('ped2')]);
reset role;

do $$
declare r jsonb := pg_temp.v('painel') -> 'em_rota';
begin
  if (select rota_ordem from public.pedidos where id = pg_temp.id('ped2')) <> 1
     or (select rota_ordem from public.pedidos where id = pg_temp.id('ped')) <> 2 then
    raise exception 'ordem da rota';
  end if;
  if (select rota_ordem from public.pedidos where id = pg_temp.id('ped3')) is not null then raise exception 'pedido fora da rota ganhou ordem'; end if;
  if jsonb_array_length(r) <> 2 or (r #>> '{0,id}')::uuid <> pg_temp.id('ped2') or (r #>> '{0,rota_ordem}')::int <> 1 then
    raise exception 'painel na ordem da rota: %', r;
  end if;
  if (r #>> '{1,prazo}')::timestamptz <> (select criado_em + interval '40 minutes' from public.pedidos where id = pg_temp.id('ped')) then
    raise exception 'prazo: %', r -> 1;
  end if;
  if not (r -> 0 ? 'destino_lat') then raise exception 'entrega sem destino_lat'; end if;
end $$;

select from pg_temp.esperar_erro($q$update public.lojas set prazo_entrega_min = 5$q$, 'check');

\o
\pset tuples_only on
select 'OK: rota com várias entregas';
