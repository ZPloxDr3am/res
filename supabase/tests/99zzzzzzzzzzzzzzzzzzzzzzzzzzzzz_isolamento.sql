-- Isolamento entre empresas (auditoria de engenharia, 19/11/2026).
-- Roda por último, sobre os dados que os outros testes deixaram (100+ usuários, 40+ contas, 50+ lojas).
-- 1. Leitura: nenhum usuário (nem o anônimo) enxerga, direto nas tabelas e views, linhas de outra empresa.
-- 2. Escrita: ninguém insere, altera ou apaga linhas de outra empresa (com controle positivo na própria).
-- 3. Funções SECURITY DEFINER: chamadas por anônimo e por um dono de outra empresa, com ids alheios,
--    não mudam dados de outras empresas nem devolvem ids/telefones de pedidos, clientes, lançamentos e caixas alheios.
\set ON_ERROR_STOP on
\o /dev/null

-- ---------------------------------------------------------------- 1. leitura
create temp table g_loja as select id loja, coalesce(conta_id, id) grupo from public.lojas;
grant select on g_loja to authenticated, anon;
create temp table vaz (usuario text, tabela text, linhas int);
grant all on vaz to authenticated, anon;
do $$
declare u record; t record; expr text; n int; permitidos uuid[]; cols text[];
begin
  for u in select id::text uid from auth.users x
           where not exists (select 1 from private.equipe_res e where e.user_id = x.id)
           union all select '' loop
    select coalesce(array_agg(distinct g.grupo), '{}') into permitidos from public.membros m join g_loja g on g.loja = m.loja_id where m.user_id::text = u.uid and m.ativo;
    perform set_config('request.jwt.claim.sub', u.uid, false);
    perform set_config('request.jwt.claims', case when u.uid='' then '' else jsonb_build_object('sub',u.uid)::text end, false);
    if u.uid = '' then execute 'set role anon'; else execute 'set role authenticated'; end if;
    for t in select c.relname from pg_class c join pg_namespace s on s.oid=c.relnamespace where nspname='public' and relkind in ('r','v') and relname not in ('canais','modulos_res','planos_res','recursos_acesso') loop
      select array_agg(attname::text) into cols from pg_attribute where attrelid=('public.'||t.relname)::regclass and attnum>0 and not attisdropped;
      expr := case
        when t.relname='contas' then 'x.id'
        when t.relname='lojas' then 'coalesce(x.conta_id,x.id)'
        when t.relname='cliente_enderecos' then '(select grupo from g_loja where loja=(select loja_id from public.clientes c where c.id=x.cliente_id))'
        else nullif(concat_ws(',',
          case when 'loja_id'=any(cols) then '(select grupo from g_loja where loja=x.loja_id)' end,
          case when 'conta_id'=any(cols) then 'x.conta_id' end,
          case when 'grupo_id'=any(cols) then 'x.grupo_id' end,
          case when 'grupo'=any(cols) and t.relname like 'motoboy%' then 'x.grupo' end), '') end;
      if expr is not null and expr not like '(select grupo from g_loja where loja=(%' and position(',' in expr) > 0 then expr := 'coalesce('||expr||')'; end if;
      begin
        if expr is null then
          execute format('select count(*) from public.%I x', t.relname) into n;
        else
          execute format('select count(*) from public.%I x where not coalesce(%s = any($1), false)', t.relname, expr) using permitidos into n;
        end if;
      exception when insufficient_privilege then n := 0;
      end;
      if n > 0 then insert into vaz values (u.uid, t.relname, n); end if;
    end loop;
    execute 'reset role';
  end loop;
end $$;

do $$ begin
  if exists (select 1 from vaz) then
    raise exception 'Isolamento (leitura) violado: %', (select string_agg(distinct tabela || ' por ' || coalesce(nullif(usuario, ''), 'anônimo'), '; ') from vaz);
  end if;
end $$;

