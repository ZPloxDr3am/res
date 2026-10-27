-- RES · 0033 · Fidelidade separada por loja (D-032, troca a regra de grupo da D-031).
--
-- Cada loja tem o próprio programa (cashback, pontos, recompensas), o próprio saldo de cada cliente,
-- o próprio extrato e os próprios resultados. O cadastro de clientes (telefone) continua do grupo.
-- A validade conta do último pedido do cliente NAQUELA loja; o bônus de boas-vindas é no 1º pedido
-- naquela loja. Pode rodar de novo sem erro.

-- ---------------------------------------------------------------------------- tabelas: grupo → loja
do $$
begin
  -- configuração: uma por loja (o que já estava no grupo vale para cada loja do grupo)
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'fidelidade_config' and column_name = 'grupo') then
    alter table public.fidelidade_config drop constraint if exists fidelidade_config_pkey;
    alter table public.fidelidade_config add column if not exists loja_id uuid references public.lojas (id) on delete cascade;
    insert into public.fidelidade_config (grupo, loja_id, canais, cashback_ativo, cashback_pct, cashback_pct_dia, cashback_dias, cashback_validade_dias,
                                          cashback_minimo, cashback_max_pct, pontos_ativo, pontos_por_real, pontos_por_real_taxa, pontos_validade_dias,
                                          pontos_boas_vindas, atualizado_em, atualizado_por)
    select f.grupo, l.id, f.canais, f.cashback_ativo, f.cashback_pct, f.cashback_pct_dia, f.cashback_dias, f.cashback_validade_dias,
           f.cashback_minimo, f.cashback_max_pct, f.pontos_ativo, f.pontos_por_real, f.pontos_por_real_taxa, f.pontos_validade_dias,
           f.pontos_boas_vindas, f.atualizado_em, f.atualizado_por
      from public.fidelidade_config f join public.lojas l on coalesce(l.conta_id, l.id) = f.grupo
     where f.loja_id is null;
    delete from public.fidelidade_config where loja_id is null;
    alter table public.fidelidade_config alter column loja_id set not null;
    alter table public.fidelidade_config add primary key (loja_id);
    alter table public.fidelidade_config drop column grupo;
  end if;

  -- recompensas: produto fica na loja do produto; desconto vira um por loja do grupo
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'fidelidade_recompensas' and column_name = 'grupo') then
    alter table public.fidelidade_recompensas add column if not exists loja_id uuid references public.lojas (id) on delete cascade;
    update public.fidelidade_recompensas r set loja_id = p.loja_id from public.produtos p where p.id = r.produto_id and r.loja_id is null;
    insert into public.fidelidade_recompensas (grupo, loja_id, tipo, nome, pontos, valor, produto_id, ativo, criado_em)
    select r.grupo, l.id, r.tipo, r.nome, r.pontos, r.valor, r.produto_id, r.ativo, r.criado_em
      from public.fidelidade_recompensas r join public.lojas l on coalesce(l.conta_id, l.id) = r.grupo
     where r.loja_id is null;
    delete from public.fidelidade_recompensas where loja_id is null;
    alter table public.fidelidade_recompensas alter column loja_id set not null;
    alter table public.fidelidade_recompensas drop column grupo;
  end if;

  -- extrato: a loja do pedido; ajuste sem pedido fica na primeira loja do grupo
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'fidelidade_movimentos' and column_name = 'grupo') then
    alter table public.fidelidade_movimentos add column if not exists loja_id uuid references public.lojas (id) on delete cascade;
    update public.fidelidade_movimentos m set loja_id = p.loja_id from public.pedidos p where p.id = m.pedido_id and m.loja_id is null;
    update public.fidelidade_movimentos m set loja_id = (select l.id from public.lojas l where coalesce(l.conta_id, l.id) = m.grupo order by l.criado_em limit 1)
     where m.loja_id is null;
    delete from public.fidelidade_movimentos where loja_id is null;
    alter table public.fidelidade_movimentos alter column loja_id set not null;
    alter table public.fidelidade_movimentos drop column grupo;
  end if;
end;
$$;
drop index if exists public.fidelidade_mov_grupo_idx;
drop index if exists public.fidelidade_mov_cliente_idx;
drop index if exists public.fidelidade_recompensas_grupo_idx;
create index if not exists fidelidade_mov_loja_idx on public.fidelidade_movimentos (loja_id, criado_em);
create index if not exists fidelidade_mov_cliente_loja_idx on public.fidelidade_movimentos (cliente_id, loja_id, tipo);
create index if not exists fidelidade_recompensas_loja_idx on public.fidelidade_recompensas (loja_id);

