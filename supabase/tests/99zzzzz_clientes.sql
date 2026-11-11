-- Testes de 0025: cadastro de clientes salvo pelo pedido, busca e observações.
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000fc', 'cli@example.com'),
  ('00000000-0000-0000-0000-0000000000fd', 'outro@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000000fc');
insert into ids values ('loja', public.criar_loja('Loja E', 'Pizza E', 'pizza-e', 'Eva'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-e';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza', pg_temp.id('setor'), 50));
-- 1º pedido: entrega
select public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 0,
  'cliente', jsonb_build_object('nome', 'Ana', 'telefone', '(47) 99123-4567'),
  'endereco', jsonb_build_object('logradouro', 'Rua 300', 'numero', '120', 'bairro', 'Centro', 'referencia', 'portão azul'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1))));
-- 2º pedido: mesmo telefone, outro endereço, nome completo
select public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 0,
  'cliente', jsonb_build_object('nome', 'Ana Souza', 'telefone', '47991234567'),
  'endereco', jsonb_build_object('logradouro', 'Av. Nereu', 'numero', '9', 'bairro', 'Meia Praia'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 2))));
-- mesmo endereço do 1º (com espaços diferentes) não duplica
select public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 0,
  'cliente', jsonb_build_object('nome', 'Ana Souza', 'telefone', '47991234567'),
  'endereco', jsonb_build_object('logradouro', 'Rua  300', 'numero', '120', 'bairro', 'centro'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1))));
-- balcão sem telefone: não cadastra
select public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'balcao', 'cliente', jsonb_build_object('nome', 'Avulso'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1))));
insert into saida values ('tel', public.buscar_clientes(pg_temp.id('loja'), '91234'));
insert into saida values ('nome', public.buscar_clientes(pg_temp.id('loja'), 'souz'));
insert into saida values ('todos', public.buscar_clientes(pg_temp.id('loja'), ''));
insert into ids select 'cli', (pg_temp.v('tel') #>> '{0,id}')::uuid;
select public.salvar_cliente(pg_temp.id('loja'), pg_temp.id('cli'), 'Ana Souza', 'Não gosta de cebola');
reset role;
do $$
declare c jsonb := pg_temp.v('tel') -> 0;
begin
  if jsonb_array_length(pg_temp.v('tel')) <> 1 or c ->> 'nome' <> 'Ana Souza' or c ->> 'telefone' <> '47991234567' then raise exception 'busca por telefone: %', pg_temp.v('tel'); end if;
  if jsonb_array_length(c -> 'enderecos') <> 2 or c #>> '{enderecos,0,logradouro}' <> 'Rua 300' or c #>> '{enderecos,0,referencia}' <> 'portão azul' then raise exception 'endereços: %', c -> 'enderecos'; end if;
  if (c ->> 'pedidos')::int <> 3 or (c ->> 'total_gasto')::int <> 20000 then raise exception 'histórico: %', c; end if;
  if jsonb_array_length(pg_temp.v('nome')) <> 1 or jsonb_array_length(pg_temp.v('todos')) <> 1 then raise exception 'busca por nome / todos'; end if;
  if (select observacoes from public.clientes where id = pg_temp.id('cli')) <> 'Não gosta de cebola' then raise exception 'observação'; end if;
  if (select count(*) from public.pedidos where cliente_id = pg_temp.id('cli')) <> 3 then raise exception 'pedidos ligados ao cliente'; end if;
end $$;

-- quem não é da loja não vê
select from pg_temp.como('00000000-0000-0000-0000-0000000000fd');
select from pg_temp.esperar_erro(format($q$select public.buscar_clientes('%s', 'ana')$q$, pg_temp.id('loja')), 'acesso aos clientes');
do $$ begin if exists (select 1 from public.clientes) then raise exception 'RLS de clientes'; end if; end $$;
reset role;

\o
\pset tuples_only on
select 'OK: clientes';
