import { contextoLoja } from '@/lib/loja';
import { carregarQuadro } from '@/lib/pedidos';
import { QuadroPedidos } from '@/components/quadro-pedidos';
import { TempoReal } from '@/components/tempo-real';

export const dynamic = 'force-dynamic';

export default async function Pedidos() {
  const ctx = await contextoLoja();
  const { pedidos, aceiteAutomatico, tempoPreparo } = await carregarQuadro(ctx.lojaId);
  return (
    <>
      <TempoReal lojaId={ctx.lojaId} tabelas={['pedidos']} />
      <QuadroPedidos pedidos={pedidos} aceiteAutomatico={aceiteAutomatico} tempoPreparo={tempoPreparo} marcas={ctx.marcas} />
    </>
  );
}
