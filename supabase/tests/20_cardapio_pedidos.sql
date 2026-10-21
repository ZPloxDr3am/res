-- Testes da edição do cardápio (0004) e dos pedidos (0005).
-- Usuários: Davi (dono da Loja C), Eli (funcionário da Loja C sem "pedidos_delivery"), Fia (dona da Loja D).
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000d1', 'davi@example.com'),
  ('00000000-0000-0000-0000-0000000000e1', 'eli@example.com'),
  ('00000000-0000-0000-0000-0000000000f1', 'fia@example.com');

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
grant all on ids to authenticated, anon;
create or replace function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where chave = p $$;

-- ---------------------------------------------------------------- montagem
select from pg_temp.como('00000000-0000-0000-0000-0000000000d1');
insert into ids values ('loja', public.criar_loja('Loja C', 'Pizzaria C', 'pizzaria-c', 'Davi'));
insert into ids select 'marca', id from public.marcas where slug = 'pizzaria-c';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('grande', public.criar_produto(pg_temp.id('loja'), 'Pizza Grande', pg_temp.id('setor'), 0));
insert into ids values ('media', public.criar_produto(pg_temp.id('loja'), 'Pizza Média', pg_temp.id('setor'), 0));
insert into ids values ('refri', public.criar_produto(pg_temp.id('loja'), 'Refrigerante', pg_temp.id('setor'), 8));
insert into ids values ('sabores', public.criar_grupo_vinculado(pg_temp.id('grande'), 'Sabores', 'proporcional', true, 1, 2, true,
  '[{"nome":"Calabresa","preco":40},{"nome":"Quatro queijos","preco":50},{"nome":"Borda","preco":9}]'));
insert into ids select 'calabresa', id from public.opcoes where nome = 'Calabresa';
insert into ids select 'queijos', id from public.opcoes where nome = 'Quatro queijos';
insert into ids select 'borda', id from public.opcoes where nome = 'Borda';
reset role;

-- ---------------------------------------------------------------- 0004: grupos
select from pg_temp.como('00000000-0000-0000-0000-0000000000d1');

-- Reaproveitar "Sabores" na Pizza Média (um grupo, dois produtos).
select from public.vincular_grupo(pg_temp.id('media'), pg_temp.id('sabores'));
select from public.vincular_grupo(pg_temp.id('media'), pg_temp.id('sabores')); -- repetir não duplica
do $$ begin
  if (select count(*) from public.produto_grupos where grupo_id = pg_temp.id('sabores')) <> 2 then
    raise exception 'vincular_grupo: deveria estar em 2 produtos';
  end if;
end $$;

-- Salvar: renomeia uma opção, remove a borda, cria Portuguesa e reordena.
select from public.salvar_grupo(pg_temp.id('sabores'), 'Sabores', 'proporcional', true, 1, 2, true, false,
  jsonb_build_array(
    jsonb_build_object('id', pg_temp.id('queijos'), 'nome', 'Quatro Queijos', 'preco', 50),
    jsonb_build_object('id', pg_temp.id('calabresa'), 'nome', 'Calabresa', 'preco', 40),
    jsonb_build_object('nome', 'Portuguesa', 'preco', 45)));
do $$ begin
  if exists (select 1 from public.opcoes where id = pg_temp.id('borda')) then raise exception 'salvar_grupo: borda deveria sair'; end if;
  if (select string_agg(nome, ',' order by ordem) from public.opcoes where grupo_id = pg_temp.id('sabores')) <> 'Quatro Queijos,Calabresa,Portuguesa' then
    raise exception 'salvar_grupo: ordem/nomes errados: %', (select string_agg(nome, ',' order by ordem) from public.opcoes where grupo_id = pg_temp.id('sabores'));
  end if;
end $$;
select from pg_temp.esperar_erro(
  format($q$select public.salvar_grupo(%L, 'X', 'soma', true, 0, 1, false, false, '[{"nome":"a"}]')$q$, pg_temp.id('sabores')),
  'grupo_obrigatorio_min');
select from pg_temp.esperar_erro(
  format($q$select public.salvar_grupo(%L, 'X', 'soma', false, 0, 1, false, false, '[]')$q$, pg_temp.id('sabores')),
  'pelo menos uma opção');

-- Reordenar produtos.
select from public.reordenar('produtos', array[pg_temp.id('refri'), pg_temp.id('media'), pg_temp.id('grande')]);
do $$ begin
  if (select ordem from public.produtos where id = pg_temp.id('refri')) <> 0
     or (select ordem from public.produtos where id = pg_temp.id('grande')) <> 2 then
    raise exception 'reordenar: ordem não aplicada';
  end if;
