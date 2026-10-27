-- Testes de 0032: fidelidade (ganho igual ao core, uso, estorno, validade, prova no cardápio digital, permissões, relatório).
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000001e1', 'fid@example.com'),
  ('00000000-0000-0000-0000-0000000001e2', 'moto14@equipe.res.invalid'),
  ('00000000-0000-0000-0000-0000000001e3', 'fora@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000001e1');
insert into ids values ('loja', public.criar_loja('Loja F', 'Pizza F', 'pizza-fid', 'Rui'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-fid';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza', pg_temp.id('setor'), 50));
select public.registrar_usuario_caixa(pg_temp.id('loja'), '00000000-0000-0000-0000-0000000001e2', 'moto14', 'Fid Moto', 'entregador');
insert into ids values ('broto', public.criar_produto(pg_temp.id('loja'), 'Broto', pg_temp.id('setor'), 30));
select from public.salvar_config_delivery(pg_temp.id('marca'), '{"status": "aberto", "pedido_minimo": 0, "aceita_entrega": true, "aceita_retirada": true, "formas_pagamento": ["dinheiro", "pix"], "areas": [{"bairro": "Centro", "taxa": 5}]}');
reset role;

-- ganho igual ao core (packages/core/src/fidelidade.ts CASOS_GANHO)
do $$
declare r record; g record;
begin
  for r in select * from (values
    (jsonb_populate_record(null::public.fidelidade_config, '{"canais": ["cardapio_digital", "balcao_entrega", "balcao"], "cashback_ativo": true, "cashback_pct": 5, "cashback_pct_dia": {}, "cashback_dias": [0, 1, 2, 3, 4, 5, 6], "cashback_validade_dias": 60, "cashback_minimo": 0, "cashback_max_pct": null, "pontos_ativo": false, "pontos_por_real": 1, "pontos_por_real_taxa": 0, "pontos_validade_dias": 180, "pontos_boas_vindas": 0, "grupo": "00000000-0000-0000-0000-000000000000"}'::jsonb), 100.0, 0.0, 3, 'cardapio_digital', false, 500, 0),
    (jsonb_populate_record(null::public.fidelidade_config, '{"canais": ["cardapio_digital", "balcao_entrega", "balcao"], "cashback_ativo": true, "cashback_pct": 5, "cashback_pct_dia": {}, "cashback_dias": [0, 1, 2, 3, 4, 5, 6], "cashback_validade_dias": 60, "cashback_minimo": 0, "cashback_max_pct": null, "pontos_ativo": false, "pontos_por_real": 1, "pontos_por_real_taxa": 0, "pontos_validade_dias": 180, "pontos_boas_vindas": 0, "grupo": "00000000-0000-0000-0000-000000000000"}'::jsonb), 108.0, 8.0, 3, 'balcao_entrega', false, 500, 0),
    (jsonb_populate_record(null::public.fidelidade_config, '{"canais": ["cardapio_digital", "balcao_entrega", "balcao"], "cashback_ativo": true, "cashback_pct": 5, "cashback_pct_dia": {"3": 10}, "cashback_dias": [0, 1, 2, 3, 4, 5, 6], "cashback_validade_dias": 60, "cashback_minimo": 0, "cashback_max_pct": null, "pontos_ativo": false, "pontos_por_real": 1, "pontos_por_real_taxa": 0, "pontos_validade_dias": 180, "pontos_boas_vindas": 0, "grupo": "00000000-0000-0000-0000-000000000000"}'::jsonb), 49.9, 0.0, 3, 'balcao', false, 499, 0),
    (jsonb_populate_record(null::public.fidelidade_config, '{"canais": ["cardapio_digital", "balcao_entrega", "balcao"], "cashback_ativo": true, "cashback_pct": 5, "cashback_pct_dia": {}, "cashback_dias": [5, 6], "cashback_validade_dias": 60, "cashback_minimo": 0, "cashback_max_pct": null, "pontos_ativo": false, "pontos_por_real": 1, "pontos_por_real_taxa": 0, "pontos_validade_dias": 180, "pontos_boas_vindas": 0, "grupo": "00000000-0000-0000-0000-000000000000"}'::jsonb), 90.0, 0.0, 3, 'balcao', false, 0, 0),
    (jsonb_populate_record(null::public.fidelidade_config, '{"canais": ["cardapio_digital"], "cashback_ativo": true, "cashback_pct": 5, "cashback_pct_dia": {}, "cashback_dias": [0, 1, 2, 3, 4, 5, 6], "cashback_validade_dias": 60, "cashback_minimo": 0, "cashback_max_pct": null, "pontos_ativo": false, "pontos_por_real": 1, "pontos_por_real_taxa": 0, "pontos_validade_dias": 180, "pontos_boas_vindas": 0, "grupo": "00000000-0000-0000-0000-000000000000"}'::jsonb), 90.0, 0.0, 3, 'balcao', false, 0, 0),
    (jsonb_populate_record(null::public.fidelidade_config, '{"canais": ["cardapio_digital", "balcao_entrega", "balcao"], "cashback_ativo": false, "cashback_pct": 5, "cashback_pct_dia": {}, "cashback_dias": [0, 1, 2, 3, 4, 5, 6], "cashback_validade_dias": 60, "cashback_minimo": 0, "cashback_max_pct": null, "pontos_ativo": true, "pontos_por_real": 1, "pontos_por_real_taxa": 0, "pontos_validade_dias": 180, "pontos_boas_vindas": 0, "grupo": "00000000-0000-0000-0000-000000000000"}'::jsonb), 49.9, 0.0, 1, 'cardapio_digital', false, 0, 49),
    (jsonb_populate_record(null::public.fidelidade_config, '{"canais": ["cardapio_digital", "balcao_entrega", "balcao"], "cashback_ativo": false, "cashback_pct": 5, "cashback_pct_dia": {}, "cashback_dias": [0, 1, 2, 3, 4, 5, 6], "cashback_validade_dias": 60, "cashback_minimo": 0, "cashback_max_pct": null, "pontos_ativo": true, "pontos_por_real": 1.5, "pontos_por_real_taxa": 2, "pontos_validade_dias": 180, "pontos_boas_vindas": 50, "grupo": "00000000-0000-0000-0000-000000000000"}'::jsonb), 108.0, 8.0, 1, 'balcao_entrega', true, 0, 216),
    (jsonb_populate_record(null::public.fidelidade_config, '{"canais": ["cardapio_digital", "balcao_entrega", "balcao"], "cashback_ativo": true, "cashback_pct": 3, "cashback_pct_dia": {}, "cashback_dias": [0, 1, 2, 3, 4, 5, 6], "cashback_validade_dias": 60, "cashback_minimo": 0, "cashback_max_pct": null, "pontos_ativo": true, "pontos_por_real": 1, "pontos_por_real_taxa": 0, "pontos_validade_dias": 180, "pontos_boas_vindas": 0, "grupo": "00000000-0000-0000-0000-000000000000"}'::jsonb), 3.33, 5.0, 0, 'cardapio_digital', false, 0, 0)) v(c, total, taxa, dia, canal, primeiro, esp_cash, esp_pontos) loop
    select * into g from private.ganho_fidelidade(r.c, r.total, r.taxa, r.dia, r.canal, r.primeiro);
    if round(g.cashback * 100) <> r.esp_cash or g.pontos <> r.esp_pontos then
      raise exception 'ganho(% / %): % % (esperava % %)', r.total, r.canal, round(g.cashback * 100), g.pontos, r.esp_cash, r.esp_pontos;
    end if;
  end loop;
