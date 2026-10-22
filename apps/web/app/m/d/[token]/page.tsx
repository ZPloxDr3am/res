import { Despacho } from '@/components/motoboy/despacho';

export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false } };

/** Link do QR da comanda: lido pela câmera do celular, despacha o pedido com o motoboy logado. */
export default async function PaginaDespacho({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <Despacho token={token} />;
}
