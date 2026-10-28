-- RES · 0044 · Pix do Mercado Pago também nos pedidos lançados no painel (telefone/balcão) (D-044).
-- O pedido com Pix numa loja com Mercado Pago espera o pagamento, venha do cardápio digital ou do painel.
-- No quadro, a equipe abre o QR ou manda o link de pagamento para o cliente pelo WhatsApp.
-- Pode rodar de novo sem erro.

create or replace function private.segura_pix_mp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.origem in ('cardapio_digital', 'painel') and new.pagamento = 'pix' and new.pago_em is null
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
