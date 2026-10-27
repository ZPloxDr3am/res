import { contextoLoja } from '@/lib/loja';
import { carregarQuadro } from '@/lib/pedidos';
import { QuadroPedidos } from '@/components/quadro-pedidos';
import { TempoReal } from '@/components/tempo-real';

export const dynamic = 'force-dynamic';

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ todas?: string }> }) {
  const ctx = await contextoLoja();
  const todas = ctx.lojas.length > 1 && (await searchParams).todas === '1';
  const ids = todas ? ctx.lojas.map((l) => l.id) : [ctx.lojaId];
  const { pedidos, aceiteAutomatico, tempoPreparo, fuso, filaImpressao, prazoEntrega } = await carregarQuadro(ids, ctx.lojaId);
  return (
    <>
      <TempoReal lojaId={ctx.lojaId} tabelas={['pedidos', 'impressoes']} reservaMs={20000} todasAsLojas={todas} />
      <QuadroPedidos
        pedidos={pedidos}
        aceiteAutomatico={aceiteAutomatico}
        tempoPreparo={tempoPreparo}
        fuso={fuso}
        filaImpressao={filaImpressao}
        prazoEntrega={prazoEntrega}
        marcas={ctx.marcas}
        lojas={ctx.lojas}
        lojaAtual={ctx.lojaNome}
        todas={todas}
      />
    </>
  );
}
