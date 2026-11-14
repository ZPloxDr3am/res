-- D-116 · Integrações, etapa 4: servidor Open Delivery 1.7.1 (99Food, Keeta, aiqfome).
-- O app do marketplace chama o RES em /api/od/<conexão>/v1/... (GET merchant com X-API-KEY; POST newEvent),
-- e o RES chama o app (confirm, readyForPickup, dispatch, delivered, requestCancellation, merchantUpdate) com o
-- token OAuth da conexão. Aqui ficam: a leitura da conexão e dos dados do Merchant (só o servidor), o registro de
-- evento pela conexão, "delivered" e merchantUpdate na fila (mudança de cardápio e pausa).
-- Pode rodar de novo.

-- 1. Conexão e segredos para o servidor -----------------------------------------------------------------
create or replace function public.od_conexao(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', ml.id, 'loja_id', ml.loja_id, 'marca_id', ml.marca_id, 'canal', ml.canal, 'merchant_id', ml.merchant_id,
                            'modo', ml.modo, 'estado', ml.estado, 'ativo', ml.ativo, 'config', ml.config, 'token_expira_em', ml.token_expira_em,
                            'segredos', coalesce(s.segredos, '{}'::jsonb))
    from public.marketplace_lojas ml
    join public.canais c on c.chave = ml.canal and c.modelo = 'servidor_od'
    left join private.marketplace_segredos s on s.marketplace_loja_id = ml.id
   where ml.id = p_id;
$$;
revoke all on function public.od_conexao(uuid) from public, anon, authenticated;
grant execute on function public.od_conexao(uuid) to service_role;

