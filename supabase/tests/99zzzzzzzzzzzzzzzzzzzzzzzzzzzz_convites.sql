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
grant all on r to authenticated, anon, service_role;
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
-- Painel da empresa (D-083): equipe se administra; números só para a equipe
\o /dev/null
select from pg_temp.como('00000000-0000-0000-0000-0000000005a1');
select public.equipe_res_adicionar('NOVO2@example.com');
insert into r values ('equipe', to_jsonb((select count(*) from public.equipe_res_listar())));
select from pg_temp.esperar_erro($q$select public.equipe_res_adicionar('ninguem@example.com')$q$, 'Ninguém entrou');
select from pg_temp.esperar_erro($q$select public.equipe_res_remover('00000000-0000-0000-0000-0000000005a1')$q$, 'a si mesmo');
insert into r values ('num', public.numeros_plataforma());
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a3');
select from pg_temp.esperar_erro($q$select public.numeros_plataforma()$q$, 'Só o time do RES');
reset role;
\o
select case when pg_temp.v('equipe') = '2' and (pg_temp.v('num') ->> 'cadastros')::int >= 1 and (pg_temp.v('num') ->> 'convites_usados_30d')::int >= 1
            then 'ok painel da empresa: equipe pelo e-mail e números da plataforma' else 'FALHOU painel empresa ' || coalesce(pg_temp.v('num')::text, '-') end;
-- Registro de erros (D-084): qualquer um registra, repetido soma, só a equipe lê
\o /dev/null
set role anon;
select public.registrar_erro('{"mensagem":"Falhou X","caminho":"/pedidos/123","origem":"navegador"}');
select public.registrar_erro('{"mensagem":"Falhou X","caminho":"/pedidos/456","origem":"navegador"}');
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a3');
select from pg_temp.esperar_erro($q$select public.erros_recentes(7)$q$, 'Só o time do RES');
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a1');
insert into r values ('erros', public.erros_recentes(7));
insert into r values ('e24', to_jsonb(public.erros_24h()));
reset role;
\o
select case when jsonb_array_length(pg_temp.v('erros')) = 1 and (pg_temp.v('erros') -> 0 ->> 'vezes')::int = 2 and pg_temp.v('e24') = '2'
            then 'ok erros: mesmo erro agrupado, só a equipe lê' else 'FALHOU erros ' || coalesce(pg_temp.v('erros')::text, '-') end;
