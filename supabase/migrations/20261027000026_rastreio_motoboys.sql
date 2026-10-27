-- RES · 0026 · Rastreio dos motoboys em tempo real (D-026).
--
-- * O celular do motoboy manda a posição SÓ enquanto ele tem entrega em rota (privacidade: fora do
--   serviço não há rastreio). registrar_posicao recusa e avisa o app para parar quando não há entrega.
-- * motoboy_local: a última posição de cada motoboy em rota (tempo real no painel, por grupo).
-- * motoboy_posicoes: o caminho (um ponto a cada ~8 s), guardado por 30 dias para conferência.
-- * Destino da entrega (pedidos.destino_lat/lng): gravado quando o app mede a rota até o cliente.
-- * rastreio_ao_vivo: motoboys em rota no grupo, com o caminho desde a saída e as entregas.

alter table public.pedidos
  add column destino_lat double precision check (destino_lat between -90 and 90),
  add column destino_lng double precision check (destino_lng between -180 and 180);

create table public.motoboy_local (
  entregador_id uuid primary key references auth.users (id) on delete cascade,
  grupo         uuid not null,
  nome          text,
  lat           double precision not null check (lat between -90 and 90),
  lng           double precision not null check (lng between -180 and 180),
  precisao      real,
  velocidade    real,   -- m/s
  rumo          real,   -- graus
  em            timestamptz not null default now()
);
create index motoboy_local_grupo_idx on public.motoboy_local (grupo);

create table public.motoboy_posicoes (
  id            bigint generated always as identity primary key,
  grupo         uuid not null,
  entregador_id uuid not null,
  lat           double precision not null,
  lng           double precision not null,
  precisao      real,
  velocidade    real,
  em            timestamptz not null default now()
);
create index motoboy_posicoes_entregador_idx on public.motoboy_posicoes (entregador_id, em desc);
create index motoboy_posicoes_em_idx on public.motoboy_posicoes (em);

-- Pessoa é membro ativo de alguma loja do grupo?
create or replace function private.e_membro_do_grupo(p_grupo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.membros m join public.lojas l on l.id = m.loja_id
                  where m.user_id = auth.uid() and m.ativo and coalesce(l.conta_id, l.id) = p_grupo);
$$;
revoke execute on function private.e_membro_do_grupo(uuid) from anon, public;
grant execute on function private.e_membro_do_grupo(uuid) to authenticated;  -- usada nas políticas de leitura

alter table public.motoboy_local enable row level security;
alter table public.motoboy_posicoes enable row level security;
create policy motoboy_local_ler on public.motoboy_local for select to authenticated using (private.e_membro_do_grupo(grupo));
create policy motoboy_posicoes_ler on public.motoboy_posicoes for select to authenticated using (private.e_membro_do_grupo(grupo));
-- escrita só por registrar_posicao

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.motoboy_local;
  end if;
end;
$$;