end $$;
select from pg_temp.esperar_erro($q$select public.reordenar('membros', array[]::uuid[])$q$, 'não pode ser reordenada');

-- Desvincular tira o grupo do produto; desde a 0007 o grupo fica na biblioteca para reusar.
insert into ids values ('tmp_grupo', public.criar_grupo_vinculado(pg_temp.id('refri'), 'Gelo', 'brinde', false, 0, 1, false, '[{"nome":"Com gelo"}]'));
select from public.desvincular_grupo(pg_temp.id('refri'), pg_temp.id('tmp_grupo'));
do $$ begin
  if exists (select 1 from public.produto_grupos where grupo_id = pg_temp.id('tmp_grupo')) then raise exception 'desvincular: vínculo deveria sair'; end if;
  if not exists (select 1 from public.grupos_opcoes where id = pg_temp.id('tmp_grupo')) then raise exception 'desvincular: grupo deveria ficar na biblioteca'; end if;
end $$;
delete from public.grupos_opcoes where id = pg_temp.id('tmp_grupo');
reset role;

-- Fia (outra loja) não mexe nos grupos da Loja C.
select from pg_temp.como('00000000-0000-0000-0000-0000000000f1');
insert into ids values ('loja_d', public.criar_loja('Loja D', 'Pizzaria D', 'pizzaria-d', 'Fia'));
select from pg_temp.esperar_erro(format($q$select public.salvar_grupo(%L, 'Hack', 'soma', false, 0, 1, false, false, '[{"nome":"x"}]')$q$, pg_temp.id('sabores')), 'não encontrado');
select from pg_temp.esperar_erro(format($q$select public.vincular_grupo(%L, %L)$q$, pg_temp.id('media'), pg_temp.id('sabores')), 'não encontrado');
reset role;

-- ---------------------------------------------------------------- 0005: preço no banco = preço no núcleo (paridade D-009)
-- Mesmos exemplos de packages/core/test/cardapio.test.ts (T-013, T-014).
do $$
declare r jsonb;
begin
  -- meio a meio de R$ 40 e R$ 50 = R$ 45 (proporcional)
  r := private.preco_item(pg_temp.id('grande'), pg_temp.id('marca'), 'delivery',
         jsonb_build_object(pg_temp.id('sabores'), jsonb_build_object(pg_temp.id('calabresa'), 1, pg_temp.id('queijos'), 1)));
  if (r ->> 'unitario')::int <> 4500 then raise exception 'T-013 proporcional: esperava 4500, veio %', r ->> 'unitario'; end if;
  if (select count(*) from jsonb_array_elements(r -> 'opcoes') o where (o ->> 'fracao')::numeric = 0.5) <> 2 then
    raise exception 'T-014: frações de meia pizza não registradas: %', r;
  end if;

  update public.grupos_opcoes set formacao = 'maior' where id = pg_temp.id('sabores');
  r := private.preco_item(pg_temp.id('grande'), pg_temp.id('marca'), 'delivery',
         jsonb_build_object(pg_temp.id('sabores'), jsonb_build_object(pg_temp.id('calabresa'), 1, pg_temp.id('queijos'), 1)));
  if (r ->> 'unitario')::int <> 5000 then raise exception 'T-013 maior: esperava 5000, veio %', r ->> 'unitario'; end if;

  update public.grupos_opcoes set formacao = 'soma' where id = pg_temp.id('sabores');
  r := private.preco_item(pg_temp.id('grande'), pg_temp.id('marca'), 'delivery',
         jsonb_build_object(pg_temp.id('sabores'), jsonb_build_object(pg_temp.id('calabresa'), 1, pg_temp.id('queijos'), 1)));
  if (r ->> 'unitario')::int <> 9000 then raise exception 'T-013 soma: esperava 9000, veio %', r ->> 'unitario'; end if;

  update public.grupos_opcoes set formacao = 'brinde' where id = pg_temp.id('sabores');
  r := private.preco_item(pg_temp.id('grande'), pg_temp.id('marca'), 'delivery',
         jsonb_build_object(pg_temp.id('sabores'), jsonb_build_object(pg_temp.id('calabresa'), 1)));
  if (r ->> 'unitario')::int <> 0 then raise exception 'T-013 brinde: esperava 0, veio %', r ->> 'unitario'; end if;

  -- 3 sabores de 10,00 / 10,00 / 10,01 proporcional = 10,00 (arredonda no centavo)
  update public.grupos_opcoes set formacao = 'proporcional', max_qtd = 3 where id = pg_temp.id('sabores');
  update public.opcoes set preco = 10 where id in (pg_temp.id('calabresa'), pg_temp.id('queijos'));
  update public.opcoes set preco = 10.01 where nome = 'Portuguesa' and grupo_id = pg_temp.id('sabores');
  r := private.preco_item(pg_temp.id('grande'), pg_temp.id('marca'), 'delivery',
         (select jsonb_build_object(pg_temp.id('sabores'), jsonb_object_agg(id, 1)) from public.opcoes where grupo_id = pg_temp.id('sabores')));
  if (r ->> 'unitario')::int <> 1000 then raise exception 'T-013 3 sabores: esperava 1000, veio %', r ->> 'unitario'; end if;

  -- volta ao estado do cardápio
  update public.grupos_opcoes set max_qtd = 2 where id = pg_temp.id('sabores');
  update public.opcoes set preco = 40 where id = pg_temp.id('calabresa');
  update public.opcoes set preco = 50 where id = pg_temp.id('queijos');

  -- preço base: promocional → canal → padrão
  update public.produto_marcas set preco_delivery = 9.5 where produto_id = pg_temp.id('refri');
  if (private.preco_item(pg_temp.id('refri'), pg_temp.id('marca'), 'delivery', '{}') ->> 'unitario')::int <> 950 then raise exception 'preço do canal'; end if;
  if (private.preco_item(pg_temp.id('refri'), pg_temp.id('marca'), 'presencial', '{}') ->> 'unitario')::int <> 800 then raise exception 'preço padrão'; end if;
  update public.produto_marcas set preco_promocional = 7 where produto_id = pg_temp.id('refri');
  if (private.preco_item(pg_temp.id('refri'), pg_temp.id('marca'), 'delivery', '{}') ->> 'unitario')::int <> 700 then raise exception 'preço promocional'; end if;
  update public.produto_marcas set preco_promocional = null, preco_delivery = null where produto_id = pg_temp.id('refri');
