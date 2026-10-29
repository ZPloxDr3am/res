-- Testes de 0056: cardápio de evento / aniversário.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000003c1', 'ev@example.com'),
  ('00000000-0000-0000-0000-0000000003c2', 'ev2@example.com'),
  ('00000000-0000-0000-0000-0000000003c3', 'ev3@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000003c1');
insert into ids values ('loja', public.criar_loja('Loja Ev', 'Pizza Ev', 'pizza-ev', 'Rui'));
insert into ids select 'base', id from public.marcas where slug = 'pizza-ev';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('media', public.criar_produto(pg_temp.id('loja'), 'Pizza Média 30cm', pg_temp.id('setor'), 50));
select from public.salvar_config_delivery(pg_temp.id('base'), '{"status": "aberto", "pedido_minimo": 0, "aceita_entrega": true, "aceita_retirada": true, "formas_pagamento": ["dinheiro"], "areas": [{"bairro": "Centro", "taxa": 5}]}');
reset role;
insert into public.grupos_opcoes (id, loja_id, nome, pizza, obrigatorio, min_qtd, max_qtd, permite_repetir)
values ('00000000-0000-0000-0000-00000000e001', pg_temp.id('loja'), 'Escolha 2 sabores', true, true, 2, 2, true);
insert into public.opcoes (id, loja_id, grupo_id, nome, preco, max_qtd, ordem) values
  ('00000000-0000-0000-0000-00000000e011', pg_temp.id('loja'), '00000000-0000-0000-0000-00000000e001', 'Calabresa', 0, 2, 1),
  ('00000000-0000-0000-0000-00000000e012', pg_temp.id('loja'), '00000000-0000-0000-0000-00000000e001', 'Mussarela', 0, 2, 2),
  ('00000000-0000-0000-0000-00000000e013', pg_temp.id('loja'), '00000000-0000-0000-0000-00000000e001', 'Camarão', 15, 2, 3);
insert into public.produto_grupos (loja_id, produto_id, grupo_id, ordem) values (pg_temp.id('loja'), pg_temp.id('media'), '00000000-0000-0000-0000-00000000e001', 1);
insert into public.insumos (id, estoque, nome, unidade) values ('00000000-0000-0000-0000-00000000e021', pg_temp.id('loja'), 'Calabresa', 'KG');
insert into public.fichas_tecnicas (loja_id, opcao_id, insumo_id, quantidade) values (pg_temp.id('loja'), '00000000-0000-0000-0000-00000000e011', '00000000-0000-0000-0000-00000000e021', 0.1);

select from pg_temp.como('00000000-0000-0000-0000-0000000003c1');
-- pacote básico (1 cardápio): o evento entra mesmo assim, como bônus; o segundo não
insert into ids values ('ev', public.criar_evento(pg_temp.id('loja'), 'Aniversário 5 anos', 'pizza-ev-aniversario', pg_temp.id('base'), now() - interval '1 hour', now() + interval '1 day'));
select from pg_temp.esperar_erro(format($q$select public.criar_evento('%s', 'Outro', 'pizza-ev-outro', '%s', null, null)$q$, pg_temp.id('loja'), pg_temp.id('base')), 'um cardápio de evento');
insert into ids values ('copia', public.copiar_para_evento(pg_temp.id('ev'), pg_temp.id('media')));
select from pg_temp.esperar_erro(format($q$select public.copiar_para_evento('%s', '%s')$q$, pg_temp.id('ev'), pg_temp.id('copia')), 'já é do evento');
insert into ids select 'g_copia', grupo_id from public.produto_grupos where produto_id = pg_temp.id('copia');
insert into ids select 'o_cal', id from public.opcoes where grupo_id = pg_temp.id('g_copia') and nome = 'Calabresa';
insert into ids select 'o_cam', id from public.opcoes where grupo_id = pg_temp.id('g_copia') and nome = 'Camarão';
-- no evento: sabor único, R$ 39,90, sem camarão
select from public.salvar_produto_evento(pg_temp.id('copia'), jsonb_build_object('nome', 'Pizza Média Aniversário', 'preco', 39.9, 'ativo', true,
  'grupos', jsonb_build_array(jsonb_build_object('id', pg_temp.id('g_copia'), 'nome', 'Escolha 1 sabor', 'min', 1, 'max', 1, 'obrigatorio', true, 'permite_repetir', false,
    'opcoes', jsonb_build_array(jsonb_build_object('id', pg_temp.id('o_cam'), 'ativo', false))))));
