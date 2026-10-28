-- 0047: taxa de entrega por raio em km (D-048). Pode rodar de novo.
-- Bairro cadastrado continua mandando; endereço fora da lista usa a faixa de km (linha reta da loja
-- até o endereço, como o "raio" do BeeFood), com tempo adicional opcional.

create table if not exists public.faixas_km (
  id             uuid primary key default gen_random_uuid(),
  loja_id        uuid not null references public.lojas (id) on delete cascade,
  marca_id       uuid not null references public.marcas (id) on delete cascade,
  ate_km         numeric(6, 2) not null check (ate_km > 0 and ate_km <= 200),
  taxa           numeric(12, 2) not null check (taxa >= 0),
  minutos_extra  integer not null default 0 check (minutos_extra between 0 and 240),
  criado_em      timestamptz not null default now()
);
create unique index if not exists faixas_km_idx on public.faixas_km (marca_id, ate_km);
alter table public.faixas_km enable row level security;
drop policy if exists faixas_km_ler on public.faixas_km;
create policy faixas_km_ler on public.faixas_km for select to authenticated using (private.e_membro(loja_id));

alter table public.pedidos add column if not exists distancia_reta_km numeric(6, 2);

/** Distância em linha reta (km) entre dois pontos. */
create or replace function private.km_reta(a_lat double precision, a_lng double precision, b_lat double precision, b_lng double precision)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select round((2 * 6371 * asin(sqrt(
           power(sin(radians(b_lat - a_lat) / 2), 2)
         + cos(radians(a_lat)) * cos(radians(b_lat)) * power(sin(radians(b_lng - a_lng) / 2), 2))))::numeric, 2);
$$;

/** Faixa de km para o destino: {km, taxa, minutos_extra}; null se a loja não tem local/faixas ou o destino passa da última. */
create or replace function private.taxa_km(p_marca uuid, p_lat double precision, p_lng double precision)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('km', d.km, 'taxa', f.taxa, 'minutos_extra', f.minutos_extra)
    from public.marcas m
    join public.lojas l on l.id = m.loja_id
    cross join lateral (select private.km_reta(l.lat, l.lng, p_lat, p_lng) as km) d
    join lateral (select * from public.faixas_km f where f.marca_id = m.id and f.ate_km >= d.km order by f.ate_km limit 1) f on true
   where m.id = p_marca and l.lat is not null and p_lat is not null and p_lng is not null;
$$;
revoke execute on function private.taxa_km(uuid, double precision, double precision) from anon, public;

