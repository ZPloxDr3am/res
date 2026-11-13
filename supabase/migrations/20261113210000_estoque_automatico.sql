-- D-103: estoque que trabalha sozinho. Pode rodar de novo.
-- 1. Código de barras (EAN) dos itens das notas fica ligado ao insumo: a próxima nota, de qualquer fornecedor,
--    já vem ligada; e a contagem aceita bipar o código (leitor ou câmera).
-- 2. Lista de compras: insumos no mínimo ou abaixo, por último fornecedor, com sugestão de quantidade.
-- 3. Produto pausado sozinho quando acaba um insumo da ficha (opcional por loja; volta quando a nota entra).

-- 1. Códigos de barras
create table if not exists public.insumo_eans (
  estoque       uuid not null,
  ean           text not null check (ean ~ '^[0-9]{8,14}$'),
  insumo_id     uuid not null references public.insumos (id) on delete cascade,
  fator         numeric(14, 4) not null default 1 check (fator > 0),
  atualizado_em timestamptz not null default now(),
  primary key (estoque, ean)
);
alter table public.insumo_eans enable row level security;
revoke all on public.insumo_eans from anon, authenticated;

-- aproveita o que já foi importado: o EAN está guardado nos itens das notas antigas quando veio no XML
insert into public.insumo_eans (estoque, ean, insumo_id, fator)
select distinct on (n.estoque, x ->> 'ean') n.estoque, x ->> 'ean', v.insumo_id, v.fator
  from public.nfe_entradas n cross join lateral jsonb_array_elements(n.itens) x
  join public.nfe_vinculos v on v.estoque = n.estoque and v.fornecedor = n.emitente_cnpj and v.codigo = x ->> 'codigo'
 where coalesce(x ->> 'ean', '') ~ '^[0-9]{8,14}$'
 order by n.estoque, x ->> 'ean', n.criado_em desc
on conflict do nothing;