end $$;

-- Escolhas inválidas são recusadas com a mesma mensagem do núcleo.
select from pg_temp.esperar_erro(format($q$select private.preco_item(%L, %L, 'delivery', '{}')$q$, pg_temp.id('grande'), pg_temp.id('marca')), 'pelo menos 1');
select from pg_temp.esperar_erro(format($q$select private.preco_item(%L, %L, 'delivery', %L)$q$, pg_temp.id('grande'), pg_temp.id('marca'),
  jsonb_build_object(pg_temp.id('sabores'), jsonb_build_object(pg_temp.id('calabresa'), 2))), 'não pode repetir');
select from pg_temp.esperar_erro(format($q$select private.preco_item(%L, %L, 'delivery', %L)$q$, pg_temp.id('grande'), pg_temp.id('marca'),
  (select jsonb_build_object(pg_temp.id('sabores'), jsonb_object_agg(id, 1)) from public.opcoes where grupo_id = pg_temp.id('sabores'))), 'no máximo 2');
select from pg_temp.esperar_erro(format($q$select private.preco_item(%L, %L, 'delivery', %L)$q$, pg_temp.id('grande'), pg_temp.id('marca'),
  jsonb_build_object(pg_temp.id('sabores'), jsonb_build_object(gen_random_uuid(), 1))), 'indisponível');
select from pg_temp.esperar_erro(format($q$select private.preco_item(%L, %L, 'delivery', %L)$q$, pg_temp.id('refri'), pg_temp.id('marca'),
  jsonb_build_object(pg_temp.id('sabores'), jsonb_build_object(pg_temp.id('calabresa'), 1))), 'não pertence');

-- ---------------------------------------------------------------- 0005: criar pedido
select from pg_temp.como('00000000-0000-0000-0000-0000000000d1');
insert into ids values ('ped1', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object(
  'tipo', 'entrega',
  'cliente', jsonb_build_object('nome', 'Cliente 🍕', 'telefone', '(48) 99999-0000'),
  'endereco', jsonb_build_object('logradouro', 'Rua A', 'numero', '10', 'bairro', 'Centro'),
  'itens', jsonb_build_array(
     jsonb_build_object('produto_id', pg_temp.id('grande'), 'quantidade', 2,
        'escolhas', jsonb_build_object(pg_temp.id('sabores'), jsonb_build_object(pg_temp.id('calabresa'), 1, pg_temp.id('queijos'), 1))),
     jsonb_build_object('produto_id', pg_temp.id('refri'), 'quantidade', 1, 'preco', 0.01)),  -- preço enviado é ignorado
  'taxa_entrega', 7, 'desconto', 5, 'pagamento', 'dinheiro', 'troco_para', 100)));
