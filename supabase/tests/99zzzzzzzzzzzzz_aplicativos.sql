-- Testes de 0039: aplicativos (Pix, pixels, avaliação, link do grupo, permissões, público).
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000002a1', 'apl@example.com'),
  ('00000000-0000-0000-0000-0000000002a2', 'moto16@equipe.res.invalid'),
  ('00000000-0000-0000-0000-0000000002a3', 'fora2@example.com');
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

select from pg_temp.como('00000000-0000-0000-0000-0000000002a1');
insert into ids values ('loja', public.criar_loja('Loja A', 'Pizza A', 'pizza-apl', 'Rui'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-apl';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza', pg_temp.id('setor'), 50));
select from public.salvar_config_delivery(pg_temp.id('marca'), '{"status": "aberto", "pedido_minimo": 0, "aceita_entrega": true, "aceita_retirada": true, "formas_pagamento": ["dinheiro", "pix"], "areas": [{"bairro": "Centro", "taxa": 5}]}');
select from pg_temp.esperar_erro(format($q$select public.salvar_integracao('%s', 'pix', true, '{"tipo_chave": "cpf", "chave": "1", "nome": "X", "cidade": "Y"}', false)$q$, pg_temp.id('loja')), 'Confira a chave');
select from pg_temp.esperar_erro(format($q$select public.salvar_integracao('%s', 'meta_pixel', true, '{"id": "abc"}', false)$q$, pg_temp.id('loja')), 'Pixel do Meta');
select from pg_temp.esperar_erro(format($q$select public.salvar_integracao('%s', 'google_avaliacao', true, '{"url": "https://exemplo.com/x"}', false)$q$, pg_temp.id('loja')), 'avaliação');
select from pg_temp.esperar_erro(format($q$select public.salvar_integracao('%s', 'whatsapp', true, '{}', false)$q$, pg_temp.id('loja')), 'desconhecido');
insert into saida values ('n_pix', to_jsonb(public.salvar_integracao(pg_temp.id('loja'), 'pix', true, '{"tipo_chave": "telefone", "chave": "+5547996731809", "nome": " Pizza A ", "cidade": "Pomerode"}', true)));
select public.salvar_integracao(pg_temp.id('loja'), 'meta_pixel', true, '{"id": "1234 5678 9012 345"}', false);
select public.salvar_integracao(pg_temp.id('loja'), 'google_ads', true, '{"id": "aw-123456789", "rotulo": "AbC_dEf123"}', false);
select public.salvar_integracao(pg_temp.id('loja'), 'google_tag_manager', false, '{"id": "GTM-ABCD12"}', false);
select public.salvar_integracao(pg_temp.id('loja'), 'google_avaliacao', true, '{"url": "https://g.page/r/pizza-a/review"}', false);
insert into saida values ('painel', public.aplicativos_painel(pg_temp.id('loja')));
select from pg_temp.esperar_erro(format($q$select public.salvar_link_grupo('%s', 'Grupo A!')$q$, pg_temp.id('loja')), 'letras');
select public.salvar_link_grupo(pg_temp.id('loja'), 'grupo-apl');
select from pg_temp.como('00000000-0000-0000-0000-0000000002a3');
select from pg_temp.esperar_erro(format($q$select public.aplicativos_painel('%s')$q$, pg_temp.id('loja')), 'gestor');
select from pg_temp.esperar_erro(format($q$select public.salvar_integracao('%s', 'meta_pixel', true, '{"id": "1234567890"}', false)$q$, pg_temp.id('loja')), 'gestor');
select from pg_temp.esperar_erro(format($q$select public.salvar_link_grupo('%s', 'outro-link')$q$, pg_temp.id('loja')), 'titular');
reset role;

-- cliente (sem login)
set role anon;
insert into saida values ('rast', public.rastreamento_publico('PIZZA-APL'));
insert into saida values ('ped', public.criar_pedido_publico('pizza-apl', jsonb_build_object('tipo', 'retirada', 'cliente', jsonb_build_object('nome', 'Ana', 'telefone', '47911113333'),
  'pagamento', 'pix', 'itens', jsonb_build_array(jsonb_build_object('produto_id', pg_temp.id('pz'), 'quantidade', 1)))));
insert into saida values ('grupo', public.grupo_publico('grupo-apl'));
insert into saida values ('grupo_x', coalesce(public.grupo_publico('nao-existe'), 'null'));
reset role;
create temp table cod as select codigo, numero from public.pedidos where loja_id = pg_temp.id('loja');
grant select on cod to anon;
set role anon;
insert into saida values ('extras', public.extras_pedido_publico((select codigo from cod)));
reset role;
update public.pedidos set pago_em = now() where loja_id = pg_temp.id('loja');
set role anon;
insert into saida values ('extras_pago', public.extras_pedido_publico((select codigo from cod)));
reset role;

select from pg_temp.como('00000000-0000-0000-0000-0000000002a1');
select public.remover_integracao(pg_temp.id('loja'), 'meta_pixel');
reset role;
set role anon;
insert into saida values ('rast2', public.rastreamento_publico('pizza-apl'));
reset role;

do $$
declare p jsonb := pg_temp.v('painel'); r jsonb := pg_temp.v('rast'); e jsonb := pg_temp.v('extras');
begin
  if pg_temp.v('n_pix')::int <> 1 or p #>> '{integracoes,pix,config,nome}' <> 'Pizza A' or p #>> '{integracoes,meta_pixel,config,id}' <> '123456789012345'
     or p ->> 'link' is not null or not (p ->> 'pode_link')::boolean or jsonb_array_length(p -> 'cardapios') <> 1 then
    raise exception 'painel: %', p;
  end if;
  -- público: só pixels ligados; nada de Pix nem avaliação aqui
  if r #>> '{meta_pixel,id}' <> '123456789012345' or r #>> '{google_ads,id}' <> 'AW-123456789' or r ? 'google_tag_manager' or r ? 'pix' then
    raise exception 'rastreamento: %', r;
  end if;
  if e #>> '{pix,chave}' <> '+5547996731809' or (e #>> '{pix,valor}')::int <> 5000 or (e #>> '{pix,pago}')::boolean
     or (e #>> '{pix,numero}')::int <> (select numero from cod) or e ->> 'avaliacao' <> 'https://g.page/r/pizza-a/review' then
    raise exception 'extras: %', e;
  end if;
  if not (pg_temp.v('extras_pago') #>> '{pix,pago}')::boolean then raise exception 'extras pago: %', pg_temp.v('extras_pago'); end if;
  if jsonb_array_length(pg_temp.v('grupo') -> 'cardapios') <> 1 or pg_temp.v('grupo') #>> '{cardapios,0,slug}' <> 'pizza-apl'
     or not (pg_temp.v('grupo') #>> '{cardapios,0,aberta}')::boolean or pg_temp.v('grupo_x') <> 'null'::jsonb then
    raise exception 'grupo: %', pg_temp.v('grupo');
  end if;
  if pg_temp.v('rast2') ? 'meta_pixel' then raise exception 'remover: %', pg_temp.v('rast2'); end if;
end $$;

\o
\pset tuples_only on
select 'OK: aplicativos';
