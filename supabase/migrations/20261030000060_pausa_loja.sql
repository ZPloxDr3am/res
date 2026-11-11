-- 0060: pausa temporária da loja com recado (D-059). Pode rodar de novo.
-- A cozinha apertou? Qualquer pessoa da equipe pausa por X minutos; o cardápio mostra o recado
-- e "voltamos às HH:MM", e a loja reabre sozinha. Vale para todos os cardápios da loja e
-- passa por cima do "Abrir agora" (status manual).

alter table public.lojas add column if not exists pausa_ate timestamptz;
alter table public.lojas add column if not exists pausa_recado text;
alter table public.lojas add column if not exists pausa_por uuid references auth.users(id) on delete set null;

-- Aberta = regra de antes, menos quando a loja está em pausa.
create or replace function private.marca_aberta(p_marca uuid, p_agora timestamptz default now())
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select case
             when l.pausa_ate is not null and l.pausa_ate > p_agora then false
             when mc.status_cardapio = 'aberto' then true
             when mc.status_cardapio = 'fechado' then false
             else private.dentro_do_horario(mc.id, p_agora)
           end
      from public.marcas mc join public.lojas l on l.id = mc.loja_id
     where mc.id = p_marca and mc.ativa), false);
$$;

-- Agendamento continua valendo, mas só para depois da pausa.
create or replace function private.horarios_agendamento(p_marca uuid, p_agora timestamptz default now())
returns timestamptz[]
language sql
stable
set search_path = ''
as $$
  with m as (
    select mc.id, mc.agendamento_dias, l.tempo_preparo_min,
           greatest(p_agora, coalesce(l.pausa_ate, p_agora)) as base
      from public.marcas mc join public.lojas l on l.id = mc.loja_id
     where mc.id = p_marca and mc.ativa and mc.agendamento_dias > 0
  ),
  inicio as (
    -- arredonda para cima no próximo múltiplo de 15 min
    select m.*, to_timestamp(ceil(extract(epoch from m.base + make_interval(mins => m.tempo_preparo_min)) / 900) * 900) as t0
      from m
  )
  select coalesce(array_agg(s order by s), '{}')
    from inicio i
    cross join lateral generate_series(i.t0, p_agora + make_interval(days => i.agendamento_dias), interval '15 minutes') s
   where private.dentro_do_horario(i.id, s);
$$;

-- Pausar (p_minutos > 0) ou retomar (p_minutos = 0). Qualquer pessoa da equipe da loja.
create or replace function public.pausar_loja(p_loja uuid, p_minutos integer, p_recado text default null)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare v_ate timestamptz;
begin
  if not private.e_membro(p_loja) then
    raise exception 'Loja não encontrada.' using errcode = 'no_data_found';
  end if;
  if p_minutos is null or p_minutos < 0 or p_minutos > 240 then
    raise exception 'A pausa vai de 5 minutos a 4 horas.' using errcode = 'check_violation';
  end if;
  if p_minutos = 0 then
    update public.lojas set pausa_ate = null, pausa_recado = null, pausa_por = null where id = p_loja;
    return null;
  end if;
  v_ate := now() + make_interval(mins => p_minutos);
  update public.lojas
     set pausa_ate = v_ate,
         pausa_recado = nullif(left(btrim(coalesce(p_recado, '')), 160), ''),
         pausa_por = auth.uid()
   where id = p_loja;
  return v_ate;
end;
$$;
revoke execute on function public.pausar_loja(uuid, integer, text) from anon, public;
grant execute on function public.pausar_loja(uuid, integer, text) to authenticated;

-- Para o cardápio público: só a pausa em vigor (sem dizer quem pausou).
create or replace function public.pausa_publica(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('ate', l.pausa_ate, 'recado', l.pausa_recado)
    from public.marcas mc join public.lojas l on l.id = mc.loja_id
   where mc.slug = lower(btrim(p_slug)) and mc.ativa and l.pausa_ate > now();
$$;
grant execute on function public.pausa_publica(text) to anon, authenticated;
