import { contextoLoja } from '@/lib/loja';
import { carregarQuadro } from '@/lib/pedidos';
import { criarClienteServidor } from '@/lib/supabase/server';
import { QuadroPedidos } from '@/components/quadro-pedidos';
import { TempoReal } from '@/components/tempo-real';

export const dynamic = 'force-dynamic';

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ todas?: string }> }) {
  const ctx = await contextoLoja();
  const todas = ctx.lojas.length > 1 && (await searchParams).todas === '1';
  const ids = todas ? ctx.lojas.map((l) => l.id) : [ctx.lojaId];
  const { pedidos, aceiteAutomatico, tempoPreparo, fuso, filaImpressao, prazoEntrega } = await carregarQuadro(ids, ctx.lojaId);
  // histórico de cada cliente no grupo, para o selo do cartão (D-057)
  const telefones = [...new Set(pedidos.map((p) => p.cliente_telefone).filter((t): t is string => !!t))];
  const supabase = await criarClienteServidor();
  const { data: hist } = telefones.length ? await supabase.rpc('historico_clientes', { p_lojas: ids, p_telefones: telefones }) : { data: {} };
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
        historico={(hist as Record<string, string[]> | null) ?? {}}
      />
    </>
  );
}