-- ---------------------------------------------------------------- 2. escrita
create temp table esc (usuario text, tabela text, acao text, detalhe text);
grant all on esc to authenticated, anon;
do $$
declare r text; nu int; nd int; u record; t record; j jsonb; n int; meu uuid[]; alvo_loja uuid; cols text[]; pk text;
begin
  -- usuários de teste: todos os não-equipe com vínculo ativo + anônimo
  for u in select distinct m.user_id::text uid from public.membros m where m.ativo
             and not exists (select 1 from private.equipe_res e where e.user_id=m.user_id)
           union all select '' loop
    select coalesce(array_agg(distinct coalesce(l.conta_id,l.id)),'{}') into meu from public.membros m join public.lojas l on l.id=m.loja_id where m.user_id::text=u.uid and m.ativo;
    for t in select c.relname from pg_class c join pg_namespace s on s.oid=c.relnamespace where nspname='public' and relkind='r' and relname not in ('canais','modulos_res','planos_res','recursos_acesso') loop
      select array_agg(attname::text) into cols from pg_attribute where attrelid=('public.'||t.relname)::regclass and attnum>0 and not attisdropped;
      if not ('loja_id'=any(cols)) then continue; end if;
      -- uma linha de outra empresa (lida como superusuário)
      execute format('select to_jsonb(x) from public.%I x join public.lojas l on l.id=x.loja_id where not (coalesce(l.conta_id,l.id) = any($1)) limit 1', t.relname) using meu into j;
      if j is null then continue; end if;
      -- INSERT de cópia com id novo
      r := null; nu := 0; nd := 0;
      begin
        perform set_config('request.jwt.claim.sub', u.uid, true);
        perform set_config('request.jwt.claims', case when u.uid='' then '' else jsonb_build_object('sub',u.uid)::text end, true);
        if u.uid='' then execute 'set local role anon'; else execute 'set local role authenticated'; end if;
        if j ? 'id' then j := j || jsonb_build_object('id', gen_random_uuid()); end if;
        execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)', t.relname, t.relname) using j;
        r := 'ACEITO';
        raise exception 'desfazer' using errcode='P0999';
      exception when sqlstate 'P0999' then null;
                when others then null;
      end;
      if r is not null then insert into esc values (u.uid, t.relname, 'insert', r); end if;
      -- UPDATE / DELETE em linhas de outra empresa
      begin
        perform set_config('request.jwt.claim.sub', u.uid, true);
        perform set_config('request.jwt.claims', case when u.uid='' then '' else jsonb_build_object('sub',u.uid)::text end, true);
        if u.uid='' then execute 'set local role anon'; else execute 'set local role authenticated'; end if;
        execute format('with a as (update public.%I x set loja_id = loja_id where x.loja_id = $1 returning 1) select count(*) from a', t.relname) using (j->>'loja_id')::uuid into nu;
        execute format('with a as (delete from public.%I x where x.loja_id = $1 returning 1) select count(*) from a', t.relname) using (j->>'loja_id')::uuid into nd;
        raise exception 'desfazer' using errcode='P0999';
      exception when sqlstate 'P0999' then null;
                when others then null;
      end;
      if nu > 0 then insert into esc values (u.uid, t.relname, 'update', nu::text); end if;
      if nd > 0 then insert into esc values (u.uid, t.relname, 'delete', nd::text); end if;
    end loop;
  end loop;
end $$;

do $$ begin
  if exists (select 1 from esc) then
    raise exception 'Isolamento (escrita) violado: %', (select string_agg(distinct tabela || ' ' || acao, '; ') from esc);
  end if;
