-- Testes de 0040: API aberta (chaves, escopos, pedidos, vendas, cardápio, clientes, estoque) e webhooks (fila, assinatura).
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000002b1', 'api@example.com'),
  ('00000000-0000-0000-0000-0000000002b2', 'moto17@equipe.res.invalid'),
  ('00000000-0000-0000-0000-0000000002b3', 'fora3@example.com');
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
create temp table chaves (nome text primary key, chave text);
grant all on chaves to authenticated, anon;
create or replace function pg_temp.k(p text) returns text language sql as $$ select chave from chaves where nome = p $$;

-- HMAC-SHA256: vetor do RFC 4231 (caso 2)
do $$ begin
  if private.hmac_sha256('Jefe', 'what do ya want for nothing?') <> '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843' then
    raise exception 'hmac: %', private.hmac_sha256('Jefe', 'what do ya want for nothing?');
  end if;
end $$;

select from pg_temp.como('00000000-0000-0000-0000-0000000002b1');
insert into ids values ('loja', public.criar_loja('Loja API', 'Pizza API', 'pizza-api', 'Ana'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-api';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza API', pg_temp.id('setor'), 50));
insert into chaves values ('tudo', public.criar_chave_api(pg_temp.id('loja'), 'BI', array['pedidos', 'vendas', 'cardapio', 'clientes', 'estoque']) ->> 'chave');
insert into chaves values ('vendas', public.criar_chave_api(pg_temp.id('loja'), 'IA', array['vendas']) ->> 'chave');
select from pg_temp.esperar_erro(format($q$select public.criar_chave_api('%s', 'x', array['tudo'])$q$, pg_temp.id('loja')), 'check');
insert into saida values ('wh', public.salvar_webhook(pg_temp.id('loja'), null, 'https://exemplo.com/res', array['pedido.criado', 'pedido.cancelado'], true));
select from pg_temp.esperar_erro(format($q$select public.salvar_webhook('%s', null, 'http://inseguro.com', array['pedido.criado'], true)$q$, pg_temp.id('loja')), 'https');
insert into ids values ('ped', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'balcao',
  'cliente', jsonb_build_object('nome', 'Bruno Silva', 'telefone', '47996731809'), 'pagamento', 'pix',
  'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 2)))));
reset role;
update public.pedidos set status = 'concluido', concluido_em = now() where id = pg_temp.id('ped');
insert into chaves select 'numero', numero::text from public.pedidos where id = pg_temp.id('ped');

-- a API entra como anon, só com a chave
set role anon;
insert into saida values ('pedidos', public.api_pedidos(pg_temp.k('tudo'), '{}'));
insert into saida values ('pedido', public.api_pedido(pg_temp.k('tudo'), pg_temp.k('numero')));
insert into saida values ('vendas', public.api_vendas(pg_temp.k('vendas'), null, null));
insert into saida values ('cardapio', public.api_cardapio(pg_temp.k('tudo')));
insert into saida values ('clientes', public.api_clientes(pg_temp.k('tudo'), null, 10));
insert into saida values ('estoque', public.api_estoque(pg_temp.k('tudo')));
select from pg_temp.esperar_erro(format($q$select public.api_pedidos('%s', '{}')$q$, pg_temp.k('vendas')), 'não tem acesso');
select from pg_temp.esperar_erro($q$select public.api_pedidos('res_errada_0000000000000000000000000000000000000000', '{}')$q$, 'inválida');
select from pg_temp.esperar_erro($q$select public.api_painel('00000000-0000-0000-0000-000000000000')$q$, 'permission denied');
reset role;

do $$
declare p jsonb := pg_temp.v('pedido'); v jsonb := pg_temp.v('vendas');
begin
  if (pg_temp.v('pedidos') ->> 'total')::int <> 1 or p ->> 'status' <> 'concluido' or (p ->> 'total')::numeric <> 100
     or p #>> '{itens,0,nome}' <> 'Pizza API' or (p #>> '{itens,0,quantidade}')::int <> 2 or p #>> '{cliente,nome}' <> 'Bruno Silva' then
    raise exception 'api pedido: %', p;
  end if;
  if (v ->> 'pedidos')::int <> 1 or (v ->> 'faturamento')::numeric <> 100 or v #>> '{mais_vendidos,0,produto}' <> 'Pizza API' then raise exception 'api vendas: %', v; end if;
  if pg_temp.v('cardapio') #>> '{categorias,0,produtos,0,nome}' <> 'Pizza API' then raise exception 'api cardápio: %', pg_temp.v('cardapio'); end if;
  if pg_temp.v('clientes') #>> '{clientes,0,telefone}' <> '+5547996731809' then raise exception 'api clientes: %', pg_temp.v('clientes'); end if;
  if pg_temp.v('estoque') -> 'insumos' <> '[]'::jsonb then raise exception 'api estoque: %', pg_temp.v('estoque'); end if;
  -- webhook: criou → 1 envio (concluir não é evento assinado); sem pg_net fica pendente
  if (select count(*) from public.webhook_envios) <> 1 or (select evento from public.webhook_envios) <> 'pedido.criado'
     or (select corpo #>> '{pedido,numero}' from public.webhook_envios) is null then
    raise exception 'webhook fila: %', (select jsonb_agg(to_jsonb(e) - 'corpo') from public.webhook_envios e);
  end if;
  if (select usos from public.api_chaves where nome = 'BI') < 1 then raise exception 'uso da chave'; end if;
end $$;

-- cancelar dispara pedido.cancelado; revogar corta o acesso; outro usuário não vê o painel
update public.pedidos set status = 'cancelado', cancelado_em = now(), motivo_cancelamento = 'teste' where id = pg_temp.id('ped');
select from pg_temp.como('00000000-0000-0000-0000-0000000002b1');
insert into saida values ('painel', public.api_painel(pg_temp.id('loja')));
select public.testar_webhook(pg_temp.id('loja'), (pg_temp.v('wh') ->> 'id')::uuid);
select public.revogar_chave_api(pg_temp.id('loja'), (select (x ->> 'id')::uuid from jsonb_array_elements(pg_temp.v('painel') -> 'chaves') x where x ->> 'nome' = 'BI'));
select from pg_temp.como('00000000-0000-0000-0000-0000000002b3');
select from pg_temp.esperar_erro(format($q$select public.api_painel('%s')$q$, pg_temp.id('loja')), 'gestores');
reset role;
set role anon;
select from pg_temp.esperar_erro(format($q$select public.api_pedidos('%s', '{}')$q$, pg_temp.k('tudo')), 'revogada');
reset role;
do $$ begin
  if (select count(*) from public.webhook_envios) <> 3 or not exists (select 1 from public.webhook_envios where evento = 'pedido.cancelado') then
    raise exception 'webhook cancelado/teste';
  end if;
  if jsonb_array_length(pg_temp.v('painel') -> 'chaves') <> 2 or jsonb_array_length(pg_temp.v('painel') #> '{webhooks,0,envios}') <> 2
     or (pg_temp.v('painel') ->> 'envio_automatico')::boolean then
    raise exception 'painel api: %', pg_temp.v('painel');
  end if;
  perform private.processar_webhooks();  -- sem pg_net: não quebra
end $$;

\o
\pset tuples_only on
select 'OK: API e webhooks';
