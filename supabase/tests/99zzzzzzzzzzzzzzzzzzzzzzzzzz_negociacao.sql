-- Testes da Plataforma de Negociação (D-075).
\set ON_ERROR_STOP on
\o /dev/null
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000003f5', 'neg@example.com'), ('00000000-0000-0000-0000-0000000003f6', 'neg2@example.com');
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
    if position(p_trecho in sqlerrm) = 0 then raise exception 'Erro inesperado: % (esperava "%")', sqlerrm, p_trecho; end if;
    return;
  end;
  raise exception 'Deveria ter falhado: %', p_sql;
end; $$;
create temp table ids (chave text primary key, id uuid);
create temp table saida (chave text primary key, v jsonb);
grant all on ids, saida to authenticated, anon, service_role;
create or replace function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where chave = p $$;
create or replace function pg_temp.v(p text) returns jsonb language sql as $$ select v from saida where chave = p $$;

select from pg_temp.como('00000000-0000-0000-0000-0000000003f5');
insert into ids values ('loja', public.criar_loja('Loja N', 'Pizza N', 'pizza-neg', 'Rui'));
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza Grande', pg_temp.id('setor'), 60));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-neg';
insert into public.marketplace_lojas (loja_id, marca_id, canal, merchant_id, modo) values (pg_temp.id('loja'), pg_temp.id('marca'), 'ifood', 'merchant-neg', 'teste');
update public.lojas set aceite_automatico = false where id = pg_temp.id('loja');
-- pedido como o core traduz (entrega, dinheiro, cupom dividido, acréscimo)
insert into saida values ('p', jsonb_build_object(
  'canal', 'ifood', 'externo_id', 'ifd-n1', 'externo_codigo', '4821', 'merchant_id', 'merchant-neg', 'tipo', 'entrega', 'agendado_para', null,
  'cliente', jsonb_build_object('nome', 'Ana iFood', 'telefone', null, 'localizador', '87654321', 'documento', '12345678909'),
  'endereco', jsonb_build_object('logradouro', 'Rua A', 'numero', '10', 'bairro', 'Centro', 'complemento', 'Casa 2', 'referencia', 'Mercado', 'cidade', 'Pomerode', 'cep', '89107000', 'lat', null, 'lng', null),
  'itens', jsonb_build_array(
    jsonb_build_object('externo_codigo', null, 'externo_id', 'i1', 'nome', 'Pizza Grande', 'quantidade', 2, 'preco_unitario', 65, 'total', 130, 'observacao', 'Sem cebola',
      'opcoes', jsonb_build_array(jsonb_build_object('externo_codigo', 'BD-CAT', 'grupo', 'Borda', 'nome', 'Catupiry', 'quantidade', 1, 'preco', 5))),
    jsonb_build_object('externo_codigo', 'RF-2L', 'externo_id', 'i2', 'nome', 'Refri 2L', 'quantidade', 1, 'preco_unitario', 12, 'total', 12, 'observacao', null, 'opcoes', '[]'::jsonb)),
  'subtotal', 142, 'taxa_entrega', 8, 'acrescimo', 2, 'desconto', 15, 'total', 137, 'pagamento', 'dinheiro', 'pago_online', false, 'troco_para', 150,
  'cartao_bandeira', null, 'beneficios', jsonb_build_array(jsonb_build_object('valor', 15, 'alvo', 'CART', 'loja', 5, 'marketplace', 10, 'descricao', 'Cupom')),
  'codigo_retirada', '5521', 'entrega_pelo_marketplace', false, 'observacao', null, 'observacao_entrega', 'Portão azul'));
insert into ids values ('ped', public.simular_pedido_marketplace(pg_temp.id('loja'), pg_temp.v('p')));
insert into saida values ('p2', pg_temp.v('p') || jsonb_build_object('externo_id', 'ifd-n2', 'externo_codigo', '4822'));
insert into ids values ('ped2', public.simular_pedido_marketplace(pg_temp.id('loja'), pg_temp.v('p2')));
insert into saida values ('p3', pg_temp.v('p') || jsonb_build_object('externo_id', 'ifd-n3', 'externo_codigo', '4823'));
insert into ids values ('ped3', public.simular_pedido_marketplace(pg_temp.id('loja'), pg_temp.v('p3')));
select from public.mudar_status_pedido(pg_temp.id('ped'), 'em_preparo');
-- 1) cancelamento por atraso: não deixa recusar; aceitar exige motivo; aceito → pedido cancelado sem voltar como requestCancellation
insert into ids values ('n1', public.simular_negociacao_marketplace(pg_temp.id('ped'), jsonb_build_object(
  'disputa_id', 'd-1', 'acao', 'CANCELLATION', 'tipo', 'DELAY', 'mensagem', 'Demorou', 'expira_em', now() + interval '5 minutes', 'acao_no_prazo', 'ACCEPT_CANCELLATION',
  'alternativas', jsonb_build_array(jsonb_build_object('id', 'alt-t', 'tipo', 'mais_tempo', 'valor_max', null, 'minutos', jsonb_build_array(10, 20), 'motivos_tempo', jsonb_build_array('HIGH_STORE_DEMAND'))),
  'motivos_aceite', jsonb_build_array('HIGH_STORE_DEMAND'))));
