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
-- Turbo-Vendas (D-096): módulo fora do plano barra; automação "sumido" gera fila; enviado + pedido concluído = venda atribuída
\o /dev/null
insert into public.clientes (grupo, loja_id, nome, telefone) values (private.grupo_da_loja((pg_temp.v('loja') #>> '{}')::uuid), (pg_temp.v('loja') #>> '{}')::uuid, 'Ana Turbo', '47988887777');
insert into r values ('ana', to_jsonb((select id from public.clientes where telefone = '47988887777' and grupo = private.grupo_da_loja((pg_temp.v('loja') #>> '{}')::uuid))));
insert into public.pedidos (loja_id, marca_id, numero, status, tipo, origem, pagamento, cliente_nome, cliente_telefone, cliente_id, subtotal, total, criado_em, concluido_em)
  select (pg_temp.v('loja') #>> '{}')::uuid, m.id, 9001, 'concluido', 'balcao', 'painel', 'dinheiro', 'Ana Turbo', '47988887777', (pg_temp.v('ana') #>> '{}')::uuid, 50, 50, now() - interval '40 days', now() - interval '40 days'
    from public.marcas m where m.loja_id = (pg_temp.v('loja') #>> '{}')::uuid limit 1;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
select from pg_temp.esperar_erro(format($q$select public.turbo_painel('%s')$q$, pg_temp.v('loja') #>> '{}'), 'não está no seu plano');
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a1');
select public.ajustar_conta_plano((pg_temp.v('conta') #>> '{}')::uuid, null, 'turbo', 'cortesia');
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
select public.turbo_salvar_automacao((pg_temp.v('loja') #>> '{}')::uuid, 'sumido', true, 'Oi {nome}, que saudade! Volte em {link}', null, '{"dias": 30}');
select public.turbo_salvar_automacao((pg_temp.v('loja') #>> '{}')::uuid, 'carrinho', true, 'Oi {nome}, esqueceu algo?', null, '{"minutos": 20}');
select from pg_temp.esperar_erro(format($q$select public.turbo_salvar_automacao('%s', 'boas_vindas', true, 'Oi {nome}', 'NAOEXISTE', '{}')$q$, pg_temp.v('loja') #>> '{}'), 'não existe');
reset role;
select private.turbo_tique();
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
insert into r values ('fila', public.turbo_fila((pg_temp.v('loja') #>> '{}')::uuid));
select public.turbo_marcar((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('fila') -> 0 ->> 'id')::uuid, 'enviado');
insert into r values ('camp', to_jsonb(public.turbo_criar_campanha((pg_temp.v('loja') #>> '{}')::uuid, 'Sexta', '{}', 'Promo {nome}', null, 5, null)));
reset role;
insert into public.pedidos (loja_id, marca_id, numero, status, tipo, origem, pagamento, cliente_nome, cliente_telefone, cliente_id, subtotal, total)
  select (pg_temp.v('loja') #>> '{}')::uuid, m.id, 9002, 'novo', 'balcao', 'painel', 'dinheiro', 'Ana Turbo', '47988887777', (pg_temp.v('ana') #>> '{}')::uuid, 72.5, 72.5
    from public.marcas m where m.loja_id = (pg_temp.v('loja') #>> '{}')::uuid limit 1;
update public.pedidos set status = 'concluido', concluido_em = now() where loja_id = (pg_temp.v('loja') #>> '{}')::uuid and numero = 9002;
insert into r values ('slug', to_jsonb((select slug from public.marcas where loja_id = (pg_temp.v('loja') #>> '{}')::uuid and ativa limit 1)));
set role anon;
select public.turbo_carrinho(pg_temp.v('slug') #>> '{}', '(47) 97777-1111', 'Beto', '1x X-Burguer', 30);
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
insert into r values ('painel', public.turbo_painel((pg_temp.v('loja') #>> '{}')::uuid));
insert into r values ('safras', public.turbo_safras((pg_temp.v('loja') #>> '{}')::uuid));
insert into r values ('perfil', public.turbo_perfil((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('ana') #>> '{}')::uuid));
reset role;
\o
select case when jsonb_array_length(pg_temp.v('fila')) = 1 and pg_temp.v('fila') -> 0 ->> 'mensagem' like 'Oi Ana, que saudade!%'
             and pg_temp.v('camp') = '0'::jsonb
             and (pg_temp.v('painel') ->> 'conversoes')::int = 1 and (pg_temp.v('painel') ->> 'receita')::numeric = 72.5
             and exists (select 1 from public.turbo_carrinhos where telefone = '47977771111')
             and (pg_temp.v('perfil') ->> 'pedidos')::int = 2 and jsonb_typeof(pg_temp.v('safras')) = 'array'
            then 'ok turbo: módulo, automação gera fila com texto pronto, limite de 2 dias, venda atribuída, carrinho guardado, perfil e safras'
            else 'FALHOU turbo camp=' || coalesce(pg_temp.v('camp')::text, '-') || ' carrinho=' || (select count(*) from public.turbo_carrinhos)::text || ' perfil=' || coalesce(pg_temp.v('perfil')::text, '-') end;
-- WhatsApp API (D-097): conectar (só gestor), token nunca volta para a tela, modelo vira {{1}}…, fila sai pelo servidor, SAIR tira do marketing
\o /dev/null
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
select public.whatsapp_conectar((pg_temp.v('loja') #>> '{}')::uuid, '123456789012345', '987654321098765', 'EAAB-token-de-teste-bem-comprido-0123456789', '+55 47 99999-0000', 'Burger Teste', 'GREEN');
insert into r values ('wst', public.whatsapp_status((pg_temp.v('loja') #>> '{}')::uuid));
insert into r values ('mod', to_jsonb(public.whatsapp_salvar_modelo((pg_temp.v('loja') #>> '{}')::uuid, 'Volta Sumido', 'MARKETING', 'Oi {nome}! Use {cupom} em {link}. Abraço da {loja}, {nome}')));
select from pg_temp.esperar_erro($q$select token from private.whatsapp_contas$q$, 'permission denied');
select public.turbo_salvar_automacao((pg_temp.v('loja') #>> '{}')::uuid, 'sumido', true, 'Oi {nome}, que saudade! Volte em {link}', null, '{"dias": 1}');
reset role;
insert into r values ('aut', to_jsonb((select id from public.turbo_automacoes where loja_id = (pg_temp.v('loja') #>> '{}')::uuid and tipo = 'sumido')));
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
select public.turbo_definir_modelo((pg_temp.v('loja') #>> '{}')::uuid, 'automacao', (pg_temp.v('aut') #>> '{}')::uuid, (pg_temp.v('mod') #>> '{}')::uuid);
reset role;
update public.whatsapp_modelos set status = 'aprovado' where id = (pg_temp.v('mod') #>> '{}')::uuid;
insert into public.clientes (grupo, loja_id, nome, telefone) values (private.grupo_da_loja((pg_temp.v('loja') #>> '{}')::uuid), (pg_temp.v('loja') #>> '{}')::uuid, 'Caio Zap', '47966665555');
insert into public.turbo_envios (loja_id, cliente_id, telefone, nome, origem, automacao_id, mensagem)
  select (pg_temp.v('loja') #>> '{}')::uuid, c.id, c.telefone, c.nome, 'automacao', a.id, 'x'
    from public.clientes c, public.turbo_automacoes a where c.telefone = '47966665555' and a.loja_id = (pg_temp.v('loja') #>> '{}')::uuid and a.tipo = 'sumido' limit 1;
set role service_role;
insert into r values ('pega', public.whatsapp_pegar_envios((pg_temp.v('loja') #>> '{}')::uuid, 10));
insert into r values ('pega2', public.whatsapp_pegar_envios((pg_temp.v('loja') #>> '{}')::uuid, 10));
select public.whatsapp_resultado_envio((pg_temp.v('pega') -> 0 ->> 'id')::uuid, 'wamid.TESTE1', null);
select public.whatsapp_status_mensagem('wamid.TESTE1', 'read', null);
insert into r values ('sair', to_jsonb(public.whatsapp_entrada('123456789012345', '5547966665555', 'sair')));
reset role;
\o
select case when (pg_temp.v('wst') ->> 'conectado')::boolean and not (pg_temp.v('wst') ? 'token')
             and (select variaveis from public.whatsapp_modelos where id = (pg_temp.v('mod') #>> '{}')::uuid) = '{nome,cupom,link,loja}'
             and jsonb_array_length(pg_temp.v('pega')) = 1 and pg_temp.v('pega') -> 0 ->> 'modelo' = 'volta_sumido'
             and pg_temp.v('pega') -> 0 -> 'variaveis' ->> 'nome' = 'Caio'
             and jsonb_array_length(pg_temp.v('pega2')) = 0
             and (select lido_em is not null and status = 'enviado' from public.turbo_envios where wa_id = 'wamid.TESTE1')
             and pg_temp.v('sair') = '"optout"'
             and (select marketing_optout_em is not null from public.clientes where telefone = '47966665555' and grupo = private.grupo_da_loja((pg_temp.v('loja') #>> '{}')::uuid))
            then 'ok whatsapp: conexão sem expor token, modelo com {{n}}, fila pega uma vez, lido pelo webhook, SAIR tira do marketing'
            else 'FALHOU whatsapp ' || coalesce(pg_temp.v('pega')::text, '-') || ' ' || coalesce(pg_temp.v('wst')::text, '-') end;
-- Dois canais (D-098): falha no oficial volta para a fila manual com o texto do modelo; resultados por canal
\o /dev/null
insert into public.clientes (grupo, loja_id, nome, telefone) values (private.grupo_da_loja((pg_temp.v('loja') #>> '{}')::uuid), (pg_temp.v('loja') #>> '{}')::uuid, 'Duda Dois', '47955554444');
insert into public.turbo_envios (loja_id, cliente_id, telefone, nome, origem, automacao_id, mensagem, status, erro)
  select (pg_temp.v('loja') #>> '{}')::uuid, c.id, c.telefone, c.nome, 'automacao', (pg_temp.v('aut') #>> '{}')::uuid, 'texto da automação', 'erro', 'número sem WhatsApp'
    from public.clientes c where c.telefone = '47955554444' limit 1;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
insert into r values ('fila2', public.turbo_fila((pg_temp.v('loja') #>> '{}')::uuid));
select public.turbo_marcar((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('fila2') -> 0 ->> 'id')::uuid, 'enviado');
insert into r values ('canais', public.turbo_canais((pg_temp.v('loja') #>> '{}')::uuid));
insert into r values ('camp2', to_jsonb(public.turbo_criar_campanha((pg_temp.v('loja') #>> '{}')::uuid, 'Com modelo', '{}', 'Oi {nome}', null, 5, now() + interval '1 day', (pg_temp.v('mod') #>> '{}')::uuid)));
reset role;
\o
select case when (pg_temp.v('fila2') -> 0 ->> 'falhou')::boolean and pg_temp.v('fila2') -> 0 ->> 'mensagem' like 'Oi Duda! Use %'
             and (pg_temp.v('fila2') -> 0 ->> 'oficial')::boolean
             and (pg_temp.v('canais') -> 'oficial' ->> 'lidas')::int = 1 and (pg_temp.v('canais') -> 'manual' ->> 'enviados')::int >= 1
             and exists (select 1 from public.turbo_campanhas where nome = 'Com modelo' and modelo_id is not null)
            then 'ok dois canais: falha do oficial vai para o manual com o texto do modelo; resultados por canal; campanha com modelo'
            else 'FALHOU dois canais ' || coalesce(pg_temp.v('fila2')::text, '-') || ' ' || coalesce(pg_temp.v('canais')::text, '-') end;
-- Salão e KDS (D-099): mesas, rodada do garçom vai para a cozinha, QR do cliente espera confirmação,
-- KDS por estação marca item e pedido fica pronto, fechar com taxa + 2 formas entra no caixa sem duplicar
\o /dev/null
with s as (insert into public.setores (loja_id, nome) values ((pg_temp.v('loja') #>> '{}')::uuid, 'Bebidas KDS'), ((pg_temp.v('loja') #>> '{}')::uuid, 'Lanches KDS') returning id, loja_id)
insert into public.setor_marcas (loja_id, setor_id, marca_id) select s.loja_id, s.id, (select id from public.marcas where slug = pg_temp.v('slug') #>> '{}') from s;
insert into public.produtos (loja_id, setor_id, nome, preco, cobra_taxa_servico)
  select s.loja_id, s.id, case s.nome when 'Bebidas KDS' then 'Refri KDS' else 'Xis KDS' end, case s.nome when 'Bebidas KDS' then 10 else 40 end, s.nome <> 'Bebidas KDS'
    from public.setores s where s.loja_id = (pg_temp.v('loja') #>> '{}')::uuid and s.nome like '% KDS';
insert into public.produto_marcas (loja_id, produto_id, marca_id)
  select p.loja_id, p.id, (select id from public.marcas where slug = pg_temp.v('slug') #>> '{}') from public.produtos p where p.nome like '% KDS' and p.loja_id = (pg_temp.v('loja') #>> '{}')::uuid;
insert into r values ('s_refri', to_jsonb((select id from public.produtos where nome = 'Refri KDS' and loja_id = (pg_temp.v('loja') #>> '{}')::uuid)));
insert into r values ('s_xis', to_jsonb((select id from public.produtos where nome = 'Xis KDS' and loja_id = (pg_temp.v('loja') #>> '{}')::uuid)));
insert into r values ('s_marca', to_jsonb((select id from public.marcas where slug = pg_temp.v('slug') #>> '{}')));
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
select public.salao_salvar_locais((pg_temp.v('loja') #>> '{}')::uuid, 'mesa', 1, 5, 4);
insert into r values ('s_mapa', public.salao_mapa((pg_temp.v('loja') #>> '{}')::uuid));
insert into r values ('s_conta', to_jsonb(public.salao_abrir_conta((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('s_mapa') -> 'locais' -> 0 ->> 'id')::uuid, 2)));
select public.salao_lancar((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('s_conta') #>> '{}')::uuid, (pg_temp.v('s_marca') #>> '{}')::uuid,
  jsonb_build_array(jsonb_build_object('produto_id', pg_temp.v('s_xis') #>> '{}', 'quantidade', 2), jsonb_build_object('produto_id', pg_temp.v('s_refri') #>> '{}', 'quantidade', 1)));
insert into r values ('s_est', to_jsonb(public.kds_estacoes_salvar((pg_temp.v('loja') #>> '{}')::uuid, null, 'Bar', array[(select id from public.setores where nome = 'Bebidas KDS' and loja_id = (pg_temp.v('loja') #>> '{}')::uuid)])));
insert into r values ('kbar', public.kds_fila((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('s_est') #>> '{}')::uuid));
insert into r values ('ktudo', public.kds_fila((pg_temp.v('loja') #>> '{}')::uuid, null));
insert into r values ('k1', to_jsonb(public.kds_marcar((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('kbar') -> 'pedidos' -> 0 ->> 'id')::uuid,
  array[(pg_temp.v('kbar') -> 'pedidos' -> 0 -> 'itens' -> 0 ->> 'id')::uuid], true)));
insert into r values ('k2', to_jsonb(public.kds_marcar((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('ktudo') -> 'pedidos' -> 0 ->> 'id')::uuid,
  array(select (x ->> 'id')::uuid from jsonb_array_elements(pg_temp.v('ktudo') -> 'pedidos' -> 0 -> 'itens') x), true)));
reset role;
-- cliente pelo QR da mesa 2 (sem login)
insert into r values ('s_qr', to_jsonb((select qr_token from public.salao_locais where loja_id = (pg_temp.v('loja') #>> '{}')::uuid and numero = 2)));
set role anon;
insert into r values ('s_pub', public.salao_mesa_publica(pg_temp.v('s_qr') #>> '{}'));
select public.salao_pedido_qr(pg_temp.v('s_qr') #>> '{}', pg_temp.v('slug') #>> '{}', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.v('s_refri') #>> '{}', 'quantidade', 2)), 'Lia', null);
reset role;
insert into r values ('s_qrrep', to_jsonb((select count(*) from public.pedidos p join public.salao_contas c on c.id = p.salao_conta_id join public.salao_locais l on l.id = c.local_id where l.qr_token = pg_temp.v('s_qr') #>> '{}')));
set role anon;
select from pg_temp.esperar_erro(format($q$select public.salao_pedido_qr('%s', '%s', '[{"produto_id": "%s", "quantidade": 1}]', 'Lia', null)$q$, pg_temp.v('s_qr') #>> '{}', pg_temp.v('slug') #>> '{}', pg_temp.v('s_refri') #>> '{}'), 'Aguarde');
reset role;
insert into r values ('s_conta2', to_jsonb((select c.id from public.salao_contas c join public.salao_locais l on l.id = c.local_id where l.qr_token = pg_temp.v('s_qr') #>> '{}')));
-- caixa aberto para o fechamento
insert into public.caixas (loja_id, nome) values ((pg_temp.v('loja') #>> '{}')::uuid, 'Caixa salão');
insert into public.caixa_sessoes (loja_id, caixa_id, numero, aberto_por)
  select loja_id, id, 1, '00000000-0000-0000-0000-0000000005a2' from public.caixas where nome = 'Caixa salão' and loja_id = (pg_temp.v('loja') #>> '{}')::uuid;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
select from pg_temp.esperar_erro(format($q$select public.salao_fechar('%s', '%s', true, 0, '[{"forma": "pix", "valor": 20}]')$q$, pg_temp.v('loja') #>> '{}', pg_temp.v('s_conta2') #>> '{}'), 'esperando confirmação');
select from pg_temp.esperar_erro(format($q$select public.salao_fechar('%s', '%s', true, 0, '[{"forma": "pix", "valor": 50}]')$q$, pg_temp.v('loja') #>> '{}', pg_temp.v('s_conta') #>> '{}'), 'Faltam');
select from pg_temp.esperar_erro(format($q$select public.salao_fechar('%s', '%s', true, 0, '[{"forma": "pix", "valor": 100}]')$q$, pg_temp.v('loja') #>> '{}', pg_temp.v('s_conta') #>> '{}'), 'só em dinheiro');
-- 2×40 + 10 = 90; taxa 10% só nos 80 do lanche = 8; total 98: 50 pix + 50 dinheiro (troco 2)
insert into r values ('s_fecha', public.salao_fechar((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('s_conta') #>> '{}')::uuid, true, 0, '[{"forma": "pix", "valor": 50}, {"forma": "dinheiro", "valor": 50}]'));
reset role;
\o
select case when jsonb_array_length(pg_temp.v('s_mapa') -> 'locais') = 5
             and jsonb_array_length(pg_temp.v('kbar') -> 'pedidos' -> 0 -> 'itens') = 1 and pg_temp.v('kbar') -> 'pedidos' -> 0 ->> 'mesa' like 'Mesa 1%'
             and jsonb_array_length(pg_temp.v('ktudo') -> 'pedidos' -> 0 -> 'itens') = 2
             and pg_temp.v('k1') = '"em_preparo"' and pg_temp.v('k2') = '"pronto"'
             and pg_temp.v('s_pub') ->> 'rotulo' = 'Mesa 2' and pg_temp.v('s_qrrep') = '1'
             and (select status from public.pedidos where salao_conta_id = (pg_temp.v('s_conta2') #>> '{}')::uuid) in ('novo', 'em_preparo')
             and (pg_temp.v('s_fecha') ->> 'total')::numeric = 98 and (pg_temp.v('s_fecha') ->> 'troco')::numeric = 2
             and (select sum(valor) from public.caixa_movimentos m join public.caixa_sessoes s on s.id = m.sessao_id join public.caixas cx on cx.id = s.caixa_id where cx.nome = 'Caixa salão') = 98
             and (select count(*) from public.caixa_movimentos m join public.caixa_sessoes s on s.id = m.sessao_id join public.caixas cx on cx.id = s.caixa_id where cx.nome = 'Caixa salão') = 2
             and (select bool_and(status = 'concluido') from public.pedidos where salao_conta_id = (pg_temp.v('s_conta') #>> '{}')::uuid)
             and (select status from public.salao_contas where id = (pg_temp.v('s_conta') #>> '{}')::uuid) = 'fechada'
            then 'ok salão/KDS: mesas, rodada na cozinha, KDS por estação, QR com freio, fechar com taxa só onde cobra, troco e caixa sem duplicar'
            else 'FALHOU salão ' || coalesce(pg_temp.v('s_fecha')::text, '-') || ' k1=' || coalesce(pg_temp.v('k1')::text, '-') || ' k2=' || coalesce(pg_temp.v('k2')::text, '-') || ' bar=' || coalesce(pg_temp.v('kbar')::text, '-') end;
-- Teste de raiva (D-101): QR com limite; faturamento somado no banco, só das lojas da pessoa
\o /dev/null
insert into r values ('s_qr3', to_jsonb((select qr_token from public.salao_locais where numero = 3 and loja_id = (pg_temp.v('loja') #>> '{}')::uuid)));
set role anon;
select from pg_temp.esperar_erro(format($q$select public.salao_pedido_qr('%s', '%s', '[{"produto_id": "%s", "quantidade": 99}]', 'X', null)$q$,
  pg_temp.v('s_qr3') #>> '{}', pg_temp.v('slug') #>> '{}', pg_temp.v('s_refri') #>> '{}'), 'grande demais');
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
insert into r values ('rv_fat', (select jsonb_agg(f) from public.faturamento_lojas(array[(pg_temp.v('loja') #>> '{}')::uuid], 30) f));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a3');
insert into r values ('rv_fat_fora', (select coalesce(jsonb_agg(f), '[]') from public.faturamento_lojas(array[(pg_temp.v('loja') #>> '{}')::uuid], 30) f));
reset role;
\o
select case when (pg_temp.v('rv_fat') -> 0 ->> 'total')::numeric = (select sum(total) from public.pedidos where loja_id = (pg_temp.v('loja') #>> '{}')::uuid and status = 'concluido' and concluido_em > now() - interval '30 days')
             and pg_temp.v('rv_fat_fora') = '[]'
            then 'ok raiva: QR com limite de quantidade; faturamento somado no banco e só para quem é da loja'
            else 'FALHOU raiva ' || coalesce(pg_temp.v('rv_fat')::text, '-') || ' ' || coalesce(pg_temp.v('rv_fat_fora')::text, '-') end;
-- Caixa de entrada de NF-e (D-102): certificado só do dono/gerente e do mesmo CNPJ; segredo nunca volta ao app;
-- servidor registra resumo, XML completo e cancelamento; ciência; nota importada sai da fila
\o /dev/null
update public.lojas set cnpj = '11222333000181', cpf = null, uf = 'SC' where id = (pg_temp.v('loja') #>> '{}')::uuid;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a4');
select from pg_temp.esperar_erro(format($q$select public.nfe_auto_salvar_certificado('%s', repeat('A', 200), 'senha123', '11222333000181', 'BURGER', now() + interval '1 year')$q$, pg_temp.v('loja') #>> '{}'), 'Só o dono');
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
select from pg_temp.esperar_erro(format($q$select public.nfe_auto_salvar_certificado('%s', repeat('A', 200), 'senha123', '99888777000166', 'OUTRA', now() + interval '1 year')$q$, pg_temp.v('loja') #>> '{}'), 'não é o desta loja');
select from pg_temp.esperar_erro(format($q$select public.nfe_auto_salvar_certificado('%s', repeat('A', 200), 'senha123', '11222333000181', 'BURGER', now() - interval '1 day')$q$, pg_temp.v('loja') #>> '{}'), 'vencido');
select public.nfe_auto_salvar_certificado((pg_temp.v('loja') #>> '{}')::uuid, repeat('P', 300), 'senha-secreta-123', '11222333000270', 'BURGER TESTE LTDA', now() + interval '1 year');
insert into r values ('nf_sit1', public.nfe_auto_situacao((pg_temp.v('loja') #>> '{}')::uuid));
select from pg_temp.esperar_erro(format($q$select public.nfe_auto_credenciais('%s')$q$, pg_temp.v('loja') #>> '{}'), 'permission denied');
reset role;
set role service_role;
insert into r values ('nf_cred', public.nfe_auto_credenciais((pg_temp.v('loja') #>> '{}')::uuid));
insert into r values ('nf_reg', public.nfe_auto_registrar((pg_temp.v('loja') #>> '{}')::uuid, jsonb_build_array(
  jsonb_build_object('tipo', 'resumo', 'nsu', '000000000000001', 'chave', '42261111222333000181550010000000011000000011', 'emitenteCnpj', '55666777000188', 'emitenteNome', 'Fornecedor A', 'emissao', now() - interval '2 days', 'valor', 31479, 'situacao', 'autorizada'),
  jsonb_build_object('tipo', 'completa', 'nsu', '000000000000002', 'chave', '42261111222333000181550010000000021000000021', 'emitenteCnpj', '55666777000188', 'emitenteNome', 'Fornecedor B', 'emissao', now() - interval '1 day', 'valor', 82826, 'xml', '<nfeProc>B</nfeProc>'),
  jsonb_build_object('tipo', 'resumo', 'nsu', '000000000000003', 'chave', '42261111222333000181550010000000031000000031', 'emitenteCnpj', '55666777000188', 'emitenteNome', 'Fornecedor C', 'emissao', now() - interval '3 days', 'valor', 1000, 'situacao', 'autorizada'),
  jsonb_build_object('tipo', 'resumo', 'nsu', '000000000000004', 'chave', '42261111222333000181550010000000041000000041', 'emitenteCnpj', '55666777000188', 'emitenteNome', 'Antiga', 'emissao', now() - interval '60 days', 'valor', 1000, 'situacao', 'autorizada'),
  jsonb_build_object('tipo', 'evento', 'chave', '42261111222333000181550010000000031000000031', 'tpEvento', '110111')),
  '4', '9', '138', null, now() + interval '61 minutes'));
insert into r values ('nf_cienc', to_jsonb(array(select public.nfe_auto_para_ciencia((pg_temp.v('loja') #>> '{}')::uuid, 30))));
select public.nfe_auto_ciencia((pg_temp.v('loja') #>> '{}')::uuid, '[{"chave": "42261111222333000181550010000000011000000011", "ok": true}]');
insert into r values ('nf_devidas', to_jsonb((select count(*) from public.nfe_auto_lojas_devidas() x where x = (pg_temp.v('loja') #>> '{}')::uuid)));
reset role;
insert into public.nfe_entradas (estoque, loja_id, chave, numero, itens)
  values (private.estoque_da_loja((pg_temp.v('loja') #>> '{}')::uuid), (pg_temp.v('loja') #>> '{}')::uuid, '42261111222333000181550010000000021000000021', '2', '[]');
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
insert into r values ('nf_sit2', public.nfe_auto_situacao((pg_temp.v('loja') #>> '{}')::uuid));
insert into r values ('nf_xml', to_jsonb(public.nfe_auto_xml((pg_temp.v('loja') #>> '{}')::uuid, (select (x ->> 'id')::uuid from jsonb_array_elements(pg_temp.v('nf_sit2') -> 'notas') x where x ->> 'emitente_nome' = 'Fornecedor B'))));
select public.nfe_auto_remover((pg_temp.v('loja') #>> '{}')::uuid);
reset role;
insert into r values ('nf_segredos', to_jsonb((select count(*) from private.nfe_segredos)));
\o
select case when pg_temp.v('nf_sit1') #>> '{certificado,cnpj}' = '11222333000181' and pg_temp.v('nf_sit1') #>> '{certificado,cnpj_certificado}' = '11222333000270'
             and pg_temp.v('nf_sit1')::text not like '%senha-secreta%' and pg_temp.v('nf_sit1')::text not like '%PPPP%'
             and pg_temp.v('nf_cred') ->> 'senha' = 'senha-secreta-123' and pg_temp.v('nf_cred') ->> 'pfx' = repeat('P', 300) and pg_temp.v('nf_cred') ->> 'ult_nsu' = '000000000000000'
             and (pg_temp.v('nf_reg') ->> 'novas')::int = 4 and (pg_temp.v('nf_reg') ->> 'xmls')::int = 1
             and pg_temp.v('nf_cienc') = '["42261111222333000181550010000000011000000011"]'
             and pg_temp.v('nf_devidas') = '0'
             and (select string_agg(x ->> 'emitente_nome' || ':' || (x ->> 'status') || ':' || (x ->> 'situacao'), ',' order by x ->> 'emitente_nome') from jsonb_array_elements(pg_temp.v('nf_sit2') -> 'notas') x)
                 = 'Antiga:resumo:autorizada,Fornecedor A:ciencia:autorizada,Fornecedor B:importada:autorizada,Fornecedor C:resumo:cancelada'
             and pg_temp.v('nf_xml') = '"<nfeProc>B</nfeProc>"' and pg_temp.v('nf_segredos') = '0'
            then 'ok NF-e automática: certificado só do dono e do mesmo CNPJ, segredo fora do app, resumo/XML/cancelamento, ciência e nota importada saindo da fila'
            else 'FALHOU NF-e automática ' || coalesce(pg_temp.v('nf_sit2')::text, '-') || ' cienc=' || coalesce(pg_temp.v('nf_cienc')::text, '-') || ' reg=' || coalesce(pg_temp.v('nf_reg')::text, '-') end;
-- Estoque automático (D-103): EAN da nota liga o insumo, lista de compras, produto pausado sem insumo
\o /dev/null
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
select public.importar_nfe((pg_temp.v('loja') #>> '{}')::uuid, jsonb_build_object('chave', '42261155666777000188550010000000991000000991', 'numero', '99', 'emitente_cnpj', '55666777000188', 'emitente_nome', 'Padaria Auto', 'valor_total', 500,
  'itens', jsonb_build_array(jsonb_build_object('n', 1, 'codigo', 'P1', 'descricao', 'PAO BRIOCHE', 'ean', '7891234567895', 'unidade', 'UN', 'quantidade', 5, 'custo_total', 500, 'acao', 'novo', 'novo', jsonb_build_object('nome', 'Pão auto', 'unidade', 'UN'), 'fator', 1))));
insert into r values ('ea_eans', public.eans_do_estoque((pg_temp.v('loja') #>> '{}')::uuid));
select public.salvar_insumo((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('ea_eans') #>> '{7891234567895,insumo_id}')::uuid, '{"nome": "Pão auto", "unidade": "UN", "minimo": "10"}');
insert into r values ('ea_lista', public.lista_compras((pg_temp.v('loja') #>> '{}')::uuid));
select public.salvar_ficha((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('s_xis') #>> '{}')::uuid, null, jsonb_build_array(jsonb_build_object('insumo_id', pg_temp.v('ea_eans') #>> '{7891234567895,insumo_id}', 'quantidade', 1)));
insert into r values ('ea_lig', to_jsonb(public.definir_pausa_sem_insumo((pg_temp.v('loja') #>> '{}')::uuid, true)));
reset role;
update public.insumos set saldo = 0 where id = (pg_temp.v('ea_eans') #>> '{7891234567895,insumo_id}')::uuid;
insert into r values ('ea_p1', to_jsonb((select etiqueta::text || ':' || pausado_estoque from public.produtos where id = (pg_temp.v('s_xis') #>> '{}')::uuid)));
update public.insumos set saldo = 3 where id = (pg_temp.v('ea_eans') #>> '{7891234567895,insumo_id}')::uuid;
insert into r values ('ea_p2', to_jsonb((select coalesce(etiqueta::text, '-') || ':' || pausado_estoque from public.produtos where id = (pg_temp.v('s_xis') #>> '{}')::uuid)));
\o
select case when (pg_temp.v('ea_eans') #>> '{7891234567895,fator}')::numeric = 1 and jsonb_array_length(pg_temp.v('ea_lista')) = 1
             and pg_temp.v('ea_lista') #>> '{0,fornecedor}' = 'Padaria Auto' and (pg_temp.v('ea_lista') #>> '{0,sugestao}')::numeric = 15
             and pg_temp.v('ea_lig') = '0' and pg_temp.v('ea_p1') = '"esgotado:true"' and pg_temp.v('ea_p2') = '"-:false"'
            then 'ok estoque automático: EAN da nota liga o insumo, lista de compras com fornecedor e sugestão, produto pausa e volta com o saldo'
            else 'FALHOU estoque automático ' || coalesce(pg_temp.v('ea_lista')::text, '-') || ' p1=' || coalesce(pg_temp.v('ea_p1')::text, '-') || ' p2=' || coalesce(pg_temp.v('ea_p2')::text, '-') end;
-- Motoboy se cadastra (D-104): link da loja, pedido com conta própria, aprovar vira membro motoboy, recusar devolve a conta
\o /dev/null
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000c701', 'joao.moto@equipe.res.invalid'), ('00000000-0000-0000-0000-00000000c702', 'pedro.moto@equipe.res.invalid');
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
insert into r values ('mb_tk', to_jsonb(public.motoboy_link((pg_temp.v('loja') #>> '{}')::uuid)));
reset role;
set role anon;
insert into r values ('mb_info', public.motoboy_link_info(pg_temp.v('mb_tk') #>> '{}'));
select from pg_temp.esperar_erro(format($q$select public.motoboy_solicitar('%s', '00000000-0000-0000-0000-00000000c701', 'joao.moto', 'João', '47999990000', 'Moto', 'ABC1D23', 'joao@pix')$q$, pg_temp.v('mb_tk') #>> '{}'), 'permission denied');
reset role;
set role service_role;
insert into r values ('mb_s1', to_jsonb(public.motoboy_solicitar(pg_temp.v('mb_tk') #>> '{}', '00000000-0000-0000-0000-00000000c701', 'joao.moto', 'João Moto', '(47) 99999-0000', 'Honda CG', 'abc-1d23', 'joao@pix')));
insert into r values ('mb_s2', to_jsonb(public.motoboy_solicitar(pg_temp.v('mb_tk') #>> '{}', '00000000-0000-0000-0000-00000000c702', 'pedro.moto', 'Pedro Moto', '47988887777', null, null, null)));
select from pg_temp.esperar_erro($q$select public.motoboy_solicitar('linkerrado', '00000000-0000-0000-0000-00000000c702', 'x', 'X', '47988887777', null, null, null)$q$, 'Link de cadastro inválido');
reset role;
-- o plano do teste deixa 1 aparelho de motoboy: abre a vaga (o limite em si é testado na D-090)
update public.membros set ativo = false where loja_id = (pg_temp.v('loja') #>> '{}')::uuid and papel = 'entregador';
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
insert into r values ('mb_lista', public.motoboy_solicitacoes_lista((pg_temp.v('loja') #>> '{}')::uuid));
select public.motoboy_decidir((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('mb_s1') #>> '{}')::uuid, true);
insert into r values ('mb_rec', to_jsonb(public.motoboy_decidir((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('mb_s2') #>> '{}')::uuid, false)));
insert into r values ('mb_tk2', to_jsonb(public.motoboy_link((pg_temp.v('loja') #>> '{}')::uuid, true)));
reset role;
insert into r values ('mb_membro', to_jsonb((select papel::text || ':' || nome from public.membros where user_id = '00000000-0000-0000-0000-00000000c701')));
set role anon;
insert into r values ('mb_info_velho', coalesce(public.motoboy_link_info(pg_temp.v('mb_tk') #>> '{}'), 'null'::jsonb));
reset role;
\o
select case when pg_temp.v('mb_info') ->> 'loja' is not null and jsonb_array_length(pg_temp.v('mb_lista')) = 2
             and pg_temp.v('mb_lista')::text like '%"placa": "ABC1D23"%' and pg_temp.v('mb_lista')::text like '%"telefone": "47999990000"%'
             and pg_temp.v('mb_membro') = '"entregador:João Moto"' and pg_temp.v('mb_rec') = '"00000000-0000-0000-0000-00000000c702"'
             and pg_temp.v('mb_tk2') <> pg_temp.v('mb_tk') and pg_temp.v('mb_info_velho') = 'null'
            then 'ok motoboy se cadastra: link, pedido só pelo servidor, aprovar vira motoboy, recusar devolve a conta, link trocado'
            else 'FALHOU motoboy ' || coalesce(pg_temp.v('mb_lista')::text, '-') || ' membro=' || coalesce(pg_temp.v('mb_membro')::text, '-') end;
-- Financeiro automático (D-105): extrato OFX sem duplicar, baixa com o valor do banco, lançar/ignorar/desfazer e o Bom dia
\o /dev/null
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
select public.preparar_financeiro((pg_temp.v('loja') #>> '{}')::uuid);
insert into r values ('fx_lanc', to_jsonb(public.criar_lancamento((pg_temp.v('loja') #>> '{}')::uuid, jsonb_build_object('tipo', 'despesa', 'descricao', 'Atacadão', 'valor', 1200, 'vencimento', current_date - 1))));
insert into r values ('fx_rec', to_jsonb(public.criar_lancamento((pg_temp.v('loja') #>> '{}')::uuid, jsonb_build_object('tipo', 'receita', 'descricao', 'Encomenda', 'valor', 50, 'vencimento', current_date))));
insert into r values ('fx_itens', jsonb_build_array(
  jsonb_build_object('chave', 'b|c|k1', 'data', current_date - 1, 'valor', -125000, 'descricao', 'PIX ATACADAO'),
  jsonb_build_object('chave', 'b|c|k2', 'data', current_date - 1, 'valor', -2000, 'descricao', 'TARIFA'),
  jsonb_build_object('chave', 'b|c|k3', 'data', current_date - 1, 'valor', 84530, 'descricao', 'REDE CARTOES'),
  jsonb_build_object('chave', 'b|c|k4', 'data', current_date - 1, 'valor', -5000, 'descricao', 'PIX ENVIADO')));
insert into r values ('fx_imp1', public.fin_extrato_importar((pg_temp.v('loja') #>> '{}')::uuid, null, pg_temp.v('fx_itens')));
insert into r values ('fx_imp2', public.fin_extrato_importar((pg_temp.v('loja') #>> '{}')::uuid, null, pg_temp.v('fx_itens')));
insert into r select 'fx_' || right(chave, 2), to_jsonb(id) from public.fin_extrato where loja_id = (pg_temp.v('loja') #>> '{}')::uuid;
insert into r values ('fx_cat_desp', to_jsonb((select id from public.fin_categorias where loja_id = (pg_temp.v('loja') #>> '{}')::uuid and tipo = 'despesa' limit 1)));
insert into r values ('fx_cat_rec', to_jsonb((select id from public.fin_categorias where loja_id = (pg_temp.v('loja') #>> '{}')::uuid and tipo = 'receita' limit 1)));
select public.fin_extrato_baixar((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('fx_k1') #>> '{}')::uuid, (pg_temp.v('fx_lanc') #>> '{}')::uuid);
insert into r values ('fx_pago', to_jsonb((select (pago_em = current_date - 1) || ':' || valor || ':' || observacao from public.fin_lancamentos where id = (pg_temp.v('fx_lanc') #>> '{}')::uuid)));
select from pg_temp.esperar_erro(format('select public.fin_extrato_baixar(%L, %L, %L)', pg_temp.v('loja') #>> '{}', pg_temp.v('fx_k1') #>> '{}', pg_temp.v('fx_lanc') #>> '{}'), 'já foi conferida');
select from pg_temp.esperar_erro(format('select public.fin_extrato_baixar(%L, %L, %L)', pg_temp.v('loja') #>> '{}', pg_temp.v('fx_k4') #>> '{}', pg_temp.v('fx_rec') #>> '{}'), 'Saída do banco');
select from pg_temp.esperar_erro(format('select public.fin_extrato_lancar(%L, %L, %L)', pg_temp.v('loja') #>> '{}', pg_temp.v('fx_k4') #>> '{}', pg_temp.v('fx_cat_rec') #>> '{}'), 'Categoria inválida');
insert into r values ('fx_novo', to_jsonb(public.fin_extrato_lancar((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('fx_k2') #>> '{}')::uuid, (pg_temp.v('fx_cat_desp') #>> '{}')::uuid, 'Tarifa do banco')));
insert into r values ('fx_novo_ok', to_jsonb((select tipo || ':' || valor || ':' || (pago_em = current_date - 1) || ':' || descricao from public.fin_lancamentos where id = (pg_temp.v('fx_novo') #>> '{}')::uuid)));
select public.fin_extrato_ignorar((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('fx_k3') #>> '{}')::uuid, 'venda');
insert into r values ('fx_bd1', public.resumo_manha((pg_temp.v('loja') #>> '{}')::uuid));
select public.fin_extrato_desfazer((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('fx_k1') #>> '{}')::uuid);
select public.fin_extrato_desfazer((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('fx_k2') #>> '{}')::uuid);
insert into r values ('fx_desf', to_jsonb((select coalesce(pago_em::text, 'aberto') from public.fin_lancamentos where id = (pg_temp.v('fx_lanc') #>> '{}')::uuid)
                                          || ':' || (select count(*) from public.fin_lancamentos where id = (pg_temp.v('fx_novo') #>> '{}')::uuid)));
insert into r values ('fx_bd2', public.resumo_manha((pg_temp.v('loja') #>> '{}')::uuid));
select from pg_temp.esperar_erro($q$insert into public.fin_extrato (loja_id, chave, data, valor, descricao) select loja_id, 'x', current_date, 1, 'x' from public.fin_extrato limit 1$q$, 'permission denied');
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a4');
select from pg_temp.esperar_erro(format('select public.fin_extrato_importar(%L, null, %L)', pg_temp.v('loja') #>> '{}', pg_temp.v('fx_itens')), 'Financeiro');
select from pg_temp.esperar_erro(format('select public.resumo_manha(%L)', pg_temp.v('loja') #>> '{}'), 'Só o dono');
insert into r values ('fx_func_ve', to_jsonb((select count(*) from public.fin_extrato)));
reset role;
\o
select case when pg_temp.v('fx_imp1') = '{"novas": 4, "repetidas": 0}' and pg_temp.v('fx_imp2') = '{"novas": 0, "repetidas": 4}'
             and pg_temp.v('fx_pago') = '"true:1250.00:valor original R$ 1200,00"'
             and pg_temp.v('fx_novo_ok') = '"despesa:20.00:true:Tarifa do banco"'
             and pg_temp.v('fx_desf') = '"aberto:0"' and pg_temp.v('fx_func_ve') = '0'
             and (pg_temp.v('fx_bd1') #>> '{financeiro,extrato_pendente}')::int = 1 and (pg_temp.v('fx_bd2') #>> '{financeiro,extrato_pendente}')::int = 3
             and (pg_temp.v('fx_bd2') #>> '{financeiro,vencidas}')::int >= 1 and pg_temp.v('fx_bd2') ? 'ontem' and pg_temp.v('fx_bd2') ? 'estoque'
            then 'ok financeiro automático: extrato sem duplicar, baixa com o valor do banco, lançar/ignorar/desfazer, só gestor, Bom dia'
            else 'FALHOU financeiro automático imp=' || coalesce(pg_temp.v('fx_imp1')::text, '-') || '/' || coalesce(pg_temp.v('fx_imp2')::text, '-') || ' pago=' || coalesce(pg_temp.v('fx_pago')::text, '-')
                 || ' novo=' || coalesce(pg_temp.v('fx_novo_ok')::text, '-') || ' desf=' || coalesce(pg_temp.v('fx_desf')::text, '-') || ' bd=' || coalesce(pg_temp.v('fx_bd2')::text, '-') end;
-- Um certificado para tudo (D-106): filial do mesmo CNPJ usa o certificado da matriz; renovar vale para as duas; desconectar uma não apaga o segredo
\o /dev/null
reset role;
insert into r values ('uc_filial', to_jsonb(gen_random_uuid()));
insert into r values ('uc_outra', to_jsonb(gen_random_uuid()));
insert into public.lojas select (jsonb_populate_record(null::public.lojas, to_jsonb(l) || jsonb_build_object('id', pg_temp.v('uc_filial') #>> '{}', 'slug', 'burger-filial-uc', 'nome', 'Burger Filial', 'cnpj', '11222333000352', 'conta_id', null))).*
  from public.lojas l where l.id = (pg_temp.v('loja') #>> '{}')::uuid;
insert into public.lojas select (jsonb_populate_record(null::public.lojas, to_jsonb(l) || jsonb_build_object('id', pg_temp.v('uc_outra') #>> '{}', 'slug', 'outro-cnpj-uc', 'nome', 'Outro CNPJ', 'cnpj', '99888777000166', 'conta_id', null))).*
  from public.lojas l where l.id = (pg_temp.v('loja') #>> '{}')::uuid;
insert into public.membros (loja_id, user_id, papel, ativo, nome) values
  ((pg_temp.v('uc_filial') #>> '{}')::uuid, '00000000-0000-0000-0000-0000000005a2', 'dono', true, 'Ana'),
  ((pg_temp.v('uc_outra') #>> '{}')::uuid, '00000000-0000-0000-0000-0000000005a2', 'dono', true, 'Ana')
on conflict do nothing;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
select public.nfe_auto_salvar_certificado((pg_temp.v('loja') #>> '{}')::uuid, repeat('P', 300), 'senha-1', '11222333000270', 'BURGER TESTE LTDA', now() + interval '1 year');
insert into r values ('uc_sit1', public.nfe_auto_situacao((pg_temp.v('loja') #>> '{}')::uuid));
select from pg_temp.esperar_erro(format('select public.nfe_auto_usar_certificado(%L, array[%L]::uuid[])', pg_temp.v('loja') #>> '{}', pg_temp.v('uc_outra') #>> '{}'), 'não é do mesmo CNPJ');
insert into r values ('uc_n', to_jsonb(public.nfe_auto_usar_certificado((pg_temp.v('loja') #>> '{}')::uuid, array[(pg_temp.v('uc_filial') #>> '{}')::uuid])));
select public.nfe_auto_salvar_certificado((pg_temp.v('loja') #>> '{}')::uuid, repeat('Q', 300), 'senha-nova', '11222333000270', 'BURGER TESTE LTDA', now() + interval '2 years');
insert into r values ('uc_sit2', public.nfe_auto_situacao((pg_temp.v('uc_filial') #>> '{}')::uuid));
select public.nfe_auto_remover((pg_temp.v('loja') #>> '{}')::uuid);
reset role;
insert into r values ('uc_cred', public.nfe_auto_credenciais((pg_temp.v('uc_filial') #>> '{}')::uuid));
select from pg_temp.como('00000000-0000-0000-0000-0000000005a4');
select from pg_temp.esperar_erro(format('select public.nfe_auto_usar_certificado(%L, array[%L]::uuid[])', pg_temp.v('uc_filial') #>> '{}', pg_temp.v('loja') #>> '{}'), 'Só o dono');
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
select public.nfe_auto_remover((pg_temp.v('uc_filial') #>> '{}')::uuid);
reset role;
insert into r values ('uc_segredos', to_jsonb((select count(*) from private.nfe_segredos)));
\o
select case when pg_temp.v('uc_sit1')::text like '%"nome": "Burger Filial"%' and pg_temp.v('uc_sit1')::text not like '%Outro CNPJ%'
             and pg_temp.v('uc_n') = '1'
             and (pg_temp.v('uc_sit2') #>> '{certificado,validade}')::timestamptz > now() + interval '23 months'
             and (pg_temp.v('uc_sit2') #>> '{certificado,cnpj}') = '11222333000352' and (pg_temp.v('uc_sit2') #>> '{certificado,compartilhado}')::int = 1
             and pg_temp.v('uc_cred') ->> 'pfx' = repeat('Q', 300) and pg_temp.v('uc_cred') ->> 'cnpj' = '11222333000352'
             and pg_temp.v('uc_segredos') = '0'
            then 'ok um certificado para tudo: filial do mesmo CNPJ usa o da matriz, renovação vale nas duas, desconectar não apaga o que outra usa'
            else 'FALHOU um certificado ' || coalesce(pg_temp.v('uc_sit1') -> 'outras_lojas', 'null')::text || ' sit2=' || coalesce(pg_temp.v('uc_sit2') -> 'certificado', 'null')::text
                 || ' cred=' || coalesce(pg_temp.v('uc_cred') ->> 'cnpj', '-') || ' seg=' || coalesce(pg_temp.v('uc_segredos')::text, '-') end;
-- IA (D-107): freio por loja e permissão
\o /dev/null
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
insert into r values ('ia_1', to_jsonb(public.ia_registrar((pg_temp.v('loja') #>> '{}')::uuid, 'cardapio')));
select public.ia_registrar((pg_temp.v('loja') #>> '{}')::uuid, 'cardapio') from generate_series(1, 19);
select from pg_temp.esperar_erro(format('select public.ia_registrar(%L, %L)', pg_temp.v('loja') #>> '{}', 'cardapio'), 'Limite de uso da IA');
insert into r values ('ia_f', to_jsonb(public.ia_registrar((pg_temp.v('loja') #>> '{}')::uuid, 'ficha')));
select from pg_temp.esperar_erro(format('select public.ia_registrar(%L, %L)', pg_temp.v('loja') #>> '{}', 'outro'), 'inválido');
select from pg_temp.esperar_erro('select count(*) from public.ia_uso', 'permission denied');
reset role;
\o
select case when pg_temp.v('ia_1') = '19' and pg_temp.v('ia_f') = '149'
            then 'ok IA: freio por dia por loja, tipo conferido, tabela fechada'
            else 'FALHOU IA ' || coalesce(pg_temp.v('ia_1')::text, '-') || ' ' || coalesce(pg_temp.v('ia_f')::text, '-') end;
-- Margem e engenharia de cardápio (D-108): custo pelas fichas com o custo atual, insumo que subiu, CMV alvo
\o /dev/null
select from pg_temp.como('00000000-0000-0000-0000-0000000005a2');
select public.ajustar_estoque((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('ea_eans') #>> '{7891234567895,insumo_id}')::uuid, 'entrada', 10, 1.00, null);
select public.ajustar_estoque((pg_temp.v('loja') #>> '{}')::uuid, (pg_temp.v('ea_eans') #>> '{7891234567895,insumo_id}')::uuid, 'entrada', 10, 2.00, null);
select public.definir_cmv_alvo((pg_temp.v('loja') #>> '{}')::uuid, 30);
select from pg_temp.esperar_erro(format('select public.definir_cmv_alvo(%L, 95)', pg_temp.v('loja') #>> '{}'), '5% a 90%');
insert into r values ('mg', public.margem_cardapio((pg_temp.v('loja') #>> '{}')::uuid, 30));
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000005a4');
select from pg_temp.esperar_erro(format('select public.definir_cmv_alvo(%L, 40)', pg_temp.v('loja') #>> '{}'), 'Só o dono');
reset role;
\o
select case when (pg_temp.v('mg') ->> 'alvo')::numeric = 30
             and (select (x ->> 'vendidos')::int >= 2 and (x ->> 'custo_conhecido')::boolean and (x ->> 'custo')::numeric > 0
                    from jsonb_array_elements(pg_temp.v('mg') -> 'produtos') x where x ->> 'nome' = 'Xis KDS')
             and (select (x ->> 'variacao')::numeric = 100 and x -> 'usado_em' ? 'Xis KDS'
                    from jsonb_array_elements(pg_temp.v('mg') -> 'insumos_subiram') x where x ->> 'nome' = 'Pão auto')
            then 'ok margem: custo atual pelas fichas, insumo que subiu com os itens que usam, CMV alvo só gestor'
            else 'FALHOU margem ' || coalesce(pg_temp.v('mg')::text, '-') end;
