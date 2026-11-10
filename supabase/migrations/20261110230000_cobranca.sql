-- Etapa 3 da análise (D-085): planos, módulos e cobrança do RES.
-- 3 planos por loja (Essencial 199,99 / Profissional 299,99 / Completo 399,99, editáveis no painel da empresa),
-- módulos avulsos, módulos ligados/desligados por conta, fatura automática 5 dias antes de vencer,
-- Pix pelo Mercado Pago, quitação estende 1 mês. No teste grátis e no piloto, tudo liberado.
-- Contas do piloto (ativa sem "pago até") não são cobradas. Pode rodar de novo sem quebrar.

-- 1. Catálogo: módulos e planos (o que é cobrado; o básico de operação vem em todos)
create table if not exists public.modulos_res (
  id        text primary key check (id ~ '^[a-z_]{2,30}$'),
  nome      text not null,
  descricao text not null default '',
  preco     numeric(10, 2) not null default 0 check (preco >= 0),   -- adicional por mês
  cobranca  text not null default 'loja' check (cobranca in ('loja', 'cardapio')), -- por loja, ou por cardápio extra
  ordem     integer not null default 0
);
insert into public.modulos_res (id, nome, descricao, preco, cobranca, ordem) values
  ('ifood',      'Integração iFood',        'Pedidos do iFood entram no quadro e imprimem sozinhos.', 59, 'loja', 10),
  ('pix_online', 'Pix automático',          'Cliente paga o Pix no cardápio e o pedido é confirmado sozinho.', 39, 'loja', 20),
  ('entregas',   'Entregas e motoboy',      'Rotas, app do motoboy e acerto das entregas.', 49, 'loja', 30),
  ('clientes',   'Clientes',                'Cadastro, histórico e contato dos clientes.', 39, 'loja', 40),
  ('promocoes',  'Promoções e cupons',      'Cupons, combos e preços promocionais.', 39, 'loja', 50),
  ('fidelidade', 'Fidelidade',              'Pontos e recompensas para o cliente voltar.', 49, 'loja', 60),
  ('relatorios', 'Relatórios',              'Vendas por período, produto, canal e pagamento.', 39, 'loja', 70),
  ('estoque',    'Estoque e CMV',           'Ficha técnica, baixa automática e custo da mercadoria.', 59, 'loja', 80),
  ('financeiro', 'Financeiro',              'Contas a pagar e receber, fluxo de caixa.', 59, 'loja', 90),
  ('gestao',     'Gestão empresarial',      'DRE, metas e indicadores do negócio.', 59, 'loja', 100),
  ('evento',     'Eventos e aniversários',  'Cardápio especial de evento com data para abrir e fechar.', 39, 'loja', 110),
  ('marcas',     'Cardápio extra (marca)',  'Mais de um cardápio na mesma loja (ex.: pizzaria e açaí).', 99, 'cardapio', 120)
on conflict (id) do nothing;

create table if not exists public.planos_res (
  id         text primary key check (id ~ '^[a-z_]{2,30}$'),
  nome       text not null,
  descricao  text not null default '',
  preco_loja numeric(10, 2) not null check (preco_loja > 0),
  modulos    text[] not null default '{}',
  ordem      integer not null default 0,
  ativo      boolean not null default true
);
insert into public.planos_res (id, nome, descricao, preco_loja, modulos, ordem) values
  ('essencial', 'Essencial', 'Cardápio digital, quadro de pedidos, delivery, impressão e caixa.', 199.99, '{}', 1),
  ('profissional', 'Profissional', 'Tudo do Essencial + iFood, Pix automático, entregas, clientes, promoções, fidelidade e relatórios.', 299.99,
     '{ifood,pix_online,entregas,clientes,promocoes,fidelidade,relatorios}', 2),
  ('completo', 'Completo', 'Tudo do Profissional + estoque, financeiro, gestão, eventos e vários cardápios.', 399.99,
     '{ifood,pix_online,entregas,clientes,promocoes,fidelidade,relatorios,estoque,financeiro,gestao,evento,marcas}', 3)
on conflict (id) do nothing;

alter table public.modulos_res enable row level security;
alter table public.planos_res enable row level security;
drop policy if exists modulos_ler on public.modulos_res;
create policy modulos_ler on public.modulos_res for select to authenticated using (true);
drop policy if exists planos_ler on public.planos_res;
create policy planos_ler on public.planos_res for select to authenticated using (true);
grant select on public.modulos_res, public.planos_res to authenticated;