-- repetido: mesma negociação
insert into ids values ('n1b', public.simular_negociacao_marketplace(pg_temp.id('ped'), jsonb_build_object('disputa_id', 'd-1', 'acao', 'CANCELLATION')));
select from pg_temp.esperar_erro(format($q$select public.responder_negociacao('%s', '{"tipo":"recusar","motivo":"não"}')$q$, pg_temp.id('n1')), 'não deixa recusar');
select from pg_temp.esperar_erro(format($q$select public.responder_negociacao('%s', '{"tipo":"aceitar"}')$q$, pg_temp.id('n1')), 'motivo do aceite');
select from pg_temp.esperar_erro(format($q$select public.responder_negociacao('%s', '{"tipo":"alternativa","alternativaId":"alt-t","alternativa":"mais_tempo","minutos":15}')$q$, pg_temp.id('n1')), 'minutos');
insert into saida values ('r1', to_jsonb(public.responder_negociacao(pg_temp.id('n1'), '{"tipo":"aceitar","motivo":"HIGH_STORE_DEMAND"}')));
select from pg_temp.esperar_erro(format($q$select public.responder_negociacao('%s', '{"tipo":"aceitar","motivo":"HIGH_STORE_DEMAND"}')$q$, pg_temp.id('n1')), 'já foi respondida');
-- 2) depois da entrega: reembolso acima do teto falha; contraproposta dentro do teto não cancela o pedido
select from public.mudar_status_pedido(pg_temp.id('ped2'), 'em_preparo');
select from public.mudar_status_pedido(pg_temp.id('ped2'), 'pronto');
select from public.mudar_status_pedido(pg_temp.id('ped2'), 'em_entrega');
select from public.mudar_status_pedido(pg_temp.id('ped2'), 'concluido');
insert into ids values ('n2', public.simular_negociacao_marketplace(pg_temp.id('ped2'), jsonb_build_object(
  'disputa_id', 'd-2', 'acao', 'CANCELLATION', 'tipo', 'AFTER_DELIVERY', 'expira_em', now() + interval '15 minutes', 'acao_no_prazo', 'ACCEPT_CANCELLATION',
  'alternativas', jsonb_build_array(jsonb_build_object('id', 'alt-r', 'tipo', 'reembolso', 'valor_max', 50, 'minutos', '[]'::jsonb, 'motivos_tempo', '[]'::jsonb)))));
select from pg_temp.esperar_erro(format($q$select public.responder_negociacao('%s', '{"tipo":"alternativa","alternativaId":"alt-r","alternativa":"reembolso","valor":60}')$q$, pg_temp.id('n2')), 'máximo');
insert into saida values ('r2', to_jsonb(public.responder_negociacao(pg_temp.id('n2'), '{"tipo":"alternativa","alternativaId":"alt-r","alternativa":"reembolso","valor":20}')));
-- 3) sem resposta e prazo vencido → expirada; ação no prazo "aceitar" cancela o pedido
insert into ids values ('n3', public.simular_negociacao_marketplace(pg_temp.id('ped3'), jsonb_build_object(
  'disputa_id', 'd-3', 'acao', 'CANCELLATION', 'tipo', 'PREPARATION_TIME', 'expira_em', now() - interval '1 minute', 'acao_no_prazo', 'ACCEPT_CANCELLATION')));
select from pg_temp.esperar_erro(format($q$select public.responder_negociacao('%s', '{"tipo":"recusar","motivo":"x"}')$q$, pg_temp.id('n3')), 'prazo');
-- outra pessoa não vê nem responde
select from pg_temp.como('00000000-0000-0000-0000-0000000003f6');
insert into saida values ('ver', to_jsonb((select count(*) from public.marketplace_negociacoes)));
select from pg_temp.esperar_erro(format($q$select public.responder_negociacao('%s', '{"tipo":"aceitar"}')$q$, pg_temp.id('n2')), 'não encontrada');
reset role;
select private.marketplace_tique();
-- servidor: resultado final de uma negociação de produção (HSS)
update public.marketplace_negociacoes set situacao = 'respondida' where id = pg_temp.id('n2');
set role service_role;
insert into saida values ('hss', to_jsonb(public.marketplace_resolver_negociacao('ifood', 'd-2', 'ALTERNATIVE_REPLIED', '{"x":1}'::jsonb)));
reset role;
\o
select case when pg_temp.id('n1') = pg_temp.id('n1b')
             and pg_temp.v('r1') = '"aceita"'
             and (select status from public.pedidos where id = pg_temp.id('ped')) = 'cancelado'
             and (select string_agg(acao || ':' || situacao, ',' order by id) from public.marketplace_saida where pedido_id = pg_temp.id('ped')) = 'confirm:simulado,negociacao:simulado'
            then 'ok negociação por atraso: sem recusa, aceite com motivo cancela o pedido sem pedir cancelamento de novo'
            else 'FALHOU negociação atraso ' || coalesce((select string_agg(acao || ':' || situacao, ',' order by id) from public.marketplace_saida where pedido_id = pg_temp.id('ped')), '-') end;
select case when pg_temp.v('r2') = '"alternativa"'
             and (select status from public.pedidos where id = pg_temp.id('ped2')) = 'concluido'
             and (select (resposta ->> 'valor')::numeric from public.marketplace_negociacoes where id = pg_temp.id('n2')) = 20
             and pg_temp.v('hss') = '"alternativa"'
             and (select situacao = 'alternativa' and resultado = '{"x":1}'::jsonb from public.marketplace_negociacoes where id = pg_temp.id('n2'))
            then 'ok contraproposta de reembolso respeita o teto e não cancela o pedido entregue' else 'FALHOU contraproposta' end;
select case when (select situacao from public.marketplace_negociacoes where id = pg_temp.id('n3')) = 'expirada'
             and (select status from public.pedidos where id = pg_temp.id('ped3')) = 'cancelado'
             and pg_temp.v('ver') = '0'
            then 'ok negociação vencida fecha sozinha e segue a decisão do iFood; outra loja não vê' else 'FALHOU vencida ' || coalesce((select situacao from public.marketplace_negociacoes where id = pg_temp.id('n3')), '-') end;
