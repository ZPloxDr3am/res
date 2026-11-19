-- Auditoria de engenharia (19/11/2026), P2 de desempenho: as políticas de RLS chamavam uma função por linha
-- (private.tem_permissao(loja_id, …), e_membro, e_gestor, e_membro_grupo). Numa consulta que passa por
-- 120 mil pedidos, eram 120 mil chamadas (2 s). Agora a política pergunta "a loja da linha está na lista de lojas
-- do usuário?", e a lista é calculada UMA vez por consulta ((select …) vira InitPlan no Postgres).
-- As listas usam exatamente as mesmas regras das funções antigas, que continuam existindo para o resto do sistema.
-- Pode rodar de novo: depois da troca, nenhuma política tem mais o padrão antigo.

-- Lojas em que o usuário tem a permissão (mesma regra de private.tem_permissao).
create or replace function private.lojas_permitidas(p_recurso text)
returns uuid[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(distinct m.loja_id), '{}')
    from public.membros m
    left join public.grupos_acesso g on g.id = m.grupo_acesso_id
   where m.user_id = auth.uid() and m.ativo
     and (m.papel in ('dono', 'gerente') or p_recurso = any (coalesce(g.permissoes, '{}')));
$$;

-- Lojas de que o usuário é membro ativo (mesma regra de private.e_membro).
create or replace function private.lojas_membro()
returns uuid[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(distinct m.loja_id), '{}')
    from public.membros m
   where m.user_id = auth.uid() and m.ativo;
$$;

-- Lojas em que o usuário é dono ou gerente (mesma regra de private.e_gestor).
create or replace function private.lojas_gestor()
returns uuid[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(distinct m.loja_id), '{}')
    from public.membros m
   where m.user_id = auth.uid() and m.ativo and m.papel in ('dono', 'gerente');
$$;

-- Lojas do mesmo grupo (conta) de alguma loja em que o usuário é membro (mesma regra de private.e_membro_grupo).
create or replace function private.lojas_grupo_membro()
returns uuid[]
language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(distinct l2.id), '{}')
    from public.membros m
    join public.lojas l1 on l1.id = m.loja_id
    join public.lojas l2 on l2.id = l1.id or (l1.conta_id is not null and l2.conta_id = l1.conta_id)
   where m.user_id = auth.uid() and m.ativo;
$$;

revoke all on function private.lojas_permitidas(text), private.lojas_membro(), private.lojas_gestor(), private.lojas_grupo_membro() from public;
grant execute on function private.lojas_permitidas(text), private.lojas_membro(), private.lojas_gestor(), private.lojas_grupo_membro() to anon, authenticated;

-- Troca o padrão antigo pelo novo em todas as políticas do esquema public (USING e WITH CHECK).
do $$
declare
  p record;
  v_qual text;
  v_check text;
  col constant text := '([a-z_]+(?:\.[a-z_]+)?)';
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
      from pg_policies
     where schemaname = 'public'
       and (coalesce(qual, '') || coalesce(with_check, '')) ~ 'private\.(tem_permissao|e_membro|e_gestor|e_membro_grupo)\('
  loop
    v_qual := p.qual;
    v_check := p.with_check;
    -- tem_permissao(col, 'recurso'::text)
    v_qual  := regexp_replace(v_qual,  'private\.tem_permissao\(' || col || ', (''[a-z_]+''::text)\)', '(\1 = ANY (((SELECT private.lojas_permitidas(\2)))::uuid[]))', 'g');
    v_check := regexp_replace(v_check, 'private\.tem_permissao\(' || col || ', (''[a-z_]+''::text)\)', '(\1 = ANY (((SELECT private.lojas_permitidas(\2)))::uuid[]))', 'g');
    -- e_membro_grupo(col) antes de e_membro(col)
    v_qual  := regexp_replace(v_qual,  'private\.e_membro_grupo\(' || col || '\)', '(\1 = ANY (((SELECT private.lojas_grupo_membro()))::uuid[]))', 'g');
    v_check := regexp_replace(v_check, 'private\.e_membro_grupo\(' || col || '\)', '(\1 = ANY (((SELECT private.lojas_grupo_membro()))::uuid[]))', 'g');
    v_qual  := regexp_replace(v_qual,  'private\.e_membro\(' || col || '\)', '(\1 = ANY (((SELECT private.lojas_membro()))::uuid[]))', 'g');
    v_check := regexp_replace(v_check, 'private\.e_membro\(' || col || '\)', '(\1 = ANY (((SELECT private.lojas_membro()))::uuid[]))', 'g');
    v_qual  := regexp_replace(v_qual,  'private\.e_gestor\(' || col || '\)', '(\1 = ANY (((SELECT private.lojas_gestor()))::uuid[]))', 'g');
    v_check := regexp_replace(v_check, 'private\.e_gestor\(' || col || '\)', '(\1 = ANY (((SELECT private.lojas_gestor()))::uuid[]))', 'g');

    if v_qual is distinct from p.qual or v_check is distinct from p.with_check then
      execute format('alter policy %I on %I.%I%s%s', p.policyname, p.schemaname, p.tablename,
                     case when v_qual is not null then ' using (' || v_qual || ')' else '' end,
                     case when v_check is not null then ' with check (' || v_check || ')' else '' end);
    end if;
  end loop;
end $$;
