-- D-104: o motoboy se cadastra pelo link da loja (ou QR) e o gerente só aprova. Pode rodar de novo.
-- * O próprio motoboy escolhe usuário e senha: a conta de login é criada na hora (sem acesso a nada) e só
--   vira membro da loja, com a função Motoboy, quando o dono/gerente aprova. Recusou: a conta é apagada.
-- * Guarda telefone, veículo, placa e chave Pix (para pagar as entregas).
-- * Freio: link trocável, no máximo 20 pedidos esperando por loja.

create table if not exists private.motoboy_links (
  loja_id   uuid primary key references public.lojas (id) on delete cascade,
  token     text not null unique default left(replace(gen_random_uuid()::text, '-', ''), 16),
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);
revoke all on private.motoboy_links from public, anon, authenticated;

create table if not exists public.motoboy_solicitacoes (
  id          uuid primary key default gen_random_uuid(),
  loja_id     uuid not null references public.lojas (id) on delete cascade,
  user_id     uuid not null unique,
  usuario     text not null,
  nome        text not null check (length(btrim(nome)) between 2 and 120),
  telefone    text not null check (telefone ~ '^[0-9]{10,13}$'),
  veiculo     text check (veiculo is null or length(veiculo) <= 40),
  placa       text check (placa is null or placa ~ '^[A-Z0-9]{7}$'),
  pix         text check (pix is null or length(pix) <= 120),
  status      text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  membro_id   uuid,
  criado_em   timestamptz not null default now(),
  decidido_em timestamptz,
  decidido_por uuid
);
create index if not exists motoboy_sol_loja on public.motoboy_solicitacoes (loja_id, status, criado_em desc);
alter table public.motoboy_solicitacoes enable row level security;
revoke all on public.motoboy_solicitacoes from anon, authenticated;

create or replace function private.pode_equipe(p_loja uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.e_gestor(p_loja) or private.tem_permissao(p_loja, 'equipe');
$$;

-- link da loja (cria na primeira vez); p_trocar gera outro e o antigo para de funcionar
create or replace function public.motoboy_link(p_loja uuid, p_trocar boolean default false)
returns text language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  if not private.pode_equipe(p_loja) then raise exception 'Você não cuida da equipe desta loja.' using errcode = 'insufficient_privilege'; end if;
  insert into private.motoboy_links (loja_id) values (p_loja) on conflict (loja_id) do nothing;
  if p_trocar then
    update private.motoboy_links set token = left(replace(gen_random_uuid()::text, '-', ''), 16), ativo = true where loja_id = p_loja;
  end if;
  select token into v from private.motoboy_links where loja_id = p_loja;
  return v;
end;
$$;
grant execute on function public.motoboy_link(uuid, boolean) to authenticated;

-- página pública do link
create or replace function public.motoboy_link_info(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('loja', l.nome, 'cidade', l.cidade)
    from private.motoboy_links k join public.lojas l on l.id = k.loja_id
   where k.token = p_token and k.ativo;
$$;
grant execute on function public.motoboy_link_info(text) to anon, authenticated;

-- o servidor cria a conta de login e chama esta função (chave de serviço)
create or replace function public.motoboy_solicitar(p_token text, p_user uuid, p_usuario text, p_nome text, p_telefone text, p_veiculo text, p_placa text, p_pix text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_loja uuid; v_id uuid;
begin
  select loja_id into v_loja from private.motoboy_links where token = p_token and ativo;
  if v_loja is null then raise exception 'Link de cadastro inválido. Peça o link novo para a loja.' using errcode = 'no_data_found'; end if;
  if (select count(*) from public.motoboy_solicitacoes where loja_id = v_loja and status = 'pendente') >= 20 then
    raise exception 'A loja já tem muitos cadastros esperando aprovação. Fale com o gerente.' using errcode = 'check_violation';
  end if;
  insert into public.motoboy_solicitacoes (loja_id, user_id, usuario, nome, telefone, veiculo, placa, pix)
  values (v_loja, p_user, lower(btrim(p_usuario)), btrim(p_nome), regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'),
          nullif(btrim(coalesce(p_veiculo, '')), ''), nullif(upper(regexp_replace(coalesce(p_placa, ''), '[^A-Za-z0-9]', '', 'g')), ''), nullif(btrim(coalesce(p_pix, '')), ''))
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.motoboy_solicitar(text, uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.motoboy_solicitar(text, uuid, text, text, text, text, text, text) to service_role;

create or replace function public.motoboy_solicitacoes_lista(p_loja uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.pode_equipe(p_loja) then raise exception 'Você não cuida da equipe desta loja.' using errcode = 'insufficient_privilege'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome, 'usuario', s.usuario, 'telefone', s.telefone, 'veiculo', s.veiculo,
                     'placa', s.placa, 'pix', s.pix, 'status', s.status, 'criado_em', s.criado_em) order by s.criado_em desc)
                     from public.motoboy_solicitacoes s
                    where s.loja_id = p_loja and (s.status = 'pendente' or s.decidido_em > now() - interval '7 days')), '[]'::jsonb);
end;
$$;
grant execute on function public.motoboy_solicitacoes_lista(uuid) to authenticated;

-- aprovar = vira membro (função Motoboy, conta o limite de aparelhos do plano); recusar devolve a conta para apagar
create or replace function public.motoboy_decidir(p_loja uuid, p_id uuid, p_aprovar boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare s public.motoboy_solicitacoes; v_membro uuid;
begin
  if not private.pode_equipe(p_loja) then raise exception 'Você não cuida da equipe desta loja.' using errcode = 'insufficient_privilege'; end if;
  select * into s from public.motoboy_solicitacoes where id = p_id and loja_id = p_loja and status = 'pendente' for update;
  if not found then raise exception 'Cadastro não encontrado ou já decidido.' using errcode = 'no_data_found'; end if;
  if p_aprovar then
    if exists (select 1 from public.membros where user_id = s.user_id) then raise exception 'Essa conta já está em uso.' using errcode = 'check_violation'; end if;
    insert into public.usuarios_login (user_id, usuario, loja_id, criado_por) values (s.user_id, s.usuario, p_loja, auth.uid());
    insert into public.membros (loja_id, user_id, nome, papel) values (p_loja, s.user_id, s.nome, 'entregador') returning id into v_membro;
    update public.motoboy_solicitacoes set status = 'aprovado', membro_id = v_membro, decidido_em = now(), decidido_por = auth.uid() where id = s.id;
    return null;
  end if;
  update public.motoboy_solicitacoes set status = 'recusado', decidido_em = now(), decidido_por = auth.uid() where id = s.id;
  return s.user_id; -- o servidor apaga essa conta de login
end;
$$;
grant execute on function public.motoboy_decidir(uuid, uuid, boolean) to authenticated;
revoke execute on function private.pode_equipe(uuid) from public, anon;
grant execute on function private.pode_equipe(uuid) to authenticated;
