-- RES · 0030 · Segmentos de clientes para marketing (D-029).
--
-- Cada cliente cai em um segmento pela recência (dias desde o último pedido) e pela frequência
-- (pedidos não cancelados nas lojas do grupo). Mesma regra de segmentoCliente (packages/core).
-- * listar_clientes: contagem por segmento + lista filtrada (segmento e/ou busca), com paginação.
-- * exportar_clientes: a lista inteira do segmento para campanhas (SMS, Meta/Google Ads).

create or replace function private.segmento_cliente(p_dias integer, p_pedidos integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_dias is null or coalesce(p_pedidos, 0) < 1 then null
    when p_dias > 120 then 'dormindo'
    when p_dias > 60 then case when p_pedidos >= 4 then 'em_risco' else 'hibernando' end
    when p_dias > 30 then case when p_pedidos >= 4 then 'atencao' else 'quase_dormentes' end
    when p_pedidos >= 4 then 'fieis'
    when p_pedidos >= 2 then 'potenciais'
    else 'promissores'
  end;
$$;

-- números de cada cliente do grupo (só pedidos não cancelados das lojas do grupo)
create or replace function private.clientes_rfv(p_loja uuid)
returns table (id uuid, pedidos integer, gasto numeric, ultimo timestamptz, dias integer, segmento text)
language sql
stable
security definer
set search_path = ''
as $$
  with est as (
    select p.cliente_id, count(*)::int as n, sum(p.total) as gasto, max(p.criado_em) as ultimo
      from public.pedidos p
     where p.loja_id = any (private.lojas_grupo(p_loja)) and p.status <> 'cancelado' and p.cliente_id is not null
     group by p.cliente_id
  )
  select c.id, coalesce(e.n, 0), coalesce(e.gasto, 0), e.ultimo,
         floor(extract(epoch from now() - e.ultimo) / 86400)::int,
         private.segmento_cliente(floor(extract(epoch from now() - e.ultimo) / 86400)::int, coalesce(e.n, 0))
    from public.clientes c left join est e on e.cliente_id = c.id
   where c.grupo = private.grupo_da_loja(p_loja);
$$;
revoke execute on function private.clientes_rfv(uuid) from anon, public, authenticated;

create or replace function public.listar_clientes(p_loja uuid, p_segmento text default null, p_termo text default '', p_limite integer default 50, p_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_dig   text := regexp_replace(coalesce(p_termo, ''), '\D', '', 'g');
  v_txt   text := btrim(coalesce(p_termo, ''));
  v_lojas uuid[] := private.lojas_grupo(p_loja);
begin
  if not (private.tem_permissao(p_loja, 'pedidos_delivery') or private.tem_permissao(p_loja, 'clientes') or private.tem_permissao(p_loja, 'marketing')) then
    raise exception 'Você não tem acesso aos clientes.' using errcode = 'insufficient_privilege';
  end if;
  return (
    with r as (select * from private.clientes_rfv(p_loja)),
    filtro as (
      select c.*, r.pedidos, r.gasto, r.ultimo, r.dias, r.segmento
        from public.clientes c join r on r.id = c.id
       where (p_segmento is null or r.segmento = p_segmento)
         and (v_txt = ''
              or (length(v_dig) >= 4 and c.telefone like '%' || v_dig || '%')
              or (length(v_txt) >= 2 and v_dig = '' and lower(c.nome) like '%' || lower(replace(replace(v_txt, '%', ''), '_', '')) || '%'))
    ),
    pagina as (
      select * from filtro
       order by case when p_segmento is null then null else gasto end desc nulls last, ultimo desc nulls last, nome
       limit greatest(1, least(coalesce(p_limite, 50), 200)) offset greatest(0, coalesce(p_offset, 0))
    )
    select jsonb_build_object(
      'contagens', coalesce((select jsonb_object_agg(s, n) from (select segmento as s, count(*) as n from r where segmento is not null group by segmento) x), '{}'::jsonb),
      'sem_pedido', (select count(*) from r where segmento is null),
      'total', (select count(*) from filtro),
      'clientes', coalesce((select jsonb_agg(jsonb_build_object(
                     'id', c.id, 'nome', c.nome, 'telefone', c.telefone, 'observacoes', c.observacoes,
                     'ultimo_pedido_em', c.ultimo, 'criado_em', c.criado_em,
                     'enderecos', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'logradouro', e.logradouro, 'numero', e.numero, 'complemento', e.complemento,
                                                                                'bairro', e.bairro, 'referencia', e.referencia) order by e.ultimo_uso desc)
                                              from public.cliente_enderecos e where e.cliente_id = c.id), '[]'::jsonb),
                     'pedidos', c.pedidos, 'total_gasto', round(c.gasto * 100), 'dias', c.dias, 'segmento', c.segmento,
                     'ultimo_item', (select i.nome from public.pedidos p join public.pedido_itens i on i.pedido_id = p.id
                                      where p.cliente_id = c.id and p.loja_id = any (v_lojas) order by p.criado_em desc, i.ordem limit 1))
                   order by case when p_segmento is null then null else c.gasto end desc nulls last, c.ultimo desc nulls last, c.nome)
                   from pagina c), '[]'::jsonb)));
end;
$$;

-- Lista do segmento para campanha (sem limite de página). Só quem cuida de clientes/marketing.
create or replace function public.exportar_clientes(p_loja uuid, p_segmento text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.e_gestor(p_loja) or private.tem_permissao(p_loja, 'clientes') or private.tem_permissao(p_loja, 'marketing')) then
    raise exception 'Você não tem permissão para exportar clientes.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'nome', c.nome, 'telefone', c.telefone, 'segmento', r.segmento, 'pedidos', r.pedidos,
             'total_gasto', round(r.gasto * 100), 'ultimo_pedido_em', r.ultimo, 'dias', r.dias,
             'bairro', (select e.bairro from public.cliente_enderecos e where e.cliente_id = c.id order by e.ultimo_uso desc limit 1))
           order by r.gasto desc, c.nome)
      from public.clientes c join private.clientes_rfv(p_loja) r on r.id = c.id
     where (p_segmento is null and r.segmento is not null) or r.segmento = p_segmento), '[]'::jsonb);
end;
$$;

grant execute on function public.listar_clientes(uuid, text, text, integer, integer), public.exportar_clientes(uuid, text) to authenticated;
revoke execute on function public.listar_clientes(uuid, text, text, integer, integer), public.exportar_clientes(uuid, text) from anon, public;
