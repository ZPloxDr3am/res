-- RES · 0032 · Programa de fidelidade: cashback e pontos nas lojas do grupo (D-031).
--
-- * fidelidade_config (uma por grupo): cashback (% padrão e por dia, dias, validade, mínimo, teto
--   por pedido) e pontos (por R$ 1, por R$ 1 de taxa, validade, bônus de boas-vindas), canais.
-- * fidelidade_recompensas: troca de pontos por desconto em R$ ou por um produto grátis.
-- * fidelidade_movimentos: extrato (ganho, uso, expirado, ajuste, estorno). Saldo = soma.
-- * Ganho NA HORA em que o pedido é concluído (pago e entregue); cancelou depois, estorna.
-- * Uso no pedido: vira desconto (pedidos.desconto) e fica detalhado em fid_cashback/fid_desconto.
--   No cardápio digital só com a "prova": o código de um pedido anterior do mesmo cliente
--   (guardado no aparelho dele), para ninguém gastar o saldo de outro só sabendo o telefone.
-- * Validade: o saldo vence N dias depois do último pedido do cliente (0 = não vence).
-- * Mesmas contas de ganhoFidelidade/cashbackUsavel (packages/core); testes com os mesmos casos.

create table public.fidelidade_config (
  grupo                  uuid primary key,
  canais                 text[] not null default '{cardapio_digital,balcao_entrega,balcao}'
                         check (canais <@ array['cardapio_digital', 'balcao_entrega', 'balcao']),
  cashback_ativo         boolean not null default false,
  cashback_pct           numeric(5, 2) not null default 5 check (cashback_pct between 0 and 50),
  cashback_pct_dia       jsonb not null default '{}'::jsonb check (jsonb_typeof(cashback_pct_dia) = 'object'),
  cashback_dias          smallint[] not null default '{0,1,2,3,4,5,6}' check (cashback_dias <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]),
  cashback_validade_dias integer not null default 60 check (cashback_validade_dias between 0 and 3650),
  cashback_minimo        numeric(12, 2) not null default 0 check (cashback_minimo >= 0),
  cashback_max_pct       numeric(5, 2) check (cashback_max_pct is null or cashback_max_pct between 1 and 100),
  pontos_ativo           boolean not null default false,
  pontos_por_real        numeric(6, 2) not null default 1 check (pontos_por_real between 0 and 100),
  pontos_por_real_taxa   numeric(6, 2) not null default 0 check (pontos_por_real_taxa between 0 and 100),
  pontos_validade_dias   integer not null default 180 check (pontos_validade_dias between 0 and 3650),
  pontos_boas_vindas     integer not null default 0 check (pontos_boas_vindas between 0 and 100000),
  atualizado_em          timestamptz not null default now(),
  atualizado_por         uuid
);

create table public.fidelidade_recompensas (
  id          uuid primary key default gen_random_uuid(),
  grupo       uuid not null,
  tipo        text not null check (tipo in ('desconto', 'produto')),
  nome        text not null check (length(btrim(nome)) between 1 and 80),
  pontos      integer not null check (pontos between 1 and 1000000),
  valor       numeric(12, 2) check (valor is null or valor > 0),
  produto_id  uuid references public.produtos (id) on delete cascade,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now(),
  check ((tipo = 'desconto' and valor is not null) or (tipo = 'produto' and produto_id is not null))
);
create index fidelidade_recompensas_grupo_idx on public.fidelidade_recompensas (grupo);

create table public.fidelidade_movimentos (
  id            bigint generated always as identity primary key,
  grupo         uuid not null,
  cliente_id    uuid not null references public.clientes (id) on delete cascade,
  tipo          text not null check (tipo in ('cashback', 'pontos')),
  natureza      text not null check (natureza in ('ganho', 'uso', 'expirado', 'ajuste', 'estorno')),
  valor         numeric(12, 2) not null,   -- + entra, - sai (cashback em R$, pontos inteiros)
  pedido_id     uuid references public.pedidos (id) on delete set null,
  recompensa_id uuid,
  motivo        text,
  criado_por    uuid,
  criado_em     timestamptz not null default now()
);
create index fidelidade_mov_cliente_idx on public.fidelidade_movimentos (cliente_id, tipo);
create index fidelidade_mov_pedido_idx on public.fidelidade_movimentos (pedido_id) where pedido_id is not null;
create index fidelidade_mov_grupo_idx on public.fidelidade_movimentos (grupo, criado_em);

-- tudo passa pelas funções abaixo
alter table public.fidelidade_config enable row level security;
alter table public.fidelidade_recompensas enable row level security;
alter table public.fidelidade_movimentos enable row level security;

alter table public.pedidos
  add column fid_cashback      numeric(12, 2) not null default 0 check (fid_cashback >= 0),
  add column fid_desconto      numeric(12, 2) not null default 0 check (fid_desconto >= 0),
  add column fid_pontos        integer not null default 0 check (fid_pontos >= 0),
  add column fid_recompensa_id uuid,
  add column cupom_desconto    numeric(12, 2) not null default 0 check (cupom_desconto >= 0);
-- pedidos antigos com cupom e sem desconto de balcão: o desconto todo foi do cupom
update public.pedidos set cupom_desconto = desconto where cupom_id is not null and desconto_motivo is null and desconto > 0;

-- ---------------------------------------------------------------------------- regras
create or replace function private.canal_fidelidade(p_origem public.origem_pedido, p_tipo public.tipo_pedido)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_origem = 'cardapio_digital' then 'cardapio_digital' when p_tipo = 'entrega' then 'balcao_entrega' else 'balcao' end;
$$;

