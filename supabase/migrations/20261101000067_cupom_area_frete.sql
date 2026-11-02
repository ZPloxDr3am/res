-- 0067: cupom por área/produto e frete grátis automático (D-066). Pode rodar de novo.
-- Cupom: pode valer só em certos bairros, só até X km da loja e/ou só com certos produtos (aí o
-- desconto em % ou R$ é calculado sobre esses produtos; o de entrega grátis exige ter um deles).
-- Frete grátis (sem cupom): regras da loja, por cardápio ou todos — "acima de R$ X", em certos
-- bairros, até X km, ou quando o pedido tem um produto. Vale no cardápio digital; o motoboy recebe
-- normalmente (a taxa fica no pedido e o mesmo valor entra como desconto).

alter table public.cupons add column if not exists bairros text[];
alter table public.cupons add column if not exists km_max numeric(6, 2) check (km_max is null or km_max > 0);
alter table public.cupons add column if not exists produtos uuid[];
alter table public.pedidos add column if not exists frete_gratis text;

create table if not exists public.frete_gratis (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references public.lojas (id) on delete cascade,
  marca_id      uuid references public.marcas (id) on delete cascade,
  nome          text not null check (length(btrim(nome)) between 1 and 60),
  pedido_minimo numeric(12, 2) not null default 0 check (pedido_minimo >= 0),
  bairros       text[],
  km_max        numeric(6, 2) check (km_max is null or km_max > 0),
  produtos      uuid[],
  dias          smallint[] check (dias is null or dias <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  valido_ate    date,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);
create index if not exists frete_gratis_loja_idx on public.frete_gratis (loja_id) where ativo;
alter table public.frete_gratis enable row level security;
drop policy if exists frete_gratis_ler on public.frete_gratis;
create policy frete_gratis_ler on public.frete_gratis for select to authenticated using (private.e_membro(loja_id));
drop policy if exists frete_gratis_escrever on public.frete_gratis;
create policy frete_gratis_escrever on public.frete_gratis for all to authenticated
  using (private.tem_permissao(loja_id, 'cardapio')) with check (private.tem_permissao(loja_id, 'cardapio'));
grant select, insert, update, delete on public.frete_gratis to authenticated;
revoke all on public.frete_gratis from anon;
drop trigger if exists frete_gratis_auditar on public.frete_gratis;
create trigger frete_gratis_auditar after insert or update or delete on public.frete_gratis for each row execute function private.auditar();

create or replace function private.bairro_igual(a text, b text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(btrim(coalesce(a, ''))) = lower(btrim(coalesce(b, '')));
$$;

-- Restrições do cupom. p_itens: [{produto_id, total (reais)}]. Devolve a base do desconto quando o
-- cupom é só de certos produtos (soma desses itens), ou nulo (vale o pedido todo). Lança a mensagem.
create or replace function private.base_cupom(p_cupom public.cupons, p_tipo_pedido text, p_bairro text, p_km numeric, p_itens jsonb)
returns numeric
language plpgsql
stable
set search_path = ''
as $$
declare v_base numeric;
begin
  if p_cupom.bairros is not null and cardinality(p_cupom.bairros) > 0 then
    if p_tipo_pedido <> 'entrega' or not exists (select 1 from unnest(p_cupom.bairros) b where private.bairro_igual(b, p_bairro)) then
      raise exception 'O cupom % vale só para entregas em: %.', p_cupom.codigo, array_to_string(p_cupom.bairros, ', ') using errcode = 'check_violation';
    end if;
  end if;
  if p_cupom.km_max is not null then
    if p_tipo_pedido <> 'entrega' then
      raise exception 'O cupom % vale só para entregas.', p_cupom.codigo using errcode = 'check_violation';
    end if;
    if p_km is not null and p_km > p_cupom.km_max then
      raise exception 'O cupom % vale para entregas até % km da loja.', p_cupom.codigo, replace(p_cupom.km_max::text, '.', ',') using errcode = 'check_violation';
    end if;
  end if;
  if p_cupom.produtos is not null and cardinality(p_cupom.produtos) > 0 then
    select coalesce(sum((x ->> 'total')::numeric), 0) into v_base
      from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) x
     where (x ->> 'produto_id') ~* '^[0-9a-f-]{36}$' and (x ->> 'produto_id')::uuid = any (p_cupom.produtos);
    if v_base <= 0 then
      raise exception 'O cupom % vale para: %.', p_cupom.codigo,
        (select string_agg(p.nome, ', ' order by p.nome) from public.produtos p where p.id = any (p_cupom.produtos)) using errcode = 'check_violation';
    end if;
    return v_base;
  end if;
  return null;
end;
$$;
revoke execute on function private.base_cupom(public.cupons, text, text, numeric, jsonb) from anon, public;

-- Aplica o cupom no pedido recém-criado (soma ao desconto que já houver). + área/produto (0067).
create or replace function private.aplicar_cupom(p_pedido uuid, p_codigo text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_ped  public.pedidos;
  v_cup  public.cupons;
  v_d    numeric;
  v_base numeric;
begin
  select * into v_ped from public.pedidos where id = p_pedido for update;
  v_cup := private.cupom_da_loja(v_ped.loja_id, p_codigo);
  if v_cup.tipo = 'frete' and v_ped.frete_gratis is not null then
    raise exception 'A entrega deste pedido já é grátis (%): o cupom % não é necessário.', v_ped.frete_gratis, v_cup.codigo using errcode = 'check_violation';
  end if;
  v_base := private.base_cupom(v_cup, v_ped.tipo::text, v_ped.endereco ->> 'bairro', v_ped.distancia_reta_km,
              (select coalesce(jsonb_agg(jsonb_build_object('produto_id', i.produto_id, 'total', i.total)), '[]'::jsonb) from public.pedido_itens i where i.pedido_id = p_pedido));
  v_d := private.desconto_cupom(v_cup, v_ped.subtotal, v_ped.taxa_entrega, v_ped.tipo::text, v_ped.cliente_telefone, v_ped.id);
  if v_base is not null then
    v_d := case v_cup.tipo when 'percentual' then round(v_base * v_cup.valor / 100, 2) when 'valor' then least(v_cup.valor, v_base) else v_d end;
  end if;
  v_d := least(v_d, v_ped.subtotal + v_ped.taxa_entrega - v_ped.desconto);
  update public.pedidos
     set desconto = desconto + v_d, total = subtotal + taxa_entrega - (desconto + v_d), cupom_id = v_cup.id, cupom_codigo = v_cup.codigo
   where id = p_pedido;
end;
$$;
revoke execute on function private.aplicar_cupom(uuid, text) from anon, public;

-- Regra de frete grátis que vale para um pedido (a primeira que servir), ou nulo.
create or replace function private.regra_frete_gratis(p_loja uuid, p_marca uuid, p_subtotal numeric, p_bairro text, p_km numeric, p_produtos uuid[])
returns public.frete_gratis
language sql
stable
set search_path = ''
as $$
  select f.* from public.frete_gratis f
   where f.loja_id = p_loja and f.ativo and (f.marca_id is null or f.marca_id = p_marca)
     and private.agenda_vale(f.loja_id, f.dias, null, null, f.valido_ate)
     and p_subtotal >= f.pedido_minimo
     and (f.bairros is null or cardinality(f.bairros) = 0 or exists (select 1 from unnest(f.bairros) b where private.bairro_igual(b, p_bairro)))
     and (f.km_max is null or (p_km is not null and p_km <= f.km_max))
     and (f.produtos is null or cardinality(f.produtos) = 0 or f.produtos && coalesce(p_produtos, '{}'))
   order by f.pedido_minimo, f.criado_em
   limit 1;
$$;
revoke execute on function private.regra_frete_gratis(uuid, uuid, numeric, text, numeric, uuid[]) from anon, public;

create or replace function private.aplicar_frete_gratis(p_pedido uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_ped public.pedidos;
  v_reg public.frete_gratis;
begin
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if v_ped.tipo <> 'entrega' or v_ped.taxa_entrega <= 0 then
    return;
  end if;
  v_reg := private.regra_frete_gratis(v_ped.loja_id, v_ped.marca_id, v_ped.subtotal, v_ped.endereco ->> 'bairro', v_ped.distancia_reta_km,
             (select array_agg(i.produto_id) from public.pedido_itens i where i.pedido_id = p_pedido and i.produto_id is not null));
  if v_reg.id is null then
    return;
  end if;
  update public.pedidos
     set desconto = desconto + taxa_entrega, total = subtotal - desconto, frete_gratis = v_reg.nome
   where id = p_pedido;
end;
$$;
revoke execute on function private.aplicar_frete_gratis(uuid) from anon, public;

-- Para o cardápio: as regras de frete grátis em vigor (valores em centavos).
create or replace function public.frete_gratis_publico(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'nome', f.nome, 'pedido_minimo', round(f.pedido_minimo * 100), 'bairros', f.bairros, 'km_max', f.km_max,
           'produtos', f.produtos,
           'produtos_nomes', (select jsonb_agg(p.nome order by p.nome) from public.produtos p where p.id = any (f.produtos)))
         order by f.pedido_minimo), '[]'::jsonb)
    from public.marcas m join public.frete_gratis f on f.loja_id = m.loja_id
   where m.slug = lower(btrim(p_slug)) and m.ativa and f.ativo and (f.marca_id is null or f.marca_id = m.id)
     and private.agenda_vale(f.loja_id, f.dias, null, null, f.valido_ate);
$$;
grant execute on function public.frete_gratis_publico(text) to anon, authenticated;

-- Conferir o cupom no cardápio, agora com bairro, km e itens [{produto_id, total (centavos)}].
create or replace function public.validar_cupom(p_slug text, p_codigo text, p_subtotal integer, p_taxa integer, p_tipo text, p_telefone text,
                                                p_bairro text, p_km numeric, p_itens jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_marca public.marcas;
  v_cup   public.cupons;
  v_d     numeric;
  v_base  numeric;
begin
  select * into v_marca from public.marcas where slug = lower(btrim(p_slug)) and ativa;
  if not found then
    raise exception 'Cardápio não encontrado.' using errcode = 'no_data_found';
  end if;
  v_cup := private.cupom_da_loja(v_marca.loja_id, p_codigo);
  v_base := private.base_cupom(v_cup, p_tipo, p_bairro, p_km,
              (select coalesce(jsonb_agg(jsonb_build_object('produto_id', x ->> 'produto_id', 'total', (x ->> 'total')::numeric / 100)), '[]'::jsonb)
                 from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) x));
  v_d := private.desconto_cupom(v_cup, p_subtotal / 100.0, p_taxa / 100.0, p_tipo, p_telefone);
  if v_base is not null then
    v_d := case v_cup.tipo when 'percentual' then round(v_base * v_cup.valor / 100, 2) when 'valor' then least(v_cup.valor, v_base) else v_d end;
  end if;
  return jsonb_build_object('codigo', v_cup.codigo, 'tipo', v_cup.tipo, 'desconto', round(v_d * 100),
                            'descricao', coalesce(v_cup.descricao, case v_cup.tipo when 'percentual' then to_char(v_cup.valor, 'FM990') || '% de desconto'
                                                                                   when 'valor' then 'R$ ' || replace(to_char(v_cup.valor, 'FM999990.00'), '.', ',') || ' de desconto'
                                                                                   else 'Entrega grátis' end));
end;
$$;
grant execute on function public.validar_cupom(text, text, integer, integer, text, text, text, numeric, jsonb) to anon, authenticated;

-- Pedido do cardápio digital (última versão: 0047) + frete grátis automático antes do cupom.
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

  -- frete grátis automático por área/valor/produto (0067), antes do cupom
  perform private.aplicar_frete_gratis(v_pedido);
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