create or replace function public.eans_do_estoque(p_loja uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.pode_estoque(p_loja) then raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege'; end if;
  return coalesce((select jsonb_object_agg(e.ean, jsonb_build_object('insumo_id', e.insumo_id, 'fator', e.fator))
                     from public.insumo_eans e join public.insumos i on i.id = e.insumo_id and i.ativo
                    where e.estoque = private.estoque_da_loja(p_loja)), '{}'::jsonb);
end;
$$;
grant execute on function public.eans_do_estoque(uuid) to authenticated;

-- liga um código a um insumo na mão (bipou na contagem um produto que o sistema ainda não conhecia)
create or replace function public.ligar_ean(p_loja uuid, p_ean text, p_insumo uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_est uuid := private.estoque_da_loja(p_loja);
begin
  if not private.pode_estoque(p_loja) then raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege'; end if;
  if coalesce(p_ean, '') !~ '^[0-9]{8,14}$' then raise exception 'Código de barras inválido.' using errcode = 'check_violation'; end if;
  if not exists (select 1 from public.insumos where id = p_insumo and estoque = v_est and ativo) then raise exception 'Insumo não encontrado.' using errcode = 'no_data_found'; end if;
  insert into public.insumo_eans (estoque, ean, insumo_id) values (v_est, p_ean, p_insumo)
  on conflict (estoque, ean) do update set insumo_id = excluded.insumo_id, atualizado_em = now();
end;
$$;
grant execute on function public.ligar_ean(uuid, text, uuid) to authenticated;

-- importar_nfe (a partir da versão de 20261028000035): guarda também o código de barras de cada item
create or replace function public.importar_nfe(p_loja uuid, p_nfe jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_est   uuid := private.estoque_da_loja(p_loja);
  v_nfe   uuid;
  v_forn  text := regexp_replace(coalesce(p_nfe ->> 'emitente_cnpj', ''), '\D', '', 'g');
  it      jsonb;
  v_ins   uuid;
  v_fator numeric;
  v_qtd   numeric;
  v_n     integer := 0;
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  if coalesce(p_nfe ->> 'chave', '') !~ '^\d{44}$' then
    raise exception 'Chave da NF-e inválida.' using errcode = 'check_violation';
  end if;
  if exists (select 1 from public.nfe_entradas where estoque = v_est and chave = p_nfe ->> 'chave') then
    raise exception 'Esta nota já foi importada.' using errcode = 'unique_violation';
  end if;
  insert into public.nfe_entradas (estoque, loja_id, chave, numero, serie, emissao, emitente_cnpj, emitente_nome, valor_total, itens, importada_por)
  values (v_est, p_loja, p_nfe ->> 'chave', p_nfe ->> 'numero', p_nfe ->> 'serie', nullif(p_nfe ->> 'emissao', '')::timestamptz, v_forn,
          left(p_nfe ->> 'emitente_nome', 150), (p_nfe ->> 'valor_total')::numeric / 100, coalesce(p_nfe -> 'itens', '[]'::jsonb), auth.uid())
  returning id into v_nfe;

  for it in select jsonb_array_elements(coalesce(p_nfe -> 'itens', '[]'::jsonb)) loop
    continue when it ->> 'acao' = 'ignorar';
    v_fator := coalesce(nullif(it ->> 'fator', '')::numeric, 1);
    if v_fator <= 0 then
      raise exception 'Fator inválido no item %.', it ->> 'descricao' using errcode = 'check_violation';
    end if;
    if it ->> 'acao' = 'novo' then
      insert into public.insumos (estoque, nome, unidade)
      values (v_est, btrim(left(coalesce(it #>> '{novo,nome}', it ->> 'descricao'), 100)), coalesce(it #>> '{novo,unidade}', 'UN'))
      returning id into v_ins;
    else
      select id into v_ins from public.insumos where id = nullif(it ->> 'insumo_id', '')::uuid and estoque = v_est and ativo;
      if v_ins is null then
        raise exception 'Escolha o insumo do item "%".', it ->> 'descricao' using errcode = 'check_violation';
      end if;
    end if;
    if v_forn <> '' and coalesce(it ->> 'codigo', '') <> '' then
      insert into public.nfe_vinculos as v (estoque, fornecedor, codigo, insumo_id, fator)
      values (v_est, v_forn, it ->> 'codigo', v_ins, v_fator)
      on conflict (estoque, fornecedor, codigo) do update set insumo_id = excluded.insumo_id, fator = excluded.fator, atualizado_em = now();
    end if;
    -- código de barras do produto (D-103): na próxima nota, de qualquer fornecedor, o item já vem ligado
    if coalesce(it ->> 'ean', '') ~ '^[0-9]{8,14}$' then
      insert into public.insumo_eans as e (estoque, ean, insumo_id, fator)
      values (v_est, it ->> 'ean', v_ins, v_fator)
      on conflict (estoque, ean) do update set insumo_id = excluded.insumo_id, fator = excluded.fator, atualizado_em = now();
    end if;
    v_qtd := round((it ->> 'quantidade')::numeric * v_fator, 3);
    if v_qtd > 0 then
      perform private.mover_estoque(v_ins, p_loja, 'entrada_nfe', v_qtd, (it ->> 'custo_total')::numeric / 100 / v_qtd, null, v_nfe,
                                    'NF ' || coalesce(p_nfe ->> 'numero', '') || ' · ' || coalesce(p_nfe ->> 'emitente_nome', ''));
      v_n := v_n + 1;
    end if;
  end loop;
  return jsonb_build_object('id', v_nfe, 'entradas', v_n);
end;
$$;

-- 2. Lista de compras
create or replace function public.lista_compras(p_loja uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_est uuid := private.estoque_da_loja(p_loja);
begin
  if not private.pode_estoque(p_loja) then raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', i.id, 'nome', i.nome, 'unidade', i.unidade, 'saldo', i.saldo, 'minimo', i.minimo,
      -- sugestão: voltar a duas vezes o mínimo
      'sugestao', greatest(i.minimo * 2 - greatest(i.saldo, 0), i.minimo),
      'custo', u.custo_unit, 'fornecedor', u.emitente_nome, 'fornecedor_cnpj', u.emitente_cnpj, 'ultima_compra', u.criado_em)
      order by u.emitente_nome nulls last, i.nome)
    from public.insumos i
    left join lateral (select m.custo_unit, m.criado_em, n.emitente_nome, n.emitente_cnpj
                         from public.estoque_movimentos m left join public.nfe_entradas n on n.id = m.nfe_id
                        where m.insumo_id = i.id and m.tipo in ('entrada_nfe', 'entrada')
                        order by m.criado_em desc limit 1) u on true
   where i.estoque = v_est and i.ativo and i.controla and i.minimo is not null and i.minimo > 0 and i.saldo <= i.minimo), '[]'::jsonb);
end;
$$;
grant execute on function public.lista_compras(uuid) to authenticated;

-- 3. Produto pausado quando o insumo acaba
alter table public.lojas add column if not exists pausar_sem_insumo boolean not null default false;
select private.liberar_colunas_lojas();   -- coluna nova em lojas (D-088)
alter table public.produtos add column if not exists pausado_estoque boolean not null default false;
alter table public.produtos add column if not exists etiqueta_antes public.etiqueta_produto;

-- pausa os produtos (com ficha) das lojas que ligaram a opção e estão com algum insumo zerado; devolve os que voltaram
create or replace function private.estoque_revisar_pausas(p_estoque uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.produtos p set etiqueta_antes = p.etiqueta, etiqueta = 'esgotado', pausado_estoque = true
    from public.lojas l
   where l.id = p.loja_id and l.pausar_sem_insumo and not p.pausado_estoque and p.etiqueta is distinct from 'esgotado'
     and private.estoque_da_loja(l.id) = p_estoque
     and exists (select 1 from public.fichas_tecnicas f join public.insumos i on i.id = f.insumo_id
                  where f.produto_id = p.id and i.ativo and i.controla and i.saldo <= 0);
  update public.produtos p set etiqueta = p.etiqueta_antes, etiqueta_antes = null, pausado_estoque = false
    from public.lojas l
   where l.id = p.loja_id and p.pausado_estoque and private.estoque_da_loja(l.id) = p_estoque
     and (not l.pausar_sem_insumo
          or not exists (select 1 from public.fichas_tecnicas f join public.insumos i on i.id = f.insumo_id
                          where f.produto_id = p.id and i.ativo and i.controla and i.saldo <= 0));
end;
$$;

create or replace function private.insumo_saldo_mudou()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (old.saldo > 0) <> (new.saldo > 0) or old.controla <> new.controla or old.ativo <> new.ativo then
    perform private.estoque_revisar_pausas(new.estoque);
  end if;
  return new;
end;
$$;
drop trigger if exists insumos_pausa_produtos on public.insumos;
create trigger insumos_pausa_produtos after update of saldo, controla, ativo on public.insumos for each row execute function private.insumo_saldo_mudou();

create or replace function public.definir_pausa_sem_insumo(p_loja uuid, p_ligado boolean)
returns integer language plpgsql security definer set search_path = '' as $$
begin
  if not private.e_gestor(p_loja) then raise exception 'Só o dono ou o gerente.' using errcode = 'insufficient_privilege'; end if;
  update public.lojas set pausar_sem_insumo = coalesce(p_ligado, false) where id = p_loja;
  perform private.estoque_revisar_pausas(private.estoque_da_loja(p_loja));
  return (select count(*) from public.produtos where loja_id = p_loja and pausado_estoque);
end;
$$;
grant execute on function public.definir_pausa_sem_insumo(uuid, boolean) to authenticated;
revoke execute on function private.estoque_revisar_pausas(uuid), private.insumo_saldo_mudou() from public, anon, authenticated;
