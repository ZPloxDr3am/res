-- D-107: IA no cardápio (ler cardápio por foto, PDF ou link) e no estoque (ficha técnica sugerida).
-- A chamada à IA é feita pelo servidor; aqui ficam o freio de uso por loja e o registro de quanto se usou.
-- Pode rodar de novo.

create table if not exists public.ia_uso (
  id        bigint generated always as identity primary key,
  loja_id   uuid not null references public.lojas (id) on delete cascade,
  tipo      text not null check (tipo in ('cardapio', 'ficha')),
  user_id   uuid default auth.uid(),
  criado_em timestamptz not null default now()
);
create index if not exists ia_uso_loja on public.ia_uso (loja_id, tipo, criado_em desc);
alter table public.ia_uso enable row level security;
revoke all on public.ia_uso from anon, authenticated;

-- confere permissão e o freio do dia; registra o uso. Cardápio: 20 leituras por dia; ficha: 150 sugestões por dia.
create or replace function public.ia_registrar(p_loja uuid, p_tipo text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lim integer := case p_tipo when 'cardapio' then 20 when 'ficha' then 150 end;
  v_n   integer;
begin
  if v_lim is null then
    raise exception 'Uso de IA inválido.' using errcode = 'check_violation';
  end if;
  if p_tipo = 'cardapio' and not private.tem_permissao(p_loja, 'cardapio') then
    raise exception 'Você não tem permissão para alterar o cardápio.' using errcode = 'insufficient_privilege';
  end if;
  if p_tipo = 'ficha' and not private.pode_estoque(p_loja) then
    raise exception 'Sem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  perform pg_advisory_xact_lock(hashtext('ia_uso:' || p_loja::text));
  select count(*) into v_n from public.ia_uso where loja_id = p_loja and tipo = p_tipo and criado_em > now() - interval '1 day';
  if v_n >= v_lim then
    raise exception 'Limite de uso da IA de hoje atingido (% por dia). Tente amanhã.', v_lim using errcode = 'check_violation';
  end if;
  insert into public.ia_uso (loja_id, tipo) values (p_loja, p_tipo);
  return v_lim - v_n - 1;
end;
$$;
revoke all on function public.ia_registrar(uuid, text) from public, anon;
grant execute on function public.ia_registrar(uuid, text) to authenticated;