do $$
declare p record;
begin
  select * into p from public.pedidos where id = pg_temp.id('ped1');
  -- 2 × 45,00 + 8,00 = 98,00; + 7,00 taxa − 5,00 desconto = 100,00
  if p.subtotal <> 98 or p.total <> 100 or p.taxa_entrega <> 7 or p.desconto <> 5 then
    raise exception 'criar_pedido: totais errados: sub % total %', p.subtotal, p.total;
  end if;
  if p.numero <> 1 or p.status <> 'novo' then raise exception 'criar_pedido: número/status %/%', p.numero, p.status; end if;
  if p.cliente_telefone <> '48999990000' then raise exception 'telefone não normalizado: %', p.cliente_telefone; end if;
  if p.cliente_nome <> 'Cliente 🍕' then raise exception 'emoji perdido no cliente'; end if;
  if (select count(*) from public.pedido_item_opcoes o join public.pedido_itens i on i.id = o.item_id where i.pedido_id = p.id) <> 2 then
    raise exception 'criar_pedido: opções do item não gravadas';
  end if;
  if (select string_agg(para::text, ',' order by id) from public.pedido_eventos where pedido_id = p.id) <> 'novo' then
    raise exception 'criar_pedido: evento inicial';
  end if;
end $$;

-- Retirada ignora a taxa; número sobe.
insert into ids values ('ped2', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object(
  'tipo', 'retirada', 'cliente', jsonb_build_object('nome', 'Balcão'),
  'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('refri'), 'quantidade', 3)),
  'taxa_entrega', 7, 'pagamento', 'pix')));
do $$ begin
  if (select (numero, taxa_entrega, total) from public.pedidos where id = pg_temp.id('ped2')) <> (2, 0::numeric, 24::numeric) then
    raise exception 'retirada: % ', (select (numero, taxa_entrega, total) from public.pedidos where id = pg_temp.id('ped2'));
  end if;
end $$;

-- Recusas
select from pg_temp.esperar_erro(format($q$select public.criar_pedido(%L, %L, '{"tipo":"entrega","cliente":{"nome":"X"},"pagamento":"pix","itens":[{"produto_id":"%s","quantidade":1}]}')$q$,
  pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.id('refri')), 'rua e bairro');
select from pg_temp.esperar_erro(format($q$select public.criar_pedido(%L, %L, '{"tipo":"retirada","cliente":{"nome":"X"},"pagamento":"pix","itens":[]}')$q$,
  pg_temp.id('loja'), pg_temp.id('marca')), 'pelo menos um item');
select from pg_temp.esperar_erro(format($q$select public.criar_pedido(%L, %L, '{"tipo":"retirada","cliente":{"nome":"X"},"pagamento":"pix","desconto":50,"itens":[{"produto_id":"%s","quantidade":1}]}')$q$,
  pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.id('refri')), 'desconto');
select from pg_temp.esperar_erro(format($q$select public.criar_pedido(%L, %L, '{"tipo":"retirada","cliente":{"nome":"X"},"pagamento":"dinheiro","troco_para":5,"itens":[{"produto_id":"%s","quantidade":1}]}')$q$,
  pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.id('refri')), 'troco');
select from pg_temp.esperar_erro(format($q$select public.criar_pedido(%L, %L, '{"tipo":"retirada","cliente":{"nome":"X"},"pagamento":"pix","itens":[{"produto_id":"%s","quantidade":1.5}]}')$q$,
  pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.id('refri')), '1 a 99');
-- pedido recusado não gasta número nem deixa rastro
do $$ begin
  if (select count(*) from public.pedidos where loja_id = pg_temp.id('loja')) <> 2 then raise exception 'pedido recusado ficou gravado'; end if;
end $$;
-- Ninguém escreve direto na tabela.
update public.pedidos set total = 0, subtotal = 0, taxa_entrega = 0, desconto = 0 where id = pg_temp.id('ped1'); -- RLS: 0 linhas
do $$ begin
  if (select total from public.pedidos where id = pg_temp.id('ped1')) <> 100 then raise exception 'RLS: total alterado direto'; end if;
end $$;
reset role;

