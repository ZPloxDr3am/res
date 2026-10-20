-- Testes do banco. Cada bloco falha com exceção se a regra não vale.
-- Usuários: Ana (dona da Loja A), Bia (funcionária da Loja A, sem "cardapio"), Caio (dono da Loja B).
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'ana@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'bia@example.com'),
  ('00000000-0000-0000-0000-0000000000c1', 'caio@example.com');

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

-- ---------------------------------------------------------------- lojas
select from pg_temp.como('00000000-0000-0000-0000-0000000000a1');
insert into ids values ('loja_a', public.criar_loja('Loja A 🍕', 'Pizzaria Teste', 'pizzaria-teste', 'Ana'));
insert into public.marcas (loja_id, nome, slug) select id, 'Burger Teste', 'burger-teste' from ids where chave = 'loja_a';
insert into ids select 'marca_pizza', id from public.marcas where slug = 'pizzaria-teste';
insert into ids select 'marca_burger', id from public.marcas where slug = 'burger-teste';
reset role;

select from pg_temp.como('00000000-0000-0000-0000-0000000000c1');
insert into ids values ('loja_b', public.criar_loja('Loja B', 'Outra Marca', 'outra-marca', 'Caio'));
reset role;

-- Bia entra na Loja A como funcionária no grupo "Funcionário" e depois perde "cardapio".
insert into public.membros (loja_id, user_id, nome, papel, grupo_acesso_id)
select l.id, '00000000-0000-0000-0000-0000000000b1', 'Bia', 'funcionario', g.id
from ids l join public.grupos_acesso g on g.loja_id = l.id and g.nome = 'Funcionário' where l.chave = 'loja_a';
update public.grupos_acesso set permissoes = array_remove(permissoes, 'cardapio')
where nome = 'Funcionário' and loja_id = (select id from ids where chave = 'loja_a');

-- D-007 / T-006: emoji preservado.
do $$ begin
  if (select nome from public.lojas where id = (select id from ids where chave = 'loja_a')) <> 'Loja A 🍕' then
    raise exception 'Emoji perdido no nome da loja';
  end if;
end $$;

-- Isolamento: Caio não vê a Loja A.
select from pg_temp.como('00000000-0000-0000-0000-0000000000c1');
do $$ begin
  if exists (select 1 from public.lojas where nome like 'Loja A%') then raise exception 'RLS: Caio enxerga a Loja A'; end if;
  if (select count(*) from public.marcas) <> 1 then raise exception 'RLS: Caio enxerga marcas de outra loja'; end if;
end $$;
reset role;

-- ---------------------------------------------------------------- setores (R-001, R-002)
select from pg_temp.como('00000000-0000-0000-0000-0000000000a1');

-- T-002: sem marcas informadas, o setor entra em todas e com os dois canais.
insert into ids select 'setor_pizzas', public.salvar_setor((select id from ids where chave = 'loja_a'), null, 'Pizzas 🍕');
do $$
declare s record;
begin
  select * into s from public.setores where id = (select id from ids where chave = 'setor_pizzas');
  if not (s.delivery and s.presencial) then raise exception 'T-002: canais deveriam nascer ligados'; end if;
  if (select count(*) from public.setor_marcas where setor_id = s.id) <> 2 then raise exception 'T-002: setor deveria estar nas 2 marcas'; end if;
  if s.nome <> 'Pizzas 🍕' then raise exception 'T-006: emoji perdido no setor'; end if;
end $$;

-- T-001: setor sem marca é recusado (pela função e pelo banco).
select from pg_temp.esperar_erro(
  $q$select public.salvar_setor((select id from ids where chave='loja_a'), null, 'Vazio', null, true, true, '{}')$q$,
  'pelo menos uma marca');
select from pg_temp.esperar_erro(
  $q$do $b$ begin
       insert into public.setores (loja_id, nome) values ((select id from ids where chave='loja_a'), 'Sem marca');
       set constraints all immediate;
     end $b$$q$,
  'pelo menos uma marca');
-- Tirar a última marca de um setor também é recusado.
select from pg_temp.esperar_erro(
  $q$do $b$ begin
       delete from public.setor_marcas where setor_id = (select id from ids where chave='setor_pizzas');
       set constraints all immediate;
     end $b$$q$,
  'pelo menos uma marca');

-- T-003 (base de dados): setor sem canais é gravável e fica marcado assim.
insert into ids select 'setor_oculto', public.salvar_setor((select id from ids where chave = 'loja_a'), null, 'Oculto', null, false, false,
  array[(select id from ids where chave = 'marca_burger')]);