-- assinaturas antigas (por grupo)
drop function if exists private.ultimo_pedido_cliente(uuid, uuid);
drop function if exists private.saldo_fidelidade(uuid, text, uuid);
drop function if exists private.expirar_fidelidade(uuid, text, uuid);
drop function if exists private.recompensas_json(uuid);

-- ---------------------------------------------------------------------------- funções (0032) por loja
create or replace function private.ultimo_pedido_cliente(p_cliente uuid, p_loja uuid, p_excluir uuid default null)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select max(p.criado_em) from public.pedidos p
   where p.cliente_id = p_cliente and p.loja_id = p_loja and p.status <> 'cancelado' and p.id is distinct from p_excluir;
$$;


create or replace function private.saldo_fidelidade(p_cliente uuid, p_loja uuid, p_tipo text, p_excluir uuid default null)
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
  select * into v_c from public.fidelidade_config where loja_id = p_loja;
  select coalesce(sum(valor), 0) into v_soma from public.fidelidade_movimentos where cliente_id = p_cliente and loja_id = p_loja and tipo = p_tipo;
  if v_soma <= 0 then
    return 0;
  end if;
  v_dias := case when p_tipo = 'cashback' then coalesce(v_c.cashback_validade_dias, 0) else coalesce(v_c.pontos_validade_dias, 0) end;
  if v_dias > 0 then
    v_ult := private.ultimo_pedido_cliente(p_cliente, p_loja, p_excluir);
    if v_ult is not null and v_ult < now() - make_interval(days => v_dias) then
      return 0;
    end if;
  end if;
  return v_soma;
end;
$$;


