-- Testes do cardápio digital (0006): leitura pública, pedido do cliente, horários, acompanhamento.
-- Gil é dono da Loja E; o cliente é anônimo (sem login).
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a7', 'gil@example.com');

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
select from pg_temp.como('00000000-0000-0000-0000-0000000000a7');
insert into ids values ('loja', public.criar_loja('Loja E', 'Pizzaria E', 'pizzaria-e', 'Gil'));
insert into ids select 'marca', id from public.marcas where slug = 'pizzaria-e';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('setor_salao', public.salvar_setor(pg_temp.id('loja'), null, 'Só no salão', null, false, true));
insert into ids values ('pizza', public.criar_produto(pg_temp.id('loja'), 'Pizza', pg_temp.id('setor'), null));
insert into ids values ('refri', public.criar_produto(pg_temp.id('loja'), 'Refri', pg_temp.id('setor'), 8));
insert into ids values ('vinho', public.criar_produto(pg_temp.id('loja'), 'Vinho', pg_temp.id('setor_salao'), 90));
insert into ids values ('acabou', public.criar_produto(pg_temp.id('loja'), 'Calzone', pg_temp.id('setor'), 40));
insert into ids values ('sabores', public.criar_grupo_vinculado(pg_temp.id('pizza'), 'Sabores', 'proporcional', true, 1, 2, true,
  '[{"nome":"Calabresa","preco":60},{"nome":"Camarão","preco":90}]'));
insert into ids select 'calabresa', id from public.opcoes where nome = 'Calabresa' and grupo_id = pg_temp.id('sabores');
insert into ids select 'camarao', id from public.opcoes where nome = 'Camarão' and grupo_id = pg_temp.id('sabores');
update public.produtos set etiqueta = 'esgotado' where id = pg_temp.id('acabou');
update public.produto_marcas set preco_promocional = 6 where produto_id = pg_temp.id('refri');

select from public.salvar_config_delivery(pg_temp.id('marca'), '{
  "status": "aberto", "pedido_minimo": 20, "aceita_entrega": true, "aceita_retirada": true,
  "formas_pagamento": ["dinheiro", "pix"], "mensagem": "Bem-vindo!",
  "horarios": [{"dia": 5, "abre": "18:00", "fecha": "02:00"}, {"dia": 6, "abre": "18:00", "fecha": "23:30"}],
  "areas": [{"bairro": "Centro", "taxa": 5}, {"bairro": "Trindade", "taxa": 8.5}, {"bairro": "Longe", "taxa": 20, "ativo": false}]
}');
reset role;

