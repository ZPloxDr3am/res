-- Testes de 0023: % por categoria, cupons e limite de desconto no balcão.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000fa', 'desc@example.com'),
  ('00000000-0000-0000-0000-0000000000fb', 'caixa5@equipe.res.invalid');
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
create or replace function pg_temp.pedido(p_tel text, p_extra jsonb default '{}') returns jsonb language sql as $$
  select jsonb_build_object('tipo', 'retirada', 'pagamento', 'pix', 'cliente', jsonb_build_object('nome', 'Cli', 'telefone', p_tel),
           'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('grande'), 'quantidade', 1))) || p_extra
$$;

select from pg_temp.como('00000000-0000-0000-0000-0000000000fa');
insert into ids values ('loja', public.criar_loja('Loja D', 'Pizza D', 'pizza-d', 'Dani'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-d';
insert into ids values ('pizzas', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('grande', public.criar_produto(pg_temp.id('loja'), 'Pizza Grande', pg_temp.id('pizzas'), 81.99));
insert into ids values ('broto', public.criar_produto(pg_temp.id('loja'), 'Pizza Broto', pg_temp.id('pizzas'), 44.90));
select public.registrar_usuario_caixa(pg_temp.id('loja'), '00000000-0000-0000-0000-0000000000fb', 'caixa5', 'Caixa D');
reset role;

-- % na categoria: 20% em Pizzas; promoção própria menor vence
do $$
declare v_prod public.produtos; v_pm public.produto_marcas;
begin
  insert into public.promocoes_categoria (loja_id, setor_id, percentual) values (pg_temp.id('loja'), pg_temp.id('pizzas'), 20);
  if (private.preco_item(pg_temp.id('grande'), pg_temp.id('marca'), 'delivery', '{}') ->> 'base')::int <> 6559 then raise exception '20%% na grande'; end if;
  if (private.produto_publico(pg_temp.id('grande'), pg_temp.id('marca')) ->> 'preco_original')::int <> 8199 then raise exception 'riscado com %% da categoria'; end if;
  update public.produto_marcas set preco_promocional = 69.99 where produto_id = pg_temp.id('grande');
  if (private.preco_item(pg_temp.id('grande'), pg_temp.id('marca'), 'delivery', '{}') ->> 'base')::int <> 6559 then raise exception 'categoria menor que promo'; end if;
  update public.produto_marcas set preco_promocional = 60 where produto_id = pg_temp.id('grande');
  if (private.preco_item(pg_temp.id('grande'), pg_temp.id('marca'), 'delivery', '{}') ->> 'base')::int <> 6000 then raise exception 'promo menor que categoria'; end if;
  -- fora do dia não vale
  update public.promocoes_categoria set dias = array[((extract(dow from now() at time zone 'America/Sao_Paulo')::int + 1) % 7)]::smallint[] where setor_id = pg_temp.id('pizzas');
  update public.produto_marcas set preco_promocional = null where produto_id = pg_temp.id('grande');
  if (private.preco_item(pg_temp.id('grande'), pg_temp.id('marca'), 'delivery', '{}') ->> 'base')::int <> 8199 then raise exception 'categoria fora do dia'; end if;
end $$;

-- cupons
insert into public.cupons (loja_id, codigo, tipo, valor, pedido_minimo, primeira_compra) values (pg_temp.id('loja'), 'PRIMEIRA10', 'percentual', 10, 50, true);
insert into public.cupons (loja_id, codigo, tipo, valor, limite_total) values (pg_temp.id('loja'), 'DEZ', 'valor', 10, 1);
insert into public.cupons (loja_id, codigo, tipo) values (pg_temp.id('loja'), 'FRETE', 'frete');
do $$ begin
  if (public.validar_cupom('pizza-d', 'primeira10', 8199, 0, 'retirada', '47 99999-0001') ->> 'desconto')::int <> 820 then raise exception 'validar 10%%'; end if;
end $$;
select from pg_temp.esperar_erro($q$select public.validar_cupom('pizza-d', 'PRIMEIRA10', 4000, 0, 'retirada', '47999990001')$q$, 'a partir de R$ 50,00');
select from pg_temp.esperar_erro($q$select public.validar_cupom('pizza-d', 'NAOEXISTE', 4000, 0, 'retirada', '47999990001')$q$, 'não encontrado');
select from pg_temp.esperar_erro($q$select public.validar_cupom('pizza-d', 'FRETE', 4000, 0, 'retirada', '47999990001')$q$, 'só para pedidos de entrega');

select from pg_temp.como('00000000-0000-0000-0000-0000000000fa');
insert into ids values ('p1', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.pedido('47999990001', '{"cupom":"primeira10"}')));
select from pg_temp.esperar_erro(format($q$select public.criar_pedido('%s', '%s', '%s')$q$, pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.pedido('47999990001', '{"cupom":"PRIMEIRA10"}')), 'primeira compra');
insert into ids values ('p2', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.pedido('47999990002', '{"cupom":"DEZ"}')));
select from pg_temp.esperar_erro(format($q$select public.criar_pedido('%s', '%s', '%s')$q$, pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.pedido('47999990003', '{"cupom":"DEZ"}')), 'esgotou');
reset role;
do $$ begin
  if (select (desconto, total, cupom_codigo) from public.pedidos where id = pg_temp.id('p1')) <> (8.20::numeric, 73.79::numeric, 'PRIMEIRA10'::text) then raise exception 'cupom no pedido: %', (select row(desconto, total, cupom_codigo) from public.pedidos where id = pg_temp.id('p1')); end if;
  if (select total from public.pedidos where id = pg_temp.id('p2')) <> 71.99 then raise exception 'cupom R$ 10'; end if;
end $$;

-- limite de desconto no balcão: 10% para quem não é gestor
update public.lojas set limite_desconto_pct = 10 where id = pg_temp.id('loja');
select from pg_temp.como('00000000-0000-0000-0000-0000000000fb');
select from pg_temp.esperar_erro(format($q$select public.criar_pedido('%s', '%s', '%s')$q$, pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.pedido('', '{"desconto": 5}')), 'motivo');
select public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.pedido('', '{"desconto": 8, "desconto_motivo": "cliente fiel"}'));  -- 8 de 81,99 < 10%
select from pg_temp.esperar_erro(format($q$select public.criar_pedido('%s', '%s', '%s')$q$, pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.pedido('', '{"desconto": 20, "desconto_motivo": "erro na pizza"}')), 'autorização do gerente');
select from pg_temp.esperar_erro(format($q$select public.autorizar_desconto('%s')$q$, pg_temp.id('loja')), 'Só o dono');
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000000fa');
insert into ids values ('aut', public.autorizar_desconto(pg_temp.id('loja')));
select public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.pedido('', '{"desconto": 30, "desconto_motivo": "dono sem limite"}'));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000000fb');
insert into ids values ('p3', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.pedido('', jsonb_build_object('desconto', 20, 'desconto_motivo', 'erro na pizza', 'autorizacao', pg_temp.id('aut')))));
select from pg_temp.esperar_erro(format($q$select public.criar_pedido('%s', '%s', '%s')$q$, pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.pedido('', jsonb_build_object('desconto', 20, 'desconto_motivo', 'de novo', 'autorizacao', pg_temp.id('aut')))), 'autorização do gerente');
reset role;
do $$ begin
  if (select (desconto, desconto_motivo, desconto_por) from public.pedidos where id = pg_temp.id('p3')) <> (20::numeric, 'erro na pizza'::text, '00000000-0000-0000-0000-0000000000fa'::uuid) then raise exception 'autorização gravada'; end if;
end $$;

\o
\pset tuples_only on
select 'OK: descontos e cupons';
