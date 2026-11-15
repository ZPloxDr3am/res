-- D-117 · Integrações, etapa 6: clientes Delivery Much e Rappi (o RES busca os pedidos e chama as rotas deles)
-- 1. Pausar/reabrir a loja no RES também deixa a loja offline/online no Delivery Much.
--    (Rappi: a API de disponibilidade fica para a homologação com a Rappi.)
-- 2. Simulador do modo teste para todos os apps: acha a conexão pelo id dela (Open Delivery, Delivery Much,
--    Rappi não precisam ter o id da loja no app ainda) ou pelo merchant (iFood, como antes).
-- O polling, a tradução e as chamadas ficam no servidor (apps/web/lib/marketplace/canais-cliente.ts).
-- Pode rodar de novo.

-- 1. Pausa (recriada a partir de 20261114220000_open_delivery.sql) ----------------------------------------
create or replace function private.loja_pausa_para_marketplace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare ml record;
begin
  if new.pausa_ate is not distinct from old.pausa_ate then
    return new;
  end if;
  for ml in select id, canal from public.marketplace_lojas where loja_id = new.id and ativo and modo = 'producao' and estado = 'conectado' and canal in ('ifood', 'deliverymuch') loop
    insert into public.marketplace_saida (loja_id, canal, acao, payload, marketplace_loja_id)
    values (new.id, ml.canal,
            case when new.pausa_ate is not null and new.pausa_ate > now() then 'pausar' else 'abrir' end,
            case when new.pausa_ate is not null and new.pausa_ate > now()
                 then jsonb_build_object('fim', new.pausa_ate, 'descricao', 'Pausa pelo RES') else '{}'::jsonb end,
            ml.id);
  end loop;
  -- Open Delivery (D-116): pausa/reabertura vira merchantUpdate só com o status
  for ml in select m.id, m.canal from public.marketplace_lojas m join public.canais c on c.chave = m.canal and c.modelo = 'servidor_od'
             where m.loja_id = new.id and m.ativo and m.modo = 'producao' and m.estado = 'conectado' loop
    insert into public.marketplace_saida (loja_id, canal, acao, payload, marketplace_loja_id)
    values (new.id, ml.canal, 'merchantUpdate',
            jsonb_build_object('merchantStatus', case when new.pausa_ate is not null and new.pausa_ate > now() then 'UNAVAILABLE' else 'AVAILABLE' end), ml.id);
  end loop;
  return new;
end;
$$;

-- 2. Simulador para qualquer app em modo teste --------------------------------------------------------------
create or replace function public.simular_pedido_marketplace(p_loja uuid, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_conexao uuid;
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(p ->> 'marketplace_loja_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    v_conexao := (p ->> 'marketplace_loja_id')::uuid;
  end if;
  if not exists (select 1 from public.marketplace_lojas
                  where loja_id = p_loja and canal = p ->> 'canal' and modo = 'teste'
                    and (id = v_conexao or (v_conexao is null and merchant_id = p ->> 'merchant_id'))) then
    raise exception 'O simulador só funciona com a conexão do app em modo teste.' using errcode = 'check_violation';
  end if;
  return private.receber_pedido_externo(p);
end;
$$;
revoke all on function public.simular_pedido_marketplace(uuid, jsonb) from public, anon;
grant execute on function public.simular_pedido_marketplace(uuid, jsonb) to authenticated;

-- evento simulado: mesma regra (qualquer app em modo teste), mensagem sem citar só o iFood
create or replace function public.simular_evento_marketplace(p_pedido uuid, p_codigo text, p_motivo text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare v public.pedidos;
begin
  select * into v from public.pedidos where id = p_pedido;
  if not found or not private.e_gestor(v.loja_id) then
    raise exception 'Pedido não encontrado.' using errcode = 'no_data_found';
  end if;
  if not exists (select 1 from public.marketplace_lojas where loja_id = v.loja_id and marca_id = v.marca_id and canal = v.externo_canal and modo = 'teste') then
    raise exception 'O simulador só funciona com a conexão do app em modo teste.' using errcode = 'check_violation';
  end if;
  return private.aplicar_evento_externo(v.externo_canal, v.externo_id, p_codigo, p_motivo);
end;
$$;
revoke all on function public.simular_evento_marketplace(uuid, text, text) from public, anon;
grant execute on function public.simular_evento_marketplace(uuid, text, text) to authenticated;
