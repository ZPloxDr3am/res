-- RES · 0015 · Etapa 4 (parte 2): impressão — impressoras, regras da cozinha, layouts e fila.
--
-- Como no BeeFood (estudo-beefood/impressao.md), com melhorias (D-014):
--  * impressoras cadastradas com o modelo do catálogo (protocolo, página de código, colunas…);
--  * regras: canal automático/manual; destino por impressora única, setor ou produto;
--    marketplace "tudo aqui" ou "só o que não tem vínculo"; via completa ou separada por setor;
--    via do pedido (caixa/entrega) numa impressora própria;
--  * layout por marca (cupom do pedido e cupom da cozinha);
--  * FILA no banco (impressoes): cada cupom é uma linha com o conteúdo pronto (snapshot do pedido);
--    o agente do Windows (próxima parte) e o navegador consomem a mesma fila; nada se perde se a
--    impressora estiver desligada; histórico e reimpressão.

-- ---------------------------------------------------------------------------
-- Impressoras
-- ---------------------------------------------------------------------------
create table public.impressoras (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references public.lojas (id) on delete cascade,
  nome          text not null check (length(btrim(nome)) between 1 and 60),
  modelo        text not null check (length(modelo) between 1 and 60),   -- chave do catálogo (core/impressoras.ts)
  protocolo     text not null check (protocolo in ('EscPosEpson', 'EscBematech', 'EscDaruma', 'EscGPrinter', 'CustomPos')),
  conexao       text not null default 'usb' check (conexao in ('usb', 'rede')),
  endereco      text check (endereco is null or length(endereco) <= 120),  -- nome no Windows (USB) ou IP:porta (rede)
  colunas       smallint not null default 48 check (colunas between 24 and 64),
  pagina_codigo text not null default '860' check (pagina_codigo in ('860', '850', '1252', 'UTF8')),
  espaco_linhas smallint not null default 0 check (espaco_linhas between 0 and 255),
  pular_linhas  smallint not null default 4 check (pular_linhas between 0 and 20),
  corte         boolean not null default true,
  gaveta        boolean not null default false,
  ativo         boolean not null default true,
  ultimo_sinal  timestamptz,   -- agente avisou que a impressora respondeu
  ultimo_erro   text,
  criado_em     timestamptz not null default now(),
  unique (id, loja_id)
);
create unique index impressoras_nome_idx on public.impressoras (loja_id, lower(btrim(nome)));

-- Regras da loja (uma linha por loja; ausência = nada imprime sozinho).
create table public.impressao_config (
  loja_id                uuid primary key references public.lojas (id) on delete cascade,
  modo_destino           text not null default 'unica' check (modo_destino in ('unica', 'setor', 'produto')),
  impressora_padrao      uuid references public.impressoras (id) on delete set null,
  agrupamento            text not null default 'completo' check (agrupamento in ('completo', 'por_setor')),
  -- canal → 'automatico' (imprime ao aceitar) | 'manual' (só no botão Imprimir)
  canais                 jsonb not null default '{"painel": "automatico", "cardapio_digital": "automatico", "marketplace": "automatico"}',
  via_pedido_impressora  uuid references public.impressoras (id) on delete set null,
  via_pedido_auto        boolean not null default false,
  marketplace_impressora uuid references public.impressoras (id) on delete set null,
  marketplace_modo       text not null default 'sem_vinculo' check (marketplace_modo in ('tudo', 'sem_vinculo')),
  atualizado_em          timestamptz not null default now()
);

-- Destino por setor ou por produto.
create table public.impressao_destinos (
  loja_id       uuid not null references public.lojas (id) on delete cascade,
  tipo          text not null check (tipo in ('setor', 'produto')),
  alvo_id       uuid not null,
  impressora_id uuid not null references public.impressoras (id) on delete cascade,
  primary key (tipo, alvo_id)
);
create index impressao_destinos_loja_idx on public.impressao_destinos (loja_id);

