-- Testes de 0035: estoque (NF-e, vínculos, custo médio, ficha técnica com meio a meio, baixa e estorno, ajustes, permissões).
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000001f1', 'est@example.com'),
  ('00000000-0000-0000-0000-0000000001f2', 'moto15@equipe.res.invalid'),
  ('00000000-0000-0000-0000-0000000001f3', 'fora@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000001f1');
insert into ids values ('loja', public.criar_loja('Loja E', 'Pizza E', 'pizza-est', 'Rui'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-est';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza', pg_temp.id('setor'), 50));
select public.registrar_usuario_caixa(pg_temp.id('loja'), '00000000-0000-0000-0000-0000000001f2', 'moto15', 'Est Moto', 'entregador');
insert into ids values ('sabores', public.criar_grupo_vinculado(pg_temp.id('pz'), 'Sabores', 'proporcional', true, 1, 2, true,
  '[{"nome":"Calabresa","preco":50},{"nome":"Queijo","preco":50}]'));
insert into ids select 'o_cal', id from public.opcoes where nome = 'Calabresa' and grupo_id = pg_temp.id('sabores');
insert into ids select 'o_que', id from public.opcoes where nome = 'Queijo' and grupo_id = pg_temp.id('sabores');
insert into ids values ('mus', public.salvar_insumo(pg_temp.id('loja'), null, '{"nome": "Mussarela", "unidade": "KG", "minimo": 2}'));
-- nota 1: mussarela vinculada, calabresa nova (caixa de 6 kg), embalagem ignorada
insert into saida values ('n1', public.importar_nfe(pg_temp.id('loja'), jsonb_build_object('chave', '42261012345678000199550010000123451234567890', 'numero', '12345', 'serie', '1',
  'emissao', '2026-10-27T10:00:00-03:00', 'emitente_cnpj', '12.345.678/0001-99', 'emitente_nome', 'Serra Azul', 'valor_total', 63600,
  'itens', jsonb_build_array(
    jsonb_build_object('n', 1, 'codigo', 'MUS01', 'descricao', 'QUEIJO MUSSARELA', 'quantidade', 10, 'custo_total', 32000, 'acao', 'vincular', 'insumo_id', pg_temp.id('mus'), 'fator', 1),
    jsonb_build_object('n', 2, 'codigo', 'CAL02', 'descricao', 'CALABRESA CX 6KG', 'quantidade', 2, 'custo_total', 31600, 'acao', 'novo', 'novo', jsonb_build_object('nome', 'Calabresa', 'unidade', 'KG'), 'fator', 6),
    jsonb_build_object('n', 3, 'codigo', 'EMB', 'descricao', 'SACOLA', 'quantidade', 100, 'custo_total', 400, 'acao', 'ignorar')))));
select from pg_temp.esperar_erro(format($q$select public.importar_nfe('%s', '{"chave": "42261012345678000199550010000123451234567890", "itens": []}')$q$, pg_temp.id('loja')), 'já foi importada');
insert into saida values ('vinc', public.vinculos_fornecedor(pg_temp.id('loja'), '12345678000199'));
-- nota 2: mussarela mais cara → custo médio
insert into saida values ('n2', public.importar_nfe(pg_temp.id('loja'), jsonb_build_object('chave', '42261012345678000199550010000123461234567891', 'numero', '12346', 'emitente_cnpj', '12345678000199',
  'emitente_nome', 'Serra Azul', 'valor_total', 34000,
  'itens', jsonb_build_array(jsonb_build_object('codigo', 'MUS01', 'descricao', 'QUEIJO MUSSARELA', 'quantidade', 10, 'custo_total', 34000, 'acao', 'vincular', 'insumo_id', pg_temp.id('mus'), 'fator', 1)))));
reset role;
insert into ids select 'cal', id from public.insumos where nome = 'Calabresa' and estoque = pg_temp.id('loja');
select from pg_temp.como('00000000-0000-0000-0000-0000000001f1');
-- ficha: pizza gasta 0,3 kg de mussarela; sabor calabresa (pizza inteira) 0,4 kg de calabresa
select public.salvar_ficha(pg_temp.id('loja'), pg_temp.id('pz'), null, jsonb_build_array(jsonb_build_object('insumo_id', pg_temp.id('mus'), 'quantidade', 0.3)));
select public.salvar_ficha(pg_temp.id('loja'), null, pg_temp.id('o_cal'), jsonb_build_array(jsonb_build_object('insumo_id', pg_temp.id('cal'), 'quantidade', 0.4)));
select from pg_temp.esperar_erro(format($q$select public.salvar_ficha('%s', '%s', null, '[{"insumo_id": "%s", "quantidade": 0}]')$q$, pg_temp.id('loja'), pg_temp.id('pz'), pg_temp.id('mus')), 'quantidades');
-- pedido: 2 pizzas meio calabresa, meio queijo
insert into ids values ('ped', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'balcao',
  'cliente', jsonb_build_object('nome', 'Ana'), 'pagamento', 'pix',
  'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 2,
    'escolhas', jsonb_build_object(pg_temp.id('sabores'), jsonb_build_object(pg_temp.id('o_cal'), 1, pg_temp.id('o_que'), 1)))))));
