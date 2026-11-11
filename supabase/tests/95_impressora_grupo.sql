-- Testes de 0017: impressora do grupo (lojas da mesma conta) e agente atendendo o grupo.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ad', 'rui@example.com'), ('00000000-0000-0000-0000-0000000000ae', 'out@example.com');

create or replace function pg_temp.como(p_user text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user, false);
  execute 'set role authenticated';
end; $$;
create or replace function pg_temp.anonimo() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  execute 'set role anon';
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

-- Rui: conta com 3 lojas (A, B, C). Outra conta (Out) com a loja X.
select from pg_temp.como('00000000-0000-0000-0000-0000000000ad');
insert into ids values ('a', public.criar_loja('Loja A', 'Pizza A', 'pizza-ga', 'Rui'));
reset role;
update public.contas set limite_lojas = 5, limite_cardapios = 5 where id = (select conta_id from public.lojas where id = pg_temp.id('a'));
select from pg_temp.como('00000000-0000-0000-0000-0000000000ad');
insert into ids values ('b', public.criar_loja_na_conta((select conta_id from public.lojas where id = pg_temp.id('a')), 'Loja B', 'Burger B', 'burger-gb'));
insert into ids values ('c', public.criar_loja_na_conta((select conta_id from public.lojas where id = pg_temp.id('a')), 'Loja C', 'Pizza C', 'pizza-gc'));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000000ae');
insert into ids values ('x', public.criar_loja('Loja X', 'Outra', 'outra-gx', 'Out'));
reset role;

-- Loja C já tinha regra própria com impressora padrão vazia; B não tinha regra.
select from pg_temp.como('00000000-0000-0000-0000-0000000000ad');
select public.salvar_config_impressao(pg_temp.id('c'), '{"modo_destino": "setor", "canais": {"painel": "manual"}}');
-- impressora cadastrada na loja A
insert into ids values ('epson', public.salvar_impressora(pg_temp.id('a'), null, '{"nome": "Cozinha", "modelo": "epson-tm-t20x", "protocolo": "EscPosEpson", "endereco": "EPSON TM-T20X-II Receipt"}'));
-- mesmo nome em outra loja do grupo: recusado (é a mesma lista)
select from pg_temp.esperar_erro(format($q$select public.salvar_impressora('%s', null, '{"nome": "cozinha", "modelo": "x", "protocolo": "EscPosEpson"}')$q$, pg_temp.id('b')), 'impressoras_nome_idx');
do $$ begin
  -- já configurada nas 3 lojas; a C manteve o modo dela, só ganhou a padrão
  if (select count(*) from public.impressao_config where impressora_padrao = pg_temp.id('epson')) <> 3 then raise exception 'deveria valer nas 3 lojas'; end if;
  if (select (modo_destino, canais ->> 'painel') from public.impressao_config where loja_id = pg_temp.id('c')) <> ('setor'::text, 'manual'::text) then raise exception 'regra da C mudou'; end if;
  -- todas as lojas do grupo veem a impressora
  if (select count(*) from public.impressoras where id = pg_temp.id('epson')) <> 1 then raise exception 'Rui não vê'; end if;
  -- editar a partir da loja B
  perform public.salvar_impressora(pg_temp.id('b'), pg_temp.id('epson'), '{"nome": "Cozinha central", "modelo": "epson-tm-t20x", "protocolo": "EscPosEpson", "endereco": "EPSON TM-T20X-II Receipt"}');
  if (select nome from public.impressoras where id = pg_temp.id('epson')) <> 'Cozinha central' then raise exception 'editar pela B'; end if;
end $$;
reset role;

-- outra conta não vê, não usa nem edita
select from pg_temp.como('00000000-0000-0000-0000-0000000000ae');
do $$ begin
  if exists (select 1 from public.impressoras where id = pg_temp.id('epson')) then raise exception 'outra conta viu a impressora'; end if;
  if exists (select 1 from public.impressao_config where loja_id = pg_temp.id('x')) then raise exception 'outra conta ganhou regra'; end if;
end $$;
select from pg_temp.esperar_erro(format($q$select public.salvar_config_impressao('%s', '{"impressora_padrao": "%s"}')$q$, pg_temp.id('x'), pg_temp.id('epson')), 'Impressora inválida');
select from pg_temp.esperar_erro(format($q$select public.salvar_impressora('%s', '%s', '{"nome": "roubo", "modelo": "x", "protocolo": "EscPosEpson"}')$q$, pg_temp.id('x'), pg_temp.id('epson')), 'não encontrada');
select from pg_temp.esperar_erro(format($q$select public.imprimir_teste('%s')$q$, pg_temp.id('epson')), 'não encontrada');
reset role;

-- agente pareado na loja A recebe o cupom de um pedido da loja B
select from pg_temp.como('00000000-0000-0000-0000-0000000000ad');
insert into saida values ('cod', public.gerar_codigo_agente(pg_temp.id('a')));
insert into ids values ('sb', public.salvar_setor(pg_temp.id('b'), null, 'Lanches'));
insert into ids values ('xb', public.criar_produto(pg_temp.id('b'), 'X-Bacon', pg_temp.id('sb'), 30));
insert into ids values ('pb', public.criar_pedido(pg_temp.id('b'), (select id from public.marcas where slug = 'burger-gb'), jsonb_build_object('tipo', 'balcao',
  'cliente', jsonb_build_object('nome', 'Cli B'), 'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('xb'), 'quantidade', 1)))));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000000ad');
select public.mudar_status_pedido(pg_temp.id('pb'), 'em_preparo');
reset role;
select from pg_temp.anonimo();
insert into saida values ('par', public.parear_agente(pg_temp.v('cod') ->> 'codigo', 'PC Cozinha'));
insert into saida values ('s', public.agente_sincronizar(pg_temp.v('par') ->> 'token',
  jsonb_build_object('alcance', jsonb_build_array(jsonb_build_object('id', pg_temp.id('epson'), 'ok', true)))));
select public.agente_resultado(pg_temp.v('par') ->> 'token', (pg_temp.v('s') #>> '{cupons,0,id}')::uuid, true);
reset role;
do $$ begin
  if jsonb_array_length(pg_temp.v('s') -> 'cupons') <> 1 or pg_temp.v('s') #>> '{cupons,0,conteudo,itens,0,nome}' <> 'X-Bacon' then raise exception 'agente do grupo: %', pg_temp.v('s') -> 'cupons'; end if;
  if (select status from public.impressoes where pedido_id = pg_temp.id('pb')) <> 'impresso' then raise exception 'resultado no grupo'; end if;
end $$;
-- loja B vê o computador pareado na A
select from pg_temp.como('00000000-0000-0000-0000-0000000000ad');
do $$ begin
  if (select count(*) from public.agentes_loja where loja_id = any (array[pg_temp.id('a'), pg_temp.id('b')])) <> 1 then raise exception 'agentes do grupo'; end if;
end $$;
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000000ae');
do $$ begin
  if exists (select 1 from public.agentes_loja) then raise exception 'outra conta viu o computador'; end if;
end $$;
reset role;

\o
\pset tuples_only on
select 'OK: impressora do grupo';
