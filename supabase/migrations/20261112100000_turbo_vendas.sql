-- D-096: TURBO-VENDAS (inspirado no Repediu). Automações com gatilho, campanhas com cupom e agendamento,
-- fila de envio no WhatsApp (o atendente toca e a conversa abre pronta; envio automático quando a API
-- oficial da Meta for ligada), atribuição de vendas (pedido concluído até X dias depois do envio),
-- perfil do cliente, safras/LTV e carrinho abandonado. Módulo adicional "turbo" (R$ 79,90; incluso no Completo).
-- Respeita o "não quero receber" do cliente (LGPD). Pode rodar de novo.

-- 0. Módulo
insert into public.modulos_res (id, nome, descricao, preco, cobranca, ordem)
values ('turbo', 'Turbo-Vendas', 'Automações, campanhas com cupom, fila de WhatsApp e vendas por campanha.', 79.90, 'conta', 75)
on conflict (id) do nothing;
update public.planos_res set modulos = array_append(modulos, 'turbo') where id = 'completo' and not ('turbo' = any (modulos));

alter table public.clientes add column if not exists marketing_optout_em timestamptz;

-- 1. Tabelas
create table if not exists public.turbo_automacoes (
  id        uuid primary key default gen_random_uuid(),
  loja_id   uuid not null references public.lojas (id) on delete cascade,
  tipo      text not null check (tipo in ('boas_vindas', 'sumido', 'ciclo', 'carrinho', 'avaliacao')),
  ativo     boolean not null default false,
  mensagem  text not null check (length(mensagem) between 5 and 700),
  cupom     text check (cupom is null or cupom ~ '^[A-Z0-9_-]{3,30}$'),
  config    jsonb not null default '{}'::jsonb,       -- dias, minutos, janela_dias
  criado_em timestamptz not null default now(),
  unique (loja_id, tipo)
);

create table if not exists public.turbo_campanhas (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references public.lojas (id) on delete cascade,
  nome          text not null check (length(btrim(nome)) between 2 and 80),
  publico       jsonb not null default '{}'::jsonb,    -- {segmentos:[], dias_min, dias_max, pedidos_min, gasto_min}
  mensagem      text not null check (length(mensagem) between 5 and 700),
  cupom         text check (cupom is null or cupom ~ '^[A-Z0-9_-]{3,30}$'),
  janela_dias   smallint not null default 5 check (janela_dias between 1 and 30),
  agendada_para timestamptz,
  status        text not null default 'rascunho' check (status in ('rascunho', 'agendada', 'gerada', 'cancelada')),
  gerada_em     timestamptz,
  criado_em     timestamptz not null default now(),
  criado_por    uuid
);

create table if not exists public.turbo_carrinhos (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references public.lojas (id) on delete cascade,
  marca_id      uuid,
  telefone      text not null check (telefone ~ '^[0-9]{10,13}$'),
  nome          text,
  itens         text,
  total         numeric(12, 2),
  atualizado_em timestamptz not null default now(),
  convertido_em timestamptz,
  unique (loja_id, telefone)
);

create table if not exists public.turbo_envios (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references public.lojas (id) on delete cascade,
  cliente_id    uuid references public.clientes (id) on delete cascade,
  telefone      text not null,
  nome          text,
  origem        text not null check (origem in ('automacao', 'campanha')),
  automacao_id  uuid references public.turbo_automacoes (id) on delete set null,
  campanha_id   uuid references public.turbo_campanhas (id) on delete set null,
  referencia    text,                                   -- pedido/carrinho que gerou (evita repetir)
  mensagem      text not null,
  cupom         text,
  janela_dias   smallint not null default 5,
  status        text not null default 'fila' check (status in ('fila', 'enviado', 'pulado')),
  criado_em     timestamptz not null default now(),
  enviado_em    timestamptz,
  enviado_por   uuid,
  pedido_id     uuid,
  valor         numeric(12, 2),
  convertido_em timestamptz
);
create index if not exists turbo_envios_fila on public.turbo_envios (loja_id, status, criado_em);
create index if not exists turbo_envios_tel on public.turbo_envios (telefone, enviado_em desc) where status = 'enviado';
create unique index if not exists turbo_envios_ref on public.turbo_envios (automacao_id, referencia) where referencia is not null;