reset role;
update public.pedidos set status = 'concluido', concluido_em = now() where id = pg_temp.id('ped');
create temp table s1 as select nome, saldo, custo_medio from public.insumos where estoque = pg_temp.id('loja');
update public.pedidos set status = 'cancelado', cancelado_em = now(), motivo_cancelamento = 'teste' where id = pg_temp.id('ped');
create temp table s2 as select nome, saldo from public.insumos where estoque = pg_temp.id('loja');

select from pg_temp.como('00000000-0000-0000-0000-0000000001f1');
select from pg_temp.esperar_erro(format($q$select public.ajustar_estoque('%s', '%s', 'perda', 1, null, '')$q$, pg_temp.id('loja'), pg_temp.id('mus')), 'motivo');
select public.ajustar_estoque(pg_temp.id('loja'), pg_temp.id('mus'), 'perda', 1, null, 'caiu no chão');
select public.ajustar_estoque(pg_temp.id('loja'), pg_temp.id('cal'), 'contagem', 11.5, null, 'inventário');
insert into saida values ('painel', public.estoque_painel(pg_temp.id('loja')));
insert into saida values ('mov', public.movimentos_estoque(pg_temp.id('loja')));
insert into saida values ('notas', public.notas_importadas(pg_temp.id('loja')));
select from pg_temp.esperar_erro(format($q$select public.definir_modo_estoque('%s', true)$q$, pg_temp.id('loja')), 'plano');
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000001f3');
select from pg_temp.esperar_erro(format($q$select public.estoque_painel('%s')$q$, pg_temp.id('loja')), 'acesso ao estoque');
do $$ begin if exists (select 1 from public.insumos) then raise exception 'RLS: leu insumos direto'; end if; end $$;
reset role;

do $$
declare p jsonb := pg_temp.v('painel'); mus record; cal record;
begin
  if (pg_temp.v('n1') ->> 'entradas')::int <> 2 or (pg_temp.v('n2') ->> 'entradas')::int <> 1 then raise exception 'entradas: % %', pg_temp.v('n1'), pg_temp.v('n2'); end if;
  if pg_temp.v('vinc') #>> '{vinculos,CAL02,fator}' <> '6.0000' or pg_temp.v('vinc') #>> '{vinculos,MUS01,insumo_id}' <> pg_temp.id('mus')::text then
    raise exception 'vínculos: %', pg_temp.v('vinc');
  end if;
  select * into mus from s1 where nome = 'Mussarela';
  select * into cal from s1 where nome = 'Calabresa';
  -- 20 kg − 2 pizzas × 0,3 = 19,4; custo médio (10×32 + 10×34)/20 = 33
  if mus.saldo <> 19.4 or round(mus.custo_medio, 2) <> 33 then raise exception 'mussarela: % %', mus.saldo, mus.custo_medio; end if;
  -- 12 kg − 2 pizzas × 0,4 × ½ = 11,6; custo 316/12
  if cal.saldo <> 11.6 or round(cal.custo_medio, 4) <> 26.3333 then raise exception 'calabresa: % %', cal.saldo, cal.custo_medio; end if;
  if (select saldo from s2 where nome = 'Mussarela') <> 20 or (select saldo from s2 where nome = 'Calabresa') <> 12 then raise exception 'estorno'; end if;
  if (select saldo from public.insumos where id = pg_temp.id('mus')) <> 19 or (select saldo from public.insumos where id = pg_temp.id('cal')) <> 11.5 then
    raise exception 'ajustes';
  end if;
  if jsonb_array_length(p -> 'insumos') <> 2 or (p ->> 'pode_escolher')::boolean or (p ->> 'notas')::int <> 2 then raise exception 'painel: %', p; end if;
  if jsonb_array_length(pg_temp.v('mov')) <> 9 then raise exception 'movimentos: %', jsonb_array_length(pg_temp.v('mov')); end if;
end $$;

-- plano de várias lojas: pode agrupar, mas só antes de ter insumos
update public.contas set plano = 'multilojas', limite_lojas = 3 where id = (select conta_id from public.lojas where id = pg_temp.id('loja'));
select from pg_temp.como('00000000-0000-0000-0000-0000000001f1');
select from pg_temp.esperar_erro(format($q$select public.definir_modo_estoque('%s', true)$q$, pg_temp.id('loja')), 'primeiro cadastro');
insert into saida values ('painel2', public.estoque_painel(pg_temp.id('loja')));
reset role;
do $$ begin
  if not (pg_temp.v('painel2') ->> 'pode_escolher')::boolean or (pg_temp.v('painel2') ->> 'pode_mudar_modo')::boolean then raise exception 'painel2: %', pg_temp.v('painel2'); end if;
end $$;
update public.insumos set ativo = false;  -- (só para o teste do modo: apaga de verdade)
delete from public.estoque_movimentos; delete from public.fichas_tecnicas; delete from public.nfe_vinculos; delete from public.insumos;
select from pg_temp.como('00000000-0000-0000-0000-0000000001f1');
select public.definir_modo_estoque(pg_temp.id('loja'), true);
insert into ids values ('g1', public.salvar_insumo(pg_temp.id('loja'), null, '{"nome": "Farinha", "unidade": "KG"}'));
reset role;
do $$ begin
  if (select estoque from public.insumos where id = pg_temp.id('g1')) <> (select conta_id from public.lojas where id = pg_temp.id('loja')) then
    raise exception 'estoque do grupo deveria ser da conta';
  end if;
end $$;

\o
\pset tuples_only on
select 'OK: estoque';
