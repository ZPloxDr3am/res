-- Testes de 0016: pareamento do agente, sincronizar (alcance, cupons, sem duplicar), resultado, remover.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000ac', 'lia@example.com');

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

-- montagem: loja com 2 impressoras e regras "uma impressora só" (Cozinha)
select from pg_temp.como('00000000-0000-0000-0000-0000000000ac');
insert into ids values ('loja', public.criar_loja('Loja L', 'Lanche L', 'lanche-l', 'Lia'));
insert into ids select 'marca', id from public.marcas where slug = 'lanche-l';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Lanches'));
insert into ids values ('x', public.criar_produto(pg_temp.id('loja'), 'X-Tudo', pg_temp.id('setor'), 30));
insert into ids values ('coz', public.salvar_impressora(pg_temp.id('loja'), null, '{"nome": "Cozinha", "modelo": "epson-tm-t20x", "protocolo": "EscPosEpson", "endereco": "EPSON TM-T20X-II Receipt"}'));
insert into ids values ('bar', public.salvar_impressora(pg_temp.id('loja'), null, '{"nome": "Bar", "modelo": "generica-58", "protocolo": "CustomPos", "conexao": "rede", "endereco": "10.0.0.9:9100", "colunas": 32}'));
select public.salvar_config_impressao(pg_temp.id('loja'), jsonb_build_object('modo_destino', 'unica', 'impressora_padrao', pg_temp.id('coz')));
insert into saida values ('cod', public.gerar_codigo_agente(pg_temp.id('loja')));
reset role;
do $$ begin
  if pg_temp.v('cod') ->> 'codigo' !~ '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$' then raise exception 'formato do código: %', pg_temp.v('cod'); end if;
end $$;

-- pareamento (anônimo, como o agente)
select from pg_temp.anonimo();
select from pg_temp.esperar_erro($q$select public.parear_agente('ZZZZ-ZZZZ', 'PC')$q$, 'Código inválido');
insert into saida values ('par', public.parear_agente(lower(pg_temp.v('cod') ->> 'codigo'), 'PC Cozinha', '1.0.0'));
select from pg_temp.esperar_erro(format($q$select public.parear_agente('%s', 'PC 2')$q$, pg_temp.v('cod') ->> 'codigo'), 'Código inválido');  -- uso único
select from pg_temp.esperar_erro($q$select public.agente_sincronizar('token-errado-token-errado-token-errado-xx')$q$, 'desconectado');
-- anônimo não lê agentes nem impressões direto
do $$ begin
  if exists (select 1 from public.impressoes) then raise exception 'anon leu impressões'; end if;
end $$;
reset role;
do $$ begin
  if length(pg_temp.v('par') ->> 'token') < 40 or pg_temp.v('par') ->> 'loja' <> 'Loja L' then raise exception 'pareamento: %', pg_temp.v('par'); end if;
  if exists (select 1 from public.agentes where token_hash = pg_temp.v('par') ->> 'token') then raise exception 'token guardado em claro'; end if;
end $$;

-- um pedido aceito gera 1 cupom na Cozinha
select from pg_temp.como('00000000-0000-0000-0000-0000000000ac');
insert into ids values ('p1', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'balcao', 'cliente', jsonb_build_object('nome', 'Mesa 2'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('x'), 'quantidade', 1)))));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000000ac');
select public.mudar_status_pedido(pg_temp.id('p1'), 'em_preparo');
reset role;

-- sincronizar sem alcançar a Cozinha: não recebe o cupom
select from pg_temp.anonimo();
insert into saida values ('s0', public.agente_sincronizar(pg_temp.v('par') ->> 'token',
  jsonb_build_object('versao', '1.0.0', 'impressoras_windows', jsonb_build_array('Microsoft Print to PDF'),
                     'alcance', jsonb_build_array(jsonb_build_object('id', pg_temp.id('coz'), 'ok', false, 'erro', 'Impressora não encontrada no Windows')))));
-- alcançando: recebe 1 cupom, já marcado imprimindo; a 2ª chamada não devolve o mesmo
insert into saida values ('s1', public.agente_sincronizar(pg_temp.v('par') ->> 'token',
  jsonb_build_object('impressoras_windows', jsonb_build_array('EPSON TM-T20X-II Receipt'), 'alcance', jsonb_build_array(jsonb_build_object('id', pg_temp.id('coz'), 'ok', true)))));
