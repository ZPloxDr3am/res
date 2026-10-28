-- RES · 0034 · Foto nas opções dos grupos (sabores, bordas, adicionais) (D-035).
--
-- * opcoes.imagem_url: foto da opção (o dono envia na edição do grupo). Opção que é um produto
--   usa a foto do produto quando não tem a própria.
-- * O cardápio digital passa a mandar a foto de cada opção. Pode rodar de novo sem erro.

alter table public.opcoes add column if not exists imagem_url text
  check (imagem_url is null or imagem_url ~ '^https://');

-- produto no cardápio digital (0023) + foto das opções
create or replace function private.produto_publico(p_produto uuid, p_marca uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'nome', p.nome, 'descricao', p.descricao, 'imagem_url', p.imagem_url, 'etiqueta', p.etiqueta,
    'preco', round(100 * private.preco_base(p, pm, 'delivery')),
    'preco_original', case when private.preco_base(p, pm, 'delivery') < coalesce(pm.preco_delivery, p.preco, 0) then round(100 * coalesce(pm.preco_delivery, p.preco, 0)) end,
    'combo', p.combo,
    'passos', case when p.combo then coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', cp.id, 'titulo', cp.titulo, 'quantidade', cp.quantidade,
               'produtos', coalesce((
                 select jsonb_agg(private.produto_publico(c.id, p_marca) order by c.ordem, c.nome)
                   from public.produtos c
                   join public.produto_marcas cpm on cpm.produto_id = c.id and cpm.marca_id = p_marca and cpm.ativo and cpm.delivery
                  where not c.combo and (c.id = any (cp.produtos) or (cp.setor_id is not null and c.setor_id = cp.setor_id))), '[]'::jsonb))
             order by cp.ordem)
        from public.combo_passos cp where cp.combo_id = p.id), '[]'::jsonb) end,
    'grupos', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', g.id, 'nome', g.nome, 'formacao', g.formacao, 'obrigatorio', g.obrigatorio, 'pizza', g.pizza,
               'min', g.min_qtd, 'max', g.max_qtd, 'permite_repetir', g.permite_repetir,
               'opcoes', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', o.id, 'nome', coalesce(o.nome, c.nome, op.nome), 'max', o.max_qtd,
                          'imagem_url', coalesce(o.imagem_url, op.imagem_url),
                          'preco', round(100 * coalesce(o.preco_delivery, o.preco, c.preco, op.preco, 0)))
                        order by o.ordem)
                   from public.opcoes o
                   left join public.complementos c on c.id = o.complemento_id
                   left join public.produtos op on op.id = o.produto_id
                  where o.grupo_id = g.id and o.ativo and o.delivery), '[]'::jsonb))
             order by pg.ordem)
        from public.produto_grupos pg join public.grupos_opcoes g on g.id = pg.grupo_id
       where pg.produto_id = p.id and g.ativo and g.delivery), '[]'::jsonb))
  from public.produtos p
  join public.produto_marcas pm on pm.produto_id = p.id and pm.marca_id = p_marca
  where p.id = p_produto;
$$;