-- Ganho de um pedido (mesma conta de ganhoFidelidade no core). Taxa de entrega não gera cashback.
create or replace function private.ganho_fidelidade(c public.fidelidade_config, p_total numeric, p_taxa numeric, p_dia integer, p_canal text, p_primeiro boolean)
returns table (cashback numeric, pontos integer)
language sql
immutable
set search_path = ''
as $$
  with b as (
    select least(p_taxa, greatest(0, p_total)) as taxa_paga, greatest(0, p_total - least(p_taxa, greatest(0, p_total))) as base,
           p_canal = any (c.canais) as canal_ok,
           case when p_dia = any (c.cashback_dias) then coalesce((c.cashback_pct_dia ->> p_dia::text)::numeric, c.cashback_pct) else 0 end as pct
  )
  select case when c.cashback_ativo and b.canal_ok then round(b.base * b.pct / 100, 2) else 0 end,
         case when c.pontos_ativo and b.canal_ok
              then (floor(b.base * c.pontos_por_real + 0.0000001) + floor(b.taxa_paga * c.pontos_por_real_taxa + 0.0000001)
                    + case when p_primeiro then c.pontos_boas_vindas else 0 end)::int
              else 0 end
    from b;
$$;

-- último pedido (não cancelado) do cliente nas lojas do grupo, fora o pedido informado
create or replace function private.ultimo_pedido_cliente(p_cliente uuid, p_excluir uuid default null)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(p.criado_em) from public.pedidos p
   where p.cliente_id = p_cliente and p.status <> 'cancelado' and p.id is distinct from p_excluir;
$$;

-- Saldo de cashback (R$) ou pontos; vencido (sem pedido há mais de N dias) = 0.
create or replace function private.saldo_fidelidade(p_cliente uuid, p_tipo text, p_excluir uuid default null)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_c     public.fidelidade_config;
  v_dias  integer;
  v_soma  numeric;
  v_ult   timestamptz;
begin
  select f.* into v_c from public.fidelidade_config f join public.clientes k on k.grupo = f.grupo where k.id = p_cliente;
  select coalesce(sum(valor), 0) into v_soma from public.fidelidade_movimentos where cliente_id = p_cliente and tipo = p_tipo;
  if v_soma <= 0 then
    return 0;
  end if;
  v_dias := case when p_tipo = 'cashback' then coalesce(v_c.cashback_validade_dias, 0) else coalesce(v_c.pontos_validade_dias, 0) end;
  if v_dias > 0 then
    v_ult := private.ultimo_pedido_cliente(p_cliente, p_excluir);
    if v_ult is not null and v_ult < now() - make_interval(days => v_dias) then
      return 0;
    end if;
  end if;
  return v_soma;
end;
$$;

