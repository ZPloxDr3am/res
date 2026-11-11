-- RES · 0042 · Mercado Pago: aceitar o pedido sozinho quando o Pix é confirmado (D-044).
-- Pode rodar de novo sem erro.

alter table public.mp_contas add column if not exists aceitar_ao_pagar boolean not null default true;

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
    'aceitar_ao_pagar', coalesce(c.aceitar_ao_pagar, true),
    'pix_pela_loja', exists (select 1 from public.marcas m where m.loja_id = p_loja and 'pix' = any (m.formas_pagamento)),
    'recebidos_30d', (select jsonb_build_object('quantidade', count(*), 'valor', coalesce(sum(valor), 0))
                        from public.mp_pagamentos where loja_id = p_loja and status = 'approved' and criado_em > now() - interval '30 days'));
end;
$$;

create or replace function public.mp_aceitar_ao_pagar(p_loja uuid, p_ligado boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só gestores mexem nos pagamentos.' using errcode = 'insufficient_privilege';
  end if;
  update public.mp_contas set aceitar_ao_pagar = coalesce(p_ligado, true) where loja_id = p_loja;
end;
$$;
grant execute on function public.mp_aceitar_ao_pagar(uuid, boolean) to authenticated;
revoke execute on function public.mp_aceitar_ao_pagar(uuid, boolean) from anon, public;
