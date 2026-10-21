import { contextoLoja } from '@/lib/loja';
import { carregarCardapio } from '@/lib/cardapio';
import { NovoPedido } from '@/components/novo-pedido';
import { criarClienteServidor } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function PaginaNovoPedido() {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const [{ setores, produtos, grupos }, areasRes] = await Promise.all([
    carregarCardapio(ctx.lojaId),
    supabase.from('areas_entrega').select('marca_id, bairro, taxa').eq('loja_id', ctx.lojaId).eq('ativo', true).order('bairro'),
  ]);
  const areas: Record<string, { bairro: string; taxa: number }[]> = {};
  for (const a of areasRes.data ?? []) (areas[a.marca_id as string] ??= []).push({ bairro: a.bairro as string, taxa: Math.round(Number(a.taxa) * 100) });
  return <NovoPedido marcas={ctx.marcas} areas={areas} setores={setores} produtos={produtos} grupos={grupos} />;
}