-- plano de cada conta (novas entram no Profissional; o piloto fica no Completo e sem cobrança)
alter table public.contas add column if not exists plano_res text not null default 'profissional' references public.planos_res (id);
update public.contas set plano_res = 'completo' where situacao = 'ativa' and pago_ate is null and plano_res = 'profissional';

-- adicional ou exceção por conta: ligado (cobra, ou cortesia) ou desligado (bloqueia mesmo se o plano tiver)
create table if not exists public.contas_modulos (
  conta_id uuid not null references public.contas (id) on delete cascade,
  modulo   text not null references public.modulos_res (id) on delete cascade,
  ligado   boolean not null,
  cobrar   boolean not null default true,
  nota     text check (nota is null or length(nota) <= 200),
  criado_em timestamptz not null default now(),
  primary key (conta_id, modulo)
);
alter table public.contas_modulos enable row level security;
drop policy if exists contas_modulos_ler on public.contas_modulos;
create policy contas_modulos_ler on public.contas_modulos for select to authenticated using (private.e_titular(conta_id) or private.e_equipe_res());
grant select on public.contas_modulos to authenticated;

-- módulos que a conta usa agora. Teste grátis e piloto: todos (menos os desligados pela equipe).
create or replace function private.modulos_conta(p_conta uuid)
returns text[] language sql stable security definer set search_path = '' as $$
  with c as (select * from public.contas where id = p_conta),
  base as (
    select case when (select situacao from c) = 'teste' or ((select situacao from c) = 'ativa' and (select pago_ate from c) is null)
                then (select array_agg(id) from public.modulos_res)
                else coalesce((select p.modulos from public.planos_res p where p.id = (select plano_res from c)), '{}') end as m
  )
  select coalesce(array_agg(distinct x order by x), '{}') from (
    select unnest((select m from base)) as x
    union select modulo from public.contas_modulos where conta_id = p_conta and ligado
  ) u
  where x not in (select modulo from public.contas_modulos where conta_id = p_conta and not ligado);
$$;

