-- RES · 0041 · Mercado Pago: Pix automático no cardápio digital (D-044).
-- Cada loja liga a própria conta (Access Token de produção do Mercado Pago). O dinheiro vai direto
-- para a conta da loja; o RES não intermedeia. O token fica em tabela que só o servidor (service_role) lê.
-- Pode rodar de novo sem erro.

create table if not exists public.mp_contas (
  loja_id        uuid primary key references public.lojas (id) on delete cascade,
  access_token   text not null,
  email          text,
  mp_user_id     bigint,
  apelido        text,
  conectado_em   timestamptz not null default now(),
  conectado_por  uuid
);
alter table public.mp_contas enable row level security;
revoke all on table public.mp_contas from anon, authenticated;

create table if not exists public.mp_pagamentos (
  id            bigint primary key,           -- id do pagamento no Mercado Pago
  pedido_id     uuid not null references public.pedidos (id) on delete cascade,
  loja_id       uuid not null references public.lojas (id) on delete cascade,
  status        text not null,
  valor         numeric(12, 2) not null,
  qr            text,
  qr_base64     text,
  expira_em     timestamptz,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists mp_pagamentos_pedido_idx on public.mp_pagamentos (pedido_id, criado_em desc);
alter table public.mp_pagamentos enable row level security;
revoke all on table public.mp_pagamentos from anon, authenticated;

-- Painel (gestor): conectado? com qual conta? (nunca devolve o token)
create or replace function public.mp_status(p_loja uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  c public.mp_contas;
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só gestores mexem nos pagamentos.' using errcode = 'insufficient_privilege';
  end if;
  select * into c from public.mp_contas where loja_id = p_loja;
  return jsonb_build_object(
    'conectado', c.loja_id is not null,
    'apelido', c.apelido, 'email', c.email, 'final', right(c.access_token, 4), 'conectado_em', c.conectado_em,
    'pix_pela_loja', exists (select 1 from public.marcas m where m.loja_id = p_loja and 'pix' = any (m.formas_pagamento)),
    'recebidos_30d', (select jsonb_build_object('quantidade', count(*), 'valor', coalesce(sum(valor), 0))
                        from public.mp_pagamentos where loja_id = p_loja and status = 'approved' and criado_em > now() - interval '30 days'));
end;
$$;

-- O servidor já conferiu o token no Mercado Pago (users/me) antes de chamar.
create or replace function public.salvar_mp(p_loja uuid, p_token text, p_email text, p_user_id bigint, p_apelido text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só gestores mexem nos pagamentos.' using errcode = 'insufficient_privilege';
  end if;
  if btrim(coalesce(p_token, '')) !~ '^APP_USR-[A-Za-z0-9_-]{20,}$' then
    raise exception 'Use o Access Token de produção (começa com APP_USR-).' using errcode = 'check_violation';
  end if;
  insert into public.mp_contas (loja_id, access_token, email, mp_user_id, apelido, conectado_por)
  values (p_loja, btrim(p_token), nullif(btrim(coalesce(p_email, '')), ''), p_user_id, nullif(btrim(coalesce(p_apelido, '')), ''), auth.uid())
  on conflict (loja_id) do update set access_token = excluded.access_token, email = excluded.email, mp_user_id = excluded.mp_user_id,
                                      apelido = excluded.apelido, conectado_em = now(), conectado_por = excluded.conectado_por;
end;
$$;

create or replace function public.desconectar_mp(p_loja uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só gestores mexem nos pagamentos.' using errcode = 'insufficient_privilege';
  end if;
  delete from public.mp_contas where loja_id = p_loja;
end;
$$;

grant execute on function public.mp_status(uuid), public.salvar_mp(uuid, text, text, bigint, text), public.desconectar_mp(uuid) to authenticated;
revoke execute on function public.mp_status(uuid), public.salvar_mp(uuid, text, text, bigint, text), public.desconectar_mp(uuid) from anon, public;
