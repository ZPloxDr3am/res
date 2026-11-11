-- Testes de 0026: rastreio do motoboy só com entrega em rota, caminho, painel ao vivo e privacidade.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000d7', 'rast@example.com'),
  ('00000000-0000-0000-0000-0000000000d8', 'moto9@equipe.res.invalid'),
  ('00000000-0000-0000-0000-0000000000d9', 'fora@example.com');
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
grant all on ids, saida to authenticated;
create or replace function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where chave = p $$;
create or replace function pg_temp.v(p text) returns jsonb language sql as $$ select v from saida where chave = p $$;

select from pg_temp.como('00000000-0000-0000-0000-0000000000d7');
insert into ids values ('loja', public.criar_loja('Loja R', 'Pizza R', 'pizza-r', 'Rui'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-r';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza', pg_temp.id('setor'), 50));
select public.registrar_usuario_caixa(pg_temp.id('loja'), '00000000-0000-0000-0000-0000000000d8', 'moto9', 'Rafa Moto', 'entregador');
insert into ids values ('ped', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 5,
  'cliente', jsonb_build_object('nome', 'Bia'), 'endereco', jsonb_build_object('logradouro', 'Rua 1', 'numero', '10', 'bairro', 'Centro'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
reset role;

-- sem entrega: não rastreia
select from pg_temp.como('00000000-0000-0000-0000-0000000000d8');
insert into saida values ('antes', public.registrar_posicao(-27.12, -48.62, 10, 0, 0));
reset role;
do $$ begin
  if (pg_temp.v('antes') ->> 'ativo')::boolean or exists (select 1 from public.motoboy_local) then raise exception 'rastreou sem entrega'; end if;
end $$;

-- sai com o pedido e manda posições
create temp table tok as select qr_token from public.pedidos where id = pg_temp.id('ped');
grant select on tok to authenticated;
select from pg_temp.como('00000000-0000-0000-0000-0000000000d8');
select public.motoboy_despachar((select qr_token from tok));
insert into saida values ('p1', public.registrar_posicao(-27.120, -48.620, 8, 5.5, 90));
insert into saida values ('p2', public.registrar_posicao(-27.121, -48.621, 8, 6, 90));   -- logo em seguida: atualiza a última posição, não grava outro ponto
select public.registrar_destino(pg_temp.id('ped'), -27.13, -48.63);
select from pg_temp.esperar_erro($q$select public.registrar_posicao(120, 0)$q$, 'inválida');
reset role;
-- dono vê o motoboy ao vivo
select from pg_temp.como('00000000-0000-0000-0000-0000000000d7');
insert into saida values ('vivo', public.rastreio_ao_vivo(pg_temp.id('loja')));
do $$ begin if (select count(*) from public.motoboy_local) <> 1 then raise exception 'dono deveria ler motoboy_local'; end if; end $$;
reset role;
-- quem não é da loja não vê
select from pg_temp.como('00000000-0000-0000-0000-0000000000d9');
select from pg_temp.esperar_erro(format($q$select public.rastreio_ao_vivo('%s')$q$, pg_temp.id('loja')), 'acesso às entregas');
do $$ begin if exists (select 1 from public.motoboy_local) or exists (select 1 from public.motoboy_posicoes) then raise exception 'RLS do rastreio'; end if; end $$;
reset role;
do $$
declare m jsonb := pg_temp.v('vivo') #> '{motoboys,0}';
begin
  if not (pg_temp.v('p1') ->> 'ativo')::boolean then raise exception 'deveria rastrear em rota'; end if;
  if (select (lat, lng) from public.motoboy_local) <> (-27.121::float8, -48.621::float8) then raise exception 'última posição'; end if;
  if (select count(*) from public.motoboy_posicoes) <> 1 then raise exception 'caminho: um ponto a cada 8 s'; end if;
  if m ->> 'nome' <> 'Rafa Moto' or jsonb_array_length(m -> 'rota') <> 1 or jsonb_array_length(m -> 'entregas') <> 1
     or (m #>> '{entregas,0,destino_lat}')::float8 <> -27.13 or m #>> '{entregas,0,endereco}' <> 'Rua 1, 10' then
    raise exception 'ao vivo: %', m;
  end if;
end $$;

-- entregou: some do mapa e o app para
select from pg_temp.como('00000000-0000-0000-0000-0000000000d8');
select public.motoboy_entregar(pg_temp.id('ped'));
insert into saida values ('depois', public.registrar_posicao(-27.13, -48.63));
reset role;
do $$ begin
  if exists (select 1 from public.motoboy_local) or (pg_temp.v('depois') ->> 'ativo')::boolean then raise exception 'deveria sair do mapa'; end if;
end $$;

\o
\pset tuples_only on
select 'OK: rastreio dos motoboys';
