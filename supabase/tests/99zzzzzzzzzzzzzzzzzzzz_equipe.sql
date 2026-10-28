-- Testes de 0053: funções da equipe e permissões do Caixa / Atendente.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000003b1', 'eq@example.com'),
  ('00000000-0000-0000-0000-0000000003b2', 'eq2@example.com'),
  ('00000000-0000-0000-0000-0000000003b3', 'eq3@example.com'), ('00000000-0000-0000-0000-0000000003b4', 'eq4@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000003b1');
insert into ids values ('loja', public.criar_loja('Loja E', 'Pizza E', 'pizza-eq', 'Dona Rita'));
reset role;
insert into public.membros (loja_id, user_id, nome, papel) values (pg_temp.id('loja'), '00000000-0000-0000-0000-0000000003b2', 'Gil', 'gerente');
insert into public.membros (loja_id, user_id, nome, papel, grupo_acesso_id)
select pg_temp.id('loja'), '00000000-0000-0000-0000-0000000003b3', 'Caio', 'funcionario', g.id from public.grupos_acesso g where g.loja_id = pg_temp.id('loja') and g.nome = 'Funcionário';
insert into public.membros (loja_id, user_id, nome, papel) values (pg_temp.id('loja'), '00000000-0000-0000-0000-0000000003b4', 'Moto', 'entregador');
insert into ids select 'gerente', id from public.membros where user_id = '00000000-0000-0000-0000-0000000003b2';
insert into ids select 'caixa', id from public.membros where user_id = '00000000-0000-0000-0000-0000000003b3';
insert into ids select 'moto', id from public.membros where user_id = '00000000-0000-0000-0000-0000000003b4';
insert into ids select 'dono', id from public.membros where user_id = '00000000-0000-0000-0000-0000000003b1';

-- gerente: não promove a gerente, não mexe em si nem no dono; muda caixa ↔ motoboy
select from pg_temp.como('00000000-0000-0000-0000-0000000003b2');
select from pg_temp.esperar_erro(format($q$select public.alterar_funcao_membro('%s', 'gerente')$q$, pg_temp.id('caixa')), 'Só o dono pode');
select from pg_temp.esperar_erro(format($q$select public.alterar_funcao_membro('%s', 'funcionario')$q$, pg_temp.id('gerente')), 'própria');
select from pg_temp.esperar_erro(format($q$select public.alterar_funcao_membro('%s', 'gerente')$q$, pg_temp.id('dono')), 'dono não muda');
select from pg_temp.esperar_erro(format($q$select public.salvar_permissoes_equipe('%s', array['equipe'])$q$, pg_temp.id('loja')), 'não pode ser dada');
select from public.alterar_funcao_membro(pg_temp.id('caixa'), 'entregador');
select from public.alterar_funcao_membro(pg_temp.id('caixa'), 'funcionario');
-- caixa: nada
select from pg_temp.como('00000000-0000-0000-0000-0000000003b3');
select from pg_temp.esperar_erro(format($q$select public.alterar_funcao_membro('%s', 'funcionario')$q$, pg_temp.id('moto')), 'Só o dono ou o gerente');
select from pg_temp.esperar_erro(format($q$select public.salvar_permissoes_equipe('%s', array['caixa'])$q$, pg_temp.id('loja')), 'Só o dono ou o gerente');
-- dono: promove o motoboy a gerente e ajusta o Caixa / Atendente
select from pg_temp.como('00000000-0000-0000-0000-0000000003b1');
select from public.alterar_funcao_membro(pg_temp.id('moto'), 'gerente');
insert into saida values ('perm', to_jsonb(public.salvar_permissoes_equipe(pg_temp.id('loja'), array['pedidos_delivery', 'caixa'])));
reset role;

\o
select case when (select papel = 'funcionario' and grupo_acesso_id is not null from public.membros where id = pg_temp.id('caixa')) then 'ok gerente muda caixa ↔ motoboy (volta ao grupo)' else 'FALHOU troca' end;
select case when (select papel = 'gerente' from public.membros where id = pg_temp.id('moto')) then 'ok só o dono promove a gerente' else 'FALHOU promoção' end;
select case when pg_temp.v('perm') = '["caixa", "mesas", "pdv", "pedidos_delivery"]'::jsonb then 'ok permissões do Caixa / Atendente (mantém as que a tela não mostra)' else 'FALHOU perm ' || pg_temp.v('perm')::text end;
