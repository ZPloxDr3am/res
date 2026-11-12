-- D-097: RES pronto para a API oficial do WhatsApp (WhatsApp Cloud API, Meta).
-- Cada loja liga o seu número (ID do número, ID da conta WhatsApp Business e token permanente de usuário
-- do sistema). O token fica só no banco, em private (ninguém lê pela tela; só o servidor, com a chave de
-- serviço). Modelos de mensagem (templates) são criados no RES e mandados para a Meta aprovar.
-- Com a loja conectada e o "envio automático" ligado, a fila do Turbo-Vendas sai sozinha (a cada 5 min,
-- ou no botão "Enviar tudo"); respostas "SAIR" tiram o cliente do marketing; entrega e leitura voltam pelo
-- webhook. Sem conexão, tudo continua como antes (fila manual). Pode rodar de novo.

-- 1. Conexão por loja (token só aqui)
create table if not exists private.whatsapp_contas (
  loja_id         uuid primary key references public.lojas (id) on delete cascade,
  phone_number_id text not null check (phone_number_id ~ '^[0-9]{6,30}$'),
  waba_id         text not null check (waba_id ~ '^[0-9]{6,30}$'),
  token           text not null check (length(token) between 20 and 1000),
  numero          text,
  nome_verificado text,
  qualidade       text,
  automatico      boolean not null default false,
  conectado_em    timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  unique (phone_number_id)
);
revoke all on private.whatsapp_contas from public, anon, authenticated;

-- 2. Modelos (templates) da Meta
create table if not exists public.whatsapp_modelos (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references public.lojas (id) on delete cascade,
  nome          text not null check (nome ~ '^[a-z0-9_]{3,100}$'),
  idioma        text not null default 'pt_BR',
  categoria     text not null default 'MARKETING' check (categoria in ('MARKETING', 'UTILITY')),
  corpo         text not null check (length(corpo) between 5 and 1000),   -- texto do RES, com {nome} {cupom}…
  variaveis     text[] not null default '{}',                                -- ordem dos {{1}}, {{2}}… na Meta
  status        text not null default 'rascunho' check (status in ('rascunho', 'pendente', 'aprovado', 'rejeitado', 'pausado', 'desativado')),
  motivo        text,
  meta_id       text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (loja_id, nome)
);
alter table public.whatsapp_modelos enable row level security;
revoke all on public.whatsapp_modelos from anon, authenticated;

alter table public.turbo_automacoes add column if not exists modelo_id uuid references public.whatsapp_modelos (id) on delete set null;
alter table public.turbo_campanhas add column if not exists modelo_id uuid references public.whatsapp_modelos (id) on delete set null;
alter table public.turbo_envios add column if not exists modelo_id uuid references public.whatsapp_modelos (id) on delete set null;
alter table public.turbo_envios add column if not exists variaveis jsonb;
alter table public.turbo_envios add column if not exists wa_id text;
alter table public.turbo_envios add column if not exists entregue_em timestamptz;
alter table public.turbo_envios add column if not exists lido_em timestamptz;
alter table public.turbo_envios add column if not exists erro text;
alter table public.turbo_envios add column if not exists tentativas integer not null default 0;
alter table public.turbo_envios drop constraint if exists turbo_envios_status_check;
alter table public.turbo_envios add constraint turbo_envios_status_check check (status in ('fila', 'enviando', 'enviado', 'pulado', 'erro'));
create unique index if not exists turbo_envios_wa on public.turbo_envios (wa_id) where wa_id is not null;