select from pg_temp.esperar_erro(format($q$select public.salvar_produto_evento('%s', '{"nome":"X","preco":10}')$q$, pg_temp.id('media')), 'cardápio de evento');
insert into saida values ('pub', public.cardapio_publico('pizza-ev-aniversario'));
insert into saida values ('pub_base', public.cardapio_publico('pizza-ev'));
reset role;

set role anon;
insert into saida values ('ped', public.criar_pedido_publico('pizza-ev-aniversario', jsonb_build_object('tipo', 'retirada', 'pagamento', 'dinheiro',
  'cliente', jsonb_build_object('nome', 'Ana', 'telefone', '47999990021'),
  'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('copia'), 'quantidade', 1, 'escolhas', jsonb_build_object(pg_temp.id('g_copia'), jsonb_build_object(pg_temp.id('o_cal'), 1)))))));
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizza-ev-aniversario', '{"tipo":"retirada","pagamento":"dinheiro","cliente":{"nome":"Bia","telefone":"47999990022"},"itens":[{"produto_id":"%s","quantidade":1,"escolhas":{"%s":{"%s":1}}}]}')$q$, pg_temp.id('copia'), pg_temp.id('g_copia'), pg_temp.id('o_cam')), 'indisponível');
insert into saida values ('evpub', public.evento_publico('pizza-ev-aniversario'));
reset role;

-- encerrado: não aceita mais pedido pelo link
select from pg_temp.como('00000000-0000-0000-0000-0000000003c1');
select from public.salvar_evento(pg_temp.id('ev'), jsonb_build_object('nome', 'Aniversário 5 anos', 'inicio', (now() - interval '3 day')::text, 'fim', (now() - interval '1 day')::text));
reset role;
set role anon;
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizza-ev-aniversario', '{"tipo":"retirada","pagamento":"dinheiro","cliente":{"nome":"Caio","telefone":"47999990023"},"itens":[{"produto_id":"%s","quantidade":1,"escolhas":{"%s":{"%s":1}}}]}')$q$, pg_temp.id('copia'), pg_temp.id('g_copia'), pg_temp.id('o_cal')), 'não está valendo');
reset role;
-- funcionário de fora não mexe
select from pg_temp.como('00000000-0000-0000-0000-0000000003c3');
select from pg_temp.esperar_erro(format($q$select public.copiar_para_evento('%s', '%s')$q$, pg_temp.id('ev'), pg_temp.id('media')), 'Só o dono');
select from pg_temp.como('00000000-0000-0000-0000-0000000003c1');
select from public.remover_produto_evento(pg_temp.id('copia'));
reset role;

\o
select case when (select total from public.pedidos where loja_id = pg_temp.id('loja') and numero = (pg_temp.v('ped') ->> 'numero')::int) = 39.9 then 'ok pedido do evento com sabor único a 39,90' else 'FALHOU preço evento' end;
select case when (select min_qtd = 2 and max_qtd = 2 from public.grupos_opcoes where id = '00000000-0000-0000-0000-00000000e001')
             and (select count(*) from public.opcoes where grupo_id = '00000000-0000-0000-0000-00000000e001' and ativo) = 3
             and (select preco = 50 and nome = 'Pizza Média 30cm' from public.produtos where id = pg_temp.id('media')) then 'ok cardápio principal intacto' else 'FALHOU principal mexido' end;
select case when jsonb_array_length(pg_temp.v('pub') -> 'setores') = 1 and (pg_temp.v('pub') -> 'setores' -> 0 -> 'produtos' -> 0 ->> 'nome') = 'Pizza Média Aniversário'
             and (pg_temp.v('pub_base') -> 'setores' -> 0 -> 'produtos' -> 0 ->> 'nome') = 'Pizza Média 30cm'
             and jsonb_array_length(pg_temp.v('pub_base') -> 'setores' -> 0 -> 'produtos') = 1 then 'ok cada link mostra só o seu cardápio' else 'FALHOU públicos' end;
select case when (pg_temp.v('evpub') ->> 'nome') = 'Aniversário 5 anos' and (pg_temp.v('evpub') ->> 'base') = 'pizza-ev' then 'ok evento público' else 'FALHOU evento_publico' end;
select case when (select count(*) from public.marcas where loja_id = pg_temp.id('loja') and evento) = 1
             and (select count(*) from public.areas_entrega where marca_id = pg_temp.id('ev')) = 1 then 'ok evento bônus com bairros copiados' else 'FALHOU evento bônus' end;
select case when not exists (select 1 from public.produtos where id = pg_temp.id('copia')) and not exists (select 1 from public.grupos_opcoes where id = pg_temp.id('g_copia')) then 'ok tirar do evento apaga só a cópia' else 'FALHOU remover' end;
