-- Testes de 0021: agenda da promoção (mesmos casos de packages/core/test/promocao.test.ts).
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f7', 'promo@example.com');
create or replace function pg_temp.como(p_user text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', p_user, false);
  execute 'set role authenticated';
end; $$;
create temp table ids (chave text primary key, id uuid);
grant all on ids to authenticated;
create or replace function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where chave = p $$;

select from pg_temp.como('00000000-0000-0000-0000-0000000000f7');
insert into ids values ('loja', public.criar_loja('Loja P', 'Pizza P', 'pizza-p', 'Pri'));
insert into ids select 'marca', id from public.marcas where slug = 'pizza-p';
insert into ids values ('setor', public.salvar_setor(pg_temp.id('loja'), null, 'Pizzas'));
insert into ids values ('pz', public.criar_produto(pg_temp.id('loja'), 'Pizza Grande', pg_temp.id('setor'), 81.99));
reset role;
update public.produto_marcas set preco_promocional = 69.99 where produto_id = pg_temp.id('pz');

create or replace function pg_temp.vale(p_dias smallint[], p_ini time, p_fim time, p_ate date, p_quando timestamptz) returns boolean language sql as $$
  select private.promo_vigente(pm, p_quando) is not null
    from (select (x).* from (select row(pm0.loja_id, pm0.produto_id, pm0.marca_id, pm0.ativo, pm0.delivery, pm0.presencial, pm0.totem, pm0.preco_delivery,
                                        pm0.preco_presencial, pm0.preco_promocional, pm0.gera_cashback, pm0.ordem, p_dias, p_ini, p_fim, p_ate)::public.produto_marcas as x
                               from public.produto_marcas pm0 where pm0.produto_id = pg_temp.id('pz')) s) pm
$$;

do $$ begin
  -- sem agenda
  if not pg_temp.vale(null, null, null, null, '2026-10-25 15:00-03') then raise exception 'sem agenda'; end if;
  if not pg_temp.vale('{}', null, null, null, '2026-10-25 15:00-03') then raise exception 'dias vazio'; end if;
  -- ter/qua/qui 18:00–23:59 até 30/11
  if not pg_temp.vale('{2,3,4}', '18:00', '23:59', '2026-11-30', '2026-10-27 19:00-03') then raise exception 'terça 19h'; end if;
  if pg_temp.vale('{2,3,4}', '18:00', '23:59', '2026-11-30', '2026-10-27 17:59-03') then raise exception 'terça antes'; end if;
  if pg_temp.vale('{2,3,4}', '18:00', '23:59', '2026-11-30', '2026-10-26 19:00-03') then raise exception 'segunda'; end if;
  if not pg_temp.vale('{2,3,4}', '18:00', '23:59', '2026-11-30', '2026-10-27 22:30Z') then raise exception 'UTC'; end if;
  if pg_temp.vale('{2,3,4}', '18:00', '23:59', '2026-11-30', '2026-12-01 19:00-03') then raise exception 'depois do fim'; end if;
  if not pg_temp.vale('{2,3,4}', '18:00', '23:59', '2026-11-30', '2026-11-26 19:00-03') then raise exception 'quinta'; end if;
  -- sexta 18:00–02:00
  if not pg_temp.vale('{5}', '18:00', '02:00', null, '2026-10-30 23:00-03') then raise exception 'sexta 23h'; end if;
  if not pg_temp.vale('{5}', '18:00', '02:00', null, '2026-10-31 01:30-03') then raise exception 'madrugada de sexta'; end if;
  if pg_temp.vale('{5}', '18:00', '02:00', null, '2026-10-31 03:00-03') then raise exception 'sábado 3h'; end if;
  if pg_temp.vale('{5}', '18:00', '02:00', null, '2026-10-30 01:30-03') then raise exception 'madrugada de quinta'; end if;
end $$;

-- preço do item e cardápio público: promoção sem agenda vale; fora do dia não vale
do $$
declare
  v_hoje smallint := extract(dow from now() at time zone 'America/Sao_Paulo')::smallint;
begin
  if (private.preco_item(pg_temp.id('pz'), pg_temp.id('marca'), 'delivery', '{}') ->> 'base')::int <> 6999 then raise exception 'promo sem agenda no preço'; end if;
  if (private.produto_publico(pg_temp.id('pz'), pg_temp.id('marca')) ->> 'preco_original')::int <> 8199 then raise exception 'riscado'; end if;
  update public.produto_marcas set promo_dias = array[(v_hoje + 1) % 7]::smallint[] where produto_id = pg_temp.id('pz');
  if (private.preco_item(pg_temp.id('pz'), pg_temp.id('marca'), 'delivery', '{}') ->> 'base')::int <> 8199 then raise exception 'promo fora do dia não vale'; end if;
  if private.produto_publico(pg_temp.id('pz'), pg_temp.id('marca')) ->> 'preco_original' is not null then raise exception 'sem riscado fora do dia'; end if;
  begin
    update public.produto_marcas set promo_inicio = '18:00' where produto_id = pg_temp.id('pz');
    raise exception 'horário sem fim deveria falhar';
  exception when check_violation then null;
  end;
end $$;

-- duplicar leva a agenda
select from pg_temp.como('00000000-0000-0000-0000-0000000000f7');
insert into ids values ('copia', public.duplicar_produto(pg_temp.id('pz')));
reset role;
do $$ begin
  if (select promo_dias from public.produto_marcas where produto_id = pg_temp.id('copia')) is distinct from (select promo_dias from public.produto_marcas where produto_id = pg_temp.id('pz')) then
    raise exception 'cópia sem agenda';
  end if;
end $$;

\o
\pset tuples_only on
select 'OK: promoção com agenda';
