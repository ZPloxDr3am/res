-- D-092 (LGPD): o cliente final pode pedir uma cópia dos seus dados e pedir para ser apagado.
-- Dono/gerente: Clientes → abrir o cliente → "Exportar dados" (JSON) ou "Apagar dados (LGPD)".
-- Apagar = remove o cadastro, endereços e fidelidade e tira nome, telefone, endereço e documento dos pedidos
-- (os valores dos pedidos ficam para o caixa e o financeiro). Prazo de guarda: cliente sem pedido há 24 meses
-- é apagado sozinho (todo mês). Tudo fica registrado em lgpd_registros. Pode rodar de novo.

create table if not exists public.lgpd_registros (
  id        bigint generated always as identity primary key,
  grupo     uuid not null,
  loja_id   uuid references public.lojas (id) on delete set null,
  acao      text not null check (acao in ('exportar', 'apagar', 'apagar_prazo')),
  clientes  integer not null default 1,
  pedidos   integer not null default 0,
  por       uuid,
  em        timestamptz not null default now()
);
alter table public.lgpd_registros enable row level security;
drop policy if exists lgpd_ler on public.lgpd_registros;
create policy lgpd_ler on public.lgpd_registros for select to authenticated using (loja_id is not null and private.e_gestor(loja_id));
grant select on public.lgpd_registros to authenticated;

create or replace function private.cliente_do_grupo(p_loja uuid, p_cliente uuid)
returns public.clientes language plpgsql stable security definer set search_path = '' as $$
declare c public.clientes;
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente cuidam dos dados dos clientes (LGPD).' using errcode = 'insufficient_privilege';
  end if;
  select * into c from public.clientes where id = p_cliente and grupo = private.grupo_da_loja(p_loja);
  if not found then
    raise exception 'Cliente não encontrado.' using errcode = 'no_data_found';
  end if;
  return c;
end;
$$;

create or replace function public.dados_do_cliente(p_loja uuid, p_cliente uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare c public.clientes; v jsonb;
begin
  c := private.cliente_do_grupo(p_loja, p_cliente);
  v := jsonb_build_object(
    'gerado_em', now(),
    'cliente', jsonb_build_object('nome', c.nome, 'telefone', c.telefone, 'observacoes', c.observacoes, 'cadastrado_em', c.criado_em, 'ultimo_pedido_em', c.ultimo_pedido_em),
    'enderecos', coalesce((select jsonb_agg(jsonb_build_object('logradouro', e.logradouro, 'numero', e.numero, 'complemento', e.complemento, 'bairro', e.bairro, 'referencia', e.referencia, 'ultimo_uso', e.ultimo_uso))
                             from public.cliente_enderecos e where e.cliente_id = c.id), '[]'::jsonb),
    'pedidos', coalesce((select jsonb_agg(jsonb_build_object('loja', l.nome, 'numero', p.numero, 'data', p.criado_em, 'tipo', p.tipo, 'status', p.status, 'total', p.total,
                                   'pagamento', p.pagamento, 'endereco', p.endereco, 'documento', p.documento_cliente, 'observacao', p.observacao,
                                   'itens', (select jsonb_agg(jsonb_build_object('nome', i.nome, 'quantidade', i.quantidade, 'total', i.total) order by i.ordem) from public.pedido_itens i where i.pedido_id = p.id))
                                   order by p.criado_em)
                           from public.pedidos p join public.lojas l on l.id = p.loja_id
                          where p.loja_id = any (private.lojas_grupo(p_loja)) and (p.cliente_id = c.id or p.cliente_telefone = c.telefone)), '[]'::jsonb),
    'fidelidade', coalesce((select jsonb_agg(jsonb_build_object('tipo', m.tipo, 'natureza', m.natureza, 'valor', m.valor, 'em', m.criado_em) order by m.criado_em)
                              from public.fidelidade_movimentos m where m.cliente_id = c.id), '[]'::jsonb));
  insert into public.lgpd_registros (grupo, loja_id, acao, pedidos, por)
  values (c.grupo, p_loja, 'exportar', jsonb_array_length(v -> 'pedidos'), auth.uid());
  return v;
end;
$$;
grant execute on function public.dados_do_cliente(uuid, uuid) to authenticated;

-- apaga de verdade o que identifica a pessoa (usado pelo pedido do cliente e pelo prazo de guarda)
create or replace function private.apagar_cliente(c public.clientes)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_n integer;
begin
  update public.pedidos p
     set cliente_nome = 'Cliente removido (LGPD)', cliente_telefone = null, cliente_id = null, documento_cliente = null,
         observacao_entrega = null,
         endereco = case when p.endereco is null then null else jsonb_build_object('logradouro', '(removido)', 'bairro', coalesce(p.endereco ->> 'bairro', '(removido)')) end
   where p.loja_id = any (private.lojas_grupo(c.loja_id))
     and (p.cliente_id = c.id or p.cliente_telefone = c.telefone);
  get diagnostics v_n = row_count;
  delete from public.clientes where id = c.id;  -- endereços e fidelidade vão junto
  return v_n;
end;
$$;

create or replace function public.apagar_dados_cliente(p_loja uuid, p_cliente uuid, p_confirmacao text)
returns integer language plpgsql security definer set search_path = '' as $$
declare c public.clientes; v_n integer;
begin
  c := private.cliente_do_grupo(p_loja, p_cliente);
  if right(regexp_replace(coalesce(p_confirmacao, ''), '\D', '', 'g'), 4) <> right(c.telefone, 4) or length(regexp_replace(coalesce(p_confirmacao, ''), '\D', '', 'g')) < 4 then
    raise exception 'Para confirmar, digite os 4 últimos números do telefone do cliente.' using errcode = 'check_violation';
  end if;
  v_n := private.apagar_cliente(c);
  insert into public.lgpd_registros (grupo, loja_id, acao, pedidos, por) values (c.grupo, p_loja, 'apagar', v_n, auth.uid());
  return v_n;
end;
$$;
grant execute on function public.apagar_dados_cliente(uuid, uuid, text) to authenticated;

-- prazo de guarda: sem pedido há 24 meses
create or replace function private.lgpd_prazo_guarda()
returns integer language plpgsql security definer set search_path = '' as $$
declare c public.clientes; v_n integer := 0; v_p integer;
begin
  for c in select * from public.clientes where coalesce(ultimo_pedido_em, criado_em) < now() - interval '24 months' limit 5000 loop
    v_p := private.apagar_cliente(c);
    insert into public.lgpd_registros (grupo, acao, pedidos) values (c.grupo, 'apagar_prazo', v_p);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
do $$ begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    perform cron.schedule('res-lgpd-prazo', '23 7 2 * *', 'select private.lgpd_prazo_guarda()'); -- dia 2, 04:23 em Brasília
  end if;
exception when others then raise notice 'prazo de guarda não agendado: %', sqlerrm;
end $$;
