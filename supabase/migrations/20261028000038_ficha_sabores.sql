-- RES · 0038 · Ficha técnica por sabor com tamanhos (D-040).
-- A ficha do sabor é escrita uma vez, para a pizza de referência (ex.: Gigante 40 cm = 100%).
-- Cada pizza tem um fator de tamanho (ex.: Broto 25 cm = 39%), que multiplica os sabores dela.
-- Baixa de um sabor = ficha do sabor × fator do tamanho × fração (meio a meio) × quantidade.
-- Pode rodar de novo sem erro.

alter table public.produtos add column if not exists fator_sabor numeric(6, 3) not null default 1;
do $$ begin
  alter table public.produtos add constraint produtos_fator_sabor check (fator_sabor > 0 and fator_sabor <= 10);
exception when duplicate_object then null;
end $$;

create or replace function private.consumo_pedido(p_pedido uuid)
returns table (insumo_id uuid, quantidade numeric)
language sql
stable
security definer
set search_path = ''
as $$
  with itens as (
    select i.id, i.produto_id, i.quantidade, i.loja_id, coalesce(pr.fator_sabor, 1) as fator
      from public.pedido_itens i left join public.produtos pr on pr.id = i.produto_id
     where i.pedido_id = p_pedido
  ), c as (
    -- produto: massa, molho, caixa…
    select f.insumo_id, f.quantidade * i.quantidade as q
      from itens i join public.fichas_tecnicas f on f.produto_id = i.produto_id
    union all
    -- opção: sabor de pizza leva o fator do tamanho (no combo, o da pizza escolhida no passo)
    select f.insumo_id,
           f.quantidade * (case when o.fracao is not null then o.fracao else o.quantidade end) * i.quantidade
             * (case when g.pizza then coalesce(fp.fator, i.fator) else 1 end)
      from itens i
      join public.pedido_item_opcoes o on o.item_id = i.id and o.opcao_id is not null
      join public.fichas_tecnicas f on f.opcao_id = o.opcao_id
      left join public.grupos_opcoes g on g.id = o.grupo_id
      left join lateral (
        select p.fator_sabor as fator
          from public.pedido_item_opcoes x
          join public.produtos p on p.loja_id = i.loja_id and p.nome = x.nome and not p.combo
         where x.item_id = o.item_id and x.grupo_id is null and x.opcao_id is null and x.ordem < o.ordem
         order by x.ordem desc
         limit 1) fp on true
    union all
    -- combo: o produto escolhido em cada passo baixa pela ficha dele
    select f.insumo_id, f.quantidade * o.quantidade * i.quantidade
      from itens i
      join public.pedido_item_opcoes o on o.item_id = i.id and o.grupo_id is null and o.opcao_id is null
      join lateral (select p.id from public.produtos p where p.loja_id = i.loja_id and p.nome = o.nome and not p.combo limit 1) p on true
      join public.fichas_tecnicas f on f.produto_id = p.id
  )
  select insumo_id, round(sum(q), 3) from c group by insumo_id having sum(q) > 0;
$$;

-- Fatores de tamanho das pizzas da loja: {produto_id: fator}.
create or replace function public.salvar_fatores_sabor(p_loja uuid, p_fatores jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.pode_estoque(p_loja) then
    raise exception 'Você não tem acesso ao estoque.' using errcode = 'insufficient_privilege';
  end if;
  if exists (select 1 from jsonb_each_text(coalesce(p_fatores, '{}'::jsonb)) e
              where e.value::numeric <= 0 or e.value::numeric > 10) then
    raise exception 'O tamanho deve ficar entre 1%% e 1000%%.' using errcode = 'check_violation';
  end if;
  update public.produtos p set fator_sabor = round((e.value)::numeric, 3), atualizado_em = now()
    from jsonb_each_text(coalesce(p_fatores, '{}'::jsonb)) e
   where p.id = e.key::uuid and p.loja_id = p_loja;
end;
$$;
grant execute on function public.salvar_fatores_sabor(uuid, jsonb) to authenticated;
revoke execute on function public.salvar_fatores_sabor(uuid, jsonb) from anon, public;