/** Para o painel (Delivery): grava as faixas da marca de uma vez. */
create or replace function public.salvar_faixas_km(p_marca uuid, p_faixas jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid := (select loja_id from public.marcas where id = p_marca);
begin
  if v_loja is null or not private.tem_permissao(v_loja, 'cardapio_digital') then
    raise exception 'Sem permissão.' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(coalesce(p_faixas, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_faixas, '[]'::jsonb)) > 30 then
    raise exception 'Lista de faixas inválida.' using errcode = 'check_violation';
  end if;
  if (select count(*) <> count(distinct (f ->> 'ate_km')::numeric) from jsonb_array_elements(coalesce(p_faixas, '[]'::jsonb)) f) then
    raise exception 'Duas faixas com o mesmo km.' using errcode = 'unique_violation';
  end if;
  delete from public.faixas_km where marca_id = p_marca;
  insert into public.faixas_km (loja_id, marca_id, ate_km, taxa, minutos_extra)
  select v_loja, p_marca, (f ->> 'ate_km')::numeric, (f ->> 'taxa')::numeric, coalesce((f ->> 'minutos_extra')::int, 0)
    from jsonb_array_elements(coalesce(p_faixas, '[]'::jsonb)) f;
end;
$$;
revoke execute on function public.salvar_faixas_km(uuid, jsonb) from anon, public;
grant execute on function public.salvar_faixas_km(uuid, jsonb) to authenticated;

/** Cardápio público: onde fica a loja e as faixas (o endereço da loja já é público). */
create or replace function public.faixas_km_publica(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('lat', l.lat, 'lng', l.lng, 'cidade', l.cidade,
           'faixas', coalesce((select jsonb_agg(jsonb_build_object('ate_km', f.ate_km, 'taxa', round(f.taxa * 100), 'minutos_extra', f.minutos_extra) order by f.ate_km)
                                 from public.faixas_km f where f.marca_id = m.id), '[]'::jsonb))
    from public.marcas m join public.lojas l on l.id = m.loja_id
   where m.slug = lower(btrim(p_slug)) and m.ativa;
$$;
grant execute on function public.faixas_km_publica(text) to anon, authenticated;
create or replace function public.criar_pedido_publico(p_slug text, p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_marca  public.marcas;
  v_tipo   public.tipo_pedido := (p_dados ->> 'tipo')::public.tipo_pedido;
  v_pag    public.forma_pagamento := (p_dados ->> 'pagamento')::public.forma_pagamento;
  v_tel    text := regexp_replace(coalesce(p_dados #>> '{cliente,telefone}', ''), '\D', '', 'g');
  v_bairro text := btrim(coalesce(p_dados #>> '{endereco,bairro}', ''));
  v_agend  timestamptz := nullif(p_dados ->> 'agendado_para', '')::timestamptz;
  v_taxa   numeric(12, 2) := 0;
  v_lat    double precision := nullif(p_dados #>> '{destino,lat}', '')::double precision;
  v_lng    double precision := nullif(p_dados #>> '{destino,lng}', '')::double precision;
  v_km     jsonb;
  v_dados  jsonb;
  v_pedido uuid;
  v_ped    record;
  it       jsonb;
begin
  select * into v_marca from public.marcas where slug = lower(btrim(p_slug)) and ativa;
  if not found then
    raise exception 'Cardápio não encontrado.' using errcode = 'no_data_found';
  end if;
  if v_agend is not null then
    perform private.validar_agendamento(v_marca.id, v_agend);
  elsif not private.marca_aberta(v_marca.id) then
    raise exception 'A loja está fechada agora.' using errcode = 'check_violation';
  end if;
  if v_tipo = 'balcao' or (v_tipo = 'entrega' and not v_marca.aceita_entrega) or (v_tipo = 'retirada' and not v_marca.aceita_retirada) then
    raise exception 'Esse tipo de pedido não está disponível.' using errcode = 'check_violation';
  end if;
  if v_pag = 'online' or not (v_pag = any (v_marca.formas_pagamento)) then
    raise exception 'Forma de pagamento não aceita.' using errcode = 'check_violation';
  end if;
  if length(btrim(coalesce(p_dados #>> '{cliente,nome}', ''))) < 2 then
    raise exception 'Informe seu nome.' using errcode = 'check_violation';
  end if;
  if v_tel !~ '^[0-9]{10,13}$' then
    raise exception 'Informe um telefone com DDD.' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.pedidos p
       where p.marca_id = v_marca.id and p.cliente_telefone = v_tel and p.criado_em > now() - interval '10 minutes') >= 3 then
    raise exception 'Recebemos vários pedidos seguidos deste telefone. Aguarde alguns minutos ou fale com a loja.' using errcode = 'check_violation';
  end if;

  if v_tipo = 'entrega' then
    if v_lat is not null and (v_lat not between -90 and 90 or v_lng is null or v_lng not between -180 and 180) then
      v_lat := null; v_lng := null;
    end if;
    v_taxa := private.taxa_bairro(v_marca.id, v_bairro);
    if v_taxa is null then
      -- fora da lista de bairros: faixa de km (D-048)
      v_km := private.taxa_km(v_marca.id, v_lat, v_lng);
      if v_km is null and exists (select 1 from public.faixas_km where marca_id = v_marca.id) and v_lat is not null then
        raise exception 'Seu endereço fica fora da nossa área de entrega.' using errcode = 'check_violation';
      elsif v_km is null then
        raise exception 'Ainda não entregamos no bairro "%".', v_bairro using errcode = 'check_violation';
      end if;
      v_taxa := (v_km ->> 'taxa')::numeric;
    end if;
  end if;

  for it in select jsonb_array_elements(coalesce(p_dados -> 'itens', '[]'::jsonb)) loop
    if not exists (
      select 1 from public.produtos p
       where p.id = (it ->> 'produto_id')::uuid and p.loja_id = v_marca.loja_id
         and p.etiqueta is distinct from 'esgotado'
         and exists (
               select 1 from public.setores s join public.setor_marcas sm on sm.setor_id = s.id
                where s.id = p.setor_id and s.delivery and sm.marca_id = v_marca.id and sm.ativo)) then
      raise exception 'Um dos produtos não está disponível agora.' using errcode = 'check_violation';
    end if;
  end loop;

  v_dados := jsonb_build_object(
    'tipo', v_tipo,
    'cliente', jsonb_build_object('nome', left(btrim(p_dados #>> '{cliente,nome}'), 120), 'telefone', v_tel),
    'endereco', case when v_tipo = 'entrega' then (p_dados -> 'endereco') || jsonb_build_object('bairro', v_bairro) end,
    'itens', p_dados -> 'itens',
    'taxa_entrega', v_taxa,
    'desconto', 0,
    'pagamento', v_pag,
    'troco_para', null,   -- conferido depois do cupom (0023)
    'observacao', left(p_dados ->> 'observacao', 500),
    'agendado_para', v_agend);

  v_pedido := private.inserir_pedido(v_marca.loja_id, v_marca.id, v_dados, 'cardapio_digital', null);
  if v_tipo = 'entrega' and v_lat is not null then
    update public.pedidos set destino_lat = v_lat, destino_lng = v_lng,
           distancia_reta_km = private.km_reta(l.lat, l.lng, v_lat, v_lng)
      from public.lojas l where pedidos.id = v_pedido and l.id = pedidos.loja_id and l.lat is not null;
    update public.pedidos set destino_lat = v_lat, destino_lng = v_lng where id = v_pedido and destino_lat is null;
  end if;

  if nullif(btrim(p_dados ->> 'cupom'), '') is not null then
    perform private.aplicar_cupom(v_pedido, p_dados ->> 'cupom');
  end if;
  -- cashback / recompensa de pontos (0032): só com a prova de um pedido anterior deste cliente
  if jsonb_typeof(p_dados -> 'fidelidade') = 'object' then
    perform private.aplicar_fidelidade(v_pedido, p_dados -> 'fidelidade', true,
      case when coalesce(p_dados ->> 'fidelidade_prova', '') ~* '^[0-9a-f-]{36}$' then (p_dados ->> 'fidelidade_prova')::uuid end);
  end if;
  if v_pag = 'dinheiro' and nullif(p_dados ->> 'troco_para', '') is not null then
    if (p_dados ->> 'troco_para')::numeric < (select total from public.pedidos where id = v_pedido) then
      raise exception 'O valor para troco é menor que o total.' using errcode = 'check_violation';
    end if;
    update public.pedidos set troco_para = (p_dados ->> 'troco_para')::numeric where id = v_pedido;
  end if;

  select numero, codigo, subtotal, total into v_ped from public.pedidos where id = v_pedido;
  if v_ped.subtotal < v_marca.pedido_minimo then
    raise exception 'O pedido mínimo é de R$ %.', replace(to_char(v_marca.pedido_minimo, 'FM999990.00'), '.', ',') using errcode = 'check_violation';
  end if;
  return jsonb_build_object('numero', v_ped.numero, 'codigo', v_ped.codigo, 'total', round(v_ped.total * 100));  -- (0032: inalterado)
end;
$$;

