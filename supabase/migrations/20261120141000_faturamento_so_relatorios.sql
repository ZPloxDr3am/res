-- D-126 (Issue #165): faturamento_lojas só para quem tem "relatorios".
-- Antes conferia só se a pessoa era membro: o motoboy e o caixa liam o faturamento de 30 dias da loja.
-- Usada só na Gestão (dono e gerente). De 20261112180000_teste_de_raiva.sql. Pode rodar de novo.

create or replace function public.faturamento_lojas(p_lojas uuid[], p_dias integer default 30)
returns table (loja_id uuid, total numeric) language sql stable security definer set search_path = '' as $$
  select p.loja_id, coalesce(sum(p.total), 0)
    from public.pedidos p
   -- D-126: só quem tem "relatorios" (dono, gerente ou grupo com a permissão); antes bastava ser membro (o motoboy lia)
  where p.loja_id = any (array(select id from unnest(p_lojas) id where private.tem_permissao(id, 'relatorios')))
     and p.status = 'concluido' and p.concluido_em >= now() - make_interval(days => greatest(1, least(coalesce(p_dias, 30), 366)))
   group by p.loja_id;
$$;
