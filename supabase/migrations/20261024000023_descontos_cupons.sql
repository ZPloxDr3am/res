-- RES · 0023 · Cardápio novo (fase 3): % por categoria, cupons e desconto no balcão com limite (D-023).
--
-- * promocoes_categoria: "terça, pizzas -20%". Vale sobre o preço normal do canal; se o produto já
--   tem promoção própria valendo, fica o MENOR preço. Mesma agenda da promoção do produto.
-- * private.preco_base: preço base de um produto agora (canal, promoção própria, % da categoria).
--   Usado no preço do item, no combo e no cardápio público. Espelho: precoBase no core.
-- * cupons: código digitado no cardápio digital (ou no balcão). % do pedido, R$ fixo ou entrega grátis;
--   pedido mínimo, primeira compra, limite por cliente (telefone) e total, dias e validade, por loja.
--   pedidos.cupom_id guarda o uso: a tela conta clientes, usos e desconto dado.
-- * Balcão: desconto precisa de motivo; acima do limite da loja (lojas.limite_desconto_pct) quem não é
--   dono/gerente precisa da autorização de um gerente (senha dele gera uma autorização de uso único).

alter table public.pedidos
  add column cupom_id        uuid,
  add column cupom_codigo    text,
  add column desconto_motivo text check (desconto_motivo is null or length(desconto_motivo) <= 120),
  add column desconto_por    uuid;
alter table public.lojas add column limite_desconto_pct numeric(5, 2) check (limite_desconto_pct is null or limite_desconto_pct between 0 and 100);

-- ---------------------------------------------------------------------------
-- Agenda comum (dias/horário/último dia) — a mesma regra da promoção do produto (0021)
-- ---------------------------------------------------------------------------
create or replace function private.agenda_vale(p_loja uuid, p_dias smallint[], p_inicio time, p_fim time, p_ate date, p_quando timestamptz default now())
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_fuso  text;
  v_local timestamp;
  v_hora  time;
  v_dia   date;
begin
  select fuso_horario into v_fuso from public.lojas where id = p_loja;
  v_local := p_quando at time zone coalesce(v_fuso, 'America/Sao_Paulo');
  v_hora := v_local::time;
  v_dia := v_local::date;
  if p_inicio is not null and p_fim is not null then
    if p_inicio < p_fim then
      if not (v_hora >= p_inicio and v_hora < p_fim) then
        return false;
      end if;
    elsif v_hora < p_fim then
      v_dia := v_dia - 1;
    elsif v_hora < p_inicio then
      return false;
    end if;
  end if;
  if coalesce(cardinality(p_dias), 0) > 0 and not (extract(dow from v_dia)::smallint = any (p_dias)) then
    return false;
  end if;
  return p_ate is null or v_dia <= p_ate;
end;
$$;
revoke execute on function private.agenda_vale(uuid, smallint[], time, time, date, timestamptz) from anon, public;

create or replace function private.promo_vigente(p_pm public.produto_marcas, p_quando timestamptz default now())
returns numeric
language sql
stable
set search_path = ''
as $$
  select case when p_pm.preco_promocional is not null
                and private.agenda_vale(p_pm.loja_id, p_pm.promo_dias, p_pm.promo_inicio, p_pm.promo_fim, p_pm.promo_ate, p_quando)
              then p_pm.preco_promocional end;
$$;

