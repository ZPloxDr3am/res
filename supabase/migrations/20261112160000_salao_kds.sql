-- D-099: SALÃO (mesas, comandas, app do garçom, QR na mesa, fechar conta no caixa) e KDS (tela da cozinha
-- por setor, junto com a impressora).
-- * Mesa/comanda tem uma CONTA aberta; cada envio para a cozinha é uma "rodada" = um pedido de balcão
--   ligado à conta (pedidos.salao_conta_id). Assim preço, pizza, combos, impressão e estoque são os mesmos.
-- * As rodadas não poluem o quadro do delivery (só aparecem lá enquanto "novo", para alguém aceitar).
-- * Fechar conta: taxa de serviço (% da loja, opcional), desconto, várias formas de pagamento; entra no
--   caixa aberto como uma venda por forma; as rodadas viram "concluído".
-- * QR na mesa: o cliente pede pelo celular (/mesa/<código>) e a rodada cai na conta da mesa, com os preços
--   do cardápio digital (o que ele viu na tela); a rodada espera a equipe confirmar (ou o aceite automático).
-- * KDS: estações (Cozinha, Pizzaria, Bar…) com as categorias de cada uma; item pronto por toque; quando
--   todos os itens do pedido ficam prontos, o pedido vai para "pronto".
-- Pode rodar de novo.

-- 1. Configuração da loja
alter table public.lojas add column if not exists taxa_servico_pct numeric(5, 2) not null default 10 check (taxa_servico_pct between 0 and 30);
select private.liberar_colunas_lojas();   -- coluna nova em lojas (D-088)

-- 2. Mesas e comandas
create table if not exists public.salao_locais (
  id        uuid primary key default gen_random_uuid(),
  loja_id   uuid not null references public.lojas (id) on delete cascade,
  tipo      text not null default 'mesa' check (tipo in ('mesa', 'comanda')),
  numero    integer not null check (numero between 1 and 9999),
  nome      text check (nome is null or length(nome) <= 40),
  lugares   smallint check (lugares is null or lugares between 1 and 99),
  qr_token  text not null unique default left(replace(gen_random_uuid()::text, '-', ''), 18),
  ativo     boolean not null default true,
  criado_em timestamptz not null default now(),
  unique (loja_id, tipo, numero)
);

create table if not exists public.salao_contas (
  id           uuid primary key default gen_random_uuid(),
  loja_id      uuid not null references public.lojas (id) on delete cascade,
  local_id     uuid not null references public.salao_locais (id) on delete restrict,
  status       text not null default 'aberta' check (status in ('aberta', 'conta_pedida', 'fechada', 'cancelada')),
  pessoas      smallint not null default 1 check (pessoas between 1 and 99),
  cliente_nome text check (cliente_nome is null or length(cliente_nome) <= 80),
  garcom_id    uuid,
  aberta_em    timestamptz not null default now(),
  aberta_por   uuid,
  fechada_em   timestamptz,
  fechada_por  uuid,
  subtotal     numeric(12, 2),
  taxa_servico numeric(12, 2),
  desconto     numeric(12, 2),
  total        numeric(12, 2),
  observacao   text check (observacao is null or length(observacao) <= 300)
);
create unique index if not exists salao_contas_uma_aberta on public.salao_contas (local_id) where status in ('aberta', 'conta_pedida');
create index if not exists salao_contas_loja on public.salao_contas (loja_id, aberta_em desc);

create table if not exists public.salao_pagamentos (
  id       bigint generated always as identity primary key,
  loja_id  uuid not null references public.lojas (id) on delete cascade,
  conta_id uuid not null references public.salao_contas (id) on delete cascade,
  forma    public.forma_pagamento not null,
  valor    numeric(12, 2) not null check (valor > 0),
  por      uuid,
  em       timestamptz not null default now()
);

alter table public.pedidos add column if not exists salao_conta_id uuid references public.salao_contas (id) on delete set null;
alter table public.pedidos add column if not exists salao_qr boolean not null default false;
create index if not exists pedidos_salao_conta on public.pedidos (salao_conta_id) where salao_conta_id is not null;

-- 3. KDS
create table if not exists public.kds_estacoes (
  id        uuid primary key default gen_random_uuid(),
  loja_id   uuid not null references public.lojas (id) on delete cascade,
  nome      text not null check (length(btrim(nome)) between 1 and 40),
  setores   uuid[] not null default '{}',     -- categorias do cardápio; vazio = tudo
  ordem     smallint not null default 0,
  criado_em timestamptz not null default now()
);
alter table public.pedido_itens add column if not exists kds_pronto_em timestamptz;

