-- D-112 · Integrações, etapa 1: a base do iFood (D-074/D-075) vira a base de TODOS os canais
-- (especificação técnica das integrações de 12/11, seção 1). Em vez de tabelas novas em paralelo, as
-- atuais ganham o que a especificação pede:
--   canais                  catálogo fixo (iFood, 99Food, Keeta, Aiqfome, Delivery Much, Rappi)
--   marketplace_lojas       = canal_lojas: estado da conexão, config, validade do token, último sinal/erro
--   private.marketplace_segredos  tokens, refresh, apiKey: só o servidor (service_role) lê e grava
--   private.marketplace_eventos   = canal_eventos: loja, corpo original, tentativas
--   marketplace_pedidos     = canal_pedidos: mapa pedido RES ↔ externo, com o corpo original (auditoria/disputa)
--   marketplace_itens       = canal_produto_vinculos (já existia)
--   marketplace_saida       = canal_chamadas: método, URL, próxima tentativa (reenvio 1/2/4/8/16 min), resposta
--   marketplace_precos      preço opcional para os apps (Q-14), sem mexer nas tabelas do cardápio
-- Pode rodar de novo.

-- 1. Catálogo dos canais ----------------------------------------------------------------------------
create table if not exists public.canais (
  chave  text primary key check (chave ~ '^[a-z0-9]+$'),
  nome   text not null,
  modelo text not null check (modelo in ('servidor_od', 'cliente')),
  ordem  smallint not null default 0,
  ativo  boolean not null default true
);
insert into public.canais (chave, nome, modelo, ordem) values
  ('ifood', 'iFood', 'cliente', 1),
  ('99food', '99Food', 'servidor_od', 2),
  ('keeta', 'Keeta', 'servidor_od', 3),
  ('aiqfome', 'aiqfome', 'servidor_od', 4),
  ('deliverymuch', 'Delivery Much', 'cliente', 5),
  ('rappi', 'Rappi', 'cliente', 6)
on conflict (chave) do update set nome = excluded.nome, modelo = excluded.modelo, ordem = excluded.ordem;
alter table public.canais enable row level security;
drop policy if exists canais_ler on public.canais;
create policy canais_ler on public.canais for select to authenticated using (true);
grant select on public.canais to authenticated;
revoke insert, update, delete on public.canais from authenticated, anon;

-- os pedidos de cada canal aparecem com a sua origem
do $$
declare c text;
begin
  foreach c in array array['99food', 'keeta', 'aiqfome', 'deliverymuch', 'rappi'] loop
    execute format('alter type public.origem_pedido add value if not exists %L', c);
  end loop;
end $$;

-- 2. Pedido: o canal vem do catálogo ----------------------------------------------------------------
alter table public.pedidos drop constraint if exists pedidos_externo_canal;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'pedidos_externo_canal_fk') then
    alter table public.pedidos add constraint pedidos_externo_canal_fk foreign key (externo_canal) references public.canais (chave);
  end if;
end $$;

-- 3. Loja ↔ canal ------------------------------------------------------------------------------------
alter table public.marketplace_lojas drop constraint if exists marketplace_lojas_canal_check;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'marketplace_lojas_canal_fk') then
    alter table public.marketplace_lojas add constraint marketplace_lojas_canal_fk foreign key (canal) references public.canais (chave);
  end if;
end $$;
-- no Open Delivery o id da loja no app só chega no onboarding; até lá fica vazio
alter table public.marketplace_lojas alter column merchant_id drop not null;
alter table public.marketplace_lojas drop constraint if exists marketplace_lojas_merchant_id_check;
alter table public.marketplace_lojas add constraint marketplace_lojas_merchant_id_check check (merchant_id is null or length(btrim(merchant_id)) between 1 and 80);
alter table public.marketplace_lojas add column if not exists estado text not null default 'conectado';
alter table public.marketplace_lojas drop constraint if exists marketplace_lojas_estado_check;
alter table public.marketplace_lojas add constraint marketplace_lojas_estado_check check (estado in ('desconectado', 'aguardando_autorizacao', 'conectado', 'erro'));
alter table public.marketplace_lojas add column if not exists config jsonb not null default '{}'::jsonb;
alter table public.marketplace_lojas add column if not exists token_expira_em timestamptz;
alter table public.marketplace_lojas add column if not exists ultimo_sinal timestamptz;
alter table public.marketplace_lojas add column if not exists ultimo_erro text;

