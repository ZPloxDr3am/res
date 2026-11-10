-- Testes do convite, do teste grátis e do bloqueio (D-082).
\set ON_ERROR_STOP on
\o /dev/null
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000005a1', 'equipe@example.com'), ('00000000-0000-0000-0000-0000000005a2', 'novo2@example.com'), ('00000000-0000-0000-0000-0000000005a3', 'curioso@example.com');
insert into private.equipe_res (user_id) values ('00000000-0000-0000-0000-0000000005a1');
insert into private.config_plataforma (chave, valor) values ('cadastro_modo', 'convite') on conflict (chave) do update set valor = 'convite';
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
create temp table r (chave text primary key, v jsonb);
grant all on r to authenticated, anon;
create or replace function pg_temp.v(p text) returns jsonb language sql as $$ select v from r where chave = p $$;

-- quem não é da equipe não cria convite
select from pg_temp.como('00000000-0000-0000-0000-0000000005a3');
select from pg_temp.esperar_erro($q$select public.criar_convite('x')$q$, 'Só o time do RES');
insert into r values ('curioso_ve', to_jsonb((select count(*) from public.convites_cadastro)));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a1');
insert into r values ('cod', to_jsonb(public.criar_convite('Burger do Zé', 10)));
insert into r values ('equipe_ve', to_jsonb((select count(*) from public.convites_cadastro)));
reset role;
set role anon;
insert into r values ('valido', to_jsonb(public.convite_valido(pg_temp.v('cod') #>> '{}')));
insert into r values ('invalido', to_jsonb(public.convite_valido('NAOEXISTE')));
insert into r values ('modo', to_jsonb(public.cadastro_modo()));
reset role;
-- sem convite não cadastra; com convite cadastra, entra em teste de 10 dias e o convite é gasto
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
select from pg_temp.esperar_erro($q$select public.criar_loja_cadastro('{"restaurante":"Burger","slug":"burger-do-convite","nome":"Ana Teste","whatsapp":"47999990011","aceite_versao":"2026-11-07","empresa":{"documento":"11.222.333/0001-81","razao_social":"Burger Teste Ltda","telefone":"(47) 99888-7777","cep":"89107-000","logradouro":"Rua A","numero":"1","bairro":"Centro","cidade":"Pomerode","uf":"SC"}}')$q$, 'Convite inválido');
insert into r values ('loja', to_jsonb(public.criar_loja_cadastro(('{"restaurante":"Burger","slug":"burger-do-convite","nome":"Ana Teste","whatsapp":"47999990011","aceite_versao":"2026-11-07","convite":"' || lower(pg_temp.v('cod') #>> '{}') || '","empresa":{"documento":"11.222.333/0001-81","razao_social":"Burger Teste Ltda","telefone":"(47) 99888-7777","cep":"89107-000","logradouro":"Rua A","numero":"1","bairro":"Centro","cidade":"Pomerode","uf":"SC"}}')::jsonb)));
insert into r values ('sit', public.situacao_conta((pg_temp.v('loja') #>> '{}')::uuid));
reset role;
set role anon;
insert into r values ('valido_depois', to_jsonb(public.convite_valido(pg_temp.v('cod') #>> '{}')));
reset role;
-- teste vencido: pedido novo é recusado; equipe ativa e volta a aceitar
update public.contas set teste_ate = now() - interval '1 minute' where id = (select conta_id from public.lojas where id = (pg_temp.v('loja') #>> '{}')::uuid);
select from pg_temp.esperar_erro(format($q$insert into public.pedidos (loja_id, marca_id, numero, status, tipo, origem, cliente_nome, subtotal, total)
  select '%s', m.id, 999, 'novo', 'balcao', 'painel', 'X', 10, 10 from public.marcas m where m.loja_id = '%s' limit 1$q$, pg_temp.v('loja') #>> '{}', pg_temp.v('loja') #>> '{}'), 'está pausado');
insert into r values ('conta', to_jsonb((select conta_id from public.lojas where id = (pg_temp.v('loja') #>> '{}')::uuid)));
select from pg_temp.como('00000000-0000-0000-0000-0000000005a1');
select public.mudar_situacao_conta((pg_temp.v('conta') #>> '{}')::uuid, 'ativar', 30, 'Pix de novembro');
insert into r values ('contas', public.contas_da_plataforma());
reset role;
insert into r values ('liberada_depois', to_jsonb(private.conta_liberada((select conta_id from public.lojas where id = (pg_temp.v('loja') #>> '{}')::uuid))));
\o
select case when pg_temp.v('curioso_ve') = '0' and pg_temp.v('equipe_ve') = '1' and (pg_temp.v('cod') #>> '{}') ~ '^[A-Z0-9]{8}$'
             and pg_temp.v('valido') = 'true' and pg_temp.v('invalido') = 'false' and pg_temp.v('modo') = '"convite"' and pg_temp.v('valido_depois') = 'false'
            then 'ok convite: só a equipe cria, uso único, conferido sem login' else 'FALHOU convite' end;
select case when pg_temp.v('sit') ->> 'situacao' = 'teste' and (pg_temp.v('sit') ->> 'liberada')::boolean
             and ((pg_temp.v('sit') ->> 'teste_ate')::timestamptz - now()) between interval '9 days 23 hours' and interval '10 days 1 hour'
             and (select usado_por from public.convites_cadastro where codigo = pg_temp.v('cod') #>> '{}') = '00000000-0000-0000-0000-0000000005a2'
            then 'ok cadastro com convite começa o teste com os dias do convite' else 'FALHOU teste ' || pg_temp.v('sit')::text end;
select case when pg_temp.v('liberada_depois') = 'true'
             and exists (select 1 from jsonb_array_elements(pg_temp.v('contas')) c where c ->> 'situacao' = 'ativa' and c ->> 'nota' = 'Pix de novembro')
            then 'ok teste vencido bloqueia pedido novo; ativar libera' else 'FALHOU bloqueio' end;
-- brecha fechada: sem convite, criar_loja direto não abre conta nova
\o /dev/null
select from pg_temp.como('00000000-0000-0000-0000-0000000005a3');
select from pg_temp.esperar_erro($q$select public.criar_loja('Loja X', 'Marca X', 'loja-x-sem-convite', 'Curioso')$q$, 'convite do time do RES');
reset role;
\o
select 'ok sem convite não abre conta pelo caminho antigo';