-- O app do motoboy manda a posição. {ativo: false} = sem entrega em rota: o app para de rastrear.
create or replace function public.registrar_posicao(p_lat double precision, p_lng double precision, p_precisao real default null, p_velocidade real default null, p_rumo real default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja  uuid;
  v_grupo uuid;
  v_nome  text;
  v_ult   timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Entre com o usuário do motoboy.' using errcode = 'insufficient_privilege';
  end if;
  select p.loja_id, p.entregador_nome into v_loja, v_nome
    from public.pedidos p where p.entregador_id = auth.uid() and p.status = 'em_entrega'
   order by p.saiu_em desc limit 1;
  if v_loja is null then
    delete from public.motoboy_local where entregador_id = auth.uid();
    return jsonb_build_object('ativo', false);
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Posição inválida.' using errcode = 'check_violation';
  end if;
  v_grupo := private.grupo_da_loja(v_loja);

  insert into public.motoboy_local as l (entregador_id, grupo, nome, lat, lng, precisao, velocidade, rumo, em)
  values (auth.uid(), v_grupo, v_nome, p_lat, p_lng, p_precisao, p_velocidade, p_rumo, now())
  on conflict (entregador_id) do update
     set grupo = excluded.grupo, nome = excluded.nome, lat = excluded.lat, lng = excluded.lng, precisao = excluded.precisao,
         velocidade = excluded.velocidade, rumo = excluded.rumo, em = excluded.em;

  -- caminho: um ponto a cada ~8 s (o app pode mandar mais vezes)
  select max(em) into v_ult from public.motoboy_posicoes where entregador_id = auth.uid() and em > now() - interval '1 minute';
  if v_ult is null or v_ult < now() - interval '8 seconds' then
    insert into public.motoboy_posicoes (grupo, entregador_id, lat, lng, precisao, velocidade) values (v_grupo, auth.uid(), p_lat, p_lng, p_precisao, p_velocidade);
  end if;
  -- limpeza de vez em quando: caminhos com mais de 30 dias
  if random() < 0.005 then
    delete from public.motoboy_posicoes where em < now() - interval '30 days';
  end if;
  return jsonb_build_object('ativo', true);
end;
$$;

-- Quem terminou as entregas (entregue/cancelado) some do mapa na hora.
create or replace function private.motoboy_sai_do_mapa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'em_entrega' and new.status <> 'em_entrega' and old.entregador_id is not null
     and not exists (select 1 from public.pedidos p where p.entregador_id = old.entregador_id and p.status = 'em_entrega' and p.id <> new.id) then
    delete from public.motoboy_local where entregador_id = old.entregador_id;
  end if;
  return new;
end;
$$;
create trigger pedidos_motoboy_sai_do_mapa after update of status on public.pedidos for each row execute function private.motoboy_sai_do_mapa();

-- Destino da entrega (medido pelo app ao calcular a rota até o cliente).
create or replace function public.registrar_destino(p_pedido uuid, p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Posição inválida.' using errcode = 'check_violation';
  end if;
  update public.pedidos set destino_lat = p_lat, destino_lng = p_lng
   where id = p_pedido and (entregador_id = auth.uid() or private.tem_permissao(loja_id, 'pedidos_delivery'));
end;
$$;

-- Painel ao vivo: motoboys em rota no grupo da loja, com caminho desde a saída e entregas.
create or replace function public.rastreio_ao_vivo(p_loja uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_grupo uuid := private.grupo_da_loja(p_loja);
  v_lojas uuid[] := private.lojas_grupo(p_loja);
begin
  if not private.tem_permissao(p_loja, 'pedidos_delivery') then
    raise exception 'Você não tem acesso às entregas.' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'grupo', v_grupo,
    'lojas', coalesce((select jsonb_agg(jsonb_build_object('nome', l.nome, 'lat', l.lat, 'lng', l.lng)) from public.lojas l where l.id = any (v_lojas) and l.lat is not null), '[]'::jsonb),
    'motoboys', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.entregador_id, 'nome', m.nome, 'lat', m.lat, 'lng', m.lng, 'precisao', m.precisao, 'velocidade', m.velocidade,
               'rumo', m.rumo, 'em', m.em,
               'entregas', coalesce((select jsonb_agg(jsonb_build_object(
                                              'id', p.id, 'numero', p.numero, 'loja', l.nome, 'cliente', p.cliente_nome,
                                              'bairro', p.endereco ->> 'bairro',
                                              'endereco', concat_ws(', ', p.endereco ->> 'logradouro', p.endereco ->> 'numero'),
                                              'saiu_em', p.saiu_em, 'distancia_km', p.distancia_km,
                                              'destino_lat', p.destino_lat, 'destino_lng', p.destino_lng) order by p.saiu_em)
                                       from public.pedidos p join public.lojas l on l.id = p.loja_id
                                      where p.entregador_id = m.entregador_id and p.status = 'em_entrega'), '[]'::jsonb),
               'rota', coalesce((select jsonb_agg(jsonb_build_array(x.lat, x.lng) order by x.em)
                                   from (select mp.lat, mp.lng, mp.em from public.motoboy_posicoes mp
                                          where mp.entregador_id = m.entregador_id
                                            and mp.em >= coalesce((select min(p.saiu_em) from public.pedidos p where p.entregador_id = m.entregador_id and p.status = 'em_entrega'), now() - interval '2 hours')
                                          order by mp.em desc limit 600) x), '[]'::jsonb))
             order by m.nome)
        from public.motoboy_local m
       where m.grupo = v_grupo
         and exists (select 1 from public.pedidos p where p.entregador_id = m.entregador_id and p.status = 'em_entrega')), '[]'::jsonb));
end;
$$;

grant execute on function public.registrar_posicao(double precision, double precision, real, real, real), public.registrar_destino(uuid, double precision, double precision), public.rastreio_ao_vivo(uuid) to authenticated;
revoke execute on function public.registrar_posicao(double precision, double precision, real, real, real), public.registrar_destino(uuid, double precision, double precision), public.rastreio_ao_vivo(uuid) from anon, public;
