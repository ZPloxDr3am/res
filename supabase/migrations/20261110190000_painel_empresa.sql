-- Painel da empresa RES (D-083): a equipe se administra pelo painel (sem SQL) e ganha números
-- da plataforma. Pode rodar de novo sem quebrar.

create or replace function public.equipe_res_listar()
returns table (user_id uuid, email text, criado_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  return query select e.user_id, u.email::text, e.criado_em from private.equipe_res e join auth.users u on u.id = e.user_id order by e.criado_em;
end;
$$;
grant execute on function public.equipe_res_listar() to authenticated;

-- inclui pelo e-mail de login (a pessoa precisa já ter conta no RES)
create or replace function public.equipe_res_adicionar(p_email text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  select id into v_user from auth.users where lower(email) = lower(btrim(p_email));
  if v_user is null then
    raise exception 'Ninguém entrou no RES com esse e-mail ainda. Peça para a pessoa criar o login primeiro.' using errcode = 'no_data_found';
  end if;
  insert into private.equipe_res (user_id) values (v_user) on conflict (user_id) do nothing;
end;
$$;
revoke execute on function public.equipe_res_adicionar(text) from public, anon;
grant execute on function public.equipe_res_adicionar(text) to authenticated;

create or replace function public.equipe_res_remover(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  if p_user = auth.uid() then
    raise exception 'Você não pode tirar a si mesmo da equipe.' using errcode = 'check_violation';
  end if;
  delete from private.equipe_res where user_id = p_user;
end;
$$;
revoke execute on function public.equipe_res_remover(uuid) from public, anon;
grant execute on function public.equipe_res_remover(uuid) to authenticated;

-- números da plataforma (visão geral do painel da empresa)
create or replace function public.numeros_plataforma()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'convites_30d', (select count(*) from public.convites_cadastro where criado_em > now() - interval '30 days'),
    'convites_usados_30d', (select count(*) from public.convites_cadastro where usado_em > now() - interval '30 days'),
    'convites_abertos', (select count(*) from public.convites_cadastro where usado_em is null and expira_em >= now()),
    'contas', (select count(*) from public.contas),
    'em_teste', (select count(*) from public.contas c where c.situacao = 'teste' and private.conta_liberada(c.id)),
    'teste_vencendo_3d', (select count(*) from public.contas c where c.situacao = 'teste' and c.teste_ate between now() and now() + interval '3 days'),
    'ativas', (select count(*) from public.contas c where c.situacao = 'ativa' and private.conta_liberada(c.id)),
    'pausadas', (select count(*) from public.contas c where not private.conta_liberada(c.id)),
    'lojas', (select count(*) from public.lojas),
    'cardapio_aberto', (select count(distinct m.loja_id) from public.marcas m where m.status_cardapio <> 'fechado'),
    'lojas_com_pedido_7d', (select count(distinct p.loja_id) from public.pedidos p where p.criado_em > now() - interval '7 days'),
    'pedidos_7d', (select count(*) from public.pedidos p where p.criado_em > now() - interval '7 days'),
    'cadastros', (select count(*) from public.contas where origem = 'cadastro'),
    'cadastros_com_pedido', (select count(*) from public.contas c where c.origem = 'cadastro'
                               and exists (select 1 from public.lojas l join public.pedidos p on p.loja_id = l.id where l.conta_id = c.id)),
    'cadastros_cardapio_aberto', (select count(*) from public.contas c where c.origem = 'cadastro'
                               and exists (select 1 from public.lojas l join public.marcas m on m.loja_id = l.id where l.conta_id = c.id and m.status_cardapio <> 'fechado'))
  );
end;
$$;
grant execute on function public.numeros_plataforma() to authenticated;
