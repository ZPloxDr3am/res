-- RES · 0039 · Aplicativos (D-042).
-- Integrações por loja: Pix no cardápio (QR com o valor do pedido), pixels de anúncio (Meta, Google Analytics,
-- Google Ads, Tag Manager) e link de avaliação no Google. Link único do grupo (todos os cardápios em /g/<link>).
-- Os IDs de pixel e a chave Pix são públicos por natureza (aparecem no navegador do cliente); nada secreto fica aqui.
-- Pode rodar de novo sem erro.

create table if not exists public.integracoes (
  loja_id        uuid not null references public.lojas (id) on delete cascade,
  tipo           text not null check (tipo in ('pix', 'meta_pixel', 'google_analytics', 'google_ads', 'google_tag_manager', 'google_avaliacao')),
  ativo          boolean not null default true,
  config         jsonb not null default '{}'::jsonb,
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid,
  primary key (loja_id, tipo)
);
alter table public.integracoes enable row level security;

alter table public.contas add column if not exists link text;
do $$ begin
  alter table public.contas add constraint contas_link_formato check (link is null or link ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])?$');
exception when duplicate_object then null;
end $$;
create unique index if not exists contas_link_unico on public.contas (link) where link is not null;

-- Confere e limpa a configuração de cada tipo.
create or replace function private.config_integracao(p_tipo text, p_config jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  c jsonb := coalesce(p_config, '{}'::jsonb);
  v text;
begin
  case p_tipo
    when 'pix' then
      if coalesce(c ->> 'tipo_chave', '') not in ('cpf', 'cnpj', 'email', 'telefone', 'aleatoria')
         or length(coalesce(c ->> 'chave', '')) not between 5 and 77
         or length(btrim(coalesce(c ->> 'nome', ''))) not between 2 and 25
         or length(btrim(coalesce(c ->> 'cidade', ''))) not between 2 and 15 then
        raise exception 'Confira a chave Pix, o nome (até 25 letras) e a cidade (até 15).' using errcode = 'check_violation';
      end if;
      return jsonb_build_object('tipo_chave', c ->> 'tipo_chave', 'chave', c ->> 'chave', 'nome', btrim(c ->> 'nome'), 'cidade', btrim(c ->> 'cidade'));
    when 'meta_pixel' then
      v := regexp_replace(coalesce(c ->> 'id', ''), '\s', '', 'g');
      if v !~ '^\d{10,20}$' then raise exception 'O ID do Pixel do Meta tem só números (10 a 20).' using errcode = 'check_violation'; end if;
      return jsonb_build_object('id', v);
    when 'google_analytics' then
      v := upper(btrim(coalesce(c ->> 'id', '')));
      if v !~ '^G-[A-Z0-9]{4,14}$' then raise exception 'O ID do Google Analytics começa com G- (ex.: G-ABC123XYZ9).' using errcode = 'check_violation'; end if;
      return jsonb_build_object('id', v);
    when 'google_ads' then
      v := upper(btrim(coalesce(c ->> 'id', '')));
      if v !~ '^AW-\d{6,14}$' then raise exception 'O ID do Google Ads começa com AW- (ex.: AW-123456789).' using errcode = 'check_violation'; end if;
      if coalesce(c ->> 'rotulo', '') <> '' and (c ->> 'rotulo') !~ '^[A-Za-z0-9_-]{4,40}$' then
        raise exception 'Confira o rótulo da conversão do Google Ads.' using errcode = 'check_violation';
      end if;
      return jsonb_build_object('id', v, 'rotulo', nullif(c ->> 'rotulo', ''));
    when 'google_tag_manager' then
      v := upper(btrim(coalesce(c ->> 'id', '')));
      if v !~ '^GTM-[A-Z0-9]{4,10}$' then raise exception 'O ID do Tag Manager começa com GTM- (ex.: GTM-ABCD12).' using errcode = 'check_violation'; end if;
      return jsonb_build_object('id', v);
    when 'google_avaliacao' then
      v := btrim(coalesce(c ->> 'url', ''));
      if v !~ '^https://(g\.page|search\.google\.com|www\.google\.com|maps\.app\.goo\.gl|goo\.gl|maps\.google\.com)/' then
        raise exception 'Cole o link de avaliação do Google (começa com https://g.page/ ou https://search.google.com/).' using errcode = 'check_violation';
      end if;
      return jsonb_build_object('url', left(v, 300));
    else
      raise exception 'Aplicativo desconhecido.' using errcode = 'check_violation';
  end case;
end;
$$;

-- Tela Aplicativos.
create or replace function public.aplicativos_painel(p_loja uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_conta public.contas;
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o gestor da loja mexe nos aplicativos.' using errcode = 'insufficient_privilege';
  end if;
  select c.* into v_conta from public.contas c join public.lojas l on l.conta_id = c.id where l.id = p_loja;
  return jsonb_build_object(
    'integracoes', coalesce((select jsonb_object_agg(i.tipo, jsonb_build_object('ativo', i.ativo, 'config', i.config, 'atualizado_em', i.atualizado_em))
                               from public.integracoes i where i.loja_id = p_loja), '{}'::jsonb),
    'outras_lojas', (select count(*) from public.lojas l where v_conta.id is not null and l.conta_id = v_conta.id and l.id <> p_loja and private.e_gestor(l.id)),
    'link', v_conta.link,
    'pode_link', v_conta.id is not null and private.e_titular(v_conta.id),
    'cardapios', coalesce((select jsonb_agg(jsonb_build_object('nome', m.nome, 'slug', m.slug, 'loja', l.nome) order by l.nome, m.ordem, m.nome)
                             from public.marcas m join public.lojas l on l.id = m.loja_id
                            where m.ativa and (l.id = p_loja or (v_conta.id is not null and l.conta_id = v_conta.id))), '[]'::jsonb));
end;
$$;

-- Liga/desliga e configura. p_todas: aplica também nas outras lojas do grupo que a pessoa gerencia.
create or replace function public.salvar_integracao(p_loja uuid, p_tipo text, p_ativo boolean, p_config jsonb, p_todas boolean)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg jsonb;
  v_n   integer := 0;
  l     uuid;
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o gestor da loja mexe nos aplicativos.' using errcode = 'insufficient_privilege';
  end if;
  v_cfg := private.config_integracao(p_tipo, p_config);
  for l in
    select x.id from public.lojas x
     where x.id = p_loja
        or (p_todas and x.conta_id is not null and x.conta_id = (select conta_id from public.lojas where id = p_loja) and private.e_gestor(x.id))
  loop
    insert into public.integracoes (loja_id, tipo, ativo, config, atualizado_em, atualizado_por)
    values (l, p_tipo, coalesce(p_ativo, true), v_cfg, now(), auth.uid())
    on conflict (loja_id, tipo) do update set ativo = excluded.ativo, config = excluded.config, atualizado_em = now(), atualizado_por = auth.uid();
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

create or replace function public.remover_integracao(p_loja uuid, p_tipo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o gestor da loja mexe nos aplicativos.' using errcode = 'insufficient_privilege';
  end if;
  delete from public.integracoes where loja_id = p_loja and tipo = p_tipo;
end;
$$;

-- Link único do grupo (só o titular da conta).
create or replace function public.salvar_link_grupo(p_loja uuid, p_link text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta uuid;
  v_link  text := nullif(lower(btrim(coalesce(p_link, ''))), '');
begin
  select conta_id into v_conta from public.lojas where id = p_loja;
  if v_conta is null or not private.e_titular(v_conta) then
    raise exception 'Só o titular da conta escolhe o link do grupo.' using errcode = 'insufficient_privilege';
  end if;
  if v_link is not null and v_link !~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])?$' then
    raise exception 'Use de 3 a 40 letras minúsculas, números ou hífen.' using errcode = 'check_violation';
  end if;
  if v_link is not null and exists (select 1 from public.contas where link = v_link and id <> v_conta) then
    raise exception 'Esse link já está em uso. Tente outro.' using errcode = 'unique_violation';
  end if;
  update public.contas set link = v_link, atualizado_em = now() where id = v_conta;
end;
$$;

-- ---------------------------------------------------------------------------- público (cliente, sem login)
-- Pixels da loja do cardápio (só IDs públicos).
create or replace function public.rastreamento_publico(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(i.tipo, i.config), '{}'::jsonb)
    from public.marcas m join public.integracoes i on i.loja_id = m.loja_id
   where m.slug = lower(p_slug) and m.ativa and i.ativo
     and i.tipo in ('meta_pixel', 'google_analytics', 'google_ads', 'google_tag_manager');
$$;

-- Extras da página do pedido: Pix para pagar (pedido em Pix, ainda não pago) e link de avaliação no Google.
create or replace function public.extras_pedido_publico(p_codigo uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'pix', case when p.pagamento = 'pix' and p.status <> 'cancelado' and pix.ativo then
                    jsonb_build_object('chave', pix.config ->> 'chave', 'nome', pix.config ->> 'nome', 'cidade', pix.config ->> 'cidade',
                                       'valor', round(p.total * 100), 'numero', p.numero, 'pago', p.pago_em is not null) end,
           'avaliacao', case when av.ativo then av.config ->> 'url' end)
    from public.pedidos p
    left join public.integracoes pix on pix.loja_id = p.loja_id and pix.tipo = 'pix'
    left join public.integracoes av on av.loja_id = p.loja_id and av.tipo = 'google_avaliacao'
   where p.codigo = p_codigo;
$$;

-- Link único do grupo: os cardápios das lojas da conta.
create or replace function public.grupo_publico(p_link text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'nome', c.nome,
           'cardapios', coalesce((select jsonb_agg(jsonb_build_object('nome', m.nome, 'slug', m.slug, 'loja', l.nome, 'cidade', l.cidade,
                                                                     'aberta', private.marca_aberta(m.id)) order by l.nome, m.ordem, m.nome)
                                    from public.lojas l join public.marcas m on m.loja_id = l.id
                                   where l.conta_id = c.id and m.ativa), '[]'::jsonb))
    from public.contas c
   where c.link = lower(p_link);
$$;

grant execute on function public.aplicativos_painel(uuid), public.salvar_integracao(uuid, text, boolean, jsonb, boolean),
  public.remover_integracao(uuid, text), public.salvar_link_grupo(uuid, text) to authenticated;
revoke execute on function public.aplicativos_painel(uuid), public.salvar_integracao(uuid, text, boolean, jsonb, boolean),
  public.remover_integracao(uuid, text), public.salvar_link_grupo(uuid, text) from anon, public;
grant execute on function public.rastreamento_publico(text), public.extras_pedido_publico(uuid), public.grupo_publico(text) to anon, authenticated;