alter table public.turbo_automacoes enable row level security;
alter table public.turbo_campanhas enable row level security;
alter table public.turbo_carrinhos enable row level security;
alter table public.turbo_envios enable row level security;
-- leitura e escrita só pelas funções abaixo
revoke all on public.turbo_automacoes, public.turbo_campanhas, public.turbo_carrinhos, public.turbo_envios from anon, authenticated;

-- 2. Permissão: módulo ligado + marketing (ou dono/gerente)
create or replace function private.turbo_pode(p_loja uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not (private.e_gestor(p_loja) or private.tem_permissao(p_loja, 'marketing')) then
    raise exception 'Você não tem acesso ao Turbo-Vendas.' using errcode = 'insufficient_privilege';
  end if;
  if not private.loja_tem_modulo(p_loja, 'turbo') then
    raise exception 'O Turbo-Vendas não está no seu plano. Contrate em Assinatura.' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- 3. Texto final da mensagem: {nome} {loja} {cupom} {link} {favorito} {avaliacao}
create or replace function private.turbo_texto(p_loja uuid, p_cliente uuid, p_nome text, p_msg text, p_cupom text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v_loja text; v_slug text; v_fav text; v_av text; v_base text := 'https://res-iqzs.vercel.app';
begin
  select l.nome into v_loja from public.lojas l where l.id = p_loja;
  select m.slug into v_slug from public.marcas m where m.loja_id = p_loja and m.ativa and not m.evento order by m.criado_em limit 1;
  select i.nome into v_fav from public.pedido_itens i join public.pedidos p on p.id = i.pedido_id
   where p.cliente_id = p_cliente and p.status <> 'cancelado' group by i.nome order by sum(i.quantidade) desc limit 1;
  select a.config ->> 'url' into v_av from public.integracoes a where a.loja_id = p_loja and a.tipo = 'google_avaliacao' and a.ativo;
  return replace(replace(replace(replace(replace(replace(p_msg,
    '{nome}', coalesce(split_part(btrim(p_nome), ' ', 1), '')),
    '{loja}', coalesce(v_loja, '')),
    '{cupom}', coalesce(p_cupom, '')),
    '{link}', case when v_slug is null then '' else v_base || '/c/' || v_slug end),
    '{favorito}', coalesce(v_fav, 'seu pedido de sempre')),
    '{avaliacao}', coalesce(v_av, ''));
end;
$$;

-- cliente pode receber? (não pediu para sair e não recebeu nada de marketing nos últimos 2 dias)
create or replace function private.turbo_pode_receber(p_cliente uuid, p_telefone text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.clientes c where c.id = p_cliente and c.marketing_optout_em is not null)
     and not exists (select 1 from public.clientes c where c.telefone = p_telefone and c.marketing_optout_em is not null)
     and not exists (select 1 from public.turbo_envios e where e.telefone = p_telefone and e.criado_em > now() - interval '2 days' and e.status <> 'pulado');
$$;

create or replace function private.turbo_enfileirar(p_loja uuid, p_cliente uuid, p_tel text, p_nome text, p_origem text, p_aut uuid, p_camp uuid,
                                                    p_ref text, p_msg text, p_cupom text, p_janela smallint)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_tel is null or not private.turbo_pode_receber(p_cliente, p_tel) then
    return false;
  end if;
  insert into public.turbo_envios (loja_id, cliente_id, telefone, nome, origem, automacao_id, campanha_id, referencia, mensagem, cupom, janela_dias)
  values (p_loja, p_cliente, p_tel, p_nome, p_origem, p_aut, p_camp, p_ref, private.turbo_texto(p_loja, p_cliente, p_nome, p_msg, p_cupom), p_cupom, coalesce(p_janela, 5))
  on conflict do nothing;
  return found;
end;
$$;

-- 4. Robô das automações e campanhas agendadas (a cada 10 min)
create or replace function private.turbo_tique()
returns integer language plpgsql security definer set search_path = '' as $$
declare a public.turbo_automacoes; cp public.turbo_campanhas; r record; n integer := 0; v_j smallint;
begin
  for a in select * from public.turbo_automacoes where ativo loop
    if not private.loja_tem_modulo(a.loja_id, 'turbo') then continue; end if;
    v_j := coalesce((a.config ->> 'janela_dias')::smallint, 5);
    if a.tipo = 'boas_vindas' then
      -- 1º pedido concluído há mais de 1 h (e menos de 2 dias)
      for r in select c.id, c.telefone, c.nome, p.id as pid from public.pedidos p join public.clientes c on c.id = p.cliente_id
                where p.loja_id = any (private.lojas_grupo(a.loja_id)) and p.status = 'concluido'
                  and p.concluido_em between now() - interval '2 days' and now() - interval '1 hour'
                  and (select count(*) from public.pedidos x where x.cliente_id = c.id and x.status <> 'cancelado') = 1 loop
        if private.turbo_enfileirar(a.loja_id, r.id, r.telefone, r.nome, 'automacao', a.id, null, 'p:' || r.pid, a.mensagem, a.cupom, v_j) then n := n + 1; end if;
      end loop;
    elsif a.tipo = 'avaliacao' then
      -- pede avaliação no Google 1 a 6 h depois do pedido concluído (1 vez por cliente a cada 60 dias)
      for r in select c.id, c.telefone, c.nome, p.id as pid from public.pedidos p join public.clientes c on c.id = p.cliente_id
                where p.loja_id = a.loja_id and p.status = 'concluido'
                  and p.concluido_em between now() - interval '6 hours' and now() - interval '1 hour'
                  and not exists (select 1 from public.turbo_envios e where e.automacao_id = a.id and e.cliente_id = c.id and e.criado_em > now() - interval '60 days') loop
        if private.turbo_enfileirar(a.loja_id, r.id, r.telefone, r.nome, 'automacao', a.id, null, 'p:' || r.pid, a.mensagem, a.cupom, v_j) then n := n + 1; end if;
      end loop;
    elsif a.tipo = 'sumido' then
      -- sem pedido há X dias (padrão 30), uma vez por "sumiço"
      for r in select c.id, c.telefone, c.nome, f.ultimo from private.clientes_rfv(a.loja_id) f join public.clientes c on c.id = f.id
                where f.pedidos >= 1 and f.dias between coalesce((a.config ->> 'dias')::int, 30) and coalesce((a.config ->> 'dias')::int, 30) + 45 loop
        if private.turbo_enfileirar(a.loja_id, r.id, r.telefone, r.nome, 'automacao', a.id, null, 'u:' || r.id || ':' || r.ultimo::date, a.mensagem, a.cupom, v_j) then n := n + 1; end if;
      end loop;
    elsif a.tipo = 'ciclo' then
      -- passou do próprio ciclo: 3+ pedidos e já faz 1,5× o intervalo médio dele (mín. 7 dias, máx. 120)
      for r in with h as (
                 select p.cliente_id, count(*) as n, min(p.criado_em) as pri, max(p.criado_em) as ult
                   from public.pedidos p where p.loja_id = any (private.lojas_grupo(a.loja_id)) and p.status <> 'cancelado' and p.cliente_id is not null
                  group by p.cliente_id having count(*) >= 3)
               select c.id, c.telefone, c.nome, h.ult from h join public.clientes c on c.id = h.cliente_id
                where now() - h.ult > greatest((h.ult - h.pri) / (h.n - 1) * 1.5, interval '7 days') and now() - h.ult < interval '120 days' loop
        if private.turbo_enfileirar(a.loja_id, r.id, r.telefone, r.nome, 'automacao', a.id, null, 'c:' || r.id || ':' || r.ult::date, a.mensagem, a.cupom, v_j) then n := n + 1; end if;
      end loop;
    elsif a.tipo = 'carrinho' then
      -- montou o carrinho, deu o telefone e não pediu (depois de X min, padrão 20; até 1 dia)
      for r in select k.id as kid, k.telefone, k.nome, c.id from public.turbo_carrinhos k
                 left join public.clientes c on c.grupo = private.grupo_da_loja(k.loja_id) and c.telefone = k.telefone
                where k.loja_id = a.loja_id and k.convertido_em is null
                  and k.atualizado_em between now() - interval '1 day' and now() - make_interval(mins => coalesce((a.config ->> 'minutos')::int, 20)) loop
        if private.turbo_enfileirar(a.loja_id, r.id, r.telefone, coalesce(r.nome, 'Cliente'), 'automacao', a.id, null, 'k:' || r.kid || ':' || now()::date, a.mensagem, a.cupom, v_j) then n := n + 1; end if;
      end loop;
    end if;
  end loop;

  for cp in select * from public.turbo_campanhas where status = 'agendada' and agendada_para <= now() for update skip locked loop
    n := n + private.turbo_gerar_campanha(cp.id);
  end loop;
  return n;
end;
$$;

-- público da campanha: segmentos RFV + filtros
create or replace function private.turbo_publico(p_loja uuid, p jsonb)
returns table (id uuid, telefone text, nome text)
language sql stable security definer set search_path = '' as $$
  select c.id, c.telefone, c.nome
    from private.clientes_rfv(p_loja) f join public.clientes c on c.id = f.id
   where f.pedidos >= greatest(coalesce((p ->> 'pedidos_min')::int, 1), 1)
     and (jsonb_array_length(coalesce(p -> 'segmentos', '[]'::jsonb)) = 0 or f.segmento in (select jsonb_array_elements_text(p -> 'segmentos')))
     and (p ->> 'dias_min' is null or f.dias >= (p ->> 'dias_min')::int)
     and (p ->> 'dias_max' is null or f.dias <= (p ->> 'dias_max')::int)
     and (p ->> 'gasto_min' is null or f.gasto >= (p ->> 'gasto_min')::numeric)
     and c.marketing_optout_em is null;
$$;

create or replace function private.turbo_gerar_campanha(p_campanha uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare cp public.turbo_campanhas; r record; n integer := 0;
begin
  select * into cp from public.turbo_campanhas where id = p_campanha;
  if not found or cp.status not in ('rascunho', 'agendada') then return 0; end if;
  for r in select * from private.turbo_publico(cp.loja_id, cp.publico) loop
    if private.turbo_enfileirar(cp.loja_id, r.id, r.telefone, r.nome, 'campanha', null, cp.id, null, cp.mensagem, cp.cupom, cp.janela_dias) then n := n + 1; end if;
  end loop;
  update public.turbo_campanhas set status = 'gerada', gerada_em = now() where id = cp.id;
  return n;
end;
$$;

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('res-turbo', '*/10 * * * *', 'select private.turbo_tique()');
  end if;
exception when others then raise notice 'Turbo-Vendas não agendado: %', sqlerrm;
end $$;

-- 5. Atribuição: pedido concluído até X dias depois de uma mensagem enviada conta para ela (último envio)
create or replace function private.turbo_atribuir()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if new.status = 'concluido' and old.status is distinct from 'concluido' and (new.cliente_id is not null or new.cliente_telefone is not null) then
    select e.id into v_id from public.turbo_envios e
     where e.status = 'enviado' and e.pedido_id is null
       and (e.cliente_id = new.cliente_id or e.telefone = new.cliente_telefone)
       and e.loja_id = any (private.lojas_grupo(new.loja_id))
       and e.enviado_em <= new.criado_em and new.criado_em <= e.enviado_em + make_interval(days => e.janela_dias)
     order by e.enviado_em desc limit 1;
    if v_id is not null then
      update public.turbo_envios set pedido_id = new.id, valor = new.total, convertido_em = now() where id = v_id;
    end if;
  end if;
  return null;
end;
$$;
drop trigger if exists pedidos_turbo_atribuir on public.pedidos;
create trigger pedidos_turbo_atribuir after update of status on public.pedidos for each row execute function private.turbo_atribuir();

-- carrinho vira pedido: marca convertido
create or replace function private.turbo_carrinho_convertido()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.cliente_telefone is not null then
    update public.turbo_carrinhos set convertido_em = now() where loja_id = new.loja_id and telefone = new.cliente_telefone and convertido_em is null;
  end if;
  return null;
end;
$$;
drop trigger if exists pedidos_turbo_carrinho on public.pedidos;
create trigger pedidos_turbo_carrinho after insert on public.pedidos for each row execute function private.turbo_carrinho_convertido();

-- 6. Cardápio: guarda o carrinho só se a loja usa a automação de carrinho abandonado
create or replace function public.turbo_carrinho(p_slug text, p_telefone text, p_nome text, p_itens text, p_total numeric)
returns void language plpgsql security definer set search_path = '' as $$
declare v_marca uuid; v_loja uuid; v_tel text := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');
begin
  select m.id, m.loja_id into v_marca, v_loja from public.marcas m where m.slug = p_slug and m.ativa;
  if v_loja is null or v_tel !~ '^[0-9]{10,13}$' then return; end if;
  if not exists (select 1 from public.turbo_automacoes a where a.loja_id = v_loja and a.tipo = 'carrinho' and a.ativo) then return; end if;
  insert into public.turbo_carrinhos (loja_id, marca_id, telefone, nome, itens, total, atualizado_em)
  values (v_loja, v_marca, v_tel, left(btrim(p_nome), 120), left(p_itens, 400), p_total, now())
  on conflict (loja_id, telefone) do update set nome = coalesce(excluded.nome, turbo_carrinhos.nome), itens = excluded.itens, total = excluded.total,
                                                atualizado_em = now(), marca_id = excluded.marca_id, convertido_em = null;
end;
$$;
grant execute on function public.turbo_carrinho(text, text, text, text, numeric) to anon, authenticated;

-- 7. Telas
create or replace function public.turbo_painel(p_loja uuid, p_dias integer default 30)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_lojas uuid[] := private.lojas_grupo(p_loja);
begin
  perform private.turbo_pode(p_loja);
  return jsonb_build_object(
    'fila', (select count(*) from public.turbo_envios where loja_id = p_loja and status = 'fila'),
    'enviados', (select count(*) from public.turbo_envios where loja_id = p_loja and status = 'enviado' and enviado_em > now() - make_interval(days => p_dias)),
    'conversoes', (select count(*) from public.turbo_envios where loja_id = p_loja and pedido_id is not null and enviado_em > now() - make_interval(days => p_dias)),
    'receita', (select coalesce(sum(valor), 0) from public.turbo_envios where loja_id = p_loja and pedido_id is not null and enviado_em > now() - make_interval(days => p_dias)),
    'automacoes', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'tipo', a.tipo, 'ativo', a.ativo, 'mensagem', a.mensagem, 'cupom', a.cupom, 'config', a.config,
                            'enviados', (select count(*) from public.turbo_envios e where e.automacao_id = a.id and e.status = 'enviado' and e.enviado_em > now() - make_interval(days => p_dias)),
                            'conversoes', (select count(*) from public.turbo_envios e where e.automacao_id = a.id and e.pedido_id is not null and e.enviado_em > now() - make_interval(days => p_dias)),
                            'receita', (select coalesce(sum(e.valor), 0) from public.turbo_envios e where e.automacao_id = a.id and e.pedido_id is not null and e.enviado_em > now() - make_interval(days => p_dias))))
                          from public.turbo_automacoes a where a.loja_id = p_loja), '[]'::jsonb),
    'campanhas', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'nome', c.nome, 'status', c.status, 'publico', c.publico, 'mensagem', c.mensagem, 'cupom', c.cupom,
                            'janela_dias', c.janela_dias, 'agendada_para', c.agendada_para, 'gerada_em', c.gerada_em,
                            'gerados', (select count(*) from public.turbo_envios e where e.campanha_id = c.id),
                            'enviados', (select count(*) from public.turbo_envios e where e.campanha_id = c.id and e.status = 'enviado'),
                            'conversoes', (select count(*) from public.turbo_envios e where e.campanha_id = c.id and e.pedido_id is not null),
                            'receita', (select coalesce(sum(e.valor), 0) from public.turbo_envios e where e.campanha_id = c.id and e.pedido_id is not null))
                            order by c.criado_em desc)
                          from public.turbo_campanhas c where c.loja_id = p_loja and c.criado_em > now() - interval '180 days'), '[]'::jsonb),
    'cupons', coalesce((select jsonb_agg(jsonb_build_object('codigo', cu.codigo, 'descricao', cu.descricao) order by cu.codigo)
                          from public.cupons cu where cu.loja_id = p_loja and cu.ativo and (cu.valido_ate is null or cu.valido_ate >= current_date)), '[]'::jsonb),
    'tem_avaliacao', exists (select 1 from public.integracoes i where i.loja_id = p_loja and i.tipo = 'google_avaliacao' and i.ativo));