-- ---------------------------------------------------------------- cardápio público (anônimo)
select from pg_temp.anonimo();
insert into saida values ('cardapio', public.cardapio_publico('Pizzaria-E'));
do $$
declare c jsonb := (select v from saida where chave = 'cardapio');
begin
  if c is null then raise exception 'cardapio_publico: não achou pelo slug'; end if;
  if (c #>> '{marca,nome}') <> 'Pizzaria E' or (c #>> '{marca,aberta}')::boolean is not true then raise exception 'marca: %', c -> 'marca'; end if;
  if (c #>> '{marca,pedido_minimo}')::int <> 2000 then raise exception 'pedido mínimo em centavos'; end if;
  if jsonb_array_length(c #> '{marca,areas}') <> 2 then raise exception 'bairro inativo não deveria aparecer'; end if;
  if jsonb_array_length(c -> 'setores') <> 1 then raise exception 'setor só do salão não deveria aparecer: %', c -> 'setores'; end if;
  if (select string_agg(p ->> 'nome', ',' order by p ->> 'nome') from jsonb_array_elements(c #> '{setores,0,produtos}') p) <> 'Calzone,Pizza,Refri' then
    raise exception 'produtos: %', c #> '{setores,0,produtos}';
  end if;
  if (select (p ->> 'preco')::int from jsonb_array_elements(c #> '{setores,0,produtos}') p where p ->> 'nome' = 'Refri') <> 600
     or (select (p ->> 'preco_original')::int from jsonb_array_elements(c #> '{setores,0,produtos}') p where p ->> 'nome' = 'Refri') <> 800 then
    raise exception 'promoção não aplicada no público';
  end if;
  if (select jsonb_array_length(p #> '{grupos,0,opcoes}') from jsonb_array_elements(c #> '{setores,0,produtos}') p where p ->> 'nome' = 'Pizza') <> 2 then
    raise exception 'opções da pizza';
  end if;
end $$;
do $$ begin
  if public.cardapio_publico('nao-existe') is not null then raise exception 'slug inexistente deveria dar null'; end if;
end $$;
-- O anônimo não lê tabelas direto: a RLS não devolve nada.
do $$ begin
  if exists (select 1 from public.produtos) or exists (select 1 from public.marcas) or exists (select 1 from public.areas_entrega) then
    raise exception 'RLS: anônimo leu tabela direto';
  end if;
end $$;
reset role;

-- ---------------------------------------------------------------- pedido do cliente
select from pg_temp.anonimo();
insert into saida values ('ped', public.criar_pedido_publico('pizzaria-e', jsonb_build_object(
  'tipo', 'entrega',
  'cliente', jsonb_build_object('nome', 'Cliente Web', 'telefone', '(48) 98888-1111'),
  'endereco', jsonb_build_object('logradouro', 'Rua B', 'numero', '5', 'bairro', ' centro '),
  'itens', jsonb_build_array(
     jsonb_build_object('produto_id', pg_temp.id('pizza'), 'quantidade', 1,
        'escolhas', jsonb_build_object(pg_temp.id('sabores'), jsonb_build_object(pg_temp.id('calabresa'), 1, pg_temp.id('camarao'), 1))),
     jsonb_build_object('produto_id', pg_temp.id('refri'), 'quantidade', 2)),
  'taxa_entrega', 0.01, 'desconto', 50,   -- o cliente não manda em taxa nem desconto
  'pagamento', 'dinheiro', 'troco_para', 100)));
reset role;
do $$
declare r jsonb := (select v from saida where chave = 'ped'); p record;
begin
  select * into p from public.pedidos where codigo = (r ->> 'codigo')::uuid;
  -- pizza meio a meio (60+90)/2 = 75 + 2 refri promo 6 = 87; taxa do Centro 5; sem desconto → 92
  if p.subtotal <> 87 or p.taxa_entrega <> 5 or p.desconto <> 0 or p.total <> 92 then
    raise exception 'pedido público: sub % taxa % desc % total %', p.subtotal, p.taxa_entrega, p.desconto, p.total;
  end if;
  if p.origem <> 'cardapio_digital' or p.criado_por is not null or p.endereco ->> 'bairro' <> 'centro' then
    raise exception 'pedido público: origem/bairro %/%', p.origem, p.endereco;
  end if;
  if (r ->> 'total')::int <> 9200 then raise exception 'retorno total %', r; end if;
end $$;

-- Recusas do pedido público.
select from pg_temp.anonimo();
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizzaria-e', '{"tipo":"entrega","cliente":{"nome":"X Y","telefone":"48988881112"},"endereco":{"logradouro":"R","bairro":"Longe"},"pagamento":"pix","itens":[{"produto_id":"%s","quantidade":5}]}')$q$, pg_temp.id('refri')), 'Ainda não entregamos');
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizzaria-e', '{"tipo":"retirada","cliente":{"nome":"X Y","telefone":"48988881112"},"pagamento":"cartao_credito","itens":[{"produto_id":"%s","quantidade":5}]}')$q$, pg_temp.id('refri')), 'Forma de pagamento');
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizzaria-e', '{"tipo":"retirada","cliente":{"nome":"X Y","telefone":"123"},"pagamento":"pix","itens":[{"produto_id":"%s","quantidade":5}]}')$q$, pg_temp.id('refri')), 'telefone');
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizzaria-e', '{"tipo":"retirada","cliente":{"nome":"X Y","telefone":"48988881112"},"pagamento":"pix","itens":[{"produto_id":"%s","quantidade":1}]}')$q$, pg_temp.id('refri')), 'pedido mínimo');
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizzaria-e', '{"tipo":"retirada","cliente":{"nome":"X Y","telefone":"48988881112"},"pagamento":"pix","itens":[{"produto_id":"%s","quantidade":1}]}')$q$, pg_temp.id('vinho')), 'não está disponível');
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizzaria-e', '{"tipo":"retirada","cliente":{"nome":"X Y","telefone":"48988881112"},"pagamento":"pix","itens":[{"produto_id":"%s","quantidade":1}]}')$q$, pg_temp.id('acabou')), 'não está disponível');
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizzaria-e', '{"tipo":"balcao","cliente":{"nome":"X Y","telefone":"48988881112"},"pagamento":"pix","itens":[{"produto_id":"%s","quantidade":5}]}')$q$, pg_temp.id('refri')), 'não está disponível');
select from pg_temp.esperar_erro(format($q$select public.criar_pedido('%s', '%s', '{}')$q$, pg_temp.id('loja'), pg_temp.id('marca')), 'permission denied');
reset role;
do $$ begin
  if (select count(*) from public.pedidos where loja_id = pg_temp.id('loja')) <> 1 then raise exception 'pedido recusado ficou gravado'; end if;
end $$;

-- Limite anti-repetição: 3 pedidos em 10 min do mesmo telefone; o 4º é recusado.
select from pg_temp.anonimo();
select public.criar_pedido_publico('pizzaria-e', jsonb_build_object('tipo', 'retirada', 'cliente', jsonb_build_object('nome', 'Rep', 'telefone', '48977770000'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('refri'), 'quantidade', 4)))) from generate_series(1, 3);
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizzaria-e', '{"tipo":"retirada","cliente":{"nome":"Rep","telefone":"48977770000"},"pagamento":"pix","itens":[{"produto_id":"%s","quantidade":4}]}')$q$, pg_temp.id('refri')), 'vários pedidos');
reset role;

-- ---------------------------------------------------------------- acompanhamento
select from pg_temp.anonimo();
do $$
declare a jsonb := public.acompanhar_pedido(((select v from saida where chave = 'ped') ->> 'codigo')::uuid);
begin
  if a ->> 'status' <> 'novo' or (a ->> 'total')::int <> 9200 or jsonb_array_length(a -> 'itens') <> 2 then raise exception 'acompanhar: %', a; end if;
  if a ? 'cliente_telefone' or a ? 'endereco' then raise exception 'acompanhar não deve expor dados pessoais'; end if;
  if public.acompanhar_pedido(gen_random_uuid()) is not null then raise exception 'código errado deveria dar null'; end if;
end $$;
reset role;

-- ---------------------------------------------------------------- loja fechada e horários
select from pg_temp.como('00000000-0000-0000-0000-0000000000a7');
select from public.salvar_config_delivery(pg_temp.id('marca'), '{"status": "fechado"}');
do $$ begin
  if (select (pedido_minimo, mensagem_cardapio, formas_pagamento::text[]) from public.marcas where id = pg_temp.id('marca'))
     <> (20::numeric, 'Bem-vindo!'::text, array['dinheiro','pix']) then
    raise exception 'só o status deveria mudar: %', (select (pedido_minimo, mensagem_cardapio, formas_pagamento) from public.marcas where id = pg_temp.id('marca'));
  end if;
end $$;
reset role;
select from pg_temp.anonimo();
select from pg_temp.esperar_erro(format($q$select public.criar_pedido_publico('pizzaria-e', '{"tipo":"retirada","cliente":{"nome":"X Y","telefone":"48988881113"},"pagamento":"pix","itens":[{"produto_id":"%s","quantidade":5}]}')$q$, pg_temp.id('refri')), 'fechada');
reset role;

update public.marcas set status_cardapio = 'auto' where id = pg_temp.id('marca');
do $$
declare m uuid := pg_temp.id('marca');
begin
  -- sexta (dow 5) 18:00–02:00 e sábado 18:00–23:30, em America/Sao_Paulo (UTC−3)
  if not private.marca_aberta(m, '2026-10-23 22:00:00-03') then raise exception 'sexta 22h deveria estar aberta'; end if;
  if not private.marca_aberta(m, '2026-10-24 01:30:00-03') then raise exception 'madrugada de sábado (resto da sexta) deveria estar aberta'; end if;
  if private.marca_aberta(m, '2026-10-24 02:00:00-03') then raise exception 'sábado 02h deveria estar fechada'; end if;
  if private.marca_aberta(m, '2026-10-23 17:59:00-03') then raise exception 'sexta 17:59 deveria estar fechada'; end if;
  if not private.marca_aberta(m, '2026-10-24 23:00:00-03') then raise exception 'sábado 23h deveria estar aberta'; end if;
  if private.marca_aberta(m, '2026-10-25 00:30:00-03') then raise exception 'domingo 00:30 deveria estar fechada (sábado fecha 23:30)'; end if;
  if private.marca_aberta(m, '2026-10-21 20:00:00-03') then raise exception 'quarta sem horário deveria estar fechada'; end if;
end $$;

-- ---------------------------------------------------------------- configuração: permissão e validação
select from pg_temp.como('00000000-0000-0000-0000-0000000000e1');  -- Eli (de outra loja)
select from pg_temp.esperar_erro(format($q$select public.salvar_config_delivery('%s', '{"status":"aberto"}')$q$, pg_temp.id('marca')), 'permissão');
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000000a7');
select from pg_temp.esperar_erro(format($q$select public.salvar_config_delivery('%s', '{"aceita_entrega": false, "aceita_retirada": false}')$q$, pg_temp.id('marca')), 'pelo menos');
select from pg_temp.esperar_erro(format($q$select public.salvar_config_delivery('%s', '{"formas_pagamento": ["online"]}')$q$, pg_temp.id('marca')), 'formas_pagamento');
select from pg_temp.esperar_erro(format($q$select public.salvar_config_delivery('%s', '{"horarios": [{"dia": 1, "abre": "10:00", "fecha": "10:00"}]}')$q$, pg_temp.id('marca')), 'check');
select from pg_temp.esperar_erro(format($q$select public.salvar_config_delivery('%s', '{"areas": [{"bairro": "Centro"}, {"bairro": "centro "}]}')$q$, pg_temp.id('marca')), '23505');
reset role;

-- O painel continua lançando pedidos pelo criar_pedido de sempre.
select from pg_temp.como('00000000-0000-0000-0000-0000000000a7');
do $$ begin
  perform public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'balcao', 'cliente', jsonb_build_object('nome', 'Mesa 1'),
    'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('vinho'), 'quantidade', 1))));
  if (select origem from public.pedidos where loja_id = pg_temp.id('loja') order by numero desc limit 1) <> 'painel' then raise exception 'origem do painel'; end if;
end $$;
reset role;

\o
\pset tuples_only on
select 'OK: cardápio digital';
