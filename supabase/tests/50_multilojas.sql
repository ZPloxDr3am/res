-- Testes da 0008: conta com várias lojas, limites do pacote, titular dono de todas, equipe por loja, resumo de vendas.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000c7', 'ivo@example.com'),      -- titular da conta
  ('00000000-0000-0000-0000-0000000000c8', 'jaque@example.com'),    -- funcionária só da loja 2
  ('00000000-0000-0000-0000-0000000000c9', 'kiko@example.com');     -- de fora

create or replace function pg_temp.como(p_user text, p_email text default null) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user, false);
  perform set_config('request.jwt.claims', coalesce(jsonb_build_object('sub', p_user, 'email', p_email)::text, ''), false);
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
grant all on ids to authenticated;
create or replace function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where chave = p $$;
create temp table saida (chave text primary key, v jsonb);
grant all on saida to authenticated;

-- ---------------------------------------------------------------- conta e pacote
select from pg_temp.como('00000000-0000-0000-0000-0000000000c7', 'ivo@example.com');
insert into ids values ('loja1', public.criar_loja('Unidade Centro', 'Pizzaria Ivo', 'pizzaria-ivo', 'Ivo'));
insert into ids select 'conta', conta_id from public.lojas where id = pg_temp.id('loja1');
do $$ begin
  if (select (plano, limite_lojas, limite_cardapios) from public.contas where id = pg_temp.id('conta')) <> ('basico'::text, 1, 1) then raise exception 'pacote básico'; end if;
end $$;
-- pacote básico: não cabe 2ª loja nem 2º cardápio
select from pg_temp.esperar_erro(format($q$select public.criar_loja_na_conta('%s', 'Unidade 2', 'Burger Ivo', 'burger-ivo')$q$, pg_temp.id('conta')), 'permite 1 loja');
select from pg_temp.esperar_erro(format($q$select public.criar_marca('%s', 'Açaí Ivo', 'acai-ivo')$q$, pg_temp.id('loja1')), 'permite 1 cardápio');
-- o cliente não aumenta o próprio pacote
select from pg_temp.esperar_erro(format($q$update public.contas set limite_lojas = 99 where id = '%s'$q$, pg_temp.id('conta')), 'equipe RES');
update public.contas set nome = 'Grupo Ivo' where id = pg_temp.id('conta');  -- renomear pode
reset role;

-- a equipe RES vende o pacote de 3 lojas e 3 cardápios
update public.contas set plano = 'multilojas', limite_lojas = 3, limite_cardapios = 3 where id = pg_temp.id('conta');

select from pg_temp.como('00000000-0000-0000-0000-0000000000c7', 'ivo@example.com');
insert into ids values ('loja2', public.criar_loja_na_conta(pg_temp.id('conta'), 'Unidade Trindade', 'Pizzaria Ivo Trindade', 'pizzaria-ivo-trindade'));
insert into ids values ('marca_acai', public.criar_marca(pg_temp.id('loja1'), 'Açaí Ivo', 'acai-ivo'));  -- 2ª marca na mesma cozinha
select from pg_temp.esperar_erro(format($q$select public.criar_loja_na_conta('%s', 'Unidade 3', 'Burger Ivo', 'burger-ivo')$q$, pg_temp.id('conta')), 'permite 3 cardápio');
do $$ begin
  if (select string_agg(nome, ',' order by nome) from public.lojas) <> 'Unidade Centro,Unidade Trindade' then raise exception 'titular deveria ver as 2 lojas'; end if;
  if (select papel from public.membros where loja_id = pg_temp.id('loja2') and user_id = auth.uid()) <> 'dono' then raise exception 'titular deveria ser dono da loja nova'; end if;
  if (select nome from public.contas where id = pg_temp.id('conta')) <> 'Grupo Ivo' then raise exception 'renomear conta'; end if;
end $$;
reset role;
-- 4 lojas não cabem no pacote de 3
update public.contas set limite_cardapios = null where id = pg_temp.id('conta');
select from pg_temp.como('00000000-0000-0000-0000-0000000000c7', 'ivo@example.com');
insert into ids values ('loja3', public.criar_loja_na_conta(pg_temp.id('conta'), 'Unidade Kobrasol', 'Burger Ivo', 'burger-ivo'));
select from pg_temp.esperar_erro(format($q$select public.criar_loja_na_conta('%s', 'Unidade 4', 'X', 'x-ivo')$q$, pg_temp.id('conta')), 'permite 3 loja');
select from pg_temp.esperar_erro(format($q$select public.criar_marca('%s', 'Repetido', 'pizzaria-ivo')$q$, pg_temp.id('loja2')), 'marcas_slug_key');
-- quem não é titular não cria loja na conta
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000000c9', 'kiko@example.com');
select from pg_temp.esperar_erro(format($q$select public.criar_loja_na_conta('%s', 'Invasor', 'X', 'x-kiko')$q$, pg_temp.id('conta')), 'titular');
do $$ begin
  if exists (select 1 from public.contas) or exists (select 1 from public.lojas) then raise exception 'RLS: Kiko vê conta/loja alheia'; end if;
