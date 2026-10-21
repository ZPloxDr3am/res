-- RES · 0009 · Replicar horários de funcionamento de um cardápio para todos os outros
-- cardápios (marcas) de todas as lojas da mesma conta. Só onde a pessoa pode configurar
-- o cardápio digital; as demais lojas ficam como estão. Devolve quantos cardápios mudaram.

create or replace function public.replicar_horarios(p_marca uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja  uuid;
  v_conta uuid;
  v_n     integer := 0;
  m       record;
begin
  select mc.loja_id, l.conta_id into v_loja, v_conta
    from public.marcas mc join public.lojas l on l.id = mc.loja_id
   where mc.id = p_marca;
  if v_loja is null or not private.tem_permissao(v_loja, 'cardapio_digital') then
    raise exception 'Você não tem permissão para configurar o cardápio digital.' using errcode = 'insufficient_privilege';
  end if;

  for m in
    select mc.id, mc.loja_id
      from public.marcas mc join public.lojas l on l.id = mc.loja_id
     where mc.id <> p_marca
       and (l.id = v_loja or (v_conta is not null and l.conta_id = v_conta))
       and private.tem_permissao(l.id, 'cardapio_digital')
  loop
    delete from public.marca_horarios where marca_id = m.id;
    insert into public.marca_horarios (loja_id, marca_id, dia_semana, abre, fecha)
    select m.loja_id, m.id, h.dia_semana, h.abre, h.fecha from public.marca_horarios h where h.marca_id = p_marca;
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

grant execute on function public.replicar_horarios(uuid) to authenticated;
revoke execute on function public.replicar_horarios(uuid) from anon, public;