-- ---------------------------------------------------------------------------
-- % de desconto por categoria
-- ---------------------------------------------------------------------------
create table public.promocoes_categoria (
  id           uuid primary key default gen_random_uuid(),
  loja_id      uuid not null,
  setor_id     uuid not null,
  percentual   numeric(5, 2) not null check (percentual > 0 and percentual <= 90),
  dias         smallint[] check (dias is null or dias <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  promo_inicio time,
  promo_fim    time,
  promo_ate    date,
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now(),
  foreign key (setor_id, loja_id) references public.setores (id, loja_id) on delete cascade,
  check ((promo_inicio is null) = (promo_fim is null) and (promo_inicio is null or promo_inicio <> promo_fim))
);
create index promocoes_categoria_setor_idx on public.promocoes_categoria (setor_id) where ativo;
alter table public.promocoes_categoria enable row level security;
create policy promocoes_categoria_ler on public.promocoes_categoria for select to authenticated using (private.e_membro(loja_id));
create policy promocoes_categoria_escrever on public.promocoes_categoria for all to authenticated
  using (private.tem_permissao(loja_id, 'cardapio')) with check (private.tem_permissao(loja_id, 'cardapio'));
create trigger promocoes_categoria_auditar after insert or update or delete on public.promocoes_categoria for each row execute function private.auditar();

-- maior % valendo agora na categoria (null = nenhuma)
create or replace function private.desconto_categoria_pct(p_setor uuid, p_quando timestamptz default now())
returns numeric
language sql
stable
set search_path = ''
as $$
  select max(pc.percentual) from public.promocoes_categoria pc
   where pc.setor_id = p_setor and pc.ativo
     and private.agenda_vale(pc.loja_id, pc.dias, pc.promo_inicio, pc.promo_fim, pc.promo_ate, p_quando);
$$;
revoke execute on function private.desconto_categoria_pct(uuid, timestamptz) from anon, public;

-- Preço base agora (reais): normal do canal; promoção própria e % da categoria valendo → o menor.
create or replace function private.preco_base(p_prod public.produtos, p_pm public.produto_marcas, p_canal text, p_quando timestamptz default now())
returns numeric
language plpgsql
stable
set search_path = ''
as $$
declare
  v_normal numeric := coalesce(case p_canal when 'delivery' then p_pm.preco_delivery else p_pm.preco_presencial end, p_prod.preco, 0);
  v_promo  numeric := private.promo_vigente(p_pm, p_quando);
  v_pct    numeric := private.desconto_categoria_pct(p_prod.setor_id, p_quando);
  v_cat    numeric;
begin
  if v_pct is not null and v_normal > 0 then
    v_cat := round(v_normal * (1 - v_pct / 100), 2);
  end if;
  return coalesce(least(v_promo, v_cat), v_normal);
end;
$$;
revoke execute on function private.preco_base(public.produtos, public.produto_marcas, text, timestamptz) from anon, public;

-- preço do item (20261024000022_combos_): base por private.preco_base
create or replace function private.preco_item(p_produto uuid, p_marca uuid, p_canal text, p_escolhas jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_prod     public.produtos;
  v_pm       public.produto_marcas;
  v_base     bigint;
  v_unitario bigint;
  g          record;
  v_esc      jsonb;
  v_total_q  integer;
  v_min      integer;
  v_valor    bigint;
  v_linhas   jsonb := '[]'::jsonb;
  v_desconhecida text;
  v_rows     jsonb;
  v_grupo_linhas jsonb;
begin
  if p_canal not in ('delivery', 'presencial') then
    raise exception 'Canal inválido' using errcode = 'invalid_parameter_value';
  end if;
  select * into v_prod from public.produtos where id = p_produto;
  if not found then
    raise exception 'Produto não encontrado' using errcode = 'no_data_found';
  end if;
  -- combo: preço do combo + adicionais das escolhas (0022)
  if v_prod.combo then
    return private.preco_combo(p_produto, p_marca, p_canal, coalesce(p_escolhas -> 'passos', '[]'::jsonb));
  end if;
  select * into v_pm from public.produto_marcas where produto_id = p_produto and marca_id = p_marca;
  if not found or not v_pm.ativo or not (case p_canal when 'delivery' then v_pm.delivery else v_pm.presencial end) then
    raise exception '"%" não está disponível neste canal.', v_prod.nome using errcode = 'check_violation';
  end if;

  -- promocional → preço do canal → preço padrão → 0
  v_base := round(100 * private.preco_base(v_prod, v_pm, p_canal));
  v_unitario := v_base;

  -- grupo escolhido que não pertence ao produto
  select k into v_desconhecida from jsonb_object_keys(coalesce(p_escolhas, '{}'::jsonb)) k
   where not exists (select 1 from public.produto_grupos pg where pg.produto_id = p_produto and pg.grupo_id::text = k)
   limit 1;
  if v_desconhecida is not null then
    raise exception 'Grupo de opções não pertence a "%".', v_prod.nome using errcode = 'check_violation';
  end if;

  for g in
    select go.* from public.produto_grupos pg join public.grupos_opcoes go on go.id = pg.grupo_id
     where pg.produto_id = p_produto
       and go.ativo and (case p_canal when 'delivery' then go.delivery else go.presencial end)
     order by pg.ordem
  loop
    v_esc := coalesce(p_escolhas -> g.id::text, '{}'::jsonb);

    -- escolhas com preço resolvido (preço do canal → preço da opção → preço do item)
    select coalesce(jsonb_agg(jsonb_build_object(
             'opcao_id', o.id, 'nome', coalesce(o.nome, c.nome, p.nome), 'q', (e.value)::numeric,
             'preco', round(100 * coalesce(case p_canal when 'delivery' then o.preco_delivery else o.preco_presencial end, o.preco, c.preco, p.preco, 0)),
             'visivel', o.id is not null and o.ativo and (case p_canal when 'delivery' then o.delivery else o.presencial end),
             'max_qtd', o.max_qtd)), '[]'::jsonb)
      into v_rows
      from jsonb_each_text(v_esc) e
      left join public.opcoes o on o.id::text = e.key and o.grupo_id = g.id
      left join public.complementos c on c.id = o.complemento_id
      left join public.produtos p on p.id = o.produto_id
     where e.value ~ '^-?[0-9]+(\.[0-9]+)?$' and (e.value)::numeric > 0;

    if exists (select 1 from jsonb_to_recordset(v_rows) r(visivel boolean) where not r.visivel) then
      raise exception 'Opção indisponível em "%".', g.nome using errcode = 'check_violation';
    end if;
    if exists (select 1 from jsonb_to_recordset(v_rows) r(q numeric) where r.q <> trunc(r.q)) then
      raise exception 'Quantidade inválida em "%".', g.nome using errcode = 'check_violation';
    end if;

    select coalesce(sum(r.q), 0) into v_total_q from jsonb_to_recordset(v_rows) r(q integer);
    v_min := case when g.obrigatorio then greatest(1, g.min_qtd) else g.min_qtd end;
    if v_total_q < v_min then
      raise exception 'Escolha pelo menos % em "%".', v_min, g.nome using errcode = 'check_violation';
    end if;
    if v_total_q > g.max_qtd then
      raise exception 'Escolha no máximo % em "%".', g.max_qtd, g.nome using errcode = 'check_violation';
    end if;
    if not g.permite_repetir and exists (select 1 from jsonb_to_recordset(v_rows) r(q integer) where r.q > 1) then
      raise exception 'Uma opção não pode repetir em "%".', g.nome using errcode = 'check_violation';
    end if;
    if exists (select 1 from jsonb_to_recordset(v_rows) r(q integer, max_qtd integer) where r.q > r.max_qtd) then
      raise exception 'Quantidade acima do limite de uma opção em "%".', g.nome using errcode = 'check_violation';
    end if;

    if v_total_q > 0 then
      select case g.formacao
               when 'brinde' then 0
               when 'soma' then sum(r.preco * r.q)
               when 'maior' then max(r.preco)
               when 'proporcional' then round(sum(r.preco * r.q)::numeric / v_total_q)
             end,
             jsonb_agg(jsonb_build_object(
               'grupo_id', g.id, 'grupo_nome', g.nome, 'opcao_id', r.opcao_id, 'nome', r.nome, 'quantidade', r.q,
               'preco', r.preco, 'fracao', case when g.pizza then round(r.q::numeric / v_total_q, 4) end))
        into v_valor, v_grupo_linhas
        from jsonb_to_recordset(v_rows) r(opcao_id uuid, nome text, q integer, preco bigint);
      v_unitario := v_unitario + v_valor;
      v_linhas := v_linhas || v_grupo_linhas;
    end if;
  end loop;

  return jsonb_build_object('base', v_base, 'unitario', v_unitario, 'opcoes', v_linhas);
end;
$$;

-- preço do combo (20261024000022_combos_): base por private.preco_base
create or replace function private.preco_combo(p_combo uuid, p_marca uuid, p_canal text, p_passos jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_prod   public.produtos;
  v_pm     public.produto_marcas;
  v_filho  record;
  v_base   bigint;
  v_extra  bigint := 0;
  v_n      integer;
  v_calc   jsonb;
  v_opcoes jsonb := '[]'::jsonb;
  ps       record;
  esc      jsonb;
begin
  select * into v_prod from public.produtos where id = p_combo;
  select * into v_pm from public.produto_marcas where produto_id = p_combo and marca_id = p_marca;
  if not found or not v_pm.ativo or not (case p_canal when 'delivery' then v_pm.delivery else v_pm.presencial end) then
    raise exception '"%" não está disponível neste canal.', v_prod.nome using errcode = 'check_violation';
  end if;
  v_base := round(100 * private.preco_base(v_prod, v_pm, p_canal));
  if jsonb_typeof(p_passos) is distinct from 'array' then
    raise exception 'Monte o combo "%".', v_prod.nome using errcode = 'check_violation';
  end if;
  if exists (select 1 from jsonb_array_elements(p_passos) e
              where not exists (select 1 from public.combo_passos cp where cp.combo_id = p_combo and cp.id::text = e ->> 'passo_id')) then
    raise exception 'Escolha inválida no combo "%".', v_prod.nome using errcode = 'check_violation';
  end if;

  for ps in select * from public.combo_passos cp where cp.combo_id = p_combo order by cp.ordem loop
    select count(*) into v_n from jsonb_array_elements(p_passos) e where e ->> 'passo_id' = ps.id::text;
    if v_n <> ps.quantidade then
      raise exception 'Escolha % em "%" (combo "%").', ps.quantidade, ps.titulo, v_prod.nome using errcode = 'check_violation';
    end if;
    for esc in select e from jsonb_array_elements(p_passos) e where e ->> 'passo_id' = ps.id::text loop
      select * into v_filho from public.produtos p
       where p.id = (esc ->> 'produto_id')::uuid and p.loja_id = v_prod.loja_id and not p.combo
         and (p.id = any (ps.produtos) or (ps.setor_id is not null and p.setor_id = ps.setor_id));
      if not found then
        raise exception 'Produto que não vale em "%" (combo "%").', ps.titulo, v_prod.nome using errcode = 'check_violation';
      end if;
      v_calc := private.preco_item(v_filho.id, p_marca, p_canal, coalesce(esc -> 'escolhas', '{}'::jsonb));
      v_extra := v_extra + greatest(0, (v_calc ->> 'unitario')::bigint - (v_calc ->> 'base')::bigint);
      v_opcoes := v_opcoes
        || jsonb_build_array(jsonb_build_object('grupo_id', null, 'grupo_nome', ps.titulo, 'opcao_id', null, 'nome', v_filho.nome, 'quantidade', 1, 'preco', 0, 'fracao', null))
        || coalesce((select jsonb_agg(o || jsonb_build_object('grupo_nome', v_filho.nome || ' · ' || (o ->> 'grupo_nome'))) from jsonb_array_elements(v_calc -> 'opcoes') o), '[]'::jsonb);
    end loop;
  end loop;
  return jsonb_build_object('base', v_base, 'unitario', v_base + v_extra, 'opcoes', v_opcoes);
end;
$$;

-- cardápio público (20261024000022_combos_): preço com % da categoria
create or replace function private.produto_publico(p_produto uuid, p_marca uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'nome', p.nome, 'descricao', p.descricao, 'imagem_url', p.imagem_url, 'etiqueta', p.etiqueta,
    'preco', round(100 * private.preco_base(p, pm, 'delivery')),
    'preco_original', case when private.preco_base(p, pm, 'delivery') < coalesce(pm.preco_delivery, p.preco, 0) then round(100 * coalesce(pm.preco_delivery, p.preco, 0)) end,
    'combo', p.combo,
    'passos', case when p.combo then coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', cp.id, 'titulo', cp.titulo, 'quantidade', cp.quantidade,
               'produtos', coalesce((
                 select jsonb_agg(private.produto_publico(c.id, p_marca) order by c.ordem, c.nome)
                   from public.produtos c
                   join public.produto_marcas cpm on cpm.produto_id = c.id and cpm.marca_id = p_marca and cpm.ativo and cpm.delivery
                  where not c.combo and (c.id = any (cp.produtos) or (cp.setor_id is not null and c.setor_id = cp.setor_id))), '[]'::jsonb))
             order by cp.ordem)
        from public.combo_passos cp where cp.combo_id = p.id), '[]'::jsonb) end,
    'grupos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', g.id, 'nome', g.nome, 'formacao', g.formacao, 'obrigatorio', g.obrigatorio, 'pizza', g.pizza,
               'min', g.min_qtd, 'max', g.max_qtd, 'permite_repetir', g.permite_repetir,
               'opcoes', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', o.id, 'nome', coalesce(o.nome, c.nome, op.nome), 'max', o.max_qtd,
                          'preco', round(100 * coalesce(o.preco_delivery, o.preco, c.preco, op.preco, 0)))
                        order by o.ordem)
                   from public.opcoes o
                   left join public.complementos c on c.id = o.complemento_id
                   left join public.produtos op on op.id = o.produto_id
                  where o.grupo_id = g.id and o.ativo and o.delivery), '[]'::jsonb))
             order by pg.ordem)
        from public.produto_grupos pg join public.grupos_opcoes g on g.id = pg.grupo_id
       where pg.produto_id = p.id and g.ativo and g.delivery), '[]'::jsonb))
  from public.produtos p
  join public.produto_marcas pm on pm.produto_id = p.id and pm.marca_id = p_marca
  where p.id = p_produto;
