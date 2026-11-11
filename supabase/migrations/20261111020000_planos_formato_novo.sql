-- D-090: precificação no formato que o mercado usa (inspirado no BeeFood).
-- Plano por tipo de operação e por CONTA (não mais por loja): Delivery 149,90 · Salão 149,90 · Completo 239,90.
-- Loja/cardápio a mais = 49,90 cada. Adicionais por conta (R$ 19,90 a 49,90). Aparelhos (App Entregador,
-- App Garçom) vêm inclusos no plano (5) e o extra é por unidade (19,90). Plano anual com 20% de desconto.
-- Tudo editável no painel da empresa. Teste grátis e piloto: tudo liberado e sem limite. Pode rodar de novo.

-- 1. Catálogo: tipos de cobrança novos
alter table public.modulos_res drop constraint if exists modulos_res_cobranca_check;
alter table public.modulos_res add constraint modulos_res_cobranca_check check (cobranca in ('conta', 'loja', 'cardapio', 'aparelho'));

insert into public.modulos_res (id, nome, descricao, preco, cobranca, ordem) values
  ('salao',          'Salão e garçom',  'Mesas, comandas e pedido pelo garçom.', 49.90, 'conta', 35),
  ('app_entregador', 'App Entregador',  'Celular do motoboy: rota, aceite e baixa da entrega.', 19.90, 'aparelho', 200),
  ('app_garcom',     'App Garçom',      'Celular do garçom: pedido na mesa.', 19.90, 'aparelho', 210)
on conflict (id) do nothing;

update public.modulos_res set cobranca = 'conta' where cobranca = 'loja';
update public.modulos_res m set preco = v.preco, nome = coalesce(v.nome, m.nome), descricao = coalesce(v.descricao, m.descricao)
  from (values
    ('ifood', 49.90, 'iFood e marketplaces', null),
    ('pix_online', 29.90, null, null),
    ('entregas', 49.90, null, null),
    ('clientes', 19.90, null, null),
    ('promocoes', 29.90, null, null),
    ('fidelidade', 29.90, null, null),
    ('relatorios', 19.90, null, null),
    ('estoque', 29.90, null, null),
    ('financeiro', 29.90, null, null),
    ('gestao', 29.90, null, null),
    ('evento', 19.90, null, null),
    ('marcas', 49.90, 'Loja ou cardápio extra', 'Cada loja ou cardápio além do primeiro (o plano cobre 1).')
  ) as v(id, preco, nome, descricao)
 where m.id = v.id and m.preco <> v.preco;  -- só na primeira vez (depois manda o painel da empresa)

-- 2. Planos por operação, preço por conta, aparelhos inclusos
alter table public.planos_res add column if not exists incluidos jsonb not null default '{}'::jsonb;
insert into public.planos_res (id, nome, descricao, preco_loja, modulos, incluidos, ordem) values
  ('delivery', 'Delivery', 'Cardápio digital, pedidos, entregas com app do motoboy, Pix automático, clientes, promoções e relatórios.', 149.90,
     '{entregas,pix_online,clientes,promocoes,relatorios}', '{"app_entregador": 5}', 1),
  ('salao', 'Salão', 'Pedidos no salão e balcão, app do garçom, Pix automático, clientes, promoções e relatórios.', 149.90,
     '{salao,pix_online,clientes,promocoes,relatorios}', '{"app_garcom": 5}', 2)
on conflict (id) do nothing;
update public.planos_res set nome = 'Completo', preco_loja = 239.90, ordem = 3,
       descricao = 'Delivery + Salão, com fidelidade, estoque e CMV, financeiro, gestão e eventos.',
       modulos = '{entregas,salao,pix_online,clientes,promocoes,relatorios,fidelidade,estoque,financeiro,gestao,evento}',
       incluidos = '{"app_entregador": 5, "app_garcom": 5}'
 where id = 'completo' and incluidos = '{}'::jsonb;