-- segredos por loja e canal (token, refresh_token, apiKey que geramos para o app nos chamar, client_secret)
create table if not exists private.marketplace_segredos (
  marketplace_loja_id uuid primary key references public.marketplace_lojas (id) on delete cascade,
  segredos            jsonb not null default '{}'::jsonb,
  atualizado_em       timestamptz not null default now()
);
revoke all on private.marketplace_segredos from public, anon, authenticated;

create or replace function public.marketplace_segredos_ler(p_marketplace_loja uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((select segredos from private.marketplace_segredos where marketplace_loja_id = p_marketplace_loja), '{}'::jsonb);
$$;
-- grava por cima só as chaves enviadas (null apaga a chave)
create or replace function public.marketplace_segredos_gravar(p_marketplace_loja uuid, p_segredos jsonb, p_expira_em timestamptz default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into private.marketplace_segredos as s (marketplace_loja_id, segredos)
  values (p_marketplace_loja, jsonb_strip_nulls(coalesce(p_segredos, '{}'::jsonb)))
  on conflict (marketplace_loja_id) do update
     set segredos = jsonb_strip_nulls(s.segredos || coalesce(p_segredos, '{}'::jsonb)), atualizado_em = now();
  if p_expira_em is not null then
    update public.marketplace_lojas set token_expira_em = p_expira_em where id = p_marketplace_loja;
  end if;
end;
$$;
revoke all on function public.marketplace_segredos_ler(uuid) from public, anon, authenticated;
revoke all on function public.marketplace_segredos_gravar(uuid, jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.marketplace_segredos_ler(uuid) to service_role;
grant execute on function public.marketplace_segredos_gravar(uuid, jsonb, timestamptz) to service_role;

-- 4. Eventos recebidos -------------------------------------------------------------------------------
alter table private.marketplace_eventos add column if not exists marketplace_loja_id uuid references public.marketplace_lojas (id) on delete set null;
alter table private.marketplace_eventos add column if not exists corpo jsonb;
alter table private.marketplace_eventos add column if not exists tentativas smallint not null default 0;
create index if not exists marketplace_eventos_loja on private.marketplace_eventos (marketplace_loja_id, recebido_em desc);
create index if not exists marketplace_eventos_pendentes on private.marketplace_eventos (recebido_em) where processado_em is null;

-- 5. Pedido RES ↔ pedido externo, com o corpo original ------------------------------------------------
create table if not exists public.marketplace_pedidos (
  pedido_id       uuid primary key references public.pedidos (id) on delete cascade,
  loja_id         uuid not null references public.lojas (id) on delete cascade,
  canal           text not null references public.canais (chave),
  externo_id      text not null,
  display_id      text,
  url_detalhes    text,
  corpo_original  jsonb,
  entregue_por    text not null default 'loja' check (entregue_por in ('loja', 'marketplace')),
  status_externo  text,
  total_externo   numeric(12, 2),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  unique (canal, externo_id)
);
create index if not exists marketplace_pedidos_loja on public.marketplace_pedidos (loja_id, criado_em desc);
alter table public.marketplace_pedidos enable row level security;
drop policy if exists marketplace_pedidos_ler on public.marketplace_pedidos;
create policy marketplace_pedidos_ler on public.marketplace_pedidos for select to authenticated using (private.e_gestor(loja_id));
grant select on public.marketplace_pedidos to authenticated;
revoke insert, update, delete on public.marketplace_pedidos from authenticated, anon;
-- pedidos que já vieram do iFood (modo teste) entram no mapa
insert into public.marketplace_pedidos (pedido_id, loja_id, canal, externo_id, display_id, entregue_por, criado_em)
select p.id, p.loja_id, p.externo_canal, p.externo_id, p.externo_codigo, case when p.entrega_marketplace then 'marketplace' else 'loja' end, p.criado_em
  from public.pedidos p where p.externo_id is not null and p.externo_canal is not null
on conflict (pedido_id) do nothing;

-- todo pedido novo vindo de um canal entra no mapa (só age em pedido com externo_id; os outros nem passam aqui)
create or replace function private.mapear_pedido_externo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.marketplace_pedidos (pedido_id, loja_id, canal, externo_id, display_id, entregue_por)
  values (new.id, new.loja_id, new.externo_canal, new.externo_id, new.externo_codigo, case when new.entrega_marketplace then 'marketplace' else 'loja' end)
  on conflict (pedido_id) do nothing;
  return null;
end;
$$;
drop trigger if exists pedidos_mapear_externo on public.pedidos;
create trigger pedidos_mapear_externo after insert on public.pedidos
  for each row when (new.externo_id is not null and new.externo_canal is not null) execute function private.mapear_pedido_externo();

-- 6. Chamadas de saída -------------------------------------------------------------------------------
alter table public.marketplace_saida alter column pedido_id drop not null;   -- merchantUpdate, abrir/pausar loja
alter table public.marketplace_saida alter column externo_id drop not null;
alter table public.marketplace_saida add column if not exists marketplace_loja_id uuid references public.marketplace_lojas (id) on delete cascade;
alter table public.marketplace_saida add column if not exists metodo text not null default 'POST';
alter table public.marketplace_saida add column if not exists url text;
alter table public.marketplace_saida add column if not exists proxima_em timestamptz not null default now();
alter table public.marketplace_saida add column if not exists resposta text;
alter table public.marketplace_saida drop constraint if exists marketplace_saida_metodo_check;
alter table public.marketplace_saida add constraint marketplace_saida_metodo_check check (metodo in ('GET', 'POST', 'PUT', 'PATCH', 'DELETE'));
alter table public.marketplace_saida drop constraint if exists marketplace_saida_acao_check;
alter table public.marketplace_saida add constraint marketplace_saida_acao_check check (acao in (
  'confirm', 'preparing', 'readyToPickup', 'readyForPickup', 'dispatch', 'delivered', 'tracking',
  'requestCancellation', 'acceptCancellation', 'denyCancellation', 'negociacao', 'merchantUpdate', 'pausar', 'abrir'));
alter table public.marketplace_saida drop constraint if exists marketplace_saida_situacao_check;
alter table public.marketplace_saida add constraint marketplace_saida_situacao_check check (situacao in ('pendente', 'enviado', 'erro', 'simulado', 'falhou'));
drop index if exists public.marketplace_saida_pendente;
create index if not exists marketplace_saida_pendente on public.marketplace_saida (proxima_em) where situacao in ('pendente', 'erro');

-- resultado do envio: erro tenta de novo em 1, 2, 4, 8 e 16 min; na 6ª falha desiste e avisa a loja
create or replace function public.marketplace_marcar_saida(p_id bigint, p_ok boolean, p_erro text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare s public.marketplace_saida;
begin
  update public.marketplace_saida
     set tentativas = tentativas + 1,
         situacao = case when p_ok then 'enviado' when tentativas + 1 >= 6 then 'falhou' else 'erro' end,
         erro = case when p_ok then null else left(p_erro, 500) end,
         enviado_em = case when p_ok then now() end,
         proxima_em = case when p_ok then proxima_em else now() + make_interval(mins => power(2, least(tentativas, 4))::int) end
   where id = p_id
  returning * into s;
  if s.situacao = 'falhou' and s.marketplace_loja_id is not null then
    update public.marketplace_lojas set ultimo_erro = left(format('%s: %s', s.acao, p_erro), 300) where id = s.marketplace_loja_id;
  end if;
end;
$$;
revoke execute on function public.marketplace_marcar_saida(bigint, boolean, text) from public, anon, authenticated;
grant execute on function public.marketplace_marcar_saida(bigint, boolean, text) to service_role;

-- 7. Preço para os apps (Q-14): tabela própria, sem mexer em produto_marcas. Sem linha = preço do delivery.
create table if not exists public.marketplace_precos (
  loja_id    uuid not null references public.lojas (id) on delete cascade,
  produto_id uuid not null references public.produtos (id) on delete cascade,
  marca_id   uuid not null,
  preco      numeric(12, 2) not null check (preco >= 0),
  primary key (produto_id, marca_id),
  foreign key (marca_id, loja_id) references public.marcas (id, loja_id) on delete cascade
);
alter table public.marketplace_precos enable row level security;
drop policy if exists marketplace_precos_ler on public.marketplace_precos;
create policy marketplace_precos_ler on public.marketplace_precos for select to authenticated using (private.e_membro(loja_id));
drop policy if exists marketplace_precos_gravar on public.marketplace_precos;
create policy marketplace_precos_gravar on public.marketplace_precos for all to authenticated
  using (private.tem_permissao(loja_id, 'cardapio')) with check (private.tem_permissao(loja_id, 'cardapio'));
grant select, insert, update, delete on public.marketplace_precos to authenticated;
revoke all on public.marketplace_precos from anon;

-- 8. Painel: conexões e últimos eventos da loja (dono/gerente) ---------------------------------------------
create or replace function public.marketplace_painel(p_loja uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente.' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'canais', (select jsonb_agg(jsonb_build_object('chave', c.chave, 'nome', c.nome, 'modelo', c.modelo) order by c.ordem) from public.canais c where c.ativo),
    'conexoes', coalesce((
      select jsonb_agg(jsonb_build_object('id', ml.id, 'canal', ml.canal, 'marca_id', ml.marca_id, 'merchant_id', ml.merchant_id, 'modo', ml.modo,
               'estado', ml.estado, 'ativo', ml.ativo, 'ultimo_sinal', ml.ultimo_sinal, 'ultimo_evento_em', ml.ultimo_evento_em, 'ultimo_erro', ml.ultimo_erro,
               'token_expira_em', ml.token_expira_em,
               'eventos_com_erro', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'codigo', e.codigo, 'externo_id', e.externo_id, 'recebido_em', e.recebido_em, 'erro', e.erro) order by e.recebido_em desc)
                                     from (select * from private.marketplace_eventos e where e.marketplace_loja_id = ml.id and e.erro is not null order by e.recebido_em desc limit 20) e), '[]'::jsonb),
               'chamadas_falhas', (select count(*) from public.marketplace_saida s where s.marketplace_loja_id = ml.id and s.situacao = 'falhou'))
             order by ml.canal)
        from public.marketplace_lojas ml where ml.loja_id = p_loja), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.marketplace_painel(uuid) from public, anon;
grant execute on function public.marketplace_painel(uuid) to authenticated;

-- 9. Registro de evento: guarda a loja e o corpo original (para reprocessar e auditar) --------------------
drop function if exists public.marketplace_registrar_evento(text, text, text, text, text);
create or replace function public.marketplace_registrar_evento(p_canal text, p_evento_id text, p_codigo text, p_externo_id text, p_merchant_id text, p_corpo jsonb default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_ml uuid;
begin
  select id into v_ml from public.marketplace_lojas where canal = p_canal and merchant_id = p_merchant_id order by ativo desc limit 1;
  insert into private.marketplace_eventos (canal, evento_id, codigo, externo_id, merchant_id, marketplace_loja_id, corpo)
  values (p_canal, p_evento_id, p_codigo, p_externo_id, p_merchant_id, v_ml, p_corpo)
  on conflict (canal, evento_id) do nothing;
  if found and v_ml is not null then
    update public.marketplace_lojas set ultimo_sinal = now() where id = v_ml;
  end if;
  return found;
end;
$$;
revoke execute on function public.marketplace_registrar_evento(text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.marketplace_registrar_evento(text, text, text, text, text, jsonb) to service_role;

-- 10. Fila de volta sabe de qual conexão é (para reenvio, falhas no card e chamadas sem pedido) ------------
create or replace function private.enfileirar_marketplace(p_pedido uuid, p_acao text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v record;
begin
  select pd.loja_id, pd.externo_canal, pd.externo_id, ml.id as ml_id, coalesce(ml.modo, 'teste') as modo into v
    from public.pedidos pd left join public.marketplace_lojas ml on ml.loja_id = pd.loja_id and ml.marca_id = pd.marca_id and ml.canal = pd.externo_canal
   where pd.id = p_pedido;
  if v.externo_id is null then
    return;
  end if;
  insert into public.marketplace_saida (loja_id, pedido_id, canal, externo_id, acao, payload, situacao, enviado_em, marketplace_loja_id)
  values (v.loja_id, p_pedido, v.externo_canal, v.externo_id, p_acao, coalesce(p_payload, '{}'::jsonb),
          case when v.modo = 'teste' then 'simulado' else 'pendente' end, case when v.modo = 'teste' then now() end, v.ml_id);
end;
$$;