create or replace function private.expirar_fidelidade(p_cliente uuid, p_loja uuid, p_tipo text, p_excluir uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_soma numeric;
begin
  select coalesce(sum(valor), 0) into v_soma from public.fidelidade_movimentos where cliente_id = p_cliente and loja_id = p_loja and tipo = p_tipo;
  if v_soma > 0 and private.saldo_fidelidade(p_cliente, p_loja, p_tipo, p_excluir) = 0 then
    insert into public.fidelidade_movimentos (loja_id, cliente_id, tipo, natureza, valor, motivo)
    select p_loja, k.id, p_tipo, 'expirado', -v_soma, 'Venceu: sem pedido dentro da validade'
      from public.clientes k where k.id = p_cliente;
  end if;
end;
$$;


create or replace function private.aplicar_fidelidade(p_pedido uuid, p_dados jsonb, p_publico boolean, p_prova uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped    public.pedidos;
  v_c      public.fidelidade_config;
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
  select * into v_c from public.fidelidade_config where loja_id = v_ped.loja_id;
  select fuso_horario into v_fuso from public.lojas where id = v_ped.loja_id;
  v_canal := private.canal_fidelidade(v_ped.origem, v_ped.tipo);
  v_dia := extract(dow from now() at time zone v_fuso)::int;
  if v_c.loja_id is null or not (v_canal = any (v_c.canais)) then
    raise exception 'O programa de fidelidade não vale para este tipo de pedido.' using errcode = 'check_violation';
  end if;
  if p_publico and not exists (select 1 from public.pedidos q where q.codigo = p_prova and q.cliente_id = v_ped.cliente_id and q.id <> v_ped.id) then
    raise exception 'Para usar seu saldo, peça pelo mesmo celular do seu último pedido ou fale com a loja.' using errcode = 'insufficient_privilege';
  end if;

  -- recompensa de pontos
  if nullif(p_dados ->> 'recompensa', '') is not null then
    select * into v_rec from public.fidelidade_recompensas
     where id = (p_dados ->> 'recompensa')::uuid and loja_id = v_ped.loja_id and ativo;
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
    perform private.expirar_fidelidade(v_ped.cliente_id, v_ped.loja_id, 'pontos', v_ped.id);
    v_saldo := private.saldo_fidelidade(v_ped.cliente_id, v_ped.loja_id, 'pontos', v_ped.id);
    if v_saldo < v_rec.pontos then
      raise exception 'Pontos insuficientes: o cliente tem % e a recompensa pede %.', v_saldo::int, v_rec.pontos using errcode = 'check_violation';
    end if;
    update public.pedidos
       set desconto = desconto + v_usar, total = subtotal + taxa_entrega - (desconto + v_usar),
           fid_desconto = v_usar, fid_pontos = v_rec.pontos, fid_recompensa_id = v_rec.id
     where id = v_ped.id
     returning * into v_ped;
    insert into public.fidelidade_movimentos (loja_id, cliente_id, tipo, natureza, valor, pedido_id, recompensa_id, motivo)
    values (v_ped.loja_id, v_ped.cliente_id, 'pontos', 'uso', -v_rec.pontos, v_ped.id, v_rec.id, v_rec.nome);
  end if;

  -- cashback (mesma conta de cashbackUsavel no core)
  if coalesce((p_dados ->> 'cashback')::numeric, 0) > 0 then
    v_quer := (p_dados ->> 'cashback')::numeric / 100;
    if not v_c.cashback_ativo or not (v_dia = any (v_c.cashback_dias)) then
      raise exception 'O cashback não pode ser usado hoje.' using errcode = 'check_violation';
    end if;
    perform private.expirar_fidelidade(v_ped.cliente_id, v_ped.loja_id, 'cashback', v_ped.id);
    v_saldo := private.saldo_fidelidade(v_ped.cliente_id, v_ped.loja_id, 'cashback', v_ped.id);
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
      insert into public.fidelidade_movimentos (loja_id, cliente_id, tipo, natureza, valor, pedido_id, motivo)
      values (v_ped.loja_id, v_ped.cliente_id, 'cashback', 'uso', -v_usar, v_ped.id, 'Usado no pedido');
    end if;
  end if;
end;
$$;


create or replace function private.fidelidade_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c     public.fidelidade_config;
  v_fuso  text;
  v_g     record;
  v_prim  boolean;
begin
  if new.cliente_id is null or new.status = old.status then
    return null;
  end if;
  if new.status = 'cancelado' then
    insert into public.fidelidade_movimentos (loja_id, cliente_id, tipo, natureza, valor, pedido_id, motivo)
    select new.loja_id, new.cliente_id, m.tipo, 'estorno', -sum(m.valor), new.id, 'Pedido cancelado'
      from public.fidelidade_movimentos m
     where m.pedido_id = new.id and m.natureza in ('ganho', 'uso', 'estorno')
     group by m.tipo
    having sum(m.valor) <> 0;
    return null;
  end if;

  if new.status <> 'concluido' or exists (select 1 from public.fidelidade_movimentos where pedido_id = new.id and natureza = 'ganho') then
    return null;
  end if;
  select * into v_c from public.fidelidade_config where loja_id = new.loja_id;
  if v_c.loja_id is null or not (v_c.cashback_ativo or v_c.pontos_ativo) then
    return null;
  end if;
  select fuso_horario into v_fuso from public.lojas where id = new.loja_id;
  v_prim := not exists (select 1 from public.pedidos q where q.cliente_id = new.cliente_id and q.loja_id = new.loja_id and q.status = 'concluido' and q.id <> new.id);
  select * into v_g from private.ganho_fidelidade(v_c, new.total, new.taxa_entrega, extract(dow from new.criado_em at time zone v_fuso)::int,
                                                   private.canal_fidelidade(new.origem, new.tipo), v_prim);
  if v_g.cashback > 0 then
    perform private.expirar_fidelidade(new.cliente_id, new.loja_id, 'cashback', new.id);
    insert into public.fidelidade_movimentos (loja_id, cliente_id, tipo, natureza, valor, pedido_id, motivo)
    values (new.loja_id, new.cliente_id, 'cashback', 'ganho', v_g.cashback, new.id, 'Pedido concluído');
  end if;
  if v_g.pontos > 0 then
    perform private.expirar_fidelidade(new.cliente_id, new.loja_id, 'pontos', new.id);
    insert into public.fidelidade_movimentos (loja_id, cliente_id, tipo, natureza, valor, pedido_id, motivo)
    values (new.loja_id, new.cliente_id, 'pontos', 'ganho', v_g.pontos, new.id, case when v_prim and v_c.pontos_boas_vindas > 0 then 'Pedido concluído + boas-vindas' else 'Pedido concluído' end);
  end if;
  return null;
end;
$$;


create or replace function private.config_fidelidade_json(c public.fidelidade_config)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case when c.loja_id is null then null else jsonb_build_object(
    'canais', to_jsonb(c.canais), 'cashbackAtivo', c.cashback_ativo, 'cashbackPct', c.cashback_pct,
    'cashbackPctDia', c.cashback_pct_dia, 'cashbackDias', to_jsonb(c.cashback_dias), 'cashbackValidadeDias', c.cashback_validade_dias,
    'cashbackMinimo', round(c.cashback_minimo * 100), 'cashbackMaxPct', c.cashback_max_pct,
    'pontosAtivo', c.pontos_ativo, 'pontosPorReal', c.pontos_por_real, 'pontosPorRealTaxa', c.pontos_por_real_taxa,
    'pontosValidadeDias', c.pontos_validade_dias, 'pontosBoasVindas', c.pontos_boas_vindas) end;
$$;


create or replace function private.recompensas_json(p_loja uuid)
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
   where r.loja_id = p_loja and r.ativo;
$$;


create or replace function public.painel_fidelidade(p_loja uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_c     public.fidelidade_config;
begin
  if not (private.pode_gerir_fidelidade(p_loja) or private.tem_permissao(p_loja, 'clientes')) then
    raise exception 'Você não tem acesso à fidelidade.' using errcode = 'insufficient_privilege';
  end if;
  select * into v_c from public.fidelidade_config where loja_id = p_loja;
  return jsonb_build_object(
    'config', private.config_fidelidade_json(v_c),
    'pode_editar', private.pode_gerir_fidelidade(p_loja),
    'recompensas', private.recompensas_json(p_loja),
    'produtos', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nome', p.nome, 'loja', l.nome) order by p.nome)
                            from public.produtos p join public.lojas l on l.id = p.loja_id
                           where p.loja_id = p_loja), '[]'::jsonb));
end;
$$;


create or replace function public.salvar_config_fidelidade(p_loja uuid, p_cfg jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.pode_gerir_fidelidade(p_loja) then
    raise exception 'Só o gestor (ou quem cuida do marketing) muda a fidelidade.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(jsonb_array_length(p_cfg -> 'canais'), 0) = 0 then
    raise exception 'Escolha pelo menos um canal.' using errcode = 'check_violation';
  end if;
  insert into public.fidelidade_config as f (loja_id, canais, cashback_ativo, cashback_pct, cashback_pct_dia, cashback_dias, cashback_validade_dias,
                                             cashback_minimo, cashback_max_pct, pontos_ativo, pontos_por_real, pontos_por_real_taxa,
                                             pontos_validade_dias, pontos_boas_vindas, atualizado_em, atualizado_por)
  values (p_loja,
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
  on conflict (loja_id) do update set
    canais = excluded.canais, cashback_ativo = excluded.cashback_ativo, cashback_pct = excluded.cashback_pct,
    cashback_pct_dia = excluded.cashback_pct_dia, cashback_dias = excluded.cashback_dias, cashback_validade_dias = excluded.cashback_validade_dias,
    cashback_minimo = excluded.cashback_minimo, cashback_max_pct = excluded.cashback_max_pct, pontos_ativo = excluded.pontos_ativo,
    pontos_por_real = excluded.pontos_por_real, pontos_por_real_taxa = excluded.pontos_por_real_taxa,
    pontos_validade_dias = excluded.pontos_validade_dias, pontos_boas_vindas = excluded.pontos_boas_vindas,
    atualizado_em = now(), atualizado_por = auth.uid();
  -- % por dia: só números entre 0 e 50
  if exists (select 1 from public.fidelidade_config f, jsonb_each_text(f.cashback_pct_dia) d
              where f.loja_id = p_loja and (d.key !~ '^[0-6]$' or d.value::numeric not between 0 and 50)) then
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
  v_id    uuid;
begin
  if not private.pode_gerir_fidelidade(p_loja) then
    raise exception 'Só o gestor (ou quem cuida do marketing) muda a fidelidade.' using errcode = 'insufficient_privilege';
  end if;
  if p_dados ->> 'tipo' = 'produto' and not exists (
       select 1 from public.produtos where id = (p_dados ->> 'produto_id')::uuid and loja_id = p_loja) then
    raise exception 'Escolha um produto desta loja.' using errcode = 'check_violation';
  end if;
  if p_id is null then
    insert into public.fidelidade_recompensas (loja_id, tipo, nome, pontos, valor, produto_id)
    values (p_loja, p_dados ->> 'tipo', btrim(p_dados ->> 'nome'), (p_dados ->> 'pontos')::int,
            case when p_dados ->> 'tipo' = 'desconto' then (p_dados ->> 'valor')::numeric / 100 end,
            case when p_dados ->> 'tipo' = 'produto' then (p_dados ->> 'produto_id')::uuid end)
    returning id into v_id;
  else
    update public.fidelidade_recompensas
       set nome = btrim(p_dados ->> 'nome'), pontos = (p_dados ->> 'pontos')::int, tipo = p_dados ->> 'tipo',
           valor = case when p_dados ->> 'tipo' = 'desconto' then (p_dados ->> 'valor')::numeric / 100 end,
           produto_id = case when p_dados ->> 'tipo' = 'produto' then (p_dados ->> 'produto_id')::uuid end
     where id = p_id and loja_id = p_loja
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
  update public.fidelidade_recompensas set ativo = false where id = p_id and loja_id = p_loja;
end;
$$;


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
  select * into v_c from public.fidelidade_config where loja_id = p_loja;
  return (
    with s as (
      select k.id, k.nome, k.telefone,
             private.saldo_fidelidade(k.id, p_loja, 'cashback') as cashback,
             private.saldo_fidelidade(k.id, p_loja, 'pontos') as pontos,
             private.ultimo_pedido_cliente(k.id, p_loja) as ultimo
        from public.clientes k
       where k.grupo = v_grupo
         and exists (select 1 from public.fidelidade_movimentos m where m.cliente_id = k.id and m.loja_id = p_loja)
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
      from (select * from public.fidelidade_movimentos where cliente_id = p_cliente and loja_id = p_loja
             order by criado_em desc, id desc limit 100) m
      left join public.pedidos p on p.id = m.pedido_id
      left join public.lojas l on l.id = p.loja_id), '[]'::jsonb);
end;
$$;


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
  perform private.expirar_fidelidade(p_cliente, p_loja, p_tipo, null);
  if private.saldo_fidelidade(p_cliente, p_loja, p_tipo) + v_valor < 0 then
    raise exception 'O ajuste deixaria o saldo negativo.' using errcode = 'check_violation';
  end if;
  insert into public.fidelidade_movimentos (loja_id, cliente_id, tipo, natureza, valor, motivo, criado_por)
  values (p_loja, p_cliente, p_tipo, 'ajuste', v_valor, btrim(left(p_motivo, 200)), auth.uid());
end;
$$;


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
  select * into v_c from public.fidelidade_config where loja_id = p_loja;
  if v_c.loja_id is null or not (v_c.cashback_ativo or v_c.pontos_ativo)
     or not exists (select 1 from public.clientes where id = p_cliente and grupo = v_grupo) then
    return null;
  end if;
  return jsonb_build_object('config', private.config_fidelidade_json(v_c), 'recompensas', private.recompensas_json(p_loja),
                            'cashback', round(private.saldo_fidelidade(p_cliente, p_loja, 'cashback') * 100),
                            'pontos', private.saldo_fidelidade(p_cliente, p_loja, 'pontos')::int);
end;
$$;


create or replace function public.fidelidade_publica(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when f.loja_id is not null and (f.cashback_ativo or f.pontos_ativo) and 'cardapio_digital' = any (f.canais)
              then jsonb_build_object('config', private.config_fidelidade_json(f), 'recompensas', private.recompensas_json(f.loja_id)) end
    from public.marcas m
    left join public.fidelidade_config f on f.loja_id = m.loja_id
   where m.slug = lower(btrim(p_slug)) and m.ativa;
$$;


create or replace function public.saldo_fidelidade_publico(p_slug text, p_telefone text, p_prova uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_cli  uuid;
  v_loja uuid;
begin
  select k.id, m.loja_id into v_cli, v_loja
    from public.marcas m
    join public.clientes k on k.grupo = private.grupo_da_loja(m.loja_id) and k.telefone = private.normalizar_telefone(p_telefone)
   where m.slug = lower(btrim(p_slug)) and m.ativa
     and exists (select 1 from public.pedidos q where q.codigo = p_prova and q.cliente_id = k.id);
  if v_cli is null then
    return null;
  end if;
  return jsonb_build_object('cashback', round(private.saldo_fidelidade(v_cli, v_loja, 'cashback') * 100), 'pontos', private.saldo_fidelidade(v_cli, v_loja, 'pontos')::int);
end;
$$;


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
  v_ini   timestamptz;
  v_fim   timestamptz;
begin
  select fuso_horario into v_fuso from public.lojas where id = p_loja;
  -- só a loja escolhida (cada loja tem o seu programa)
  if private.e_gestor(p_loja) or private.tem_permissao(p_loja, 'relatorios') or private.tem_permissao(p_loja, 'marketing') then
    v_lojas := array[p_loja];
  end if;
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
                  when exists (select 1 from public.pedidos q where q.cliente_id = p.cliente_id and q.loja_id = p.loja_id and q.status <> 'cancelado' and q.criado_em < p.criado_em) then 'recorrente'
                  else 'novo' end as perfil
        from public.pedidos p
       where p.loja_id = any (v_lojas) and p.criado_em >= v_ini and p.criado_em < v_fim and p.status <> 'cancelado'
    ),
    mov as (
      select m.* from public.fidelidade_movimentos m
       where m.loja_id = p_loja and m.criado_em >= v_ini and m.criado_em < v_fim
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

