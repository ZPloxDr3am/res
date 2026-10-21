import { contextoLoja } from '@/lib/loja';
import { carregarCardapio } from '@/lib/cardapio';
import { Organizador } from '@/components/cardapio/organizador';

export const dynamic = 'force-dynamic';

export default async function OrganizarCardapio() {
  const ctx = await contextoLoja();
  const cardapio = await carregarCardapio(ctx.lojaId);
  return <Organizador cardapio={cardapio} marcas={ctx.marcas} />;
}
