-- Testes de 0014: usuários de caixa, cadastro de caixas, abrir, vendas, sangria, fechamento cego.
-- Hugo é dono da Loja H; Ana e Beto são usuários de caixa (login por usuário).
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a9', 'hugo@example.com'),
  ('00000000-0000-0000-0000-0000000000b9', 'ana.caixa@equipe.res.invalid'),
  ('00000000-0000-0000-0000-0000000000ba', 'beto@equipe.res.invalid'),
  ('00000000-0000-0000-0000-0000000000bb', 'intruso@example.com');

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
grant all on ids to authenticated;
create or replace function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where chave = p $$;
create temp table saida (chave text primary key, v jsonb);
grant all on saida to authenticated;

\set hugo '''00000000-0000-0000-0000-0000000000a9'''
\set ana '''00000000-0000-0000-0000-0000000000b9'''
\set beto '''00000000-0000-0000-0000-0000000000ba'''

-- ---------------------------------------------------------------- montagem e usuários de caixa
select from pg_temp.como(:hugo);
insert into ids values ('loja', public.criar_loja('Loja H', 'Lanches H', 'lanches-h', 'Hugo'));
insert into ids select 'marca', id from public.marcas where slug = 'lanches-h';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Lanches'));
insert into ids values ('x', public.criar_produto(pg_temp.id('loja'), 'X-Salada', pg_temp.id('setor'), 20));
insert into ids select 'caixa1', id from public.caixas where loja_id = pg_temp.id('loja');
select public.registrar_usuario_caixa(pg_temp.id('loja'), :ana, 'Ana.Caixa', 'Ana');
select public.registrar_usuario_caixa(pg_temp.id('loja'), :beto, 'beto', 'Beto');
select from pg_temp.esperar_erro(format($q$select public.registrar_usuario_caixa('%s', '00000000-0000-0000-0000-0000000000bb', 'intruso', 'X')$q$, pg_temp.id('loja')), 'inválida');
select from pg_temp.esperar_erro(format($q$select public.registrar_usuario_caixa('%s', '00000000-0000-0000-0000-0000000000b9', 'ana.caixa', 'Ana')$q$, pg_temp.id('loja')), 'já está em uso');
select from pg_temp.esperar_erro(format($q$select public.registrar_usuario_caixa('%s', '00000000-0000-0000-0000-0000000000ba', 'beto', 'Beto', 'dono')$q$, pg_temp.id('loja')), 'dono');
do $$ begin
  if (select count(*) from public.caixas where loja_id = pg_temp.id('loja')) <> 1 then raise exception 'loja nova deveria nascer com 1 caixa'; end if;
  if not public.posso(pg_temp.id('loja'), 'equipe') then raise exception 'posso: dono'; end if;
  if not public.pode_gerir_usuario(pg_temp.id('loja'), '00000000-0000-0000-0000-0000000000b9') then raise exception 'dono deveria gerir Ana'; end if;
  if public.pode_gerir_usuario(pg_temp.id('loja'), '00000000-0000-0000-0000-0000000000a9') then raise exception 'dono não é usuário de caixa'; end if;
  if (select usuario from public.usuarios_login where user_id = '00000000-0000-0000-0000-0000000000b9') <> 'ana.caixa' then raise exception 'usuário deveria ficar em minúsculas'; end if;
end $$;
-- Balcão: só a Ana opera. Caixa 1: sem operadores (quem tem permissão).
insert into ids values ('balcao', public.salvar_caixa(pg_temp.id('loja'), null, 'Balcão', true, array[:ana]::uuid[]));
select from pg_temp.esperar_erro(format($q$select public.salvar_caixa('%s', null, 'balcão ')$q$, pg_temp.id('loja')), 'caixas_nome_idx');
select from pg_temp.esperar_erro(format($q$select public.salvar_caixa('%s', null, 'Outro', true, array['00000000-0000-0000-0000-0000000000bb']::uuid[])$q$, pg_temp.id('loja')), 'não faz parte');
reset role;

-- Ana (funcionária) não cadastra caixa nem cria usuário.
select from pg_temp.como(:ana);
do $$ begin if public.posso(pg_temp.id('loja'), 'equipe') or not public.posso(pg_temp.id('loja'), 'caixa') then raise exception 'posso: Ana'; end if; end $$;
select from pg_temp.esperar_erro(format($q$select public.salvar_caixa('%s', null, 'Meu')$q$, pg_temp.id('loja')), 'permissão');
select from pg_temp.esperar_erro(format($q$select public.registrar_usuario_caixa('%s', '00000000-0000-0000-0000-0000000000bb', 'x', 'X')$q$, pg_temp.id('loja')), 'permissão');
reset role;