end $$;
reset role;

-- ---------------------------------------------------------------- equipe por loja (convite)
select from pg_temp.como('00000000-0000-0000-0000-0000000000c7', 'ivo@example.com');
select from public.convidar(pg_temp.id('loja2'), ' Jaque@Example.com ', 'Jaque', 'funcionario');
select from pg_temp.esperar_erro(format($q$select public.convidar('%s', 'outra@x.com', 'X', 'dono')$q$, pg_temp.id('loja2')), 'convites_papel_check');
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000000c8', 'jaque@example.com');
do $$ begin
  if public.aceitar_convites() <> 1 then raise exception 'convite não aceito'; end if;
  if public.aceitar_convites() <> 0 then raise exception 'convite aceito duas vezes'; end if;
  if (select string_agg(nome, ',') from public.lojas) <> 'Unidade Trindade' then raise exception 'Jaque deveria ver só a Trindade: %', (select string_agg(nome, ',') from public.lojas); end if;
  if private.tem_permissao(pg_temp.id('loja2'), 'relatorios') then raise exception 'funcionária não deveria ter relatórios'; end if;
  if not private.tem_permissao(pg_temp.id('loja2'), 'pedidos_delivery') then raise exception 'funcionária deveria ter pedidos'; end if;
end $$;
select from pg_temp.esperar_erro(format($q$select public.convidar('%s', 'a@b.com', 'A')$q$, pg_temp.id('loja2')), 'permissão');
reset role;

