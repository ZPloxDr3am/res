-- Testes de 0012: pedidos agendados (cardápio digital e painel) e taxa por bairro no painel.
-- Fê é dona da Loja F; o cliente é anônimo.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a8', 'fe@example.com');

create or replace function pg_temp.como(p_user text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user, false);
  execute 'set role authenticated';
end; $$;
create or replace function pg_temp.anonimo() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  execute 'set role anon';
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
grant all on ids to authenticated, anon;
create or replace function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where chave = p $$;
create temp table saida (chave text primary key, v jsonb);
grant all on saida to authenticated, anon;

-- ---------------------------------------------------------------- montagem
select from pg_temp.como('00000000-0000-0000-0000-0000000000a8');
insert into ids values ('loja', public.criar_loja('Loja F', 'Pizzaria F', 'pizzaria-f', 'Fê'));
insert into ids select 'marca', id from public.marcas where slug = 'pizzaria-f';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Bebidas'));
insert into ids values ('refri', public.criar_produto(pg_temp.id('loja'), 'Refri', pg_temp.id('setor'), 10));
-- só sexta, 18:00–02:00; agenda até 2 dias à frente
select from public.salvar_config_delivery(pg_temp.id('marca'), '{
  "status": "auto", "agendamento_dias": 2, "formas_pagamento": ["pix"],
  "horarios": [{"dia": 5, "abre": "18:00", "fecha": "02:00"}],
  "areas": [{"bairro": "Centro", "taxa": 7}, {"bairro": "Praia", "taxa": 4, "ativo": false}]
}');
reset role;
do $$ begin
  if (select agendamento_dias from public.marcas where id = pg_temp.id('marca')) <> 2 then raise exception 'agendamento_dias não salvo'; end if;
end $$;

-- ---------------------------------------------------------------- horários disponíveis (agora fixo)
-- Sexta 23/10/2026 17:00 (−03), preparo 30 min → primeiro horário 18:00 (abre), último 01:45 de sábado.
do $$
declare
  m uuid := pg_temp.id('marca');
  h timestamptz[] := private.horarios_agendamento(m, '2026-10-23 17:00:00-03');
begin
  if cardinality(h) <> 32 then raise exception 'esperava 32 horários, veio %: %', cardinality(h), h; end if;
  if h[1] <> '2026-10-23 18:00:00-03' or h[32] <> '2026-10-24 01:45:00-03' then raise exception 'primeiro/último: % / %', h[1], h[32]; end if;
  -- às 18:50 o primeiro horário é 19:30 (18:50 + 30 = 19:20 → arredonda para 19:30)
  h := private.horarios_agendamento(m, '2026-10-23 18:50:00-03');
  if h[1] <> '2026-10-23 19:30:00-03' then raise exception 'arredondamento: %', h[1]; end if;
  -- quarta 21/10 10:00: dois dias à frente não alcançam a sexta 18:00
  if cardinality(private.horarios_agendamento(m, '2026-10-21 10:00:00-03')) <> 0 then raise exception 'quarta não deveria ter horários'; end if;
end $$;

-- validar_agendamento
select from pg_temp.esperar_erro($q$select private.validar_agendamento(pg_temp.id('marca'), '2026-10-23 17:20:00-03', '2026-10-23 17:00:00-03')$q$, 'a partir de 17:30');
select from pg_temp.esperar_erro($q$select private.validar_agendamento(pg_temp.id('marca'), '2026-10-30 19:00:00-03', '2026-10-23 17:00:00-03')$q$, 'até 2 dia');
select from pg_temp.esperar_erro($q$select private.validar_agendamento(pg_temp.id('marca'), '2026-10-24 12:00:00-03', '2026-10-23 17:00:00-03')$q$, 'não funciona');
select private.validar_agendamento(pg_temp.id('marca'), '2026-10-23 20:00:00-03', '2026-10-23 17:00:00-03');
update public.marcas set agendamento_dias = 0 where id = pg_temp.id('marca');
select from pg_temp.esperar_erro($q$select private.validar_agendamento(pg_temp.id('marca'), '2026-10-23 20:00:00-03', '2026-10-23 17:00:00-03')$q$, 'não aceita');
do $$ begin
  if cardinality(private.horarios_agendamento(pg_temp.id('marca'), '2026-10-23 17:00:00-03')) <> 0 then raise exception 'sem agendamento: lista deveria ser vazia'; end if;
end $$;

-- ---------------------------------------------------------------- pedido agendado pelo cliente (agora real)
-- Funciona todos os dias 00:00–23:59, mas está "fechado agora" no botão.
update public.marcas set agendamento_dias = 2, status_cardapio = 'fechado' where id = pg_temp.id('marca');
insert into public.marca_horarios (loja_id, marca_id, dia_semana, abre, fecha)
select pg_temp.id('loja'), pg_temp.id('marca'), d, '00:00', '23:59' from generate_series(0, 6) d
on conflict do nothing;
update public.lojas set aceite_automatico = true where id = pg_temp.id('loja');
insert into saida values ('quando', to_jsonb(date_trunc('hour', now()) + interval '3 hours'));

select from pg_temp.anonimo();
do $$
declare r jsonb := public.horarios_agendamento('Pizzaria-F');
begin
  if (r ->> 'dias')::int <> 2 or jsonb_array_length(r -> 'horarios') = 0 then raise exception 'horarios_agendamento público: %', left(r::text, 200); end if;
  if public.horarios_agendamento('nao-existe') is not null then raise exception 'slug inexistente deveria dar null'; end if;
