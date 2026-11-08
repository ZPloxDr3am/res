-- Testes do cadastro sozinho (D-076).
\set ON_ERROR_STOP on
\o /dev/null
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000004a1', 'novo@example.com'), ('00000000-0000-0000-0000-0000000004a2', 'outro@example.com');
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

set role anon;
insert into r values ('livre1', to_jsonb(public.slug_disponivel('pizzaria-do-ze')));
insert into r values ('invalido', to_jsonb(public.slug_disponivel('-x')));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000004a1');
select from pg_temp.esperar_erro($q$select public.criar_loja_cadastro('{"restaurante":"Pizzaria do Zé","slug":"pizzaria-do-ze","nome":"Zé","cidade":"Pomerode","whatsapp":"(47) 99999-0000"}')$q$, 'aceitar os Termos');
select from pg_temp.esperar_erro($q$select public.criar_loja_cadastro('{"restaurante":"Pizzaria do Zé","slug":"pizzaria-do-ze","nome":"Zé","cidade":"Pomerode","whatsapp":"123","aceite_versao":"2026-11-07"}')$q$, 'WhatsApp');
insert into r values ('loja', to_jsonb(public.criar_loja_cadastro('{"restaurante":"Pizzaria do Zé","slug":"pizzaria-do-ze","nome":"Zé","cidade":"Pomerode","whatsapp":"(47) 99999-0000","tipo":"pizzaria","aceite_versao":"2026-11-07"}')));
select from pg_temp.esperar_erro($q$select public.criar_loja_cadastro('{"restaurante":"Outra","slug":"outra-ze","nome":"Zé","cidade":"Pomerode","whatsapp":"47999990000","aceite_versao":"2026-11-07"}')$q$, 'já tem uma loja');
insert into r values ('passos0', public.primeiros_passos((pg_temp.v('loja') #>> '{}')::uuid, 'Exemplo: troque nome, foto, descrição e preço.'));
insert into r values ('n', to_jsonb(public.criar_cardapio_exemplo((pg_temp.v('loja') #>> '{}')::uuid,
  '{"descricao":"Exemplo: troque nome, foto, descrição e preço.","categorias":[{"categoria":"Pizzas","produtos":[{"nome":"Pizza A","preco":50},{"nome":"Pizza B","preco":55}]},{"categoria":"Bebidas","produtos":[{"nome":"Refri","preco":6.5}]}]}')));
select from pg_temp.esperar_erro(format($q$select public.criar_cardapio_exemplo('%s', '{"categorias":[]}')$q$, pg_temp.v('loja') #>> '{}'), 'loja sem produtos');
update public.produtos set descricao = 'A melhor' where loja_id = (pg_temp.v('loja') #>> '{}')::uuid and nome = 'Pizza A';
insert into r values ('passos1', public.primeiros_passos((pg_temp.v('loja') #>> '{}')::uuid, 'Exemplo: troque nome, foto, descrição e preço.'));
select from pg_temp.como('00000000-0000-0000-0000-0000000004a2');
select from pg_temp.esperar_erro(format($q$select public.primeiros_passos('%s', 'x')$q$, pg_temp.v('loja') #>> '{}'), 'não encontrada');
reset role;
set role anon;
insert into r values ('livre2', to_jsonb(public.slug_disponivel('Pizzaria-do-ze')));
reset role;
\o
select case when pg_temp.v('livre1') = 'true' and pg_temp.v('invalido') = 'false' and pg_temp.v('livre2') = 'false'
            then 'ok endereço do cardápio: livre, inválido e já usado' else 'FALHOU slug' end;
select case when (select l.cidade = 'Pomerode' and l.tipo_restaurante = 'pizzaria' and c.origem = 'cadastro' and c.aceite_termos_versao = '2026-11-07' and c.limite_lojas = 1
                         and m.whatsapp = '5547999990000' and m.status_cardapio = 'fechado' and m.slug = 'pizzaria-do-ze'
                    from public.lojas l join public.contas c on c.id = l.conta_id join public.marcas m on m.loja_id = l.id
                   where l.id = (pg_temp.v('loja') #>> '{}')::uuid)
             and (select papel from public.membros where loja_id = (pg_temp.v('loja') #>> '{}')::uuid) = 'dono'
            then 'ok cadastro cria conta, loja e cardápio fechado, com aceite dos termos' else 'FALHOU cadastro' end;
select case when pg_temp.v('n') = '3'
             and (pg_temp.v('passos0') ->> 'produtos')::int = 0 and (pg_temp.v('passos0') ->> 'cidade')::boolean and (pg_temp.v('passos0') ->> 'whatsapp')::boolean
             and not (pg_temp.v('passos0') ->> 'cardapio_aberto')::boolean
             and (pg_temp.v('passos1') ->> 'produtos')::int = 3 and (pg_temp.v('passos1') ->> 'produtos_exemplo')::int = 2
            then 'ok cardápio de exemplo e primeiros passos' else 'FALHOU passos ' || pg_temp.v('passos1')::text end;