end $$;

-- configuração: cashback 10%, pontos 1 por R$ + 50 de boas-vindas; recompensas
select from pg_temp.como('00000000-0000-0000-0000-0000000001e1');
select public.salvar_config_fidelidade(pg_temp.id('loja'), '{"canais": ["cardapio_digital", "balcao_entrega", "balcao"], "cashbackAtivo": true, "cashbackPct": 10,
  "cashbackDias": [0,1,2,3,4,5,6], "cashbackValidadeDias": 30, "cashbackMinimo": 0, "pontosAtivo": true, "pontosPorReal": 1, "pontosBoasVindas": 50, "pontosValidadeDias": 0}');
insert into ids values ('r10', public.salvar_recompensa(pg_temp.id('loja'), null, '{"tipo": "desconto", "nome": "R$ 10 off", "pontos": 100, "valor": 1000}'));
insert into ids values ('rbroto', public.salvar_recompensa(pg_temp.id('loja'), null, jsonb_build_object('tipo', 'produto', 'nome', 'Broto grátis', 'pontos', 60, 'produto_id', pg_temp.id('broto'))));
select from pg_temp.esperar_erro(format($q$select public.salvar_config_fidelidade('%s', '{"canais": [], "cashbackAtivo": true}')$q$, pg_temp.id('loja')), 'canal');
insert into ids values ('p1', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 5,
  'cliente', jsonb_build_object('nome', 'Fiel', 'telefone', '47911112222'), 'endereco', jsonb_build_object('logradouro', 'Rua 1', 'numero', '10', 'bairro', 'Centro'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
reset role;
update public.pedidos set status = 'concluido', concluido_em = now() where id = pg_temp.id('p1');

select from pg_temp.como('00000000-0000-0000-0000-0000000001e1');
insert into saida values ('saldos1', public.saldos_fidelidade(pg_temp.id('loja')));
insert into ids select 'cli', cliente_id from public.pedidos where id = pg_temp.id('p1');
insert into saida values ('bal1', public.saldo_cliente_fidelidade(pg_temp.id('loja'), pg_temp.id('cli')));
-- usa R$ 3 de cashback + recompensa de R$ 10 (100 pontos)
insert into ids values ('p2', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 5,
  'cliente', jsonb_build_object('nome', 'Fiel', 'telefone', '47911112222'), 'endereco', jsonb_build_object('logradouro', 'Rua 1', 'numero', '10', 'bairro', 'Centro'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)), 'fidelidade', jsonb_build_object('cashback', 300, 'recompensa', pg_temp.id('r10')))));