create or replace function private.loja_tem_modulo(p_loja uuid, p_modulo text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(p_modulo = any (private.modulos_conta((select conta_id from public.lojas where id = p_loja))), false);
$$;
create or replace function public.loja_tem_modulo(p_loja uuid, p_modulo text)
returns boolean language sql stable security definer set search_path = '' as $$ select private.loja_tem_modulo(p_loja, p_modulo); $$;
revoke execute on function public.loja_tem_modulo(uuid, text) from public, anon;
grant execute on function public.loja_tem_modulo(uuid, text) to authenticated, service_role;

-- quem trabalha na loja vê o que está liberado (menu e telas)
create or replace function public.meus_modulos(p_loja uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare c public.contas;
begin
  if not private.e_membro(p_loja) then
    raise exception 'Sem acesso a esta loja.' using errcode = 'insufficient_privilege';
  end if;
  select * into c from public.contas where id = (select conta_id from public.lojas where id = p_loja);
  return jsonb_build_object('plano', c.plano_res, 'modulos', to_jsonb(private.modulos_conta(c.id)),
    'liberado_por', case when c.situacao = 'teste' then 'teste' when c.situacao = 'ativa' and c.pago_ate is null then 'piloto' else null end);
end;
$$;
grant execute on function public.meus_modulos(uuid) to authenticated;

-- quanto a conta paga por mês: plano × lojas + adicionais × lojas + cardápios extras
create or replace function private.valor_conta(p_conta uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  c       public.contas;
  p       public.planos_res;
  v_lojas integer;
  v_extra integer;
  itens   jsonb := '[]'::jsonb;
  m       record;
begin
  select * into c from public.contas where id = p_conta;
  select * into p from public.planos_res where id = c.plano_res;
  select greatest(count(*), 1) into v_lojas from public.lojas where conta_id = p_conta;
  itens := itens || jsonb_build_array(jsonb_build_object('descricao', 'Plano ' || p.nome, 'qtd', v_lojas, 'unitario', p.preco_loja, 'total', round(p.preco_loja * v_lojas, 2)));
  for m in select r.* from public.contas_modulos cm join public.modulos_res r on r.id = cm.modulo
            where cm.conta_id = p_conta and cm.ligado and cm.cobrar and r.preco > 0 and not (r.id = any (p.modulos)) and r.cobranca = 'loja'
            order by r.ordem loop
    itens := itens || jsonb_build_array(jsonb_build_object('descricao', m.nome, 'qtd', v_lojas, 'unitario', m.preco, 'total', round(m.preco * v_lojas, 2)));
  end loop;
  -- cardápio extra: o 1º de cada loja vem no plano (eventos não contam)
  if not ('marcas' = any (p.modulos)) and not exists (select 1 from public.contas_modulos where conta_id = p_conta and modulo = 'marcas' and ligado and not cobrar) then
    select greatest(count(*) - v_lojas, 0) into v_extra from public.marcas mc join public.lojas l on l.id = mc.loja_id where l.conta_id = p_conta and not mc.evento;
    if v_extra > 0 then
      select * into m from public.modulos_res where id = 'marcas';
      itens := itens || jsonb_build_array(jsonb_build_object('descricao', m.nome, 'qtd', v_extra, 'unitario', m.preco, 'total', round(m.preco * v_extra, 2)));
    end if;
  end if;
  return jsonb_build_object('plano', p.id, 'lojas', v_lojas, 'itens', itens,
                            'total', (select coalesce(sum((i ->> 'total')::numeric), 0) from jsonb_array_elements(itens) i));
end;
$$;

-- 0. Brecha: o titular podia mudar situação, prazos e limites da própria conta direto na tabela
create or replace function private.contas_protege_cobranca()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.situacao is distinct from old.situacao or new.teste_ate is distinct from old.teste_ate
    or new.pago_ate is distinct from old.pago_ate or new.limite_lojas is distinct from old.limite_lojas
    or new.limite_cardapios is distinct from old.limite_cardapios or new.plano is distinct from old.plano
    or new.origem is distinct from old.origem or new.aceite_termos_em is distinct from old.aceite_termos_em
    or new.aceite_termos_versao is distinct from old.aceite_termos_versao or new.situacao_nota is distinct from old.situacao_nota
    or new.plano_res is distinct from old.plano_res) then
    raise exception 'Plano, prazos e limites da conta são alterados só pela equipe RES.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;
drop trigger if exists contas_protege_cobranca on public.contas;
create trigger contas_protege_cobranca before update on public.contas for each row execute function private.contas_protege_cobranca();

-- 2. Faturas
create table if not exists public.faturas_res (
  id            uuid primary key default gen_random_uuid(),
  conta_id      uuid not null references public.contas (id) on delete cascade,
  inicio        date not null,                                   -- começo do mês coberto
  lojas         integer not null check (lojas >= 1),
  plano         text,
  itens         jsonb not null default '[]'::jsonb,
  valor         numeric(10, 2) not null check (valor > 0),
  vence_em      date not null,
  status        text not null default 'aberta' check (status in ('aberta', 'paga', 'cancelada')),
  forma         text check (forma is null or forma in ('pix', 'manual')),
  pago_em       timestamptz,
  mp_payment_id bigint,
  pix_qr        text,
  pix_qr_base64 text,
  pix_expira_em timestamptz,
  nota          text check (nota is null or length(nota) <= 300),
  criado_em     timestamptz not null default now(),
  unique (conta_id, inicio)
);
create index if not exists faturas_res_conta on public.faturas_res (conta_id, inicio desc);
create unique index if not exists faturas_res_mp on public.faturas_res (mp_payment_id) where mp_payment_id is not null;
alter table public.faturas_res enable row level security;
drop policy if exists faturas_ler on public.faturas_res;
create policy faturas_ler on public.faturas_res for select to authenticated using (private.e_titular(conta_id) or private.e_equipe_res());
grant select on public.faturas_res to authenticated;
revoke all on public.faturas_res from anon;

-- fim do período atual da conta (teste ou pago); null = sem prazo (piloto)
create or replace function private.fim_periodo(c public.contas)
returns timestamptz language sql immutable as $$
  select case c.situacao when 'teste' then c.teste_ate when 'ativa' then c.pago_ate else coalesce(c.pago_ate, c.teste_ate) end;
$$;

create or replace function private.gerar_fatura(p_conta uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  c       public.contas;
  v_ini   date;
  v_val   jsonb;
  v_id    uuid;
begin
  select * into c from public.contas where id = p_conta;
  if not found then
    return null;
  end if;
  v_ini := greatest(coalesce(private.fim_periodo(c), now()), now())::date;
  if c.situacao = 'ativa' and c.pago_ate is null then
    return null; -- piloto / sem prazo: não cobra
  end if;
  -- já existe fatura aberta: devolve ela
  select id into v_id from public.faturas_res where conta_id = p_conta and status = 'aberta' order by inicio desc limit 1;
  if v_id is not null then
    return v_id;
  end if;
  v_val := private.valor_conta(p_conta);
  insert into public.faturas_res (conta_id, inicio, lojas, plano, itens, valor, vence_em)
  values (p_conta, v_ini, (v_val ->> 'lojas')::int, v_val ->> 'plano', v_val -> 'itens', (v_val ->> 'total')::numeric, v_ini)
  on conflict (conta_id, inicio) do nothing
  returning id into v_id;
  return v_id;
end;
$$;

-- plano/adicional mudou: a fatura aberta (sem Pix gerado) acompanha
create or replace function private.atualizar_fatura_aberta(p_conta uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v jsonb := private.valor_conta(p_conta);
begin
  update public.faturas_res set lojas = (v ->> 'lojas')::int, plano = v ->> 'plano', itens = v -> 'itens', valor = (v ->> 'total')::numeric
   where conta_id = p_conta and status = 'aberta' and mp_payment_id is null;
end;
$$;

-- todo dia: fatura para quem vence em até 5 dias (teste ou mês pago)
create or replace function private.gerar_faturas_do_dia()
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0;
begin
  for r in select c.id from public.contas c
            where private.fim_periodo(c) is not null and private.fim_periodo(c) <= now() + interval '5 days'
              and not (c.situacao = 'ativa' and c.pago_ate is null) and c.situacao <> 'suspensa'
              and not exists (select 1 from public.faturas_res f where f.conta_id = c.id and f.status = 'aberta')
  loop
    if private.gerar_fatura(r.id) is not null then n := n + 1; end if;
  end loop;
  return n;
end;
$$;
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('res-faturas', '7 12 * * *', 'select private.gerar_faturas_do_dia()'); -- 09:07 em Brasília
  end if;
exception when others then raise notice 'geração de faturas não agendada: %', sqlerrm;
end $$;

-- quitar: conta ativa por mais 1 mês a partir do fim do período (ou de hoje, se já venceu)
create or replace function private.quitar_fatura(p_fatura uuid, p_forma text, p_nota text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare f public.faturas_res; c public.contas; v_base timestamptz;
begin
  select * into f from public.faturas_res where id = p_fatura for update;
  if not found or f.status <> 'aberta' then
    return;
  end if;
  select * into c from public.contas where id = f.conta_id for update;
  v_base := greatest(coalesce(private.fim_periodo(c), now()), now());
  update public.faturas_res set status = 'paga', forma = p_forma, pago_em = now(), nota = coalesce(left(p_nota, 300), nota) where id = f.id;
  update public.contas set situacao = 'ativa', pago_ate = v_base + interval '1 month' where id = f.conta_id;
end;
$$;

-- 3. Painel do restaurante: minha assinatura (titular)
create or replace function public.minha_assinatura(p_loja uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_conta uuid; c public.contas;
begin
  select conta_id into v_conta from public.lojas where id = p_loja;
  if v_conta is null or not private.e_titular(v_conta) then
    raise exception 'Só o dono da conta vê a assinatura.' using errcode = 'insufficient_privilege';
  end if;
  select * into c from public.contas where id = v_conta;
  return jsonb_build_object(
    'conta_id', c.id, 'situacao', c.situacao, 'teste_ate', c.teste_ate, 'pago_ate', c.pago_ate, 'liberada', private.conta_liberada(c.id),
    'sem_cobranca', c.situacao = 'ativa' and c.pago_ate is null,
    'plano', c.plano_res, 'valor', private.valor_conta(c.id), 'modulos_ativos', to_jsonb(private.modulos_conta(c.id)),
    'planos', (select jsonb_agg(to_jsonb(p) order by p.ordem) from public.planos_res p where p.ativo or p.id = c.plano_res),
    'catalogo', (select jsonb_agg(to_jsonb(m) order by m.ordem) from public.modulos_res m),
    'adicionais', coalesce((select jsonb_agg(jsonb_build_object('modulo', cm.modulo, 'ligado', cm.ligado, 'cobrar', cm.cobrar)) from public.contas_modulos cm where cm.conta_id = c.id), '[]'::jsonb),
    'faturas', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'inicio', f.inicio, 'lojas', f.lojas, 'valor', f.valor, 'vence_em', f.vence_em, 'itens', f.itens,
                                 'status', f.status, 'forma', f.forma, 'pago_em', f.pago_em, 'tem_pix', f.pix_qr is not null) order by f.inicio desc)
                          from public.faturas_res f where f.conta_id = c.id), '[]'::jsonb));
end;
$$;
grant execute on function public.minha_assinatura(uuid) to authenticated;

-- o dono pede a fatura antes da hora (ex.: teste acabou e ele quer pagar já)
create or replace function public.gerar_minha_fatura(p_loja uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_conta uuid;
begin
  select conta_id into v_conta from public.lojas where id = p_loja;
  if v_conta is null or not private.e_titular(v_conta) then
    raise exception 'Só o dono da conta.' using errcode = 'insufficient_privilege';
  end if;
  return private.gerar_fatura(v_conta);
end;
$$;
grant execute on function public.gerar_minha_fatura(uuid) to authenticated;

-- o dono troca de plano (vale na hora; a fatura aberta acompanha)
create or replace function public.escolher_plano(p_loja uuid, p_plano text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_conta uuid;
begin
  select conta_id into v_conta from public.lojas where id = p_loja;
  if v_conta is null or not private.e_titular(v_conta) then
    raise exception 'Só o dono da conta.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.planos_res where id = p_plano and ativo) then
    raise exception 'Plano não encontrado.' using errcode = 'no_data_found';
  end if;
  update public.contas set plano_res = p_plano where id = v_conta;
  perform private.atualizar_fatura_aberta(v_conta);
end;
$$;
grant execute on function public.escolher_plano(uuid, text) to authenticated;

-- o dono contrata ou tira um adicional (não mexe em cortesia nem em bloqueio da equipe)
create or replace function public.contratar_adicional(p_loja uuid, p_modulo text, p_ligar boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_conta uuid;
begin
  select conta_id into v_conta from public.lojas where id = p_loja;
  if v_conta is null or not private.e_titular(v_conta) then
    raise exception 'Só o dono da conta.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.modulos_res where id = p_modulo and cobranca = 'loja') then
    raise exception 'Adicional não encontrado.' using errcode = 'no_data_found';
  end if;
  if exists (select 1 from public.contas_modulos where conta_id = v_conta and modulo = p_modulo and (not ligado or not cobrar)) then
    raise exception 'Este módulo foi ajustado pelo time do RES. Fale com o suporte.' using errcode = 'check_violation';
  end if;
  if p_ligar then
    insert into public.contas_modulos (conta_id, modulo, ligado, cobrar) values (v_conta, p_modulo, true, true) on conflict do nothing;
  else
    delete from public.contas_modulos where conta_id = v_conta and modulo = p_modulo and ligado and cobrar;
  end if;
  perform private.atualizar_fatura_aberta(v_conta);
end;
$$;
grant execute on function public.contratar_adicional(uuid, text, boolean) to authenticated;

-- 4. Servidor (chave de serviço): Pix gerado e pagamento confirmado pelo Mercado Pago
create or replace function public.fatura_para_pix(p_fatura uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', f.id, 'conta_id', f.conta_id, 'valor', f.valor, 'status', f.status, 'inicio', f.inicio,
                            'mp_payment_id', f.mp_payment_id, 'pix_qr', f.pix_qr, 'pix_qr_base64', f.pix_qr_base64, 'pix_expira_em', f.pix_expira_em,
                            'conta', c.nome, 'email', c.responsavel_email)
    from public.faturas_res f join public.contas c on c.id = f.conta_id where f.id = p_fatura;
$$;
create or replace function public.fatura_registrar_pix(p_fatura uuid, p_mp bigint, p_qr text, p_base64 text, p_expira timestamptz)
returns void language sql security definer set search_path = '' as $$
  update public.faturas_res set mp_payment_id = p_mp, pix_qr = p_qr, pix_qr_base64 = p_base64, pix_expira_em = p_expira
   where id = p_fatura and status = 'aberta';
$$;
create or replace function public.fatura_quitar_mp(p_fatura uuid, p_mp bigint, p_valor numeric)
returns text language plpgsql security definer set search_path = '' as $$
declare f public.faturas_res;
begin
  select * into f from public.faturas_res where id = p_fatura;
  if not found then return 'sem_fatura'; end if;
  if f.status = 'paga' then return 'ja_paga'; end if;
  if p_valor + 0.009 < f.valor then return 'valor_menor'; end if;
  update public.faturas_res set mp_payment_id = p_mp where id = f.id;
  perform private.quitar_fatura(f.id, 'pix');
  return 'paga';
end;
$$;
revoke execute on function public.fatura_para_pix(uuid) from public, anon, authenticated;
revoke execute on function public.fatura_registrar_pix(uuid, bigint, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.fatura_quitar_mp(uuid, bigint, numeric) from public, anon, authenticated;
grant execute on function public.fatura_para_pix(uuid) to service_role;
grant execute on function public.fatura_registrar_pix(uuid, bigint, text, text, timestamptz) to service_role;
grant execute on function public.fatura_quitar_mp(uuid, bigint, numeric) to service_role;

-- 5. Painel da empresa
create or replace function public.cobranca_plataforma()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'planos', (select jsonb_agg(to_jsonb(p) order by p.ordem) from public.planos_res p),
    'catalogo', (select jsonb_agg(to_jsonb(m) order by m.ordem) from public.modulos_res m),
    'previsto', coalesce((select sum((private.valor_conta(c.id) ->> 'total')::numeric) from public.contas c where c.situacao in ('ativa', 'teste') and not (c.situacao = 'ativa' and c.pago_ate is null)), 0),
    'mrr', coalesce((select sum(f.valor) from public.faturas_res f where f.status = 'paga' and f.pago_em > now() - interval '31 days'), 0),
    'contas_pagantes', (select count(*) from public.contas c where c.situacao = 'ativa' and c.pago_ate is not null and c.pago_ate >= now()),
    'lojas_pagantes', (select count(*) from public.lojas l join public.contas c on c.id = l.conta_id where c.situacao = 'ativa' and c.pago_ate is not null and c.pago_ate >= now()),
    'faturas', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'conta', c.nome, 'conta_id', c.id, 'inicio', f.inicio, 'lojas', f.lojas, 'valor', f.valor,
                                   'vence_em', f.vence_em, 'status', f.status, 'forma', f.forma, 'pago_em', f.pago_em, 'nota', f.nota,
                                   'telefone', c.responsavel_telefone) order by f.status = 'aberta' desc, f.vence_em desc)
                           from public.faturas_res f join public.contas c on c.id = f.conta_id where f.criado_em > now() - interval '180 days'), '[]'::jsonb));
end;
$$;
grant execute on function public.cobranca_plataforma() to authenticated;

create or replace function public.fatura_acao(p_fatura uuid, p_acao text, p_nota text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  if p_acao = 'pagar' then
    perform private.quitar_fatura(p_fatura, 'manual', p_nota);
  elsif p_acao = 'cancelar' then
    update public.faturas_res set status = 'cancelada', nota = coalesce(left(p_nota, 300), nota) where id = p_fatura and status = 'aberta';
  else
    raise exception 'Ação inválida.' using errcode = 'check_violation';
  end if;
end;
$$;
grant execute on function public.fatura_acao(uuid, text, text) to authenticated;

create or replace function public.fatura_gerar_para(p_conta uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  return private.gerar_fatura(p_conta);
end;
$$;
grant execute on function public.fatura_gerar_para(uuid) to authenticated;

-- planos e preços (painel da empresa)
create or replace function public.salvar_plano(p_id text, p_nome text, p_descricao text, p_preco numeric, p_modulos text[], p_ativo boolean default true)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  if p_preco is null or p_preco < 1 or p_preco > 100000 or length(btrim(coalesce(p_nome, ''))) not between 2 and 40 then
    raise exception 'Nome ou preço inválido.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from unnest(coalesce(p_modulos, '{}')) x where x not in (select id from public.modulos_res)) then
    raise exception 'Módulo desconhecido.' using errcode = 'check_violation';
  end if;
  insert into public.planos_res (id, nome, descricao, preco_loja, modulos, ativo, ordem)
  values (p_id, btrim(p_nome), left(btrim(coalesce(p_descricao, '')), 300), round(p_preco, 2), coalesce(p_modulos, '{}'), coalesce(p_ativo, true),
          (select coalesce(max(ordem), 0) + 1 from public.planos_res))
  on conflict (id) do update set nome = excluded.nome, descricao = excluded.descricao, preco_loja = excluded.preco_loja, modulos = excluded.modulos, ativo = excluded.ativo;
  perform private.atualizar_fatura_aberta(c.id) from public.contas c where c.plano_res = p_id;
end;
$$;
grant execute on function public.salvar_plano(text, text, text, numeric, text[], boolean) to authenticated;

create or replace function public.salvar_preco_modulo(p_modulo text, p_preco numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  if p_preco is null or p_preco < 0 or p_preco > 100000 then
    raise exception 'Preço inválido.' using errcode = 'check_violation';
  end if;
  update public.modulos_res set preco = round(p_preco, 2) where id = p_modulo;
end;
$$;
grant execute on function public.salvar_preco_modulo(text, numeric) to authenticated;

-- plano e módulos de um cliente: estado = 'plano' (segue o plano), 'adicional' (cobra), 'cortesia' (liga sem cobrar), 'desligado'
create or replace function public.ajustar_conta_plano(p_conta uuid, p_plano text default null, p_modulo text default null, p_estado text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.contas where id = p_conta) then
    raise exception 'Conta não encontrada.' using errcode = 'no_data_found';
  end if;
  if p_plano is not null then
    if not exists (select 1 from public.planos_res where id = p_plano) then
      raise exception 'Plano não encontrado.' using errcode = 'no_data_found';
    end if;
    update public.contas set plano_res = p_plano where id = p_conta;
  end if;
  if p_modulo is not null then
    if p_estado = 'plano' then
      delete from public.contas_modulos where conta_id = p_conta and modulo = p_modulo;
    elsif p_estado in ('adicional', 'cortesia', 'desligado') then
      insert into public.contas_modulos (conta_id, modulo, ligado, cobrar) values (p_conta, p_modulo, p_estado <> 'desligado', p_estado = 'adicional')
      on conflict (conta_id, modulo) do update set ligado = excluded.ligado, cobrar = excluded.cobrar;
    else
      raise exception 'Estado inválido.' using errcode = 'check_violation';
    end if;
  end if;
  perform private.atualizar_fatura_aberta(p_conta);
end;
$$;
grant execute on function public.ajustar_conta_plano(uuid, text, text, text) to authenticated;

-- lista de clientes do painel da empresa ganha plano, módulos e valor do mês
create or replace function public.contas_da_plataforma()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', c.id, 'nome', c.nome, 'origem', c.origem, 'situacao', c.situacao, 'teste_ate', c.teste_ate, 'pago_ate', c.pago_ate,
             'liberada', private.conta_liberada(c.id), 'criado_em', c.criado_em, 'limite_lojas', c.limite_lojas,
             'responsavel', c.responsavel_nome, 'telefone', c.responsavel_telefone, 'email', c.responsavel_email,
             'comercial', c.info_comercial, 'nota', c.situacao_nota,
             'plano', c.plano_res, 'valor_mes', (private.valor_conta(c.id) ->> 'total')::numeric,
             'modulos', to_jsonb(private.modulos_conta(c.id)),
             'ajustes', coalesce((select jsonb_object_agg(cm.modulo, case when not cm.ligado then 'desligado' when cm.cobrar then 'adicional' else 'cortesia' end)
                                    from public.contas_modulos cm where cm.conta_id = c.id), '{}'::jsonb),
             'lojas', (select jsonb_agg(jsonb_build_object('nome', l.nome, 'cidade', l.cidade, 'uf', l.uf,
                                        'pedidos_7d', (select count(*) from public.pedidos p where p.loja_id = l.id and p.criado_em > now() - interval '7 days'),
                                        'cardapio_aberto', exists (select 1 from public.marcas m where m.loja_id = l.id and m.status_cardapio <> 'fechado'))
                                        order by l.nome)
                         from public.lojas l where l.conta_id = c.id))
           order by c.criado_em desc)
      from public.contas c), '[]'::jsonb);
end;
$$;
grant execute on function public.contas_da_plataforma() to authenticated;
