-- Testes da base de marketplaces (iFood).
\set ON_ERROR_STOP on
\o /dev/null
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000003f1', 'mkt@example.com'), ('00000000-0000-0000-0000-0000000003f2', 'mkt2@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000003f1');
insert into ids values ('loja', public.criar_loja('Loja M', 'Pizza M', 'pizza-mkt', 'Rui'));
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza Grande', pg_temp.id('setor'), 60));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-mkt';
insert into public.marketplace_lojas (loja_id, marca_id, canal, merchant_id, modo) values (pg_temp.id('loja'), pg_temp.id('marca'), 'ifood', 'merchant-teste', 'teste');
update public.lojas set aceite_automatico = false where id = pg_temp.id('loja');
-- pedido como o core traduz (entrega, dinheiro, cupom dividido, acréscimo)
insert into saida values ('p', jsonb_build_object(
  'canal', 'ifood', 'externo_id', 'ifd-1', 'externo_codigo', '4821', 'merchant_id', 'merchant-teste', 'tipo', 'entrega', 'agendado_para', null,
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
insert into ids values ('ped2', public.simular_pedido_marketplace(pg_temp.id('loja'), pg_temp.v('p')));   -- repetido: mesmo pedido
-- confirmar no RES → fila "confirm" (simulado no modo teste)
select from public.mudar_status_pedido(pg_temp.id('ped'), 'em_preparo');
-- cliente cancela no iFood → cancela no RES sem voltar para o iFood
insert into saida values ('ev', to_jsonb(public.simular_evento_marketplace(pg_temp.id('ped'), 'CAN', 'Cliente desistiu')));
-- outra pessoa não simula
select from pg_temp.como('00000000-0000-0000-0000-0000000003f2');
select from pg_temp.esperar_erro(format($q$select public.simular_pedido_marketplace('%s', '{}'::jsonb)$q$, pg_temp.id('loja')), 'Só o dono');
reset role;
-- servidor (chave de serviço): evento sem repetição
set role service_role;
insert into saida values ('e1', to_jsonb(public.marketplace_registrar_evento('ifood', 'ev-1', 'PLC', 'ifd-9', 'merchant-teste')));
insert into saida values ('e2', to_jsonb(public.marketplace_registrar_evento('ifood', 'ev-1', 'PLC', 'ifd-9', 'merchant-teste')));
reset role;
set role anon;
select from pg_temp.esperar_erro($q$select public.marketplace_receber_pedido('{}'::jsonb)$q$, 'permission denied');
reset role;
\o
select case when pg_temp.id('ped') = pg_temp.id('ped2')
             and (select total = 137 and acrescimo = 2 and externo_codigo = '4821' and codigo_retirada = '5521' and troco_para = 150 and origem = 'ifood' and pago_em is null
                  from public.pedidos where id = pg_temp.id('ped'))
             and (select produto_id from public.pedido_itens where pedido_id = pg_temp.id('ped') and nome = 'Pizza Grande') = pg_temp.id('pz')
             and (select produto_id from public.pedido_itens where pedido_id = pg_temp.id('ped') and nome = 'Refri 2L') is null
             and (select count(*) from public.marketplace_itens where loja_id = pg_temp.id('loja')) = 3
            then 'ok pedido do iFood entra uma vez, com valores, código e produto ligado pelo nome' else 'FALHOU pedido marketplace' end;
select case when (select string_agg(acao || ':' || situacao, ',' order by id) from public.marketplace_saida where pedido_id = pg_temp.id('ped')) = 'confirm:simulado'
             and pg_temp.v('ev') = '"cancelado"'
             and (select status from public.pedidos where id = pg_temp.id('ped')) = 'cancelado'
            then 'ok confirmar volta para o iFood; cancelamento vindo do iFood não volta' else 'FALHOU saida ' || coalesce((select string_agg(acao || ':' || situacao, ',') from public.marketplace_saida), '-') || pg_temp.v('ev')::text end;
select case when pg_temp.v('e1') = 'true' and pg_temp.v('e2') = 'false' then 'ok evento do marketplace registrado uma vez só' else 'FALHOU eventos' end;
select case when (select d ->> 'externo_codigo' = '4821' and d ->> 'codigo_retirada' = '5521' and (d ->> 'acrescimo')::int = 200
                         and (d ->> 'desconto_loja')::int = 500 and (d ->> 'desconto_marketplace')::int = 1000 and d ->> 'observacao_entrega' = 'Portão azul'
                    from (select private.dados_cupom(pg_temp.id('ped')) d) x)
            then 'ok cupom do iFood leva número do app, código de retirada, acréscimo e desconto dividido' else 'FALHOU cupom iFood ' || private.dados_cupom(pg_temp.id('ped'))::text end;

-- Canais (D-112, etapa 1): catálogo, Open Delivery sem merchant, segredos só do servidor, evento com loja e corpo,
-- reenvio exponencial, mapa do pedido e painel
\o /dev/null
insert into ids select 'ml', id from public.marketplace_lojas where merchant_id = 'merchant-teste';
insert into public.marketplace_lojas (loja_id, marca_id, canal, merchant_id, modo, estado)
values (pg_temp.id('loja'), pg_temp.id('marca'), 'keeta', null, 'teste', 'aguardando_autorizacao');
select from pg_temp.esperar_erro(format($q$insert into public.marketplace_lojas (loja_id, marca_id, canal, merchant_id) values ('%s', '%s', 'uber', 'x')$q$, pg_temp.id('loja'), pg_temp.id('marca')), 'marketplace_lojas_canal_fk');
set role service_role;
select public.marketplace_segredos_gravar(pg_temp.id('ml'), '{"access_token": "tok-1", "refresh_token": "ref-1"}', now() + interval '6 hours');
select public.marketplace_segredos_gravar(pg_temp.id('ml'), '{"access_token": "tok-2", "refresh_token": null}');
insert into saida values ('seg', public.marketplace_segredos_ler(pg_temp.id('ml')));
insert into saida values ('e3', to_jsonb(public.marketplace_registrar_evento('ifood', 'ev-2', 'CFM', 'ifd-1', 'merchant-teste', '{"id": "ev-2", "code": "CFM"}')));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000003f1');
select from pg_temp.esperar_erro(format($q$select public.marketplace_segredos_ler('%s')$q$, pg_temp.id('ml')), 'permission denied');
select from pg_temp.esperar_erro('select * from private.marketplace_segredos', 'permission denied');
insert into saida values ('painel', public.marketplace_painel(pg_temp.id('loja')));
insert into saida values ('mp', (select to_jsonb(x) from public.marketplace_pedidos x where pedido_id = pg_temp.id('ped')));
reset role;
-- reenvio: erro em 1, 2, 4, 8, 16 min; na 6ª falha desiste e marca a conexão
insert into public.marketplace_saida (loja_id, pedido_id, canal, externo_id, acao, marketplace_loja_id)
values (pg_temp.id('loja'), pg_temp.id('ped'), 'ifood', 'ifd-1', 'readyToPickup', pg_temp.id('ml'));
set role service_role;
select public.marketplace_marcar_saida((select max(id) from public.marketplace_saida), false, 'HTTP 500');
insert into saida values ('t1', (select to_jsonb(round(extract(epoch from proxima_em - now()) / 60)) from public.marketplace_saida where id = (select max(id) from public.marketplace_saida)));
select public.marketplace_marcar_saida((select max(id) from public.marketplace_saida), false, 'HTTP 500') from generate_series(1, 5);
reset role;
\o
select case when (select count(*) from public.canais) >= 6 and pg_temp.v('seg') = '{"access_token": "tok-2"}'
             and (select token_expira_em > now() from public.marketplace_lojas where id = pg_temp.id('ml'))
             and pg_temp.v('e3') = 'true'
             and (select marketplace_loja_id = pg_temp.id('ml') and corpo ->> 'code' = 'CFM' from private.marketplace_eventos where evento_id = 'ev-2')
             and pg_temp.v('mp') ->> 'canal' = 'ifood' and pg_temp.v('mp') ->> 'display_id' = '4821'
             and jsonb_array_length(pg_temp.v('painel') -> 'conexoes') = 2
            then 'ok canais: catálogo, conexão sem merchant, segredos só do servidor, evento com loja e corpo, mapa do pedido, painel'
            else 'FALHOU canais seg=' || coalesce(pg_temp.v('seg')::text, '-') || ' mp=' || coalesce(pg_temp.v('mp')::text, '-') || ' painel=' || coalesce(pg_temp.v('painel')::text, '-') end;
select case when pg_temp.v('t1') = '1'
             and (select situacao = 'falhou' and tentativas = 6 from public.marketplace_saida where id = (select max(id) from public.marketplace_saida))
             and (select ultimo_erro like 'readyToPickup: HTTP 500%' from public.marketplace_lojas where id = pg_temp.id('ml'))
            then 'ok chamada de saída: reenvio exponencial e desiste na 6ª falha, avisando a conexão'
            else 'FALHOU reenvio ' || coalesce(pg_temp.v('t1')::text, '-') end;

-- Pedido canônico (D-113): Open Delivery pela conexão (sem merchant), origem do canal, telefone mascarado, item sem vínculo sinalizado
\o /dev/null
insert into ids select 'mlk', id from public.marketplace_lojas where canal = 'keeta' and loja_id = pg_temp.id('loja');
insert into saida values ('pk', jsonb_build_object(
  'canal', 'keeta', 'externo_id', 'kt-1', 'externo_codigo', 'K77', 'merchant_id', null, 'marketplace_loja_id', pg_temp.id('mlk'),
  'tipo', 'retirada', 'agendado_para', null,
  'cliente', jsonb_build_object('nome', 'Bia', 'telefone', '08007654321', 'localizador', null, 'documento', null),
  'endereco', null,
  'itens', jsonb_build_array(
    jsonb_build_object('externo_codigo', pg_temp.id('pz')::text, 'externo_id', 'k1', 'nome', 'Pizza G (Keeta)', 'quantidade', 1, 'preco_unitario', 70, 'total', 70, 'observacao', null, 'opcoes', '[]'::jsonb),
    jsonb_build_object('externo_codigo', 'XYZ', 'externo_id', 'k2', 'nome', 'Item que não existe', 'quantidade', 1, 'preco_unitario', 9, 'total', 9, 'observacao', null, 'opcoes', '[]'::jsonb)),
  'subtotal', 79, 'taxa_entrega', 0, 'acrescimo', 0, 'desconto', 0, 'total', 79, 'pagamento', 'online', 'pago_online', true, 'troco_para', null,
  'cartao_bandeira', null, 'beneficios', '[]'::jsonb, 'codigo_retirada', null, 'entrega_pelo_marketplace', false, 'observacao', null, 'observacao_entrega', null,
  'telefone_mascarado', true, 'prazo_min', 25, 'total_externo', 79, 'corpo_original', jsonb_build_object('id', 'kt-1', 'type', 'TAKEOUT')));
set role service_role;
insert into ids values ('pk', public.marketplace_receber_pedido(pg_temp.v('pk')));
insert into ids values ('pk2', public.marketplace_receber_pedido(pg_temp.v('pk')));
reset role;
\o
select case when pg_temp.id('pk') = pg_temp.id('pk2')
             and (select origem::text = 'keeta' and cliente_telefone is null and pago_em is not null and total = 79 and externo_canal = 'keeta' from public.pedidos where id = pg_temp.id('pk'))
             and (select produto_id from public.pedido_itens where pedido_id = pg_temp.id('pk') and ordem = 1) = pg_temp.id('pz')
             and (select itens_sem_vinculo = 1 and telefone_mascarado and prazo_min = 25 and total_externo = 79 and corpo_original ->> 'type' = 'TAKEOUT'
                         and marketplace_loja_id = pg_temp.id('mlk') and status_externo = 'CREATED'
                    from public.marketplace_pedidos where pedido_id = pg_temp.id('pk'))
            then 'ok pedido canônico: Open Delivery pela conexão, origem do canal, telefone mascarado, item sem vínculo sinalizado, corpo guardado'
            else 'FALHOU canônico ' || coalesce((select to_jsonb(x)::text from public.marketplace_pedidos x where pedido_id = pg_temp.id('pk')), '-') end;

-- iFood pronto para homologação (D-114): token do app no banco, KEEPALIVE, entregador/cancelamento, pedido alterado, pausa
\o /dev/null
-- um pedido novo do iFood (o anterior foi cancelado)
update saida set v = jsonb_set(jsonb_set(v, '{externo_id}', '"ifd-2"'), '{externo_codigo}', '"4822"') where chave = 'p';
insert into ids values ('ped3', public.simular_pedido_marketplace(pg_temp.id('loja'), pg_temp.v('p')));
update public.marketplace_lojas set modo = 'producao', estado = 'conectado' where id = pg_temp.id('ml');
update public.marcas set status_cardapio = 'aberto' where id = pg_temp.id('marca');
set role service_role;
select public.marketplace_app_token_gravar('ifood', 'tok-app', now() + interval '6 hours');
insert into saida values ('tok', public.marketplace_app_token_ler('ifood'));
insert into saida values ('ab1', to_jsonb(public.marketplace_abertas('ifood', array['merchant-teste', 'outra'])));
select public.marketplace_evento_info('ifood', 'ifd-2', 'ADR', '{"entregador": {"nome": "Carlos", "veiculo": "MOTORCYCLE"}}');
select public.marketplace_evento_info('ifood', 'ifd-2', 'CAR', '{"cancelamento": {"origem": "CUSTOMER", "motivo": "Demorou"}}');
-- iFood alterou o pedido: tirou a pizza, ficou só o refri
insert into saida values ('alt', to_jsonb(public.marketplace_atualizar_pedido(
  jsonb_set(jsonb_set(jsonb_set(jsonb_set(pg_temp.v('p'), '{itens}', jsonb_build_array(pg_temp.v('p') -> 'itens' -> 1)), '{subtotal}', '12'), '{desconto}', '0'), '{acrescimo}', '0'))));
reset role;
update public.lojas set pausa_ate = now() + interval '1 hour' where id = pg_temp.id('loja');
set role service_role;
insert into saida values ('ab2', to_jsonb(public.marketplace_abertas('ifood', array['merchant-teste'])));
reset role;
update public.lojas set pausa_ate = null where id = pg_temp.id('loja');
insert into saida values ('cfm', to_jsonb(private.aplicar_evento_externo('ifood', 'ifd-2', 'CFM')));
\o
select case when pg_temp.v('tok') ->> 'token' = 'tok-app' and pg_temp.v('ab1') = '["merchant-teste"]' and pg_temp.v('ab2') = '[]'
             and (select entregador ->> 'nome' = 'Carlos' and entregador ->> 'etapa' = 'CAR' is not true and cancelamento_solicitado ->> 'motivo' = 'Demorou' and status_externo = 'CAR'
                    from public.marketplace_pedidos where pedido_id = pg_temp.id('ped3'))
             and pg_temp.v('alt') = '"atualizado"'
             and (select total = 20 and subtotal = 12 from public.pedidos where id = pg_temp.id('ped3'))
             and (select count(*) = 1 from public.pedido_itens where pedido_id = pg_temp.id('ped3'))
             and (select string_agg(acao, ',' order by id) from public.marketplace_saida where marketplace_loja_id = pg_temp.id('ml') and pedido_id is null) = 'pausar,abrir'
             and (select motivo from public.pedido_eventos where pedido_id = pg_temp.id('ped3') order by id desc limit 1) = 'iFood: CFM'
            then 'ok iFood homologação: token do app no banco, KEEPALIVE só com loja aberta, entregador e cancelamento solicitado, pedido alterado, pausa avisa o app'
            else 'FALHOU iFood homologação ab1=' || coalesce(pg_temp.v('ab1')::text, '-') || ' ab2=' || coalesce(pg_temp.v('ab2')::text, '-') || ' alt=' || coalesce(pg_temp.v('alt')::text, '-')
                 || ' mp=' || coalesce((select to_jsonb(x)::text from public.marketplace_pedidos x where pedido_id = pg_temp.id('ped3')), '-')
                 || ' saida=' || coalesce((select string_agg(acao, ',' order by id) from public.marketplace_saida where pedido_id is null), '-') end;

-- Painel (D-115): o quadro lê o que é do canal sem o corpo original; outra loja não lê; reprocessar só pelo servidor
\o /dev/null
select from pg_temp.como('00000000-0000-0000-0000-0000000003f1');
insert into saida values ('info', (select jsonb_agg(to_jsonb(x)) from public.marketplace_info_pedidos(pg_temp.id('loja'), array[pg_temp.id('ped3')]) x));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000003f2');
insert into saida values ('info2', to_jsonb((select count(*) from public.marketplace_info_pedidos(pg_temp.id('loja'), array[pg_temp.id('ped3')]))));
select from pg_temp.esperar_erro('select public.marketplace_evento_para_reprocessar(1)', 'permission denied');
reset role;
insert into saida values ('ev2id', to_jsonb((select id from private.marketplace_eventos where evento_id = 'ev-2')));
set role service_role;
insert into saida values ('rep', public.marketplace_evento_para_reprocessar((pg_temp.v('ev2id') #>> '{}')::bigint));
reset role;
\o
select case when pg_temp.v('info') -> 0 -> 'entregador' ->> 'nome' = 'Carlos' and not (pg_temp.v('info') -> 0 ? 'corpo_original')
             and pg_temp.v('info2') = '0' and pg_temp.v('rep') -> 'corpo' ->> 'code' = 'CFM' and (pg_temp.v('rep') ->> 'loja_id')::uuid = pg_temp.id('loja')
            then 'ok painel dos canais: quadro lê entregador e cancelamento sem o corpo, outra loja não lê, reprocessar só pelo servidor'
            else 'FALHOU painel canais ' || coalesce(pg_temp.v('info')::text, '-') || ' ' || coalesce(pg_temp.v('info2')::text, '-') end;

-- Open Delivery (D-116): conexão para o servidor, dados do Merchant, evento pela conexão, merchantUpdate e delivered
\o /dev/null
update public.marketplace_lojas set modo = 'producao', estado = 'conectado', config = '{"base_url": "https://app.exemplo/od"}' where id = pg_temp.id('mlk');
insert into public.faixas_km (loja_id, marca_id, ate_km, taxa) values (pg_temp.id('loja'), pg_temp.id('marca'), 6, 7) on conflict do nothing;
set role service_role;
select public.marketplace_segredos_gravar(pg_temp.id('mlk'), '{"api_key": "chave-od"}');
insert into saida values ('odc', public.od_conexao(pg_temp.id('mlk')));
insert into saida values ('odm', public.od_merchant_base(pg_temp.id('mlk')));
insert into saida values ('ode1', to_jsonb(public.marketplace_registrar_evento_conexao(pg_temp.id('mlk'), 'od-ev-1', 'CREATED', 'kt-9', '{"eventType": "CREATED"}')));
insert into saida values ('ode2', to_jsonb(public.marketplace_registrar_evento_conexao(pg_temp.id('mlk'), 'od-ev-1', 'CREATED', 'kt-9', null)));
reset role;
-- duas edições do cardápio seguidas → um merchantUpdate só
select from pg_temp.como('00000000-0000-0000-0000-0000000003f1');
update public.produtos set descricao = 'nova' where id = pg_temp.id('pz');
update public.produtos set descricao = 'nova 2' where id = pg_temp.id('pz');
reset role;
update public.lojas set pausa_ate = now() + interval '30 minutes' where id = pg_temp.id('loja');
update public.lojas set pausa_ate = null where id = pg_temp.id('loja');
-- pedido da Keeta de entrega própria concluído → delivered
update saida set v = jsonb_set(jsonb_set(jsonb_set(v, '{externo_id}', '"kt-2"'), '{tipo}', '"entrega"'), '{endereco}', '{"logradouro": "Rua K", "bairro": "Centro"}') where chave = 'pk';
set role service_role;
insert into ids values ('pk3', public.marketplace_receber_pedido(pg_temp.v('pk')));
reset role;
update public.pedidos set status = 'em_preparo', aceito_em = now() where id = pg_temp.id('pk3');
update public.pedidos set status = 'concluido', concluido_em = now() where id = pg_temp.id('pk3');
select from pg_temp.como('00000000-0000-0000-0000-0000000003f2');
select from pg_temp.esperar_erro(format($q$select public.od_conexao('%s')$q$, pg_temp.id('mlk')), 'permission denied');
reset role;
\o
select case when pg_temp.v('odc') -> 'segredos' ->> 'api_key' = 'chave-od' and pg_temp.v('odc') ->> 'canal' = 'keeta'
             and pg_temp.v('odm') #>> '{marca,nome}' = 'Pizza M' and (pg_temp.v('odm') ->> 'raio_km')::numeric = 6
             and jsonb_typeof(pg_temp.v('odm') -> 'setores') = 'array' and pg_temp.v('odm') #>> '{conexao,atualizado_em}' like '20%Z'
             and pg_temp.v('ode1') = 'true' and pg_temp.v('ode2') = 'false'
             and (select count(*) from public.marketplace_saida where marketplace_loja_id = pg_temp.id('mlk') and acao = 'merchantUpdate' and payload = '{}') = 1
             and (select string_agg(payload ->> 'merchantStatus', ',' order by id) from public.marketplace_saida where marketplace_loja_id = pg_temp.id('mlk') and acao = 'merchantUpdate' and payload <> '{}') = 'UNAVAILABLE,AVAILABLE'
             and (select string_agg(acao, ',' order by id) from public.marketplace_saida where pedido_id = pg_temp.id('pk3')) = 'confirm,delivered'
            then 'ok Open Delivery: conexão e Merchant só pelo servidor, evento pela conexão, merchantUpdate do cardápio (1) e da pausa, delivered'
            else 'FALHOU Open Delivery odm=' || left(coalesce(pg_temp.v('odm')::text, '-'), 300) || ' saida=' || coalesce((select string_agg(acao || coalesce(payload::text, ''), ',' order by id) from public.marketplace_saida where marketplace_loja_id = pg_temp.id('mlk') or pedido_id = pg_temp.id('pk3')), '-') end;

-- Delivery Much e Rappi (D-117): pausa vira offline/online no Delivery Much; simulador acha a conexão pelo id
\o /dev/null
with c as (insert into public.marketplace_lojas (loja_id, marca_id, canal, merchant_id, modo, estado)
           values (pg_temp.id('loja'), pg_temp.id('marca'), 'deliverymuch', '0b0c0d0e-0000-4000-8000-000000000001', 'producao', 'conectado') returning id)
insert into ids select 'mldm', id from c;
with c as (insert into public.marketplace_lojas (loja_id, marca_id, canal, merchant_id, modo, estado)
           values (pg_temp.id('loja'), pg_temp.id('marca'), 'rappi', null, 'teste', 'aguardando_autorizacao') returning id)
insert into ids select 'mlrp', id from c;
update public.lojas set pausa_ate = now() + interval '20 minutes' where id = pg_temp.id('loja');
update public.lojas set pausa_ate = null where id = pg_temp.id('loja');
update saida set v = jsonb_set(jsonb_set(jsonb_set(jsonb_set(v, '{canal}', '"rappi"'), '{externo_id}', '"rp-1"'), '{merchant_id}', 'null'), '{marketplace_loja_id}', to_jsonb(pg_temp.id('mlrp'))) where chave = 'pk';
select from pg_temp.como('00000000-0000-0000-0000-0000000003f1');
insert into ids values ('prp', public.simular_pedido_marketplace(pg_temp.id('loja'), pg_temp.v('pk')));
reset role;
update public.pedidos set status = 'em_preparo', aceito_em = now() where id = pg_temp.id('prp');
select from pg_temp.como('00000000-0000-0000-0000-0000000003f2');
select from pg_temp.esperar_erro(format($q$select public.simular_pedido_marketplace('%s', '%s'::jsonb)$q$, pg_temp.id('loja'), pg_temp.v('pk')), 'Só o dono');
reset role;
-- outra conexão (Delivery Much em produção) não serve para o simulador
update saida set v = jsonb_set(jsonb_set(v, '{canal}', '"deliverymuch"'), '{marketplace_loja_id}', to_jsonb(pg_temp.id('mldm'))) where chave = 'pk';
select from pg_temp.como('00000000-0000-0000-0000-0000000003f1');
select from pg_temp.esperar_erro(format($q$select public.simular_pedido_marketplace('%s', '%s'::jsonb)$q$, pg_temp.id('loja'), pg_temp.v('pk')), 'modo teste');
reset role;
\o
select case when (select string_agg(acao, ',' order by id) from public.marketplace_saida where marketplace_loja_id = pg_temp.id('mldm')) = 'pausar,abrir'
             and (select count(*) from public.marketplace_saida where marketplace_loja_id = pg_temp.id('mlrp') and acao in ('pausar', 'abrir')) = 0
             and (select externo_canal::text || '/' || origem::text from public.pedidos where id = pg_temp.id('prp')) = 'rappi/rappi'
             and (select string_agg(acao || ':' || situacao, ',') from public.marketplace_saida where pedido_id = pg_temp.id('prp')) = 'confirm:simulado'
            then 'ok Delivery Much e Rappi: pausa vira offline/online no Delivery Much, simulador pela conexão em teste (Rappi), produção recusada'
            else 'FALHOU DM/Rappi saida=' || coalesce((select string_agg(canal || ':' || acao || ':' || situacao, ',' order by id) from public.marketplace_saida where marketplace_loja_id in (pg_temp.id('mldm'), pg_temp.id('mlrp')) or pedido_id = pg_temp.id('prp')), '-')
                 || ' ped=' || coalesce((select externo_canal::text || '/' || origem::text from public.pedidos where id = pg_temp.id('prp')), '-') end;
\o /dev/null
select from pg_temp.como('00000000-0000-0000-0000-0000000003f1');
insert into saida values ('sev', to_jsonb(public.simular_evento_marketplace(pg_temp.id('prp'), 'CANCELLED', 'Cliente desistiu (simulado)')));
reset role;
\o
select case when (select status::text from public.pedidos where id = pg_temp.id('prp')) = 'cancelado'
            then 'ok simulador: evento fictício da Rappi cancela o pedido de teste'
            else 'FALHOU simulador evento ' || coalesce(pg_temp.v('sev')::text, '-') || ' status=' || coalesce((select status::text from public.pedidos where id = pg_temp.id('prp')), '-') end;

-- Financeiro por canal (D-118): comissão do app no DRE e no repasse; sem cadastro, nada muda; outra loja não vê
\o /dev/null
select from pg_temp.como('00000000-0000-0000-0000-0000000003f1');
insert into saida values ('fdre0', (select (public.dre_financeiro(array[pg_temp.id('loja')], extract(year from now())::int) -> 'meses' -> (extract(month from now())::int - 1) ->> 'taxas')::jsonb));
insert into public.canal_taxas (loja_id, canal, comissao_pct, comissao_entrega, pagamento_pct, fixa) values (pg_temp.id('loja'), 'keeta', 12, true, 3.2, 0.5)
  on conflict (loja_id, canal) do update set comissao_pct = 12, comissao_entrega = true, pagamento_pct = 3.2, fixa = 0.5;
insert into saida values ('frep', public.repasses_canais(pg_temp.id('loja'), 2));
insert into saida values ('fdre1', (select (public.dre_financeiro(array[pg_temp.id('loja')], extract(year from now())::int) -> 'meses' -> (extract(month from now())::int - 1) ->> 'taxas')::jsonb));
reset role;
insert into saida values ('fesp', (select to_jsonb(round(((p.subtotal + p.taxa_entrega) * 0.12 + case when p.pagamento = 'online' then p.total * 0.032 else 0 end + 0.5) * 100))
                                    from public.pedidos p where p.id = pg_temp.id('pk3')));
insert into saida values ('ftx', (select to_jsonb(round(private.fin_taxa_venda(p.loja_id, p.externo_canal, p.pagamento, p.subtotal, p.taxa_entrega, p.total) * 100)) from public.pedidos p where p.id = pg_temp.id('pk3')));
select from pg_temp.como('00000000-0000-0000-0000-0000000003f2');
select from pg_temp.esperar_erro(format($q$select public.repasses_canais('%s')$q$, pg_temp.id('loja')), 'Financeiro');
insert into saida values ('fct2', to_jsonb((select count(*) from public.canal_taxas)));
reset role;
\o
select case when pg_temp.v('ftx') = pg_temp.v('fesp')
             and (select (m ->> 'comissao')::numeric + (m ->> 'taxa')::numeric from jsonb_array_elements(pg_temp.v('frep') -> 'canais') c, jsonb_array_elements(c -> 'meses') m
                   where c ->> 'canal' = 'keeta' and m ->> 'mes' = to_char(now(), 'YYYY-MM')) >= (pg_temp.v('fesp') #>> '{}')::numeric
             and (pg_temp.v('fdre1') #>> '{}')::numeric > (pg_temp.v('fdre0') #>> '{}')::numeric
             and pg_temp.v('fct2') = '0'
             and (select c -> 'taxas' ->> 'comissao_pct' from jsonb_array_elements(pg_temp.v('frep') -> 'canais') c where c ->> 'canal' = 'keeta') = '12.00'
            then 'ok financeiro por canal: comissão do app na taxa da venda, no DRE e no repasse; outra loja não vê'
            else 'FALHOU financeiro canal tx=' || coalesce(pg_temp.v('ftx')::text, '-') || ' esp=' || coalesce(pg_temp.v('fesp')::text, '-')
                 || ' dre0=' || coalesce(pg_temp.v('fdre0')::text, '-') || ' dre1=' || coalesce(pg_temp.v('fdre1')::text, '-') || ' rep=' || left(coalesce(pg_temp.v('frep')::text, '-'), 400) end;
