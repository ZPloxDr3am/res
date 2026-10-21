import { contextoLoja } from '@/lib/loja';
import { carregarCardapio } from '@/lib/cardapio';
import { TempoReal } from '@/components/tempo-real';
import { EditorCardapio } from '@/components/cardapio/editor-cardapio';

export const dynamic = 'force-dynamic';

export default async function Cardapio() {
  const ctx = await contextoLoja();
  const cardapio = await carregarCardapio(ctx.lojaId);
  // outras lojas do mesmo grupo (conta), de onde dá para importar
  const conta = ctx.lojas.find((l) => l.id === ctx.lojaId)?.contaId;
  const outrasLojas = conta ? ctx.lojas.filter((l) => l.id !== ctx.lojaId && l.contaId === conta).map((l) => ({ id: l.id, nome: l.nome })) : [];
  return (
    <>
      <TempoReal lojaId={ctx.lojaId} />
      <EditorCardapio cardapio={cardapio} marcas={ctx.marcas} lojaId={ctx.lojaId} outrasLojas={outrasLojas} />
    </>
  );
}
