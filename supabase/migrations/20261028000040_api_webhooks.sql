-- RES · 0040 · API aberta, webhooks e conexão com IA (MCP) (D-043).
-- Chaves de API por loja (só leitura, por área), webhooks assinados (HMAC-SHA256) para pedidos
-- e as funções que a API REST (/api/v1) e o MCP (/api/mcp) chamam com a chave.
-- O envio dos webhooks usa pg_net + pg_cron quando existem (Supabase); sem eles, fica na fila.
-- Pode rodar de novo sem erro.

do $$ begin create extension if not exists pg_net; exception when others then raise notice 'pg_net indisponível: webhooks ficam na fila'; end $$;
do $$ begin create extension if not exists pg_cron; exception when others then raise notice 'pg_cron indisponível: sem reenvio automático'; end $$;

-- ---------------------------------------------------------------------------- chaves
create table if not exists public.api_chaves (
  id           uuid primary key default gen_random_uuid(),
  loja_id      uuid not null references public.lojas (id) on delete cascade,
  nome         text not null check (length(btrim(nome)) between 1 and 60),
  prefixo      text not null,
  hash         text not null unique,
  escopos      text[] not null check (escopos <@ array['pedidos', 'cardapio', 'clientes', 'estoque', 'vendas'] and cardinality(escopos) > 0),
  criado_por   uuid,
  criado_em    timestamptz not null default now(),
  ultimo_uso   timestamptz,
  usos         bigint not null default 0,
  revogada_em  timestamptz
);
create index if not exists api_chaves_loja_idx on public.api_chaves (loja_id);
alter table public.api_chaves enable row level security;

-- Confere a chave e a área; devolve a loja. Atualiza "último uso" (no máximo 1 vez por minuto).
create or replace function private.loja_da_chave(p_chave text, p_escopo text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  k public.api_chaves;
begin
  select * into k from public.api_chaves
   where hash = private.hash_token(p_chave) and revogada_em is null and length(coalesce(p_chave, '')) >= 40;
  if k.id is null then
    raise exception 'Chave de API inválida ou revogada.' using errcode = 'invalid_authorization_specification';
  end if;
  if not (p_escopo = any (k.escopos)) then
    raise exception 'Esta chave não tem acesso a "%".', p_escopo using errcode = 'insufficient_privilege';
  end if;
  if k.ultimo_uso is null or k.ultimo_uso < now() - interval '1 minute' then
    update public.api_chaves set ultimo_uso = now(), usos = usos + 1 where id = k.id;
  end if;
  return k.loja_id;
end;
$$;

-- Período em turnos (05:00 → 05:00) no fuso da loja. Padrão: últimos 7 dias. Máximo 92 dias.
create or replace function private.periodo_api(p_loja uuid, p_de text, p_ate text, out ini timestamptz, out fim timestamptz)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_fuso text;
  v_hoje date;
begin
  select fuso_horario into v_fuso from public.lojas where id = p_loja;
  v_hoje := ((now() at time zone v_fuso) - interval '5 hours')::date;
  ini := (coalesce(nullif(p_de, '')::date, v_hoje - 6) + time '05:00') at time zone v_fuso;
  fim := (coalesce(nullif(p_ate, '')::date, v_hoje) + 1 + time '05:00') at time zone v_fuso;
  if fim <= ini or fim - ini > interval '93 days' then
    raise exception 'Período inválido (até 92 dias).' using errcode = 'check_violation';
  end if;
end;
$$;

-- Pedido em JSON (formato da API e dos webhooks).
create or replace function private.pedido_api(p public.pedidos)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'numero', p.numero, 'status', p.status, 'tipo', p.tipo, 'origem', p.origem,
    'loja', (select nome from public.lojas where id = p.loja_id), 'cardapio', (select nome from public.marcas where id = p.marca_id),
    'cliente', jsonb_build_object('nome', p.cliente_nome, 'telefone', p.cliente_telefone),
    'endereco', p.endereco,
    'subtotal', p.subtotal, 'taxa_entrega', p.taxa_entrega, 'desconto', p.desconto, 'total', p.total,
    'pagamento', p.pagamento, 'pago', p.pago_em is not null,
    'criado_em', p.criado_em, 'agendado_para', p.agendado_para, 'concluido_em', p.concluido_em, 'cancelado_em', p.cancelado_em,
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
               'nome', i.nome, 'quantidade', i.quantidade, 'preco_unitario', i.preco_unitario, 'total', i.total, 'observacao', i.observacao,
               'opcoes', coalesce((select jsonb_agg(jsonb_build_object('grupo', o.grupo_nome, 'nome', o.nome, 'quantidade', o.quantidade, 'preco', o.preco, 'fracao', o.fracao)
                                                    order by o.ordem)
                                     from public.pedido_item_opcoes o where o.item_id = i.id), '[]'::jsonb))
             order by i.ordem)
        from public.pedido_itens i where i.pedido_id = p.id), '[]'::jsonb));
