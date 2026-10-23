-- RES · 0019 · Comanda do motoboy completa e "já pago" (D-018).
--
-- * Pedido pode ser marcado como PAGO no painel (ex.: cliente mandou o Pix antes). Aí a comanda e o
--   celular do motoboy mostram "PAGO — NÃO COBRAR" e ele não presta contas desse valor.
-- * O QR do motoboy também sai na via da cozinha dos pedidos de entrega (lojas que imprimem só
--   essa via) — controlado pelo layout do cupom (core/cupom.ts, mostrar_qr).

alter table public.pedidos
  add column pago_em  timestamptz,
  add column pago_por uuid;

create or replace function public.marcar_pago(p_pedido uuid, p_pago boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped public.pedidos;
begin
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if not found or not private.tem_permissao(v_ped.loja_id, 'pedidos_delivery') then
    raise exception 'Pedido não encontrado' using errcode = 'no_data_found';
  end if;
  if v_ped.pagamento = 'online' then
    raise exception 'Pedido pago online já conta como pago.' using errcode = 'check_violation';
  end if;
  if v_ped.status in ('concluido', 'cancelado') then
    raise exception 'O pedido já foi encerrado.' using errcode = 'check_violation';
  end if;
  if (v_ped.pago_em is not null) = p_pago then
    return;
  end if;
  update public.pedidos set pago_em = case when p_pago then now() end, pago_por = case when p_pago then auth.uid() end where id = p_pedido;
  insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por)
  values (v_ped.loja_id, p_pedido, v_ped.status, v_ped.status, case when p_pago then 'Marcado como pago' else 'Pagamento desmarcado' end, auth.uid());
end;
$$;
grant execute on function public.marcar_pago(uuid, boolean) to authenticated;
revoke execute on function public.marcar_pago(uuid, boolean) from anon, public;

create or replace function private.dados_cupom(p_pedido uuid, p_itens uuid[] default null, p_setor text default null)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'loja', l.nome, 'marca', m.nome, 'marca_id', m.id, 'numero', p.numero, 'tipo_pedido', p.tipo, 'origem', p.origem,
    'criado_em', p.criado_em, 'agendado_para', p.agendado_para, 'fuso', l.fuso_horario, 'setor', p_setor,
    'cliente', jsonb_build_object('nome', p.cliente_nome, 'telefone', p.cliente_telefone),
    'endereco', p.endereco,
    'observacao', p.observacao,
    'pagamento', p.pagamento, 'troco_para', round(p.troco_para * 100),
    'subtotal', round(p.subtotal * 100), 'taxa_entrega', round(p.taxa_entrega * 100), 'desconto', round(p.desconto * 100),
    'total', round(p.total * 100),
    'qr', case when p.tipo = 'entrega' then p.qr_token end,
    -- já pago (online ou marcado no painel): a comanda e o celular dizem NÃO COBRAR
    'pago', p.pagamento = 'online' or p.pago_em is not null,
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
               'quantidade', i.quantidade, 'nome', i.nome, 'total', round(i.total * 100), 'observacao', i.observacao,
               'opcoes', coalesce((select jsonb_agg(jsonb_build_object('grupo', o.grupo_nome, 'nome', o.nome, 'quantidade', o.quantidade, 'fracao', o.fracao) order by o.id)
                                     from public.pedido_item_opcoes o where o.item_id = i.id), '[]'::jsonb))
             order by i.ordem)
        from public.pedido_itens i
       where i.pedido_id = p.id and (p_itens is null or i.id = any (p_itens))), '[]'::jsonb))
  from public.pedidos p
  join public.marcas m on m.id = p.marca_id
  join public.lojas l on l.id = p.loja_id
  where p.id = p_pedido;
$$;

create or replace function private.entrega_json(p public.pedidos)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'numero', p.numero, 'status', p.status, 'loja', l.nome, 'cidade', l.cidade, 'marca', m.nome,
    'cliente', p.cliente_nome, 'telefone', p.cliente_telefone, 'endereco', p.endereco, 'observacao', p.observacao,
    'pagamento', p.pagamento, 'total', round(p.total * 100), 'troco_para', round(p.troco_para * 100),
    -- pago online ou marcado como pago no painel (ex.: Pix antecipado) não se cobra; o resto se cobra na porta
    'cobrar', p.pagamento <> 'online' and p.pago_em is null,
    'pago_em', p.pago_em,
    'itens', coalesce((select jsonb_agg(jsonb_build_object('quantidade', i.quantidade, 'nome', i.nome) order by i.ordem)
                         from public.pedido_itens i where i.pedido_id = p.id), '[]'::jsonb),
    'entregador', p.entregador_nome, 'saiu_em', p.saiu_em, 'pronto_em', p.pronto_em, 'criado_em', p.criado_em)
  from public.lojas l, public.marcas m
  where l.id = p.loja_id and m.id = p.marca_id;
$$;

create or replace function public.motoboy_painel()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_lojas uuid[];
  v_nome  text;
begin
  select array_agg(distinct x), min(m.nome) into v_lojas, v_nome
    from public.membros m, unnest(private.lojas_grupo(m.loja_id)) x
   where m.user_id = auth.uid() and m.ativo and m.papel in ('entregador', 'dono', 'gerente');
  if v_lojas is null then
    return null;
  end if;
  return jsonb_build_object(
    'nome', v_nome,
    'em_rota', coalesce((select jsonb_agg(private.entrega_json(p) order by p.saiu_em)
                           from public.pedidos p where p.entregador_id = auth.uid() and p.status = 'em_entrega'), '[]'::jsonb),
    'prontos', coalesce((select jsonb_agg(jsonb_build_object('numero', p.numero, 'loja', l.nome, 'bairro', p.endereco ->> 'bairro', 'pronto_em', p.pronto_em, 'status', p.status) order by p.criado_em)
                           from public.pedidos p join public.lojas l on l.id = p.loja_id
                          where p.loja_id = any (v_lojas) and p.tipo = 'entrega' and p.status in ('pronto', 'em_preparo')
                            and p.criado_em > now() - interval '12 hours'), '[]'::jsonb),
    'hoje', (select jsonb_build_object(
                      'entregas', count(*),
                      'cobrado_dinheiro', coalesce(round(sum(p.total) filter (where p.pagamento = 'dinheiro' and p.pago_em is null) * 100), 0),
                      'cobrado_outros', coalesce(round(sum(p.total) filter (where p.pagamento not in ('dinheiro', 'online') and p.pago_em is null) * 100), 0),
                      'taxas', coalesce(round(sum(p.taxa_entrega) * 100), 0))
               from public.pedidos p
              where p.entregador_id = auth.uid() and p.status = 'concluido'
                and p.concluido_em >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')
  );
end;
$$;