-- Layout por marca e tipo de cupom. opcoes: ver core/cupom.ts (LayoutCupom).
create table public.impressao_layouts (
  marca_id uuid not null,
  loja_id  uuid not null,
  tipo     text not null check (tipo in ('pedido', 'cozinha')),
  opcoes   jsonb not null default '{}',
  primary key (marca_id, tipo),
  foreign key (marca_id, loja_id) references public.marcas (id, loja_id) on delete cascade
);

-- Fila e histórico.
create table public.impressoes (
  id            uuid primary key default gen_random_uuid(),
  loja_id       uuid not null references public.lojas (id) on delete cascade,
  pedido_id     uuid,
  impressora_id uuid references public.impressoras (id) on delete set null,
  tipo          text not null check (tipo in ('cozinha', 'pedido', 'teste')),
  motivo        text not null check (motivo in ('aceite', 'manual', 'reimpressao', 'teste')),
  titulo        text not null,
  conteudo      jsonb not null,   -- CupomDados (core/cupom.ts)
  layout        jsonb not null default '{}',
  status        text not null default 'pendente' check (status in ('pendente', 'imprimindo', 'impresso', 'erro', 'cancelado')),
  tentativas    smallint not null default 0,
  erro          text,
  impresso_por  text check (impresso_por in ('agente', 'navegador')),
  criado_por    uuid,
  criado_em     timestamptz not null default now(),
  impresso_em   timestamptz,
  foreign key (pedido_id, loja_id) references public.pedidos (id, loja_id) on delete cascade
);
create index impressoes_loja_idx on public.impressoes (loja_id, criado_em desc);
create index impressoes_pendentes_idx on public.impressoes (loja_id, impressora_id) where status in ('pendente', 'imprimindo');
create index impressoes_pedido_idx on public.impressoes (pedido_id);

create trigger impressoras_auditar after insert or update or delete on public.impressoras for each row execute function private.auditar();
create trigger impressao_config_auditar after insert or update on public.impressao_config for each row execute function private.auditar();

alter table public.impressoras enable row level security;
alter table public.impressao_config enable row level security;
alter table public.impressao_destinos enable row level security;
alter table public.impressao_layouts enable row level security;
alter table public.impressoes enable row level security;
create policy impressoras_ler on public.impressoras for select to authenticated using (private.e_membro(loja_id));
create policy impressao_config_ler on public.impressao_config for select to authenticated using (private.e_membro(loja_id));
create policy impressao_destinos_ler on public.impressao_destinos for select to authenticated using (private.e_membro(loja_id));
create policy impressao_layouts_ler on public.impressao_layouts for select to authenticated using (private.e_membro(loja_id));
create policy impressoes_ler on public.impressoes for select to authenticated
  using (private.tem_permissao(loja_id, 'pedidos_delivery') or private.tem_permissao(loja_id, 'impressoras'));
-- Escrita só pelas funções abaixo.

-- ---------------------------------------------------------------------------
-- Conteúdo do cupom (snapshot). p_itens null = todos os itens.
-- ---------------------------------------------------------------------------
create or replace function private.dados_cupom(p_pedido uuid, p_itens uuid[] default null, p_setor text default null)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'loja', l.nome, 'marca', m.nome, 'marca_id', m.id, 'numero', p.numero, 'tipo_pedido', p.tipo, 'origem', p.origem,
    'criado_em', p.criado_em, 'agendado_para', p.agendado_para, 'fuso', l.fuso_horario, 'setor', p_setor,
    'cliente', jsonb_build_object('nome', p.cliente_nome, 'telefone', p.cliente_telefone),
    'endereco', p.endereco,
    'observacao', p.observacao,
    'pagamento', p.pagamento, 'troco_para', round(p.troco_para * 100),
    'subtotal', round(p.subtotal * 100), 'taxa_entrega', round(p.taxa_entrega * 100), 'desconto', round(p.desconto * 100),
    'total', round(p.total * 100),
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
               'quantidade', i.quantidade, 'nome', i.nome, 'total', round(i.total * 100), 'observacao', i.observacao,
               'opcoes', coalesce((select jsonb_agg(jsonb_build_object('grupo', o.grupo_nome, 'nome', o.nome, 'quantidade', o.quantidade, 'fracao', o.fracao) order by o.id)
                                     from public.pedido_item_opcoes o where o.item_id = i.id), '[]'::jsonb))
             order by i.ordem)
        from public.pedido_itens i
       where i.pedido_id = p.id and (p_itens is null or i.id = any (p_itens))), '[]'::jsonb))
  from public.pedidos p
  join public.marcas m on m.id = p.marca_id
  join public.lojas l on l.id = p.loja_id
  where p.id = p_pedido;