end $$;
create temp table esc_ctl (usuario text, tabela text, acao text, detalhe text);
grant all on esc_ctl to authenticated, anon;
do $$
declare r text; nu int; nd int; u record; t record; j jsonb; n int; meu uuid[]; alvo_loja uuid; cols text[]; pk text;
begin
  -- usuários de teste: todos os não-equipe com vínculo ativo + anônimo
  for u in select distinct m.user_id::text uid from public.membros m where m.ativo
             and not exists (select 1 from private.equipe_res e where e.user_id=m.user_id)
           union all select '' loop
    select coalesce(array_agg(distinct coalesce(l.conta_id,l.id)),'{}') into meu from public.membros m join public.lojas l on l.id=m.loja_id where m.user_id::text=u.uid and m.ativo;
    for t in select c.relname from pg_class c join pg_namespace s on s.oid=c.relnamespace where nspname='public' and relkind='r' and relname not in ('canais','modulos_res','planos_res','recursos_acesso') loop
      select array_agg(attname::text) into cols from pg_attribute where attrelid=('public.'||t.relname)::regclass and attnum>0 and not attisdropped;
      if not ('loja_id'=any(cols)) then continue; end if;
      -- uma linha de outra empresa (lida como superusuário)
      execute format('select to_jsonb(x) from public.%I x join public.lojas l on l.id=x.loja_id where (coalesce(l.conta_id,l.id) = any($1)) limit 1', t.relname) using meu into j;
      if j is null then continue; end if;
      -- INSERT de cópia com id novo
      r := null; nu := 0; nd := 0;
      begin
        perform set_config('request.jwt.claim.sub', u.uid, true);
        perform set_config('request.jwt.claims', case when u.uid='' then '' else jsonb_build_object('sub',u.uid)::text end, true);
        if u.uid='' then execute 'set local role anon'; else execute 'set local role authenticated'; end if;
        if j ? 'id' then j := j || jsonb_build_object('id', gen_random_uuid()); end if;
        execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)', t.relname, t.relname) using j;
        r := 'ACEITO';
        raise exception 'desfazer' using errcode='P0999';
      exception when sqlstate 'P0999' then null;
                when others then null;
      end;
      if r is not null then insert into esc_ctl values (u.uid, t.relname, 'insert', r); end if;
      -- UPDATE / DELETE em linhas de outra empresa
      begin
        perform set_config('request.jwt.claim.sub', u.uid, true);
        perform set_config('request.jwt.claims', case when u.uid='' then '' else jsonb_build_object('sub',u.uid)::text end, true);
        if u.uid='' then execute 'set local role anon'; else execute 'set local role authenticated'; end if;
        execute format('with a as (update public.%I x set loja_id = loja_id where x.loja_id = $1 returning 1) select count(*) from a', t.relname) using (j->>'loja_id')::uuid into nu;
        execute format('with a as (delete from public.%I x where x.loja_id = $1 returning 1) select count(*) from a', t.relname) using (j->>'loja_id')::uuid into nd;
        raise exception 'desfazer' using errcode='P0999';
      exception when sqlstate 'P0999' then null;
                when others then null;
      end;
      if nu > 0 then insert into esc_ctl values (u.uid, t.relname, 'update', nu::text); end if;
      if nd > 0 then insert into esc_ctl values (u.uid, t.relname, 'delete', nd::text); end if;
    end loop;
  end loop;
end $$;

do $$ begin
  if (select count(*) from esc_ctl where acao = 'update') < 10 then
    raise exception 'Controle positivo falhou: o teste de escrita não está enxergando nem a própria empresa';
  end if;
end $$;

-- ---------------------------------------------------------------- 3. funções
-- grupo do atacante
create temp table cfg as select '00000000-0000-0000-0000-0000000000c7'::text atac,
  (select coalesce(l.conta_id,l.id) from membros m join lojas l on l.id=m.loja_id where m.user_id='00000000-0000-0000-0000-0000000000c7' limit 1) grupo;
-- tabelas com loja_id para snapshot
create temp table tab as select c.relname::text t from pg_class c join pg_namespace s on s.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attname='loja_id'
  where nspname='public' and relkind='r' and relname not in ('auditoria','erros_app','ia_uso');
