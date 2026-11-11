-- iFood etapa 2 (D-075): Plataforma de Negociação (responder cancelamento/reembolso/atraso pelo RES)
-- e o agendador que busca eventos e envia a fila a cada 30 s quando houver loja em produção.
-- Pode rodar de novo sem quebrar.

-- 1. Negociações (uma por disputa do iFood)
create table if not exists public.marketplace_negociacoes (
  id             uuid primary key default gen_random_uuid(),
  loja_id        uuid not null references public.lojas (id) on delete cascade,
  pedido_id      uuid not null references public.pedidos (id) on delete cascade,
  canal          text not null default 'ifood' check (canal in ('ifood')),
  disputa_id     text not null check (length(disputa_id) between 1 and 100),
  acao           text not null,
  tipo           text,
  mensagem       text,
  expira_em      timestamptz,
  acao_no_prazo  text,
  alternativas   jsonb not null default '[]'::jsonb,
  motivos_aceite jsonb not null default '[]'::jsonb,
  itens          jsonb not null default '[]'::jsonb,
  evidencias     integer not null default 0,
  situacao       text not null default 'aberta' check (situacao in ('aberta', 'respondida', 'aceita', 'recusada', 'expirada', 'alternativa')),
  resposta       jsonb,
  respondido_por uuid,
  respondido_em  timestamptz,
  resultado      jsonb,
  resolvido_em   timestamptz,
  criado_em      timestamptz not null default now(),
  unique (canal, disputa_id)
);
create index if not exists marketplace_negociacoes_abertas on public.marketplace_negociacoes (loja_id) where situacao in ('aberta', 'respondida');
create index if not exists marketplace_negociacoes_pedido on public.marketplace_negociacoes (pedido_id);
alter table public.marketplace_negociacoes enable row level security;
drop policy if exists marketplace_negociacoes_ler on public.marketplace_negociacoes;
create policy marketplace_negociacoes_ler on public.marketplace_negociacoes for select to authenticated using (private.e_membro(loja_id));
grant select on public.marketplace_negociacoes to authenticated;
revoke all on public.marketplace_negociacoes from anon;
do $$ begin
  alter publication supabase_realtime add table public.marketplace_negociacoes;
exception when duplicate_object then null; when undefined_object then null;
end $$;

-- 2. A fila de volta também leva as respostas de negociação
alter table public.marketplace_saida drop constraint if exists marketplace_saida_acao_check;
alter table public.marketplace_saida add constraint marketplace_saida_acao_check
  check (acao in ('confirm', 'readyToPickup', 'dispatch', 'requestCancellation', 'negociacao'));

-- 3. Cancelar o pedido por decisão do marketplace (sem voltar para o iFood)
create or replace function private.cancelar_pelo_marketplace(p_pedido uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v public.pedidos;
begin
  select * into v from public.pedidos where id = p_pedido for update;
  if not found or v.status = 'cancelado' then
    return;
  end if;
  perform set_config('res.origem_externa', '1', true);
  update public.pedidos set status = 'cancelado', cancelado_em = now(), motivo_cancelamento = left(p_motivo, 300) where id = p_pedido;
  insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por) values (v.loja_id, v.id, v.status, 'cancelado', left(p_motivo, 300), null);
  perform set_config('res.origem_externa', '', true);
end;
$$;

