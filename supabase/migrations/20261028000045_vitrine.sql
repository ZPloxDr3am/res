-- RES · 0045 · Vitrine do cardápio digital (D-045): capa, logo, cor, descrição, Instagram e WhatsApp
-- por cardápio (marca), ingredientes e selo das opções, e "Mais pedido" calculado pelas vendas.
-- Cada cardápio continua com o próprio endereço (/c/<endereço>) e a própria vitrine.
-- Pode rodar de novo sem erro.

alter table public.marcas add column if not exists logo_url text;
alter table public.marcas add column if not exists capa_url text;
alter table public.marcas add column if not exists cor text;
alter table public.marcas add column if not exists descricao text;
alter table public.marcas add column if not exists instagram text;
alter table public.marcas add column if not exists whatsapp text;
do $$ begin
  alter table public.marcas add constraint marcas_vitrine check (
    (cor is null or cor ~ '^#[0-9a-fA-F]{6}$')
    and (descricao is null or length(descricao) <= 300)
    and (instagram is null or instagram ~ '^[A-Za-z0-9._]{1,30}$')
    and (whatsapp is null or whatsapp ~ '^[0-9]{10,13}$')
    and (logo_url is null or logo_url ~ '^https://') and (capa_url is null or capa_url ~ '^https://'));
exception when duplicate_object then null;
end $$;

alter table public.opcoes add column if not exists descricao text;
alter table public.opcoes add column if not exists selo text;
do $$ begin
  alter table public.opcoes add constraint opcoes_vitrine check ((descricao is null or length(descricao) <= 200) and (selo is null or selo in ('recomendado', 'novo')));
exception when duplicate_object then null;
end $$;

-- Painel (quem configura o cardápio digital): salva a vitrine de um cardápio.
create or replace function public.salvar_vitrine(p_marca uuid, p_dados jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid;
begin
  select loja_id into v_loja from public.marcas where id = p_marca;
  if v_loja is null or not private.tem_permissao(v_loja, 'cardapio_digital') then
    raise exception 'Você não tem permissão para configurar o cardápio digital.' using errcode = 'insufficient_privilege';
  end if;
  update public.marcas set
    logo_url = nullif(btrim(coalesce(p_dados ->> 'logo_url', '')), ''),
    capa_url = nullif(btrim(coalesce(p_dados ->> 'capa_url', '')), ''),
    cor = nullif(lower(btrim(coalesce(p_dados ->> 'cor', ''))), ''),
    descricao = nullif(btrim(coalesce(p_dados ->> 'descricao', '')), ''),
    instagram = nullif(regexp_replace(btrim(coalesce(p_dados ->> 'instagram', '')), '^@', ''), ''),
    whatsapp = nullif(regexp_replace(coalesce(p_dados ->> 'whatsapp', ''), '\D', '', 'g'), ''),
    atualizado_em = now()
  where id = p_marca;
end;
$$;

-- Ingredientes e selo de uma opção (sabor, borda, adicional).
create or replace function public.salvar_detalhe_opcao(p_opcao uuid, p_descricao text, p_selo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid;
begin
  select loja_id into v_loja from public.opcoes where id = p_opcao;
  if v_loja is null or not private.tem_permissao(v_loja, 'cardapio') then
    raise exception 'Você não tem permissão para editar o cardápio.' using errcode = 'insufficient_privilege';
  end if;
  update public.opcoes set descricao = nullif(btrim(coalesce(p_descricao, '')), ''), selo = nullif(p_selo, ''), atualizado_em = now() where id = p_opcao;
end;
$$;

-- O que a vitrine pública precisa além de public.cardapio_publico.
-- "Mais pedido": as 3 opções mais escolhidas de cada grupo nos últimos 60 dias (mínimo 3 pedidos).
create or replace function public.vitrine_publica(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with m as (select * from public.marcas where slug = lower(btrim(p_slug)) and ativa),
       l as (select l.* from public.lojas l join m on m.loja_id = l.id),
       vend as (
         select o.opcao_id, o.grupo_id, count(distinct i.pedido_id) as n
           from public.pedido_item_opcoes o
           join public.pedido_itens i on i.id = o.item_id
           join public.pedidos p on p.id = i.pedido_id
          where p.loja_id = (select id from l) and p.status <> 'cancelado' and p.criado_em > now() - interval '60 days' and o.opcao_id is not null
          group by o.opcao_id, o.grupo_id),
       top as (select opcao_id from (select v.*, row_number() over (partition by grupo_id order by n desc) as r from vend v where n >= 3) x where r <= 3)
  select jsonb_build_object(
    'logo_url', m.logo_url, 'capa_url', m.capa_url, 'cor', m.cor, 'descricao', m.descricao,
    'instagram', m.instagram, 'whatsapp', m.whatsapp,
    'loja', jsonb_build_object('nome', l.nome, 'cnpj', l.cnpj, 'endereco', l.endereco, 'cidade', l.cidade,
                               'prazo_entrega_min', l.prazo_entrega_min, 'tempo_preparo_min', l.tempo_preparo_min),
    'produtos', coalesce((select jsonb_object_agg(p.id, jsonb_build_object('serve', p.serve_pessoas, 'restricoes', p.restricoes))
                            from public.produtos p where p.loja_id = m.loja_id and (p.serve_pessoas is not null or cardinality(p.restricoes) > 0)), '{}'::jsonb),
    'opcoes', coalesce((select jsonb_object_agg(o.id, jsonb_build_object('descricao', o.descricao,
                                  'selo', case when o.id in (select opcao_id from top) then 'mais_pedido' else o.selo end))
                          from public.opcoes o
                         where o.loja_id = m.loja_id and o.ativo and (o.descricao is not null or o.selo is not null or o.id in (select opcao_id from top))), '{}'::jsonb))
  from m, l;
$$;

grant execute on function public.salvar_vitrine(uuid, jsonb), public.salvar_detalhe_opcao(uuid, text, text) to authenticated;
revoke execute on function public.salvar_vitrine(uuid, jsonb), public.salvar_detalhe_opcao(uuid, text, text) from anon, public;
grant execute on function public.vitrine_publica(text) to anon, authenticated;
