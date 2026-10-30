-- Testes de 0061: Financeiro.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000003e1', 'fin@example.com'),
  ('00000000-0000-0000-0000-0000000003e2', 'fin2@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000003e1');
insert into ids values ('loja', public.criar_loja('Loja F', 'Pizza F', 'pizza-fin', 'Rui'));
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza', pg_temp.id('setor'), 100));
select from public.salvar_config_delivery((select id from public.marcas where slug = 'pizza-fin'), '{"status": "aberto", "pedido_minimo": 0, "aceita_entrega": true, "aceita_retirada": true, "formas_pagamento": ["dinheiro", "cartao_credito"], "areas": [{"bairro": "Centro", "taxa": 5}]}');
select from public.preparar_financeiro(pg_temp.id('loja'));
select from public.preparar_financeiro(pg_temp.id('loja'));
update public.fin_taxas set percentual = 3, fixa = 0.5 where loja_id = pg_temp.id('loja') and forma = 'cartao_credito';
insert into ids select 'aluguel', id from public.fin_categorias where loja_id = pg_temp.id('loja') and nome = 'Aluguel';
insert into ids select 'insumos', id from public.fin_categorias where loja_id = pg_temp.id('loja') and nome = 'Insumos / CMV (ingredientes)';
-- parcelado: 100 em 3x
insert into ids values ('parc', public.criar_lancamento(pg_temp.id('loja'), format('{"tipo":"despesa","descricao":"Forno","valor":100,"vencimento":"2026-10-15","modo":"parcelado","vezes":3,"categoria":"%s","pago":true}', pg_temp.id('insumos'))::jsonb));
-- recorrente: aluguel 2000 por 12 meses
select public.criar_lancamento(pg_temp.id('loja'), format('{"tipo":"despesa","descricao":"Aluguel","valor":2000,"vencimento":"2026-10-05","modo":"recorrente","vezes":12,"categoria":"%s"}', pg_temp.id('aluguel'))::jsonb);
-- custos fixos viram contas do mês, sem duplicar
select from public.preparar_gestao(pg_temp.id('loja'));
update public.custos set valor = 300 where loja_id = pg_temp.id('loja') and nome = 'Energia elétrica';
update public.custos set valor = 150 where loja_id = pg_temp.id('loja') and nome = 'Contador';
insert into saida values ('g1', to_jsonb(public.gerar_contas_custos(pg_temp.id('loja'), '2026-10-01', 10)));
insert into saida values ('g2', to_jsonb(public.gerar_contas_custos(pg_temp.id('loja'), '2026-10-20', 10)));
insert into saida values ('g3', to_jsonb(public.gerar_contas_custos(pg_temp.id('loja'), '2026-11-01', 5, 3)));
update public.custos set valor = 180 where loja_id = pg_temp.id('loja') and nome = 'Contador';
select public.gerar_contas_custos(pg_temp.id('loja'), '2026-11-01', 5, 1);
-- outra pessoa não vê nem lança
select from pg_temp.como('00000000-0000-0000-0000-0000000003e2');
select from pg_temp.esperar_erro(format($q$select public.criar_lancamento('%s', '{"tipo":"despesa","descricao":"x","valor":1,"vencimento":"2026-10-01"}')$q$, pg_temp.id('loja')), 'dono ou o gerente');
insert into saida values ('ver', to_jsonb((select count(*) from public.fin_lancamentos)));
reset role;
-- vendas: um pedido no cartão de crédito, concluído
set role anon;
select public.criar_pedido_publico('pizza-fin', format('{"tipo":"retirada","pagamento":"cartao_credito","cliente":{"nome":"Ana","telefone":"47999990051"},"itens":[{"produto_id":"%s","quantidade":1,"escolhas":{}}]}', pg_temp.id('pz'))::jsonb);
reset role;
update public.pedidos set status = 'concluido', concluido_em = '2026-10-10 15:00-03' where loja_id = pg_temp.id('loja');
select from pg_temp.como('00000000-0000-0000-0000-0000000003e1');
insert into saida values ('dre', public.dre_financeiro(array[pg_temp.id('loja')], 2026));
reset role;
\o
select case when (select array_agg(valor order by parcela) from public.fin_lancamentos where serie = (select serie from public.fin_lancamentos where id = pg_temp.id('parc'))) = array[33.33, 33.33, 33.34]::numeric[]
             and (select count(*) from public.fin_lancamentos where loja_id = pg_temp.id('loja') and pago_em is not null) = 1
             and (select count(*) from public.fin_lancamentos where loja_id = pg_temp.id('loja') and descricao = 'Aluguel' and origem = 'manual') = 12
             and (select max(competencia) from public.fin_lancamentos where descricao = 'Aluguel' and origem = 'manual') = '2027-09-05'
            then 'ok parcelado divide o valor e recorrente repete por mês' else 'FALHOU parcelado/recorrente' end;
select case when pg_temp.v('g3') = '6' and (select count(*) from public.fin_lancamentos where origem = 'custo' and descricao = 'Contador' and valor = 180)
               = (select count(*) from public.fin_lancamentos where origem = 'custo' and descricao = 'Contador' and competencia >= date_trunc('month', now() at time zone 'America/Sao_Paulo')::date)
             and (select vencimento from public.fin_lancamentos where origem = 'custo' and descricao = 'Contador' and competencia = '2026-12-01') = '2026-12-05'
            then 'ok custos fixos mês a mês e valor novo atualiza os não pagos' else 'FALHOU custos meses ' || pg_temp.v('g3')::text end;
select case when pg_temp.v('g1') = '2' and pg_temp.v('g2') = '0'
             and (select vencimento from public.fin_lancamentos where origem = 'custo' and descricao = 'Contador' and competencia = '2026-10-01') = '2026-10-10'
             and (select c.nome from public.fin_lancamentos f join public.fin_categorias c on c.id = f.categoria_id where f.origem = 'custo' and f.descricao = 'Energia elétrica' and f.competencia = '2026-10-01') = 'Energia elétrica'
            then 'ok contas do mês a partir dos custos fixos (sem duplicar)' else 'FALHOU custos ' || pg_temp.v('g1')::text || pg_temp.v('g2')::text end;
select case when pg_temp.v('ver') = '0' then 'ok financeiro só para dono/gerente' else 'FALHOU rls financeiro' end;
select case when (pg_temp.v('dre') #>> '{meses,9,vendas}')::numeric = 100 and (pg_temp.v('dre') #>> '{meses,9,taxas}')::numeric = 3.5
             and (pg_temp.v('dre') #>> '{meses,9,linhas,despesas_operacionais}')::numeric = 2300 + (select valor from public.fin_lancamentos where origem = 'custo' and descricao = 'Contador' and competencia = '2026-10-01')
             and (pg_temp.v('dre') #>> '{meses,9,linhas,custo_vendas}')::numeric = 100
            then 'ok DRE com vendas, taxas e contas por linha' else 'FALHOU dre ' || (pg_temp.v('dre') -> 'meses' -> 9)::text end;