update public.planos_res set ativo = false where id in ('essencial', 'profissional');
comment on column public.planos_res.preco_loja is 'Preço do plano por mês, por CONTA (cobre 1 loja e 1 cardápio) desde D-090.';

insert into private.config_plataforma (chave, valor) values ('desconto_anual', '20') on conflict (chave) do nothing;
create or replace function private.desconto_anual()
returns numeric language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(private.config_res('desconto_anual', '20'), '')::numeric, 20);
$$;

-- 3. Conta: ciclo e aparelhos extras
alter table public.contas add column if not exists ciclo text not null default 'mensal' check (ciclo in ('mensal', 'anual'));
alter table public.contas add column if not exists aparelhos_extra jsonb not null default '{}'::jsonb;
alter table public.contas alter column plano_res set default 'delivery';
update public.contas set plano_res = 'delivery' where plano_res in ('essencial', 'profissional');

-- titular não mexe direto em ciclo e aparelhos (só pelas funções)
create or replace function private.contas_protege_cobranca()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.situacao is distinct from old.situacao or new.teste_ate is distinct from old.teste_ate
    or new.pago_ate is distinct from old.pago_ate or new.limite_lojas is distinct from old.limite_lojas
    or new.limite_cardapios is distinct from old.limite_cardapios or new.plano is distinct from old.plano
    or new.origem is distinct from old.origem or new.aceite_termos_em is distinct from old.aceite_termos_em
    or new.aceite_termos_versao is distinct from old.aceite_termos_versao or new.situacao_nota is distinct from old.situacao_nota
    or new.plano_res is distinct from old.plano_res or new.ciclo is distinct from old.ciclo
    or new.aparelhos_extra is distinct from old.aparelhos_extra) then
    raise exception 'Plano, prazos e limites da conta são alterados só pela equipe RES.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

-- 4. Faturas: quantos meses cobrem
alter table public.faturas_res add column if not exists meses integer not null default 1 check (meses in (1, 12));

