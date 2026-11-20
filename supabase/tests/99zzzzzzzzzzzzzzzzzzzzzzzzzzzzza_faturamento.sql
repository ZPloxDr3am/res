-- D-126 (Issue #165): faturamento com regra única e só para quem tem "relatorios".
-- Venda = pedido concluído, pela data de conclusão. Cancelamentos pela data do pedido.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000012a1', 'fat-dono@example.com'),
  ('00000000-0000-0000-0000-0000000012a2', 'fat-moto@example.com'),
  ('00000000-0000-0000-0000-0000000012a3', 'fat-caixa@example.com');
create or replace function pg_temp.como(p_user text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user, false);
  execute 'set role authenticated';
end; $$;
create temp table ids (chave text primary key, id uuid);
create temp table saida (chave text primary key, v jsonb);
grant all on ids, saida to authenticated, anon;
create or replace function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where chave = p $$;
create or replace function pg_temp.v(p text) returns jsonb language sql as $$ select v from saida where chave = p $$;

-- um teste anterior liga o cadastro só por convite: desliga aqui e devolve no fim
create temp table cfg_antes as select * from private.config_plataforma where chave = 'cadastro_modo';
insert into private.config_plataforma (chave, valor) values ('cadastro_modo', 'aberto') on conflict (chave) do update set valor = 'aberto';
select from pg_temp.como('00000000-0000-0000-0000-0000000012a1');
insert into ids values ('loja', public.criar_loja('Loja Fat', 'Pizza Fat', 'pizza-fat', 'Dora'));
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza', pg_temp.id('setor'), 50));
do $$
declare m uuid := (select id from public.marcas where slug = 'pizza-fat');
begin
  perform public.criar_pedido(pg_temp.id('loja'), m, jsonb_build_object('tipo', 'balcao', 'cliente', jsonb_build_object('nome', 'Velho'), 'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1))));
  perform public.criar_pedido(pg_temp.id('loja'), m, jsonb_build_object('tipo', 'balcao', 'cliente', jsonb_build_object('nome', 'Aberto'), 'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1))));
  perform public.criar_pedido(pg_temp.id('loja'), m, jsonb_build_object('tipo', 'balcao', 'cliente', jsonb_build_object('nome', 'Cancelado'), 'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1))));
end $$;
reset role;
-- "Velho": feito há 30 h (fora do período pela criação), concluído agora (dentro pela conclusão), com R$ 5 de acréscimo
update public.pedidos set criado_em = now() - interval '30 hours', status = 'concluido', concluido_em = now() - interval '1 minute',
       acrescimo = 5, total = total + 5
 where cliente_nome = 'Velho' and loja_id = pg_temp.id('loja');
-- "Aberto": parado em "pronto" (a regra antiga contava como venda)
update public.pedidos set status = 'pronto', pronto_em = now() where cliente_nome = 'Aberto' and loja_id = pg_temp.id('loja');
update public.pedidos set status = 'cancelado', cancelado_em = now(), motivo_cancelamento = 't' where cliente_nome = 'Cancelado' and loja_id = pg_temp.id('loja');
-- equipe: motoboy e caixa (grupo "Funcionário", sem "relatorios")
insert into public.membros (loja_id, user_id, nome, papel) values (pg_temp.id('loja'), '00000000-0000-0000-0000-0000000012a2', 'Moto', 'entregador');
insert into public.membros (loja_id, user_id, nome, papel, grupo_acesso_id)
select pg_temp.id('loja'), '00000000-0000-0000-0000-0000000012a3', 'Caixa', 'funcionario', g.id from public.grupos_acesso g where g.loja_id = pg_temp.id('loja') and g.nome = 'Funcionário';

select from pg_temp.como('00000000-0000-0000-0000-0000000012a1');
insert into saida values ('resumo', public.resumo_vendas(array[pg_temp.id('loja')], now() - interval '1 day', now() + interval '1 minute'));
insert into saida values ('vendas', public.relatorio_vendas(array[pg_temp.id('loja')], now() - interval '1 day', now() + interval '1 minute'));
insert into saida values ('op', public.relatorio_operacao(array[pg_temp.id('loja')], now() - interval '1 day', now() + interval '1 minute'));
insert into saida values ('meta', public.meta_vendas(array[pg_temp.id('loja')], current_date));
insert into saida values ('gestao', (select coalesce(jsonb_agg(to_jsonb(f)), '[]') from public.faturamento_lojas(array[pg_temp.id('loja')], 30) f));
select from pg_temp.como('00000000-0000-0000-0000-0000000012a2');
insert into saida values ('gestao_moto', (select coalesce(jsonb_agg(to_jsonb(f)), '[]') from public.faturamento_lojas(array[pg_temp.id('loja')], 30) f));
select from pg_temp.como('00000000-0000-0000-0000-0000000012a3');
insert into saida values ('gestao_caixa', (select coalesce(jsonb_agg(to_jsonb(f)), '[]') from public.faturamento_lojas(array[pg_temp.id('loja')], 30) f));
reset role;
\o

-- o "Velho" vale R$ 55,00 = 5500 centavos; o "Aberto" (R$ 50) não entra; o "Cancelado" só nos cancelamentos
select case when (pg_temp.v('resumo') #>> '{atual,0,faturamento}')::int = 5500 and (pg_temp.v('resumo') #>> '{atual,0,pedidos}')::int = 1
             and (pg_temp.v('resumo') #>> '{atual,0,cancelados}')::int = 1 and jsonb_array_length(pg_temp.v('resumo') -> 'dias') = 1
             and (pg_temp.v('resumo') #>> '{dias,0,faturamento}')::int = 5500
            then 'ok faturamento: Resumo conta só o concluído, pela data de conclusão' else 'FALHOU faturamento resumo ' || pg_temp.v('resumo')::text end;

select case when (pg_temp.v('vendas') ->> 'faturamento')::int = 5500 and (pg_temp.v('vendas') ->> 'pedidos')::int = 1
             and jsonb_array_length(pg_temp.v('vendas') -> 'cancelados') = 1
             and (pg_temp.v('op') #>> '{valores,faturamento}')::int = 5500 and (pg_temp.v('op') #>> '{valores,acrescimos}')::int = 500
             and (pg_temp.v('meta') #>> '{lojas,0,vendido}')::int = 5500
             and round((pg_temp.v('gestao') #>> '{0,total}')::numeric * 100)::int = 5500
            then 'ok faturamento: Resumo = Relatórios = Operação = Meta = Gestão (R$ 55,00)'
            else 'FALHOU faturamento igual ' || jsonb_build_object('vendas', pg_temp.v('vendas') ->> 'faturamento', 'op', pg_temp.v('op') -> 'valores', 'meta', pg_temp.v('meta') -> 'lojas', 'gestao', pg_temp.v('gestao'))::text end;

select case when (select (x ->> 'produtos')::int + (x ->> 'frete')::int - (x ->> 'descontos')::int + (x ->> 'acrescimos')::int = (x ->> 'total')::int
                    and (x ->> 'acrescimos')::int = 500
                    from jsonb_array_elements(pg_temp.v('resumo') -> 'composicao') x where (x ->> 'pedidos')::int > 0)
            then 'ok faturamento: composição soma o acréscimo' else 'FALHOU composição ' || (pg_temp.v('resumo') -> 'composicao')::text end;

select case when jsonb_array_length(pg_temp.v('gestao')) = 1 and pg_temp.v('gestao_moto') = '[]'::jsonb and pg_temp.v('gestao_caixa') = '[]'::jsonb
            then 'ok faturamento: só quem tem relatórios lê (motoboy e caixa não)' else 'FALHOU faturamento permissão ' || pg_temp.v('gestao_moto')::text || pg_temp.v('gestao_caixa')::text end;

\o /dev/null
reset role;
delete from private.config_plataforma where chave = 'cadastro_modo';
insert into private.config_plataforma select * from cfg_antes;
\o
