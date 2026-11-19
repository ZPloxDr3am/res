-- Avisos para a equipe (erro novo, impressão parada, pedido de app parado) por e-mail e WhatsApp.
-- O pg_net e o Vault do Supabase são simulados aqui, dentro de uma transação desfeita no fim.
\set ON_ERROR_STOP on
\o /dev/null
begin;

create schema if not exists net;
create table net.chamadas (metodo text, url text, corpo jsonb, params jsonb, cabecalhos jsonb);
create function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) returns bigint
language sql as $$ insert into net.chamadas values ('post', url, body, params, headers); select 1::bigint $$;
create function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) returns bigint
language sql as $$ insert into net.chamadas values ('get', url, null, params, headers); select 1::bigint $$;
create schema if not exists vault;
create table vault.decrypted_secrets (name text, decrypted_secret text);

-- cenário: loja com impressora do agente, um erro antigo que se repete, um erro novo, cupom parado e evento parado
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000a1e7', 'alerta@example.com');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a1e7', false);
insert into private.config_plataforma (chave, valor) values ('cadastro_modo', 'aberto') on conflict (chave) do update set valor = 'aberto';
set role authenticated;
create temp table ids (k text primary key, id uuid);
reset role;
grant all on ids to authenticated;
set role authenticated;
insert into ids values ('loja', public.criar_loja('Loja Alerta', 'Alerta Burger', 'alerta-burger', 'Ana'));
reset role;
insert into public.impressoras (loja_id, nome, modelo, protocolo, conexao, endereco, ultimo_sinal)
select (select id from ids where k = 'loja'), 'Cozinha', 'generica-80', 'EscPosEpson', 'rede', '10.0.0.9:9100', now()
returning id as impressora \gset
insert into public.impressoes (loja_id, impressora_id, tipo, motivo, titulo, conteudo, status, criado_em)
values ((select id from ids where k = 'loja'), :'impressora', 'cozinha', 'aceite', 'Pedido 1', '{}', 'pendente', now() - interval '8 minutes'),
       ((select id from ids where k = 'loja'), :'impressora', 'cozinha', 'aceite', 'Pedido 2', '{}', 'pendente', now() - interval '1 minute');
insert into private.erros_app (hash, hora, origem, mensagem, caminho, primeiro_em, ultimo_em) values
  ('h-velho', date_trunc('hour', now() - interval '2 days'), 'navegador', 'Erro velho', '/pedidos', now() - interval '2 days', now() - interval '2 days'),
  ('h-velho', date_trunc('hour', now()), 'navegador', 'Erro velho', '/pedidos', now() - interval '3 minutes', now()),
  ('h-novo', date_trunc('hour', now()), 'servidor', 'Erro novo de verdade', '/caixa', now() - interval '2 minutes', now());
insert into private.marketplace_eventos (canal, evento_id, codigo, corpo, recebido_em, erro, tentativas) values
  ('ifood', 'al-parado', 'PLC', '{}', now() - interval '20 minutes', 'iFood pedido X: HTTP 500', 5);

-- 1. o que é alerta
create temp table p1 as select * from private.alertas_pendentes(now());
do $$ begin
  if (select string_agg(tipo || ':' || left(chave, 6), ',' order by tipo) from p1 where chave in ('h-novo', 'h-velho', 'ifood:al-parado') or tipo = 'impressao')
     <> 'app:ifood:,erro:h-novo,impressao:' || left((select id::text from ids where k = 'loja'), 6) then
    raise exception 'pendentes errados: %', (select string_agg(tipo || ' ' || chave, ', ') from p1);
  end if;
  if (select texto from p1 where tipo = 'impressao') not like '%Loja Alerta: 1 cupom(ns)%' then raise exception 'texto da impressão: %', (select texto from p1 where tipo = 'impressao'); end if;
end $$;

-- 2. sem chave no Vault: não envia e não marca como enviado
select private.alertas_tique();
do $$ begin
  if exists (select 1 from net.chamadas) or exists (select 1 from private.alertas_enviados where chave = 'h-novo') then
    raise exception 'sem configuração não devia enviar nem marcar';
  end if;
end $$;

-- 3. com e-mail e WhatsApp: uma mensagem por canal, com os 3 alertas, e não repete na rodada seguinte
insert into vault.decrypted_secrets values ('alerta_resend_chave', 're_teste'), ('alerta_email_para', 'equipe@example.com, dono@example.com'),
  ('alerta_whatsapp_numero', '+55 (47) 99999-0000'), ('alerta_callmebot_chave', '123456');
select private.alertas_tique();
select private.alertas_tique();
do $$
declare e net.chamadas; w net.chamadas;
begin
  if (select count(*) from net.chamadas) <> 2 then raise exception 'esperava 2 envios, veio %', (select count(*) from net.chamadas); end if;
  select * into e from net.chamadas where url like '%resend%';
  select * into w from net.chamadas where url like '%callmebot%';
  if e.cabecalhos ->> 'Authorization' <> 'Bearer re_teste' or e.corpo -> 'to' <> '["equipe@example.com","dono@example.com"]'::jsonb then raise exception 'e-mail errado: %', e.corpo; end if;
  if e.corpo ->> 'text' not like '%Erro novo (servidor): Erro novo de verdade%' or e.corpo ->> 'text' like '%Erro velho%' then raise exception 'texto do e-mail: %', e.corpo ->> 'text'; end if;
  if w.params ->> 'phone' <> '5547999990000' or w.params ->> 'apikey' <> '123456' or w.params ->> 'text' not like '%Impressão parada%' then raise exception 'WhatsApp errado: %', w.params; end if;
end $$;

-- 4. teste manual: só a equipe RES; diz os canais
set role authenticated;
do $$ begin
  begin perform public.testar_alertas(); raise exception 'devia negar';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
insert into private.equipe_res (user_id) values ('00000000-0000-0000-0000-00000000a1e7');
set role authenticated;
do $$ begin
  if public.testar_alertas() <> array['email', 'whatsapp'] then raise exception 'testar_alertas: canais'; end if;
end $$;
reset role;

rollback;
\o
select 'ok alertas: erro novo, impressão parada e app parado vão por e-mail e WhatsApp, uma vez só' as resultado;