-- 2. Dados para montar o Merchant (packages/core montarMerchantOD) ----------------------------------------
create or replace function public.od_merchant_base(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ml public.marketplace_lojas;
  mc public.marcas;
  l  public.lojas;
  c  jsonb;
begin
  select * into ml from public.marketplace_lojas where id = p_id;
  if ml.id is null then
    return null;
  end if;
  select * into mc from public.marcas where id = ml.marca_id;
  select * into l from public.lojas where id = ml.loja_id;
  c := public.cardapio_publico(mc.slug);
  return jsonb_build_object(
    'conexao', jsonb_build_object('id', ml.id, 'marca_id', ml.marca_id,
                 'atualizado_em', to_char(greatest(coalesce((select max(p.atualizado_em) from public.produtos p where p.loja_id = l.id), ml.conectado_em), ml.conectado_em) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    'loja', jsonb_build_object('cnpj', l.cnpj, 'razao_social', l.razao_social, 'telefone', l.telefone, 'logradouro', l.logradouro, 'numero', l.numero,
                 'bairro', l.bairro, 'cidade', to_jsonb(l) ->> 'cidade', 'uf', l.uf, 'cep', l.cep,
                 'lat', (to_jsonb(l) ->> 'lat')::double precision, 'lng', (to_jsonb(l) ->> 'lng')::double precision,
                 'aberta', private.marca_aberta(mc.id)),
    'marca', jsonb_build_object('id', mc.id, 'nome', mc.nome, 'logo_url', mc.logo_url, 'capa_url', mc.capa_url, 'whatsapp', mc.whatsapp,
                 'pedido_minimo', coalesce((c #>> '{marca,pedido_minimo}')::numeric, 0), 'tempo_preparo_min', coalesce((c #>> '{marca,tempo_preparo_min}')::int, l.tempo_preparo_min),
                 'aceita_entrega', coalesce((c #>> '{marca,aceita_entrega}')::boolean, true), 'aceita_retirada', coalesce((c #>> '{marca,aceita_retirada}')::boolean, true),
                 'horarios', coalesce(c #> '{marca,horarios}', '[]'::jsonb)),
    'raio_km', (select max(f.ate_km) from public.faixas_km f where f.marca_id = mc.id),
    'precos', coalesce((select jsonb_object_agg(mp.produto_id, round(mp.preco * 100)) from public.marketplace_precos mp where mp.marca_id = mc.id), '{}'::jsonb),
    'setores', coalesce(c -> 'setores', '[]'::jsonb)
  );
end;
$$;
revoke all on function public.od_merchant_base(uuid) from public, anon, authenticated;
grant execute on function public.od_merchant_base(uuid) to service_role;

-- 3. Evento pela conexão (no Open Delivery a loja vem pela URL, não pelo id do app) ---------------------------
create or replace function public.marketplace_registrar_evento_conexao(p_marketplace_loja uuid, p_evento_id text, p_codigo text, p_externo_id text, p_corpo jsonb default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare ml public.marketplace_lojas;
begin
  select * into ml from public.marketplace_lojas where id = p_marketplace_loja;
  if ml.id is null then
    raise exception 'Conexão não encontrada.' using errcode = 'no_data_found';
  end if;
  insert into private.marketplace_eventos (canal, evento_id, codigo, externo_id, merchant_id, marketplace_loja_id, corpo)
  values (ml.canal, left(p_evento_id, 120), left(p_codigo, 60), left(p_externo_id, 120), ml.merchant_id, ml.id, p_corpo)
  on conflict (canal, evento_id) do nothing;
  if found then
    update public.marketplace_lojas set ultimo_sinal = now() where id = ml.id;
  end if;
  return found;
end;
$$;
revoke all on function public.marketplace_registrar_evento_conexao(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.marketplace_registrar_evento_conexao(uuid, text, text, text, jsonb) to service_role;

-- 4. Status no RES → o que avisar o app: entrega própria concluída vira "delivered" no Open Delivery. Base: D-074.
create or replace function private.pedido_para_marketplace()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_acao text;
begin
  if new.externo_id is null or new.status = old.status or coalesce(current_setting('res.origem_externa', true), '') = '1' then
    return new;
  end if;
  v_acao := case
    when new.status = 'cancelado' then 'requestCancellation'
    when old.status = 'novo' and new.status = 'em_preparo' then 'confirm'
    when new.status = 'pronto' and (new.tipo = 'retirada' or new.entrega_marketplace) then 'readyToPickup'
    when new.status = 'em_entrega' and new.tipo = 'entrega' and not new.entrega_marketplace then 'dispatch'
    -- Open Delivery (D-116): entrega própria concluída avisa "delivered"
    when new.status = 'concluido' and new.tipo = 'entrega' and not new.entrega_marketplace
         and exists (select 1 from public.canais c where c.chave = new.externo_canal and c.modelo = 'servidor_od') then 'delivered'
  end;
  if v_acao = 'confirm' and exists (select 1 from public.marketplace_saida s where s.pedido_id = new.id and s.acao = 'confirm') then
    v_acao := null;
  end if;
  if v_acao is not null then
    perform private.enfileirar_marketplace(new.id, v_acao,
      case when v_acao = 'requestCancellation'
           then jsonb_build_object('cancellationCode', coalesce(substring(new.motivo_cancelamento from '^\s*\[?(\d{3})'), '501'),
                                   'reason', coalesce(new.motivo_cancelamento, 'Cancelado pela loja'))
           else '{}'::jsonb end);
  end if;
  return new;
end;
$$;

-- 5. Pausar/reabrir a loja: iFood (interrupção, D-114) e Open Delivery (merchantUpdate com o status). Base: D-114.
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
  for ml in select id, canal from public.marketplace_lojas where loja_id = new.id and ativo and modo = 'producao' and estado = 'conectado' and canal = 'ifood' loop
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

-- 6. Cardápio mudou → merchantUpdate (o app relê o Merchant). Uma pendência por conexão; nunca trava a edição do cardápio.
create or replace function private.cardapio_mudou_od()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid;
  ml     record;
begin
  begin
    v_loja := coalesce(to_jsonb(new) ->> 'loja_id', to_jsonb(old) ->> 'loja_id')::uuid;
    for ml in select m.id, m.canal from public.marketplace_lojas m join public.canais c on c.chave = m.canal and c.modelo = 'servidor_od'
               where m.loja_id = v_loja and m.ativo and m.modo = 'producao' and m.estado = 'conectado' loop
      if not exists (select 1 from public.marketplace_saida s where s.marketplace_loja_id = ml.id and s.acao = 'merchantUpdate' and s.situacao = 'pendente' and s.payload = '{}'::jsonb) then
        insert into public.marketplace_saida (loja_id, canal, acao, payload, marketplace_loja_id, proxima_em)
        values (v_loja, ml.canal, 'merchantUpdate', '{}'::jsonb, ml.id, now() + interval '1 minute');   -- junta várias edições seguidas
      end if;
    end loop;
  exception when others then
    null;   -- avisar o app nunca pode impedir a loja de editar o cardápio
  end;
  return null;
end;
$$;
do $$
declare t text;
begin
  foreach t in array array['produtos', 'produto_marcas', 'setores', 'setor_marcas', 'grupos_opcoes', 'opcoes', 'marca_horarios', 'produto_grupos'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_mudou_od', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function private.cardapio_mudou_od()', t || '_mudou_od', t);
  end loop;
end $$;