-- pede mais do que tem
select from pg_temp.esperar_erro(format($q$select public.criar_pedido('%s', '%s', jsonb_build_object('tipo', 'balcao', 'cliente', jsonb_build_object('nome', 'Fiel', 'telefone', '47911112222'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', '%s', 'quantidade', 1)), 'fidelidade', jsonb_build_object('recompensa', '%s')))$q$,
  pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.id('pz'), pg_temp.id('r10')), 'Pontos insuficientes');
-- recompensa de produto sem o produto no pedido
select from pg_temp.esperar_erro(format($q$select public.criar_pedido('%s', '%s', jsonb_build_object('tipo', 'balcao', 'cliente', jsonb_build_object('nome', 'Fiel', 'telefone', '47911112222'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', '%s', 'quantidade', 1)), 'fidelidade', jsonb_build_object('recompensa', '%s')))$q$,
  pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.id('pz'), pg_temp.id('rbroto')), 'Broto');
insert into saida values ('bal2', public.saldo_cliente_fidelidade(pg_temp.id('loja'), pg_temp.id('cli')));
reset role;

do $$
declare b1 jsonb := pg_temp.v('bal1'); b2 jsonb := pg_temp.v('bal2'); p record;
begin
  if (b1 ->> 'cashback')::int <> 500 or (b1 ->> 'pontos')::int <> 100 then raise exception 'ganho do 1º pedido: %', b1; end if;
  if (pg_temp.v('saldos1') ->> 'total_clientes')::int <> 1 then raise exception 'saldos: %', pg_temp.v('saldos1'); end if;
  select * into p from public.pedidos where id = pg_temp.id('p2');
  if p.fid_cashback <> 3 or p.fid_desconto <> 10 or p.fid_pontos <> 100 or p.desconto <> 13 or p.total <> 42 then
    raise exception 'uso no pedido: cashback % desc % pontos % total %', p.fid_cashback, p.fid_desconto, p.fid_pontos, p.total;
  end if;
  if (b2 ->> 'cashback')::int <> 200 or (b2 ->> 'pontos')::int <> 0 then raise exception 'saldo depois do uso: %', b2; end if;
end $$;

-- cancelou: devolve o que usou
select from pg_temp.como('00000000-0000-0000-0000-0000000001e1');
select public.mudar_status_pedido(pg_temp.id('p2'), 'cancelado', 'teste');
insert into saida values ('bal3', public.saldo_cliente_fidelidade(pg_temp.id('loja'), pg_temp.id('cli')));
-- ajuste manual
select from pg_temp.esperar_erro(format($q$select public.ajustar_fidelidade('%s', '%s', 'cashback', 100, '')$q$, pg_temp.id('loja'), pg_temp.id('cli')), 'motivo');
select from pg_temp.esperar_erro(format($q$select public.ajustar_fidelidade('%s', '%s', 'cashback', -99900, 'tirar demais')$q$, pg_temp.id('loja'), pg_temp.id('cli')), 'negativo');
select public.ajustar_fidelidade(pg_temp.id('loja'), pg_temp.id('cli'), 'cashback', 250, 'presente de aniversário');
insert into saida values ('bal4', public.saldo_cliente_fidelidade(pg_temp.id('loja'), pg_temp.id('cli')));
insert into saida values ('extrato', public.extrato_fidelidade(pg_temp.id('loja'), pg_temp.id('cli')));
insert into saida values ('rel', public.relatorio_fidelidade(pg_temp.id('loja'), current_date - 1, current_date + 1));
reset role;
do $$ begin
  if (pg_temp.v('bal3') ->> 'cashback')::int <> 500 or (pg_temp.v('bal3') ->> 'pontos')::int <> 100 then raise exception 'estorno: %', pg_temp.v('bal3'); end if;
  if (pg_temp.v('bal4') ->> 'cashback')::int <> 750 then raise exception 'ajuste: %', pg_temp.v('bal4'); end if;
  if jsonb_array_length(pg_temp.v('extrato')) <> 7 then raise exception 'extrato: %', pg_temp.v('extrato'); end if;
  if (pg_temp.v('rel') ->> 'cashback_gerado')::int <> 500 or (pg_temp.v('rel') ->> 'vendas')::int <> 1 then raise exception 'relatório: %', pg_temp.v('rel'); end if;
end $$;

-- cardápio digital: saldo e uso só com a prova (código de um pedido anterior do cliente)
create temp table prova as select codigo from public.pedidos where id = pg_temp.id('p1');
grant select on prova to anon;
set role anon;
insert into saida values ('pub_sem', coalesce(public.saldo_fidelidade_publico('pizza-fid', '47 11112222', gen_random_uuid()), 'null'));
insert into saida values ('pub_com', public.saldo_fidelidade_publico('pizza-fid', '(47) 91111-2222', (select codigo from prova)));
insert into saida values ('prog', public.fidelidade_publica('pizza-fid'));
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizza-fid', jsonb_build_object('tipo', 'retirada', 'cliente', jsonb_build_object('nome', 'Fiel', 'telefone', '47911112222'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', '%s', 'quantidade', 1)), 'fidelidade', jsonb_build_object('cashback', 100)))$q$, pg_temp.id('pz')), 'mesmo celular');
insert into saida values ('pub_ped', public.criar_pedido_publico('pizza-fid', jsonb_build_object('tipo', 'retirada', 'cliente', jsonb_build_object('nome', 'Fiel', 'telefone', '47911112222'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)),
  'fidelidade', jsonb_build_object('cashback', 100), 'fidelidade_prova', (select codigo from prova))));
