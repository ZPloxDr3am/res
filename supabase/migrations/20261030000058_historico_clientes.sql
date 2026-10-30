-- 0058: histórico do cliente no quadro de pedidos (D-057). Pode rodar de novo.
-- Para o selo do cartão ("1º pedido", "5º pedido · 💎 Fiel", "voltou depois de 45 dias"): as datas dos
-- pedidos não cancelados de cada telefone, em todas as lojas do grupo que a pessoa acessa.

create index if not exists pedidos_loja_telefone_idx on public.pedidos (loja_id, cliente_telefone, criado_em desc) where cliente_telefone is not null;

create or replace function public.historico_clientes(p_lojas uuid[], p_telefones text[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with lojas as (
    -- as lojas pedidas e as outras da mesma conta, desde que a pessoa seja da equipe
    select distinct l2.id
      from public.lojas l
      join public.lojas l2 on l2.id = l.id or (l.conta_id is not null and l2.conta_id = l.conta_id)
     where l.id = any (p_lojas) and private.e_membro(l.id) and private.e_membro(l2.id)
  ), datas as (
    select p.cliente_telefone as tel, p.criado_em,
           row_number() over (partition by p.cliente_telefone order by p.criado_em desc) as n
      from public.pedidos p
     where p.loja_id in (select id from lojas)
       and p.cliente_telefone = any (p_telefones[1:200])
       and p.status <> 'cancelado'
  )
  select coalesce(jsonb_object_agg(tel, ds), '{}'::jsonb)
    from (select tel, jsonb_agg(criado_em order by criado_em desc) as ds from datas where n <= 60 group by tel) x;
$$;
revoke execute on function public.historico_clientes(uuid[], text[]) from anon, public;
grant execute on function public.historico_clientes(uuid[], text[]) to authenticated;
