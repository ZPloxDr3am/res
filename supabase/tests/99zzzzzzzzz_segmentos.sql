-- Testes de 0030: segmentos de clientes (mesma regra do core), lista filtrada e exportação.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000001c1', 'seg@example.com'),
  ('00000000-0000-0000-0000-0000000001c2', 'moto12@equipe.res.invalid'),
  ('00000000-0000-0000-0000-0000000001c3', 'fora@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000001c1');
insert into ids values ('loja', public.criar_loja('Loja S', 'Pizza S', 'pizza-seg', 'Rui'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-seg';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza', pg_temp.id('setor'), 50));
select public.registrar_usuario_caixa(pg_temp.id('loja'), '00000000-0000-0000-0000-0000000001c2', 'moto12', 'Seg Moto', 'entregador');
insert into ids values ('a1', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 5,
  'cliente', jsonb_build_object('nome', 'Ana Fiel', 'telefone', '47911110001'), 'endereco', jsonb_build_object('logradouro', 'Rua 1', 'numero', '10', 'bairro', 'Centro'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
insert into ids values ('a2', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 5,
  'cliente', jsonb_build_object('nome', 'Ana Fiel', 'telefone', '47911110001'), 'endereco', jsonb_build_object('logradouro', 'Rua 1', 'numero', '10', 'bairro', 'Centro'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
insert into ids values ('a3', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 5,
  'cliente', jsonb_build_object('nome', 'Ana Fiel', 'telefone', '47911110001'), 'endereco', jsonb_build_object('logradouro', 'Rua 1', 'numero', '10', 'bairro', 'Centro'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
insert into ids values ('a4', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 5,
  'cliente', jsonb_build_object('nome', 'Ana Fiel', 'telefone', '47911110001'), 'endereco', jsonb_build_object('logradouro', 'Rua 1', 'numero', '10', 'bairro', 'Centro'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
insert into ids values ('b1', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 5,
  'cliente', jsonb_build_object('nome', 'Beto Sumido', 'telefone', '47911110002'), 'endereco', jsonb_build_object('logradouro', 'Rua 1', 'numero', '10', 'bairro', 'Centro'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
insert into ids values ('c1', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 5,
  'cliente', jsonb_build_object('nome', 'Caio Cancelou', 'telefone', '47911110003'), 'endereco', jsonb_build_object('logradouro', 'Rua 1', 'numero', '10', 'bairro', 'Centro'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
reset role;

-- regra igual à do core (packages/core/src/segmentos.ts CASOS_SEGMENTO)
do $$
declare r record;
begin
  for r in select * from (values
  (null::int, 0, null::text),
  (3::int, 0, null::text),
  (0::int, 1, 'promissores'::text),
  (30::int, 1, 'promissores'::text),
  (10::int, 2, 'potenciais'::text),
  (30::int, 3, 'potenciais'::text),
  (5::int, 4, 'fieis'::text),
  (30::int, 12, 'fieis'::text),
  (31::int, 4, 'atencao'::text),
  (60::int, 9, 'atencao'::text),
  (31::int, 1, 'quase_dormentes'::text),
  (60::int, 3, 'quase_dormentes'::text),
  (61::int, 4, 'em_risco'::text),
  (120::int, 20, 'em_risco'::text),
  (61::int, 3, 'hibernando'::text),
  (120::int, 1, 'hibernando'::text),
  (121::int, 50, 'dormindo'::text),
  (400::int, 1, 'dormindo'::text)) v(dias, pedidos, esperado) loop
    if private.segmento_cliente(r.dias, r.pedidos) is distinct from r.esperado then
      raise exception 'segmento(%, %) = % (esperava %)', r.dias, r.pedidos, private.segmento_cliente(r.dias, r.pedidos), r.esperado;
    end if;
  end loop;
end $$;

update public.pedidos set criado_em = now() - interval '10 days' where id in (pg_temp.id('a1'), pg_temp.id('a2'), pg_temp.id('a3'), pg_temp.id('a4'));
update public.pedidos set criado_em = now() - interval '45 days' where id = pg_temp.id('b1');
update public.pedidos set status = 'cancelado', cancelado_em = now(), motivo_cancelamento = 'teste' where id = pg_temp.id('c1');

select from pg_temp.como('00000000-0000-0000-0000-0000000001c1');
insert into saida values ('todos', public.listar_clientes(pg_temp.id('loja')));
insert into saida values ('fieis', public.listar_clientes(pg_temp.id('loja'), 'fieis'));
insert into saida values ('busca', public.listar_clientes(pg_temp.id('loja'), null, 'beto'));
insert into saida values ('exp', public.exportar_clientes(pg_temp.id('loja'), 'fieis'));
insert into saida values ('exp_todos', public.exportar_clientes(pg_temp.id('loja')));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000001c3');
select from pg_temp.esperar_erro(format($q$select public.listar_clientes('%s')$q$, pg_temp.id('loja')), 'acesso aos clientes');
select from pg_temp.esperar_erro(format($q$select public.exportar_clientes('%s')$q$, pg_temp.id('loja')), 'exportar');
reset role;

do $$
declare t jsonb := pg_temp.v('todos'); f jsonb := pg_temp.v('fieis');
begin
  if t -> 'contagens' <> '{"fieis": 1, "quase_dormentes": 1}'::jsonb or (t ->> 'sem_pedido')::int <> 1 or (t ->> 'total')::int <> 3 then
    raise exception 'contagens: %', t;
  end if;
  if (f ->> 'total')::int <> 1 or f #>> '{clientes,0,nome}' <> 'Ana Fiel' or (f #>> '{clientes,0,pedidos}')::int <> 4
     or f #>> '{clientes,0,segmento}' <> 'fieis' or (f #>> '{clientes,0,dias}')::int <> 10 or (f #>> '{clientes,0,total_gasto}')::int <> 22000 then
    raise exception 'fiéis: %', f;
  end if;
  if (pg_temp.v('busca') ->> 'total')::int <> 1 or pg_temp.v('busca') #>> '{clientes,0,segmento}' <> 'quase_dormentes' then
    raise exception 'busca: %', pg_temp.v('busca');
  end if;
  if jsonb_array_length(pg_temp.v('exp')) <> 1 or pg_temp.v('exp') #>> '{0,telefone}' <> '47911110001' or pg_temp.v('exp') #>> '{0,bairro}' <> 'Centro' then
    raise exception 'exportar: %', pg_temp.v('exp');
  end if;
  if jsonb_array_length(pg_temp.v('exp_todos')) <> 2 then raise exception 'exportar todos (sem quem só cancelou): %', pg_temp.v('exp_todos'); end if;
end $$;

\o
\pset tuples_only on
select 'OK: segmentos de clientes';
