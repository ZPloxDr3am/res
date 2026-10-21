import { notFound } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { Acompanhamento } from '@/lib/publico';
import { AcompanharPedido } from '@/components/publico/acompanhar-pedido';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Seu pedido', robots: { index: false } };

export default async function PaginaAcompanhar({ params }: { params: Promise<{ slug: string; codigo: string }> }) {
  const { codigo } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(codigo)) notFound();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('acompanhar_pedido', { p_codigo: codigo });
  if (error || !data) notFound();
  return <AcompanharPedido pedido={data as Acompanhamento} />;
}