end;
$$;
grant execute on function public.turbo_painel(uuid, integer) to authenticated;

create or replace function public.turbo_fila(p_loja uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.turbo_pode(p_loja);
  return coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'nome', e.nome, 'telefone', e.telefone, 'mensagem', e.mensagem, 'cupom', e.cupom, 'criado_em', e.criado_em,
                          'origem', coalesce(c.nome, a.tipo)) order by e.criado_em)
                     from (select * from public.turbo_envios where loja_id = p_loja and status = 'fila' order by criado_em limit 200) e
                     left join public.turbo_campanhas c on c.id = e.campanha_id left join public.turbo_automacoes a on a.id = e.automacao_id), '[]'::jsonb);
end;
$$;
grant execute on function public.turbo_fila(uuid) to authenticated;

create or replace function public.turbo_marcar(p_loja uuid, p_envio uuid, p_acao text)
returns void language plpgsql security definer set search_path = '' as $$
declare e public.turbo_envios;
begin
  perform private.turbo_pode(p_loja);
  select * into e from public.turbo_envios where id = p_envio and loja_id = p_loja;
  if not found then raise exception 'Envio não encontrado.' using errcode = 'no_data_found'; end if;
  if p_acao = 'enviado' then
    update public.turbo_envios set status = 'enviado', enviado_em = now(), enviado_por = auth.uid() where id = e.id and status = 'fila';
  elsif p_acao = 'pular' then
    update public.turbo_envios set status = 'pulado' where id = e.id and status = 'fila';
  elsif p_acao = 'sair' then
    -- cliente pediu para não receber mais (LGPD): vale para o grupo todo
    update public.clientes set marketing_optout_em = now() where grupo = private.grupo_da_loja(p_loja) and telefone = e.telefone;
    update public.turbo_envios set status = 'pulado' where telefone = e.telefone and status = 'fila' and loja_id = any (private.lojas_grupo(p_loja));
  else
    raise exception 'Ação inválida.' using errcode = 'check_violation';
  end if;
