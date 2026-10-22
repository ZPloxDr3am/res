-- Testes de 0018: despacho por QR, entregar, painel do motoboy, QR na via do pedido.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000af', 'teo@example.com'),
  ('00000000-0000-0000-0000-0000000000b0', 'moto1@equipe.res.invalid'),
  ('00000000-0000-0000-0000-0000000000b2', 'moto2@equipe.res.invalid'),
  ('00000000-0000-0000-0000-0000000000b3', 'caixa9@equipe.res.invalid');

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
create temp table tokens (chave text primary key, t text);
grant all on tokens to authenticated;
create or replace function pg_temp.token(p text) returns text language sql as $$ select t from tokens where chave = p $$;

select from pg_temp.como('00000000-0000-0000-0000-0000000000af');
insert into ids values ('loja', public.criar_loja('Loja T', 'Pizza T', 'pizza-t', 'Teo'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-t';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza', pg_temp.id('setor'), 50));
select public.registrar_usuario_caixa(pg_temp.id('loja'), '00000000-0000-0000-0000-0000000000b0', 'moto1', 'Zeca Moto', 'entregador');
select public.registrar_usuario_caixa(pg_temp.id('loja'), '00000000-0000-0000-0000-0000000000b2', 'moto2', 'Beto Moto', 'entregador');
select public.registrar_usuario_caixa(pg_temp.id('loja'), '00000000-0000-0000-0000-0000000000b3', 'caixa9', 'Caixa');
insert into ids values ('ent', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega',
  'cliente', jsonb_build_object('nome', 'Ana', 'telefone', '47999990000'),
  'endereco', jsonb_build_object('logradouro', 'Rua 300', 'numero', '120', 'bairro', 'Centro', 'referencia', 'portão azul'),
  'pagamento', 'dinheiro', 'troco_para', 100, 'taxa_entrega', 5,
  'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
insert into ids values ('ret', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'retirada',
  'cliente', jsonb_build_object('nome', 'Bia'), 'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000000af');
select public.mudar_status_pedido(pg_temp.id('ent'), 'em_preparo');
reset role;
insert into tokens select 'ent', qr_token from public.pedidos where id = pg_temp.id('ent');
insert into tokens select 'ret', qr_token from public.pedidos where id = pg_temp.id('ret');

-- QR na via do pedido (só entrega)
select from pg_temp.como('00000000-0000-0000-0000-0000000000af');
do $$ begin
  if (public.imprimir_pedido(pg_temp.id('ent'), 'pedido') #>> '{0,conteudo,qr}') <> pg_temp.token('ent') then raise exception 'QR na via do pedido'; end if;
  if (public.imprimir_pedido(pg_temp.id('ret'), 'pedido') #>> '{0,conteudo,qr}') is not null then raise exception 'retirada não leva QR'; end if;
end $$;
reset role;

-- painel do motoboy antes: pedido em preparo aparece como "vem aí"
select from pg_temp.como('00000000-0000-0000-0000-0000000000b0');
insert into saida values ('p0', public.motoboy_painel());
-- caixa (funcionário) não é motoboy
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000000b3');
select from pg_temp.esperar_erro(format($q$select public.motoboy_despachar('%s')$q$, pg_temp.token('ent')), 'não é motoboy');
do $$ begin if public.motoboy_painel() is not null then raise exception 'caixa viu painel do motoboy'; end if; end $$;
reset role;

-- Zeca escaneia: sai com ele (de "em preparo" direto, histórico completo)
select from pg_temp.como('00000000-0000-0000-0000-0000000000b0');
select from pg_temp.esperar_erro($q$select public.motoboy_despachar('nao-existe')$q$, 'QR não reconhecido');
select from pg_temp.esperar_erro(format($q$select public.motoboy_despachar('%s')$q$, pg_temp.token('ret')), 'não tem entrega');
insert into saida values ('d1', public.motoboy_despachar(pg_temp.token('ent')));
insert into saida values ('d2', public.motoboy_despachar(pg_temp.token('ent')));  -- escaneou de novo: ok
insert into saida values ('p1', public.motoboy_painel());
reset role;
do $$
declare d jsonb := pg_temp.v('d1');
begin
  if jsonb_array_length(pg_temp.v('p0') -> 'prontos') <> 1 or pg_temp.v('p0') ->> 'nome' <> 'Zeca Moto' then raise exception 'painel antes: %', pg_temp.v('p0'); end if;
  if d ->> 'status' <> 'em_entrega' or d ->> 'entregador' <> 'Zeca Moto' or not (d ->> 'cobrar')::boolean
     or (d ->> 'total')::int <> 5500 or (d ->> 'troco_para')::int <> 10000 or d #>> '{endereco,referencia}' <> 'portão azul' or d ->> 'telefone' <> '47999990000' then
    raise exception 'despacho: %', d;
  end if;
  if (select (status, entregador_nome, saiu_em is not null, pronto_em is not null) from public.pedidos where id = pg_temp.id('ent')) <> ('em_entrega'::public.status_pedido, 'Zeca Moto'::text, true, true) then raise exception 'pedido não saiu'; end if;
  if (select string_agg(para::text, ',' order by id) from public.pedido_eventos where pedido_id = pg_temp.id('ent')) <> 'novo,em_preparo,pronto,em_entrega' then
    raise exception 'eventos: %', (select string_agg(para::text, ',' order by id) from public.pedido_eventos where pedido_id = pg_temp.id('ent'));
  end if;
  if jsonb_array_length(pg_temp.v('p1') -> 'em_rota') <> 1 or jsonb_array_length(pg_temp.v('p1') -> 'prontos') <> 0 then raise exception 'painel depois: %', pg_temp.v('p1'); end if;
end $$;

-- Beto não pega o mesmo pedido nem entrega o do Zeca
select from pg_temp.como('00000000-0000-0000-0000-0000000000b2');
select from pg_temp.esperar_erro(format($q$select public.motoboy_despachar('%s')$q$, pg_temp.token('ent')), 'já saiu com Zeca Moto');
select from pg_temp.esperar_erro(format($q$select public.motoboy_entregar('%s')$q$, pg_temp.id('ent')), 'está com Zeca Moto');
reset role;

-- Zeca entrega: conclui e conta no dia dele
select from pg_temp.como('00000000-0000-0000-0000-0000000000b0');
select public.motoboy_entregar(pg_temp.id('ent'));
select from pg_temp.esperar_erro(format($q$select public.motoboy_entregar('%s')$q$, pg_temp.id('ent')), 'não está em rota');
insert into saida values ('p2', public.motoboy_painel());
reset role;
do $$ begin
  if (select status from public.pedidos where id = pg_temp.id('ent')) <> 'concluido' then raise exception 'não concluiu'; end if;
  if (pg_temp.v('p2') #>> '{hoje,entregas}')::int <> 1 or (pg_temp.v('p2') #>> '{hoje,cobrado_dinheiro}')::int <> 5500 or (pg_temp.v('p2') #>> '{hoje,taxas}')::int <> 500 then
    raise exception 'resumo do dia: %', pg_temp.v('p2') -> 'hoje';
  end if;
end $$;

\o
\pset tuples_only on
select 'OK: app do motoboy';