-- ---------------------------------------------------------------- resumo de vendas
-- pedidos nas duas lojas: hoje e ontem (horário de Brasília)
select from pg_temp.como('00000000-0000-0000-0000-0000000000c7', 'ivo@example.com');
insert into ids values ('setor1', public.salvar_setor(pg_temp.id('loja1'), null, 'Pizzas'));
insert into ids values ('setor2', public.salvar_setor(pg_temp.id('loja2'), null, 'Pizzas'));
insert into ids values ('p1', public.criar_produto(pg_temp.id('loja1'), 'Pizza', pg_temp.id('setor1'), 50));
insert into ids values ('p2', public.criar_produto(pg_temp.id('loja2'), 'Pizza', pg_temp.id('setor2'), 40));
do $$
declare m1 uuid := (select id from public.marcas where slug = 'pizzaria-ivo'); m2 uuid := (select id from public.marcas where slug = 'pizzaria-ivo-trindade');
begin
  perform public.criar_pedido(pg_temp.id('loja1'), m1, jsonb_build_object('tipo', 'balcao', 'cliente', jsonb_build_object('nome', 'A'), 'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('p1'), 'quantidade', 2))));
  perform public.criar_pedido(pg_temp.id('loja1'), m1, jsonb_build_object('tipo', 'balcao', 'cliente', jsonb_build_object('nome', 'B'), 'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('p1'), 'quantidade', 1))));
  perform public.criar_pedido(pg_temp.id('loja2'), m2, jsonb_build_object('tipo', 'retirada', 'cliente', jsonb_build_object('nome', 'C'), 'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('p2'), 'quantidade', 1))));
end $$;
reset role;
-- um pedido de ontem e um cancelado hoje (ajuste direto, como superusuário)
update public.pedidos set criado_em = '2026-10-20 15:00:00-03' where cliente_nome = 'B' and loja_id = pg_temp.id('loja1');
update public.pedidos set status = 'cancelado', cancelado_em = now(), motivo_cancelamento = 't' where cliente_nome = 'C';
update public.pedidos set criado_em = '2026-10-21 12:00:00-03' where cliente_nome in ('A', 'C');

select from pg_temp.como('00000000-0000-0000-0000-0000000000c7', 'ivo@example.com');
insert into saida values ('r', public.resumo_vendas(array[pg_temp.id('loja1'), pg_temp.id('loja2'), pg_temp.id('loja3')], '2026-10-21 00:00:00-03', '2026-10-22 00:00:00-03'));
reset role;
do $$
declare r jsonb := (select v from saida where chave = 'r'); a jsonb; b jsonb;
begin
  select x into a from jsonb_array_elements(r -> 'atual') x where x ->> 'loja' = 'Unidade Centro';
  select x into b from jsonb_array_elements(r -> 'anterior') x where x ->> 'loja' = 'Unidade Centro';
  if (a ->> 'faturamento')::int <> 10000 or (a ->> 'pedidos')::int <> 1 then raise exception 'hoje Centro: %', a; end if;
  if (b ->> 'faturamento')::int <> 5000 or (b ->> 'pedidos')::int <> 1 then raise exception 'ontem Centro: %', b; end if;
  select x into a from jsonb_array_elements(r -> 'atual') x where x ->> 'loja' = 'Unidade Trindade';
  if (a ->> 'faturamento')::int <> 0 or (a ->> 'cancelados')::int <> 1 or (a ->> 'valor_cancelado')::int <> 4000 then raise exception 'cancelado Trindade: %', a; end if;
  if jsonb_array_length(r -> 'atual') <> 3 then raise exception 'deveria listar as 3 lojas (inclusive sem venda)'; end if;
  if jsonb_array_length(r -> 'dias') <> 1 or (r #>> '{dias,0,dia}') <> '2026-10-21' then raise exception 'dias: %', r -> 'dias'; end if;
end $$;
-- funcionária sem "relatorios" não vê números
select from pg_temp.como('00000000-0000-0000-0000-0000000000c8', 'jaque@example.com');
insert into saida values ('rj', public.resumo_vendas(array[pg_temp.id('loja2')], '2026-10-21 00:00:00-03', '2026-10-22 00:00:00-03'));
reset role;
do $$ begin
  if jsonb_array_length((select v from saida where chave = 'rj') -> 'atual') <> 0 then raise exception 'funcionária viu relatório'; end if;
end $$;
select from pg_temp.esperar_erro($q$select public.resumo_vendas('{}', '2026-10-22', '2026-10-21')$q$, 'Período inválido');

-- ---------------------------------------------------------------- 0009: replicar horários para o grupo
select from pg_temp.como('00000000-0000-0000-0000-0000000000c7', 'ivo@example.com');
select from public.salvar_config_delivery((select id from public.marcas where slug = 'pizzaria-ivo'),
  '{"horarios": [{"dia": 5, "abre": "18:00", "fecha": "02:00"}, {"dia": 6, "abre": "18:00", "fecha": "23:30"}]}');
select from public.salvar_config_delivery((select id from public.marcas where slug = 'burger-ivo'), '{"horarios": [{"dia": 1, "abre": "11:00", "fecha": "15:00"}]}');
do $$ begin
  -- pizzaria-ivo → acai-ivo (mesma loja), pizzaria-ivo-trindade e burger-ivo (outras lojas da conta)
  if public.replicar_horarios((select id from public.marcas where slug = 'pizzaria-ivo')) <> 3 then raise exception 'deveria replicar para 3 cardápios'; end if;
  if (select string_agg(m.slug || ':' || h.dia_semana || ' ' || to_char(h.abre, 'HH24:MI') || '-' || to_char(h.fecha, 'HH24:MI'), ',' order by m.slug, h.dia_semana)
        from public.marca_horarios h join public.marcas m on m.id = h.marca_id where m.slug = 'burger-ivo') <> 'burger-ivo:5 18:00-02:00,burger-ivo:6 18:00-23:30' then
    raise exception 'horário antigo do burger deveria ter sido trocado';
  end if;
end $$;
reset role;
-- Jaque (funcionária da Trindade, sem cardapio_digital) não replica; outra conta não é tocada
select from pg_temp.como('00000000-0000-0000-0000-0000000000c8', 'jaque@example.com');
select from pg_temp.esperar_erro($q$select public.replicar_horarios((select id from public.marcas where slug = 'pizzaria-ivo-trindade'))$q$, 'permissão');
reset role;
do $$ begin
  if exists (select 1 from public.marca_horarios h join public.marcas m on m.id = h.marca_id where m.slug = 'pizzaria-e' and h.abre = '18:00' and h.dia_semana = 6 and h.fecha = '23:30')
     and (select count(*) from public.marca_horarios h join public.marcas m on m.id = h.marca_id where m.slug = 'pizzaria-e') <> 2 then
    raise exception 'outra conta foi alterada';
  end if;
end $$;

-- ---------------------------------------------------------------- 0010: importar cardápio / compartilhar catálogo
select from pg_temp.como('00000000-0000-0000-0000-0000000000c7', 'ivo@example.com');
insert into ids values ('sab', public.criar_grupo(pg_temp.id('loja1'), 'Sabores', 'proporcional', true, 1, 2, true, false, '[{"nome":"Calabresa"},{"nome":"Frango","preco":5}]'));
select from public.definir_grupos_do_produto(pg_temp.id('p1'), array[pg_temp.id('sab')]);
update public.produto_marcas set preco_delivery = 55 where produto_id = pg_temp.id('p1') and marca_id = (select id from public.marcas where slug = 'pizzaria-ivo');
insert into saida values ('imp1', public.importar_cardapio(pg_temp.id('loja1'), pg_temp.id('loja3')));
insert into saida values ('imp2', public.importar_cardapio(pg_temp.id('loja1'), pg_temp.id('loja3')));
do $$
declare r1 jsonb := (select v from saida where chave = 'imp1'); r2 jsonb := (select v from saida where chave = 'imp2'); np uuid;
begin
  if (r1 ->> 'categorias')::int <> 1 or (r1 ->> 'produtos')::int <> 1 or (r1 ->> 'grupos')::int <> 1 then raise exception 'importar: %', r1; end if;
  -- importar de novo não é barrado: entra como cópia (categoria e produto com -Cópia)
  if (r2 ->> 'produtos')::int <> 1 or (r2 ->> 'categorias')::int <> 1 or (r2 ->> 'renomeados')::int <> 2 then raise exception 'reimportar: %', r2; end if;
  if (select count(*) from public.produtos p join public.setores s on s.id = p.setor_id
       where p.loja_id = pg_temp.id('loja3') and p.nome = 'Pizza-Cópia' and s.nome like '%-Cópia') <> 1 then
    raise exception 'cópia importada: %', (select string_agg(p.nome || '@' || s.nome, ',') from public.produtos p join public.setores s on s.id = p.setor_id where p.loja_id = pg_temp.id('loja3'));
  end if;
  select id into np from public.produtos where loja_id = pg_temp.id('loja3') and nome = 'Pizza';
  if (select preco_delivery from public.produto_marcas where produto_id = np) <> 55 then raise exception 'preço da marca de origem'; end if;
  if (select count(*) from public.opcoes o join public.produto_grupos pg on pg.grupo_id = o.grupo_id where pg.produto_id = np) <> 2 then raise exception 'opções do grupo copiadas'; end if;
  if (select g.loja_id from public.produto_grupos pg join public.grupos_opcoes g on g.id = pg.grupo_id where pg.produto_id = np) <> pg_temp.id('loja3') then raise exception 'grupo deveria ser da loja de destino'; end if;
  if (select count(*) from public.grupos_opcoes where loja_id = pg_temp.id('loja3') and nome = 'Sabores') <> 1 then raise exception 'grupo duplicado'; end if;
end $$;
-- preço calculado no destino funciona (conferido como administrador: a função é interna)
reset role;
do $$
declare np uuid := (select id from public.produtos where loja_id = pg_temp.id('loja3') and nome = 'Pizza');
        g uuid := (select grupo_id from public.produto_grupos where produto_id = np);
        r jsonb;
begin
  r := private.preco_item(np, (select id from public.marcas where slug = 'burger-ivo'), 'delivery',
         jsonb_build_object(g, (select jsonb_object_agg(id, 1) from public.opcoes where grupo_id = g)));
  if (r ->> 'unitario')::int <> 5750 then raise exception 'preço no destino: %', r; end if;  -- 55 + (0+5)/2
end $$;
select from pg_temp.como('00000000-0000-0000-0000-0000000000c7', 'ivo@example.com');
select from pg_temp.esperar_erro(format($q$select public.importar_cardapio('%s', '%s')$q$, pg_temp.id('loja1'), pg_temp.id('loja1')), 'diferente');
-- marca nova na Trindade usando o catálogo da marca que já existe lá
insert into ids values ('doces', public.criar_marca(pg_temp.id('loja2'), 'Doces Trindade', 'doces-trindade'));
do $$
declare r jsonb := public.compartilhar_catalogo(pg_temp.id('doces'), (select id from public.marcas where slug = 'pizzaria-ivo-trindade'));
begin
  if (r ->> 'produtos')::int <> 1 or (r ->> 'categorias')::int <> 1 then raise exception 'compartilhar: %', r; end if;
  if (select count(*) from public.produtos where loja_id = pg_temp.id('loja2')) <> 1 then raise exception 'compartilhar não deveria copiar produtos'; end if;
end $$;
select from pg_temp.esperar_erro(format($q$select public.compartilhar_catalogo('%s', (select id from public.marcas where slug = 'pizzaria-ivo'))$q$, pg_temp.id('doces')), 'mesma loja');
reset role;
-- de fora do grupo / sem permissão
select from pg_temp.como('00000000-0000-0000-0000-0000000000c8', 'jaque@example.com');
select from pg_temp.esperar_erro(format($q$select public.importar_cardapio('%s', '%s')$q$, pg_temp.id('loja1'), pg_temp.id('loja2')), 'duas lojas');
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000000a7', 'gil@example.com');
select from pg_temp.esperar_erro(format($q$select public.importar_cardapio('%s', (select loja_id from public.marcas where slug = 'pizzaria-e'))$q$, pg_temp.id('loja1')), 'duas lojas');
reset role;

\o
\pset tuples_only on
select 'OK: multilojas';