-- Fecha a negociação e aplica o efeito no pedido. Cancelamento (total) aceito ou vencido com
-- "aceitar cancelamento" cancela o pedido, mesmo já concluído (o iFood devolve ao cliente).
create or replace function private.fechar_negociacao(p_id uuid, p_situacao text, p_resultado jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare n public.marketplace_negociacoes;
begin
  update public.marketplace_negociacoes
     set situacao = p_situacao, resultado = coalesce(p_resultado, resultado), resolvido_em = now()
   where id = p_id and situacao in ('aberta', 'respondida')
  returning * into n;
  if not found then
    return;
  end if;
  if n.acao = 'CANCELLATION' and (p_situacao = 'aceita' or (p_situacao = 'expirada' and n.acao_no_prazo = 'ACCEPT_CANCELLATION')) then
    perform private.cancelar_pelo_marketplace(n.pedido_id,
      case when p_situacao = 'aceita' then 'iFood: cancelamento aceito na negociação' else 'iFood: cancelado (negociação sem resposta no prazo)' end
      || coalesce(' — ' || n.mensagem, ''));
  end if;
end;
$$;

-- 4. Chegou uma negociação (HSD)
create or replace function private.receber_negociacao(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped public.pedidos;
  v_id  uuid;
begin
  select * into v_ped from public.pedidos where externo_canal = p ->> 'canal' and externo_id = p ->> 'externo_id';
  if not found then
    raise exception 'Pedido % do marketplace não encontrado.', p ->> 'externo_id' using errcode = 'no_data_found';
  end if;
  insert into public.marketplace_negociacoes (loja_id, pedido_id, canal, disputa_id, acao, tipo, mensagem, expira_em, acao_no_prazo,
                                              alternativas, motivos_aceite, itens, evidencias)
  values (v_ped.loja_id, v_ped.id, p ->> 'canal', p ->> 'disputa_id', coalesce(p ->> 'acao', 'CANCELLATION'), p ->> 'tipo',
          left(p ->> 'mensagem', 500), (p ->> 'expira_em')::timestamptz, p ->> 'acao_no_prazo',
          coalesce(p -> 'alternativas', '[]'::jsonb), coalesce(p -> 'motivos_aceite', '[]'::jsonb), coalesce(p -> 'itens', '[]'::jsonb),
          coalesce((p ->> 'evidencias')::int, 0))
  on conflict (canal, disputa_id) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.marketplace_negociacoes where canal = p ->> 'canal' and disputa_id = p ->> 'disputa_id';
  end if;
  return v_id;
end;
$$;

-- 5. Resultado final (HSS)
create or replace function private.resolver_negociacao(p_canal text, p_disputa text, p_status text, p_resultado jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id  uuid;
  v_sit text := case p_status when 'ACCEPTED' then 'aceita' when 'REJECTED' then 'recusada' when 'EXPIRED' then 'expirada' when 'ALTERNATIVE_REPLIED' then 'alternativa' end;
begin
  if v_sit is null then
    return 'ignorado';
  end if;
  select id into v_id from public.marketplace_negociacoes where canal = p_canal and disputa_id = p_disputa;
  if v_id is null then
    return 'sem_negociacao';
  end if;
  perform private.fechar_negociacao(v_id, v_sit, p_resultado);
  return v_sit;
end;
$$;

-- 6. Loja responde (quadro de pedidos). A chamada ao iFood é montada no servidor a partir daqui
--    (disputa + resposta conferida), nunca com caminho vindo do navegador.
create or replace function public.responder_negociacao(p_negociacao uuid, p_resposta jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  n      public.marketplace_negociacoes;
  v_modo text;
  v_tipo text := p_resposta ->> 'tipo';
  v_alt  jsonb;
  v_sit  text;
begin
  select * into n from public.marketplace_negociacoes where id = p_negociacao for update;
  if not found or not private.tem_permissao(n.loja_id, 'pedidos_delivery') then
    raise exception 'Negociação não encontrada.' using errcode = 'no_data_found';
  end if;
  if n.situacao <> 'aberta' then
    raise exception 'Essa negociação já foi respondida.' using errcode = 'check_violation';
  end if;
  if n.expira_em is not null and n.expira_em < now() then
    raise exception 'O prazo para responder acabou.' using errcode = 'check_violation';
  end if;
  if v_tipo = 'aceitar' then
    if jsonb_array_length(n.motivos_aceite) > 0 and not (n.motivos_aceite ? coalesce(p_resposta ->> 'motivo', '')) then
      raise exception 'Escolha o motivo do aceite.' using errcode = 'check_violation';
    end if;
  elsif v_tipo = 'recusar' then
    if n.tipo = 'DELAY' then
      raise exception 'Nesse caso o iFood não deixa recusar: aceite ou ofereça mais tempo.' using errcode = 'check_violation';
    end if;
    if coalesce(btrim(p_resposta ->> 'motivo'), '') = '' or length(p_resposta ->> 'motivo') > 250 then
      raise exception 'Escreva o motivo da recusa (até 250 letras).' using errcode = 'check_violation';
    end if;
  elsif v_tipo = 'alternativa' then
    select a.value into v_alt from jsonb_array_elements(n.alternativas) as a(value) where a.value ->> 'id' = p_resposta ->> 'alternativaId';
    if v_alt is null or v_alt ->> 'tipo' <> p_resposta ->> 'alternativa' then
      raise exception 'Essa contraproposta não está disponível.' using errcode = 'check_violation';
    end if;
    if v_alt ->> 'tipo' = 'mais_tempo' then
      if jsonb_array_length(coalesce(v_alt -> 'minutos', '[]'::jsonb)) > 0 and not (v_alt -> 'minutos') @> to_jsonb(coalesce((p_resposta ->> 'minutos')::int, 0)) then
        raise exception 'Escolha quantos minutos a mais.' using errcode = 'check_violation';
      end if;
    elsif coalesce((p_resposta ->> 'valor')::numeric, 0) <= 0
       or (v_alt ->> 'valor_max' is not null and (p_resposta ->> 'valor')::numeric > (v_alt ->> 'valor_max')::numeric) then
      raise exception 'Valor fora do permitido (máximo R$ %).', coalesce(v_alt ->> 'valor_max', '—') using errcode = 'check_violation';
    end if;
  else
    raise exception 'Resposta inválida.' using errcode = 'check_violation';
  end if;

  select coalesce(ml.modo, 'teste') into v_modo
    from public.pedidos pd left join public.marketplace_lojas ml on ml.loja_id = pd.loja_id and ml.marca_id = pd.marca_id and ml.canal = pd.externo_canal
   where pd.id = n.pedido_id;

  update public.marketplace_negociacoes set situacao = 'respondida', resposta = p_resposta, respondido_por = auth.uid(), respondido_em = now() where id = n.id;
  perform private.enfileirar_marketplace(n.pedido_id, 'negociacao', jsonb_build_object('negociacao_id', n.id, 'disputa_id', n.disputa_id, 'resposta', p_resposta));

  -- modo teste: o "iFood" responde na hora
  if coalesce(v_modo, 'teste') = 'teste' then
    v_sit := case v_tipo when 'aceitar' then 'aceita' when 'recusar' then 'recusada' else 'alternativa' end;
    perform private.fechar_negociacao(n.id, v_sit, jsonb_build_object('simulado', true));
    return v_sit;
  end if;
  return 'respondida';
end;
$$;
revoke execute on function public.responder_negociacao(uuid, jsonb) from public, anon;
grant execute on function public.responder_negociacao(uuid, jsonb) to authenticated;

-- 7. Portas do servidor (chave de serviço)
create or replace function public.marketplace_receber_negociacao(p jsonb)
returns uuid language sql security definer set search_path = '' as $$ select private.receber_negociacao(p); $$;
create or replace function public.marketplace_resolver_negociacao(p_canal text, p_disputa text, p_status text, p_resultado jsonb default null)
returns text language sql security definer set search_path = '' as $$ select private.resolver_negociacao(p_canal, p_disputa, p_status, p_resultado); $$;
revoke execute on function public.marketplace_receber_negociacao(jsonb) from public, anon, authenticated;
revoke execute on function public.marketplace_resolver_negociacao(text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.marketplace_receber_negociacao(jsonb) to service_role;
grant execute on function public.marketplace_resolver_negociacao(text, text, text, jsonb) to service_role;

-- 8. Simulador (dono/gerente, só modo teste)
create or replace function public.simular_negociacao_marketplace(p_pedido uuid, p jsonb)
returns uuid
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
  if v.externo_id is null or not exists (select 1 from public.marketplace_lojas where loja_id = v.loja_id and marca_id = v.marca_id and canal = v.externo_canal and modo = 'teste') then
    raise exception 'O simulador só funciona com a loja do iFood em modo teste.' using errcode = 'check_violation';
  end if;
  return private.receber_negociacao(p || jsonb_build_object('canal', v.externo_canal, 'externo_id', v.externo_id));
end;
$$;
revoke execute on function public.simular_negociacao_marketplace(uuid, jsonb) from public, anon;
grant execute on function public.simular_negociacao_marketplace(uuid, jsonb) to authenticated;

-- 9. Agendador (a cada 30 s)
--    a) vence negociações sem resposta (modo teste na hora; produção 10 min depois, caso o aviso final do iFood se perca)
--    b) com loja em produção, chama a rota do RES que busca eventos e envia a fila.
--       Segredo e endereço ficam no Vault do Supabase (nunca no código):
--         select vault.create_secret('<o mesmo MARKETPLACE_CRON_SEGREDO da Vercel>', 'marketplace_cron_segredo');
--         select vault.create_secret('https://res-iqzs.vercel.app', 'res_url');   -- opcional
create or replace function private.marketplace_tique()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  n        record;
  v_segredo text;
  v_url     text;
begin
  for n in
    select ng.id, coalesce(ml.modo, 'teste') as modo, ng.expira_em
      from public.marketplace_negociacoes ng
      join public.pedidos pd on pd.id = ng.pedido_id
      left join public.marketplace_lojas ml on ml.loja_id = pd.loja_id and ml.marca_id = pd.marca_id and ml.canal = pd.externo_canal
     where ng.situacao in ('aberta', 'respondida') and ng.expira_em is not null
  loop
    if n.expira_em < now() - (case when n.modo = 'teste' then interval '0' else interval '10 minutes' end) then
      perform private.fechar_negociacao(n.id, 'expirada', jsonb_build_object('automatico', true));
    end if;
  end loop;

  if not exists (select 1 from public.marketplace_lojas where ativo and modo = 'producao')
     or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null
     or to_regclass('vault.decrypted_secrets') is null then
    return;
  end if;
  execute 'select max(decrypted_secret) filter (where name = ''marketplace_cron_segredo''), max(decrypted_secret) filter (where name = ''res_url'') from vault.decrypted_secrets'
     into v_segredo, v_url;
  if coalesce(v_segredo, '') = '' then
    return;
  end if;
  execute 'select net.http_post(url := $1, body := ''{}''::jsonb, params := ''{}''::jsonb, headers := $2, timeout_milliseconds := 25000)'
    using rtrim(coalesce(nullif(v_url, ''), 'https://res-iqzs.vercel.app'), '/') || '/api/marketplace/ifood/sincronizar',
          jsonb_build_object('Content-Type', 'application/json', 'X-RES-Chave', v_segredo);
end;
$$;
revoke execute on function private.marketplace_tique() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    begin
      perform cron.schedule('res-marketplace', '30 seconds', 'select private.marketplace_tique()');
    exception when others then
      -- pg_cron antigo (sem segundos): a cada minuto
      perform cron.schedule('res-marketplace', '* * * * *', 'select private.marketplace_tique()');
    end;
  end if;
exception when others then raise notice 'agendamento do marketplace não criado: %', sqlerrm;
end $$;