$$;

create or replace function private.layout_cupom(p_marca uuid, p_tipo text)
returns jsonb
language sql
stable
set search_path = ''
as $$ select coalesce((select opcoes from public.impressao_layouts where marca_id = p_marca and tipo = p_tipo), '{}'::jsonb) $$;

-- Canal do pedido para as regras.
create or replace function private.canal_impressao(p_origem public.origem_pedido)
returns text
language sql
immutable
set search_path = ''
as $$ select case p_origem when 'ifood' then 'marketplace' when 'cardapio_digital' then 'cardapio_digital' else 'painel' end $$;

-- ---------------------------------------------------------------------------
-- Gera os cupons de um pedido conforme as regras. Devolve os ids criados.
-- p_tipos: 'cozinha' e/ou 'pedido'. Sem impressora resolvida: cozinha manual vai para a fila sem
-- impressora (o navegador imprime); automático sem impressora não gera nada.
-- ---------------------------------------------------------------------------
create or replace function private.gerar_impressoes(p_pedido uuid, p_motivo text, p_tipos text[], p_user uuid)
returns uuid[]
language plpgsql
set search_path = ''
as $$
declare
  v_ped   public.pedidos;
  v_cfg   public.impressao_config;
  v_ids   uuid[] := '{}';
  v_id    uuid;
  v_canal text;
  g       record;
begin
  select * into v_ped from public.pedidos where id = p_pedido;
  if not found then
    return v_ids;
  end if;
  select * into v_cfg from public.impressao_config where loja_id = v_ped.loja_id;
  v_canal := private.canal_impressao(v_ped.origem);

  if 'cozinha' = any (p_tipos) then
    for g in
      with itens as (
        select i.id, i.produto_id, coalesce(s.nome, 'Outros') as setor_nome, s.id as setor_id,
               case
                 when v_canal = 'marketplace' and v_cfg.marketplace_impressora is not null
                      and (v_cfg.marketplace_modo = 'tudo' or i.produto_id is null)
                   then v_cfg.marketplace_impressora
                 when v_cfg.modo_destino = 'produto'
                   then coalesce((select d.impressora_id from public.impressao_destinos d where d.tipo = 'produto' and d.alvo_id = i.produto_id),
                                 (select d.impressora_id from public.impressao_destinos d where d.tipo = 'setor' and d.alvo_id = s.id),
                                 v_cfg.impressora_padrao)
                 when v_cfg.modo_destino = 'setor'
                   then coalesce((select d.impressora_id from public.impressao_destinos d where d.tipo = 'setor' and d.alvo_id = s.id),
                                 v_cfg.impressora_padrao)
                 else v_cfg.impressora_padrao
               end as impressora_id
          from public.pedido_itens i
          left join public.produtos pr on pr.id = i.produto_id
          left join public.setores s on s.id = pr.setor_id
         where i.pedido_id = p_pedido
      )
      select it.impressora_id,
             case when coalesce(v_cfg.agrupamento, 'completo') = 'por_setor' and v_canal <> 'marketplace' then it.setor_nome end as setor,
             array_agg(it.id) as itens,
             string_agg(distinct it.setor_nome, ', ') as setores
        from itens it
       where p_motivo <> 'aceite' or it.impressora_id is not null
       group by 1, 2
       order by 2 nulls first
    loop
      insert into public.impressoes (loja_id, pedido_id, impressora_id, tipo, motivo, titulo, conteudo, layout, criado_por)
      values (v_ped.loja_id, p_pedido, g.impressora_id, 'cozinha', p_motivo,
              'Cozinha #' || v_ped.numero || coalesce(' · ' || g.setor, ''),
              private.dados_cupom(p_pedido, g.itens, g.setor),
              private.layout_cupom(v_ped.marca_id, 'cozinha'), p_user)
      returning id into v_id;
      v_ids := v_ids || v_id;
    end loop;
  end if;

  if 'pedido' = any (p_tipos) and (p_motivo <> 'aceite' or v_cfg.via_pedido_impressora is not null) then
    insert into public.impressoes (loja_id, pedido_id, impressora_id, tipo, motivo, titulo, conteudo, layout, criado_por)
    values (v_ped.loja_id, p_pedido, coalesce(v_cfg.via_pedido_impressora, v_cfg.impressora_padrao), 'pedido', p_motivo,
            'Pedido #' || v_ped.numero, private.dados_cupom(p_pedido), private.layout_cupom(v_ped.marca_id, 'pedido'), p_user)
    returning id into v_id;
    v_ids := v_ids || v_id;
  end if;
  return v_ids;