-- ---------------------------------------------------------------- produtos (R-007, R-008, R-010)
-- T-007: só nome e setor; preço vazio.
insert into ids select 'prod_pizza', public.criar_produto((select id from ids where chave = 'loja_a'), 'Pizza Grande', (select id from ids where chave = 'setor_pizzas'));
do $$
declare v uuid := (select id from ids where chave = 'prod_pizza');
begin
  if (select preco from public.produtos where id = v) is not null then raise exception 'T-007: preço deveria ser vazio'; end if;
  -- T-008: nasce em todas as marcas, com todos os canais.
  if (select count(*) from public.produto_marcas where produto_id = v and ativo and delivery and presencial and totem) <> 2 then
    raise exception 'T-008: produto deveria nascer ativo nas 2 marcas e canais';
  end if;
end $$;

-- T-010: pode ficar inativo em todas as marcas.
update public.produto_marcas set ativo = false where produto_id = (select id from ids where chave = 'prod_pizza');
do $$ begin
  if exists (select 1 from public.produto_marcas where produto_id = (select id from ids where chave = 'prod_pizza') and ativo) then
    raise exception 'T-010: produto deveria poder ficar inativo em todas as marcas';
  end if;
end $$;
update public.produto_marcas set ativo = true where produto_id = (select id from ids where chave = 'prod_pizza');

-- Criar produto só numa marca.
insert into ids select 'prod_burger', public.criar_produto((select id from ids where chave = 'loja_a'), 'X-Burger', null, 25.90, null,
  array[(select id from ids where chave = 'marca_burger')]);
do $$ begin
  if (select count(*) from public.produto_marcas where produto_id = (select id from ids where chave = 'prod_burger')) <> 1 then
    raise exception 'Produto deveria estar só na marca indicada';
  end if;
end $$;

-- ---------------------------------------------------------------- grupos (R-011, R-012, R-013, R-014, R-015)
with x as (insert into public.complementos (loja_id, nome, preco) values ((select id from ids where chave = 'loja_a'), 'Calabresa', 40) returning id)
insert into ids select 'comp_calabresa', id from x;
with x as (insert into public.complementos (loja_id, nome, preco) values ((select id from ids where chave = 'loja_a'), 'Quatro Queijos', 50) returning id)
insert into ids select 'comp_4queijos', id from x;

-- T-015: grupo criado e vinculado numa operação, com opções.
insert into ids select 'grupo_sabores', public.criar_grupo_vinculado(
  (select id from ids where chave = 'prod_pizza'), 'Sabores', 'proporcional', true, 1, 2, true,
  jsonb_build_array(
    jsonb_build_object('complemento_id', (select id from ids where chave = 'comp_calabresa')),
    jsonb_build_object('complemento_id', (select id from ids where chave = 'comp_4queijos'))));
do $$
declare g uuid := (select id from ids where chave = 'grupo_sabores');
begin
  if not exists (select 1 from public.produto_grupos where grupo_id = g) then raise exception 'T-015: grupo não vinculado'; end if;
  if (select count(*) from public.opcoes where grupo_id = g) <> 2 then raise exception 'T-015: opções não criadas'; end if;
  if (select formacao from public.grupos_opcoes where id = g) <> 'proporcional' or not (select pizza from public.grupos_opcoes where id = g) then
    raise exception 'T-013/T-014: formação e pizza não gravados';
  end if;
end $$;

-- T-015 (falha no meio): opção inválida desfaz tudo, sem grupo órfão.
select from pg_temp.esperar_erro(
  $q$select public.criar_grupo_vinculado((select id from ids where chave='prod_pizza'), 'Órfão', 'soma', false, 0, 1, false, '[{"preco": -1, "nome": "x"}]'::jsonb)$q$,
  'check');
do $$ begin
  if exists (select 1 from public.grupos_opcoes where nome = 'Órfão') then raise exception 'T-015: sobrou grupo órfão'; end if;
end $$;

-- T-011: obrigatório com mínimo 0 é recusado (sem correção silenciosa).
select from pg_temp.esperar_erro(
  $q$insert into public.grupos_opcoes (loja_id, nome, obrigatorio, min_qtd, max_qtd) values ((select id from ids where chave='loja_a'), 'X', true, 0, 1)$q$,
  'grupo_obrigatorio_min');
-- T-012: mínimo acima do máximo é recusado no banco (o formulário ajusta o máximo antes).
select from pg_temp.esperar_erro(
  $q$insert into public.grupos_opcoes (loja_id, nome, min_qtd, max_qtd) values ((select id from ids where chave='loja_a'), 'Y', 3, 2)$q$,
  'grupo_max_ge_min');

