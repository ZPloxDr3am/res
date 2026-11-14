-- D-115 · Integrações, etapa 5 (painel), parte que a homologação do iFood olha:
--   * o quadro de pedidos (qualquer pessoa que vê os pedidos) lê do mapa do pedido o que é do canal:
--     status no app, entregador do app, cancelamento solicitado, itens sem vínculo, telefone mascarado.
--     O corpo original continua só para o dono/gerente (a leitura do quadro escolhe as colunas; quem não é
--     gestor lê pela função abaixo, que não devolve o corpo);
--   * reprocessar um evento que deu erro (card do canal em Aplicativos): o servidor relê o corpo guardado.
-- Pode rodar de novo.

create or replace function public.marketplace_info_pedidos(p_loja uuid, p_pedidos uuid[])
returns table (pedido_id uuid, canal text, status_externo text, entregador jsonb, cancelamento_solicitado jsonb,
               itens_sem_vinculo smallint, telefone_mascarado boolean, prazo_min integer)
language sql
stable
security definer
set search_path = ''
as $$
  select mp.pedido_id, mp.canal, mp.status_externo, mp.entregador, mp.cancelamento_solicitado,
         mp.itens_sem_vinculo, mp.telefone_mascarado, mp.prazo_min
    from public.marketplace_pedidos mp
   where mp.loja_id = p_loja and mp.pedido_id = any (p_pedidos[1:500]) and private.e_membro(p_loja);
$$;
revoke all on function public.marketplace_info_pedidos(uuid, uuid[]) from public, anon;
grant execute on function public.marketplace_info_pedidos(uuid, uuid[]) to authenticated;

-- o servidor pega o evento guardado para reprocessar (quem pediu já foi conferido como gestor na tela)
create or replace function public.marketplace_evento_para_reprocessar(p_id bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('canal', e.canal, 'evento_id', e.evento_id, 'corpo', e.corpo, 'loja_id', ml.loja_id)
    from private.marketplace_eventos e left join public.marketplace_lojas ml on ml.id = e.marketplace_loja_id
   where e.id = p_id;
$$;
revoke all on function public.marketplace_evento_para_reprocessar(bigint) from public, anon, authenticated;
grant execute on function public.marketplace_evento_para_reprocessar(bigint) to service_role;