-- ---------------------------------------------------------------- abrir
select from pg_temp.como(:beto);
select from pg_temp.esperar_erro(format($q$select public.abrir_caixa('%s', '{"valor": 50}')$q$, pg_temp.id('balcao')), 'não pode operar');
reset role;
select from pg_temp.como(:ana);
-- 2×R$50 + 3×R$10 + 4×R$0,25 = 131,00
insert into ids values ('s1', public.abrir_caixa(pg_temp.id('balcao'), '{"contagem": {"5000": 2, "1000": 3, "25": 4}}'));
select from pg_temp.esperar_erro(format($q$select public.abrir_caixa('%s', '{"valor": 1}')$q$, pg_temp.id('balcao')), 'já está aberto');
select from pg_temp.esperar_erro(format($q$select public.abrir_caixa('%s', '{"contagem": {"300": 1}}')$q$, pg_temp.id('caixa1')), 'desconhecida');
do $$
declare c jsonb := public.meus_caixas(pg_temp.id('loja'));
begin
  if (select abertura from public.caixa_sessoes where id = pg_temp.id('s1')) <> 131 then raise exception 'abertura pela contagem'; end if;
  if (select (x ->> 'pode_operar')::boolean from jsonb_array_elements(c -> 'caixas') x where x ->> 'nome' = 'Balcão') is not true
     or (select x #>> '{sessao,aberto_por}' from jsonb_array_elements(c -> 'caixas') x where x ->> 'nome' = 'Balcão') <> 'Ana' then
    raise exception 'meus_caixas: %', c;
  end if;
  if (c ->> 've_valores')::boolean then raise exception 'operadora não deveria ver valores'; end if;
end $$;

-- ---------------------------------------------------------------- vendas entram ao concluir
do $$
declare p1 uuid; p2 uuid; s public.status_pedido;
begin
  p1 := public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'retirada', 'cliente', jsonb_build_object('nome', 'C1'),
          'pagamento', 'dinheiro', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('x'), 'quantidade', 2))));
  p2 := public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'retirada', 'cliente', jsonb_build_object('nome', 'C2'),
          'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('x'), 'quantidade', 1))));
  foreach s in array array['em_preparo', 'pronto', 'concluido']::public.status_pedido[] loop
    perform public.mudar_status_pedido(p1, s);
    perform public.mudar_status_pedido(p2, s);
  end loop;
  if (select count(*) from public.pedidos where caixa_sessao_id = pg_temp.id('s1')) <> 2 then raise exception 'pedidos deveriam entrar no caixa da Ana'; end if;
end $$;

-- sangria/suprimento
select from pg_temp.esperar_erro(format($q$select public.movimentar_caixa('%s', 'sangria', 500)$q$, pg_temp.id('s1')), 'maior que o dinheiro');
select from pg_temp.esperar_erro(format($q$select public.movimentar_caixa('%s', 'venda', 5)$q$, pg_temp.id('s1')), 'sangria ou suprimento');
select public.movimentar_caixa(pg_temp.id('s1'), 'sangria', 50, 'Cofre');
select public.movimentar_caixa(pg_temp.id('s1'), 'suprimento', 10, 'Troco extra');

do $$
declare r jsonb := public.resumo_caixa(pg_temp.id('s1'));
begin
  -- fechamento cego: a operadora vê quantidades, não valores
  if (r ->> 've_valores')::boolean or r ? 'sangrias' and r -> 'sangrias' <> 'null'::jsonb then raise exception 'cego: %', r; end if;
  if exists (select 1 from jsonb_array_elements(r -> 'formas') f where f ? 'esperado' or f ? 'vendas') then raise exception 'cego (formas): %', r -> 'formas'; end if;
  if (select (f ->> 'quantidade')::int from jsonb_array_elements(r -> 'formas') f where f ->> 'forma' = 'pix') <> 1 then raise exception 'quantidade pix'; end if;
  if jsonb_array_length(r -> 'movimentos') <> 2 then raise exception 'movimentos (sangria/suprimento): %', r -> 'movimentos'; end if;
  -- e não lê os movimentos direto na tabela
  if exists (select 1 from public.caixa_movimentos) then raise exception 'RLS: operadora leu movimentos'; end if;
end $$;
reset role;