end;
$$;
grant execute on function public.turbo_marcar(uuid, uuid, text) to authenticated;

create or replace function public.turbo_salvar_automacao(p_loja uuid, p_tipo text, p_ativo boolean, p_mensagem text, p_cupom text, p_config jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.turbo_pode(p_loja);
  if p_cupom is not null and p_cupom <> '' and not exists (select 1 from public.cupons where loja_id = p_loja and codigo = upper(p_cupom)) then
    raise exception 'Cupom % não existe nesta loja (crie em Cupons).', upper(p_cupom) using errcode = 'check_violation';
  end if;
  insert into public.turbo_automacoes (loja_id, tipo, ativo, mensagem, cupom, config)
  values (p_loja, p_tipo, coalesce(p_ativo, false), btrim(p_mensagem), nullif(upper(btrim(coalesce(p_cupom, ''))), ''), coalesce(p_config, '{}'::jsonb))
  on conflict (loja_id, tipo) do update set ativo = excluded.ativo, mensagem = excluded.mensagem, cupom = excluded.cupom, config = excluded.config;
end;
$$;
grant execute on function public.turbo_salvar_automacao(uuid, text, boolean, text, text, jsonb) to authenticated;

create or replace function public.turbo_publico_contar(p_loja uuid, p_publico jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
begin
  perform private.turbo_pode(p_loja);
  return (select count(*) from private.turbo_publico(p_loja, p_publico));
end;
$$;
grant execute on function public.turbo_publico_contar(uuid, jsonb) to authenticated;

-- cria a campanha e gera a fila agora (p_quando null) ou agenda
create or replace function public.turbo_criar_campanha(p_loja uuid, p_nome text, p_publico jsonb, p_mensagem text, p_cupom text, p_janela integer, p_quando timestamptz)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform private.turbo_pode(p_loja);
  if p_cupom is not null and p_cupom <> '' and not exists (select 1 from public.cupons where loja_id = p_loja and codigo = upper(p_cupom)) then
    raise exception 'Cupom % não existe nesta loja (crie em Cupons).', upper(p_cupom) using errcode = 'check_violation';
  end if;
  insert into public.turbo_campanhas (loja_id, nome, publico, mensagem, cupom, janela_dias, agendada_para, status, criado_por)
  values (p_loja, btrim(p_nome), coalesce(p_publico, '{}'::jsonb), btrim(p_mensagem), nullif(upper(btrim(coalesce(p_cupom, ''))), ''),
          greatest(1, least(coalesce(p_janela, 5), 30)), p_quando, case when p_quando is not null and p_quando > now() then 'agendada' else 'rascunho' end, auth.uid())
  returning id into v_id;
  if p_quando is null or p_quando <= now() then
    return private.turbo_gerar_campanha(v_id);
  end if;
  return 0;
end;
$$;
grant execute on function public.turbo_criar_campanha(uuid, text, jsonb, text, text, integer, timestamptz) to authenticated;

create or replace function public.turbo_cancelar_campanha(p_loja uuid, p_campanha uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.turbo_pode(p_loja);
  update public.turbo_campanhas set status = 'cancelada' where id = p_campanha and loja_id = p_loja and status in ('rascunho', 'agendada');
  update public.turbo_envios set status = 'pulado' where campanha_id = p_campanha and status = 'fila';
end;
$$;
grant execute on function public.turbo_cancelar_campanha(uuid, uuid) to authenticated;

-- safras: clientes pelo mês do 1º pedido e quanto gastaram, mês a mês (LTV acumulado por cliente)
create or replace function public.turbo_safras(p_loja uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.turbo_pode(p_loja);
  return coalesce((
    with p as (
      select pe.cliente_id, pe.total, date_trunc('month', pe.criado_em) as mes
        from public.pedidos pe where pe.loja_id = any (private.lojas_grupo(p_loja)) and pe.status <> 'cancelado' and pe.cliente_id is not null),
    pri as (select cliente_id, min(mes) as safra from p group by cliente_id),
    base as (
      select pri.safra, (extract(year from age(p.mes, pri.safra)) * 12 + extract(month from age(p.mes, pri.safra)))::int as m, p.cliente_id, p.total
        from p join pri using (cliente_id) where pri.safra >= date_trunc('month', now()) - interval '11 months'),
    s as (select safra, count(distinct cliente_id) as clientes from base group by safra),
    k as (select s.safra, s.clientes, g.k from s cross join generate_series(0, 11) g(k)
           where s.safra + make_interval(months => g.k) <= date_trunc('month', now())),
    agg as (
      select k.safra, k.k, k.clientes,
             (select coalesce(sum(y.total), 0) from base y where y.safra = k.safra and y.m <= k.k) as acum,
             (select count(distinct y.cliente_id) from base y where y.safra = k.safra and y.m = k.k) as ativos
        from k)
    select jsonb_agg(jsonb_build_object('mes', to_char(s.safra, 'YYYY-MM'), 'clientes', s.clientes,
             'ltv', (select jsonb_agg(round(a.acum / a.clientes, 2) order by a.k) from agg a where a.safra = s.safra),
             'ativos', (select jsonb_agg(a.ativos order by a.k) from agg a where a.safra = s.safra)) order by s.safra desc) from s), '[]'::jsonb);
end;
$$;
grant execute on function public.turbo_safras(uuid) to authenticated;

-- perfil do cliente (o que ele gosta, quando e como pede)
create or replace function public.turbo_perfil(p_loja uuid, p_cliente uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.clientes; v_lojas uuid[] := private.lojas_grupo(p_loja);
begin
  if not (private.e_gestor(p_loja) or private.tem_permissao(p_loja, 'clientes') or private.tem_permissao(p_loja, 'marketing')) then
    raise exception 'Você não tem acesso aos clientes.' using errcode = 'insufficient_privilege';
  end if;
  select * into c from public.clientes where id = p_cliente and grupo = private.grupo_da_loja(p_loja);
  if not found then raise exception 'Cliente não encontrado.' using errcode = 'no_data_found'; end if;
  return (
    with p as (select * from public.pedidos where loja_id = any (v_lojas) and cliente_id = c.id and status <> 'cancelado')
    select jsonb_build_object(
      'pedidos', (select count(*) from p), 'gasto', (select coalesce(sum(total), 0) from p),
      'ticket', (select round(avg(total), 2) from p),
      'primeiro', (select min(criado_em) from p), 'ultimo', (select max(criado_em) from p),
      'intervalo_dias', (select case when count(*) > 1 then round(extract(epoch from max(criado_em) - min(criado_em)) / 86400 / (count(*) - 1)) end from p),
      'favoritos', coalesce((select jsonb_agg(x) from (select i.nome, sum(i.quantidade)::int as qtd from public.pedido_itens i join p on p.id = i.pedido_id group by i.nome order by 2 desc limit 3) x), '[]'::jsonb),
      'dia_semana', (select extract(isodow from criado_em at time zone 'America/Sao_Paulo')::int from p group by 1 order by count(*) desc limit 1),
      'hora', (select extract(hour from criado_em at time zone 'America/Sao_Paulo')::int from p group by 1 order by count(*) desc limit 1),
      'canal', (select origem::text from p group by 1 order by count(*) desc limit 1),
      'tipo', (select tipo::text from p group by 1 order by count(*) desc limit 1),
      'bairro', (select endereco ->> 'bairro' from p where endereco ? 'bairro' group by 1 order by count(*) desc limit 1),
      'optout', c.marketing_optout_em is not null,
      'mensagens', (select count(*) from public.turbo_envios e where e.cliente_id = c.id and e.status = 'enviado'),
      'compras_por_mensagem', (select count(*) from public.turbo_envios e where e.cliente_id = c.id and e.pedido_id is not null)));
end;
$$;
grant execute on function public.turbo_perfil(uuid, uuid) to authenticated;