end;
$$;

-- Ao aceitar (ou entrar já aceito pelo aceite automático), imprime sozinho nos canais automáticos.
-- Gatilho adiado para o fim da transação: o pedido entra antes dos itens.
create or replace function private.imprimir_ao_aceitar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ped public.pedidos;
  v_cfg public.impressao_config;
  v_tipos text[] := '{}';
begin
  select * into v_ped from public.pedidos where id = new.id;
  if not found or v_ped.status <> 'em_preparo' then
    return null;
  end if;
  if exists (select 1 from public.impressoes where pedido_id = v_ped.id and motivo = 'aceite') then
    return null;
  end if;
  select * into v_cfg from public.impressao_config where loja_id = v_ped.loja_id;
  if not found then
    return null;
  end if;
  if coalesce(v_cfg.canais ->> private.canal_impressao(v_ped.origem), 'automatico') = 'automatico' then
    v_tipos := v_tipos || 'cozinha'::text;
  end if;
  if v_cfg.via_pedido_auto then
    v_tipos := v_tipos || 'pedido'::text;
  end if;
  if cardinality(v_tipos) > 0 then
    perform private.gerar_impressoes(v_ped.id, 'aceite', v_tipos, null);
  end if;
  return null;
end;
$$;
create constraint trigger pedidos_imprimir_ao_aceitar
  after insert or update of status on public.pedidos
  deferrable initially deferred
  for each row when (new.status = 'em_preparo')
  execute function private.imprimir_ao_aceitar();

-- ---------------------------------------------------------------------------
-- Ações do painel
-- ---------------------------------------------------------------------------
-- Cupons prontos para o navegador/agente. Campos do JSON: id, impressora_id, impressora, colunas, titulo, conteudo, layout, tipo.
create or replace function private.cupons(p_ids uuid[])
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', x.id, 'tipo', x.tipo, 'motivo', x.motivo, 'titulo', x.titulo, 'conteudo', x.conteudo, 'layout', x.layout,
           'impressora_id', x.impressora_id, 'impressora', i.nome, 'colunas', coalesce(i.colunas, 48), 'status', x.status,
           -- o agente do Windows imprime sozinho se a impressora deu sinal há pouco; senão o navegador imprime
           'agente_online', coalesce(i.ultimo_sinal > now() - interval '2 minutes', false))
         order by x.criado_em), '[]'::jsonb)
    from public.impressoes x left join public.impressoras i on i.id = x.impressora_id
   where x.id = any (p_ids);
$$;

