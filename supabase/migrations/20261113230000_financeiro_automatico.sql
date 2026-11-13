-- Financeiro automático (D-105)
-- 1. Extrato do banco: o dono sobe o arquivo OFX; cada saída/entrada vira uma linha para conferir.
--    Um clique dá baixa na conta a pagar/receber que ela pagou, lança como despesa/receita já paga ou ignora
--    (ex.: a venda da maquininha, que já está nas vendas do RES). O mesmo extrato duas vezes não duplica.
-- 2. "Bom dia": o resumo da manhã do dono (vendas de ontem e o que precisa de atenção hoje).
-- Pode rodar de novo.

-- 1. linhas do extrato --------------------------------------------------------------------------------
create table if not exists public.fin_extrato (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid references public.lojas (id) on delete cascade,
  grupo_id      uuid references public.contas (id) on delete cascade,
  conta_id      uuid references public.fin_contas (id) on delete set null,
  chave         text not null check (length(chave) between 1 and 300),
  data          date not null,
  valor         numeric(14, 2) not null check (valor <> 0),
  descricao     text not null check (length(descricao) between 1 and 120),
  lancamento_id uuid references public.fin_lancamentos (id) on delete set null,
  -- true quando a linha criou o lançamento (desfazer apaga); false quando deu baixa numa conta que já existia
  criou         boolean not null default false,
  ignorado      text check (ignorado is null or ignorado in ('venda', 'transferencia', 'outro')),
  importado_em  timestamptz not null default now(),
  constraint fin_extrato_dono check (num_nonnulls(loja_id, grupo_id) = 1)
);
create unique index if not exists fin_extrato_chave_loja on public.fin_extrato (loja_id, chave) where loja_id is not null;
create unique index if not exists fin_extrato_chave_grupo on public.fin_extrato (grupo_id, chave) where grupo_id is not null;
create index if not exists fin_extrato_pendente on public.fin_extrato (coalesce(loja_id, grupo_id), data) where lancamento_id is null and ignorado is null;
create index if not exists fin_extrato_lanc on public.fin_extrato (lancamento_id) where lancamento_id is not null;

alter table public.fin_extrato enable row level security;
drop policy if exists fin_extrato_ler on public.fin_extrato;
create policy fin_extrato_ler on public.fin_extrato for select to authenticated using (private.fin_pode(loja_id, grupo_id));
-- gravar só pelas funções abaixo
revoke insert, update, delete on public.fin_extrato from authenticated, anon;

-- linha do extrato do financeiro desta loja (ou do grupo dela), travada para alterar
create or replace function private.fin_extrato_da(p_loja uuid, p_extrato uuid)
returns public.fin_extrato
language plpgsql
security definer
set search_path = ''
as $$
declare
  e record;
  x public.fin_extrato;
begin
  select * into e from private.fin_exigir(p_loja);
  select * into x from public.fin_extrato
   where id = p_extrato and loja_id is not distinct from e.loja and grupo_id is not distinct from e.grupo
   for update;
  if x.id is null then
    raise exception 'Linha do extrato não encontrada.' using errcode = 'no_data_found';
  end if;
  return x;
end;
$$;

