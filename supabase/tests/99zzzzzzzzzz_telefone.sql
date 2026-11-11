-- Testes de 0031: telefone com o 9 (mesma regra do core) e pedido novo normalizado.
\set ON_ERROR_STOP on
\o /dev/null

do $$
declare r record;
begin
  for r in select * from (values
  ('4796731809', '47996731809'),
  ('+55 47 96731809', '47996731809'),
  ('554796731809', '47996731809'),
  ('047 9673-1809', '47996731809'),
  ('(47) 99673-1809', '47996731809'),
  ('5547996731809', '47996731809'),
  ('4733334444', '4733334444'),
  ('4788887777', '47988887777'),
  ('11912345678', '11912345678')) v(entrada, esperado) loop
    if private.normalizar_telefone(r.entrada) is distinct from r.esperado then
      raise exception 'normalizar_telefone(%) = % (esperava %)', r.entrada, private.normalizar_telefone(r.entrada), r.esperado;
    end if;
  end loop;
  if private.normalizar_telefone('') is not null or private.normalizar_telefone(null) is not null then raise exception 'vazio'; end if;
end $$;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000001d1', 'tel@example.com'),
  ('00000000-0000-0000-0000-0000000001d2', 'moto13@equipe.res.invalid'),
  ('00000000-0000-0000-0000-0000000001d3', 'fora@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000001d1');
insert into ids values ('loja', public.criar_loja('Loja T', 'Pizza T', 'pizza-tel', 'Rui'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-tel';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza', pg_temp.id('setor'), 50));
select public.registrar_usuario_caixa(pg_temp.id('loja'), '00000000-0000-0000-0000-0000000001d2', 'moto13', 'Tel Moto', 'entregador');
reset role;
-- cadastros antigos: o mesmo cliente salvo sem o 9 e com o 9
alter table public.pedidos disable trigger pedidos_a_normaliza_telefone;
select from pg_temp.como('00000000-0000-0000-0000-0000000001d1');
insert into ids values ('velho', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 5,
  'cliente', jsonb_build_object('nome', 'Duda', 'telefone', '4796731809'), 'endereco', jsonb_build_object('logradouro', 'Rua 2', 'numero', '5', 'bairro', 'Morretes'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
insert into ids values ('novo', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 5,
  'cliente', jsonb_build_object('nome', 'Duda', 'telefone', '47996731809'), 'endereco', jsonb_build_object('logradouro', 'Rua 2', 'numero', '5', 'bairro', 'Morretes'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
insert into ids values ('fixo', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 5,
  'cliente', jsonb_build_object('nome', 'Duda', 'telefone', '4733334444'), 'endereco', jsonb_build_object('logradouro', 'Rua 2', 'numero', '5', 'bairro', 'Morretes'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
reset role;
alter table public.pedidos enable trigger pedidos_a_normaliza_telefone;
update public.clientes set observacoes = 'portão azul' where telefone = '4796731809';
select private.corrigir_telefones();

-- pedido novo com o número sem o 9 cai no mesmo cadastro
select from pg_temp.como('00000000-0000-0000-0000-0000000001d1');
insert into ids values ('depois', public.criar_pedido(pg_temp.id('loja'), pg_temp.id('marca'), jsonb_build_object('tipo', 'entrega', 'taxa_entrega', 5,
  'cliente', jsonb_build_object('nome', 'Duda', 'telefone', '+55 47 9673-1809'), 'endereco', jsonb_build_object('logradouro', 'Rua 2', 'numero', '5', 'bairro', 'Morretes'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
reset role;

do $$ begin
  if (select count(*) from public.clientes where grupo = private.grupo_da_loja(pg_temp.id('loja'))) <> 2 then
    raise exception 'deveria juntar os dois cadastros: %', (select jsonb_agg(telefone) from public.clientes where grupo = private.grupo_da_loja(pg_temp.id('loja')));
  end if;
  if (select count(*) from public.pedidos p join public.clientes c on c.id = p.cliente_id where c.telefone = '47996731809') <> 3
     or (select observacoes from public.clientes where telefone = '47996731809' and grupo = private.grupo_da_loja(pg_temp.id('loja'))) <> 'portão azul' then
    raise exception 'cadastro juntado';
  end if;
  if exists (select 1 from public.pedidos where loja_id = pg_temp.id('loja') and cliente_telefone not in ('47996731809', '4733334444')) then
    raise exception 'pedidos com telefone fora do padrão';
  end if;
  if (select count(*) from public.cliente_enderecos e join public.clientes c on c.id = e.cliente_id where c.telefone = '47996731809') <> 1 then
    raise exception 'endereço duplicado';
  end if;
end $$;

\o
\pset tuples_only on
select 'OK: telefone com o 9';