-- Registra o vencimento (saldo antigo some do extrato) antes de um ganho ou uso novo.
create or replace function private.expirar_fidelidade(p_cliente uuid, p_tipo text, p_excluir uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_soma numeric;
begin
  select coalesce(sum(valor), 0) into v_soma from public.fidelidade_movimentos where cliente_id = p_cliente and tipo = p_tipo;
  if v_soma > 0 and private.saldo_fidelidade(p_cliente, p_tipo, p_excluir) = 0 then
    insert into public.fidelidade_movimentos (grupo, cliente_id, tipo, natureza, valor, motivo)
    select k.grupo, k.id, p_tipo, 'expirado', -v_soma, 'Venceu: sem pedido dentro da validade'
      from public.clientes k where k.id = p_cliente;
  end if;
end;
$$;

-- Usa cashback e/ou uma recompensa de pontos no pedido recém-criado.
-- p_dados: {"cashback": centavos (quanto quer usar), "recompensa": uuid}
create or replace function private.aplicar_fidelidade(p_pedido uuid, p_dados jsonb, p_publico boolean, p_prova uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped    public.pedidos;
  v_c      public.fidelidade_config;
  v_grupo  uuid;
  v_fuso   text;
  v_canal  text;
  v_dia    integer;
  v_pagar  numeric;
  v_saldo  numeric;
  v_quer   numeric;
  v_teto   numeric;
  v_usar   numeric;
  v_rec    public.fidelidade_recompensas;
  v_preco  numeric;
  v_prod   text;
begin
  select * into v_ped from public.pedidos where id = p_pedido for update;
  if v_ped.cliente_id is null then
    raise exception 'Para usar cashback ou pontos, informe o telefone do cliente.' using errcode = 'check_violation';
  end if;
  v_grupo := private.grupo_da_loja(v_ped.loja_id);
  select * into v_c from public.fidelidade_config where grupo = v_grupo;
  select fuso_horario into v_fuso from public.lojas where id = v_ped.loja_id;
  v_canal := private.canal_fidelidade(v_ped.origem, v_ped.tipo);
  v_dia := extract(dow from now() at time zone v_fuso)::int;
  if v_c.grupo is null or not (v_canal = any (v_c.canais)) then
    raise exception 'O programa de fidelidade não vale para este tipo de pedido.' using errcode = 'check_violation';
  end if;
  if p_publico and not exists (select 1 from public.pedidos q where q.codigo = p_prova and q.cliente_id = v_ped.cliente_id and q.id <> v_ped.id) then
    raise exception 'Para usar seu saldo, peça pelo mesmo celular do seu último pedido ou fale com a loja.' using errcode = 'insufficient_privilege';
  end if;

  -- recompensa de pontos
  if nullif(p_dados ->> 'recompensa', '') is not null then
    select * into v_rec from public.fidelidade_recompensas
     where id = (p_dados ->> 'recompensa')::uuid and grupo = v_grupo and ativo;
    if v_rec.id is null or not v_c.pontos_ativo then
      raise exception 'Recompensa indisponível.' using errcode = 'check_violation';
    end if;
    v_pagar := v_ped.subtotal + v_ped.taxa_entrega - v_ped.desconto;
    if v_rec.tipo = 'desconto' then
      v_usar := least(v_rec.valor, v_pagar);
    else
      select nome into v_prod from public.produtos where id = v_rec.produto_id;
      select min(i.total / i.quantidade) into v_preco from public.pedido_itens i
       where i.pedido_id = v_ped.id and (i.produto_id = v_rec.produto_id or lower(btrim(i.nome)) = lower(btrim(v_prod)));
      if v_preco is null then
        raise exception 'Coloque "%" no pedido para resgatar a recompensa.', v_prod using errcode = 'check_violation';
      end if;
      v_usar := least(v_preco, v_pagar);
    end if;
    perform private.expirar_fidelidade(v_ped.cliente_id, 'pontos', v_ped.id);
    v_saldo := private.saldo_fidelidade(v_ped.cliente_id, 'pontos', v_ped.id);
    if v_saldo < v_rec.pontos then
      raise exception 'Pontos insuficientes: o cliente tem % e a recompensa pede %.', v_saldo::int, v_rec.pontos using errcode = 'check_violation';
    end if;
    update public.pedidos
       set desconto = desconto + v_usar, total = subtotal + taxa_entrega - (desconto + v_usar),
           fid_desconto = v_usar, fid_pontos = v_rec.pontos, fid_recompensa_id = v_rec.id
     where id = v_ped.id
     returning * into v_ped;
    insert into public.fidelidade_movimentos (grupo, cliente_id, tipo, natureza, valor, pedido_id, recompensa_id, motivo)
    values (v_grupo, v_ped.cliente_id, 'pontos', 'uso', -v_rec.pontos, v_ped.id, v_rec.id, v_rec.nome);
  end if;

  -- cashback (mesma conta de cashbackUsavel no core)
  if coalesce((p_dados ->> 'cashback')::numeric, 0) > 0 then
    v_quer := (p_dados ->> 'cashback')::numeric / 100;
    if not v_c.cashback_ativo or not (v_dia = any (v_c.cashback_dias)) then
      raise exception 'O cashback não pode ser usado hoje.' using errcode = 'check_violation';
    end if;
    perform private.expirar_fidelidade(v_ped.cliente_id, 'cashback', v_ped.id);
    v_saldo := private.saldo_fidelidade(v_ped.cliente_id, 'cashback', v_ped.id);
    if v_saldo <= 0 or v_saldo < v_c.cashback_minimo then
      raise exception 'Saldo de cashback insuficiente (mínimo para usar: R$ %).', replace(to_char(v_c.cashback_minimo, 'FM999990.00'), '.', ',') using errcode = 'check_violation';
    end if;
    v_pagar := v_ped.subtotal + v_ped.taxa_entrega - v_ped.desconto;
    v_teto := case when v_c.cashback_max_pct is null then v_pagar else trunc(v_pagar * v_c.cashback_max_pct / 100, 2) end;
    v_usar := greatest(0, least(v_quer, v_saldo, v_teto, v_pagar));
    if v_usar > 0 then
      update public.pedidos
         set desconto = desconto + v_usar, total = subtotal + taxa_entrega - (desconto + v_usar), fid_cashback = v_usar
       where id = v_ped.id;
      insert into public.fidelidade_movimentos (grupo, cliente_id, tipo, natureza, valor, pedido_id, motivo)
      values (v_grupo, v_ped.cliente_id, 'cashback', 'uso', -v_usar, v_ped.id, 'Usado no pedido');
    end if;
  end if;
end;
$$;
revoke execute on function private.aplicar_fidelidade(uuid, jsonb, boolean, uuid) from anon, public, authenticated;

-- Ganha ao concluir; cancelou, devolve o que usou e tira o que ganhou.
create or replace function private.fidelidade_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c     public.fidelidade_config;
  v_grupo uuid;
  v_fuso  text;
  v_g     record;
  v_prim  boolean;
begin
  if new.cliente_id is null or new.status = old.status then
    return null;
  end if;
  v_grupo := private.grupo_da_loja(new.loja_id);

  if new.status = 'cancelado' then
    insert into public.fidelidade_movimentos (grupo, cliente_id, tipo, natureza, valor, pedido_id, motivo)
    select v_grupo, new.cliente_id, m.tipo, 'estorno', -sum(m.valor), new.id, 'Pedido cancelado'
      from public.fidelidade_movimentos m
     where m.pedido_id = new.id and m.natureza in ('ganho', 'uso', 'estorno')
     group by m.tipo
    having sum(m.valor) <> 0;
    return null;
  end if;

  if new.status <> 'concluido' or exists (select 1 from public.fidelidade_movimentos where pedido_id = new.id and natureza = 'ganho') then
    return null;
  end if;
  select * into v_c from public.fidelidade_config where grupo = v_grupo;
  if v_c.grupo is null or not (v_c.cashback_ativo or v_c.pontos_ativo) then
    return null;
  end if;
  select fuso_horario into v_fuso from public.lojas where id = new.loja_id;
  v_prim := not exists (select 1 from public.pedidos q where q.cliente_id = new.cliente_id and q.status = 'concluido' and q.id <> new.id);
  select * into v_g from private.ganho_fidelidade(v_c, new.total, new.taxa_entrega, extract(dow from new.criado_em at time zone v_fuso)::int,
                                                   private.canal_fidelidade(new.origem, new.tipo), v_prim);
  if v_g.cashback > 0 then
    perform private.expirar_fidelidade(new.cliente_id, 'cashback', new.id);
    insert into public.fidelidade_movimentos (grupo, cliente_id, tipo, natureza, valor, pedido_id, motivo)
    values (v_grupo, new.cliente_id, 'cashback', 'ganho', v_g.cashback, new.id, 'Pedido concluído');
  end if;
  if v_g.pontos > 0 then
    perform private.expirar_fidelidade(new.cliente_id, 'pontos', new.id);
    insert into public.fidelidade_movimentos (grupo, cliente_id, tipo, natureza, valor, pedido_id, motivo)
    values (v_grupo, new.cliente_id, 'pontos', 'ganho', v_g.pontos, new.id, case when v_prim and v_c.pontos_boas_vindas > 0 then 'Pedido concluído + boas-vindas' else 'Pedido concluído' end);
  end if;
  return null;
end;
$$;
create trigger pedidos_fidelidade after update of status on public.pedidos for each row execute function private.fidelidade_status();

-- ---------------------------------------------------------------------------- cupom (0023) + desconto do cupom guardado
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
     set desconto = desconto + v_d, total = subtotal + taxa_entrega - (desconto + v_d), cupom_id = v_cup.id, cupom_codigo = v_cup.codigo,
         cupom_desconto = v_d
   where id = p_pedido;
end;
$$;


-- ---------------------------------------------------------------------------- pedidos aceitam "fidelidade"
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
  -- cashback / recompensa de pontos (0032)
  if jsonb_typeof(p_dados -> 'fidelidade') = 'object' then
    perform private.aplicar_fidelidade(v_pedido, p_dados -> 'fidelidade', false, null);
  end if;
  return v_pedido;
end;
$$;


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


-- ---------------------------------------------------------------------------- acompanhamento (0028) + cashback/pontos
create or replace function public.acompanhar_pedido(p_codigo uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'numero', p.numero, 'status', p.status, 'tipo', p.tipo, 'marca', m.nome, 'slug', m.slug, 'fuso', l.fuso_horario,
    'criado_em', p.criado_em, 'agendado_para', p.agendado_para, 'aceito_em', p.aceito_em, 'pronto_em', p.pronto_em, 'saiu_em', p.saiu_em,
    'concluido_em', p.concluido_em, 'cancelado_em', p.cancelado_em, 'motivo_cancelamento', p.motivo_cancelamento,
    'subtotal', round(p.subtotal * 100), 'taxa_entrega', round(p.taxa_entrega * 100), 'total', round(p.total * 100),
    'pagamento', p.pagamento, 'troco_para', round(p.troco_para * 100), 'tempo_preparo_min', l.tempo_preparo_min,
    'prazo', coalesce(p.agendado_para, p.criado_em + make_interval(mins => l.prazo_entrega_min)),
    'previsao_chegada', case when p.status = 'em_entrega' then p.previsao_chegada end,
    'motoboy_nome', case when p.status = 'em_entrega' then split_part(btrim(p.entregador_nome), ' ', 1) end,
    'paradas_antes', case when p.status = 'em_entrega' then (
        select count(*) from public.pedidos q
         where q.entregador_id = p.entregador_id and q.status = 'em_entrega' and q.id <> p.id
           and q.rota_ordem is not null and p.rota_ordem is not null and q.rota_ordem < p.rota_ordem) end,
    'destino', case when p.status = 'em_entrega' and p.destino_lat is not null then jsonb_build_object('lat', p.destino_lat, 'lng', p.destino_lng) end,
    'fidelidade', jsonb_build_object(
        'cashback_usado', round(p.fid_cashback * 100), 'pontos_usados', p.fid_pontos,
        'cashback_ganho', (select round(coalesce(sum(f.valor), 0) * 100) from public.fidelidade_movimentos f where f.pedido_id = p.id and f.tipo = 'cashback' and f.natureza = 'ganho'),
        'pontos_ganhos', (select coalesce(sum(f.valor), 0)::int from public.fidelidade_movimentos f where f.pedido_id = p.id and f.tipo = 'pontos' and f.natureza = 'ganho')),
    'motoboy', (select jsonb_build_object('lat', ml.lat, 'lng', ml.lng, 'em', ml.em)
                  from public.motoboy_local ml
                 where p.status = 'em_entrega' and ml.entregador_id = p.entregador_id and ml.em > now() - interval '3 minutes'
                   -- só quando este pedido é a próxima parada
                   and not exists (select 1 from public.pedidos q
                                    where q.entregador_id = p.entregador_id and q.status = 'em_entrega' and q.id <> p.id
                                      and (p.rota_ordem is null or (q.rota_ordem is not null and q.rota_ordem < p.rota_ordem)))),
    'itens', coalesce((select jsonb_agg(jsonb_build_object(
                          'nome', i.nome, 'quantidade', i.quantidade, 'total', round(i.total * 100),
                          'opcoes', coalesce((select jsonb_agg(jsonb_build_object('nome', o.nome, 'quantidade', o.quantidade, 'fracao', o.fracao))
                                                from public.pedido_item_opcoes o where o.item_id = i.id), '[]'::jsonb))
                        order by i.ordem)
                         from public.pedido_itens i where i.pedido_id = p.id), '[]'::jsonb))
  from public.pedidos p
  join public.marcas m on m.id = p.marca_id
  join public.lojas l on l.id = p.loja_id
  where p.codigo = p_codigo;
$$;


-- ---------------------------------------------------------------------------- telas
create or replace function private.pode_gerir_fidelidade(p_loja uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.e_gestor(p_loja) or private.tem_permissao(p_loja, 'marketing');
$$;

create or replace function private.config_fidelidade_json(c public.fidelidade_config)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case when c.grupo is null then null else jsonb_build_object(
    'canais', to_jsonb(c.canais), 'cashbackAtivo', c.cashback_ativo, 'cashbackPct', c.cashback_pct,
    'cashbackPctDia', c.cashback_pct_dia, 'cashbackDias', to_jsonb(c.cashback_dias), 'cashbackValidadeDias', c.cashback_validade_dias,
    'cashbackMinimo', round(c.cashback_minimo * 100), 'cashbackMaxPct', c.cashback_max_pct,
    'pontosAtivo', c.pontos_ativo, 'pontosPorReal', c.pontos_por_real, 'pontosPorRealTaxa', c.pontos_por_real_taxa,
    'pontosValidadeDias', c.pontos_validade_dias, 'pontosBoasVindas', c.pontos_boas_vindas) end;
$$;

create or replace function private.recompensas_json(p_grupo uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'tipo', r.tipo, 'nome', r.nome, 'pontos', r.pontos,
                                               'valor', round(r.valor * 100), 'produto_id', r.produto_id, 'produto', p.nome)
                            order by r.pontos), '[]'::jsonb)
    from public.fidelidade_recompensas r left join public.produtos p on p.id = r.produto_id
   where r.grupo = p_grupo and r.ativo;
$$;

-- Tela Fidelidade: configuração, recompensas e números do saldo.
create or replace function public.painel_fidelidade(p_loja uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_grupo uuid := private.grupo_da_loja(p_loja);
  v_c     public.fidelidade_config;
begin
  if not (private.pode_gerir_fidelidade(p_loja) or private.tem_permissao(p_loja, 'clientes')) then
    raise exception 'Você não tem acesso à fidelidade.' using errcode = 'insufficient_privilege';
  end if;
  select * into v_c from public.fidelidade_config where grupo = v_grupo;
  return jsonb_build_object(
    'config', private.config_fidelidade_json(v_c),
    'pode_editar', private.pode_gerir_fidelidade(p_loja),
    'recompensas', private.recompensas_json(v_grupo),
    'produtos', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'loja', l.nome) order by p.nome)
                            from public.produtos p join public.lojas l on l.id = p.loja_id
                           where p.loja_id = any (private.lojas_grupo(p_loja))), '[]'::jsonb));
