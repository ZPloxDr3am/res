-- RES · 0043 · Pedido com Pix do Mercado Pago só vai para a cozinha depois de pago (D-044).
-- Pedido do cardápio digital com Pix numa loja com Mercado Pago entra "aguardando pagamento":
-- não é aceito na criação (mesmo com o aceite automático da loja), não imprime e não bipa.
-- Quando o Pix é confirmado, o servidor marca pago e aceita (se a loja quiser).
-- Sem pagamento em 40 min, é cancelado sozinho. Pode rodar de novo sem erro.

alter table public.pedidos add column if not exists aguarda_pagamento boolean not null default false;

create or replace function private.segura_pix_mp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.origem = 'cardapio_digital' and new.pagamento = 'pix' and new.pago_em is null
     and exists (select 1 from public.mp_contas c where c.loja_id = new.loja_id) then
    new.aguarda_pagamento := true;
    if new.status = 'em_preparo' then
      new.status := 'novo';
      new.aceito_em := null;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists pedidos_b_segura_pix on public.pedidos;
create trigger pedidos_b_segura_pix before insert on public.pedidos for each row execute function private.segura_pix_mp();

-- pago (por qualquer caminho, inclusive "Marcar como pago" no quadro) → deixa de aguardar
create or replace function private.pago_libera()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.pago_em is not null and new.aguarda_pagamento then
    new.aguarda_pagamento := false;
  end if;
  return new;
end;
$$;
drop trigger if exists pedidos_pago_libera on public.pedidos;
create trigger pedidos_pago_libera before update of pago_em on public.pedidos for each row execute function private.pago_libera();

create or replace function private.cancelar_pix_nao_pago()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.pedidos
     set status = 'cancelado', cancelado_em = now(), motivo_cancelamento = 'Pix não foi pago em 40 minutos'
   where aguarda_pagamento and pago_em is null and status = 'novo' and criado_em < now() - interval '40 minutes';
  get diagnostics n = row_count;
  return n;
end;
$$;

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('res-pix-nao-pago', '*/5 * * * *', 'select private.cancelar_pix_nao_pago()');
  end if;
exception when others then raise notice 'agendamento não criado: %', sqlerrm;
end $$;