-- 5. Valor: plano + lojas/cardápios extras + adicionais + aparelhos extras; anual com desconto
create or replace function private.valor_conta(p_conta uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  c       public.contas;
  p       public.planos_res;
  v_lojas integer;
  v_cards integer;
  v_fator numeric;
  v_meses integer;
  itens   jsonb := '[]'::jsonb;
  m       record;
  v_n     integer;
  v_tot   numeric;
begin
  select * into c from public.contas where id = p_conta;
  select * into p from public.planos_res where id = c.plano_res;
  v_fator := case when c.ciclo = 'anual' then 1 - private.desconto_anual() / 100 else 1 end;
  v_meses := case when c.ciclo = 'anual' then 12 else 1 end;
  select count(*) into v_lojas from public.lojas where conta_id = p_conta;
  select greatest(count(*), v_lojas, 1) into v_cards
    from public.marcas mc join public.lojas l on l.id = mc.loja_id where l.conta_id = p_conta and not mc.evento;

  itens := itens || jsonb_build_array(jsonb_build_object('descricao', 'Plano ' || p.nome, 'qtd', 1, 'unitario', round(p.preco_loja * v_fator, 2), 'total', round(p.preco_loja * v_fator, 2)));
  if v_cards > 1 and not exists (select 1 from public.contas_modulos where conta_id = p_conta and modulo = 'marcas' and ligado and not cobrar) then
    select * into m from public.modulos_res where id = 'marcas';
    itens := itens || jsonb_build_array(jsonb_build_object('descricao', m.nome, 'qtd', v_cards - 1, 'unitario', round(m.preco * v_fator, 2), 'total', round(m.preco * v_fator * (v_cards - 1), 2)));
  end if;
  for m in select r.* from public.contas_modulos cm join public.modulos_res r on r.id = cm.modulo
            where cm.conta_id = p_conta and cm.ligado and cm.cobrar and r.preco > 0 and r.cobranca in ('conta', 'loja') and not (r.id = any (p.modulos))
            order by r.ordem loop
    itens := itens || jsonb_build_array(jsonb_build_object('descricao', m.nome, 'qtd', 1, 'unitario', round(m.preco * v_fator, 2), 'total', round(m.preco * v_fator, 2)));
  end loop;
  for m in select r.* from public.modulos_res r where r.cobranca = 'aparelho' and r.preco > 0 order by r.ordem loop
    v_n := coalesce((c.aparelhos_extra ->> m.id)::int, 0);
    if v_n > 0 then
      itens := itens || jsonb_build_array(jsonb_build_object('descricao', m.nome || ' extra', 'qtd', v_n, 'unitario', round(m.preco * v_fator, 2), 'total', round(m.preco * v_fator * v_n, 2)));
    end if;
  end loop;
  v_tot := (select coalesce(sum((i ->> 'total')::numeric), 0) from jsonb_array_elements(itens) i);
  return jsonb_build_object('plano', p.id, 'ciclo', c.ciclo, 'meses', v_meses, 'desconto', case when v_meses = 12 then private.desconto_anual() else 0 end,
                            'lojas', greatest(v_lojas, 1), 'cardapios', v_cards, 'itens', itens,
                            'total', v_tot, 'total_periodo', round(v_tot * v_meses, 2));
end;
$$;

create or replace function private.gerar_fatura(p_conta uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  c     public.contas;
  v_ini date;
  v_val jsonb;
  v_id  uuid;
begin
  select * into c from public.contas where id = p_conta;
  if not found then
    return null;
  end if;
  v_ini := greatest(coalesce(private.fim_periodo(c), now()), now())::date;
  if c.situacao = 'ativa' and c.pago_ate is null then
    return null; -- piloto / sem prazo: não cobra
  end if;
  select id into v_id from public.faturas_res where conta_id = p_conta and status = 'aberta' order by inicio desc limit 1;
  if v_id is not null then
    return v_id;
  end if;
  v_val := private.valor_conta(p_conta);
  insert into public.faturas_res (conta_id, inicio, lojas, plano, itens, valor, vence_em, meses)
  values (p_conta, v_ini, (v_val ->> 'lojas')::int, v_val ->> 'plano', v_val -> 'itens', (v_val ->> 'total_periodo')::numeric, v_ini, (v_val ->> 'meses')::int)
  on conflict (conta_id, inicio) do nothing
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function private.atualizar_fatura_aberta(p_conta uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v jsonb := private.valor_conta(p_conta);
begin
  update public.faturas_res set lojas = (v ->> 'lojas')::int, plano = v ->> 'plano', itens = v -> 'itens',
         valor = (v ->> 'total_periodo')::numeric, meses = (v ->> 'meses')::int
   where conta_id = p_conta and status = 'aberta' and mp_payment_id is null;
end;
$$;

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
  update public.contas set situacao = 'ativa', pago_ate = v_base + make_interval(months => f.meses) where id = f.conta_id;
end;
$$;

-- 6. Aparelhos: limite = inclusos no plano + extras contratados (teste e piloto: sem limite)
create or replace function private.limite_aparelho(p_conta uuid, p_modulo text)
returns integer language sql stable security definer set search_path = '' as $$
  select case when c.situacao = 'teste' or (c.situacao = 'ativa' and c.pago_ate is null) then null
              else coalesce((p.incluidos ->> p_modulo)::int, 0) + coalesce((c.aparelhos_extra ->> p_modulo)::int, 0) end
    from public.contas c left join public.planos_res p on p.id = c.plano_res where c.id = p_conta;
$$;

create or replace function private.membros_limite_aparelhos()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_conta uuid; v_mod text; v_lim integer; v_usados integer;
begin
  if not new.ativo or new.papel::text not in ('entregador', 'garcom') then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.ativo and old.papel = new.papel then
    return new;
  end if;
  select conta_id into v_conta from public.lojas where id = new.loja_id;
  v_mod := case new.papel::text when 'entregador' then 'app_entregador' else 'app_garcom' end;
  v_lim := private.limite_aparelho(v_conta, v_mod);
  if v_conta is null or v_lim is null then
    return new;
  end if;
  select count(*) into v_usados from public.membros mb join public.lojas l on l.id = mb.loja_id
   where l.conta_id = v_conta and mb.ativo and mb.papel = new.papel and mb.id <> new.id;
  if v_usados >= v_lim then
    raise exception 'Seu plano permite % % . Contrate mais em Assinatura.', v_lim,
      case v_mod when 'app_entregador' then 'App Entregador' else 'App Garçom' end using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists membros_limite_aparelhos on public.membros;
create trigger membros_limite_aparelhos before insert or update of papel, ativo on public.membros for each row execute function private.membros_limite_aparelhos();

-- 7. Dono: ciclo e aparelhos
create or replace function public.definir_ciclo(p_loja uuid, p_ciclo text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_conta uuid;
begin
  select conta_id into v_conta from public.lojas where id = p_loja;
  if v_conta is null or not private.e_titular(v_conta) then
    raise exception 'Só o dono da conta.' using errcode = 'insufficient_privilege';
  end if;
  if p_ciclo not in ('mensal', 'anual') then
    raise exception 'Ciclo inválido.' using errcode = 'check_violation';
  end if;
  update public.contas set ciclo = p_ciclo where id = v_conta;
  perform private.atualizar_fatura_aberta(v_conta);
end;
$$;
grant execute on function public.definir_ciclo(uuid, text) to authenticated;

create or replace function public.contratar_aparelhos(p_loja uuid, p_modulo text, p_qtd integer)
returns void language plpgsql security definer set search_path = '' as $$
declare v_conta uuid; v_usados integer; v_incl integer;
begin
  select conta_id into v_conta from public.lojas where id = p_loja;
  if v_conta is null or not (private.e_titular(v_conta) or private.e_equipe_res()) then
    raise exception 'Só o dono da conta.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.modulos_res where id = p_modulo and cobranca = 'aparelho') or p_qtd is null or p_qtd < 0 or p_qtd > 200 then
    raise exception 'Quantidade inválida.' using errcode = 'check_violation';
  end if;
  -- não deixa reduzir abaixo do que já está em uso (fora do teste/piloto)
  v_incl := coalesce(private.limite_aparelho(v_conta, p_modulo) - coalesce(((select aparelhos_extra from public.contas where id = v_conta) ->> p_modulo)::int, 0), 0);
  select count(*) into v_usados from public.membros mb join public.lojas l on l.id = mb.loja_id
   where l.conta_id = v_conta and mb.ativo and mb.papel::text = case p_modulo when 'app_entregador' then 'entregador' else 'garcom' end;
  if private.limite_aparelho(v_conta, p_modulo) is not null and v_incl + p_qtd < v_usados then
    raise exception 'Há % em uso: desative alguém da equipe antes de reduzir.', v_usados using errcode = 'check_violation';
  end if;
  update public.contas set aparelhos_extra = case when p_qtd = 0 then aparelhos_extra - p_modulo else aparelhos_extra || jsonb_build_object(p_modulo, p_qtd) end
   where id = v_conta;
  perform private.atualizar_fatura_aberta(v_conta);
end;
$$;
grant execute on function public.contratar_aparelhos(uuid, text, integer) to authenticated;

-- adicional agora é por conta (antes 'loja')
create or replace function public.contratar_adicional(p_loja uuid, p_modulo text, p_ligar boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_conta uuid;
begin
  select conta_id into v_conta from public.lojas where id = p_loja;
  if v_conta is null or not private.e_titular(v_conta) then
    raise exception 'Só o dono da conta.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.modulos_res where id = p_modulo and cobranca in ('conta', 'loja')) then
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

-- 8. Telas: assinatura e lista da empresa com ciclo, aparelhos e desconto
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
    'plano', c.plano_res, 'ciclo', c.ciclo, 'desconto_anual', private.desconto_anual(),
    'valor', private.valor_conta(c.id), 'modulos_ativos', to_jsonb(private.modulos_conta(c.id)),
    'aparelhos_extra', c.aparelhos_extra,
    'aparelhos_uso', jsonb_build_object(
       'app_entregador', (select count(*) from public.membros mb join public.lojas l on l.id = mb.loja_id where l.conta_id = c.id and mb.ativo and mb.papel = 'entregador'),
       'app_garcom', (select count(*) from public.membros mb join public.lojas l on l.id = mb.loja_id where l.conta_id = c.id and mb.ativo and mb.papel = 'garcom')),
    'planos', (select jsonb_agg(to_jsonb(p) order by p.ordem) from public.planos_res p where p.ativo or p.id = c.plano_res),
    'catalogo', (select jsonb_agg(to_jsonb(m) order by m.ordem) from public.modulos_res m),
    'adicionais', coalesce((select jsonb_agg(jsonb_build_object('modulo', cm.modulo, 'ligado', cm.ligado, 'cobrar', cm.cobrar)) from public.contas_modulos cm where cm.conta_id = c.id), '[]'::jsonb),
    'faturas', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'inicio', f.inicio, 'lojas', f.lojas, 'valor', f.valor, 'vence_em', f.vence_em, 'itens', f.itens, 'meses', f.meses,
                                 'status', f.status, 'forma', f.forma, 'pago_em', f.pago_em, 'tem_pix', f.pix_qr is not null) order by f.inicio desc)
                          from public.faturas_res f where f.conta_id = c.id), '[]'::jsonb));
