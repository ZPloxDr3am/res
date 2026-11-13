-- D-111: AVALIAÇÃO DEPOIS DO PEDIDO. Na página de acompanhamento, pedido concluído há até 7 dias, o cliente
-- dá a nota (1 a 5), marca o que deu errado e escreve um comentário. Nota baixa avisa o painel na hora (tempo
-- real) e entra no Bom dia até alguém resolver; nota 4 ou 5 recebe o convite para avaliar no Google.
-- Pode rodar de novo.

create table if not exists public.avaliacoes_pedido (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references public.lojas (id) on delete cascade,
  pedido_id     uuid not null unique references public.pedidos (id) on delete cascade,
  nota          smallint not null check (nota between 1 and 5),
  problemas     text[] not null default '{}'
    check (problemas <@ array['atraso', 'frio', 'errado', 'faltou', 'embalagem', 'sabor', 'atendimento', 'preco']),
  comentario    text check (comentario is null or length(comentario) <= 500),
  criado_em     timestamptz not null default now(),
  resolvido_em  timestamptz,
  resolvido_por uuid
);
create index if not exists avaliacoes_loja on public.avaliacoes_pedido (loja_id, criado_em desc);
create index if not exists avaliacoes_pendentes on public.avaliacoes_pedido (loja_id) where nota <= 3 and resolvido_em is null;
alter table public.avaliacoes_pedido enable row level security;
revoke all on public.avaliacoes_pedido from anon, authenticated;
-- leitura direta só para quem gere a loja ou vê os pedidos (tempo real do aviso); o resto pelas funções
grant select on public.avaliacoes_pedido to authenticated;
drop policy if exists avaliacoes_ler on public.avaliacoes_pedido;
create policy avaliacoes_ler on public.avaliacoes_pedido for select to authenticated using (private.e_gestor(loja_id));
do $$ begin
  alter publication supabase_realtime add table public.avaliacoes_pedido;
exception when duplicate_object then null; when undefined_object then null;
end $$;

-- o cliente avalia pelo código do pedido (o mesmo link do acompanhamento). Pode corrigir na primeira hora.
create or replace function public.avaliar_pedido(p_codigo uuid, p_nota integer, p_problemas text[] default '{}', p_comentario text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p   public.pedidos;
  a   public.avaliacoes_pedido;
  v_g text;
begin
  select * into p from public.pedidos where codigo = p_codigo;
  if p.id is null then
    raise exception 'Pedido não encontrado.' using errcode = 'no_data_found';
  end if;
  if p.status <> 'concluido' or p.concluido_em < now() - interval '7 days' then
    raise exception 'Só dá para avaliar pedidos entregues nos últimos 7 dias.' using errcode = 'check_violation';
  end if;
  if p_nota is null or p_nota < 1 or p_nota > 5 then
    raise exception 'Escolha de 1 a 5 estrelas.' using errcode = 'check_violation';
  end if;
  select * into a from public.avaliacoes_pedido where pedido_id = p.id for update;
  if a.id is not null and a.criado_em < now() - interval '1 hour' then
    raise exception 'Este pedido já foi avaliado. Obrigado!' using errcode = 'check_violation';
  end if;
  insert into public.avaliacoes_pedido (loja_id, pedido_id, nota, problemas, comentario)
  values (p.loja_id, p.id, p_nota,
          coalesce((select array_agg(distinct x) from unnest(coalesce(p_problemas, '{}')) x
                     where x = any (array['atraso', 'frio', 'errado', 'faltou', 'embalagem', 'sabor', 'atendimento', 'preco'])), '{}'),
          nullif(left(btrim(coalesce(p_comentario, '')), 500), ''))
  on conflict (pedido_id) do update set nota = excluded.nota, problemas = excluded.problemas, comentario = excluded.comentario;
  select i.config ->> 'url' into v_g from public.integracoes i where i.loja_id = p.loja_id and i.tipo = 'google_avaliacao' and i.ativo;
  return jsonb_build_object('google', case when p_nota >= 4 then v_g end);
end;
$$;
revoke all on function public.avaliar_pedido(uuid, integer, text[], text) from public;
grant execute on function public.avaliar_pedido(uuid, integer, text[], text) to anon, authenticated;

-- página do pedido: já avaliou? (D-111) + Pix + link do Google (D-047)
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
           'avaliacao', case when av.ativo then av.config ->> 'url' end,
           'avaliado', (select a.nota from public.avaliacoes_pedido a where a.pedido_id = p.id),
           'pode_avaliar', p.status = 'concluido' and p.concluido_em >= now() - interval '7 days')
    from public.pedidos p
    left join public.integracoes pix on pix.loja_id = p.loja_id and pix.tipo = 'pix'
    left join public.integracoes av on av.loja_id = p.loja_id and av.tipo = 'google_avaliacao'
   where p.codigo = p_codigo;
