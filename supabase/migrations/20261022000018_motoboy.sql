-- RES · 0018 · Etapa 5 (parte 1): app do motoboy com despacho por QR (D-017).
--
-- Cada pedido tem um código secreto (qr_token) que sai em QR na via do pedido (comanda).
-- O motoboy (membro com papel "entregador", login por usuário e senha) escaneia: o pedido de
-- entrega vira "Saiu para entrega" no nome dele, em tempo real no quadro. No celular ele vê
-- endereço (Google Maps), telefone, e se precisa cobrar — quanto, como e o troco a levar.
-- Motoboy atende as lojas do grupo (mesma conta), como a impressora (D-016).
-- Ideia trazida do módulo de entregas do REA-BBEEFF (QR na comanda, despacho pelo motoboy logado).

alter table public.pedidos
  add column qr_token       text not null default replace(gen_random_uuid()::text, '-', ''),
  add column entregador_id  uuid references auth.users (id) on delete set null,
  add column entregador_nome text;
create unique index pedidos_qr_idx on public.pedidos (qr_token);
create index pedidos_entregador_idx on public.pedidos (entregador_id, status) where entregador_id is not null;

alter table public.lojas add column cidade text check (cidade is null or length(btrim(cidade)) between 2 and 80);

-- O QR vai na via do pedido de entrega (link que abre o app do motoboy).
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

-- Motoboy ativo em alguma loja do grupo desta loja? Devolve o nome dele.
create or replace function private.motoboy_no_grupo(p_loja uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.nome from public.membros m
   where m.user_id = auth.uid() and m.ativo and m.loja_id = any (private.lojas_grupo(p_loja))
     and (m.papel = 'entregador' or m.papel in ('dono', 'gerente'))
   order by (m.papel = 'entregador') desc
   limit 1;
$$;
revoke execute on function private.motoboy_no_grupo(uuid) from anon, public;

-- Dados de uma entrega para o celular (valores em centavos).
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
    -- pago online não se cobra; o resto (dinheiro, cartão, pix na entrega, vale) se cobra na porta
    'cobrar', p.pagamento <> 'online',
    'itens', coalesce((select jsonb_agg(jsonb_build_object('quantidade', i.quantidade, 'nome', i.nome) order by i.ordem)
                         from public.pedido_itens i where i.pedido_id = p.id), '[]'::jsonb),
    'entregador', p.entregador_nome, 'saiu_em', p.saiu_em, 'pronto_em', p.pronto_em, 'criado_em', p.criado_em)
  from public.lojas l, public.marcas m
  where l.id = p.loja_id and m.id = p.marca_id;
$$;
revoke execute on function private.entrega_json(public.pedidos) from anon, public;

-- Escaneou o QR: o pedido sai com este motoboy.
create or replace function public.motoboy_despachar(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped  public.pedidos;
  v_nome text;
begin
  select * into v_ped from public.pedidos where qr_token = btrim(coalesce(p_token, '')) for update;
  if not found then
    raise exception 'QR não reconhecido. Confira se é a comanda de um pedido do RES.' using errcode = 'no_data_found';
  end if;
  v_nome := private.motoboy_no_grupo(v_ped.loja_id);
  if v_nome is null then
    raise exception 'Seu usuário não é motoboy desta loja.' using errcode = 'insufficient_privilege';
  end if;
  if v_ped.tipo <> 'entrega' then
    raise exception 'O pedido #% é para %, não tem entrega.', v_ped.numero, case v_ped.tipo when 'retirada' then 'retirar' else 'o balcão' end using errcode = 'check_violation';
  end if;
  if v_ped.status = 'em_entrega' then
    if v_ped.entregador_id = auth.uid() then
      return private.entrega_json(v_ped);   -- escaneou de novo: segue com ele
    end if;
    raise exception 'O pedido #% já saiu com %.', v_ped.numero, coalesce(v_ped.entregador_nome, 'outro motoboy') using errcode = 'check_violation';
  end if;
  if v_ped.status in ('concluido', 'cancelado') then
    raise exception 'O pedido #% está %.', v_ped.numero, case v_ped.status when 'concluido' then 'entregue' else 'cancelado' end using errcode = 'check_violation';
  end if;

  -- novo/em preparo: registra as etapas puladas para o histórico ficar completo
  if v_ped.status = 'novo' then
    insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por) values (v_ped.loja_id, v_ped.id, 'novo', 'em_preparo', 'Despacho pelo QR', auth.uid());
  end if;
  if v_ped.status in ('novo', 'em_preparo') then
    insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por) values (v_ped.loja_id, v_ped.id, 'em_preparo', 'pronto', 'Despacho pelo QR', auth.uid());
  end if;
  update public.pedidos set
    status = 'em_entrega',
    aceito_em = coalesce(aceito_em, now()),
    pronto_em = coalesce(pronto_em, now()),
    saiu_em = now(),
    entregador_id = auth.uid(),
    entregador_nome = v_nome
  where id = v_ped.id
  returning * into v_ped;
  insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por)
  values (v_ped.loja_id, v_ped.id, 'pronto', 'em_entrega', 'Saiu com ' || v_nome, auth.uid());
  return private.entrega_json(v_ped);
end;
$$;

-- Entregue (só o motoboy que levou, ou gestor). Entra no caixa aberto como qualquer pedido concluído.
create or replace function public.motoboy_entregar(p_pedido uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped public.pedidos;
begin
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if not found or private.motoboy_no_grupo(v_ped.loja_id) is null then
    raise exception 'Pedido não encontrado' using errcode = 'no_data_found';
  end if;
  if v_ped.status <> 'em_entrega' then
    raise exception 'O pedido #% não está em rota.', v_ped.numero using errcode = 'check_violation';
  end if;
  if v_ped.entregador_id is distinct from auth.uid() and not private.e_gestor(v_ped.loja_id) then
    raise exception 'Este pedido está com %.', coalesce(v_ped.entregador_nome, 'outro motoboy') using errcode = 'insufficient_privilege';
  end if;
  update public.pedidos set status = 'concluido', concluido_em = now() where id = p_pedido;
  insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por) values (v_ped.loja_id, p_pedido, 'em_entrega', 'concluido', 'Entregue pelo motoboy', auth.uid());
end;
$$;

-- Tela do motoboy: em rota com ele, prontos esperando motoboy no grupo, e o resumo do dia.
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
                      'cobrado_dinheiro', coalesce(round(sum(p.total) filter (where p.pagamento = 'dinheiro') * 100), 0),
                      'cobrado_outros', coalesce(round(sum(p.total) filter (where p.pagamento not in ('dinheiro', 'online')) * 100), 0),
                      'taxas', coalesce(round(sum(p.taxa_entrega) * 100), 0))
               from public.pedidos p
              where p.entregador_id = auth.uid() and p.status = 'concluido'
                and p.concluido_em >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')
  );
end;
$$;

grant execute on function public.motoboy_despachar(text), public.motoboy_entregar(uuid), public.motoboy_painel() to authenticated;
revoke execute on function public.motoboy_despachar(text), public.motoboy_entregar(uuid), public.motoboy_painel() from anon, public;
