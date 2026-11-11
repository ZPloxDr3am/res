-- RES · 0029 · Tempos e atrasos (0028): pedido esquecido aberto (teste, erro de clique) não distorce
-- as médias; bairro igual com letras diferentes ("Centro" e "CENTRO") vira um só.

-- minutos entre duas marcas; null se faltar uma, se for negativo ou se passar de 4 h
create or replace function private.minutos_etapa(p_de timestamptz, p_ate timestamptz)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case when p_de is null or p_ate is null or p_ate < p_de or p_ate - p_de > interval '4 hours' then null
              else extract(epoch from p_ate - p_de) / 60 end;
$$;
grant execute on function private.minutos_etapa(timestamptz, timestamptz) to authenticated;

-- Tempos e atrasos (turnos 05:00 → 05:00 de p_de até p_ate), lojas do grupo que a pessoa gere.
create or replace function public.relatorio_entregas(p_loja uuid, p_de date, p_ate date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_fuso  text;
  v_lojas uuid[];
  v_ini   timestamptz;
  v_fim   timestamptz;
begin
  select fuso_horario into v_fuso from public.lojas where id = p_loja;
  select array_agg(x) into v_lojas from unnest(private.lojas_grupo(p_loja)) x
   where private.e_gestor(x) or private.tem_permissao(x, 'relatorios');
  if v_fuso is null or v_lojas is null then
    raise exception 'Você não tem acesso aos relatórios.' using errcode = 'insufficient_privilege';
  end if;
  if p_ate < p_de or p_ate - p_de > 92 then
    raise exception 'Escolha um período de até 93 dias.' using errcode = 'check_violation';
  end if;
  v_ini := (p_de + time '05:00') at time zone v_fuso;
  v_fim := (p_ate + 1 + time '05:00') at time zone v_fuso;

  return (
    with base as (
      select p.*, l.nome as loja_nome, initcap(lower(nullif(regexp_replace(btrim(p.endereco ->> 'bairro'), '\s+', ' ', 'g'), ''))) as bairro,
             coalesce(p.agendado_para, p.criado_em + make_interval(mins => l.prazo_entrega_min)) as prazo,
             ((p.criado_em at time zone v_fuso) - interval '5 hours')::date as dia
        from public.pedidos p join public.lojas l on l.id = p.loja_id
       where p.loja_id = any (v_lojas) and p.criado_em >= v_ini and p.criado_em < v_fim and p.status <> 'cancelado'
    ),
    ent as (
      select b.*, extract(epoch from b.concluido_em - b.prazo) / 60 as atraso
        from base b where b.tipo = 'entrega' and b.status = 'concluido'
    ),
    min_ as (
      select
        round(avg(private.minutos_etapa(criado_em, aceito_em)) filter (where agendado_para is null))           as aceite,
        round(avg(private.minutos_etapa(aceito_em, pronto_em)))                                                 as preparo,
        round(avg(private.minutos_etapa(pronto_em, saiu_em)) filter (where tipo = 'entrega'))                   as expedicao,
        round(avg(private.minutos_etapa(saiu_em, concluido_em)) filter (where tipo = 'entrega'))                as rua,
        round(avg(private.minutos_etapa(criado_em, concluido_em)) filter (where tipo = 'entrega' and agendado_para is null)) as total
      from base
    )
    select jsonb_build_object(
      'inicio', v_ini, 'fim', v_fim,
      'pedidos', (select count(*) from base),
      'entregas', (select count(*) from ent),
      'atrasados', (select count(*) from ent where atraso > 0),
      'atraso_medio', (select round(avg(atraso)) from ent where atraso > 0),
      'tempos', (select to_jsonb(min_) from min_),
      'por_dia', coalesce((select jsonb_agg(x order by x.dia) from (
          select dia, count(*) as entregas, count(*) filter (where atraso > 0) as atrasados,
                 round(avg(private.minutos_etapa(criado_em, concluido_em)) filter (where agendado_para is null)) as total
            from ent group by dia) x), '[]'::jsonb),
      'por_bairro', coalesce((select jsonb_agg(x order by x.atrasados desc, x.entregas desc) from (
          select coalesce(bairro, '(sem bairro)') as bairro, count(*) as entregas, count(*) filter (where atraso > 0) as atrasados,
                 round(avg(atraso) filter (where atraso > 0)) as atraso_medio,
                 round(avg(private.minutos_etapa(saiu_em, concluido_em))) as rua
            from ent group by 1 order by 3 desc, 2 desc limit 20) x), '[]'::jsonb),
      'por_motoboy', coalesce((select jsonb_agg(x order by x.entregas desc) from (
          select coalesce(entregador_nome, '(sem motoboy)') as motoboy, count(*) as entregas, count(*) filter (where atraso > 0) as atrasados,
                 round(avg(private.minutos_etapa(saiu_em, concluido_em))) as rua
            from ent group by 1) x), '[]'::jsonb),
      'por_loja', coalesce((select jsonb_agg(x order by x.loja) from (
          select b.loja_nome as loja, count(*) as pedidos,
                 round(avg(private.minutos_etapa(b.aceito_em, b.pronto_em))) as preparo,
                 (select count(*) from ent e where e.loja_id = b.loja_id) as entregas,
                 (select count(*) from ent e where e.loja_id = b.loja_id and e.atraso > 0) as atrasados
            from base b group by b.loja_id, b.loja_nome) x), '[]'::jsonb)
    ));
end;
$$;

