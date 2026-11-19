with f as (
  select 'função' tipo, n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' objeto,
         md5(replace(p.prosrc, chr(13), '')||'|'||p.prosecdef::text||'|'||coalesce(array_to_string(p.proconfig,','),'')||'|'||p.provolatile::text) h
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname in ('public','private') and p.prokind in ('f','p') and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e') and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
), t as (
  select 'tabela', n.nspname||'.'||c.relname,
         md5(string_agg(a.attname||':'||format_type(a.atttypid,a.atttypmod)||':'||a.attnotnull, ',' order by a.attname))
    from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
   where n.nspname in ('public','private') and c.relkind in ('r','v')
   group by 1,2
), r as (
  select 'rls', n.nspname||'.'||c.relname, md5(c.relrowsecurity::text)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private') and c.relkind='r'
), pol as (
  select 'política', schemaname||'.'||tablename||'.'||policyname, md5(cmd||'|'||array_to_string(roles,',')||'|'||coalesce(qual,'')||'|'||coalesce(with_check,''))
    from pg_policies where schemaname in ('public','private')
), tg as (
  select 'gatilho', n.nspname||'.'||c.relname||'.'||g.tgname, md5(g.tgenabled::text||(select p.proname from pg_proc p where p.oid=g.tgfoid))
    from pg_trigger g join pg_class c on c.oid=g.tgrelid join pg_namespace n on n.oid=c.relnamespace
   where not g.tgisinternal and n.nspname in ('public','private')
)
select * from f union all select * from t union all select * from r union all select * from pol union all select * from tg;