$$;

-- ---------------------------------------------------------------------------
-- Cupons
-- ---------------------------------------------------------------------------
create type public.tipo_cupom as enum ('percentual', 'valor', 'frete');

create table public.cupons (
  id                 uuid primary key default gen_random_uuid(),
  loja_id            uuid not null references public.lojas (id) on delete cascade,
  codigo             text not null check (codigo ~ '^[A-Z0-9_-]{3,30}$'),
  descricao          text check (descricao is null or length(descricao) <= 120),
  tipo               public.tipo_cupom not null,
  valor              numeric(12, 2) not null default 0 check (valor >= 0),
  pedido_minimo      numeric(12, 2) not null default 0 check (pedido_minimo >= 0),
  primeira_compra    boolean not null default false,
  limite_por_cliente integer check (limite_por_cliente is null or limite_por_cliente >= 1),
  limite_total       integer check (limite_total is null or limite_total >= 1),
  dias               smallint[] check (dias is null or dias <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  valido_ate         date,
  ativo              boolean not null default true,
  criado_em          timestamptz not null default now(),
  check (tipo = 'frete' or valor > 0),
  check (tipo <> 'percentual' or valor <= 100)
);
create unique index cupons_codigo_idx on public.cupons (loja_id, codigo);
alter table public.cupons enable row level security;
create policy cupons_ler on public.cupons for select to authenticated using (private.e_membro(loja_id));
create policy cupons_escrever on public.cupons for all to authenticated
  using (private.tem_permissao(loja_id, 'cardapio')) with check (private.tem_permissao(loja_id, 'cardapio'));
create trigger cupons_auditar after insert or update or delete on public.cupons for each row execute function private.auditar();
create index pedidos_cupom_idx on public.pedidos (cupom_id) where cupom_id is not null;

-- Desconto (reais) que o cupom dá num pedido com este subtotal/taxa/telefone. Lança com a mensagem para o cliente.
create or replace function private.desconto_cupom(p_cupom public.cupons, p_subtotal numeric, p_taxa numeric, p_tipo_pedido text, p_telefone text, p_ignorar uuid default null)
returns numeric
language plpgsql
stable
set search_path = ''
as $$
declare
  v_tel text := nullif(regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g'), '');
begin
  if not p_cupom.ativo or not private.agenda_vale(p_cupom.loja_id, p_cupom.dias, null, null, p_cupom.valido_ate) then
    raise exception 'O cupom % não vale hoje.', p_cupom.codigo using errcode = 'check_violation';
  end if;
  if p_subtotal < p_cupom.pedido_minimo then
    raise exception 'O cupom % vale para pedidos a partir de R$ %.', p_cupom.codigo, replace(to_char(p_cupom.pedido_minimo, 'FM999990.00'), '.', ',') using errcode = 'check_violation';
  end if;
  if p_cupom.limite_total is not null
     and (select count(*) from public.pedidos p where p.cupom_id = p_cupom.id and p.status <> 'cancelado' and p.id is distinct from p_ignorar) >= p_cupom.limite_total then
    raise exception 'O cupom % esgotou.', p_cupom.codigo using errcode = 'check_violation';
  end if;
  if (p_cupom.limite_por_cliente is not null or p_cupom.primeira_compra) and v_tel is null then
    raise exception 'Informe o telefone para usar o cupom %.', p_cupom.codigo using errcode = 'check_violation';
  end if;
  if p_cupom.limite_por_cliente is not null
     and (select count(*) from public.pedidos p where p.cupom_id = p_cupom.id and p.cliente_telefone = v_tel and p.status <> 'cancelado' and p.id is distinct from p_ignorar) >= p_cupom.limite_por_cliente then
    raise exception 'Você já usou o cupom %.', p_cupom.codigo using errcode = 'check_violation';
  end if;
  if p_cupom.primeira_compra
     and exists (select 1 from public.pedidos p where p.loja_id = p_cupom.loja_id and p.cliente_telefone = v_tel and p.status <> 'cancelado' and p.id is distinct from p_ignorar) then
    raise exception 'O cupom % é só para a primeira compra.', p_cupom.codigo using errcode = 'check_violation';
  end if;
  case p_cupom.tipo
    when 'percentual' then return round(p_subtotal * p_cupom.valor / 100, 2);
    when 'valor' then return least(p_cupom.valor, p_subtotal);
    else
      if p_tipo_pedido <> 'entrega' or p_taxa <= 0 then
        raise exception 'O cupom % dá entrega grátis: vale só para pedidos de entrega.', p_cupom.codigo using errcode = 'check_violation';
      end if;
      return p_taxa;
  end case;
end;
$$;
revoke execute on function private.desconto_cupom(public.cupons, numeric, numeric, text, text, uuid) from anon, public;

create or replace function private.cupom_da_loja(p_loja uuid, p_codigo text)
returns public.cupons
language plpgsql
stable
set search_path = ''
as $$
declare
  v public.cupons;
begin
  select * into v from public.cupons c where c.loja_id = p_loja and c.codigo = upper(btrim(coalesce(p_codigo, '')));
  if not found then
    raise exception 'Cupom "%" não encontrado.', upper(btrim(coalesce(p_codigo, ''))) using errcode = 'no_data_found';
  end if;
  return v;
end;
$$;
revoke execute on function private.cupom_da_loja(uuid, text) from anon, public;

-- Aplica o cupom no pedido recém-criado (soma ao desconto que já houver).
create or replace function private.aplicar_cupom(p_pedido uuid, p_codigo text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_ped public.pedidos;
  v_cup public.cupons;
  v_d   numeric;
begin
  select * into v_ped from public.pedidos where id = p_pedido for update;
  v_cup := private.cupom_da_loja(v_ped.loja_id, p_codigo);
  v_d := private.desconto_cupom(v_cup, v_ped.subtotal, v_ped.taxa_entrega, v_ped.tipo::text, v_ped.cliente_telefone, v_ped.id);
  v_d := least(v_d, v_ped.subtotal + v_ped.taxa_entrega - v_ped.desconto);
  update public.pedidos
     set desconto = desconto + v_d, total = subtotal + taxa_entrega - (desconto + v_d), cupom_id = v_cup.id, cupom_codigo = v_cup.codigo
   where id = p_pedido;
end;
$$;
revoke execute on function private.aplicar_cupom(uuid, text) from anon, public;

-- Conferir o cupom no cardápio digital antes de enviar (valores em centavos). O banco confere de novo ao gravar.
create or replace function public.validar_cupom(p_slug text, p_codigo text, p_subtotal integer, p_taxa integer, p_tipo text, p_telefone text)
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
begin
  select * into v_marca from public.marcas where slug = lower(btrim(p_slug)) and ativa;
  if not found then
    raise exception 'Cardápio não encontrado.' using errcode = 'no_data_found';
  end if;
  v_cup := private.cupom_da_loja(v_marca.loja_id, p_codigo);
  v_d := private.desconto_cupom(v_cup, p_subtotal / 100.0, p_taxa / 100.0, p_tipo, p_telefone);
  return jsonb_build_object('codigo', v_cup.codigo, 'tipo', v_cup.tipo, 'desconto', round(v_d * 100),
                            'descricao', coalesce(v_cup.descricao, case v_cup.tipo when 'percentual' then to_char(v_cup.valor, 'FM990') || '% de desconto'
                                                                                   when 'valor' then 'R$ ' || replace(to_char(v_cup.valor, 'FM999990.00'), '.', ',') || ' de desconto'
                                                                                   else 'Entrega grátis' end));
end;
$$;
grant execute on function public.validar_cupom(text, text, integer, integer, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Autorização do gerente para desconto acima do limite (uso único, 10 minutos)
-- ---------------------------------------------------------------------------
create table public.autorizacoes_desconto (
  id             uuid primary key default gen_random_uuid(),
  loja_id        uuid not null references public.lojas (id) on delete cascade,
  autorizado_por uuid not null,
  criado_em      timestamptz not null default now(),
  expira_em      timestamptz not null default now() + interval '10 minutes',
  usada_em       timestamptz,
  pedido_id      uuid
);
alter table public.autorizacoes_desconto enable row level security;
-- sem políticas: só pelas funções abaixo

create or replace function public.autorizar_desconto(p_loja uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou um gerente desta loja pode autorizar desconto.' using errcode = 'insufficient_privilege';
  end if;
  insert into public.autorizacoes_desconto (loja_id, autorizado_por) values (p_loja, auth.uid()) returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.autorizar_desconto(uuid) to authenticated;
revoke execute on function public.autorizar_desconto(uuid) from anon, public;

-- pedido do balcão (20261021000012_agendam) + motivo/limite de desconto + cupom
create or replace function public.criar_pedido(p_loja uuid, p_marca uuid, p_dados jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dados  jsonb := p_dados;
  v_pedido uuid;
  v_ped    public.pedidos;
  v_lim    numeric;
  v_aut    public.autorizacoes_desconto;
  v_motivo text := nullif(btrim(left(p_dados ->> 'desconto_motivo', 120)), '');
begin
  if auth.uid() is null or not private.tem_permissao(p_loja, 'pedidos_delivery') then
    raise exception 'Você não tem permissão para lançar pedidos.' using errcode = 'insufficient_privilege';
  end if;
  if v_dados ->> 'tipo' = 'entrega' and v_dados ->> 'taxa_entrega' is null then
    v_dados := v_dados || jsonb_build_object('taxa_entrega', coalesce(private.taxa_bairro(p_marca, v_dados #>> '{endereco,bairro}'), 0));
  end if;
  v_pedido := private.inserir_pedido(p_loja, p_marca, v_dados, 'painel', auth.uid());
  select * into v_ped from public.pedidos where id = v_pedido;

  -- desconto do balcão: motivo e limite da loja (0023)
  if v_ped.desconto > 0 then
    if v_motivo is null then
      raise exception 'Informe o motivo do desconto.' using errcode = 'check_violation';
    end if;
    select limite_desconto_pct into v_lim from public.lojas where id = p_loja;
    if v_lim is not null and not private.e_gestor(p_loja) and v_ped.desconto > round(v_ped.subtotal * v_lim / 100, 2) then
      select * into v_aut from public.autorizacoes_desconto a
       where a.id = nullif(p_dados ->> 'autorizacao', '')::uuid and a.loja_id = p_loja and a.usada_em is null and a.expira_em > now()
       for update;
      if not found then
        raise exception 'Desconto acima do limite de %. Peça a autorização do gerente.', rtrim(rtrim(to_char(v_lim, 'FM990.00'), '0'), '.') || '%' using errcode = 'insufficient_privilege';
      end if;
      update public.autorizacoes_desconto set usada_em = now(), pedido_id = v_pedido where id = v_aut.id;
      update public.pedidos set desconto_por = v_aut.autorizado_por where id = v_pedido;
    end if;
    update public.pedidos set desconto_motivo = v_motivo where id = v_pedido;
  end if;

  if nullif(btrim(p_dados ->> 'cupom'), '') is not null then
    perform private.aplicar_cupom(v_pedido, p_dados ->> 'cupom');
  end if;
  return v_pedido;
end;
$$;

-- pedido do cardápio digital (20261021000012_agendam) + cupom
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
    v_taxa := private.taxa_bairro(v_marca.id, v_bairro);
    if v_taxa is null then
      raise exception 'Ainda não entregamos no bairro "%".', v_bairro using errcode = 'check_violation';
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

  if nullif(btrim(p_dados ->> 'cupom'), '') is not null then
    perform private.aplicar_cupom(v_pedido, p_dados ->> 'cupom');
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
  return jsonb_build_object('numero', v_ped.numero, 'codigo', v_ped.codigo, 'total', round(v_ped.total * 100));
end;
$$;