-- Cobrança (D-085): brecha fechada, fatura com preço × lojas, quitar estende 1 mês
\o /dev/null
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
select from pg_temp.esperar_erro(format($q$update public.contas set pago_ate = now() + interval '5 years' where id = '%s'$q$, pg_temp.v('conta') #>> '{}'), 'só pela equipe RES');
select from pg_temp.esperar_erro(format($q$update public.contas set limite_lojas = 50 where id = '%s'$q$, pg_temp.v('conta') #>> '{}'), 'só pela equipe RES');
insert into r values ('fat', to_jsonb(public.gerar_minha_fatura((pg_temp.v('loja') #>> '{}')::uuid)));
insert into r values ('fat2', to_jsonb(public.gerar_minha_fatura((pg_temp.v('loja') #>> '{}')::uuid)));
insert into r values ('ass', public.minha_assinatura((pg_temp.v('loja') #>> '{}')::uuid));
reset role;
insert into r values ('pago_antes', to_jsonb((select pago_ate from public.contas where id = (pg_temp.v('conta') #>> '{}')::uuid)));
set role service_role;
insert into r values ('menor', to_jsonb(public.fatura_quitar_mp((pg_temp.v('fat') #>> '{}')::uuid, 123, 10)));
insert into r values ('quit', to_jsonb(public.fatura_quitar_mp((pg_temp.v('fat') #>> '{}')::uuid, 123, 149.90)));
insert into r values ('quit2', to_jsonb(public.fatura_quitar_mp((pg_temp.v('fat') #>> '{}')::uuid, 123, 149.90)));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a1');
insert into r values ('cob', public.cobranca_plataforma());
reset role;
\o
select case when pg_temp.v('fat') = pg_temp.v('fat2')
             and (pg_temp.v('ass') -> 'faturas' -> 0 ->> 'valor')::numeric = 149.90 and (pg_temp.v('ass') -> 'faturas' -> 0 ->> 'lojas')::int = 1
             and pg_temp.v('menor') = '"valor_menor"' and pg_temp.v('quit') = '"paga"' and pg_temp.v('quit2') = '"ja_paga"'
             and (select pago_ate from public.contas where id = (pg_temp.v('conta') #>> '{}')::uuid) = (pg_temp.v('pago_antes') #>> '{}')::timestamptz + interval '1 month'
             and (pg_temp.v('cob') ->> 'mrr')::numeric = 149.90
            then 'ok cobrança: fatura única por vez, valor por loja, Pix confere valor e estende 1 mês, titular não mexe no prazo'
            else 'FALHOU cobrança ' || coalesce(pg_temp.v('ass')::text, '-') end;
-- Planos e módulos (D-085): pago = só o plano; adicional soma; equipe desliga; dono não troca plano na tabela
\o /dev/null
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
insert into r values ('m_pago', public.meus_modulos((pg_temp.v('loja') #>> '{}')::uuid));
select from pg_temp.esperar_erro(format($q$update public.contas set plano_res = 'completo' where id = '%s'$q$, pg_temp.v('conta') #>> '{}'), 'só pela equipe RES');
select public.contratar_adicional((pg_temp.v('loja') #>> '{}')::uuid, 'estoque', true);
insert into r values ('m_add', public.meus_modulos((pg_temp.v('loja') #>> '{}')::uuid));
select public.escolher_plano((pg_temp.v('loja') #>> '{}')::uuid, 'salao');
insert into r values ('ass2', public.minha_assinatura((pg_temp.v('loja') #>> '{}')::uuid));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a1');
select public.ajustar_conta_plano((pg_temp.v('conta') #>> '{}')::uuid, null, 'estoque', 'desligado');
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
insert into r values ('m_off', public.meus_modulos((pg_temp.v('loja') #>> '{}')::uuid));
select from pg_temp.esperar_erro(format($q$select public.contratar_adicional('%s', 'estoque', true)$q$, pg_temp.v('loja') #>> '{}'), 'time do RES');
reset role;
\o
select case when pg_temp.v('m_pago') -> 'modulos' ? 'entregas' and not (pg_temp.v('m_pago') -> 'modulos' ? 'estoque') and pg_temp.v('m_pago') ->> 'liberado_por' is null
             and pg_temp.v('m_add') -> 'modulos' ? 'estoque'
             and (pg_temp.v('ass2') -> 'valor' ->> 'total')::numeric = 179.80 and not (pg_temp.v('ass2') -> 'modulos_ativos' ? 'entregas')
             and not (pg_temp.v('m_off') -> 'modulos' ? 'estoque')
            then 'ok planos: módulos pelo plano, adicional soma na fatura, equipe desliga, dono não mexe direto'
            else 'FALHOU planos ' || coalesce(pg_temp.v('m_pago')::text, '-') || coalesce(pg_temp.v('ass2') -> 'valor', '"-"'::jsonb)::text end;
-- CPF restrito (D-088): equipe não lê; titular lê pela função; toda outra coluna da loja segue legível
\o /dev/null
update public.lojas set cpf = '52998224725', cnpj = null where id = (pg_temp.v('loja') #>> '{}')::uuid;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000005a4', 'caixa2@example.com');
insert into public.membros (loja_id, user_id, papel, nome) values ((pg_temp.v('loja') #>> '{}')::uuid, '00000000-0000-0000-0000-0000000005a4', 'funcionario', 'Caixa');
select from pg_temp.como('00000000-0000-0000-0000-0000000005a4');
select from pg_temp.esperar_erro(format($q$select cpf from public.lojas where id = '%s'$q$, pg_temp.v('loja') #>> '{}'), 'permission denied');
insert into r values ('cpf_caixa', to_jsonb(public.cpf_da_loja((pg_temp.v('loja') #>> '{}')::uuid)));
insert into r values ('tem_cpf', to_jsonb(public.loja_tem_cpf((pg_temp.v('loja') #>> '{}')::uuid)));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
insert into r values ('cpf_dono', to_jsonb(public.cpf_da_loja((pg_temp.v('loja') #>> '{}')::uuid)));
reset role;
\o
select case when coalesce(pg_temp.v('cpf_caixa'), 'null'::jsonb) = 'null'::jsonb and pg_temp.v('cpf_dono') = '"52998224725"' and pg_temp.v('tem_cpf') = 'true'
             and not exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = 'lojas' and c.column_name <> 'cpf'
                              and not has_column_privilege('authenticated', 'public.lojas', c.column_name, 'select'))
            then 'ok cpf: só o dono lê; demais colunas da loja liberadas (coluna nova pede private.liberar_colunas_lojas())'
            else 'FALHOU cpf ' || coalesce(pg_temp.v('cpf_caixa')::text, '-') || ' ' || coalesce(pg_temp.v('cpf_dono')::text, '-') end;
-- Formato novo (D-090): aparelhos inclusos/extras e plano anual com desconto (conta já paga, no plano Salão + estoque)
\o /dev/null
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000005a5', 'moto2@example.com'), ('00000000-0000-0000-0000-0000000005a6', 'moto3@example.com');
select from pg_temp.esperar_erro(format($q$insert into public.membros (loja_id, user_id, papel, nome) values ('%s', '00000000-0000-0000-0000-0000000005a5', 'entregador', 'Moto')$q$, pg_temp.v('loja') #>> '{}'), 'App Entregador');
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
select public.contratar_aparelhos((pg_temp.v('loja') #>> '{}')::uuid, 'app_entregador', 1);
reset role;
insert into public.membros (loja_id, user_id, papel, nome) values ((pg_temp.v('loja') #>> '{}')::uuid, '00000000-0000-0000-0000-0000000005a5', 'entregador', 'Moto');
select from pg_temp.esperar_erro(format($q$insert into public.membros (loja_id, user_id, papel, nome) values ('%s', '00000000-0000-0000-0000-0000000005a6', 'entregador', 'Moto 2')$q$, pg_temp.v('loja') #>> '{}'), 'permite 1');
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
select from pg_temp.esperar_erro(format($q$select public.contratar_aparelhos('%s', 'app_entregador', 0)$q$, pg_temp.v('loja') #>> '{}'), 'em uso');
select public.definir_ciclo((pg_temp.v('loja') #>> '{}')::uuid, 'anual');
insert into r values ('anual', public.minha_assinatura((pg_temp.v('loja') #>> '{}')::uuid) -> 'valor');
reset role;
\o
select case when (pg_temp.v('anual') ->> 'total')::numeric = round((149.90 + 19.90) * 0.8, 2)
             and (pg_temp.v('anual') ->> 'total_periodo')::numeric = round(round((149.90 + 19.90) * 0.8, 2) * 12, 2)
            then 'ok formato novo: aparelho além do plano pede extra, não reduz abaixo do uso, anual com 20%'
            else 'FALHOU formato novo ' || coalesce(pg_temp.v('anual')::text, '-') end;
-- LGPD (D-092): só dono/gerente exporta e apaga; apagar pede os 4 últimos dígitos e some com o cadastro
\o /dev/null
insert into public.clientes (grupo, loja_id, nome, telefone) values (private.grupo_da_loja((pg_temp.v('loja') #>> '{}')::uuid), (pg_temp.v('loja') #>> '{}')::uuid, 'Maria LGPD', '47999991234');
insert into r values ('cli', to_jsonb((select id from public.clientes where telefone = '47999991234')));
select from pg_temp.como('00000000-0000-0000-0000-0000000005a4');
select from pg_temp.esperar_erro(format($q$select public.dados_do_cliente('%s', '%s')$q$, pg_temp.v('loja') #>> '{}', pg_temp.v('cli') #>> '{}'), 'dono ou o gerente');
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
insert into r values ('exp', public.dados_do_cliente((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('cli') #>> '{}')::uuid));
select from pg_temp.esperar_erro(format($q$select public.apagar_dados_cliente('%s', '%s', '9999')$q$, pg_temp.v('loja') #>> '{}', pg_temp.v('cli') #>> '{}'), '4 últimos');
select public.apagar_dados_cliente((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('cli') #>> '{}')::uuid, '1234');
reset role;
\o
select case when pg_temp.v('exp') -> 'cliente' ->> 'nome' = 'Maria LGPD'
             and not exists (select 1 from public.clientes where telefone = '47999991234')
             and (select count(*) from public.lgpd_registros where acao in ('exportar', 'apagar')) = 2
            then 'ok lgpd: exportar e apagar dados do cliente só pelo dono/gerente, com confirmação e registro'
            else 'FALHOU lgpd ' || coalesce(pg_temp.v('exp')::text, '-') end;
\o /dev/null
select private.lgpd_prazo_guarda();
\o