-- O dono vê os valores com o caixa aberto.
select from pg_temp.como(:hugo);
do $$
declare r jsonb := public.resumo_caixa(pg_temp.id('s1'));
begin
  -- dinheiro: 131 + 40 − 50 + 10 = 131; pix 20
  if (select (f ->> 'esperado')::numeric from jsonb_array_elements(r -> 'formas') f where f ->> 'forma' = 'dinheiro') <> 131
     or (select (f ->> 'esperado')::numeric from jsonb_array_elements(r -> 'formas') f where f ->> 'forma' = 'pix') <> 20 then
    raise exception 'esperado: %', r -> 'formas';
  end if;
  if (r ->> 'sangrias')::numeric <> 50 or (r ->> 'suprimentos')::numeric <> 10 then raise exception 'sangria/suprimento: %', r; end if;
end $$;
reset role;

-- ---------------------------------------------------------------- fechar (cego)
select from pg_temp.como(:ana);
select from pg_temp.esperar_erro(format($q$select public.fechar_caixa('%s', '{"informado": {"pix": 20}}')$q$, pg_temp.id('s1')), 'dinheiro contado');
select from pg_temp.esperar_erro(format($q$select public.fechar_caixa('%s', '{"informado": {"online": 1, "dinheiro": 1}}')$q$, pg_temp.id('s1')), 'inválida');
-- conta R$100 + R$20 + 2×R$5 = 130 (falta R$1); pix confere
insert into saida values ('fech', public.fechar_caixa(pg_temp.id('s1'), '{"contagem": {"10000": 1, "2000": 1, "500": 2}, "informado": {"pix": 20}, "observacao": "Faltou 1 real"}'));
select from pg_temp.esperar_erro(format($q$select public.fechar_caixa('%s', '{"informado": {"dinheiro": 1}}')$q$, pg_temp.id('s1')), 'já foi fechado');
select from pg_temp.esperar_erro(format($q$select public.movimentar_caixa('%s', 'suprimento', 1)$q$, pg_temp.id('s1')), 'fechado');
do $$
declare r jsonb := (select v from saida where chave = 'fech');
begin
  if r ->> 'status' <> 'fechado' or not (r ->> 've_valores')::boolean then raise exception 'fechado: %', r; end if;
  if (select (d ->> 'diferenca')::numeric from jsonb_array_elements(r -> 'diferencas') d where d ->> 'forma' = 'dinheiro') <> -1
     or (select (d ->> 'diferenca')::numeric from jsonb_array_elements(r -> 'diferencas') d where d ->> 'forma' = 'pix') <> 0 then
    raise exception 'diferenças: %', r -> 'diferencas';
  end if;
end $$;
reset role;

-- ---------------------------------------------------------------- pedido sem caixa e vincular
select from pg_temp.como(:beto);
do $$
declare p uuid; s public.status_pedido;
begin
  p := public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'balcao', 'cliente', jsonb_build_object('nome', 'C3'),
         'pagamento', 'cartao_debito', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('x'), 'quantidade', 1))));
  foreach s in array array['em_preparo', 'pronto', 'concluido']::public.status_pedido[] loop perform public.mudar_status_pedido(p, s); end loop;
  if (select caixa_sessao_id from public.pedidos where id = p) is not null then raise exception 'sem caixa aberto não deveria vincular'; end if;
  if (public.meus_caixas(pg_temp.id('loja')) ->> 'sem_caixa')::int <> 1 then raise exception 'sem_caixa'; end if;
end $$;
insert into ids values ('s2', public.abrir_caixa(pg_temp.id('caixa1'), '{"valor": 20}'));
do $$ begin
  if public.vincular_pedidos_sem_caixa(pg_temp.id('s2')) <> 1 then raise exception 'vincular'; end if;
  if (public.meus_caixas(pg_temp.id('loja')) ->> 'sem_caixa')::int <> 0 then raise exception 'sem_caixa depois de vincular'; end if;
  if (select numero from public.caixa_sessoes where id = pg_temp.id('s2')) <> 2 then raise exception 'numeração das sessões'; end if;
end $$;
reset role;

-- Desativar com caixa aberto é recusado.
select from pg_temp.como(:hugo);
select from pg_temp.esperar_erro(format($q$select public.salvar_caixa('%s', '%s', 'Caixa 1', false)$q$, pg_temp.id('loja'), pg_temp.id('caixa1')), 'Feche o caixa');
reset role;

\o
\pset tuples_only on
select 'OK: caixa e usuários de caixa';
