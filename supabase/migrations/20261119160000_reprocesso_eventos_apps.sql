-- Auditoria de engenharia (19/11/2026), P1: evento de app (iFood, Open Delivery) que foi gravado mas não
-- processado ficava parado até alguém clicar em "Reprocessar". Agora o agendador (a cada 30 s) pega os
-- eventos parados há mais de 2 minutos, das últimas 6 horas, com menos de 5 tentativas, e tenta de novo.
-- O processamento já é idempotente (pedido único por canal + id externo; status com transição validada).
-- Pode rodar de novo.

alter table private.marketplace_eventos add column if not exists tentado_em timestamptz;

-- o índice private.marketplace_eventos_pendentes (recebido_em, só os não processados) já atende a busca

-- Reserva os eventos parados (um agendador não pega o que o outro já pegou) e devolve o que reprocessar.
create or replace function public.marketplace_eventos_parados(p_limite integer default 20)
returns table (id bigint, canal text, evento_id text, marketplace_loja_id uuid, corpo jsonb)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  with alvo as (
    select e.id from private.marketplace_eventos e
     where e.processado_em is null
       and e.corpo is not null
       and e.tentativas < 5
       and e.recebido_em < now() - interval '2 minutes'
       and e.recebido_em > now() - interval '6 hours'
       and (e.tentado_em is null or e.tentado_em < now() - interval '2 minutes')
     order by e.recebido_em
     limit greatest(1, least(coalesce(p_limite, 20), 50))
     for update skip locked
  )
  update private.marketplace_eventos e set tentado_em = now()
    from alvo where e.id = alvo.id
  returning e.id, e.canal, e.evento_id, e.marketplace_loja_id, e.corpo;
end;
$$;
revoke all on function public.marketplace_eventos_parados(integer) from public, anon, authenticated;
grant execute on function public.marketplace_eventos_parados(integer) to service_role;