insert into saida values ('s2', public.agente_sincronizar(pg_temp.v('par') ->> 'token',
  jsonb_build_object('alcance', jsonb_build_array(jsonb_build_object('id', pg_temp.id('coz'), 'ok', true)))));
reset role;
do $$
declare c jsonb := pg_temp.v('s1') -> 'cupons';
begin
  if jsonb_array_length(pg_temp.v('s0') -> 'cupons') <> 0 then raise exception 'sem alcance não deveria receber'; end if;
  if jsonb_array_length(pg_temp.v('s0') -> 'impressoras') <> 2 or pg_temp.v('s0') #>> '{impressoras,1,endereco}' <> 'EPSON TM-T20X-II Receipt' then raise exception 'impressoras: %', pg_temp.v('s0') -> 'impressoras'; end if;
  if jsonb_array_length(c) <> 1 or c #>> '{0,conteudo,itens,0,nome}' <> 'X-Tudo' then raise exception 'cupons: %', c; end if;
  if jsonb_array_length(pg_temp.v('s2') -> 'cupons') <> 0 then raise exception 'entregou o mesmo cupom duas vezes'; end if;
  if (select status from public.impressoes where id = (c #>> '{0,id}')::uuid) <> 'imprimindo' then raise exception 'deveria estar imprimindo'; end if;
  if (select ultimo_sinal is null from public.impressoras where id = pg_temp.id('coz')) then raise exception 'sinal da impressora'; end if;
  if (select impressoras_windows ->> 0 from public.agentes) <> 'EPSON TM-T20X-II Receipt' then raise exception 'impressoras do windows'; end if;
end $$;

-- resultado: erro e depois ok
select from pg_temp.anonimo();
select public.agente_resultado(pg_temp.v('par') ->> 'token', (pg_temp.v('s1') #>> '{cupons,0,id}')::uuid, false, 'Sem papel');
reset role;
do $$ begin
  if (select (status, tentativas, erro) from public.impressoes where id = (pg_temp.v('s1') #>> '{cupons,0,id}')::uuid) <> ('erro'::text, 1::smallint, 'Sem papel'::text) then raise exception 'erro não registrado'; end if;
  if (select ultimo_erro from public.impressoras where id = pg_temp.id('coz')) <> 'Sem papel' then raise exception 'erro na impressora'; end if;
end $$;
select from pg_temp.anonimo();
-- com erro e menos de 3 tentativas: volta na próxima sincronização
insert into saida values ('s3', public.agente_sincronizar(pg_temp.v('par') ->> 'token', jsonb_build_object('alcance', jsonb_build_array(jsonb_build_object('id', pg_temp.id('coz'), 'ok', true)))));
select public.agente_resultado(pg_temp.v('par') ->> 'token', (pg_temp.v('s3') #>> '{cupons,0,id}')::uuid, true);
reset role;
do $$ begin
  if (select (status, impresso_por, erro is null) from public.impressoes where id = (pg_temp.v('s1') #>> '{cupons,0,id}')::uuid) <> ('impresso'::text, 'agente'::text, true) then raise exception 'impresso pelo agente'; end if;
  if (select ultimo_erro from public.impressoras where id = pg_temp.id('coz')) is not null then raise exception 'erro deveria limpar ao sincronizar ok'; end if;
end $$;

-- painel vê o computador (sem o token) e o remove; o token para de valer
select from pg_temp.como('00000000-0000-0000-0000-0000000000ac');
do $$ begin
  if (select count(*) from public.agentes_loja) <> 1 or (select nome from public.agentes_loja) <> 'PC Cozinha' then raise exception 'agentes_loja'; end if;
  if exists (select 1 from public.agentes) then raise exception 'tabela agentes não deveria ser legível'; end if;
  perform public.remover_agente((select id from public.agentes_loja));
end $$;
reset role;
select from pg_temp.anonimo();
select from pg_temp.esperar_erro(format($q$select public.agente_sincronizar('%s')$q$, pg_temp.v('par') ->> 'token'), 'desconectado');
reset role;

\o
\pset tuples_only on
select 'OK: agente de impressão';
