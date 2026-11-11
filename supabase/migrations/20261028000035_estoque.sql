-- RES · 0035 · Estoque: insumos, entrada por NF-e (XML), movimentos e baixa pela ficha técnica (D-036).
--
-- * O estoque é da loja ou do grupo: contas.estoque_compartilhado (só quem tem plano de várias lojas
--   escolhe). private.estoque_da_loja(loja) devolve o "dono" do estoque: a loja ou o grupo (conta).
-- * insumos: saldo e custo médio (R$ por unidade do insumo), mínimo, controla, aceita negativo.
-- * estoque_movimentos: tudo que entra e sai (NF-e, entrada manual, perda, contagem, venda, estorno).
-- * nfe_entradas: a nota importada (chave única por estoque: não entra duas vezes).
-- * nfe_vinculos: lembra "fornecedor + código do produto na nota → insumo + fator", e a próxima nota
--   do mesmo fornecedor já vem ligada.
-- * fichas_tecnicas: quanto cada produto ou opção (sabor, borda…) gasta de cada insumo. A opção de
--   pizza gasta pela fração (meio a meio = metade). Baixa na hora em que o pedido é concluído;
--   cancelou depois, volta.
-- Pode rodar de novo sem erro.

alter table public.contas add column if not exists estoque_compartilhado boolean not null default false;

