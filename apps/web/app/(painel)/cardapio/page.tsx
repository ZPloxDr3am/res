import { contextoLoja } from '@/lib/loja';
import { carregarCardapio } from '@/lib/cardapio';
import { TempoReal } from '@/components/tempo-real';
import { EditorCardapio } from '@/components/cardapio/editor-cardapio';

export const dynamic = 'force-dynamic';

export default async function Cardapio() {
  const ctx = await contextoLoja();
  const cardapio = await carregarCardapio(ctx.lojaId);
  return (
    <>
      <TempoReal lojaId={ctx.lojaId} />
      <EditorCardapio cardapio={cardapio} marcas={ctx.marcas} lojaId={ctx.lojaId} />
    </>
  );
}
