-- Testes de 0058: histórico do cliente no quadro.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000003d1', 'qd@example.com'),
  ('00000000-0000-0000-0000-0000000003d2', 'qd2@example.com'),
  ('00000000-0000-0000-0000-0000000003d3', 'qd3@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000003d1');
insert into ids values ('loja', public.criar_loja('Loja Q', 'Pizza Q', 'pizza-qd', 'Rui'));
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza', pg_temp.id('setor'), 50));
select from public.salvar_config_delivery((select id from public.marcas where slug = 'pizza-qd'), '{"status": "aberto", "pedido_minimo": 0, "aceita_entrega": true, "aceita_retirada": true, "formas_pagamento": ["dinheiro"], "areas": [{"bairro": "Centro", "taxa": 5}]}');
reset role;
set role anon;
select public.criar_pedido_publico('pizza-qd', format('{"tipo":"retirada","pagamento":"dinheiro","cliente":{"nome":"Ana","telefone":"47999990041"},"itens":[{"produto_id":"%s","quantidade":1,"escolhas":{}}]}', pg_temp.id('pz'))::jsonb);
select public.criar_pedido_publico('pizza-qd', format('{"tipo":"retirada","pagamento":"dinheiro","cliente":{"nome":"Ana","telefone":"47999990041"},"itens":[{"produto_id":"%s","quantidade":1,"escolhas":{}}]}', pg_temp.id('pz'))::jsonb);
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000003d1');
insert into saida values ('h', public.historico_clientes(array[pg_temp.id('loja')], array['47999990041', '47999990099']));
select from pg_temp.como('00000000-0000-0000-0000-0000000003d3');
insert into saida values ('fora', public.historico_clientes(array[pg_temp.id('loja')], array['47999990041']));
reset role;
\o
select case when jsonb_array_length(pg_temp.v('h') -> '47999990041') = 2 and not (pg_temp.v('h') ? '47999990099') and pg_temp.v('fora') = '{}'::jsonb then 'ok histórico do cliente (só para a equipe)' else 'FALHOU histórico ' || pg_temp.v('h')::text || ' / ' || pg_temp.v('fora')::text end;

-- 0059: aviso por etapa
\o /dev/null
insert into ids select 'ped', id from public.pedidos where loja_id = pg_temp.id('loja') order by numero limit 1;
select from pg_temp.como('00000000-0000-0000-0000-0000000003d1');
select from public.marcar_aviso(pg_temp.id('ped'), 'em_entrega');
select from pg_temp.como('00000000-0000-0000-0000-0000000003d3');
select from pg_temp.esperar_erro(format($q$select public.marcar_aviso('%s', 'pronto')$q$, pg_temp.id('ped')), 'não encontrado');
reset role;
\o
select case when (select avisos ? 'em_entrega' and not avisos ? 'pronto' from public.pedidos where id = pg_temp.id('ped')) then 'ok aviso marcado por etapa (só a equipe)' else 'FALHOU aviso' end;