end $$;
-- fechado e sem horário → recusa
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizzaria-f', '{"tipo":"retirada","cliente":{"nome":"Ana","telefone":"48911112222"},"pagamento":"pix","itens":[{"produto_id":"%s","quantidade":1}]}')$q$, pg_temp.id('refri')), 'fechada');
-- horário no passado → recusa
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizzaria-f', '{"tipo":"retirada","agendado_para":"%s","cliente":{"nome":"Ana","telefone":"48911112222"},"pagamento":"pix","itens":[{"produto_id":"%s","quantidade":1}]}')$q$, now() - interval '1 hour', pg_temp.id('refri')), 'a partir de');
-- fechado agora, mas agendado → aceita
insert into saida values ('ped', public.criar_pedido_publico('pizzaria-f', jsonb_build_object(
  'tipo', 'entrega', 'agendado_para', (select v from saida where chave = 'quando'),
  'cliente', jsonb_build_object('nome', 'Ana', 'telefone', '48911112222'),
  'endereco', jsonb_build_object('logradouro', 'Rua A', 'bairro', 'centro'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('refri'), 'quantidade', 2)))));
-- bairro inativo continua recusado
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizzaria-f', '{"tipo":"entrega","agendado_para":%s,"cliente":{"nome":"Ana","telefone":"48911113333"},"endereco":{"logradouro":"R","bairro":"Praia"},"pagamento":"pix","itens":[{"produto_id":"%s","quantidade":1}]}')$q$, (select v from saida where chave = 'quando'), pg_temp.id('refri')), 'Ainda não entregamos');
do $$
declare a jsonb := public.acompanhar_pedido(((select v from saida where chave = 'ped') ->> 'codigo')::uuid);
begin
  if (a ->> 'agendado_para')::timestamptz <> ((select v from saida where chave = 'quando') #>> '{}')::timestamptz then raise exception 'acompanhar sem agendado_para: %', a; end if;
  if a ->> 'fuso' <> 'America/Sao_Paulo' then raise exception 'acompanhar sem fuso'; end if;
end $$;
reset role;
do $$
declare p record;
begin
  select * into p from public.pedidos where codigo = ((select v from saida where chave = 'ped') ->> 'codigo')::uuid;
  -- aceite automático ligado, mas agendado entra como "novo"
  if p.status <> 'novo' or p.aceito_em is not null then raise exception 'agendado não deveria ser aceito sozinho: %', p.status; end if;
  if p.taxa_entrega <> 7 or p.total <> 27 then raise exception 'taxa/total do agendado: % / %', p.taxa_entrega, p.total; end if;
  if (select motivo from public.pedido_eventos where pedido_id = p.id) <> 'Agendado' then raise exception 'evento sem motivo Agendado'; end if;
end $$;

-- ---------------------------------------------------------------- painel: taxa do bairro e agendamento
select from pg_temp.como('00000000-0000-0000-0000-0000000000a8');
do $$
declare
  base jsonb := jsonb_build_object('tipo', 'entrega', 'cliente', jsonb_build_object('nome', 'Telefone'), 'pagamento', 'dinheiro',
                                   'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('refri'), 'quantidade', 1)));
  v uuid;
begin
  -- sem taxa informada → taxa do bairro (sem diferença de maiúsculas/espaços)
  v := public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), base || '{"endereco": {"logradouro": "Rua 1", "bairro": "  CENTRO "}}');
  if (select (taxa_entrega, total, status) from public.pedidos where id = v) <> (7::numeric, 17::numeric, 'em_preparo'::public.status_pedido) then
    raise exception 'taxa automática: %', (select (taxa_entrega, total, status) from public.pedidos where id = v);
  end if;
  -- taxa informada vence o cadastro (inclusive zero)
  v := public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), base || '{"endereco": {"logradouro": "Rua 1", "bairro": "Centro"}, "taxa_entrega": 0}');
  if (select taxa_entrega from public.pedidos where id = v) <> 0 then raise exception 'taxa informada 0 deveria valer'; end if;
  -- bairro fora da área e sem taxa → 0 (a equipe decide)
  v := public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), base || '{"endereco": {"logradouro": "Rua 1", "bairro": "Outro"}}');
  if (select taxa_entrega from public.pedidos where id = v) <> 0 then raise exception 'bairro desconhecido deveria dar 0'; end if;
  -- agendado pelo painel: entra como novo, sem regra de horário
  v := public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'),
         base || jsonb_build_object('endereco', jsonb_build_object('logradouro', 'Rua 1', 'bairro', 'Centro'), 'agendado_para', now() + interval '5 days'));
  if (select (status, agendado_para is not null) from public.pedidos where id = v) <> ('novo'::public.status_pedido, true) then
    raise exception 'agendado do painel';
  end if;
end $$;
select from pg_temp.esperar_erro(format($q$select public.criar_pedido('%s', '%s', '{"tipo":"retirada","agendado_para":"%s","cliente":{"nome":"X"},"pagamento":"pix","itens":[{"produto_id":"%s","quantidade":1}]}')$q$,
  pg_temp.id('loja'), pg_temp.id('marca'), now() - interval '1 minute', pg_temp.id('refri')), '30 dias');
select from pg_temp.esperar_erro(format($q$select public.criar_pedido('%s', '%s', '{"tipo":"retirada","agendado_para":"%s","cliente":{"nome":"X"},"pagamento":"pix","itens":[{"produto_id":"%s","quantidade":1}]}')$q$,
  pg_temp.id('loja'), pg_temp.id('marca'), now() + interval '31 days', pg_temp.id('refri')), '30 dias');
-- configuração: fora de 0..7 é recusado
select from pg_temp.esperar_erro(format($q$select public.salvar_config_delivery('%s', '{"agendamento_dias": 8}')$q$, pg_temp.id('marca')), 'agendamento_dias');
reset role;

\o
\pset tuples_only on
select 'OK: agendamento e taxa por bairro';