alter table public.salao_locais enable row level security;
alter table public.salao_contas enable row level security;
alter table public.salao_pagamentos enable row level security;
alter table public.kds_estacoes enable row level security;
revoke all on public.salao_locais, public.salao_contas, public.salao_pagamentos, public.kds_estacoes from anon, authenticated;
-- leitura direta só para a equipe (o app usa as funções; isto serve ao tempo real da tela do salão)
grant select on public.salao_contas to authenticated;
drop policy if exists salao_contas_ler on public.salao_contas;
create policy salao_contas_ler on public.salao_contas for select to authenticated using (private.e_membro(loja_id));
do $$ begin
  alter publication supabase_realtime add table public.salao_contas;
exception when duplicate_object then null; when undefined_object then null;
end $$;

-- 4. Quem pode: equipe da loja menos motoboy; salão precisa do módulo
create or replace function private.equipe_operacao(p_loja uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.membros m where m.loja_id = p_loja and m.user_id = auth.uid() and m.ativo and m.papel::text <> 'entregador');
$$;

create or replace function private.salao_pode(p_loja uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.equipe_operacao(p_loja) then
    raise exception 'Você não tem acesso ao salão.' using errcode = 'insufficient_privilege';
  end if;
  if not private.loja_tem_modulo(p_loja, 'salao') then
    raise exception 'O Salão não está no seu plano. Veja em Assinatura.' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

create or replace function private.salao_rotulo(l public.salao_locais)
returns text language sql immutable as $$
  select case when l.tipo = 'mesa' then 'Mesa ' else 'Comanda ' end || l.numero || coalesce(' · ' || nullif(btrim(l.nome), ''), '');
$$;

-- muda o status do pedido (mesmos carimbos de mudar_status_pedido), sem a permissão de delivery
create or replace function private.salao_status(p_pedido uuid, p_status public.status_pedido, p_motivo text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.pedidos;
begin
  select * into v from public.pedidos where id = p_pedido for update;
  if not found or v.status = p_status then return; end if;
  if not private.transicao_valida(v.status, p_status, v.tipo) then
    raise exception 'Não dá para ir de "%" para "%".', v.status, p_status using errcode = 'check_violation';
  end if;
  update public.pedidos set
    status = p_status,
    aceito_em = case when p_status = 'em_preparo' then now() else aceito_em end,
    pronto_em = case when p_status = 'pronto' then now() else pronto_em end,
    concluido_em = case when p_status = 'concluido' then now() else concluido_em end,
    cancelado_em = case when p_status = 'cancelado' then now() else cancelado_em end,
    motivo_cancelamento = case when p_status = 'cancelado' then btrim(p_motivo) else motivo_cancelamento end
  where id = p_pedido;
  insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por)
  values (v.loja_id, p_pedido, v.status, p_status, nullif(btrim(p_motivo), ''), auth.uid());
end;
$$;

-- 5. Mesas e comandas (cadastro: dono/gerente)
create or replace function public.salao_salvar_locais(p_loja uuid, p_tipo text, p_de integer, p_ate integer, p_lugares integer default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare n integer := 0; i integer;
begin
  perform private.salao_pode(p_loja);
  if not private.e_gestor(p_loja) then raise exception 'Só o dono ou o gerente cadastram mesas.' using errcode = 'insufficient_privilege'; end if;
  if p_tipo not in ('mesa', 'comanda') or p_de < 1 or p_ate < p_de or p_ate - p_de > 299 then
    raise exception 'Faixa inválida (até 300 de uma vez).' using errcode = 'check_violation';
  end if;
  for i in p_de .. p_ate loop
    insert into public.salao_locais (loja_id, tipo, numero, lugares) values (p_loja, p_tipo, i, p_lugares)
    on conflict (loja_id, tipo, numero) do update set ativo = true, lugares = coalesce(excluded.lugares, salao_locais.lugares);
    n := n + 1;
  end loop;
  return n;
end;
$$;
grant execute on function public.salao_salvar_locais(uuid, text, integer, integer, integer) to authenticated;

create or replace function public.salao_editar_local(p_loja uuid, p_local uuid, p_nome text, p_lugares integer, p_ativo boolean, p_novo_qr boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.salao_pode(p_loja);
  if not private.e_gestor(p_loja) then raise exception 'Só o dono ou o gerente.' using errcode = 'insufficient_privilege'; end if;
  update public.salao_locais set nome = nullif(btrim(coalesce(p_nome, '')), ''), lugares = p_lugares, ativo = coalesce(p_ativo, true),
         qr_token = case when p_novo_qr then left(replace(gen_random_uuid()::text, '-', ''), 18) else qr_token end
   where id = p_local and loja_id = p_loja;
end;
$$;
grant execute on function public.salao_editar_local(uuid, uuid, text, integer, boolean, boolean) to authenticated;

create or replace function public.salao_config(p_loja uuid, p_taxa numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.salao_pode(p_loja);
  if not private.e_gestor(p_loja) then raise exception 'Só o dono ou o gerente.' using errcode = 'insufficient_privilege'; end if;
  update public.lojas set taxa_servico_pct = greatest(0, least(coalesce(p_taxa, 10), 30)) where id = p_loja;
end;
$$;
grant execute on function public.salao_config(uuid, numeric) to authenticated;

-- 6. Mapa do salão
create or replace function public.salao_mapa(p_loja uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.salao_pode(p_loja);
  return jsonb_build_object(
    'taxa_servico_pct', (select taxa_servico_pct from public.lojas where id = p_loja),
    'gestor', private.e_gestor(p_loja),
    'locais', coalesce((select jsonb_agg(jsonb_build_object(
        'id', l.id, 'tipo', l.tipo, 'numero', l.numero, 'nome', l.nome, 'lugares', l.lugares, 'ativo', l.ativo, 'qr', l.qr_token,
        'conta', (select jsonb_build_object('id', c.id, 'status', c.status, 'pessoas', c.pessoas, 'cliente', c.cliente_nome, 'aberta_em', c.aberta_em,
                     'garcom', (select m.nome from public.membros m where m.user_id = c.garcom_id and m.loja_id = c.loja_id),
                     'parcial', (select coalesce(sum(p.total), 0) from public.pedidos p where p.salao_conta_id = c.id and p.status <> 'cancelado'),
                     'a_confirmar', (select count(*) from public.pedidos p where p.salao_conta_id = c.id and p.status = 'novo'),
                     'prontos', (select count(*) from public.pedidos p where p.salao_conta_id = c.id and p.status = 'pronto'))
                    from public.salao_contas c where c.local_id = l.id and c.status in ('aberta', 'conta_pedida')))
        order by l.tipo, l.numero)
      from public.salao_locais l where l.loja_id = p_loja and l.ativo), '[]'::jsonb));
end;
$$;
grant execute on function public.salao_mapa(uuid) to authenticated;

create or replace function private.salao_abrir(p_loja uuid, p_local uuid, p_pessoas integer, p_cliente text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from public.salao_contas where local_id = p_local and status in ('aberta', 'conta_pedida');
  if v_id is not null then return v_id; end if;
  if not exists (select 1 from public.salao_locais where id = p_local and loja_id = p_loja and ativo) then
    raise exception 'Mesa não encontrada.' using errcode = 'no_data_found';
  end if;
  insert into public.salao_contas (loja_id, local_id, pessoas, cliente_nome, garcom_id, aberta_por)
  values (p_loja, p_local, greatest(1, least(coalesce(p_pessoas, 1), 99)), nullif(btrim(coalesce(p_cliente, '')), ''), auth.uid(), auth.uid())
  returning id into v_id;
  return v_id;
exception when unique_violation then
  select id into v_id from public.salao_contas where local_id = p_local and status in ('aberta', 'conta_pedida');
  return v_id;
end;
$$;

create or replace function public.salao_abrir_conta(p_loja uuid, p_local uuid, p_pessoas integer default 1, p_cliente text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  perform private.salao_pode(p_loja);
  return private.salao_abrir(p_loja, p_local, p_pessoas, p_cliente);
end;
$$;
grant execute on function public.salao_abrir_conta(uuid, uuid, integer, text) to authenticated;

-- 7. Rodada: itens vão para a cozinha (mesmo cálculo de preço do balcão)
create or replace function private.salao_rodada(p_loja uuid, p_conta uuid, p_marca uuid, p_itens jsonb, p_obs text, p_origem public.origem_pedido, p_qr boolean, p_nome text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare c public.salao_contas; l public.salao_locais; v_ped uuid;
begin
  select * into c from public.salao_contas where id = p_conta and loja_id = p_loja for update;
  if not found or c.status not in ('aberta', 'conta_pedida') then
    raise exception 'Esta conta não está aberta.' using errcode = 'check_violation';
  end if;
  select * into l from public.salao_locais where id = c.local_id;
  if not exists (select 1 from public.marcas where id = p_marca and loja_id = p_loja) then
    raise exception 'Cardápio não encontrado.' using errcode = 'no_data_found';
  end if;
  v_ped := private.inserir_pedido(p_loja, p_marca, jsonb_build_object(
             -- garçom: preço do salão (balcão); QR: o cliente vê o cardápio digital, então vale o preço de lá
             'tipo', case when p_qr then 'retirada' else 'balcao' end, 'pagamento', 'dinheiro', 'itens', p_itens,
             'cliente', jsonb_build_object('nome', left(private.salao_rotulo(l) || coalesce(' · ' || nullif(btrim(coalesce(p_nome, c.cliente_nome, '')), ''), ''), 120)),
             'observacao', nullif(btrim(coalesce(p_obs, '')), '')), p_origem, auth.uid());
  update public.pedidos set salao_conta_id = c.id, salao_qr = coalesce(p_qr, false) where id = v_ped;
  if c.status = 'conta_pedida' then update public.salao_contas set status = 'aberta' where id = c.id; end if;
  return v_ped;
end;
$$;

-- garçom/atendente: a rodada já sai confirmada (vai direto para a cozinha)
create or replace function public.salao_lancar(p_loja uuid, p_conta uuid, p_marca uuid, p_itens jsonb, p_obs text default null)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_ped uuid;
begin
  perform private.salao_pode(p_loja);
  v_ped := private.salao_rodada(p_loja, p_conta, p_marca, p_itens, p_obs, 'painel', false, null);
  perform private.salao_status(v_ped, 'em_preparo');
  return (select numero from public.pedidos where id = v_ped);
end;
$$;
grant execute on function public.salao_lancar(uuid, uuid, uuid, jsonb, text) to authenticated;

create or replace function public.salao_confirmar_rodada(p_loja uuid, p_pedido uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.salao_pode(p_loja);
  if not exists (select 1 from public.pedidos where id = p_pedido and loja_id = p_loja and salao_conta_id is not null) then
    raise exception 'Rodada não encontrada.' using errcode = 'no_data_found';
  end if;
  perform private.salao_status(p_pedido, 'em_preparo');
end;
$$;
grant execute on function public.salao_confirmar_rodada(uuid, uuid) to authenticated;

-- entregar na mesa (rodada pronta → servida = fica "pronto" até fechar; marca só para a tela)
create or replace function public.salao_cancelar_rodada(p_loja uuid, p_pedido uuid, p_motivo text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform private.salao_pode(p_loja);
  if not (private.e_gestor(p_loja) or private.tem_permissao(p_loja, 'pedidos_delivery')) then
    raise exception 'Só gerente ou caixa cancelam uma rodada.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(btrim(p_motivo), '') = '' then raise exception 'Informe o motivo.' using errcode = 'check_violation'; end if;
  if not exists (select 1 from public.pedidos where id = p_pedido and loja_id = p_loja and salao_conta_id is not null) then
    raise exception 'Rodada não encontrada.' using errcode = 'no_data_found';
  end if;
  perform private.salao_status(p_pedido, 'cancelado', p_motivo);
end;
$$;
grant execute on function public.salao_cancelar_rodada(uuid, uuid, text) to authenticated;

-- 8. Conta: detalhe, pedir conta, transferir, fechar, cancelar
create or replace function private.salao_conta_json(p_conta uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id, 'status', c.status, 'pessoas', c.pessoas, 'cliente', c.cliente_nome, 'aberta_em', c.aberta_em, 'fechada_em', c.fechada_em,
    'local', jsonb_build_object('id', l.id, 'rotulo', private.salao_rotulo(l), 'tipo', l.tipo, 'numero', l.numero),
    'taxa_servico_pct', lj.taxa_servico_pct,
    'garcom', (select m.nome from public.membros m where m.user_id = c.garcom_id and m.loja_id = c.loja_id),
    'rodadas', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'numero', p.numero, 'status', p.status, 'criado_em', p.criado_em, 'total', p.total, 'qr', p.salao_qr, 'observacao', p.observacao,
        'itens', (select jsonb_agg(jsonb_build_object('nome', i.nome, 'quantidade', i.quantidade, 'total', i.total, 'observacao', i.observacao, 'pronto', i.kds_pronto_em is not null,
                     'opcoes', (select string_agg(case when o.fracao is not null and o.fracao < 1 then '½ ' else '' end || o.nome || case when o.quantidade > 1 then ' ×' || o.quantidade else '' end, ', ')
                                  from public.pedido_item_opcoes o where o.item_id = i.id)) order by i.ordem)
                    from public.pedido_itens i where i.pedido_id = p.id)) order by p.criado_em)
      from public.pedidos p where p.salao_conta_id = c.id), '[]'::jsonb),
    'subtotal', (select coalesce(sum(p.total), 0) from public.pedidos p where p.salao_conta_id = c.id and p.status <> 'cancelado'),
    'base_taxa', (select coalesce(sum(i.total), 0) from public.pedidos p join public.pedido_itens i on i.pedido_id = p.id left join public.produtos pr on pr.id = i.produto_id
                   where p.salao_conta_id = c.id and p.status <> 'cancelado' and coalesce(pr.cobra_taxa_servico, true)),
    'pagamentos', coalesce((select jsonb_agg(jsonb_build_object('forma', g.forma, 'valor', g.valor) order by g.id) from public.salao_pagamentos g where g.conta_id = c.id), '[]'::jsonb),
    'taxa_servico', c.taxa_servico, 'desconto', c.desconto, 'total', c.total)
  from public.salao_contas c join public.salao_locais l on l.id = c.local_id join public.lojas lj on lj.id = c.loja_id
  where c.id = p_conta;
$$;

create or replace function public.salao_conta(p_loja uuid, p_conta uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.salao_pode(p_loja);
  if not exists (select 1 from public.salao_contas where id = p_conta and loja_id = p_loja) then
    raise exception 'Conta não encontrada.' using errcode = 'no_data_found';
  end if;
  return private.salao_conta_json(p_conta);
end;
$$;
grant execute on function public.salao_conta(uuid, uuid) to authenticated;

create or replace function public.salao_acao_conta(p_loja uuid, p_conta uuid, p_acao text, p_local uuid default null, p_pessoas integer default null)
returns void language plpgsql security definer set search_path = '' as $$
declare c public.salao_contas;
begin
  perform private.salao_pode(p_loja);
  select * into c from public.salao_contas where id = p_conta and loja_id = p_loja and status in ('aberta', 'conta_pedida') for update;
  if not found then raise exception 'Conta não encontrada ou já fechada.' using errcode = 'no_data_found'; end if;
  if p_acao = 'pedir_conta' then
    update public.salao_contas set status = 'conta_pedida' where id = c.id;
  elsif p_acao = 'reabrir' then
    update public.salao_contas set status = 'aberta' where id = c.id;
  elsif p_acao = 'pessoas' then
    update public.salao_contas set pessoas = greatest(1, least(coalesce(p_pessoas, 1), 99)) where id = c.id;
  elsif p_acao = 'transferir' then
    if exists (select 1 from public.salao_contas where local_id = p_local and status in ('aberta', 'conta_pedida')) then
      raise exception 'A mesa de destino já está ocupada.' using errcode = 'check_violation';
    end if;
    if not exists (select 1 from public.salao_locais where id = p_local and loja_id = p_loja and ativo) then
      raise exception 'Mesa de destino não encontrada.' using errcode = 'no_data_found';
    end if;
    update public.salao_contas set local_id = p_local where id = c.id;
  elsif p_acao = 'cancelar' then
    if exists (select 1 from public.pedidos where salao_conta_id = c.id and status <> 'cancelado') then
      raise exception 'Há itens lançados: feche a conta ou cancele as rodadas antes.' using errcode = 'check_violation';
    end if;
    update public.salao_contas set status = 'cancelada', fechada_em = now(), fechada_por = auth.uid() where id = c.id;
  else
    raise exception 'Ação inválida.' using errcode = 'check_violation';
  end if;
end;
$$;
grant execute on function public.salao_acao_conta(uuid, uuid, text, uuid, integer) to authenticated;

-- fechar: p_pagamentos = [{forma, valor}] (dinheiro pode passar do total: a diferença é troco)
create or replace function public.salao_fechar(p_loja uuid, p_conta uuid, p_com_taxa boolean, p_desconto numeric, p_pagamentos jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  c        public.salao_contas;
  v_sub    numeric(12, 2);
  v_taxa   numeric(12, 2);
  v_desc   numeric(12, 2) := round(greatest(coalesce(p_desconto, 0), 0), 2);
  v_total  numeric(12, 2);
  v_pago   numeric(12, 2);
  v_din    numeric(12, 2);
  v_troco  numeric(12, 2);
  v_sessao uuid;
  v_forma  public.forma_pagamento;
  g        jsonb;
  r        record;
begin
  perform private.salao_pode(p_loja);
  if not (private.e_gestor(p_loja) or private.tem_permissao(p_loja, 'caixa') or private.tem_permissao(p_loja, 'pedidos_delivery')) then
    raise exception 'Quem fecha a conta é o caixa ou o gerente.' using errcode = 'insufficient_privilege';
  end if;
  select * into c from public.salao_contas where id = p_conta and loja_id = p_loja and status in ('aberta', 'conta_pedida') for update;
  if not found then raise exception 'Conta não encontrada ou já fechada.' using errcode = 'no_data_found'; end if;
  if exists (select 1 from public.pedidos where salao_conta_id = c.id and status = 'novo') then
    raise exception 'Há rodada pedida pelo QR esperando confirmação: confirme ou cancele antes de fechar.' using errcode = 'check_violation';
  end if;
  select coalesce(sum(total), 0) into v_sub from public.pedidos where salao_conta_id = c.id and status <> 'cancelado';
  if v_sub <= 0 then raise exception 'Conta sem itens: use Cancelar mesa.' using errcode = 'check_violation'; end if;
  -- taxa de serviço só sobre os itens que cobram (produtos.cobra_taxa_servico)
  v_taxa := case when coalesce(p_com_taxa, true) then round((
              select coalesce(sum(i.total), 0) from public.pedidos p join public.pedido_itens i on i.pedido_id = p.id left join public.produtos pr on pr.id = i.produto_id
               where p.salao_conta_id = c.id and p.status <> 'cancelado' and coalesce(pr.cobra_taxa_servico, true))
              * (select taxa_servico_pct from public.lojas where id = p_loja) / 100, 2) else 0 end;
  if v_desc > v_sub then raise exception 'Desconto maior que a conta.' using errcode = 'check_violation'; end if;
  if v_desc > 0 and not private.e_gestor(p_loja) and v_desc > round(v_sub * coalesce((select limite_desconto_pct from public.lojas where id = p_loja), 100) / 100, 2) then
    raise exception 'Desconto acima do limite da loja: peça ao gerente.' using errcode = 'insufficient_privilege';
  end if;
  v_total := v_sub + v_taxa - v_desc;
  select coalesce(sum((x ->> 'valor')::numeric), 0), coalesce(sum((x ->> 'valor')::numeric) filter (where x ->> 'forma' = 'dinheiro'), 0)
    into v_pago, v_din from jsonb_array_elements(coalesce(p_pagamentos, '[]'::jsonb)) x;
  if v_pago + 0.009 < v_total then
    raise exception 'Faltam % para fechar.', to_char(v_total - v_pago, 'FM999G990D00') using errcode = 'check_violation';
  end if;
  v_troco := round(v_pago - v_total, 2);
  if v_troco > v_din + 0.009 then
    raise exception 'Pagamento acima do total só em dinheiro (troco).' using errcode = 'check_violation';
  end if;

  -- caixa aberto (o da pessoa, senão o mais antigo da loja)
  select s.id into v_sessao from public.caixa_sessoes s
   where s.loja_id = p_loja and s.status = 'aberto'
   order by (s.aberto_por = auth.uid() or exists (select 1 from public.caixa_operadores o where o.caixa_id = s.caixa_id and o.user_id = auth.uid())) desc, s.aberto_em
   limit 1;

  for g in select * from jsonb_array_elements(coalesce(p_pagamentos, '[]'::jsonb)) loop
    if (g ->> 'valor')::numeric <= 0 then continue; end if;
    insert into public.salao_pagamentos (loja_id, conta_id, forma, valor, por)
    values (p_loja, c.id, (g ->> 'forma')::public.forma_pagamento,
            case when g ->> 'forma' = 'dinheiro' then (g ->> 'valor')::numeric - least(v_troco, (g ->> 'valor')::numeric) else (g ->> 'valor')::numeric end, auth.uid());
  end loop;
  delete from public.salao_pagamentos where conta_id = c.id and valor <= 0;
  select forma into v_forma from public.salao_pagamentos where conta_id = c.id order by valor desc limit 1;

  if v_sessao is not null then
    insert into public.caixa_movimentos (loja_id, sessao_id, tipo, forma, valor, descricao, por)
    select p_loja, v_sessao, 'venda', sp.forma, sum(sp.valor), (select private.salao_rotulo(l) from public.salao_locais l where l.id = c.local_id), auth.uid()
      from public.salao_pagamentos sp where sp.conta_id = c.id group by sp.forma;
  end if;
  -- rodadas: concluídas, já com o caixa (o gatilho do caixa não lança de novo)
  for r in select id, status from public.pedidos where salao_conta_id = c.id and status not in ('cancelado', 'concluido') loop
    update public.pedidos set pagamento = coalesce(v_forma, pagamento), caixa_sessao_id = coalesce(v_sessao, caixa_sessao_id) where id = r.id;
    if r.status = 'em_preparo' then perform private.salao_status(r.id, 'pronto'); end if;
    perform private.salao_status(r.id, 'concluido');
  end loop;
  update public.salao_contas set status = 'fechada', fechada_em = now(), fechada_por = auth.uid(),
         subtotal = v_sub, taxa_servico = v_taxa, desconto = v_desc, total = v_total where id = c.id;
  return jsonb_build_object('total', v_total, 'troco', v_troco, 'caixa', v_sessao is not null);
end;
$$;
grant execute on function public.salao_fechar(uuid, uuid, boolean, numeric, jsonb) to authenticated;

-- 9. QR na mesa (cliente, sem login)
create or replace function public.salao_mesa_publica(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'rotulo', private.salao_rotulo(l), 'loja', lj.nome,
    'marcas', (select jsonb_agg(jsonb_build_object('slug', m.slug, 'nome', m.nome) order by m.criado_em) from public.marcas m where m.loja_id = l.loja_id and m.ativa and not m.evento),
    'conta', (select jsonb_build_object('status', c.status,
                 'rodadas', (select jsonb_agg(jsonb_build_object('numero', p.numero, 'status', p.status, 'total', p.total,
                                'itens', (select string_agg(i.quantidade || 'x ' || i.nome, ', ' order by i.ordem) from public.pedido_itens i where i.pedido_id = p.id)) order by p.criado_em)
                               from public.pedidos p where p.salao_conta_id = c.id and p.status <> 'cancelado'),
                 'subtotal', (select coalesce(sum(p.total), 0) from public.pedidos p where p.salao_conta_id = c.id and p.status <> 'cancelado'),
                 'taxa_servico_pct', lj.taxa_servico_pct)
                from public.salao_contas c where c.local_id = l.id and c.status in ('aberta', 'conta_pedida')))
  from public.salao_locais l join public.lojas lj on lj.id = l.loja_id
  where l.qr_token = p_token and l.ativo and private.loja_tem_modulo(l.loja_id, 'salao');
$$;
grant execute on function public.salao_mesa_publica(text) to anon, authenticated;

create or replace function public.salao_pedido_qr(p_token text, p_slug text, p_itens jsonb, p_nome text, p_obs text)
returns integer language plpgsql security definer set search_path = '' as $$
declare l public.salao_locais; v_marca uuid; v_conta uuid; v_ped uuid;
begin
  select * into l from public.salao_locais where qr_token = p_token and ativo;
  if not found or not private.loja_tem_modulo(l.loja_id, 'salao') then
    raise exception 'Mesa não encontrada. Chame o garçom.' using errcode = 'no_data_found';
  end if;
  select id into v_marca from public.marcas where slug = lower(btrim(p_slug)) and loja_id = l.loja_id and ativa;
  if v_marca is null then raise exception 'Cardápio não encontrado.' using errcode = 'no_data_found'; end if;
  -- freio contra cliques repetidos: 1 rodada a cada 20 s por mesa
  if exists (select 1 from public.pedidos p join public.salao_contas c on c.id = p.salao_conta_id
              where c.local_id = l.id and p.salao_qr and p.criado_em > now() - interval '20 seconds') then
    raise exception 'Pedido recebido há pouco. Aguarde uns segundos para pedir de novo.' using errcode = 'check_violation';
  end if;
  v_conta := private.salao_abrir(l.loja_id, l.id, 1, p_nome);
  v_ped := private.salao_rodada(l.loja_id, v_conta, v_marca, p_itens, p_obs, 'cardapio_digital', true, p_nome);
  return (select numero from public.pedidos where id = v_ped);
end;
$$;
grant execute on function public.salao_pedido_qr(text, text, jsonb, text, text) to anon, authenticated;

create or replace function public.salao_qr_pedir_conta(p_token text)
returns void language sql security definer set search_path = '' as $$
  update public.salao_contas c set status = 'conta_pedida'
    from public.salao_locais l where l.id = c.local_id and l.qr_token = p_token and c.status = 'aberta';
$$;
grant execute on function public.salao_qr_pedir_conta(text) to anon, authenticated;

-- 10. KDS
create or replace function public.kds_estacoes_salvar(p_loja uuid, p_id uuid, p_nome text, p_setores uuid[], p_apagar boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid := p_id;
begin
  if not private.e_gestor(p_loja) then raise exception 'Só o dono ou o gerente.' using errcode = 'insufficient_privilege'; end if;
  if p_apagar then delete from public.kds_estacoes where id = p_id and loja_id = p_loja; return null; end if;
  if v_id is null then
    insert into public.kds_estacoes (loja_id, nome, setores, ordem)
    values (p_loja, btrim(p_nome), coalesce(p_setores, '{}'), (select coalesce(max(ordem), 0) + 1 from public.kds_estacoes where loja_id = p_loja))
    returning id into v_id;
  else
    update public.kds_estacoes set nome = btrim(p_nome), setores = coalesce(p_setores, '{}') where id = v_id and loja_id = p_loja;
  end if;
  return v_id;
end;
$$;
grant execute on function public.kds_estacoes_salvar(uuid, uuid, text, uuid[], boolean) to authenticated;

-- fila da tela: pedidos em preparo (e prontos há menos de 3 min, para desfazer) com os itens da estação
create or replace function public.kds_fila(p_loja uuid, p_estacao uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_set uuid[];
begin
  if not private.equipe_operacao(p_loja) then
    raise exception 'Você não tem acesso à cozinha.' using errcode = 'insufficient_privilege';
  end if;
  if p_estacao is not null then
    select setores into v_set from public.kds_estacoes where id = p_estacao and loja_id = p_loja;
  end if;
  return jsonb_build_object(
    'estacoes', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'nome', e.nome, 'setores', e.setores) order by e.ordem) from public.kds_estacoes e where e.loja_id = p_loja), '[]'::jsonb),
    'setores', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'nome', s.nome) order by s.ordem) from public.setores s where s.loja_id = p_loja), '[]'::jsonb),
    'agora', now(),
    'pedidos', coalesce((select jsonb_agg(x order by x ->> 'aceito_em') from (
      select jsonb_build_object(
        'id', p.id, 'numero', p.numero, 'status', p.status, 'tipo', p.tipo, 'origem', p.origem, 'cliente', p.cliente_nome, 'marca', mc.nome,
        'aceito_em', coalesce(p.aceito_em, p.criado_em), 'pronto_em', p.pronto_em, 'observacao', p.observacao, 'externo', p.externo_codigo,
        'mesa', (select private.salao_rotulo(l) from public.salao_contas c join public.salao_locais l on l.id = c.local_id where c.id = p.salao_conta_id),
        'itens', its) as x
        from public.pedidos p join public.marcas mc on mc.id = p.marca_id
        cross join lateral (
          select jsonb_agg(jsonb_build_object('id', i.id, 'nome', i.nome, 'quantidade', i.quantidade, 'observacao', i.observacao, 'pronto', i.kds_pronto_em is not null,
                   'opcoes', (select jsonb_agg(jsonb_build_object('grupo', o.grupo_nome, 'nome', o.nome, 'quantidade', o.quantidade, 'fracao', o.fracao) order by o.grupo_nome) from public.pedido_item_opcoes o where o.item_id = i.id))
                 order by i.ordem) as its
            from public.pedido_itens i left join public.produtos pr on pr.id = i.produto_id
           where i.pedido_id = p.id and (v_set is null or cardinality(v_set) = 0 or pr.setor_id = any (v_set))) t
       where p.loja_id = p_loja and t.its is not null
         and (p.status = 'em_preparo' or (p.status = 'pronto' and p.pronto_em > now() - interval '3 minutes'))
         and coalesce(p.aceito_em, p.criado_em) > now() - interval '12 hours') s), '[]'::jsonb));
end;
$$;
grant execute on function public.kds_fila(uuid, uuid) to authenticated;

-- item pronto (ou desfazer); todos prontos → pedido "pronto"
create or replace function public.kds_marcar(p_loja uuid, p_pedido uuid, p_itens uuid[], p_pronto boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare v public.pedidos;
begin
  if not private.equipe_operacao(p_loja) then
    raise exception 'Você não tem acesso à cozinha.' using errcode = 'insufficient_privilege';
  end if;
  select * into v from public.pedidos where id = p_pedido and loja_id = p_loja;
  if not found then raise exception 'Pedido não encontrado.' using errcode = 'no_data_found'; end if;
  update public.pedido_itens set kds_pronto_em = case when p_pronto then coalesce(kds_pronto_em, now()) else null end
   where pedido_id = p_pedido and id = any (p_itens);
  if p_pronto and v.status = 'em_preparo' and not exists (select 1 from public.pedido_itens where pedido_id = p_pedido and kds_pronto_em is null) then
    perform private.salao_status(p_pedido, 'pronto');
    return 'pronto';
  end if;
  if not p_pronto and v.status = 'pronto' and v.pronto_em > now() - interval '3 minutes' then
    update public.pedidos set status = 'em_preparo', pronto_em = null where id = p_pedido;
    insert into public.pedido_eventos (loja_id, pedido_id, de, para, motivo, por) values (p_loja, p_pedido, 'pronto', 'em_preparo', 'desfeito na cozinha', auth.uid());
    return 'em_preparo';
  end if;
  return v.status::text;
end;
$$;
grant execute on function public.kds_marcar(uuid, uuid, uuid[], boolean) to authenticated;