$$;

-- painel: média, distribuição, problemas mais citados e a lista (dono/gerente)
create or replace function public.avaliacoes_painel(p_loja uuid, p_dias integer default 30)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare v_dias integer := least(greatest(coalesce(p_dias, 30), 7), 365);
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente.' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'dias', v_dias,
    'media', (select round(avg(nota), 2) from public.avaliacoes_pedido where loja_id = p_loja and criado_em >= now() - make_interval(days => v_dias)),
    'total', (select count(*) from public.avaliacoes_pedido where loja_id = p_loja and criado_em >= now() - make_interval(days => v_dias)),
    'pedidos', (select count(*) from public.pedidos where loja_id = p_loja and status = 'concluido' and concluido_em >= now() - make_interval(days => v_dias)),
    'notas', (select jsonb_object_agg(g, (select count(*) from public.avaliacoes_pedido a where a.loja_id = p_loja and a.nota = g and a.criado_em >= now() - make_interval(days => v_dias)))
                from generate_series(1, 5) g),
    'problemas', coalesce((select jsonb_object_agg(x, n) from (
                   select x, count(*) as n from public.avaliacoes_pedido a, unnest(a.problemas) x
                    where a.loja_id = p_loja and a.criado_em >= now() - make_interval(days => v_dias) group by x) t), '{}'::jsonb),
    'lista', coalesce((select jsonb_agg(jsonb_build_object(
                         'id', a.id, 'nota', a.nota, 'problemas', a.problemas, 'comentario', a.comentario, 'em', a.criado_em,
                         'resolvido_em', a.resolvido_em, 'numero', p.numero, 'cliente', p.cliente_nome, 'telefone', p.cliente_telefone,
                         'total', round(p.total * 100), 'tipo', p.tipo) order by (a.nota <= 3 and a.resolvido_em is null) desc, a.criado_em desc)
                       from (select * from public.avaliacoes_pedido where loja_id = p_loja and criado_em >= now() - make_interval(days => v_dias)
                              order by criado_em desc limit 300) a
                       join public.pedidos p on p.id = a.pedido_id), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.avaliacoes_painel(uuid, integer) from public, anon;
grant execute on function public.avaliacoes_painel(uuid, integer) to authenticated;

create or replace function public.avaliacao_resolver(p_loja uuid, p_id uuid, p_resolvido boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.e_gestor(p_loja) then raise exception 'Só o dono ou o gerente.' using errcode = 'insufficient_privilege'; end if;
  update public.avaliacoes_pedido
     set resolvido_em = case when p_resolvido then now() end, resolvido_por = case when p_resolvido then auth.uid() end
   where id = p_id and loja_id = p_loja;
end;
$$;
revoke all on function public.avaliacao_resolver(uuid, uuid, boolean) from public, anon;
grant execute on function public.avaliacao_resolver(uuid, uuid, boolean) to authenticated;

-- Bom dia: + avaliações ruins sem resolver (D-111). Base: versão da D-108.
create or replace function public.resumo_manha(p_loja uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_fuso text;
  v_hoje date;
  v_ini  timestamptz;
  v_est  uuid;
  e      record;
  v_fin  jsonb;
  v_estq jsonb;
  v_on   record;
  v_sem  record;
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente.' using errcode = 'insufficient_privilege';
  end if;
  select coalesce(fuso_horario, 'America/Sao_Paulo') into v_fuso from public.lojas where id = p_loja;
  v_hoje := (now() at time zone v_fuso)::date;
  v_ini := (v_hoje::timestamp) at time zone v_fuso; -- meia-noite de hoje no fuso da loja

  select coalesce(round(sum(p.total) filter (where p.status <> 'cancelado') * 100), 0) as vendas,
         count(*) filter (where p.status <> 'cancelado') as pedidos,
         count(*) filter (where p.status = 'cancelado') as cancelados
    into v_on
    from public.pedidos p
   where p.loja_id = p_loja and p.criado_em >= v_ini - interval '1 day' and p.criado_em < v_ini;
  select coalesce(round(sum(p.total) * 100), 0) as vendas, count(*) as pedidos
    into v_sem
    from public.pedidos p
   where p.loja_id = p_loja and p.criado_em >= v_ini - interval '8 days' and p.criado_em < v_ini - interval '7 days' and p.status <> 'cancelado';

  -- financeiro: o da loja, ou o do grupo quando quem vê é o titular
  select * into e from private.fin_escopo(p_loja);
  if private.fin_pode(e.loja, e.grupo) then
    select jsonb_build_object(
             'vencem_hoje', count(*) filter (where vencimento = v_hoje),
             'valor_hoje', coalesce(round(sum(valor) filter (where vencimento = v_hoje) * 100), 0),
             'vencidas', count(*) filter (where vencimento < v_hoje),
             'valor_vencidas', coalesce(round(sum(valor) filter (where vencimento < v_hoje) * 100), 0),
             'extrato_pendente', (select count(*) from public.fin_extrato x
                                   where x.loja_id is not distinct from e.loja and x.grupo_id is not distinct from e.grupo
                                     and x.lancamento_id is null and x.ignorado is null))
      into v_fin
      from public.fin_lancamentos
     where loja_id is not distinct from e.loja and grupo_id is not distinct from e.grupo
       and tipo = 'despesa' and pago_em is null and vencimento <= v_hoje
       and (e.grupo is null or loja_ref is null or loja_ref = p_loja);
  end if;

  v_est := private.estoque_da_loja(p_loja);
  if v_est is not null then
    select jsonb_build_object(
             'abaixo_minimo', (select count(*) from public.insumos i
                                where i.estoque = v_est and i.ativo and i.controla and i.minimo > 0 and i.saldo <= i.minimo),
             'pausados', (select count(*) from public.produtos p where p.loja_id = p_loja and p.pausado_estoque))
      into v_estq;
  end if;

  return jsonb_build_object(
    'dia', v_hoje,
    'ontem', jsonb_build_object('vendas', v_on.vendas, 'pedidos', v_on.pedidos, 'cancelados', v_on.cancelados),
    'semana_passada', jsonb_build_object('vendas', v_sem.vendas, 'pedidos', v_sem.pedidos),
    'agendados_hoje', (select count(*) from public.pedidos p
                        where p.loja_id = p_loja and p.status <> 'cancelado'
                          and p.agendado_para >= v_ini and p.agendado_para < v_ini + interval '1 day'),
    'financeiro', v_fin,
    'estoque', v_estq,
    'nfe_para_entrada', (select count(*) from public.nfe_recebidas n where n.loja_id = p_loja and n.status = 'disponivel'),
    'motoboys_pendentes', (select count(*) from public.motoboy_solicitacoes s where s.loja_id = p_loja and s.status = 'pendente'),
    'insumos_subiram', case when v_est is null then 0 else (
      select count(*) from (
        select m.insumo_id, m.custo_unit, m.criado_em,
               lag(m.custo_unit) over (partition by m.insumo_id order by m.criado_em, m.id) as antes
          from public.estoque_movimentos m
         where m.estoque = v_est and m.tipo in ('entrada_nfe', 'entrada') and m.custo_unit > 0 and m.quantidade > 0
           and m.criado_em >= now() - interval '120 days') x
       where x.criado_em >= now() - interval '7 days' and x.antes > 0 and x.custo_unit >= x.antes * 1.05) end,
    'avaliacoes_ruins', (select count(*) from public.avaliacoes_pedido a
                          where a.loja_id = p_loja and a.nota <= 3 and a.resolvido_em is null and a.criado_em >= now() - interval '7 days')
  );
end;
$$;
revoke all on function public.resumo_manha(uuid) from public, anon;
grant execute on function public.resumo_manha(uuid) to authenticated;