end;
$$;

create or replace function public.salvar_plano(p_id text, p_nome text, p_descricao text, p_preco numeric, p_modulos text[], p_ativo boolean default true, p_incluidos jsonb default null)
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
  insert into public.planos_res (id, nome, descricao, preco_loja, modulos, ativo, incluidos, ordem)
  values (p_id, btrim(p_nome), left(btrim(coalesce(p_descricao, '')), 300), round(p_preco, 2), coalesce(p_modulos, '{}'), coalesce(p_ativo, true),
          coalesce(p_incluidos, '{}'::jsonb), (select coalesce(max(ordem), 0) + 1 from public.planos_res))
  on conflict (id) do update set nome = excluded.nome, descricao = excluded.descricao, preco_loja = excluded.preco_loja, modulos = excluded.modulos,
                                 ativo = excluded.ativo, incluidos = coalesce(p_incluidos, public.planos_res.incluidos);
  perform private.atualizar_fatura_aberta(c.id) from public.contas c where c.plano_res = p_id;
end;
$$;
grant execute on function public.salvar_plano(text, text, text, numeric, text[], boolean, jsonb) to authenticated;

create or replace function public.definir_desconto_anual(p_pct numeric)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.e_equipe_res() then
    raise exception 'Só o time do RES.' using errcode = 'insufficient_privilege';
  end if;
  if p_pct is null or p_pct < 0 or p_pct > 60 then
    raise exception 'Desconto entre 0 e 60%%.' using errcode = 'check_violation';
  end if;
  insert into private.config_plataforma (chave, valor) values ('desconto_anual', round(p_pct, 1)::text)
  on conflict (chave) do update set valor = excluded.valor;
  perform private.atualizar_fatura_aberta(c.id) from public.contas c where c.ciclo = 'anual';
end;
$$;
grant execute on function public.definir_desconto_anual(numeric) to authenticated;
create or replace function public.desconto_anual()
returns numeric language sql stable security definer set search_path = '' as $$ select private.desconto_anual(); $$;
grant execute on function public.desconto_anual() to authenticated;
