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
-- estes testes são do cadastro em si: modo aberto (o convite é testado em 99…_convites)
insert into private.config_plataforma (chave, valor) values ('cadastro_modo', 'aberto') on conflict (chave) do update set valor = 'aberto';
create temp table r (chave text primary key, v jsonb);
grant all on r to authenticated, anon;
create or replace function pg_temp.v(p text) returns jsonb language sql as $$ select v from r where chave = p $$;

set role anon;
insert into r values ('livre1', to_jsonb(public.slug_disponivel('pizzaria-do-ze')));
insert into r values ('invalido', to_jsonb(public.slug_disponivel('-x')));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000004a1');
select from pg_temp.esperar_erro($q$select public.criar_loja_cadastro('{"restaurante":"Pizzaria do Zé","slug":"pizzaria-do-ze","nome":"Zé","whatsapp":"(47) 99999-0000","empresa":{"documento":"19.131.243/0001-97","razao_social":"Pizzaria do Ze Ltda","nome_fantasia":"Pizzaria do Zé","telefone":"(47) 3387-1234","cep":"89107-000","logradouro":"Rua XV de Novembro","numero":"100","bairro":"Centro","cidade":"Pomerode","uf":"SC","lat":"-26.74","lng":"-49.17"}}')$q$, 'aceitar os Termos');
select from pg_temp.esperar_erro($q$select public.criar_loja_cadastro('{"restaurante":"Pizzaria do Zé","slug":"pizzaria-do-ze","nome":"Zé","whatsapp":"123","aceite_versao":"2026-11-07","empresa":{"documento":"19.131.243/0001-97","razao_social":"Pizzaria do Ze Ltda","nome_fantasia":"Pizzaria do Zé","telefone":"(47) 3387-1234","cep":"89107-000","logradouro":"Rua XV de Novembro","numero":"100","bairro":"Centro","cidade":"Pomerode","uf":"SC","lat":"-26.74","lng":"-49.17"}}')$q$, 'WhatsApp');
select from pg_temp.esperar_erro($q$select public.criar_loja_cadastro('{"restaurante":"Pizzaria do Zé","slug":"pizzaria-do-ze","nome":"Zé","whatsapp":"47999990000","aceite_versao":"2026-11-07","empresa":{"documento":"19131243000198","razao_social":"X","telefone":"4733871234","cep":"89107000","logradouro":"Rua A","bairro":"Centro","cidade":"Pomerode","uf":"SC"}}')$q$, 'CNPJ inválido');
select from pg_temp.esperar_erro($q$select public.criar_loja_cadastro('{"restaurante":"Pizzaria do Zé","slug":"pizzaria-do-ze","nome":"Zé","whatsapp":"47999990000","aceite_versao":"2026-11-07","empresa":{"documento":"19131243000197","razao_social":"X","telefone":"4733871234","cep":"89107000","logradouro":"","bairro":"Centro","cidade":"Pomerode","uf":"SC"}}')$q$, 'Endereço incompleto');
insert into r values ('loja', to_jsonb(public.criar_loja_cadastro('{"restaurante":"Pizzaria do Zé","slug":"pizzaria-do-ze","nome":"Zé","whatsapp":"(47) 99999-0000","tipo":"pizzaria","aceite_versao":"2026-11-07","comercial":{"lojas":"2-3","sistema":"BeeFood"},"empresa":{"documento":"19.131.243/0001-97","razao_social":"Pizzaria do Ze Ltda","nome_fantasia":"Pizzaria do Zé","telefone":"(47) 3387-1234","cep":"89107-000","logradouro":"Rua XV de Novembro","numero":"100","bairro":"Centro","cidade":"Pomerode","uf":"SC","lat":"-26.74","lng":"-49.17"}}')));
select from pg_temp.esperar_erro($q$select public.criar_loja_cadastro('{"restaurante":"Outra","slug":"outra-ze","nome":"Zé","whatsapp":"47999990000","aceite_versao":"2026-11-07","empresa":{"documento":"19.131.243/0001-97","razao_social":"Pizzaria do Ze Ltda","nome_fantasia":"Pizzaria do Zé","telefone":"(47) 3387-1234","cep":"89107-000","logradouro":"Rua XV de Novembro","numero":"100","bairro":"Centro","cidade":"Pomerode","uf":"SC","lat":"-26.74","lng":"-49.17"}}')$q$, 'já tem uma loja');
insert into r values ('passos0', public.primeiros_passos((pg_temp.v('loja') #>> '{}')::uuid, 'Exemplo: troque nome, foto, descrição e preço.'));
insert into r values ('n', to_jsonb(public.criar_cardapio_exemplo((pg_temp.v('loja') #>> '{}')::uuid,
  '{"descricao":"Exemplo: troque nome, foto, descrição e preço.","categorias":[{"categoria":"Pizzas","produtos":[{"nome":"Pizza A","preco":50},{"nome":"Pizza B","preco":55}]},{"categoria":"Bebidas","produtos":[{"nome":"Refri","preco":6.5}]}]}')));
select from pg_temp.esperar_erro(format($q$select public.criar_cardapio_exemplo('%s', '{"categorias":[]}')$q$, pg_temp.v('loja') #>> '{}'), 'loja sem produtos');
update public.produtos set descricao = 'A melhor' where loja_id = (pg_temp.v('loja') #>> '{}')::uuid and nome = 'Pizza A';
insert into r values ('passos1', public.primeiros_passos((pg_temp.v('loja') #>> '{}')::uuid, 'Exemplo: troque nome, foto, descrição e preço.'));
select from pg_temp.como('00000000-0000-0000-0000-0000000004a2');
select from pg_temp.esperar_erro(format($q$select public.primeiros_passos('%s', 'x')$q$, pg_temp.v('loja') #>> '{}'), 'não encontrada');
-- outra pessoa com o mesmo CNPJ não abre outro teste
select from pg_temp.esperar_erro($q$select public.criar_loja_cadastro('{"restaurante":"Copia","slug":"copia-ze","nome":"Outro","whatsapp":"47999990001","aceite_versao":"2026-11-07","empresa":{"documento":"19.131.243/0001-97","razao_social":"Pizzaria do Ze Ltda","nome_fantasia":"Pizzaria do Zé","telefone":"(47) 3387-1234","cep":"89107-000","logradouro":"Rua XV de Novembro","numero":"100","bairro":"Centro","cidade":"Pomerode","uf":"SC","lat":"-26.74","lng":"-49.17"}}')$q$, 'CNPJ já tem conta');
reset role;
set role anon;
insert into r values ('livre2', to_jsonb(public.slug_disponivel('Pizzaria-do-ze')));
reset role;
\o
select case when pg_temp.v('livre1') = 'true' and pg_temp.v('invalido') = 'false' and pg_temp.v('livre2') = 'false'
            then 'ok endereço do cardápio: livre, inválido e já usado' else 'FALHOU slug' end;
select case when (select l.cidade = 'Pomerode' and l.tipo_restaurante = 'pizzaria' and c.origem = 'cadastro' and c.aceite_termos_versao = '2026-11-07' and c.limite_lojas = 1
                         and l.cnpj = '19131243000197' and l.razao_social = 'Pizzaria do Ze Ltda' and l.nome = 'Pizzaria do Zé' and l.cep = '89107000' and l.uf = 'SC'
                         and l.endereco = 'Rua XV de Novembro, 100 - Centro' and l.telefone = '554733871234' and l.lat = -26.74
                         and c.responsavel_telefone = '5547999990000' and c.info_comercial ->> 'sistema' = 'BeeFood' and c.nome = 'Pizzaria do Ze Ltda' 
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
-- Dados da empresa (D-077): trocar CPF por CNPJ, outro cliente não usa o mesmo documento
select from pg_temp.como('00000000-0000-0000-0000-0000000004a1');
\o /dev/null
select public.salvar_dados_empresa((pg_temp.v('loja') #>> '{}')::uuid, '{"documento":"529.982.247-25","telefone":"(47) 99999-1111","cep":"89107000","logradouro":"Rua Nova","numero":"5","bairro":"Testo","cidade":"Pomerode","uf":"SC"}');
select from pg_temp.esperar_erro(format($q$select public.salvar_dados_empresa('%s', '{"documento":"11222333000181"}')$q$, pg_temp.v('loja') #>> '{}'), 'razão social');
\o
reset role;
select case when (select cpf = '52998224725' and cnpj is null and razao_social is null and endereco = 'Rua Nova, 5 - Testo' and telefone = '5547999991111' from public.lojas where id = (pg_temp.v('loja') #>> '{}')::uuid)
            then 'ok dados da empresa: troca de documento e endereço' else 'FALHOU dados da empresa' end;
