-- D-086: cardápio fechado não perde venda. Com a loja fechada pelo horário (ou em pausa), o cliente
-- agenda para quando abrir, mesmo que a loja não aceite agendamento normal. Liga por padrão;
-- desliga em Delivery. "Fechado" manual (férias, problema) continua sem aceitar nada. Pode rodar de novo.

alter table public.marcas add column if not exists agendar_fechado boolean not null default true;

-- dias à frente que valem agora; 'fechado' = só o modo "para quando abrir"
create or replace function private.modo_agendamento(p_marca uuid, p_agora timestamptz default now())
returns table (dias smallint, so_quando_abrir boolean)
language sql stable set search_path = '' as $$
  select case when mc.agendamento_dias > 0 then mc.agendamento_dias
              when mc.agendar_fechado and mc.status_cardapio = 'auto' and not private.marca_aberta(mc.id, p_agora) then 2::smallint
              else 0::smallint end,
         mc.agendamento_dias = 0
    from public.marcas mc where mc.id = p_marca and mc.ativa;
$$;

create or replace function private.horarios_agendamento(p_marca uuid, p_agora timestamptz default now())
returns timestamptz[]
language sql
stable
set search_path = ''
as $$
  with m as (
    select mc.id, md.dias, md.so_quando_abrir, l.fuso_horario, l.tempo_preparo_min + private.movimento_extra(l.id) as tempo_preparo_min,
           greatest(p_agora, coalesce(l.pausa_ate, p_agora)) as base
      from public.marcas mc join public.lojas l on l.id = mc.loja_id
      cross join lateral private.modo_agendamento(mc.id, p_agora) md
     where mc.id = p_marca and mc.ativa and md.dias > 0
  ),
  inicio as (
    -- arredonda para cima no próximo múltiplo de 15 min
    select m.*, to_timestamp(ceil(extract(epoch from m.base + make_interval(mins => m.tempo_preparo_min)) / 900) * 900) as t0
      from m
  ),
  slots as (
    select s, i.so_quando_abrir
      from inicio i
      cross join lateral generate_series(i.t0, p_agora + make_interval(days => i.dias), interval '15 minutes') s
     where private.dentro_do_horario(i.id, s)
  ),
  -- "para quando abrir": só o próximo turno (horários seguidos, mesmo passando da meia-noite)
  turnos as (
    select s, so_quando_abrir,
           count(*) filter (where gap) over (order by s) as turno
      from (select s, so_quando_abrir, coalesce(s - lag(s) over (order by s) > interval '15 minutes', false) as gap from slots) x
  )
  select coalesce(array_agg(s order by s), '{}')
    from turnos
   where not so_quando_abrir or turno = 0;
$$;

create or replace function private.validar_agendamento(p_marca uuid, p_quando timestamptz, p_agora timestamptz default now())
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_dias  smallint;
  v_quando_abrir boolean;
  v_prep  integer;
  v_fuso  text;
  v_pre   boolean;
  v_ent   timestamptz;
begin
  select l.tempo_preparo_min + private.movimento_extra(l.id), l.fuso_horario, mc.prevenda, mc.prevenda_entrega into v_prep, v_fuso, v_pre, v_ent
    from public.marcas mc join public.lojas l on l.id = mc.loja_id where mc.id = p_marca;
  select dias, so_quando_abrir into v_dias, v_quando_abrir from private.modo_agendamento(p_marca, p_agora);
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
  if v_quando_abrir and not (p_quando = any (private.horarios_agendamento(p_marca, p_agora))) then
    raise exception 'Com a loja fechada, dá para agendar só para a próxima abertura.' using errcode = 'check_violation';
  end if;
end;
$$;
revoke execute on function private.validar_agendamento(uuid, timestamptz, timestamptz) from anon, public;
revoke execute on function private.horarios_agendamento(uuid, timestamptz) from anon, public;
revoke execute on function private.modo_agendamento(uuid, timestamptz) from anon, public;

create or replace function public.definir_agendar_fechado(p_marca uuid, p_valor boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_loja uuid;
begin
  select loja_id into v_loja from public.marcas where id = p_marca;
  if v_loja is null or not private.tem_permissao(v_loja, 'cardapio_digital') then
    raise exception 'Você não tem permissão para configurar o cardápio digital.' using errcode = 'insufficient_privilege';
  end if;
  update public.marcas set agendar_fechado = coalesce(p_valor, true) where id = p_marca;
end;
$$;
grant execute on function public.definir_agendar_fechado(uuid, boolean) to authenticated;