create or replace function private.estoque_da_loja(p_loja uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case when coalesce(c.estoque_compartilhado, false) then l.conta_id else l.id end
    from public.lojas l left join public.contas c on c.id = l.conta_id
   where l.id = p_loja;
$$;

create or replace function private.pode_estoque(p_loja uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.e_gestor(p_loja) or private.tem_permissao(p_loja, 'estoque');
$$;

create table if not exists public.insumos (
  id             uuid primary key default gen_random_uuid(),
  estoque        uuid not null,
  nome           text not null check (length(btrim(nome)) between 1 and 100),
  unidade        text not null default 'UN' check (unidade in ('UN', 'KG', 'G', 'L', 'ML')),
  categoria      text check (categoria is null or length(categoria) <= 60),
  custo_medio    numeric(14, 4) not null default 0 check (custo_medio >= 0),
  saldo          numeric(14, 3) not null default 0,
  minimo         numeric(14, 3) check (minimo is null or minimo >= 0),
  controla       boolean not null default true,
  aceita_negativo boolean not null default true,
  ativo          boolean not null default true,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
create index if not exists insumos_estoque_idx on public.insumos (estoque, lower(nome));

create table if not exists public.nfe_entradas (
  id             uuid primary key default gen_random_uuid(),
  estoque        uuid not null,
  loja_id        uuid not null references public.lojas (id) on delete cascade,
  chave          text not null check (chave ~ '^\d{44}$'),
  numero         text,
  serie          text,
  emissao        timestamptz,
  emitente_cnpj  text,
  emitente_nome  text,
  valor_total    numeric(14, 2),
  itens          jsonb not null default '[]'::jsonb,
  importada_por  uuid,
  criado_em      timestamptz not null default now(),
  unique (estoque, chave)
);

create table if not exists public.nfe_vinculos (
  estoque        uuid not null,
  fornecedor     text not null,          -- CNPJ do emitente
  codigo         text not null,          -- cProd na nota
  insumo_id      uuid not null references public.insumos (id) on delete cascade,
  fator          numeric(14, 4) not null default 1 check (fator > 0),
  atualizado_em  timestamptz not null default now(),
  primary key (estoque, fornecedor, codigo)
);

create table if not exists public.estoque_movimentos (
  id             bigint generated always as identity primary key,
  estoque        uuid not null,
  loja_id        uuid references public.lojas (id) on delete set null,
  insumo_id      uuid not null references public.insumos (id) on delete cascade,
  tipo           text not null check (tipo in ('entrada_nfe', 'entrada', 'perda', 'contagem', 'venda', 'estorno_venda')),
  quantidade     numeric(14, 3) not null,       -- + entra, - sai
  custo_unit     numeric(14, 4),
  saldo_apos     numeric(14, 3) not null,
  pedido_id      uuid references public.pedidos (id) on delete set null,
  nfe_id         uuid references public.nfe_entradas (id) on delete set null,
  motivo         text,
  criado_por     uuid,
  criado_em      timestamptz not null default now()
);
create index if not exists estoque_mov_estoque_idx on public.estoque_movimentos (estoque, criado_em desc);
create index if not exists estoque_mov_insumo_idx on public.estoque_movimentos (insumo_id, criado_em desc);
create index if not exists estoque_mov_pedido_idx on public.estoque_movimentos (pedido_id) where pedido_id is not null;

create table if not exists public.fichas_tecnicas (
  id          uuid primary key default gen_random_uuid(),
  loja_id     uuid not null references public.lojas (id) on delete cascade,
  produto_id  uuid references public.produtos (id) on delete cascade,
  opcao_id    uuid references public.opcoes (id) on delete cascade,
  insumo_id   uuid not null references public.insumos (id) on delete cascade,
  quantidade  numeric(14, 4) not null check (quantidade > 0),
  check ((produto_id is null) <> (opcao_id is null))
);
create index if not exists fichas_produto_idx on public.fichas_tecnicas (produto_id) where produto_id is not null;
create index if not exists fichas_opcao_idx on public.fichas_tecnicas (opcao_id) where opcao_id is not null;

-- tudo passa pelas funções abaixo
alter table public.insumos enable row level security;
alter table public.nfe_entradas enable row level security;
alter table public.nfe_vinculos enable row level security;
alter table public.estoque_movimentos enable row level security;
alter table public.fichas_tecnicas enable row level security;

-- ---------------------------------------------------------------------------- movimento (núcleo)
-- Lança um movimento e atualiza saldo (e custo médio, nas entradas com custo).
create or replace function private.mover_estoque(p_insumo uuid, p_loja uuid, p_tipo text, p_qtd numeric, p_custo numeric,
                                                 p_pedido uuid default null, p_nfe uuid default null, p_motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.insumos;
begin
  select * into v from public.insumos where id = p_insumo for update;
  if p_qtd > 0 and p_custo is not null and p_tipo in ('entrada_nfe', 'entrada') then
    v.custo_medio := case when greatest(v.saldo, 0) + p_qtd <= 0 then p_custo
                          else (greatest(v.saldo, 0) * v.custo_medio + p_qtd * p_custo) / (greatest(v.saldo, 0) + p_qtd) end;
  end if;
  v.saldo := v.saldo + p_qtd;
  update public.insumos set saldo = v.saldo, custo_medio = v.custo_medio, atualizado_em = now() where id = p_insumo;
  insert into public.estoque_movimentos (estoque, loja_id, insumo_id, tipo, quantidade, custo_unit, saldo_apos, pedido_id, nfe_id, motivo, criado_por)
  values (v.estoque, p_loja, p_insumo, p_tipo, p_qtd, coalesce(p_custo, v.custo_medio), v.saldo, p_pedido, p_nfe, p_motivo, auth.uid());
end;
$$;
revoke execute on function private.mover_estoque(uuid, uuid, text, numeric, numeric, uuid, uuid, text) from anon, public, authenticated;

-- ---------------------------------------------------------------------------- baixa pelas vendas
-- Consumo do pedido pela ficha técnica: produto × quantidade; opção × fração (pizza) ou × quantidade;
-- combo: o produto escolhido em cada passo (achado pelo nome na loja) também baixa.
create or replace function private.consumo_pedido(p_pedido uuid)
returns table (insumo_id uuid, quantidade numeric)
language sql
stable
security definer
set search_path = ''
as $$
  with itens as (
    select i.id, i.produto_id, i.quantidade, i.loja_id from public.pedido_itens i where i.pedido_id = p_pedido
  ), c as (
    select f.insumo_id, f.quantidade * i.quantidade as q
      from itens i join public.fichas_tecnicas f on f.produto_id = i.produto_id
    union all
    select f.insumo_id, f.quantidade * (case when o.fracao is not null then o.fracao else o.quantidade end) * i.quantidade
      from itens i
      join public.pedido_item_opcoes o on o.item_id = i.id and o.opcao_id is not null
      join public.fichas_tecnicas f on f.opcao_id = o.opcao_id
    union all
    select f.insumo_id, f.quantidade * o.quantidade * i.quantidade
      from itens i
      join public.pedido_item_opcoes o on o.item_id = i.id and o.grupo_id is null and o.opcao_id is null
      join lateral (select p.id from public.produtos p where p.loja_id = i.loja_id and p.nome = o.nome and not p.combo limit 1) p on true
      join public.fichas_tecnicas f on f.produto_id = p.id
  )
  select insumo_id, round(sum(q), 3) from c group by insumo_id having sum(q) > 0;
$$;

create or replace function private.estoque_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if new.status = old.status then
    return null;
  end if;
  if new.status = 'concluido' and not exists (select 1 from public.estoque_movimentos where pedido_id = new.id and tipo = 'venda') then
    for r in select * from private.consumo_pedido(new.id) loop
      perform private.mover_estoque(r.insumo_id, new.loja_id, 'venda', -r.quantidade, null, new.id, null, 'Pedido #' || new.numero);
    end loop;
  elsif new.status = 'cancelado' and old.status = 'concluido' then
    for r in select m.insumo_id, -sum(m.quantidade) as q from public.estoque_movimentos m
              where m.pedido_id = new.id and m.tipo in ('venda', 'estorno_venda') group by m.insumo_id having sum(m.quantidade) <> 0 loop
      perform private.mover_estoque(r.insumo_id, new.loja_id, 'estorno_venda', r.q, null, new.id, null, 'Pedido #' || new.numero || ' cancelado');
    end loop;
  end if;
  return null;
end;
$$;
drop trigger if exists pedidos_estoque on public.pedidos;
create trigger pedidos_estoque after update of status on public.pedidos for each row execute function private.estoque_status();

-- ---------------------------------------------------------------------------- telas
create or replace function private.insumo_json(i public.insumos)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object('id', i.id, 'nome', i.nome, 'unidade', i.unidade, 'categoria', i.categoria,
                            'custo_medio', round(i.custo_medio * 100, 2), 'saldo', i.saldo, 'minimo', i.minimo,
                            'controla', i.controla, 'aceita_negativo', i.aceita_negativo);
$$;

-- Tela Estoque: modo (loja ou grupo), insumos e números.
create or replace function public.estoque_painel(p_loja uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_est   uuid := private.estoque_da_loja(p_loja);
  v_conta public.contas;
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  select c.* into v_conta from public.contas c join public.lojas l on l.conta_id = c.id where l.id = p_loja;
  return jsonb_build_object(
    'compartilhado', coalesce(v_conta.estoque_compartilhado, false),
    'pode_escolher', v_conta.id is not null and (v_conta.limite_lojas > 1 or v_conta.plano <> 'basico') and private.e_gestor(p_loja),
    'pode_mudar_modo', not exists (select 1 from public.insumos i where i.estoque in (select l.id from public.lojas l where l.conta_id = v_conta.id) or i.estoque = v_conta.id),
    'lojas', coalesce((select jsonb_agg(l.nome order by l.nome) from public.lojas l where l.conta_id = v_conta.id), '[]'::jsonb),
    'insumos', coalesce((select jsonb_agg(private.insumo_json(i) order by lower(i.nome)) from public.insumos i where i.estoque = v_est and i.ativo), '[]'::jsonb),
    'valor_estoque', (select round(coalesce(sum(greatest(i.saldo, 0) * i.custo_medio), 0) * 100) from public.insumos i where i.estoque = v_est and i.ativo),
    'notas', (select count(*) from public.nfe_entradas n where n.estoque = v_est));
end;
$$;

-- Agrupar o estoque das lojas ou dividir (só no plano de várias lojas, antes de cadastrar insumos).
create or replace function public.definir_modo_estoque(p_loja uuid, p_compartilhado boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conta public.contas;
begin
  select c.* into v_conta from public.contas c join public.lojas l on l.conta_id = c.id where l.id = p_loja;
  if v_conta.id is null or not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou gerente escolhe como o estoque funciona.' using errcode = 'insufficient_privilege';
  end if;
  if v_conta.limite_lojas <= 1 and v_conta.plano = 'basico' then
    raise exception 'Agrupar o estoque das lojas faz parte do plano de várias lojas.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from public.insumos i where i.estoque = v_conta.id or i.estoque in (select l.id from public.lojas l where l.conta_id = v_conta.id)) then
    raise exception 'Já há insumos cadastrados: o modo do estoque só muda antes do primeiro cadastro.' using errcode = 'check_violation';
  end if;
  update public.contas set estoque_compartilhado = p_compartilhado, atualizado_em = now() where id = v_conta.id;
end;
$$;

create or replace function public.salvar_insumo(p_loja uuid, p_id uuid, p_dados jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_est uuid := private.estoque_da_loja(p_loja);
  v_id  uuid;
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  if length(btrim(coalesce(p_dados ->> 'nome', ''))) < 1 then
    raise exception 'Informe o nome do insumo.' using errcode = 'check_violation';
  end if;
  if p_id is null then
    insert into public.insumos (estoque, nome, unidade, categoria, minimo, controla, aceita_negativo)
    values (v_est, btrim(p_dados ->> 'nome'), coalesce(p_dados ->> 'unidade', 'UN'), nullif(btrim(coalesce(p_dados ->> 'categoria', '')), ''),
            nullif(p_dados ->> 'minimo', '')::numeric, coalesce((p_dados ->> 'controla')::boolean, true), coalesce((p_dados ->> 'aceita_negativo')::boolean, true))
    returning id into v_id;
  else
    update public.insumos
       set nome = btrim(p_dados ->> 'nome'), unidade = coalesce(p_dados ->> 'unidade', unidade),
           categoria = nullif(btrim(coalesce(p_dados ->> 'categoria', '')), ''), minimo = nullif(p_dados ->> 'minimo', '')::numeric,
           controla = coalesce((p_dados ->> 'controla')::boolean, controla), aceita_negativo = coalesce((p_dados ->> 'aceita_negativo')::boolean, aceita_negativo),
           atualizado_em = now()
     where id = p_id and estoque = v_est
    returning id into v_id;
    if v_id is null then
      raise exception 'Insumo não encontrado.' using errcode = 'no_data_found';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.excluir_insumo(p_loja uuid, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  update public.insumos set ativo = false, atualizado_em = now() where id = p_id and estoque = private.estoque_da_loja(p_loja);
  delete from public.fichas_tecnicas where insumo_id = p_id;
end;
$$;

-- Entrada manual (com custo), perda ou contagem (o saldo passa a ser o contado).
create or replace function public.ajustar_estoque(p_loja uuid, p_insumo uuid, p_tipo text, p_qtd numeric, p_custo numeric, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.insumos;
  v_qtd numeric;
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  select * into v from public.insumos where id = p_insumo and estoque = private.estoque_da_loja(p_loja) and ativo;
  if v.id is null then
    raise exception 'Insumo não encontrado.' using errcode = 'no_data_found';
  end if;
  if p_qtd is null or p_qtd < 0 or (p_tipo <> 'contagem' and p_qtd = 0) then
    raise exception 'Informe a quantidade.' using errcode = 'check_violation';
  end if;
  if p_tipo = 'perda' and length(btrim(coalesce(p_motivo, ''))) < 3 then
    raise exception 'Informe o motivo da perda.' using errcode = 'check_violation';
  end if;
  v_qtd := case p_tipo when 'entrada' then p_qtd when 'perda' then -p_qtd when 'contagem' then p_qtd - v.saldo end;
  if v_qtd is null then
    raise exception 'Tipo de ajuste inválido.' using errcode = 'check_violation';
  end if;
  if v_qtd = 0 then
    return;
  end if;
  perform private.mover_estoque(p_insumo, p_loja, p_tipo, v_qtd, case when p_tipo = 'entrada' then p_custo / 100 end, null, null,
                                nullif(btrim(left(coalesce(p_motivo, ''), 200)), ''));
end;
$$;

-- Vínculos lembrados de um fornecedor (para a próxima nota já vir ligada).
create or replace function public.vinculos_fornecedor(p_loja uuid, p_cnpj text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_est uuid := private.estoque_da_loja(p_loja);
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'ja_importada', false,
    'vinculos', coalesce((select jsonb_object_agg(v.codigo, jsonb_build_object('insumo_id', v.insumo_id, 'fator', v.fator))
                            from public.nfe_vinculos v join public.insumos i on i.id = v.insumo_id and i.ativo
                           where v.estoque = v_est and v.fornecedor = regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g')), '{}'::jsonb));
end;
$$;

-- Importa a NF-e conferida na tela: cria insumos novos, lembra vínculos, dá entrada (custo médio).
-- p_nfe: {chave, numero, serie, emissao, emitente_cnpj, emitente_nome, valor_total (centavos),
--         itens: [{n, codigo, descricao, unidade, quantidade, custo_total (centavos), acao: vincular|novo|ignorar,
--                  insumo_id, novo: {nome, unidade}, fator}]}
create or replace function public.importar_nfe(p_loja uuid, p_nfe jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_est   uuid := private.estoque_da_loja(p_loja);
  v_nfe   uuid;
  v_forn  text := regexp_replace(coalesce(p_nfe ->> 'emitente_cnpj', ''), '\D', '', 'g');
  it      jsonb;
  v_ins   uuid;
  v_fator numeric;
  v_qtd   numeric;
  v_n     integer := 0;
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(p_nfe ->> 'chave', '') !~ '^\d{44}$' then
    raise exception 'Chave da NF-e inválida.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.nfe_entradas where estoque = v_est and chave = p_nfe ->> 'chave') then
    raise exception 'Esta nota já foi importada.' using errcode = 'unique_violation';
  end if;
  insert into public.nfe_entradas (estoque, loja_id, chave, numero, serie, emissao, emitente_cnpj, emitente_nome, valor_total, itens, importada_por)
  values (v_est, p_loja, p_nfe ->> 'chave', p_nfe ->> 'numero', p_nfe ->> 'serie', nullif(p_nfe ->> 'emissao', '')::timestamptz, v_forn,
          left(p_nfe ->> 'emitente_nome', 150), (p_nfe ->> 'valor_total')::numeric / 100, coalesce(p_nfe -> 'itens', '[]'::jsonb), auth.uid())
  returning id into v_nfe;

  for it in select jsonb_array_elements(coalesce(p_nfe -> 'itens', '[]'::jsonb)) loop
    continue when it ->> 'acao' = 'ignorar';
    v_fator := coalesce(nullif(it ->> 'fator', '')::numeric, 1);
    if v_fator <= 0 then
      raise exception 'Fator inválido no item %.', it ->> 'descricao' using errcode = 'check_violation';
    end if;
    if it ->> 'acao' = 'novo' then
      insert into public.insumos (estoque, nome, unidade)
      values (v_est, btrim(left(coalesce(it #>> '{novo,nome}', it ->> 'descricao'), 100)), coalesce(it #>> '{novo,unidade}', 'UN'))
      returning id into v_ins;
    else
      select id into v_ins from public.insumos where id = nullif(it ->> 'insumo_id', '')::uuid and estoque = v_est and ativo;
      if v_ins is null then
        raise exception 'Escolha o insumo do item "%".', it ->> 'descricao' using errcode = 'check_violation';
      end if;
    end if;
    if v_forn <> '' and coalesce(it ->> 'codigo', '') <> '' then
      insert into public.nfe_vinculos as v (estoque, fornecedor, codigo, insumo_id, fator)
      values (v_est, v_forn, it ->> 'codigo', v_ins, v_fator)
      on conflict (estoque, fornecedor, codigo) do update set insumo_id = excluded.insumo_id, fator = excluded.fator, atualizado_em = now();
    end if;
    v_qtd := round((it ->> 'quantidade')::numeric * v_fator, 3);
    if v_qtd > 0 then
      perform private.mover_estoque(v_ins, p_loja, 'entrada_nfe', v_qtd, (it ->> 'custo_total')::numeric / 100 / v_qtd, null, v_nfe,
                                    'NF ' || coalesce(p_nfe ->> 'numero', '') || ' · ' || coalesce(p_nfe ->> 'emitente_nome', ''));
      v_n := v_n + 1;
    end if;
  end loop;
  return jsonb_build_object('id', v_nfe, 'entradas', v_n);
end;
$$;

create or replace function public.notas_importadas(p_loja uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'chave', n.chave, 'numero', n.numero, 'emitente', n.emitente_nome,
                                                       'emissao', n.emissao, 'valor', round(n.valor_total * 100), 'itens', jsonb_array_length(n.itens),
                                                       'loja', l.nome, 'em', n.criado_em) order by n.criado_em desc)
                     from (select * from public.nfe_entradas where estoque = private.estoque_da_loja(p_loja) order by criado_em desc limit 100) n
                     join public.lojas l on l.id = n.loja_id), '[]'::jsonb);
end;
$$;

create or replace function public.movimentos_estoque(p_loja uuid, p_insumo uuid default null, p_limite integer default 200)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'insumo', i.nome, 'unidade', i.unidade, 'tipo', m.tipo, 'quantidade', m.quantidade,
                                                       'custo_unit', round(m.custo_unit * 100, 2), 'saldo_apos', m.saldo_apos, 'motivo', m.motivo,
                                                       'loja', l.nome, 'pedido', p.numero, 'em', m.criado_em) order by m.criado_em desc, m.id desc)
                     from (select * from public.estoque_movimentos
                            where estoque = private.estoque_da_loja(p_loja) and (p_insumo is null or insumo_id = p_insumo)
                            order by criado_em desc, id desc limit greatest(1, least(coalesce(p_limite, 200), 1000))) m
                     join public.insumos i on i.id = m.insumo_id
                     left join public.lojas l on l.id = m.loja_id
                     left join public.pedidos p on p.id = m.pedido_id), '[]'::jsonb);
end;
$$;

-- Ficha técnica: o que já tem e os itens de um produto ou opção.
create or replace function public.fichas_loja(p_loja uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((select jsonb_agg(jsonb_build_object('produto_id', f.produto_id, 'opcao_id', f.opcao_id, 'insumo_id', f.insumo_id,
                                                       'insumo', i.nome, 'unidade', i.unidade, 'quantidade', f.quantidade,
                                                       'custo', round(f.quantidade * i.custo_medio * 100, 2)))
                     from public.fichas_tecnicas f join public.insumos i on i.id = f.insumo_id
                    where f.loja_id = p_loja), '[]'::jsonb);
end;
$$;

-- p_itens: [{insumo_id, quantidade}] (troca a ficha inteira do produto ou da opção)
create or replace function public.salvar_ficha(p_loja uuid, p_produto uuid, p_opcao uuid, p_itens jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_est uuid := private.estoque_da_loja(p_loja);
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  if (p_produto is null) = (p_opcao is null) then
    raise exception 'Escolha um produto ou uma opção.' using errcode = 'check_violation';
  end if;
  if p_produto is not null and not exists (select 1 from public.produtos where id = p_produto and loja_id = p_loja)
     or p_opcao is not null and not exists (select 1 from public.opcoes where id = p_opcao and loja_id = p_loja) then
    raise exception 'Produto ou opção de outra loja.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) e
              where not exists (select 1 from public.insumos i where i.id = (e ->> 'insumo_id')::uuid and i.estoque = v_est and i.ativo)
                 or coalesce((e ->> 'quantidade')::numeric, 0) <= 0) then
    raise exception 'Confira os insumos e as quantidades da ficha.' using errcode = 'check_violation';
  end if;
  delete from public.fichas_tecnicas where loja_id = p_loja and produto_id is not distinct from p_produto and opcao_id is not distinct from p_opcao;
  insert into public.fichas_tecnicas (loja_id, produto_id, opcao_id, insumo_id, quantidade)
  select p_loja, p_produto, p_opcao, (e ->> 'insumo_id')::uuid, sum((e ->> 'quantidade')::numeric)
    from jsonb_array_elements(coalesce(p_itens, '[]'::jsonb)) e
   group by (e ->> 'insumo_id')::uuid;
end;
$$;

grant execute on function public.estoque_painel(uuid), public.definir_modo_estoque(uuid, boolean), public.salvar_insumo(uuid, uuid, jsonb),
  public.excluir_insumo(uuid, uuid), public.ajustar_estoque(uuid, uuid, text, numeric, numeric, text), public.vinculos_fornecedor(uuid, text),
  public.importar_nfe(uuid, jsonb), public.notas_importadas(uuid), public.movimentos_estoque(uuid, uuid, integer), public.fichas_loja(uuid),
  public.salvar_ficha(uuid, uuid, uuid, jsonb) to authenticated;
revoke execute on function public.estoque_painel(uuid), public.definir_modo_estoque(uuid, boolean), public.salvar_insumo(uuid, uuid, jsonb),
  public.excluir_insumo(uuid, uuid), public.ajustar_estoque(uuid, uuid, text, numeric, numeric, text), public.vinculos_fornecedor(uuid, text),
  public.importar_nfe(uuid, jsonb), public.notas_importadas(uuid), public.movimentos_estoque(uuid, uuid, integer), public.fichas_loja(uuid),
  public.salvar_ficha(uuid, uuid, uuid, jsonb) from anon, public;