create or replace function pg_temp.snap() returns text language plpgsql as $$
declare t text; acc text := ''; h text; g uuid := (select grupo from cfg);
begin
  for t in select tab.t from tab order by 1 loop
    execute format('select md5(coalesce(string_agg(x::text, ''|'' order by x::text),'''')) from public.%I x where x.loja_id not in (select loja from g_loja where grupo=$1)', t) using g into h;
    acc := acc || h;
  end loop;
  return md5(acc);
end $$;
-- segredos de outras empresas
create temp table seg as
  select id::text s from pedidos where loja_id not in (select loja from g_loja where grupo=(select grupo from cfg))
  union select id::text from clientes where loja_id not in (select loja from g_loja where grupo=(select grupo from cfg))
  union select telefone from clientes where telefone is not null and length(telefone)>=8 and loja_id not in (select loja from g_loja where grupo=(select grupo from cfg))
  union select id::text from fin_lancamentos where coalesce(loja_id::text,'') not in (select loja::text from g_loja where grupo=(select grupo from cfg)) and coalesce(grupo_id,'00000000-0000-0000-0000-000000000000') <> (select grupo from cfg)
  union select id::text from caixas where loja_id not in (select loja from g_loja where grupo=(select grupo from cfg));
-- ids candidatos por tabela (de outras empresas)
create or replace function pg_temp.id_de(p_nome text) returns uuid language plpgsql as $$
declare base text := regexp_replace(lower(p_nome), '^p_', ''); cand text; r uuid; cols text[];
begin
  if base in ('loja','lojas') or base like 'loja_%' then base := 'loja'; end if;
  if base in ('conta','grupo') then
    select grupo into r from g_loja where grupo <> (select grupo from cfg) and grupo in (select id from contas) limit 1; return r; end if;
  foreach cand in array array[base||'s', base||'es', base, regexp_replace(base,'ao$','oes'), regexp_replace(base,'l$','is')] loop
    if to_regclass('public.'||cand) is not null then
      select array_agg(attname::text) into cols from pg_attribute where attrelid=('public.'||cand)::regclass and attnum>0 and not attisdropped;
      if not ('id'=any(cols)) then continue; end if;
      if 'loja_id'=any(cols) then
        execute format('select id from public.%I where loja_id not in (select loja from g_loja where grupo=$1) limit 1', cand) using (select grupo from cfg) into r;
      elsif cand='lojas' then
        select loja into r from g_loja where grupo <> (select grupo from cfg) limit 1;
      else
        execute format('select id from public.%I limit 1', cand) into r;
      end if;
      if r is not null then return r; end if;
    end if;
  end loop;
  select loja into r from g_loja where grupo <> (select grupo from cfg) limit 1;  -- padrão: uma loja alheia
  return r;
end $$;
create temp table res (funcao text, papel text, resultado text, mudou bool, vazou text);
do $$
declare f record; papel text; args text; i int; nm text; tp text; sql text; out text; antes text; depois text; m bool; vz text; resu text; slug text;
begin
  select l.slug into slug from marcas l join g_loja g on g.loja=l.loja_id where g.grupo <> (select grupo from cfg) and l.slug is not null limit 1;
  for f in select p.oid, p.proname, p.proargnames, p.pronargs, p.proargtypes, p.proretset
           from pg_proc p where p.pronamespace='public'::regnamespace and p.prosecdef and p.prokind='f'
           order by p.proname loop
    -- monta os argumentos
    args := '';
    for i in 0..f.pronargs-1 loop
      nm := coalesce(f.proargnames[i+1], 'x'); tp := format_type(f.proargtypes[i], null);
      args := args || case when i>0 then ', ' else '' end || case
        when tp='uuid' then quote_literal(coalesce(pg_temp.id_de(nm)::text, gen_random_uuid()::text))||'::uuid'
        when tp='uuid[]' then 'array['||quote_literal(pg_temp.id_de(regexp_replace(nm,'s$',''))::text)||'::uuid]'
        when tp='text' and nm ilike '%slug%' then quote_literal(slug)
        when tp='text' and nm ilike '%telefone%' then quote_literal('47999990000')
        when tp in ('text','character varying') then quote_literal('x')
        when tp in ('jsonb','json') then '''{}''::'||tp
        when tp in ('integer','bigint','smallint','numeric','real','double precision') then '1'
        when tp='boolean' then 'true'
        when tp='date' then 'current_date'
        when tp like 'timestamp%' then 'now()'
        when tp like '%[]' then '''{}''::'||tp
        else 'null::'||tp end;
    end loop;
    sql := format('select (%s)::text', format('public.%I(%s)', f.proname, args));
    if f.proretset then sql := format('select string_agg(x::text, %L) from public.%I(%s) x', '|', f.proname, args); end if;
    foreach papel in array array['anon','authenticated'] loop
      if not has_function_privilege(papel, f.oid, 'execute') then continue; end if;
      antes := pg_temp.snap(); out := null; resu := null; m := false;
      begin
        perform set_config('request.jwt.claim.sub', case when papel='anon' then '' else (select atac from cfg) end, true);
        perform set_config('request.jwt.claims', case when papel='anon' then '' else jsonb_build_object('sub',(select atac from cfg))::text end, true);
        execute 'set local role '||papel;
        execute sql into out;
        execute 'reset role';
        depois := pg_temp.snap();
        resu := 'ok';
        m := depois <> antes;
        raise exception 'desfazer' using errcode='P0999';
      exception when sqlstate 'P0999' then null;
        when others then resu := 'erro: '||left(sqlerrm, 80);
      end;
      vz := null;
      if out is not null then
        select string_agg(s, ',') into vz from (select s from seg where position(s in out) > 0 and position(s in args) = 0 limit 3) q;
      end if;
      insert into res values (f.proname, papel, resu, m, vz);
    end loop;
  end loop;
end $$;

do $$ begin
  if exists (select 1 from res where mudou or vazou is not null) then
    raise exception 'Isolamento (funções) violado: %', (select string_agg(funcao || '/' || papel || coalesce(' vazou ' || vazou, ' mudou dados'), '; ') from res where mudou or vazou is not null);
  end if;
  if (select count(*) from res) < 300 then raise exception 'Poucas funções testadas: %', (select count(*) from res); end if;
end $$;
reset role;
\o
select 'ok isolamento: ' || (select count(*) from res) || ' chamadas de funções, leitura e escrita de todas as tabelas por todos os usuários: nada de outra empresa';