-- ---------------------------------------------------------------- exclusão (R-016)
-- T-016: excluir setor deixa o produto sem setor (e na mesma loja).
delete from public.setores where id = (select id from ids where chave = 'setor_pizzas');
do $$ begin
  if (select setor_id from public.produtos where id = (select id from ids where chave = 'prod_pizza')) is not null then
    raise exception 'T-016: produto deveria ficar sem setor';
  end if;
  if (select loja_id from public.produtos where id = (select id from ids where chave = 'prod_pizza')) is null then
    raise exception 'T-016: produto perdeu a loja';
  end if;
end $$;
reset role;

-- ---------------------------------------------------------------- permissões
-- Bia (sem "cardapio") lê o cardápio, mas não altera.
select from pg_temp.como('00000000-0000-0000-0000-0000000000b1');
do $$ begin
  if (select count(*) from public.produtos) < 2 then raise exception 'Bia deveria ler os produtos da loja'; end if;
end $$;
select from pg_temp.esperar_erro(
  $q$select public.criar_produto((select id from ids where chave='loja_a'), 'Indevido')$q$,
  'row-level security');
update public.produtos set nome = 'Hackeado' where id = (select id from ids where chave = 'prod_burger');
do $$ begin
  if (select nome from public.produtos where id = (select id from ids where chave = 'prod_burger')) = 'Hackeado' then
    raise exception 'Bia alterou produto sem permissão';
  end if;
end $$;
-- Bia não vê a auditoria (sem "historico_alteracoes").
do $$ begin
  if exists (select 1 from public.auditoria) then raise exception 'Bia enxerga a auditoria'; end if;
end $$;
reset role;

-- Caio (outra loja) não consegue escrever na Loja A nem pela função.
select from pg_temp.como('00000000-0000-0000-0000-0000000000c1');
select from pg_temp.esperar_erro(
  $q$select public.criar_produto((select id from ids where chave='loja_a'), 'Invasor')$q$,
  'row-level security');
do $$ begin
  if exists (select 1 from public.produtos) then raise exception 'Caio enxerga produtos da Loja A'; end if;
end $$;
reset role;

-- ---------------------------------------------------------------- auditoria (D-004)
select from pg_temp.como('00000000-0000-0000-0000-0000000000a1');
update public.produtos set preco = 27.50 where id = (select id from ids where chave = 'prod_burger');
update public.produtos set preco = 27.50 where id = (select id from ids where chave = 'prod_burger');  -- sem mudança: não registra
do $$
declare n int; a jsonb;
begin
  select count(*), max(alteracoes::text)::jsonb into n, a from public.auditoria
  where tabela = 'produtos' and operacao = 'UPDATE' and registro_id = (select id from ids where chave = 'prod_burger');
  if n <> 1 then raise exception 'Auditoria: esperava 1 alteração registrada, achou %', n; end if;
  if (a -> 'preco' ->> 'antes')::numeric <> 25.90 or (a -> 'preco' ->> 'depois')::numeric <> 27.50 then
    raise exception 'Auditoria: antes/depois errados: %', a;
  end if;
  if (select usuario_id from public.auditoria where tabela = 'produtos' and operacao = 'UPDATE' limit 1) <> '00000000-0000-0000-0000-0000000000a1' then
    raise exception 'Auditoria: usuário errado';
  end if;
end $$;
-- Cliente não grava na auditoria.
select from pg_temp.esperar_erro(
  $q$insert into public.auditoria (loja_id, tabela, operacao, alteracoes) values ((select id from ids where chave='loja_a'), 'x', 'INSERT', '{}')$q$,
  'row-level security');
reset role;

-- ---------------------------------------------------------------- dono
-- A loja não fica sem dono.
select from pg_temp.como('00000000-0000-0000-0000-0000000000a1');
select from pg_temp.esperar_erro(
  $q$update public.membros set papel = 'gerente' where user_id = '00000000-0000-0000-0000-0000000000a1'$q$,
  'dono');
reset role;

-- ---------------------------------------------------------------- permissões inválidas
select from pg_temp.esperar_erro(
  $q$insert into public.grupos_acesso (loja_id, nome, permissoes) values ((select id from ids where chave='loja_a'), 'Z', array['inexistente'])$q$,
  'desconhecido');

-- ---------------------------------------------------------------- rodízio
select from pg_temp.esperar_erro(
  $q$insert into public.tabelas_preco (loja_id, nome, comportamento) values ((select id from ids where chave='loja_a'), 'R', 'rodizio')$q$,
  'rodizio_regras');

\o
\pset tuples_only on
select 'OK: todos os testes do banco passaram';
