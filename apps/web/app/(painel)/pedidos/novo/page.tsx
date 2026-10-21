import { contextoLoja } from '@/lib/loja';
import { carregarDadosNovoPedido } from '@/lib/novo-pedido';
import { NovoPedido } from '@/components/novo-pedido';

export const dynamic = 'force-dynamic';

/** Página inteira (link direto). No dia a dia o novo pedido abre na janela flutuante sobre o quadro. */
export default async function PaginaNovoPedido() {
  const ctx = await contextoLoja();
  const d = await carregarDadosNovoPedido(ctx.lojaId, ctx.marcas);
  return <NovoPedido {...d} />;
}