reset role;
do $$ begin
  if pg_temp.v('pub_sem') <> 'null'::jsonb then raise exception 'sem prova não mostra saldo'; end if;
  if (pg_temp.v('pub_com') ->> 'cashback')::int <> 750 then raise exception 'saldo público: %', pg_temp.v('pub_com'); end if;
  if (pg_temp.v('prog') #>> '{config,cashbackPct}')::numeric <> 10 or jsonb_array_length(pg_temp.v('prog') -> 'recompensas') <> 2 then raise exception 'programa: %', pg_temp.v('prog'); end if;
  if (pg_temp.v('pub_ped') ->> 'total')::int <> 4900 then raise exception 'uso no cardápio: %', pg_temp.v('pub_ped'); end if;
end $$;

-- validade: sem pedido há mais de 30 dias, o cashback vence
update public.pedidos set criado_em = now() - interval '40 days' where cliente_id = pg_temp.id('cli');
do $$ begin
  if private.saldo_fidelidade(pg_temp.id('cli'), 'cashback') <> 0 then raise exception 'deveria vencer'; end if;
  if private.saldo_fidelidade(pg_temp.id('cli'), 'pontos') <> 100 then raise exception 'pontos sem validade não vencem'; end if;
end $$;

-- permissões
select from pg_temp.como('00000000-0000-0000-0000-0000000001e3');
select from pg_temp.esperar_erro(format($q$select public.painel_fidelidade('%s')$q$, pg_temp.id('loja')), 'acesso');
select from pg_temp.esperar_erro(format($q$select public.salvar_config_fidelidade('%s', '{"canais": ["balcao"]}')$q$, pg_temp.id('loja')), 'gestor');
select from pg_temp.esperar_erro(format($q$select public.ajustar_fidelidade('%s', '%s', 'cashback', 100, 'tentativa')$q$, pg_temp.id('loja'), pg_temp.id('cli')), 'gestor');
do $$ begin if exists (select 1 from public.fidelidade_movimentos) then raise exception 'RLS: leu o extrato direto'; end if; end $$;
reset role;

\o
\pset tuples_only on
select 'OK: fidelidade';
