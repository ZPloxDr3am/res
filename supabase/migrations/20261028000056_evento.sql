-- 0056: cardápio de EVENTO / ANIVERSÁRIO (D-055). Pode rodar de novo.
-- Um cardápio bônus por loja (não conta no limite do pacote), com link próprio e período. Os produtos
-- são CÓPIAS dos do cardápio principal: mudar preço, sabores ou regras no evento não mexe no principal.

alter table public.marcas add column if not exists evento boolean not null default false;
alter table public.marcas add column if not exists evento_inicio timestamptz;
alter table public.marcas add column if not exists evento_fim timestamptz;
alter table public.marcas add column if not exists evento_base uuid references public.marcas (id) on delete set null;
alter table public.produtos add column if not exists copia_de uuid references public.produtos (id) on delete set null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'marcas_evento_periodo') then
    alter table public.marcas add constraint marcas_evento_periodo check (evento_fim is null or evento_inicio is null or evento_fim > evento_inicio);
  end if;
end $$;

-- limite do pacote: o cardápio de evento não conta, mas é um por loja
create or replace function private.limite_cardapios()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_conta  uuid;
  v_limite integer;
begin
  if new.evento then
    if exists (select 1 from public.marcas m where m.loja_id = new.loja_id and m.evento) then
      raise exception 'Cada loja tem um cardápio de evento (bônus). Use o que já existe: dá para trocar o nome, as datas e os produtos.' using errcode = 'check_violation';
    end if;
    return new;
  end if;
  select l.conta_id into v_conta from public.lojas l where l.id = new.loja_id;
  if v_conta is null then
    return new;
  end if;
  select limite_cardapios into v_limite from public.contas where id = v_conta for update;
  if v_limite is not null and (select count(*) from public.marcas m join public.lojas l on l.id = m.loja_id where l.conta_id = v_conta and not m.evento) >= v_limite then
    raise exception 'Seu pacote permite % cardápio(s). Fale com a gente para ampliar.', v_limite using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- pedido pelo link do evento só dentro do período
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
  end if;
  return new;
end;
$$;
drop trigger if exists pedidos_a_evento_periodo on public.pedidos;
create trigger pedidos_a_evento_periodo before insert on public.pedidos for each row execute function private.pedido_no_periodo_do_evento();

-- produto que só existe em cardápio(s) de evento
create or replace function private.produto_de_evento(p_produto uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.produto_marcas pm join public.marcas m on m.id = pm.marca_id where pm.produto_id = p_produto and m.evento)
     and not exists (select 1 from public.produto_marcas pm join public.marcas m on m.id = pm.marca_id where pm.produto_id = p_produto and not m.evento);
$$;

-- cria o cardápio de evento, copiando do cardápio base o visual, horários, pagamento e entrega
create or replace function public.criar_evento(p_loja uuid, p_nome text, p_slug text, p_base uuid, p_inicio timestamptz, p_fim timestamptz)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  b    public.marcas;
  v_id uuid;
begin
  if not private.e_gestor(p_loja) then
    raise exception 'Só o dono ou o gerente criam o cardápio de evento.' using errcode = 'insufficient_privilege';
  end if;
  select * into b from public.marcas where id = p_base and loja_id = p_loja and not evento;
  if not found then
    raise exception 'Escolha o cardápio base desta loja.' using errcode = 'check_violation';
  end if;
  if length(btrim(coalesce(p_nome, ''))) < 2 then
    raise exception 'Dê um nome ao evento.' using errcode = 'check_violation';
  end if;
  insert into public.marcas (loja_id, nome, slug, ordem, evento, evento_inicio, evento_fim, evento_base,
                             status_cardapio, pedido_minimo, aceita_entrega, aceita_retirada, formas_pagamento, mensagem_cardapio, agendamento_dias,
                             logo_url, capa_url, cor, descricao, instagram, whatsapp)
  values (p_loja, btrim(p_nome), lower(btrim(p_slug)), coalesce((select max(ordem) + 1 from public.marcas where loja_id = p_loja), 0), true, p_inicio, p_fim, b.id,
          b.status_cardapio, b.pedido_minimo, b.aceita_entrega, b.aceita_retirada, b.formas_pagamento, b.mensagem_cardapio, b.agendamento_dias,
          b.logo_url, b.capa_url, b.cor, b.descricao, b.instagram, b.whatsapp)
  returning id into v_id;
  insert into public.marca_horarios (loja_id, marca_id, dia_semana, abre, fecha)
  select loja_id, v_id, dia_semana, abre, fecha from public.marca_horarios where marca_id = b.id;
  insert into public.areas_entrega (loja_id, marca_id, bairro, taxa, ativo, valor_motoboy, km)
  select loja_id, v_id, bairro, taxa, ativo, valor_motoboy, km from public.areas_entrega where marca_id = b.id;
  insert into public.faixas_km (loja_id, marca_id, ate_km, taxa, minutos_extra)
  select loja_id, v_id, ate_km, taxa, minutos_extra from public.faixas_km where marca_id = b.id;
  return v_id;
