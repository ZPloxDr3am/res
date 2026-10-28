-- Testes de 0052: Gestão Empresarial (custos, funcionários, faltas, advertências).
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000003a1', 'ges@example.com'),
  ('00000000-0000-0000-0000-0000000003a2', 'ges2@example.com'),
  ('00000000-0000-0000-0000-0000000003a3', 'ges3@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000003a1');
insert into ids values ('loja', public.criar_loja('Loja G', 'Pizza G', 'pizza-ges', 'Rui'));
reset role;
-- funcionário da loja (não é gestor) e alguém de fora
insert into public.membros (loja_id, user_id, nome, papel, grupo_acesso_id)
select pg_temp.id('loja'), '00000000-0000-0000-0000-0000000003a2', 'Eli', 'funcionario', g.id
  from public.grupos_acesso g where g.loja_id = pg_temp.id('loja') and g.nome = 'Funcionário';

select from pg_temp.como('00000000-0000-0000-0000-0000000003a1');
select from public.preparar_gestao(pg_temp.id('loja'));
select from public.preparar_gestao(pg_temp.id('loja'));   -- de novo: não duplica o modelo
with x as (insert into public.funcionarios (loja_id, nome, cpf, cargo, admissao) values (pg_temp.id('loja'), 'Maria Souza', '12345678909', 'Pizzaiola', '2026-01-10') returning id)
insert into ids select 'func', id from x;
insert into public.funcionario_registros (loja_id, funcionario_id, tipo, data, justificada, motivo)
values (pg_temp.id('loja'), pg_temp.id('func'), 'falta', '2026-10-20', false, 'Não compareceu');
insert into public.funcionario_registros (loja_id, funcionario_id, tipo, data, motivo, descricao)
values (pg_temp.id('loja'), pg_temp.id('func'), 'advertencia', '2026-10-21', 'Atraso', 'Chegou 40 minutos atrasada sem avisar.');
insert into public.funcionario_registros (loja_id, funcionario_id, tipo, data, motivo)
values (pg_temp.id('loja'), pg_temp.id('func'), 'advertencia', '2026-10-25', 'Uso de celular');
insert into public.custos (loja_id, tipo, nome, forma, valor) values (pg_temp.id('loja'), 'fixo', 'Câmara fria (aluguel)', 'valor', 350);
select from pg_temp.esperar_erro(format($q$insert into public.custos (loja_id, tipo, nome, forma, valor) values ('%s', 'fixo', 'X', 'percentual', 5)$q$, pg_temp.id('loja')), 'check');
select from pg_temp.esperar_erro(format($q$insert into public.custos (loja_id, tipo, nome, forma, valor) values ('%s', 'variavel', 'X', 'percentual', 150)$q$, pg_temp.id('loja')), 'check');
select from pg_temp.esperar_erro(format($q$insert into public.funcionarios (loja_id, nome, cpf) values ('%s', 'Ana', '123')$q$, pg_temp.id('loja')), 'check');
insert into saida select 'n_custos', to_jsonb(count(*)) from public.custos where loja_id = pg_temp.id('loja');
delete from public.funcionario_registros where loja_id = pg_temp.id('loja') and tipo = 'advertencia' and numero = 2;
insert into public.funcionario_registros (loja_id, funcionario_id, tipo, data, motivo)
values (pg_temp.id('loja'), pg_temp.id('func'), 'advertencia', '2026-10-26', 'Atraso');
insert into saida select 'adv', jsonb_agg(numero order by numero) from public.funcionario_registros where loja_id = pg_temp.id('loja') and tipo = 'advertencia';

-- funcionário comum não vê nem grava nada (CPF é dado pessoal)
select from pg_temp.como('00000000-0000-0000-0000-0000000003a2');
insert into saida select 'func_ve', to_jsonb((select count(*) from public.funcionarios) + (select count(*) from public.custos) + (select count(*) from public.funcionario_registros) + (select count(*) from public.gestao_empresa));
select from pg_temp.esperar_erro(format($q$insert into public.custos (loja_id, tipo, nome) values ('%s', 'fixo', 'X')$q$, pg_temp.id('loja')), 'row-level security');
select from pg_temp.esperar_erro(format($q$select public.preparar_gestao('%s')$q$, pg_temp.id('loja')), 'Só o dono');
-- de fora também não
select from pg_temp.como('00000000-0000-0000-0000-0000000003a3');
insert into saida select 'fora_ve', to_jsonb((select count(*) from public.funcionarios));
reset role;

\o
select case when (pg_temp.v('n_custos'))::int = 26 then 'ok modelo de custos (25 linhas) + 1 do dono, sem duplicar' else 'FALHOU custos ' || pg_temp.v('n_custos')::text end;
select case when pg_temp.v('adv') = '[1, 3]'::jsonb then 'ok advertências numeradas (número excluído não volta)' else 'FALHOU numeração ' || pg_temp.v('adv')::text end;
select case when (pg_temp.v('func_ve'))::int = 0 and (pg_temp.v('fora_ve'))::int = 0 then 'ok só dono/gerente vê' else 'FALHOU privacidade' end;
select case when not exists (select 1 from public.auditoria where tabela in ('funcionarios', 'funcionario_registros')) then 'ok CPF fora do histórico' else 'FALHOU auditoria' end;
select case when (select cnpj is null and loja_id is not null from public.gestao_empresa where loja_id = pg_temp.id('loja')) then 'ok dados da empresa criados' else 'FALHOU empresa' end;