-- Botão "Imprimir" no pedido. p_tipo: 'cozinha' | 'pedido'.
create or replace function public.imprimir_pedido(p_pedido uuid, p_tipo text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid;
  v_ids  uuid[];
begin
  select loja_id into v_loja from public.pedidos where id = p_pedido;
  if v_loja is null or not private.tem_permissao(v_loja, 'pedidos_delivery') then
    raise exception 'Pedido não encontrado' using errcode = 'no_data_found';
  end if;
  if p_tipo not in ('cozinha', 'pedido') then
    raise exception 'Tipo de cupom inválido.' using errcode = 'check_violation';
  end if;
  v_ids := private.gerar_impressoes(p_pedido,
             case when exists (select 1 from public.impressoes where pedido_id = p_pedido and tipo = p_tipo) then 'reimpressao' else 'manual' end,
             array[p_tipo], auth.uid());
  return private.cupons(v_ids);
end;
$$;

create or replace function public.reimprimir(p_impressao uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_x  public.impressoes;
  v_id uuid;
begin
  select * into v_x from public.impressoes where id = p_impressao;
  if not found or not (private.tem_permissao(v_x.loja_id, 'pedidos_delivery') or private.tem_permissao(v_x.loja_id, 'impressoras')) then
    raise exception 'Impressão não encontrada' using errcode = 'no_data_found';
  end if;
  insert into public.impressoes (loja_id, pedido_id, impressora_id, tipo, motivo, titulo, conteudo, layout, criado_por)
  values (v_x.loja_id, v_x.pedido_id, v_x.impressora_id, v_x.tipo, case when v_x.tipo = 'teste' then 'teste' else 'reimpressao' end,
          v_x.titulo, v_x.conteudo, v_x.layout, auth.uid())
  returning id into v_id;
  return private.cupons(array[v_id]);
end;
$$;

create or replace function public.imprimir_teste(p_impressora uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_i  public.impressoras;
  v_id uuid;
begin
  select * into v_i from public.impressoras where id = p_impressora;
  if not found or not private.tem_permissao(v_i.loja_id, 'impressoras') then
    raise exception 'Impressora não encontrada' using errcode = 'no_data_found';
  end if;
  insert into public.impressoes (loja_id, impressora_id, tipo, motivo, titulo, conteudo, criado_por)
  values (v_i.loja_id, v_i.id, 'teste', 'teste', 'Teste · ' || v_i.nome,
          jsonb_build_object('teste', true, 'impressora', v_i.nome, 'modelo', v_i.modelo, 'protocolo', v_i.protocolo,
                             'colunas', v_i.colunas, 'pagina_codigo', v_i.pagina_codigo,
                             'loja', (select nome from public.lojas where id = v_i.loja_id), 'criado_em', now()),
          auth.uid())
  returning id into v_id;
  return private.cupons(array[v_id]);
end;
$$;

-- O navegador (ou, depois, o agente) avisa o resultado.
create or replace function public.marcar_impressao(p_ids uuid[], p_status text, p_por text default 'navegador', p_erro text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  if p_status not in ('impresso', 'erro', 'cancelado', 'imprimindo') or p_por not in ('navegador', 'agente') then
    raise exception 'Situação inválida.' using errcode = 'check_violation';
  end if;
  update public.impressoes x set
    status = p_status,
    impresso_por = case when p_status = 'impresso' then p_por else impresso_por end,
    impresso_em = case when p_status = 'impresso' then now() else impresso_em end,
    tentativas = tentativas + case when p_status in ('impresso', 'erro') then 1 else 0 end,
    erro = case when p_status = 'erro' then left(p_erro, 300) else null end
   where x.id = any (p_ids)
     and (private.tem_permissao(x.loja_id, 'pedidos_delivery') or private.tem_permissao(x.loja_id, 'impressoras'));
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Configuração (permissão "impressoras")
-- ---------------------------------------------------------------------------
-- p_dados: {nome, modelo, protocolo, conexao, endereco, colunas, pagina_codigo, espaco_linhas, pular_linhas, corte, gaveta, ativo}
create or replace function public.salvar_impressora(p_loja uuid, p_id uuid, p_dados jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := p_id;
begin
  if not private.tem_permissao(p_loja, 'impressoras') then
    raise exception 'Você não tem permissão para configurar impressoras.' using errcode = 'insufficient_privilege';
  end if;
  if v_id is null then
    insert into public.impressoras (loja_id, nome, modelo, protocolo, conexao, endereco, colunas, pagina_codigo, espaco_linhas, pular_linhas, corte, gaveta, ativo)
    values (p_loja, btrim(p_dados ->> 'nome'), p_dados ->> 'modelo', p_dados ->> 'protocolo', coalesce(p_dados ->> 'conexao', 'usb'),
            nullif(btrim(p_dados ->> 'endereco'), ''), coalesce((p_dados ->> 'colunas')::smallint, 48), coalesce(p_dados ->> 'pagina_codigo', '860'),
            coalesce((p_dados ->> 'espaco_linhas')::smallint, 0), coalesce((p_dados ->> 'pular_linhas')::smallint, 4),
            coalesce((p_dados ->> 'corte')::boolean, true), coalesce((p_dados ->> 'gaveta')::boolean, false), coalesce((p_dados ->> 'ativo')::boolean, true))
    returning id into v_id;
  else
    update public.impressoras set
      nome = btrim(p_dados ->> 'nome'), modelo = p_dados ->> 'modelo', protocolo = p_dados ->> 'protocolo',
      conexao = coalesce(p_dados ->> 'conexao', conexao), endereco = nullif(btrim(p_dados ->> 'endereco'), ''),
      colunas = coalesce((p_dados ->> 'colunas')::smallint, colunas), pagina_codigo = coalesce(p_dados ->> 'pagina_codigo', pagina_codigo),
      espaco_linhas = coalesce((p_dados ->> 'espaco_linhas')::smallint, espaco_linhas), pular_linhas = coalesce((p_dados ->> 'pular_linhas')::smallint, pular_linhas),
      corte = coalesce((p_dados ->> 'corte')::boolean, corte), gaveta = coalesce((p_dados ->> 'gaveta')::boolean, gaveta),
      ativo = coalesce((p_dados ->> 'ativo')::boolean, ativo)
    where id = v_id and loja_id = p_loja;
    if not found then
      raise exception 'Impressora não encontrada.' using errcode = 'no_data_found';
    end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.excluir_impressora(p_impressora uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid;
begin
  select loja_id into v_loja from public.impressoras where id = p_impressora;
  if v_loja is null or not private.tem_permissao(v_loja, 'impressoras') then
    raise exception 'Impressora não encontrada.' using errcode = 'no_data_found';
  end if;
  -- cupons que ainda esperavam esta impressora ficam para o navegador
  update public.impressoes set impressora_id = null where impressora_id = p_impressora and status in ('pendente', 'erro');
  delete from public.impressoras where id = p_impressora;
end;
$$;

-- p_config: {modo_destino, impressora_padrao, agrupamento, canais, via_pedido_impressora, via_pedido_auto,
--            marketplace_impressora, marketplace_modo, destinos: [{tipo, alvo_id, impressora_id}]}
create or replace function public.salvar_config_impressao(p_loja uuid, p_config jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  k text;
begin
  if not private.tem_permissao(p_loja, 'impressoras') then
    raise exception 'Você não tem permissão para configurar impressoras.' using errcode = 'insufficient_privilege';
  end if;
  -- toda impressora citada precisa ser desta loja
  if exists (
    select 1 from (
      select nullif(p_config ->> 'impressora_padrao', '')::uuid as i union all
      select nullif(p_config ->> 'via_pedido_impressora', '')::uuid union all
      select nullif(p_config ->> 'marketplace_impressora', '')::uuid union all
      select nullif(d ->> 'impressora_id', '')::uuid from jsonb_array_elements(coalesce(p_config -> 'destinos', '[]'::jsonb)) d
    ) t
    where t.i is not null and not exists (select 1 from public.impressoras x where x.id = t.i and x.loja_id = p_loja)) then
    raise exception 'Impressora inválida.' using errcode = 'check_violation';
  end if;
  for k in select jsonb_object_keys(coalesce(p_config -> 'canais', '{}'::jsonb)) loop
    if k not in ('painel', 'cardapio_digital', 'marketplace') or (p_config -> 'canais' ->> k) not in ('automatico', 'manual') then
      raise exception 'Canal inválido: %', k using errcode = 'check_violation';
    end if;
  end loop;
  -- setores e produtos citados precisam ser desta loja
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_config -> 'destinos', '[]'::jsonb)) d
     where nullif(d ->> 'impressora_id', '') is not null and not (case d ->> 'tipo'
                  when 'setor' then exists (select 1 from public.setores s where s.id = (d ->> 'alvo_id')::uuid and s.loja_id = p_loja)
                  when 'produto' then exists (select 1 from public.produtos p where p.id = (d ->> 'alvo_id')::uuid and p.loja_id = p_loja)
                  else false end)) then
    raise exception 'Setor ou produto inválido.' using errcode = 'check_violation';
  end if;

  insert into public.impressao_config as c (loja_id, modo_destino, impressora_padrao, agrupamento, canais, via_pedido_impressora, via_pedido_auto, marketplace_impressora, marketplace_modo)
  values (p_loja,
          coalesce(p_config ->> 'modo_destino', 'unica'), nullif(p_config ->> 'impressora_padrao', '')::uuid, coalesce(p_config ->> 'agrupamento', 'completo'),
          '{"painel": "automatico", "cardapio_digital": "automatico", "marketplace": "automatico"}'::jsonb || coalesce(p_config -> 'canais', '{}'::jsonb),
          nullif(p_config ->> 'via_pedido_impressora', '')::uuid, coalesce((p_config ->> 'via_pedido_auto')::boolean, false),
          nullif(p_config ->> 'marketplace_impressora', '')::uuid, coalesce(p_config ->> 'marketplace_modo', 'sem_vinculo'))
  on conflict (loja_id) do update set
    modo_destino = excluded.modo_destino, impressora_padrao = excluded.impressora_padrao, agrupamento = excluded.agrupamento,
    canais = excluded.canais, via_pedido_impressora = excluded.via_pedido_impressora, via_pedido_auto = excluded.via_pedido_auto,
    marketplace_impressora = excluded.marketplace_impressora, marketplace_modo = excluded.marketplace_modo, atualizado_em = now();

  if p_config ? 'destinos' then
    delete from public.impressao_destinos where loja_id = p_loja;
    insert into public.impressao_destinos (loja_id, tipo, alvo_id, impressora_id)
    select distinct on (d ->> 'tipo', d ->> 'alvo_id') p_loja, d ->> 'tipo', (d ->> 'alvo_id')::uuid, (d ->> 'impressora_id')::uuid
      from jsonb_array_elements(p_config -> 'destinos') d
     where nullif(d ->> 'impressora_id', '') is not null;
  end if;
end;
$$;

create or replace function public.salvar_layout_impressao(p_marca uuid, p_tipo text, p_opcoes jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_loja uuid;
begin
  select loja_id into v_loja from public.marcas where id = p_marca;
  if v_loja is null or not private.tem_permissao(v_loja, 'impressoras') then
    raise exception 'Você não tem permissão para configurar impressoras.' using errcode = 'insufficient_privilege';
  end if;
  if p_tipo not in ('pedido', 'cozinha') or jsonb_typeof(p_opcoes) <> 'object' or length(p_opcoes::text) > 4000 then
    raise exception 'Layout inválido.' using errcode = 'check_violation';
  end if;
  insert into public.impressao_layouts (marca_id, loja_id, tipo, opcoes) values (p_marca, v_loja, p_tipo, p_opcoes)
  on conflict (marca_id, tipo) do update set opcoes = excluded.opcoes;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.imprimir_pedido(uuid, text)', 'public.reimprimir(uuid)', 'public.imprimir_teste(uuid)',
    'public.marcar_impressao(uuid[], text, text, text)', 'public.salvar_impressora(uuid, uuid, jsonb)',
    'public.excluir_impressora(uuid)', 'public.salvar_config_impressao(uuid, jsonb)',
    'public.salvar_layout_impressao(uuid, text, jsonb)'] loop
    execute format('grant execute on function %s to authenticated', f);
    execute format('revoke execute on function %s from anon, public', f);
  end loop;
  foreach f in array array[
    'private.dados_cupom(uuid, uuid[], text)', 'private.layout_cupom(uuid, text)', 'private.canal_impressao(public.origem_pedido)',
    'private.gerar_impressoes(uuid, text, text[], uuid)', 'private.imprimir_ao_aceitar()', 'private.cupons(uuid[])'] loop
    execute format('revoke execute on function %s from anon, public', f);
  end loop;
end;
$$;

-- Tempo real: o painel (e o agente) veem a fila andar.
alter publication supabase_realtime add table public.impressoes, public.impressoras;
