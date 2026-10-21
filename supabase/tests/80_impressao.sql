-- Testes de 0015: impressoras, regras da cozinha (única, setor, produto, marketplace), fila e aceite.
-- Iara é dona da Loja I.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000aa', 'iara@example.com'),
  ('00000000-0000-0000-0000-0000000000ab', 'joca@equipe.res.invalid');

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
grant all on ids to authenticated;
create or replace function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where chave = p $$;
create temp table saida (chave text primary key, v jsonb);
grant all on saida to authenticated;

-- Pedido de 1 pizza + 1 refri, concluído o aceite numa transação própria (o gatilho é adiado).
create or replace function pg_temp.pedido() returns uuid language plpgsql as $$
declare v uuid;
begin
  v := public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'retirada', 'cliente', jsonb_build_object('nome', 'Cli'),
         'pagamento', 'pix', 'observacao', 'Sem cebola',
         'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pizza'), 'quantidade', 1, 'observacao', 'bem passada'),
                                    jsonb_build_object('produto_id', pg_temp.id('refri'), 'quantidade', 2))));
  return v;
end; $$;

-- ---------------------------------------------------------------- montagem
select from pg_temp.como('00000000-0000-0000-0000-0000000000aa');
insert into ids values ('loja', public.criar_loja('Loja I', 'Pizza I', 'pizza-i', 'Iara'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-i';
insert into ids values ('s_pizza', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('s_bebida', public.salvar_setor(pg_temp.id('loja'), null, 'Bebidas'));
insert into ids values ('pizza', public.criar_produto(pg_temp.id('loja'), 'Pizza Calabresa', pg_temp.id('s_pizza'), 50));
insert into ids values ('refri', public.criar_produto(pg_temp.id('loja'), 'Refri 2L', pg_temp.id('s_bebida'), 12));
insert into ids values ('forno', public.salvar_impressora(pg_temp.id('loja'), null, '{"nome": "Forno", "modelo": "epson-tm-t20x", "protocolo": "EscPosEpson", "endereco": "EPSON TM-T20X", "colunas": 48}'));
insert into ids values ('bar', public.salvar_impressora(pg_temp.id('loja'), null, '{"nome": "Bar", "modelo": "generica-58", "protocolo": "CustomPos", "conexao": "rede", "endereco": "192.168.0.50:9100", "colunas": 32}'));
insert into ids values ('caixa', public.salvar_impressora(pg_temp.id('loja'), null, '{"nome": "Caixa", "modelo": "elgin-i9", "protocolo": "EscPosEpson"}'));
select from pg_temp.esperar_erro(format($q$select public.salvar_impressora('%s', null, '{"nome": "forno ", "modelo": "x", "protocolo": "EscPosEpson"}')$q$, pg_temp.id('loja')), 'impressoras_nome_idx');
select from pg_temp.esperar_erro(format($q$select public.salvar_impressora('%s', null, '{"nome": "Z", "modelo": "x", "protocolo": "Zebra"}')$q$, pg_temp.id('loja')), 'protocolo');
-- usuário de caixa (funcionário) sem a permissão "impressoras"
select public.registrar_usuario_caixa(pg_temp.id('loja'), '00000000-0000-0000-0000-0000000000ab', 'joca', 'Joca');
reset role;

-- Sem configuração: aceite não imprime nada sozinho.
select from pg_temp.como('00000000-0000-0000-0000-0000000000aa');
insert into ids values ('p0', pg_temp.pedido());
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000000aa');
select public.mudar_status_pedido(pg_temp.id('p0'), 'em_preparo');
reset role;
do $$ begin
  if exists (select 1 from public.impressoes where pedido_id = pg_temp.id('p0')) then raise exception 'sem config não deveria imprimir'; end if;
end $$;

-- Botão Imprimir sem config: vai para a fila sem impressora (navegador), com todos os itens.
select from pg_temp.como('00000000-0000-0000-0000-0000000000aa');
insert into saida values ('m0', public.imprimir_pedido(pg_temp.id('p0'), 'cozinha'));
do $$
declare c jsonb := (select v from saida where chave = 'm0');
begin
  if jsonb_array_length(c) <> 1 or c #>> '{0,impressora_id}' is not null then raise exception 'manual sem config: %', c; end if;
  if jsonb_array_length(c #> '{0,conteudo,itens}') <> 2 or c #>> '{0,conteudo,itens,0,observacao}' <> 'bem passada' or c #>> '{0,conteudo,observacao}' <> 'Sem cebola' then
    raise exception 'conteúdo: %', c #> '{0,conteudo}';
  end if;
end $$;
reset role;

-- ---------------------------------------------------------------- por setor, via separada por setor, via do pedido no caixa
select from pg_temp.como('00000000-0000-0000-0000-0000000000aa');
select public.salvar_config_impressao(pg_temp.id('loja'), jsonb_build_object(
  'modo_destino', 'setor', 'impressora_padrao', pg_temp.id('forno'), 'agrupamento', 'por_setor',
  'canais', jsonb_build_object('painel', 'automatico', 'cardapio_digital', 'manual'),
  'via_pedido_impressora', pg_temp.id('caixa'), 'via_pedido_auto', true,
  'destinos', jsonb_build_array(jsonb_build_object('tipo', 'setor', 'alvo_id', pg_temp.id('s_bebida'), 'impressora_id', pg_temp.id('bar')))));
select from pg_temp.esperar_erro(format($q$select public.salvar_config_impressao('%s', '{"canais": {"totem": "automatico"}}')$q$, pg_temp.id('loja')), 'Canal inválido');
select from pg_temp.esperar_erro(format($q$select public.salvar_config_impressao('%s', '{"impressora_padrao": "%s"}')$q$, pg_temp.id('loja'), gen_random_uuid()), 'Impressora inválida');
insert into ids values ('p1', pg_temp.pedido());
reset role;
select from pg_temp.como('00000000-0000-0000-0000-0000000000aa');
select public.mudar_status_pedido(pg_temp.id('p1'), 'em_preparo');
reset role;
do $$
declare n int;
begin
  -- Pizzas → Forno (padrão); Bebidas → Bar; via do pedido → Caixa
  if (select string_agg(i.nome || ':' || x.tipo || ':' || jsonb_array_length(x.conteudo -> 'itens'), ',' order by i.nome)
        from public.impressoes x join public.impressoras i on i.id = x.impressora_id where x.pedido_id = pg_temp.id('p1')) <> 'Bar:cozinha:1,Caixa:pedido:2,Forno:cozinha:1' then
    raise exception 'destinos por setor: %', (select string_agg(i.nome || ':' || x.tipo || ':' || jsonb_array_length(x.conteudo -> 'itens'), ',' order by i.nome)
        from public.impressoes x join public.impressoras i on i.id = x.impressora_id where x.pedido_id = pg_temp.id('p1'));
  end if;
  if (select titulo from public.impressoes x where x.pedido_id = pg_temp.id('p1') and x.impressora_id = pg_temp.id('bar')) not like 'Cozinha #% · Bebidas' then raise exception 'título por setor'; end if;
  if exists (select 1 from public.impressoes where pedido_id = pg_temp.id('p1') and (motivo <> 'aceite' or status <> 'pendente')) then raise exception 'motivo/status'; end if;
  -- mudar de status de novo não reimprime
  perform public.mudar_status_pedido(pg_temp.id('p1'), 'pronto');
  select count(*) into n from public.impressoes where pedido_id = pg_temp.id('p1');
  if n <> 3 then raise exception 'reimprimiu ao mudar status: %', n; end if;
end $$;

-- Canal manual (cardápio digital): aceite não imprime cozinha, mas a via do pedido (auto) sai.
select from pg_temp.como('00000000-0000-0000-0000-0000000000aa');
insert into ids values ('p2', pg_temp.pedido());
reset role;
update public.pedidos set origem = 'cardapio_digital' where id = pg_temp.id('p2');
select from pg_temp.como('00000000-0000-0000-0000-0000000000aa');
select public.mudar_status_pedido(pg_temp.id('p2'), 'em_preparo');
reset role;
do $$ begin
  if (select string_agg(tipo, ',') from public.impressoes where pedido_id = pg_temp.id('p2')) <> 'pedido' then
    raise exception 'canal manual: %', (select string_agg(tipo, ',') from public.impressoes where pedido_id = pg_temp.id('p2'));
  end if;
end $$;

-- ---------------------------------------------------------------- por produto + aceite automático (entra já em preparo) + marketplace
select from pg_temp.como('00000000-0000-0000-0000-0000000000aa');
select public.salvar_config_impressao(pg_temp.id('loja'), jsonb_build_object(
  'modo_destino', 'produto', 'impressora_padrao', pg_temp.id('forno'), 'agrupamento', 'completo',
  'marketplace_impressora', pg_temp.id('caixa'), 'marketplace_modo', 'sem_vinculo',
  'destinos', jsonb_build_array(
     jsonb_build_object('tipo', 'produto', 'alvo_id', pg_temp.id('refri'), 'impressora_id', pg_temp.id('bar')),
     jsonb_build_object('tipo', 'produto', 'alvo_id', pg_temp.id('pizza'), 'impressora_id', ''))));
update public.lojas set aceite_automatico = true where id = pg_temp.id('loja');
insert into ids values ('p3', pg_temp.pedido());
reset role;
do $$ begin
  if (select via_pedido_auto from public.impressao_config where loja_id = pg_temp.id('loja')) then raise exception 'via_pedido_auto deveria voltar ao padrão (false)'; end if;
  if (select count(*) from public.impressao_destinos where loja_id = pg_temp.id('loja')) <> 1 then raise exception 'destino vazio não deveria gravar'; end if;
  if (select string_agg(i.nome, ',' order by i.nome) from public.impressoes x join public.impressoras i on i.id = x.impressora_id where x.pedido_id = pg_temp.id('p3')) <> 'Bar,Forno' then
    raise exception 'aceite automático por produto: %', (select string_agg(coalesce(i.nome, '-'), ',') from public.impressoes x left join public.impressoras i on i.id = x.impressora_id where x.pedido_id = pg_temp.id('p3'));
  end if;
end $$;

-- Marketplace: item sem vínculo (produto apagado) vai para a impressora do marketplace; o vinculado segue a regra.
select from pg_temp.como('00000000-0000-0000-0000-0000000000aa');
insert into ids values ('p4', pg_temp.pedido());
reset role;
update public.pedidos set origem = 'ifood' where id = pg_temp.id('p4');
update public.pedido_itens set produto_id = null where pedido_id = pg_temp.id('p4') and nome = 'Pizza Calabresa';
delete from public.impressoes where pedido_id = pg_temp.id('p4');
select from pg_temp.como('00000000-0000-0000-0000-0000000000aa');
select from public.imprimir_pedido(pg_temp.id('p4'), 'cozinha');
reset role;
do $$ begin
  if (select string_agg(i.nome || ':' || (x.conteudo #>> '{itens,0,nome}'), ',' order by i.nome) from public.impressoes x join public.impressoras i on i.id = x.impressora_id where x.pedido_id = pg_temp.id('p4')) <> 'Bar:Refri 2L,Caixa:Pizza Calabresa' then
    raise exception 'marketplace sem vínculo: %', (select string_agg(coalesce(i.nome, '-') || ':' || (x.conteudo #>> '{itens,0,nome}'), ',') from public.impressoes x left join public.impressoras i on i.id = x.impressora_id where x.pedido_id = pg_temp.id('p4'));
  end if;
end $$;

-- ---------------------------------------------------------------- reimprimir, marcar, teste, permissões
select from pg_temp.como('00000000-0000-0000-0000-0000000000ab');  -- Joca (funcionário): imprime pedidos, não configura
do $$
declare r jsonb; v uuid := (select id from public.impressoes where pedido_id = pg_temp.id('p1') and tipo = 'pedido');
begin
  r := public.reimprimir(v);
  if r #>> '{0,status}' <> 'pendente' or (select motivo from public.impressoes where id = (r #>> '{0,id}')::uuid) <> 'reimpressao' then raise exception 'reimprimir: %', r; end if;
  if public.marcar_impressao(array[(r #>> '{0,id}')::uuid], 'impresso') <> 1 then raise exception 'marcar'; end if;
  if (select (status, impresso_por, tentativas) from public.impressoes where id = (r #>> '{0,id}')::uuid) <> ('impresso'::text, 'navegador'::text, 1::smallint) then raise exception 'marcado errado'; end if;
  r := public.imprimir_pedido(pg_temp.id('p1'), 'pedido');
  if (select motivo from public.impressoes where id = (r #>> '{0,id}')::uuid) <> 'reimpressao' then raise exception 'segunda via deveria ser reimpressão'; end if;
end $$;
select from pg_temp.esperar_erro(format($q$select public.salvar_impressora('%s', null, '{"nome": "X", "modelo": "x", "protocolo": "EscPosEpson"}')$q$, pg_temp.id('loja')), 'permissão');
select from pg_temp.esperar_erro(format($q$select public.imprimir_teste('%s')$q$, pg_temp.id('forno')), 'não encontrada');
select from pg_temp.esperar_erro(format($q$select public.marcar_impressao(array['%s']::uuid[], 'feito')$q$, gen_random_uuid()), 'inválida');
reset role;

select from pg_temp.como('00000000-0000-0000-0000-0000000000aa');
do $$
declare r jsonb := public.imprimir_teste(pg_temp.id('bar'));
begin
  if r #>> '{0,tipo}' <> 'teste' or (r #>> '{0,colunas}')::int <> 32 or r #>> '{0,conteudo,protocolo}' <> 'CustomPos' then raise exception 'teste: %', r; end if;
  perform public.excluir_impressora(pg_temp.id('bar'));
  if exists (select 1 from public.impressao_destinos where impressora_id = pg_temp.id('bar')) then raise exception 'destino deveria sair junto'; end if;
  if (select impressora_id from public.impressoes where id = (r #>> '{0,id}')::uuid) is not null then raise exception 'cupom pendente deveria ficar sem impressora'; end if;
end $$;
select public.salvar_layout_impressao(pg_temp.id('marca'), 'cozinha', '{"fonte": "grande", "destacar_obs": true}');
select from pg_temp.esperar_erro(format($q$select public.salvar_layout_impressao('%s', 'garcom', '{}')$q$, pg_temp.id('marca')), 'inválido');
reset role;
-- layout entra nos próximos cupons
select from pg_temp.como('00000000-0000-0000-0000-0000000000aa');
do $$
declare r jsonb := public.imprimir_pedido(pg_temp.id('p0'), 'cozinha');
begin
  if r #>> '{0,layout,fonte}' <> 'grande' then raise exception 'layout no cupom: %', r #> '{0,layout}'; end if;
end $$;
reset role;

\o
\pset tuples_only on
select 'OK: impressão (regras, fila e aceite)';