$$;

-- ---------------------------------------------------------------------------- funções da API (chamadas com a chave)
create or replace function public.api_pedidos(p_chave text, p_filtro jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid := private.loja_da_chave(p_chave, 'pedidos');
  v_ini timestamptz;
  v_fim timestamptz;
  v_lim integer := least(greatest(coalesce((p_filtro ->> 'limite')::int, 50), 1), 200);
  v_pag integer := greatest(coalesce((p_filtro ->> 'pagina')::int, 1), 1);
begin
  select ini, fim into v_ini, v_fim from private.periodo_api(v_loja, p_filtro ->> 'de', p_filtro ->> 'ate');
  return jsonb_build_object(
    'pagina', v_pag, 'limite', v_lim,
    'total', (select count(*) from public.pedidos p where p.loja_id = v_loja and p.criado_em >= v_ini and p.criado_em < v_fim
                and (p_filtro ->> 'status' is null or p.status::text = p_filtro ->> 'status')),
    'pedidos', coalesce((select jsonb_agg(private.pedido_api(x) order by x.criado_em desc) from (
        select * from public.pedidos p where p.loja_id = v_loja and p.criado_em >= v_ini and p.criado_em < v_fim
           and (p_filtro ->> 'status' is null or p.status::text = p_filtro ->> 'status')
         order by p.criado_em desc limit v_lim offset (v_pag - 1) * v_lim) x), '[]'::jsonb));
end;
$$;

create or replace function public.api_pedido(p_chave text, p_ref text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid := private.loja_da_chave(p_chave, 'pedidos');
  p public.pedidos;
begin
  if p_ref ~ '^[0-9a-fA-F-]{36}$' then
    select * into p from public.pedidos where id = p_ref::uuid and loja_id = v_loja;
  elsif p_ref ~ '^[0-9]{1,9}$' then
    select * into p from public.pedidos where numero = p_ref::int and loja_id = v_loja order by criado_em desc limit 1;
  end if;
  if p.id is null then
    raise exception 'Pedido não encontrado.' using errcode = 'no_data_found';
  end if;
  return private.pedido_api(p);
end;
$$;

create or replace function public.api_vendas(p_chave text, p_de text, p_ate text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid := private.loja_da_chave(p_chave, 'vendas');
  v_ini timestamptz;
  v_fim timestamptz;
  v_fuso text;
begin
  select ini, fim into v_ini, v_fim from private.periodo_api(v_loja, p_de, p_ate);
  select fuso_horario into v_fuso from public.lojas where id = v_loja;
  return (
    with b as (
      select p.*, ((p.criado_em at time zone v_fuso) - interval '5 hours')::date as dia
        from public.pedidos p where p.loja_id = v_loja and p.criado_em >= v_ini and p.criado_em < v_fim
    )
    select jsonb_build_object(
      'loja', (select nome from public.lojas where id = v_loja),
      'de', (v_ini at time zone v_fuso)::date, 'ate', ((v_fim at time zone v_fuso) - interval '1 day')::date,
      'pedidos', (select count(*) from b where status <> 'cancelado'),
      'faturamento', (select coalesce(sum(total), 0) from b where status <> 'cancelado'),
      'ticket_medio', (select round(avg(total), 2) from b where status <> 'cancelado'),
      'cancelados', (select count(*) from b where status = 'cancelado'),
      'valor_cancelado', (select coalesce(sum(total), 0) from b where status = 'cancelado'),
      'por_tipo', coalesce((select jsonb_object_agg(tipo, jsonb_build_object('pedidos', n, 'faturamento', v))
                              from (select tipo::text, count(*) as n, sum(total) as v from b where status <> 'cancelado' group by tipo) t), '{}'::jsonb),
      'por_origem', coalesce((select jsonb_object_agg(origem, jsonb_build_object('pedidos', n, 'faturamento', v))
                                from (select origem::text, count(*) as n, sum(total) as v from b where status <> 'cancelado' group by origem) t), '{}'::jsonb),
      'por_dia', coalesce((select jsonb_agg(jsonb_build_object('dia', dia, 'pedidos', n, 'faturamento', v) order by dia)
                             from (select dia, count(*) as n, sum(total) as v from b where status <> 'cancelado' group by dia) t), '[]'::jsonb),
      'mais_vendidos', coalesce((select jsonb_agg(jsonb_build_object('produto', nome, 'quantidade', q, 'faturamento', v) order by q desc)
                                   from (select i.nome, sum(i.quantidade) as q, sum(i.total) as v
                                           from public.pedido_itens i join b on b.id = i.pedido_id
                                          where b.status <> 'cancelado' group by i.nome order by sum(i.quantidade) desc limit 20) t), '[]'::jsonb)));
end;
$$;

create or replace function public.api_cardapio(p_chave text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid := private.loja_da_chave(p_chave, 'cardapio');
begin
  return jsonb_build_object(
    'categorias', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome, 'produtos', coalesce((
               select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'descricao', p.descricao, 'preco', p.preco, 'imagem_url', p.imagem_url,
                                                   'codigo', p.codigo, 'combo', p.combo,
                                                   'grupos', coalesce((select jsonb_agg(jsonb_build_object('nome', g.nome, 'min', g.min_qtd, 'max', g.max_qtd, 'pizza', g.pizza,
                                                                                                           'opcoes', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'nome', coalesce(o.nome, c.nome, pp.nome), 'preco', o.preco) order by o.ordem), '[]'::jsonb)
                                                                                                                        from public.opcoes o left join public.complementos c on c.id = o.complemento_id
                                                                                                                        left join public.produtos pp on pp.id = o.produto_id
                                                                                                                       where o.grupo_id = g.id and o.ativo))
                                                                                       order by pg.ordem)
                                                                        from public.produto_grupos pg join public.grupos_opcoes g on g.id = pg.grupo_id
                                                                       where pg.produto_id = p.id and g.ativo), '[]'::jsonb))
                                order by p.ordem, p.nome)
                 from public.produtos p where p.loja_id = v_loja and p.setor_id = s.id), '[]'::jsonb))
             order by s.ordem, s.nome)
        from public.setores s where s.loja_id = v_loja), '[]'::jsonb));