-- 3. Variáveis de cada envio (para preencher o modelo) e modelo escolhido, sem mudar o robô do Turbo
create or replace function private.turbo_variaveis(p_loja uuid, p_cliente uuid, p_nome text, p_cupom text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_loja text; v_slug text; v_fav text; v_av text; v_base text := 'https://res-iqzs.vercel.app';
begin
  select l.nome into v_loja from public.lojas l where l.id = p_loja;
  select m.slug into v_slug from public.marcas m where m.loja_id = p_loja and m.ativa and not m.evento order by m.criado_em limit 1;
  select i.nome into v_fav from public.pedido_itens i join public.pedidos p on p.id = i.pedido_id
   where p.cliente_id = p_cliente and p.status <> 'cancelado' group by i.nome order by sum(i.quantidade) desc limit 1;
  select a.config ->> 'url' into v_av from public.integracoes a where a.loja_id = p_loja and a.tipo = 'google_avaliacao' and a.ativo;
  return jsonb_build_object(
    'nome', coalesce(nullif(split_part(btrim(coalesce(p_nome, '')), ' ', 1), ''), 'cliente'),
    'loja', coalesce(v_loja, ''),
    'cupom', coalesce(p_cupom, ''),
    'link', case when v_slug is null then v_base else v_base || '/c/' || v_slug end,
    'favorito', coalesce(v_fav, 'seu pedido de sempre'),
    'avaliacao', coalesce(v_av, ''));
end;
$$;

create or replace function private.turbo_texto(p_loja uuid, p_cliente uuid, p_nome text, p_msg text, p_cupom text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare v jsonb := private.turbo_variaveis(p_loja, p_cliente, p_nome, p_cupom); k text; t text := p_msg;
begin
  for k in select jsonb_object_keys(v) loop
    t := replace(t, '{' || k || '}', v ->> k);
  end loop;
  return t;
end;
$$;

create or replace function private.turbo_envio_prepara()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.variaveis := coalesce(new.variaveis, private.turbo_variaveis(new.loja_id, new.cliente_id, new.nome, new.cupom));
  if new.modelo_id is null then
    new.modelo_id := coalesce((select a.modelo_id from public.turbo_automacoes a where a.id = new.automacao_id),
                              (select c.modelo_id from public.turbo_campanhas c where c.id = new.campanha_id));
  end if;
  return new;
end;
$$;
drop trigger if exists turbo_envios_prepara on public.turbo_envios;
create trigger turbo_envios_prepara before insert on public.turbo_envios for each row execute function private.turbo_envio_prepara();

-- 4. Tela (dono, gerente ou marketing, com Turbo-Vendas no plano)
create or replace function public.whatsapp_status(p_loja uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare w private.whatsapp_contas;
begin
  perform private.turbo_pode(p_loja);
  select * into w from private.whatsapp_contas where loja_id = p_loja;
  return jsonb_build_object(
    'conectado', w.loja_id is not null, 'numero', w.numero, 'nome', w.nome_verificado, 'qualidade', w.qualidade,
    'automatico', coalesce(w.automatico, false), 'conectado_em', w.conectado_em,
    'phone_number_id', w.phone_number_id, 'waba_id', w.waba_id,
    'modelos', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'nome', m.nome, 'categoria', m.categoria, 'corpo', m.corpo, 'variaveis', m.variaveis,
                                   'status', m.status, 'motivo', m.motivo, 'atualizado_em', m.atualizado_em) order by m.criado_em desc)
                          from public.whatsapp_modelos m where m.loja_id = p_loja), '[]'::jsonb),
    'falhas_24h', (select count(*) from public.turbo_envios e where e.loja_id = p_loja and e.status = 'erro' and e.criado_em > now() - interval '1 day'));
end;
$$;
grant execute on function public.whatsapp_status(uuid) to authenticated;