end;
$$;

create or replace function public.salvar_evento(p_marca uuid, p_dados jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare m public.marcas;
begin
  select * into m from public.marcas where id = p_marca and evento;
  if not found or not private.e_gestor(m.loja_id) then
    raise exception 'Só o dono ou o gerente mudam o evento.' using errcode = 'insufficient_privilege';
  end if;
  if length(btrim(coalesce(p_dados ->> 'nome', ''))) < 2 then
    raise exception 'Dê um nome ao evento.' using errcode = 'check_violation';
  end if;
  update public.marcas
     set nome = btrim(p_dados ->> 'nome'),
         evento_inicio = nullif(p_dados ->> 'inicio', '')::timestamptz,
         evento_fim = nullif(p_dados ->> 'fim', '')::timestamptz,
         mensagem_cardapio = nullif(btrim(coalesce(p_dados ->> 'mensagem', '')), ''),
         ativa = coalesce((p_dados ->> 'ativa')::boolean, ativa)
   where id = p_marca;
end;
$$;

-- copia um produto do cardápio principal para o evento: produto, grupos, opções e fichas técnicas
create or replace function public.copiar_para_evento(p_evento uuid, p_produto uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev      public.marcas;
  p       public.produtos;
  v_setor uuid;
  v_novo  uuid;
  v_preco numeric;
  g       record;
  v_g     uuid;
  o       record;
  v_o     uuid;
begin
  select * into ev from public.marcas where id = p_evento and evento;
  if not found or not private.e_gestor(ev.loja_id) then
    raise exception 'Só o dono ou o gerente montam o cardápio de evento.' using errcode = 'insufficient_privilege';
  end if;
  select * into p from public.produtos where id = p_produto and loja_id = ev.loja_id;
  if not found then
    raise exception 'Produto não encontrado nesta loja.' using errcode = 'no_data_found';
  end if;
  if p.combo then
    raise exception 'Combos ainda não podem ir para o cardápio de evento. Use um produto com grupos de opções.' using errcode = 'check_violation';
  end if;
  if private.produto_de_evento(p.id) then
    raise exception 'Esse produto já é do evento.' using errcode = 'check_violation';
  end if;

  -- categoria com o mesmo nome, só do evento
  select s.id into v_setor
    from public.setores s
    join public.setores o2 on o2.id = p.setor_id
   where s.loja_id = ev.loja_id and s.nome = o2.nome
     and exists (select 1 from public.setor_marcas sm where sm.setor_id = s.id and sm.marca_id = ev.id)
     and not exists (select 1 from public.setor_marcas sm where sm.setor_id = s.id and sm.marca_id <> ev.id)
   limit 1;
  if v_setor is null then
    insert into public.setores (loja_id, nome, nome_publico, delivery, presencial, ordem)
    select ev.loja_id, coalesce(s.nome, 'Evento'), s.nome_publico, true, true, coalesce(s.ordem, 0)
      from (select 1) x left join public.setores s on s.id = p.setor_id
    returning id into v_setor;
    insert into public.setor_marcas (loja_id, setor_id, marca_id, ativo, ordem) values (ev.loja_id, v_setor, ev.id, true, 0);
  end if;

  select coalesce(pm.preco_delivery, p.preco) into v_preco
    from (select 1) x left join public.produto_marcas pm on pm.produto_id = p.id and pm.marca_id = ev.evento_base;
  insert into public.produtos (loja_id, setor_id, nome, descricao, etiqueta, unidade, preco, destaque, cobra_taxa_servico, restricoes,
                               serve_pessoas, imagem_url, ordem, fator_sabor, copia_de)
  values (ev.loja_id, v_setor, p.nome, p.descricao, p.etiqueta, p.unidade, coalesce(v_preco, p.preco), p.destaque, p.cobra_taxa_servico, p.restricoes,
          p.serve_pessoas, p.imagem_url, p.ordem, p.fator_sabor, p.id)
  returning id into v_novo;
  insert into public.produto_marcas (loja_id, produto_id, marca_id, ativo, delivery, presencial, ordem)
  values (ev.loja_id, v_novo, ev.id, true, true, true, p.ordem);
  insert into public.fichas_tecnicas (loja_id, produto_id, insumo_id, quantidade)
  select ev.loja_id, v_novo, insumo_id, quantidade from public.fichas_tecnicas where produto_id = p.id;

  for g in select gr.*, pg.ordem as pg_ordem from public.produto_grupos pg join public.grupos_opcoes gr on gr.id = pg.grupo_id where pg.produto_id = p.id order by pg.ordem loop
    insert into public.grupos_opcoes (loja_id, nome, ativo, delivery, presencial, obrigatorio, pizza, formacao, min_qtd, max_qtd, permite_repetir)
    values (ev.loja_id, g.nome, g.ativo, g.delivery, g.presencial, g.obrigatorio, g.pizza, g.formacao, g.min_qtd, g.max_qtd, g.permite_repetir)
    returning id into v_g;
    insert into public.produto_grupos (loja_id, produto_id, grupo_id, ordem) values (ev.loja_id, v_novo, v_g, g.pg_ordem);
    for o in
      select op.*, coalesce(op.nome, c.nome, pr.nome) as nome_final, coalesce(op.preco, c.preco, pr.preco, 0) as preco_final,
             coalesce(op.imagem_url, pr.imagem_url) as imagem_final
        from public.opcoes op
        left join public.complementos c on c.id = op.complemento_id
        left join public.produtos pr on pr.id = op.produto_id
       where op.grupo_id = g.id order by op.ordem
    loop
      insert into public.opcoes (loja_id, grupo_id, nome, preco, preco_delivery, preco_presencial, min_qtd, max_qtd, ativo, delivery, presencial, ordem, imagem_url, descricao, selo)
      values (ev.loja_id, v_g, o.nome_final, o.preco_final, o.preco_delivery, o.preco_presencial, o.min_qtd, o.max_qtd, o.ativo, o.delivery, o.presencial, o.ordem, o.imagem_final, o.descricao, o.selo)
      returning id into v_o;
      insert into public.fichas_tecnicas (loja_id, opcao_id, insumo_id, quantidade)
      select ev.loja_id, v_o, insumo_id, quantidade from public.fichas_tecnicas where opcao_id = o.id;
    end loop;
  end loop;
  return v_novo;
end;
$$;

-- ajustes do produto no evento: nome, preço, descrição, ligado/desligado e, em cada grupo, regras e opções
create or replace function public.salvar_produto_evento(p_produto uuid, p_dados jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p  public.produtos;
  g  jsonb;
  o  jsonb;
  v_g uuid;
  v_min int;
  v_max int;
  v_obr boolean;
begin
  select * into p from public.produtos where id = p_produto;
  if not found or not private.e_gestor(p.loja_id) or not private.produto_de_evento(p.id) then
    raise exception 'Só dá para mudar aqui produtos do cardápio de evento.' using errcode = 'insufficient_privilege';
  end if;
  if length(btrim(coalesce(p_dados ->> 'nome', ''))) < 1 then
    raise exception 'O produto precisa de um nome.' using errcode = 'check_violation';
  end if;
  if coalesce((p_dados ->> 'preco')::numeric, -1) < 0 then
    raise exception 'Preço inválido.' using errcode = 'check_violation';
  end if;
  update public.produtos set nome = left(btrim(p_dados ->> 'nome'), 150), descricao = nullif(btrim(coalesce(p_dados ->> 'descricao', '')), ''),
         preco = (p_dados ->> 'preco')::numeric
   where id = p.id;
  update public.produto_marcas set ativo = coalesce((p_dados ->> 'ativo')::boolean, true), preco_delivery = null, preco_presencial = null, preco_promocional = null
   where produto_id = p.id;

  for g in select * from jsonb_array_elements(coalesce(p_dados -> 'grupos', '[]'::jsonb)) loop
    v_g := (g ->> 'id')::uuid;
    if not exists (select 1 from public.produto_grupos where produto_id = p.id and grupo_id = v_g)
       or exists (select 1 from public.produto_grupos where grupo_id = v_g and produto_id <> p.id) then
      raise exception 'Grupo de outro produto.' using errcode = 'check_violation';
    end if;
    if coalesce((g ->> 'remover')::boolean, false) then
      delete from public.produto_grupos where produto_id = p.id and grupo_id = v_g;
      delete from public.grupos_opcoes where id = v_g;
      continue;
    end if;
    v_min := (g ->> 'min')::int; v_max := (g ->> 'max')::int; v_obr := (g ->> 'obrigatorio')::boolean;
    if v_max < 1 or v_min < 0 or v_min > v_max or (v_obr and v_min < 1) then
      raise exception 'Confira mínimo e máximo de "%".', g ->> 'nome' using errcode = 'check_violation';
    end if;
    for o in select * from jsonb_array_elements(coalesce(g -> 'opcoes', '[]'::jsonb)) loop
      update public.opcoes set ativo = coalesce((o ->> 'ativo')::boolean, ativo), preco = coalesce((o ->> 'preco')::numeric, preco),
             preco_delivery = case when o ? 'preco' then null else preco_delivery end,
             max_qtd = greatest(1, least(max_qtd, v_max))
       where id = (o ->> 'id')::uuid and grupo_id = v_g;
    end loop;
    if v_obr and not exists (select 1 from public.opcoes where grupo_id = v_g and ativo) then
      raise exception 'Deixe pelo menos uma opção ligada em "%".', g ->> 'nome' using errcode = 'check_violation';
    end if;
    update public.grupos_opcoes set nome = left(btrim(coalesce(g ->> 'nome', nome)), 100), min_qtd = v_min, max_qtd = v_max, obrigatorio = v_obr,
           permite_repetir = coalesce((g ->> 'permite_repetir')::boolean, permite_repetir) and v_max > 1
     where id = v_g;
    update public.opcoes set max_qtd = greatest(1, least(max_qtd, v_max)) where grupo_id = v_g;
  end loop;
end;
$$;

create or replace function public.remover_produto_evento(p_produto uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare p public.produtos;
begin
  select * into p from public.produtos where id = p_produto;
  if not found or not private.e_gestor(p.loja_id) or not private.produto_de_evento(p.id) then
    raise exception 'Só dá para tirar aqui produtos do cardápio de evento.' using errcode = 'insufficient_privilege';
  end if;
  delete from public.grupos_opcoes g where g.id in (select grupo_id from public.produto_grupos where produto_id = p.id)
     and not exists (select 1 from public.produto_grupos x where x.grupo_id = g.id and x.produto_id <> p.id);
  delete from public.produtos where id = p.id;
end;
$$;

-- para o cardápio público: é evento? de quando a quando?
create or replace function public.evento_publico(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when m.evento then jsonb_build_object('nome', m.nome, 'inicio', m.evento_inicio, 'fim', m.evento_fim,
              'agora', now(), 'base', (select b.slug from public.marcas b where b.id = m.evento_base and b.ativa)) end
    from public.marcas m where m.slug = lower(btrim(p_slug)) and m.ativa;
$$;

revoke execute on function public.criar_evento(uuid, text, text, uuid, timestamptz, timestamptz), public.salvar_evento(uuid, jsonb),
  public.copiar_para_evento(uuid, uuid), public.salvar_produto_evento(uuid, jsonb), public.remover_produto_evento(uuid) from anon, public;
grant execute on function public.criar_evento(uuid, text, text, uuid, timestamptz, timestamptz), public.salvar_evento(uuid, jsonb),
  public.copiar_para_evento(uuid, uuid), public.salvar_produto_evento(uuid, jsonb), public.remover_produto_evento(uuid) to authenticated;
grant execute on function public.evento_publico(text) to anon, authenticated;