-- ---------------------------------------------------------------- 0005: status
select from pg_temp.como('00000000-0000-0000-0000-0000000000d1');
select from pg_temp.esperar_erro(format($q$select public.mudar_status_pedido(%L, 'pronto')$q$, pg_temp.id('ped1')), 'Não dá para ir');
select from public.mudar_status_pedido(pg_temp.id('ped1'), 'em_preparo');
select from public.mudar_status_pedido(pg_temp.id('ped1'), 'pronto');
select from pg_temp.esperar_erro(format($q$select public.mudar_status_pedido(%L, 'concluido')$q$, pg_temp.id('ped1')), 'Não dá para ir'); -- entrega passa pela rua
select from public.mudar_status_pedido(pg_temp.id('ped1'), 'em_entrega');
select from public.mudar_status_pedido(pg_temp.id('ped1'), 'concluido');
select from pg_temp.esperar_erro(format($q$select public.mudar_status_pedido(%L, 'cancelado', 'x')$q$, pg_temp.id('ped1')), 'Não dá para ir');
select from pg_temp.esperar_erro(format($q$select public.mudar_status_pedido(%L, 'cancelado')$q$, pg_temp.id('ped2')), 'motivo');
select from public.mudar_status_pedido(pg_temp.id('ped2'), 'cancelado', 'Cliente desistiu');
do $$ begin
  if (select (aceito_em is not null and pronto_em is not null and saiu_em is not null and concluido_em is not null)
        from public.pedidos where id = pg_temp.id('ped1')) is not true then raise exception 'status: horários não registrados'; end if;
  if (select string_agg(para::text, ',' order by id) from public.pedido_eventos where pedido_id = pg_temp.id('ped1'))
     <> 'novo,em_preparo,pronto,em_entrega,concluido' then raise exception 'status: histórico errado'; end if;
  if (select motivo_cancelamento from public.pedidos where id = pg_temp.id('ped2')) <> 'Cliente desistiu' then raise exception 'motivo não gravado'; end if;
end $$;

-- Aceite automático: já nasce em preparo.
update public.lojas set aceite_automatico = true where id = pg_temp.id('loja');
insert into ids values ('ped3', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object(
  'tipo', 'balcao', 'cliente', jsonb_build_object('nome', 'Mesa'), 'pagamento', 'cartao_debito',
  'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('refri'), 'quantidade', 1)))));
do $$ begin
  if (select status from public.pedidos where id = pg_temp.id('ped3')) <> 'em_preparo' then raise exception 'aceite automático não aplicado'; end if;
end $$;
reset role;

-- ---------------------------------------------------------------- 0005: isolamento e permissão
select from pg_temp.como('00000000-0000-0000-0000-0000000000f1');
do $$ begin
  if exists (select 1 from public.pedidos) then raise exception 'RLS: Fia vê pedidos da Loja C'; end if;
end $$;
select from pg_temp.esperar_erro(format($q$select public.mudar_status_pedido(%L, 'cancelado', 'x')$q$, pg_temp.id('ped3')), 'não encontrado');
select from pg_temp.esperar_erro(format($q$select public.criar_pedido(%L, %L, '{"tipo":"balcao","cliente":{"nome":"X"},"pagamento":"pix","itens":[{"produto_id":"%s","quantidade":1}]}')$q$,
  pg_temp.id('loja'), pg_temp.id('marca'), pg_temp.id('refri')), 'permissão');
reset role;

-- Eli é funcionário, mas o grupo dele perdeu "pedidos_delivery".
insert into public.membros (loja_id, user_id, nome, papel, grupo_acesso_id)
select pg_temp.id('loja'), '00000000-0000-0000-0000-0000000000e1', 'Eli', 'funcionario', g.id
from public.grupos_acesso g where g.loja_id = pg_temp.id('loja') and g.nome = 'Funcionário';
update public.grupos_acesso set permissoes = array_remove(permissoes, 'pedidos_delivery')
where nome = 'Funcionário' and loja_id = pg_temp.id('loja');
select from pg_temp.como('00000000-0000-0000-0000-0000000000e1');
do $$ begin
  if exists (select 1 from public.pedidos) then raise exception 'RLS: Eli vê pedidos sem permissão'; end if;
end $$;
reset role;

-- O anônimo não lança pedido por esta porta.
set role anon;
select from pg_temp.esperar_erro(format($q$select public.criar_pedido(%L, %L, '{}')$q$, pg_temp.id('loja'), pg_temp.id('marca')), 'permission denied');
reset role;

\o
\pset tuples_only on
select 'OK: cardápio (edição) e pedidos';