-- conectar: o servidor confere o token na Meta antes e manda número/nome; só dono ou gerente
create or replace function public.whatsapp_conectar(p_loja uuid, p_phone_id text, p_waba_id text, p_token text, p_numero text, p_nome text, p_qualidade text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.turbo_pode(p_loja);
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente conectam o WhatsApp.' using errcode = 'insufficient_privilege';
  end if;
  insert into private.whatsapp_contas (loja_id, phone_number_id, waba_id, token, numero, nome_verificado, qualidade)
  values (p_loja, btrim(p_phone_id), btrim(p_waba_id), btrim(p_token), p_numero, p_nome, p_qualidade)
  on conflict (loja_id) do update set phone_number_id = excluded.phone_number_id, waba_id = excluded.waba_id, token = excluded.token,
        numero = excluded.numero, nome_verificado = excluded.nome_verificado, qualidade = excluded.qualidade, atualizado_em = now();
exception when unique_violation then
  raise exception 'Este número já está conectado em outra loja.' using errcode = 'unique_violation';
end;
$$;
grant execute on function public.whatsapp_conectar(uuid, text, text, text, text, text, text) to authenticated;

create or replace function public.whatsapp_desconectar(p_loja uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.turbo_pode(p_loja);
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente.' using errcode = 'insufficient_privilege';
  end if;
  delete from private.whatsapp_contas where loja_id = p_loja;
  update public.turbo_envios set status = 'fila' where loja_id = p_loja and status = 'enviando';
end;
$$;
grant execute on function public.whatsapp_desconectar(uuid) to authenticated;

create or replace function public.whatsapp_definir_automatico(p_loja uuid, p_ligado boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.turbo_pode(p_loja);
  update private.whatsapp_contas set automatico = coalesce(p_ligado, false), atualizado_em = now() where loja_id = p_loja;
  if not found then raise exception 'Conecte o WhatsApp primeiro.' using errcode = 'no_data_found'; end if;
end;
$$;
grant execute on function public.whatsapp_definir_automatico(uuid, boolean) to authenticated;

-- modelo: {nome} {cupom}… viram {{1}} {{2}}… na ordem em que aparecem
create or replace function public.whatsapp_salvar_modelo(p_loja uuid, p_nome text, p_categoria text, p_corpo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_vars text[]; v_m text; v_id uuid; v_nome text := lower(regexp_replace(btrim(coalesce(p_nome, '')), '[^a-zA-Z0-9]+', '_', 'g'));
begin
  perform private.turbo_pode(p_loja);
  v_vars := '{}';
  for v_m in select m[1] from regexp_matches(p_corpo, '\{(nome|loja|cupom|link|favorito|avaliacao)\}', 'g') as t(m) loop
    if not (v_m = any (v_vars)) then v_vars := v_vars || v_m; end if;
  end loop;
  insert into public.whatsapp_modelos (loja_id, nome, categoria, corpo, variaveis)
  values (p_loja, v_nome, coalesce(p_categoria, 'MARKETING'), btrim(p_corpo), v_vars)
  on conflict (loja_id, nome) do update set corpo = excluded.corpo, categoria = excluded.categoria, variaveis = excluded.variaveis,
        status = case when whatsapp_modelos.status in ('rascunho', 'rejeitado') then 'rascunho' else whatsapp_modelos.status end, atualizado_em = now()
  where whatsapp_modelos.status in ('rascunho', 'rejeitado')
  returning id into v_id;
  if v_id is null then
    raise exception 'Modelo já enviado para a Meta: crie outro com nome diferente para mudar o texto.' using errcode = 'check_violation';
  end if;
  return v_id;
end;
$$;
grant execute on function public.whatsapp_salvar_modelo(uuid, text, text, text) to authenticated;

create or replace function public.whatsapp_apagar_modelo(p_loja uuid, p_modelo uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.turbo_pode(p_loja);
  delete from public.whatsapp_modelos where id = p_modelo and loja_id = p_loja;
end;
$$;
grant execute on function public.whatsapp_apagar_modelo(uuid, uuid) to authenticated;

-- qual modelo cada automação/campanha usa no envio automático
create or replace function public.turbo_definir_modelo(p_loja uuid, p_tipo text, p_id uuid, p_modelo uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.turbo_pode(p_loja);
  if p_modelo is not null and not exists (select 1 from public.whatsapp_modelos where id = p_modelo and loja_id = p_loja) then
    raise exception 'Modelo não encontrado.' using errcode = 'no_data_found';
  end if;
  if p_tipo = 'automacao' then
    update public.turbo_automacoes set modelo_id = p_modelo where id = p_id and loja_id = p_loja;
  elsif p_tipo = 'campanha' then
    update public.turbo_campanhas set modelo_id = p_modelo where id = p_id and loja_id = p_loja;
    update public.turbo_envios set modelo_id = p_modelo where campanha_id = p_id and status = 'fila';
  end if;
end;
$$;
grant execute on function public.turbo_definir_modelo(uuid, text, uuid, uuid) to authenticated;

-- 5. Servidor (chave de serviço): credenciais, pegar a fila, registrar resultado, webhook
create or replace function public.whatsapp_credenciais(p_loja uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('phone_number_id', w.phone_number_id, 'waba_id', w.waba_id, 'token', w.token, 'automatico', w.automatico)
    from private.whatsapp_contas w where w.loja_id = p_loja;
$$;

-- pega até N envios da fila com modelo aprovado e marca "enviando" (não manda duas vezes)
create or replace function public.whatsapp_pegar_envios(p_loja uuid, p_limite integer default 50)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  with alvo as (
    select e.id from public.turbo_envios e join public.whatsapp_modelos m on m.id = e.modelo_id and m.status = 'aprovado'
     where e.loja_id = p_loja and (e.status = 'fila' or (e.status = 'enviando' and e.criado_em < now() - interval '30 minutes' and e.tentativas < 3))
     order by e.criado_em limit greatest(1, least(coalesce(p_limite, 50), 200))
     for update of e skip locked),
  marcados as (
    update public.turbo_envios e set status = 'enviando', tentativas = e.tentativas + 1 from alvo where e.id = alvo.id returning e.*)
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'telefone', x.telefone, 'variaveis', x.variaveis,
           'modelo', m.nome, 'idioma', m.idioma, 'ordem', m.variaveis)), '[]'::jsonb) into v
    from marcados x join public.whatsapp_modelos m on m.id = x.modelo_id;
  return v;
end;
$$;

create or replace function public.whatsapp_resultado_envio(p_envio uuid, p_wa_id text, p_erro text)
returns void language sql security definer set search_path = '' as $$
  update public.turbo_envios
     set status = case when p_wa_id is not null then 'enviado' when tentativas >= 3 then 'erro' else 'fila' end,
         wa_id = p_wa_id, enviado_em = case when p_wa_id is not null then now() else enviado_em end, erro = left(p_erro, 300)
   where id = p_envio;
$$;

-- webhook: status da mensagem (sent/delivered/read/failed)
create or replace function public.whatsapp_status_mensagem(p_wa_id text, p_status text, p_erro text)
returns void language sql security definer set search_path = '' as $$
  update public.turbo_envios
     set entregue_em = case when p_status in ('delivered', 'read') then coalesce(entregue_em, now()) else entregue_em end,
         lido_em = case when p_status = 'read' then coalesce(lido_em, now()) else lido_em end,
         status = case when p_status = 'failed' then 'erro' else status end,
         erro = case when p_status = 'failed' then left(p_erro, 300) else erro end
   where wa_id = p_wa_id;
$$;

-- webhook: mensagem recebida. "SAIR", "PARAR", "STOP", "CANCELAR" tiram do marketing (LGPD)
create or replace function public.whatsapp_entrada(p_phone_id text, p_de text, p_texto text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_loja uuid; v_tel text := regexp_replace(coalesce(p_de, ''), '\D', '', 'g');
begin
  select loja_id into v_loja from private.whatsapp_contas where phone_number_id = p_phone_id;
  if v_loja is null then return 'sem_loja'; end if;
  if v_tel like '55%' and length(v_tel) >= 12 then v_tel := substr(v_tel, 3); end if;
  if upper(btrim(coalesce(p_texto, ''))) ~ '^(SAIR|PARAR|STOP|CANCELAR|DESCADASTRAR)\.?$' then
    update public.clientes set marketing_optout_em = now()
     where grupo = private.grupo_da_loja(v_loja) and (telefone = v_tel or telefone = '55' || v_tel) and marketing_optout_em is null;
    update public.turbo_envios set status = 'pulado' where telefone in (v_tel, '55' || v_tel) and status = 'fila';
    return 'optout';
  end if;
  return 'ok';
end;
$$;

create or replace function public.whatsapp_registrar_modelo(p_modelo uuid, p_meta_id text, p_status text, p_motivo text)
returns void language sql security definer set search_path = '' as $$
  update public.whatsapp_modelos
     set meta_id = coalesce(p_meta_id, meta_id),
         status = case upper(coalesce(p_status, '')) when 'APPROVED' then 'aprovado' when 'REJECTED' then 'rejeitado' when 'PAUSED' then 'pausado'
                    when 'DISABLED' then 'desativado' when 'PENDING' then 'pendente' when 'IN_APPEAL' then 'pendente' else status end,
         motivo = coalesce(p_motivo, motivo), atualizado_em = now()
   where id = p_modelo;
$$;

-- lojas com envio automático e algo na fila (o agendador chama o servidor só se houver trabalho)
create or replace function public.whatsapp_lojas_automaticas()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select w.loja_id from private.whatsapp_contas w
   where w.automatico and private.loja_tem_modulo(w.loja_id, 'turbo')
     and exists (select 1 from public.turbo_envios e join public.whatsapp_modelos m on m.id = e.modelo_id and m.status = 'aprovado'
                  where e.loja_id = w.loja_id and e.status = 'fila');
$$;

do $$
declare f text;
begin
  foreach f in array array['public.whatsapp_credenciais(uuid)', 'public.whatsapp_pegar_envios(uuid, integer)', 'public.whatsapp_resultado_envio(uuid, text, text)',
                           'public.whatsapp_status_mensagem(text, text, text)', 'public.whatsapp_entrada(text, text, text)',
                           'public.whatsapp_registrar_modelo(uuid, text, text, text)', 'public.whatsapp_lojas_automaticas()'] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- 6. Agendador: a cada 5 min chama o servidor se alguma loja tem fila automática
create or replace function private.whatsapp_tique()
returns void language plpgsql security definer set search_path = '' as $$
declare v_segredo text; v_url text;
begin
  if not exists (select 1 from public.whatsapp_lojas_automaticas())
     or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null
     or to_regclass('vault.decrypted_secrets') is null then
    return;
  end if;
  execute 'select max(decrypted_secret) filter (where name = ''marketplace_cron_segredo''), max(decrypted_secret) filter (where name = ''res_url'') from vault.decrypted_secrets'
     into v_segredo, v_url;
  if coalesce(v_segredo, '') = '' then return; end if;
  execute 'select net.http_post(url := $1, body := ''{}''::jsonb, params := ''{}''::jsonb, headers := $2, timeout_milliseconds := 25000)'
    using rtrim(coalesce(nullif(v_url, ''), 'https://res-iqzs.vercel.app'), '/') || '/api/whatsapp/processar',
          jsonb_build_object('Content-Type', 'application/json', 'X-RES-Chave', v_segredo);
end;
$$;
revoke execute on function private.whatsapp_tique() from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('res-whatsapp', '*/5 * * * *', 'select private.whatsapp_tique()');
  end if;
exception when others then raise notice 'WhatsApp não agendado: %', sqlerrm;
end $$;

-- 7. Painel do Turbo mostra o modelo de cada automação/campanha e, na fila, se vai sair sozinho
create or replace function public.turbo_modelos_uso(p_loja uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.turbo_pode(p_loja);
  return jsonb_build_object(
    'automacoes', coalesce((select jsonb_object_agg(a.tipo, a.modelo_id) from public.turbo_automacoes a where a.loja_id = p_loja and a.modelo_id is not null), '{}'::jsonb),
    'campanhas', coalesce((select jsonb_object_agg(c.id, c.modelo_id) from public.turbo_campanhas c where c.loja_id = p_loja and c.modelo_id is not null), '{}'::jsonb),
    'fila_automatica', (select count(*) from public.turbo_envios e join public.whatsapp_modelos m on m.id = e.modelo_id and m.status = 'aprovado'
                         where e.loja_id = p_loja and e.status = 'fila'));
end;
$$;
grant execute on function public.turbo_modelos_uso(uuid) to authenticated;