end;
$$;

create or replace function public.api_clientes(p_chave text, p_segmento text, p_limite integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid := private.loja_da_chave(p_chave, 'clientes');
begin
  return jsonb_build_object(
    'segmentos', coalesce((select jsonb_object_agg(coalesce(segmento, 'sem_pedido'), n) from (
                   select r.segmento, count(*) as n from private.clientes_rfv(v_loja) r group by r.segmento) t), '{}'::jsonb),
    'clientes', coalesce((select jsonb_agg(jsonb_build_object('nome', c.nome, 'telefone', '+55' || c.telefone, 'pedidos', r.pedidos, 'gasto', r.gasto,
                                                              'ultimo_pedido', r.ultimo, 'dias_sem_pedir', r.dias, 'segmento', r.segmento)
                                           order by r.gasto desc nulls last)
                            from (select * from private.clientes_rfv(v_loja) r
                                   where p_segmento is null or r.segmento = p_segmento
                                   order by r.gasto desc nulls last limit least(greatest(coalesce(p_limite, 100), 1), 1000)) r
                            join public.clientes c on c.id = r.id), '[]'::jsonb));
end;
$$;

create or replace function public.api_estoque(p_chave text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid := private.loja_da_chave(p_chave, 'estoque');
  v_est uuid := private.estoque_da_loja(v_loja);
begin
  return jsonb_build_object(
    'valor_estoque', (select round(coalesce(sum(greatest(i.saldo, 0) * i.custo_medio), 0), 2) from public.insumos i where i.estoque = v_est and i.ativo),
    'insumos', coalesce((select jsonb_agg(jsonb_build_object('nome', i.nome, 'unidade', i.unidade, 'categoria', i.categoria, 'saldo', i.saldo, 'minimo', i.minimo,
                                                             'custo_medio', round(i.custo_medio, 4),
                                                             'situacao', case when not i.controla then 'sem_controle' when i.saldo <= 0 then 'acabou'
                                                                              when i.minimo is not null and i.saldo <= i.minimo then 'baixo' else 'regular' end)
                                          order by lower(i.nome))
                           from public.insumos i where i.estoque = v_est and i.ativo), '[]'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------- webhooks
create table if not exists public.webhooks (
  id          uuid primary key default gen_random_uuid(),
  loja_id     uuid not null references public.lojas (id) on delete cascade,
  url         text not null check (url ~ '^https://[^\s/$.?#][^\s]*$' and length(url) <= 500),
  eventos     text[] not null check (eventos <@ array['pedido.criado', 'pedido.status', 'pedido.cancelado'] and cardinality(eventos) > 0),
  segredo     text not null,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);
create index if not exists webhooks_loja_idx on public.webhooks (loja_id);
alter table public.webhooks enable row level security;

create table if not exists public.webhook_envios (
  id          bigint generated always as identity primary key,
  webhook_id  uuid not null references public.webhooks (id) on delete cascade,
  evento      text not null,
  corpo       jsonb not null,
  status      text not null default 'pendente' check (status in ('pendente', 'enviando', 'ok', 'erro', 'desistiu')),
  tentativas  integer not null default 0,
  pedido_rede bigint,            -- id do pedido no pg_net
  resposta    integer,
  erro        text,
  proxima_em  timestamptz not null default now(),
  criado_em   timestamptz not null default now(),
  enviado_em  timestamptz
);
create index if not exists webhook_envios_fila_idx on public.webhook_envios (status, proxima_em) where status in ('pendente', 'enviando', 'erro');
create index if not exists webhook_envios_hook_idx on public.webhook_envios (webhook_id, criado_em desc);
alter table public.webhook_envios enable row level security;

-- HMAC-SHA256 (RFC 2104) só com sha256() do Postgres.
create or replace function private.hmac_sha256(p_chave text, p_msg text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  k bytea := convert_to(p_chave, 'UTF8');
  ipad bytea;
  opad bytea;
  i integer;
begin
  if length(k) > 64 then
    k := sha256(k);
  end if;
  k := k || decode(repeat('00', 64 - length(k)), 'hex');
  ipad := k;
  opad := k;
  for i in 0..63 loop
    ipad := set_byte(ipad, i, get_byte(k, i) # 54);
    opad := set_byte(opad, i, get_byte(k, i) # 92);
  end loop;
  return encode(sha256(opad || sha256(ipad || convert_to(p_msg, 'UTF8'))), 'hex');
end;
$$;

-- Manda um envio pela rede (pg_net). Sem pg_net, fica pendente.
create or replace function private.disparar_webhook(p_envio bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.webhook_envios;
  w public.webhooks;
  v_id bigint;
begin
  if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    return;
  end if;
  select * into e from public.webhook_envios where id = p_envio for update;
  select * into w from public.webhooks where id = e.webhook_id;
  if w.id is null or not w.ativo then
    update public.webhook_envios set status = 'desistiu', erro = 'webhook desligado' where id = p_envio;
    return;
  end if;
  execute 'select net.http_post(url := $1, body := $2, params := ''{}''::jsonb, headers := $3, timeout_milliseconds := 8000)'
     into v_id
    using w.url, e.corpo,
          jsonb_build_object('Content-Type', 'application/json', 'User-Agent', 'RES-Webhooks/1', 'X-RES-Evento', e.evento,
                             'X-RES-Envio', e.id::text, 'X-RES-Assinatura', 'sha256=' || private.hmac_sha256(w.segredo, e.corpo::text));
  update public.webhook_envios set status = 'enviando', pedido_rede = v_id, tentativas = tentativas + 1, enviado_em = now() where id = p_envio;
end;
$$;

-- Confere respostas e reenvia o que falhou (1, 2, 4, 8, 16 min; depois desiste). Roda a cada minuto (pg_cron).
create or replace function private.processar_webhooks()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  n integer := 0;
begin
  if to_regclass('net._http_response') is not null then
    for r in execute
      'select e.id, e.tentativas, h.status_code, h.error_msg, h.timed_out
         from public.webhook_envios e join net._http_response h on h.id = e.pedido_rede
        where e.status = ''enviando'''
    loop
      if r.status_code between 200 and 299 then
        update public.webhook_envios set status = 'ok', resposta = r.status_code, erro = null where id = r.id;
      else
        update public.webhook_envios
           set status = case when r.tentativas >= 5 then 'desistiu' else 'erro' end, resposta = r.status_code,
               erro = left(coalesce(r.error_msg, case when r.timed_out then 'tempo esgotado' else 'HTTP ' || r.status_code end), 300),
               proxima_em = now() + make_interval(mins => power(2, r.tentativas - 1)::int)
         where id = r.id;
      end if;
    end loop;
    -- sem resposta depois de 10 min: conta como falha
    update public.webhook_envios set status = case when tentativas >= 5 then 'desistiu' else 'erro' end, erro = 'sem resposta', proxima_em = now()
     where status = 'enviando' and enviado_em < now() - interval '10 minutes';
  end if;
  for r in select id from public.webhook_envios where status in ('pendente', 'erro') and proxima_em <= now() order by id limit 200 loop
    perform private.disparar_webhook(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Pedido novo / mudou de status → fila dos webhooks da loja.
create or replace function private.webhooks_pedido()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_evento text;
  w record;
  v_envio bigint;
begin
  if tg_op = 'INSERT' then
    v_evento := 'pedido.criado';
  elsif new.status is distinct from old.status then
    v_evento := case when new.status = 'cancelado' then 'pedido.cancelado' else 'pedido.status' end;
  else
    return null;
  end if;
  for w in select * from public.webhooks where loja_id = new.loja_id and ativo and v_evento = any (eventos) loop
    insert into public.webhook_envios (webhook_id, evento, corpo)
    values (w.id, v_evento, jsonb_build_object('evento', v_evento, 'enviado_em', now(), 'status_anterior', case when tg_op = 'UPDATE' then old.status end,
                                               'pedido', private.pedido_api(new)))
    returning id into v_envio;
    perform private.disparar_webhook(v_envio);
  end loop;
  return null;
end;
$$;
drop trigger if exists pedidos_webhooks on public.pedidos;
create trigger pedidos_webhooks after insert or update of status on public.pedidos for each row execute function private.webhooks_pedido();

do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('res-webhooks', '* * * * *', 'select private.processar_webhooks()');
  end if;
exception when others then raise notice 'agendamento do reenvio não criado: %', sqlerrm;
end $$;

-- ---------------------------------------------------------------------------- painel (gestor)
create or replace function public.api_painel(p_loja uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só gestores mexem na API.' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'envio_automatico', to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is not null,
    'chaves', coalesce((select jsonb_agg(jsonb_build_object('id', k.id, 'nome', k.nome, 'prefixo', k.prefixo, 'escopos', k.escopos,
                                                            'criado_em', k.criado_em, 'ultimo_uso', k.ultimo_uso, 'usos', k.usos) order by k.criado_em desc)
                          from public.api_chaves k where k.loja_id = p_loja and k.revogada_em is null), '[]'::jsonb),
    'webhooks', coalesce((select jsonb_agg(jsonb_build_object(
                                   'id', w.id, 'url', w.url, 'eventos', w.eventos, 'ativo', w.ativo, 'segredo_fim', right(w.segredo, 4),
                                   'envios', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'evento', e.evento, 'status', e.status, 'resposta', e.resposta,
                                                                                          'erro', e.erro, 'tentativas', e.tentativas, 'em', e.criado_em,
                                                                                          'numero', e.corpo #>> '{pedido,numero}') order by e.id desc)
                                                         from (select * from public.webhook_envios x where x.webhook_id = w.id order by x.id desc limit 15) e), '[]'::jsonb))
                                 order by w.criado_em)
                            from public.webhooks w where w.loja_id = p_loja), '[]'::jsonb));
end;
$$;

-- Cria a chave e devolve o segredo UMA vez (só o hash fica guardado).
create or replace function public.criar_chave_api(p_loja uuid, p_nome text, p_escopos text[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chave text := 'res_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só gestores mexem na API.' using errcode = 'insufficient_privilege';
  end if;
  if (select count(*) from public.api_chaves where loja_id = p_loja and revogada_em is null) >= 10 then
    raise exception 'Limite de 10 chaves ativas por loja. Revogue uma antes.' using errcode = 'check_violation';
  end if;
  insert into public.api_chaves (loja_id, nome, prefixo, hash, escopos, criado_por)
  values (p_loja, btrim(coalesce(p_nome, '')), left(v_chave, 12), private.hash_token(v_chave), p_escopos, auth.uid());
  return jsonb_build_object('chave', v_chave);
end;
$$;

create or replace function public.revogar_chave_api(p_loja uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só gestores mexem na API.' using errcode = 'insufficient_privilege';
  end if;
  update public.api_chaves set revogada_em = now() where id = p_id and loja_id = p_loja and revogada_em is null;
end;
$$;

create or replace function public.salvar_webhook(p_loja uuid, p_id uuid, p_url text, p_eventos text[], p_ativo boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_segredo text;
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só gestores mexem na API.' using errcode = 'insufficient_privilege';
  end if;
  if btrim(coalesce(p_url, '')) !~ '^https://[^\s/$.?#][^\s]*$' then
    raise exception 'O endereço precisa começar com https://' using errcode = 'check_violation';
  end if;
  if p_id is null then
    if (select count(*) from public.webhooks where loja_id = p_loja) >= 5 then
      raise exception 'Limite de 5 webhooks por loja.' using errcode = 'check_violation';
    end if;
    v_segredo := 'whsec_' || replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    insert into public.webhooks (loja_id, url, eventos, segredo, ativo)
    values (p_loja, btrim(p_url), p_eventos, v_segredo, coalesce(p_ativo, true))
    returning id into v_id;
    return jsonb_build_object('id', v_id, 'segredo', v_segredo);
  end if;
  update public.webhooks set url = btrim(p_url), eventos = p_eventos, ativo = coalesce(p_ativo, ativo)
   where id = p_id and loja_id = p_loja returning id into v_id;
  if v_id is null then
    raise exception 'Webhook não encontrado.' using errcode = 'no_data_found';
  end if;
  return jsonb_build_object('id', v_id);
end;
$$;

create or replace function public.excluir_webhook(p_loja uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só gestores mexem na API.' using errcode = 'insufficient_privilege';
  end if;
  delete from public.webhooks where id = p_id and loja_id = p_loja;
end;
$$;

-- Manda um evento de teste (pedido de exemplo) para conferir o endereço.
create or replace function public.testar_webhook(p_loja uuid, p_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  w public.webhooks;
  v_envio bigint;
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só gestores mexem na API.' using errcode = 'insufficient_privilege';
  end if;
  select * into w from public.webhooks where id = p_id and loja_id = p_loja;
  if w.id is null then
    raise exception 'Webhook não encontrado.' using errcode = 'no_data_found';
  end if;
  insert into public.webhook_envios (webhook_id, evento, corpo)
  values (w.id, 'teste', jsonb_build_object('evento', 'teste', 'enviado_em', now(), 'mensagem', 'Teste do RES: se chegou, está tudo certo.',
                                            'pedido', jsonb_build_object('numero', 0, 'status', 'novo', 'total', 0)))
  returning id into v_envio;
  perform private.disparar_webhook(v_envio);
  return v_envio;
end;
$$;

grant execute on function public.api_painel(uuid), public.criar_chave_api(uuid, text, text[]), public.revogar_chave_api(uuid, uuid),
  public.salvar_webhook(uuid, uuid, text, text[], boolean), public.excluir_webhook(uuid, uuid), public.testar_webhook(uuid, uuid) to authenticated;
revoke execute on function public.api_painel(uuid), public.criar_chave_api(uuid, text, text[]), public.revogar_chave_api(uuid, uuid),
  public.salvar_webhook(uuid, uuid, text, text[], boolean), public.excluir_webhook(uuid, uuid), public.testar_webhook(uuid, uuid) from anon, public;
-- a API chama com a chave pública (anon) + a chave da loja; quem confere é private.loja_da_chave
grant execute on function public.api_pedidos(text, jsonb), public.api_pedido(text, text), public.api_vendas(text, text, text),
  public.api_cardapio(text), public.api_clientes(text, text, integer), public.api_estoque(text) to anon, authenticated;

-- Quem é a chave (para a IA saber o que pode perguntar).
create or replace function public.api_quem(p_chave text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object('loja', l.nome, 'cidade', l.cidade, 'fuso', l.fuso_horario, 'escopos', k.escopos, 'chave', k.nome)
    from public.api_chaves k join public.lojas l on l.id = k.loja_id
   where k.hash = private.hash_token(p_chave) and k.revogada_em is null and length(coalesce(p_chave, '')) >= 40;
$$;
grant execute on function public.api_quem(text) to anon, authenticated;
