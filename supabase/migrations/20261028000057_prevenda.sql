-- 0057: PRÉ-VENDA no cardápio de evento (D-056). Pode rodar de novo.
-- O cliente compra antes (durante o período do evento), paga só por Pix e o pedido fica AGENDADO para a
-- data de entrega/retirada que o dono definiu. O dono escolhe entrega, retirada ou as duas.

alter table public.marcas add column if not exists prevenda boolean not null default false;
alter table public.marcas add column if not exists prevenda_entrega timestamptz;
alter table public.marcas add column if not exists prevenda_texto text check (prevenda_texto is null or length(prevenda_texto) <= 200);
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'marcas_prevenda_evento') then
    alter table public.marcas add constraint marcas_prevenda_evento check (not prevenda or (evento and prevenda_entrega is not null));
  end if;
end $$;

-- na pré-venda o "agendamento" é a data do evento (não segue os dias/horários normais do agendamento)
create or replace function private.validar_agendamento(p_marca uuid, p_quando timestamptz, p_agora timestamptz default now())
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_dias  smallint;
  v_prep  integer;
  v_fuso  text;
  v_pre   boolean;
  v_ent   timestamptz;
begin
  select mc.agendamento_dias, l.tempo_preparo_min, l.fuso_horario, mc.prevenda, mc.prevenda_entrega into v_dias, v_prep, v_fuso, v_pre, v_ent
    from public.marcas mc join public.lojas l on l.id = mc.loja_id where mc.id = p_marca;
  if v_pre then
    if p_quando is distinct from v_ent then
      raise exception 'Na pré-venda o pedido é para a data do evento.' using errcode = 'check_violation';
    end if;
    if v_ent < p_agora then
      raise exception 'A pré-venda deste evento já terminou.' using errcode = 'check_violation';
    end if;
    return;
  end if;
  if coalesce(v_dias, 0) = 0 then
    raise exception 'Esta loja não aceita pedidos agendados.' using errcode = 'check_violation';
  end if;
  if p_quando < p_agora + make_interval(mins => v_prep) then
    raise exception 'Escolha um horário a partir de %.', to_char((p_agora + make_interval(mins => v_prep)) at time zone v_fuso, 'HH24:MI')
      using errcode = 'check_violation';
  end if;
  if p_quando > p_agora + make_interval(days => v_dias) then
    raise exception 'Dá para agendar com até % dia(s) de antecedência.', v_dias using errcode = 'check_violation';
  end if;
  if not private.dentro_do_horario(p_marca, p_quando) then
    raise exception 'A loja não funciona nesse horário.' using errcode = 'check_violation';
  end if;
end;
$$;
revoke execute on function private.validar_agendamento(uuid, timestamptz, timestamptz) from anon, public;

-- pedido pelo link: dentro do período; na pré-venda, sempre para a data do evento e só Pix
create or replace function private.pedido_no_periodo_do_evento()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare m public.marcas;
begin
  if new.origem = 'cardapio_digital' then
    select * into m from public.marcas where id = new.marca_id;
    if m.evento and ((m.evento_inicio is not null and now() < m.evento_inicio) or (m.evento_fim is not null and now() > m.evento_fim)) then
      raise exception 'Este cardápio de evento não está valendo agora.' using errcode = 'check_violation';
    end if;
    if m.prevenda then
      if new.agendado_para is distinct from m.prevenda_entrega then
        raise exception 'Na pré-venda o pedido é para a data do evento.' using errcode = 'check_violation';
      end if;
      if new.pagamento <> 'pix' then
        raise exception 'Na pré-venda o pagamento é só por Pix.' using errcode = 'check_violation';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- liga/desliga a pré-venda e escolhe entrega/retirada
create or replace function public.salvar_prevenda(p_marca uuid, p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  m        public.marcas;
  v_ativa  boolean := coalesce((p_dados ->> 'ativa')::boolean, false);
  v_ent    timestamptz := nullif(p_dados ->> 'entrega', '')::timestamptz;
  v_e      boolean := coalesce((p_dados ->> 'aceita_entrega')::boolean, true);
  v_r      boolean := coalesce((p_dados ->> 'aceita_retirada')::boolean, true);
  v_mp     boolean;
  v_pix    boolean;
  v_base   public.marcas;
begin
  select * into m from public.marcas where id = p_marca and evento;
  if not found or not private.e_gestor(m.loja_id) then
    raise exception 'Só o dono ou o gerente mudam a pré-venda.' using errcode = 'insufficient_privilege';
  end if;
  if not (v_e or v_r) then
    raise exception 'Escolha entrega, retirada ou as duas.' using errcode = 'check_violation';
  end if;
  v_mp := exists (select 1 from public.mp_contas c where c.loja_id = m.loja_id);
  v_pix := exists (select 1 from public.integracoes i where i.loja_id = m.loja_id and i.tipo = 'pix' and i.ativo);
  if v_ativa then
    if v_ent is null then
      raise exception 'Informe o dia e a hora da entrega/retirada da pré-venda.' using errcode = 'check_violation';
    end if;
    if v_ent < now() then
      raise exception 'A data da entrega/retirada precisa ser no futuro.' using errcode = 'check_violation';
    end if;
    if not (v_mp or v_pix) then
      raise exception 'Para a pré-venda, ligue o Pix em Aplicativos (de preferência o Mercado Pago, que confirma o pagamento sozinho).' using errcode = 'check_violation';
    end if;
    update public.marcas
       set prevenda = true, prevenda_entrega = v_ent, prevenda_texto = nullif(btrim(coalesce(p_dados ->> 'texto', '')), ''),
           aceita_entrega = v_e, aceita_retirada = v_r, formas_pagamento = array['pix']::public.forma_pagamento[]
     where id = p_marca;
  else
    select * into v_base from public.marcas where id = m.evento_base;
    update public.marcas
       set prevenda = false, prevenda_texto = nullif(btrim(coalesce(p_dados ->> 'texto', '')), ''),
           prevenda_entrega = coalesce(v_ent, prevenda_entrega),
           aceita_entrega = v_e, aceita_retirada = v_r,
           formas_pagamento = case when m.prevenda then coalesce(v_base.formas_pagamento, formas_pagamento) else formas_pagamento end
     where id = p_marca;
  end if;
  return jsonb_build_object('mercado_pago', v_mp, 'pix_manual', v_pix and not v_mp);
end;
$$;
revoke execute on function public.salvar_prevenda(uuid, jsonb) from anon, public;
grant execute on function public.salvar_prevenda(uuid, jsonb) to authenticated;

create or replace function public.evento_publico(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when m.evento then jsonb_build_object('nome', m.nome, 'inicio', m.evento_inicio, 'fim', m.evento_fim,
              'agora', now(), 'base', (select b.slug from public.marcas b where b.id = m.evento_base and b.ativa),
              'prevenda', m.prevenda, 'entrega', m.prevenda_entrega, 'texto', m.prevenda_texto,
              'aceita_entrega', m.aceita_entrega, 'aceita_retirada', m.aceita_retirada) end
    from public.marcas m where m.slug = lower(btrim(p_slug)) and m.ativa;
$$;
grant execute on function public.evento_publico(text) to anon, authenticated;
