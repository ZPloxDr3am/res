-- 0059: quem já foi avisado pelo WhatsApp, por etapa do pedido (D-058). Pode rodar de novo.
-- Fica no pedido (não no aparelho): o caixa, o balcão e a cozinha veem a mesma fila do "Avisar todos".

alter table public.pedidos add column if not exists avisos jsonb not null default '{}'::jsonb;

create or replace function public.marcar_aviso(p_pedido uuid, p_etapa text, p_avisado boolean default true)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_loja uuid;
begin
  select loja_id into v_loja from public.pedidos where id = p_pedido;
  if v_loja is null or not private.e_membro(v_loja) then
    raise exception 'Pedido não encontrado.' using errcode = 'no_data_found';
  end if;
  if p_etapa not in ('novo', 'em_preparo', 'pronto', 'em_entrega', 'concluido', 'cancelado') then
    raise exception 'Etapa inválida.' using errcode = 'check_violation';
  end if;
  update public.pedidos
     set avisos = case when p_avisado then avisos || jsonb_build_object(p_etapa, now()) else avisos - p_etapa end
   where id = p_pedido;
end;
$$;
revoke execute on function public.marcar_aviso(uuid, text, boolean) from anon, public;
grant execute on function public.marcar_aviso(uuid, text, boolean) to authenticated;
