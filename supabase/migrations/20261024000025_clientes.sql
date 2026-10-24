-- RES · 0025 · Cadastro de clientes (D-025).
--
-- * clientes do GRUPO (lojas da mesma conta), um por telefone. Todo pedido com telefone salva ou
--   atualiza o cliente (nome mais recente) e, se for entrega, o endereço (vários por cliente; o mais
--   usado por último vem primeiro). Observações do cliente ("não gosta de cebola", "portão azul").
-- * buscar_clientes: por telefone (4+ dígitos) ou nome (2+ letras) — o novo pedido preenche sozinho.
-- * Pedido sem telefone (balcão rápido) não vira cadastro: sem telefone não dá para saber quem é.
-- * Os pedidos antigos entram no cadastro agora (pedidos.cliente_id).

create or replace function private.grupo_da_loja(p_loja uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(l.conta_id, l.id) from public.lojas l where l.id = p_loja $$;
revoke execute on function private.grupo_da_loja(uuid) from anon, public;

create table public.clientes (
  id               uuid primary key default gen_random_uuid(),
  grupo            uuid not null,
  loja_id          uuid not null references public.lojas (id) on delete cascade,  -- onde apareceu primeiro
  nome             text not null check (length(btrim(nome)) between 1 and 120),
  telefone         text not null check (telefone ~ '^[0-9]{10,13}$'),
  observacoes      text check (observacoes is null or length(observacoes) <= 500),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  ultimo_pedido_em timestamptz,
  unique (grupo, telefone)
);
create index clientes_grupo_nome_idx on public.clientes (grupo, lower(nome));

create table public.cliente_enderecos (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references public.clientes (id) on delete cascade,
  chave       text not null,
  logradouro  text not null,
  numero      text,
  complemento text,
  bairro      text not null,
  referencia  text,
  ultimo_uso  timestamptz not null default now(),
  unique (cliente_id, chave)
);

alter table public.pedidos add column cliente_id uuid references public.clientes (id) on delete set null;
create index pedidos_cliente_idx on public.pedidos (cliente_id) where cliente_id is not null;

alter table public.clientes enable row level security;
alter table public.cliente_enderecos enable row level security;
create policy clientes_ler on public.clientes for select to authenticated using (private.e_membro_grupo(loja_id));
create policy cliente_enderecos_ler on public.cliente_enderecos for select to authenticated
  using (exists (select 1 from public.clientes c where c.id = cliente_id and private.e_membro_grupo(c.loja_id)));
-- escrita: pelo pedido (gatilho) e pelas funções abaixo
create trigger clientes_auditar after insert or update or delete on public.clientes for each row execute function private.auditar();

-- Salva/atualiza o cliente (e o endereço) a partir de um pedido. Devolve o id.
create or replace function private.upsert_cliente(p_loja uuid, p_nome text, p_tel text, p_tipo text, p_endereco jsonb, p_quando timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id    uuid;
  v_nome  text := nullif(btrim(left(coalesce(p_nome, ''), 120)), '');
  v_chave text;
begin
  if p_tel is null or p_tel !~ '^[0-9]{10,13}$' then
    return null;
  end if;
  insert into public.clientes as c (grupo, loja_id, nome, telefone, ultimo_pedido_em)
  values (private.grupo_da_loja(p_loja), p_loja, coalesce(v_nome, 'Cliente'), p_tel, p_quando)
  on conflict (grupo, telefone) do update
     set nome = case when v_nome is not null and v_nome <> 'Cliente' then v_nome else c.nome end,
         ultimo_pedido_em = greatest(c.ultimo_pedido_em, excluded.ultimo_pedido_em),
         atualizado_em = now()
  returning id into v_id;

  if p_tipo = 'entrega' and p_endereco ? 'logradouro' and p_endereco ? 'bairro' then
    v_chave := lower(regexp_replace(concat_ws('|', btrim(p_endereco ->> 'logradouro'), btrim(coalesce(p_endereco ->> 'numero', '')), btrim(p_endereco ->> 'bairro')), '\s+', ' ', 'g'));
    insert into public.cliente_enderecos as e (cliente_id, chave, logradouro, numero, complemento, bairro, referencia, ultimo_uso)
    values (v_id, v_chave, p_endereco ->> 'logradouro', p_endereco ->> 'numero', p_endereco ->> 'complemento', p_endereco ->> 'bairro', p_endereco ->> 'referencia', p_quando)
    on conflict (cliente_id, chave) do update
       set complemento = coalesce(excluded.complemento, e.complemento),
           referencia = coalesce(excluded.referencia, e.referencia),
           ultimo_uso = greatest(e.ultimo_uso, excluded.ultimo_uso);
  end if;
  return v_id;
end;
$$;
revoke execute on function private.upsert_cliente(uuid, text, text, text, jsonb, timestamptz) from anon, public;

create or replace function private.pedido_registra_cliente()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.cliente_id := coalesce(new.cliente_id, private.upsert_cliente(new.loja_id, new.cliente_nome, new.cliente_telefone, new.tipo::text, new.endereco, coalesce(new.criado_em, now())));
  return new;
end;
$$;
create trigger pedidos_registra_cliente before insert on public.pedidos for each row execute function private.pedido_registra_cliente();

-- pedidos antigos entram no cadastro (do mais antigo ao mais novo: fica o nome mais recente)
do $$
declare p record;
begin
  for p in select id, loja_id, cliente_nome, cliente_telefone, tipo, endereco, criado_em from public.pedidos where cliente_telefone is not null order by criado_em loop
    update public.pedidos set cliente_id = private.upsert_cliente(p.loja_id, p.cliente_nome, p.cliente_telefone, p.tipo::text, p.endereco, p.criado_em) where id = p.id;
  end loop;
end $$;

-- Busca para o novo pedido e para a tela Clientes. Termo vazio = os mais recentes.
create or replace function public.buscar_clientes(p_loja uuid, p_termo text, p_limite integer default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_grupo uuid := private.grupo_da_loja(p_loja);
  v_dig   text := regexp_replace(coalesce(p_termo, ''), '\D', '', 'g');
  v_txt   text := btrim(coalesce(p_termo, ''));
  v_lojas uuid[] := private.lojas_grupo(p_loja);
begin
  if not (private.tem_permissao(p_loja, 'pedidos_delivery') or private.tem_permissao(p_loja, 'clientes')) then
    raise exception 'Você não tem acesso aos clientes.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce((
    select jsonb_agg(x.j order by x.ord desc nulls last)
      from (
        select c.ultimo_pedido_em as ord, jsonb_build_object(
                 'id', c.id, 'nome', c.nome, 'telefone', c.telefone, 'observacoes', c.observacoes,
                 'ultimo_pedido_em', c.ultimo_pedido_em, 'criado_em', c.criado_em,
                 'enderecos', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'logradouro', e.logradouro, 'numero', e.numero, 'complemento', e.complemento,
                                                                            'bairro', e.bairro, 'referencia', e.referencia) order by e.ultimo_uso desc)
                                          from public.cliente_enderecos e where e.cliente_id = c.id), '[]'::jsonb),
                 'pedidos', (select count(*) from public.pedidos p where p.cliente_id = c.id and p.status <> 'cancelado' and p.loja_id = any (v_lojas)),
                 'total_gasto', (select coalesce(round(sum(p.total) * 100), 0) from public.pedidos p where p.cliente_id = c.id and p.status <> 'cancelado' and p.loja_id = any (v_lojas)),
                 'ultimo_item', (select i.nome from public.pedidos p join public.pedido_itens i on i.pedido_id = p.id
                                  where p.cliente_id = c.id and p.loja_id = any (v_lojas) order by p.criado_em desc, i.ordem limit 1)) as j
          from public.clientes c
         where c.grupo = v_grupo
           and (v_txt = ''
                or (length(v_dig) >= 4 and c.telefone like '%' || v_dig || '%')
                or (length(v_txt) >= 2 and v_dig = '' and lower(c.nome) like '%' || lower(replace(replace(v_txt, '%', ''), '_', '')) || '%'))
         order by c.ultimo_pedido_em desc nulls last
         limit greatest(1, least(coalesce(p_limite, 8), 200))
      ) x), '[]'::jsonb);
