-- RES · 0046 · LA PIZZA: sabores como no BeeFood (D-046), a pedido do dono em 28/10/2026.
-- Cada tamanho exige exatamente o número de sabores dele (Broto 1, Média 2, Grande 3, Gigante 4).
-- Para meio a meio o cliente repete um sabor (ex.: Grande = 2× Calabresa + 1× Bacon → ⅔ e ⅓).
-- Só os grupos de pizza da loja do cardápio "la-pizza". Pode rodar de novo sem erro.

update public.grupos_opcoes g
   set min_qtd = g.max_qtd, permite_repetir = true, obrigatorio = true, atualizado_em = now()
 where g.pizza and g.loja_id = (select loja_id from public.marcas where slug = 'la-pizza')
   and (g.min_qtd <> g.max_qtd or not g.permite_repetir or not g.obrigatorio);

update public.opcoes o
   set max_qtd = g.max_qtd, atualizado_em = now()
  from public.grupos_opcoes g
 where o.grupo_id = g.id and g.pizza and g.loja_id = (select loja_id from public.marcas where slug = 'la-pizza')
   and o.max_qtd < g.max_qtd;