end;
$$;

create or replace function public.salvar_config_fidelidade(p_loja uuid, p_cfg jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grupo uuid := private.grupo_da_loja(p_loja);
begin
  if not private.pode_gerir_fidelidade(p_loja) then
    raise exception 'Só o gestor (ou quem cuida do marketing) muda a fidelidade.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(jsonb_array_length(p_cfg -> 'canais'), 0) = 0 then
    raise exception 'Escolha pelo menos um canal.' using errcode = 'check_violation';
  end if;
  insert into public.fidelidade_config as f (grupo, canais, cashback_ativo, cashback_pct, cashback_pct_dia, cashback_dias, cashback_validade_dias,
                                             cashback_minimo, cashback_max_pct, pontos_ativo, pontos_por_real, pontos_por_real_taxa,
                                             pontos_validade_dias, pontos_boas_vindas, atualizado_em, atualizado_por)
  values (v_grupo,
          array(select jsonb_array_elements_text(p_cfg -> 'canais')),
          coalesce((p_cfg ->> 'cashbackAtivo')::boolean, false),
          coalesce((p_cfg ->> 'cashbackPct')::numeric, 5),
          coalesce(p_cfg -> 'cashbackPctDia', '{}'::jsonb),
          coalesce(array(select jsonb_array_elements_text(p_cfg -> 'cashbackDias')::smallint), '{0,1,2,3,4,5,6}'),
          coalesce((p_cfg ->> 'cashbackValidadeDias')::int, 60),
          coalesce((p_cfg ->> 'cashbackMinimo')::numeric, 0) / 100,
          nullif(p_cfg ->> 'cashbackMaxPct', '')::numeric,
          coalesce((p_cfg ->> 'pontosAtivo')::boolean, false),
          coalesce((p_cfg ->> 'pontosPorReal')::numeric, 1),
          coalesce((p_cfg ->> 'pontosPorRealTaxa')::numeric, 0),
          coalesce((p_cfg ->> 'pontosValidadeDias')::int, 180),
          coalesce((p_cfg ->> 'pontosBoasVindas')::int, 0),
          now(), auth.uid())
  on conflict (grupo) do update set
    canais = excluded.canais, cashback_ativo = excluded.cashback_ativo, cashback_pct = excluded.cashback_pct,
    cashback_pct_dia = excluded.cashback_pct_dia, cashback_dias = excluded.cashback_dias, cashback_validade_dias = excluded.cashback_validade_dias,
    cashback_minimo = excluded.cashback_minimo, cashback_max_pct = excluded.cashback_max_pct, pontos_ativo = excluded.pontos_ativo,
    pontos_por_real = excluded.pontos_por_real, pontos_por_real_taxa = excluded.pontos_por_real_taxa,
    pontos_validade_dias = excluded.pontos_validade_dias, pontos_boas_vindas = excluded.pontos_boas_vindas,
    atualizado_em = now(), atualizado_por = auth.uid();
  -- % por dia: só números entre 0 e 50
  if exists (select 1 from public.fidelidade_config f, jsonb_each_text(f.cashback_pct_dia) d
              where f.grupo = v_grupo and (d.key !~ '^[0-6]$' or d.value::numeric not between 0 and 50)) then
    raise exception 'Percentual por dia inválido (0 a 50%%).' using errcode = 'check_violation';
  end if;
end;
$$;

create or replace function public.salvar_recompensa(p_loja uuid, p_id uuid, p_dados jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_grupo uuid := private.grupo_da_loja(p_loja);
  v_id    uuid;
begin
  if not private.pode_gerir_fidelidade(p_loja) then
    raise exception 'Só o gestor (ou quem cuida do marketing) muda a fidelidade.' using errcode = 'insufficient_privilege';
  end if;
  if p_dados ->> 'tipo' = 'produto' and not exists (
       select 1 from public.produtos where id = (p_dados ->> 'produto_id')::uuid and loja_id = any (private.lojas_grupo(p_loja))) then
    raise exception 'Escolha um produto das lojas do grupo.' using errcode = 'check_violation';
  end if;
  if p_id is null then
    insert into public.fidelidade_recompensas (grupo, tipo, nome, pontos, valor, produto_id)
    values (v_grupo, p_dados ->> 'tipo', btrim(p_dados ->> 'nome'), (p_dados ->> 'pontos')::int,
            case when p_dados ->> 'tipo' = 'desconto' then (p_dados ->> 'valor')::numeric / 100 end,
            case when p_dados ->> 'tipo' = 'produto' then (p_dados ->> 'produto_id')::uuid end)
    returning id into v_id;
  else
    update public.fidelidade_recompensas
       set nome = btrim(p_dados ->> 'nome'), pontos = (p_dados ->> 'pontos')::int, tipo = p_dados ->> 'tipo',
           valor = case when p_dados ->> 'tipo' = 'desconto' then (p_dados ->> 'valor')::numeric / 100 end,
           produto_id = case when p_dados ->> 'tipo' = 'produto' then (p_dados ->> 'produto_id')::uuid end
     where id = p_id and grupo = v_grupo
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.excluir_recompensa(p_loja uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.pode_gerir_fidelidade(p_loja) then
    raise exception 'Só o gestor (ou quem cuida do marketing) muda a fidelidade.' using errcode = 'insufficient_privilege';
  end if;
  update public.fidelidade_recompensas set ativo = false where id = p_id and grupo = private.grupo_da_loja(p_loja);
end;
$$;

-- Saldo de cada cliente (só quem tem saldo), com vencimento.
create or replace function public.saldos_fidelidade(p_loja uuid, p_termo text default '', p_limite integer default 50, p_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_grupo uuid := private.grupo_da_loja(p_loja);
  v_c     public.fidelidade_config;
  v_txt   text := btrim(coalesce(p_termo, ''));
  v_dig   text := regexp_replace(coalesce(p_termo, ''), '\D', '', 'g');
begin
  if not (private.pode_gerir_fidelidade(p_loja) or private.tem_permissao(p_loja, 'clientes')) then
    raise exception 'Você não tem acesso à fidelidade.' using errcode = 'insufficient_privilege';
  end if;
  select * into v_c from public.fidelidade_config where grupo = v_grupo;
  return (
    with s as (
      select k.id, k.nome, k.telefone,
             private.saldo_fidelidade(k.id, 'cashback') as cashback,
             private.saldo_fidelidade(k.id, 'pontos') as pontos,
             private.ultimo_pedido_cliente(k.id) as ultimo
        from public.clientes k
       where k.grupo = v_grupo
         and exists (select 1 from public.fidelidade_movimentos m where m.cliente_id = k.id)
         and (v_txt = '' or (length(v_dig) >= 4 and k.telefone like '%' || v_dig || '%')
              or (v_dig = '' and lower(k.nome) like '%' || lower(replace(replace(v_txt, '%', ''), '_', '')) || '%'))
    ), com as (select * from s where cashback > 0 or pontos > 0)
    select jsonb_build_object(
      'total_clientes', (select count(*) from com),
      'total_cashback', (select round(coalesce(sum(cashback), 0) * 100) from com),
      'total_pontos', (select coalesce(sum(pontos), 0)::int from com),
      'clientes', coalesce((select jsonb_agg(jsonb_build_object(
                     'id', x.id, 'nome', x.nome, 'telefone', x.telefone, 'cashback', round(x.cashback * 100), 'pontos', x.pontos::int,
                     'ultimo_pedido_em', x.ultimo,
                     'cashback_vence_em', case when coalesce(v_c.cashback_validade_dias, 0) > 0 and x.cashback > 0 then x.ultimo + make_interval(days => v_c.cashback_validade_dias) end,
                     'pontos_vence_em', case when coalesce(v_c.pontos_validade_dias, 0) > 0 and x.pontos > 0 then x.ultimo + make_interval(days => v_c.pontos_validade_dias) end)
                   order by x.cashback desc, x.pontos desc)
                   from (select * from com order by cashback desc, pontos desc
                         limit greatest(1, least(coalesce(p_limite, 50), 200)) offset greatest(0, coalesce(p_offset, 0))) x), '[]'::jsonb)));
end;
$$;

create or replace function public.extrato_fidelidade(p_loja uuid, p_cliente uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.pode_gerir_fidelidade(p_loja) or private.tem_permissao(p_loja, 'clientes')) then
    raise exception 'Você não tem acesso à fidelidade.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('tipo', m.tipo, 'natureza', m.natureza,
                                        'valor', case when m.tipo = 'cashback' then round(m.valor * 100) else m.valor end,
                                        'pedido', p.numero, 'loja', l.nome, 'motivo', m.motivo, 'em', m.criado_em) order by m.criado_em desc, m.id desc)
      from (select * from public.fidelidade_movimentos where cliente_id = p_cliente and grupo = private.grupo_da_loja(p_loja)
             order by criado_em desc, id desc limit 100) m
      left join public.pedidos p on p.id = m.pedido_id
      left join public.lojas l on l.id = p.loja_id), '[]'::jsonb);