end;
$$;

-- Editar nome e observações do cliente (e tirar endereços que não valem mais).
create or replace function public.salvar_cliente(p_loja uuid, p_cliente uuid, p_nome text, p_observacoes text, p_remover_enderecos uuid[] default '{}')
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (private.tem_permissao(p_loja, 'pedidos_delivery') or private.tem_permissao(p_loja, 'clientes')) then
    raise exception 'Você não tem acesso aos clientes.' using errcode = 'insufficient_privilege';
  end if;
  if length(btrim(coalesce(p_nome, ''))) < 1 then
    raise exception 'Informe o nome do cliente.' using errcode = 'check_violation';
  end if;
  update public.clientes
     set nome = btrim(left(p_nome, 120)), observacoes = nullif(btrim(left(coalesce(p_observacoes, ''), 500)), ''), atualizado_em = now()
   where id = p_cliente and grupo = private.grupo_da_loja(p_loja);
  if not found then
    raise exception 'Cliente não encontrado.' using errcode = 'no_data_found';
  end if;
  delete from public.cliente_enderecos where cliente_id = p_cliente and id = any (coalesce(p_remover_enderecos, '{}'));
end;
$$;

grant execute on function public.buscar_clientes(uuid, text, integer), public.salvar_cliente(uuid, uuid, text, text, uuid[]) to authenticated;
revoke execute on function public.buscar_clientes(uuid, text, integer), public.salvar_cliente(uuid, uuid, text, text, uuid[]) from anon, public;