-- importa as transações lidas do OFX (no navegador). Devolve quantas entraram e quantas já existiam.
create or replace function public.fin_extrato_importar(p_loja uuid, p_conta uuid, p_itens jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  e       record;
  v_total integer := jsonb_array_length(coalesce(p_itens, '[]'::jsonb));
  v_novas integer;
begin
  select * into e from private.fin_exigir(p_loja);
  if v_total = 0 then
    raise exception 'O extrato não tem lançamentos.' using errcode = 'check_violation';
  end if;
  if v_total > 3000 then
    raise exception 'Extrato grande demais: importe até 3.000 lançamentos por vez (um mês ou dois).' using errcode = 'check_violation';
  end if;
  if p_conta is not null and not exists (select 1 from public.fin_contas c where c.id = p_conta
                                            and c.loja_id is not distinct from e.loja and c.grupo_id is not distinct from e.grupo) then
    raise exception 'Conta bancária não encontrada.' using errcode = 'no_data_found';
  end if;
  with novos as (
    insert into public.fin_extrato (loja_id, grupo_id, conta_id, chave, data, valor, descricao)
    select e.loja, e.grupo, p_conta, left(i ->> 'chave', 300), (i ->> 'data')::date, round((i ->> 'valor')::numeric / 100, 2),
           left(coalesce(nullif(btrim(i ->> 'descricao'), ''), 'Sem descrição'), 120)
      from jsonb_array_elements(p_itens) i
     where coalesce((i ->> 'valor')::numeric, 0) <> 0 and nullif(i ->> 'chave', '') is not null
    on conflict do nothing
    returning 1
  )
  select count(*) into v_novas from novos;
  return jsonb_build_object('novas', v_novas, 'repetidas', v_total - v_novas);
end;
$$;

-- dá baixa na conta a pagar/receber que esta linha do extrato pagou (com o valor e a data do banco)
create or replace function public.fin_extrato_baixar(p_loja uuid, p_extrato uuid, p_lancamento uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  x public.fin_extrato := private.fin_extrato_da(p_loja, p_extrato);
  l public.fin_lancamentos;
begin
  if x.lancamento_id is not null or x.ignorado is not null then
    raise exception 'Esta linha do extrato já foi conferida.' using errcode = 'check_violation';
  end if;
  select * into l from public.fin_lancamentos
   where id = p_lancamento and loja_id is not distinct from x.loja_id and grupo_id is not distinct from x.grupo_id
   for update;
  if l.id is null then
    raise exception 'Conta não encontrada.' using errcode = 'no_data_found';
  end if;
  if l.pago_em is not null then
    raise exception 'Esta conta já está paga.' using errcode = 'check_violation';
  end if;
  if (x.valor < 0) <> (l.tipo = 'despesa') then
    raise exception '%', case when x.valor < 0 then 'Saída do banco só dá baixa em conta a pagar.' else 'Entrada no banco só dá baixa em conta a receber.' end
      using errcode = 'check_violation';
  end if;
  update public.fin_lancamentos
     set pago_em = x.data,
         conta_id = coalesce(x.conta_id, conta_id),
         -- pagou com juros ou desconto: vale o que saiu do banco, e a observação guarda o valor original
         valor = abs(x.valor),
         observacao = case when valor <> abs(x.valor)
                           then left(concat_ws(' · ', observacao, 'valor original R$ ' || replace(to_char(valor, 'FM999999990.00'), '.', ',')), 300)
                           else observacao end,
         atualizado_em = now()
   where id = l.id;
  update public.fin_extrato set lancamento_id = l.id, criou = false where id = x.id;
end;
$$;

-- lança a linha do extrato como despesa/receita já paga (tarifa, Pix para fornecedor sem conta lançada…)
create or replace function public.fin_extrato_lancar(p_loja uuid, p_extrato uuid, p_categoria uuid, p_descricao text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  x    public.fin_extrato := private.fin_extrato_da(p_loja, p_extrato);
  v_id uuid;
begin
  if x.lancamento_id is not null or x.ignorado is not null then
    raise exception 'Esta linha do extrato já foi conferida.' using errcode = 'check_violation';
  end if;
  if p_categoria is not null and not exists (select 1 from public.fin_categorias c where c.id = p_categoria
       and c.loja_id is not distinct from x.loja_id and c.grupo_id is not distinct from x.grupo_id
       and c.tipo = case when x.valor < 0 then 'despesa' else 'receita' end) then
    raise exception 'Categoria inválida para este lançamento.' using errcode = 'check_violation';
  end if;
  insert into public.fin_lancamentos (loja_id, grupo_id, tipo, descricao, valor, vencimento, competencia, categoria_id, conta_id, pago_em, observacao)
  values (x.loja_id, x.grupo_id, case when x.valor < 0 then 'despesa' else 'receita' end,
          left(coalesce(nullif(btrim(p_descricao), ''), x.descricao), 120), abs(x.valor), x.data, x.data, p_categoria, x.conta_id, x.data,
          'Lançado pelo extrato do banco')
  returning id into v_id;
  update public.fin_extrato set lancamento_id = v_id, criou = true where id = x.id;
  return v_id;
end;
$$;

-- ignora (venda da maquininha, transferência entre contas…) ou volta a linha para conferir
create or replace function public.fin_extrato_ignorar(p_loja uuid, p_extrato uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  x public.fin_extrato := private.fin_extrato_da(p_loja, p_extrato);
begin
  if p_motivo is not null and p_motivo not in ('venda', 'transferencia', 'outro') then
    raise exception 'Motivo inválido.' using errcode = 'check_violation';
  end if;
  if x.lancamento_id is not null then
    raise exception 'Desfaça a baixa antes de ignorar.' using errcode = 'check_violation';
  end if;
  update public.fin_extrato set ignorado = p_motivo where id = x.id;
end;
$$;

-- desfaz a conferência: o lançamento criado pelo extrato é apagado; a conta que levou baixa volta a ficar em aberto
create or replace function public.fin_extrato_desfazer(p_loja uuid, p_extrato uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  x public.fin_extrato := private.fin_extrato_da(p_loja, p_extrato);
begin
  if x.lancamento_id is not null then
    if x.criou then
      delete from public.fin_lancamentos where id = x.lancamento_id;
    else
      update public.fin_lancamentos set pago_em = null, atualizado_em = now() where id = x.lancamento_id;
    end if;
  end if;
  update public.fin_extrato set lancamento_id = null, criou = false, ignorado = null where id = x.id;
end;
$$;

-- apaga um extrato importado por engano (só as linhas ainda não conferidas)
create or replace function public.fin_extrato_apagar_pendentes(p_loja uuid, p_de date, p_ate date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  e record;
  n integer;
begin
  select * into e from private.fin_exigir(p_loja);
  delete from public.fin_extrato
   where loja_id is not distinct from e.loja and grupo_id is not distinct from e.grupo
     and lancamento_id is null and ignorado is null and data between p_de and p_ate;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function private.fin_extrato_da(uuid, uuid) from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array['fin_extrato_importar(uuid, uuid, jsonb)', 'fin_extrato_baixar(uuid, uuid, uuid)', 'fin_extrato_lancar(uuid, uuid, uuid, text)',
                           'fin_extrato_ignorar(uuid, uuid, text)', 'fin_extrato_desfazer(uuid, uuid)', 'fin_extrato_apagar_pendentes(uuid, date, date)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- 2. Bom dia ------------------------------------------------------------------------------------------
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
    'motoboys_pendentes', (select count(*) from public.motoboy_solicitacoes s where s.loja_id = p_loja and s.status = 'pendente')
  );
end;
$$;
revoke all on function public.resumo_manha(uuid) from public, anon;
grant execute on function public.resumo_manha(uuid) to authenticated;