end;
$$;

-- Ajuste manual (presente, correção). Não deixa o saldo negativo.
create or replace function public.ajustar_fidelidade(p_loja uuid, p_cliente uuid, p_tipo text, p_valor numeric, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_valor numeric := case when p_tipo = 'cashback' then round(p_valor / 100, 2) else round(p_valor) end;
begin
  if not private.pode_gerir_fidelidade(p_loja) then
    raise exception 'Só o gestor (ou quem cuida do marketing) ajusta saldo.' using errcode = 'insufficient_privilege';
  end if;
  if length(btrim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'Informe o motivo do ajuste.' using errcode = 'check_violation';
  end if;
  if p_tipo not in ('cashback', 'pontos') or v_valor = 0 then
    raise exception 'Ajuste inválido.' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.clientes where id = p_cliente and grupo = private.grupo_da_loja(p_loja)) then
    raise exception 'Cliente não encontrado.' using errcode = 'no_data_found';
  end if;
  perform private.expirar_fidelidade(p_cliente, p_tipo, null);
  if private.saldo_fidelidade(p_cliente, p_tipo) + v_valor < 0 then
    raise exception 'O ajuste deixaria o saldo negativo.' using errcode = 'check_violation';
  end if;
  insert into public.fidelidade_movimentos (grupo, cliente_id, tipo, natureza, valor, motivo, criado_por)
  values (private.grupo_da_loja(p_loja), p_cliente, p_tipo, 'ajuste', v_valor, btrim(left(p_motivo, 200)), auth.uid());
end;
$$;

-- Balcão: saldo do cliente escolhido no novo pedido.
create or replace function public.saldo_cliente_fidelidade(p_loja uuid, p_cliente uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_grupo uuid := private.grupo_da_loja(p_loja);
  v_c     public.fidelidade_config;
begin
  if not private.tem_permissao(p_loja, 'pedidos_delivery') then
    raise exception 'Você não tem permissão para lançar pedidos.' using errcode = 'insufficient_privilege';
  end if;
  select * into v_c from public.fidelidade_config where grupo = v_grupo;
  if v_c.grupo is null or not (v_c.cashback_ativo or v_c.pontos_ativo)
     or not exists (select 1 from public.clientes where id = p_cliente and grupo = v_grupo) then
    return null;
  end if;
  return jsonb_build_object('config', private.config_fidelidade_json(v_c), 'recompensas', private.recompensas_json(v_grupo),
                            'cashback', round(private.saldo_fidelidade(p_cliente, 'cashback') * 100),
                            'pontos', private.saldo_fidelidade(p_cliente, 'pontos')::int);
end;
$$;

-- Cardápio digital: o programa (para mostrar "ganhe 5% de volta") — sem dados de cliente.
create or replace function public.fidelidade_publica(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when f.grupo is not null and (f.cashback_ativo or f.pontos_ativo) and 'cardapio_digital' = any (f.canais)
              then jsonb_build_object('config', private.config_fidelidade_json(f), 'recompensas', private.recompensas_json(f.grupo)) end
    from public.marcas m
    left join public.fidelidade_config f on f.grupo = private.grupo_da_loja(m.loja_id)
   where m.slug = lower(btrim(p_slug)) and m.ativa;
$$;

-- Cardápio digital: saldo do cliente, só com a prova (código de um pedido anterior dele).
create or replace function public.saldo_fidelidade_publico(p_slug text, p_telefone text, p_prova uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cli uuid;
begin
  select k.id into v_cli
    from public.marcas m
    join public.clientes k on k.grupo = private.grupo_da_loja(m.loja_id) and k.telefone = private.normalizar_telefone(p_telefone)
   where m.slug = lower(btrim(p_slug)) and m.ativa
     and exists (select 1 from public.pedidos q where q.codigo = p_prova and q.cliente_id = k.id);
  if v_cli is null then
    return null;
  end if;
  return jsonb_build_object('cashback', round(private.saldo_fidelidade(v_cli, 'cashback') * 100), 'pontos', private.saldo_fidelidade(v_cli, 'pontos')::int);
end;
$$;

-- ---------------------------------------------------------------------------- resultados
create or replace function public.relatorio_fidelidade(p_loja uuid, p_de date, p_ate date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_fuso  text;
  v_lojas uuid[];
  v_grupo uuid := private.grupo_da_loja(p_loja);
  v_ini   timestamptz;
  v_fim   timestamptz;
begin
  select fuso_horario into v_fuso from public.lojas where id = p_loja;
  select array_agg(x) into v_lojas from unnest(private.lojas_grupo(p_loja)) x
   where private.e_gestor(x) or private.tem_permissao(x, 'relatorios') or private.tem_permissao(x, 'marketing');
  if v_fuso is null or v_lojas is null then
    raise exception 'Você não tem acesso aos relatórios.' using errcode = 'insufficient_privilege';
  end if;
  if p_ate < p_de or p_ate - p_de > 92 then
    raise exception 'Escolha um período de até 93 dias.' using errcode = 'check_violation';
  end if;
  v_ini := (p_de + time '05:00') at time zone v_fuso;
  v_fim := (p_ate + 1 + time '05:00') at time zone v_fuso;

  return (
    with b as (
      select p.id, p.loja_id, p.origem, p.total, p.cliente_id, p.cupom_codigo, p.cupom_desconto, p.fid_cashback, p.fid_desconto, p.fid_recompensa_id,
             (p.cupom_desconto + p.fid_cashback + p.fid_desconto) as desc_fid,
             (p.cupom_desconto > 0 or p.fid_cashback > 0 or p.fid_desconto > 0) as com_fid,
             extract(dow from p.criado_em at time zone v_fuso)::int as dow,
             ((p.criado_em at time zone v_fuso) - interval '5 hours')::date as dia,
             case when p.cliente_id is null then 'sem_cliente'
                  when exists (select 1 from public.pedidos q where q.cliente_id = p.cliente_id and q.status <> 'cancelado' and q.criado_em < p.criado_em) then 'recorrente'
                  else 'novo' end as perfil
        from public.pedidos p
       where p.loja_id = any (v_lojas) and p.criado_em >= v_ini and p.criado_em < v_fim and p.status <> 'cancelado'
    ),
    mov as (
      select m.* from public.fidelidade_movimentos m
       where m.grupo = v_grupo and m.criado_em >= v_ini and m.criado_em < v_fim
    ),
    mec as (
      select 'cupom' as tipo, cupom_codigo as nome, count(*) as usos, sum(cupom_desconto) as desconto, sum(total) as faturamento
        from b where cupom_desconto > 0 group by cupom_codigo
      union all
      select 'cashback', 'Cashback', count(*), sum(fid_cashback), sum(total) from b where fid_cashback > 0 having count(*) > 0
      union all
      select 'pontos', coalesce(r.nome, 'Recompensa'), count(*), sum(b.fid_desconto), sum(b.total)
        from b left join public.fidelidade_recompensas r on r.id = b.fid_recompensa_id
       where b.fid_desconto > 0 group by r.nome
    )
    select jsonb_build_object(
      'vendas', (select count(*) from b),
      'faturamento', (select round(coalesce(sum(total), 0) * 100) from b),
      'vendas_fid', (select count(*) from b where com_fid),
      'faturamento_fid', (select round(coalesce(sum(total), 0) * 100) from b where com_fid),
      'ticket_fid', (select round(avg(total) * 100) from b where com_fid),
      'ticket_sem', (select round(avg(total) * 100) from b where not com_fid),
      'desconto_cupom', (select round(coalesce(sum(cupom_desconto), 0) * 100) from b),
      'desconto_cashback', (select round(coalesce(sum(fid_cashback), 0) * 100) from b),
      'desconto_pontos', (select round(coalesce(sum(fid_desconto), 0) * 100) from b),
      'cashback_gerado', (select round(coalesce(sum(valor), 0) * 100) from mov where tipo = 'cashback' and natureza = 'ganho'),
      'cashback_vencido', (select round(coalesce(-sum(valor), 0) * 100) from mov where tipo = 'cashback' and natureza = 'expirado'),
      'pontos_gerados', (select coalesce(sum(valor), 0)::int from mov where tipo = 'pontos' and natureza = 'ganho'),
      'pontos_usados', (select coalesce(-sum(valor), 0)::int from mov where tipo = 'pontos' and natureza = 'uso'),
      'mecanicas', coalesce((select jsonb_agg(jsonb_build_object('tipo', tipo, 'nome', nome, 'usos', usos, 'desconto', round(desconto * 100),
                                                                 'faturamento', round(faturamento * 100)) order by faturamento desc) from mec), '[]'::jsonb),
      'por_dia_semana', coalesce((select jsonb_agg(x order by x.dow) from (
          select dow, count(*) as vendas, round(sum(total) * 100) as faturamento,
                 round(coalesce(sum(total) filter (where cupom_desconto > 0), 0) * 100) as fat_cupom,
                 round(coalesce(sum(cupom_desconto), 0) * 100) as desc_cupom,
                 round(coalesce(sum(total) filter (where fid_cashback > 0 or fid_desconto > 0), 0) * 100) as fat_fid,
                 round(coalesce(sum(fid_cashback + fid_desconto), 0) * 100) as desc_fid
            from b group by dow) x), '[]'::jsonb),
      'por_perfil', coalesce((select jsonb_agg(x) from (
          select perfil, count(*) as vendas, round(sum(total) * 100) as faturamento, round(sum(desc_fid) * 100) as desconto
            from b where com_fid group by perfil) x), '[]'::jsonb),
      'por_origem', coalesce((select jsonb_agg(x) from (
          select origem, count(*) as vendas, round(sum(total) * 100) as faturamento, round(sum(desc_fid) * 100) as desconto
            from b where com_fid group by origem) x), '[]'::jsonb),
      'por_dia', coalesce((select jsonb_agg(x order by x.dia) from (
          select d.dia,
                 round(coalesce((select sum(cupom_desconto) from b where b.dia = d.dia), 0) * 100) as cupom,
                 round(coalesce((select sum(fid_cashback + fid_desconto) from b where b.dia = d.dia), 0) * 100) as fidelidade,
                 round(coalesce((select sum(total) from b where b.dia = d.dia and com_fid), 0) * 100) as influenciado
            from (select distinct dia from b) d) x), '[]'::jsonb)));
end;
$$;

grant execute on function public.painel_fidelidade(uuid), public.salvar_config_fidelidade(uuid, jsonb), public.salvar_recompensa(uuid, uuid, jsonb),
  public.excluir_recompensa(uuid, uuid), public.saldos_fidelidade(uuid, text, integer, integer), public.extrato_fidelidade(uuid, uuid),
  public.ajustar_fidelidade(uuid, uuid, text, numeric, text), public.saldo_cliente_fidelidade(uuid, uuid),
  public.relatorio_fidelidade(uuid, date, date) to authenticated;
revoke execute on function public.painel_fidelidade(uuid), public.salvar_config_fidelidade(uuid, jsonb), public.salvar_recompensa(uuid, uuid, jsonb),
  public.excluir_recompensa(uuid, uuid), public.saldos_fidelidade(uuid, text, integer, integer), public.extrato_fidelidade(uuid, uuid),
  public.ajustar_fidelidade(uuid, uuid, text, numeric, text), public.saldo_cliente_fidelidade(uuid, uuid),
  public.relatorio_fidelidade(uuid, date, date) from anon, public;
grant execute on function public.fidelidade_publica(text), public.saldo_fidelidade_publico(text, text, uuid) to anon, authenticated;
