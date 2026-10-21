import { contextoLoja } from '@/lib/loja';
import { carregarCardapio } from '@/lib/cardapio';
import { NovoPedido } from '@/components/novo-pedido';

export const dynamic = 'force-dynamic';

export default async function PaginaNovoPedido() {
  const ctx = await contextoLoja();
  const { setores, produtos, grupos } = await carregarCardapio(ctx.lojaId);
  return <NovoPedido marcas={ctx.marcas} setores={setores} produtos={produtos} grupos={grupos} />;
}
