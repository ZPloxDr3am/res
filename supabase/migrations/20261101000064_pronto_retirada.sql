-- 0064: "Pronto" automático na retirada (D-063). Pode rodar de novo.
-- Opcional por loja: o pedido de RETIRADA que está "Em preparo" passa a "Pronto" sozinho quando acaba
-- o tempo de preparo (o da loja + o acréscimo do modo movimento que o pedido recebeu). Agendado: 5 min
-- antes do horário. O cliente vê "pronto" no acompanhamento e o pedido entra na fila do "Avisar clientes".
-- Roda a cada minuto (pg_cron); fica registrado no histórico do pedido como automático.

alter table public.lojas add column if not exists pronto_auto_retirada boolean not null default false;

create or replace function private.retiradas_prontas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  with alvo as (
    select p.id, p.loja_id
      from public.pedidos p
      join public.lojas l on l.id = p.loja_id
     where l.pronto_auto_retirada and p.tipo = 'retirada' and p.status = 'em_preparo'
       and case when p.agendado_para is not null then p.agendado_para - interval '5 minutes' <= now()
                else coalesce(p.aceito_em, p.criado_em) + make_interval(mins => l.tempo_preparo_min + coalesce(p.prazo_extra_min, 0)) <= now() end
     for update of p skip locked
  ),
  feito as (
    update public.pedidos p set status = 'pronto', pronto_em = now()
      from alvo where p.id = alvo.id and p.status = 'em_preparo'
    returning p.id, p.loja_id
  )
  insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por)
  select loja_id, id, 'em_preparo', 'pronto', 'Automático: acabou o tempo de preparo', null from feito;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke execute on function private.retiradas_prontas() from anon, public, authenticated;

-- liga/desliga na loja (quem cuida dos dados da empresa, como o aceite automático)
create or replace function public.definir_pronto_auto(p_loja uuid, p_ligado boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.tem_permissao(p_loja, 'dados_empresa') then
    raise exception 'Só quem cuida dos dados da empresa pode mudar isso.' using errcode = 'insufficient_privilege';
  end if;
  update public.lojas set pronto_auto_retirada = coalesce(p_ligado, false) where id = p_loja;
  if p_ligado then
    perform private.retiradas_prontas();
  end if;
end;
$$;
revoke execute on function public.definir_pronto_auto(uuid, boolean) from anon, public;
grant execute on function public.definir_pronto_auto(uuid, boolean) to authenticated;

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('res-retirada-pronta', '* * * * *', 'select private.retiradas_prontas()');
  end if;
exception when others then raise notice 'agendamento do pronto automático não criado: %', sqlerrm;
end $$;
