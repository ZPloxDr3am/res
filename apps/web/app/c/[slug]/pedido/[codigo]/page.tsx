import { notFound } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { Acompanhamento } from '@/lib/publico';
import type { ConfigRastreio } from '@/lib/rastreio';
import { AcompanharPedido, type ExtrasPedido } from '@/components/publico/acompanhar-pedido';
import { Rastreamento } from '@/components/publico/rastreamento';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Seu pedido', robots: { index: false } };

export default async function PaginaAcompanhar({ params }: { params: Promise<{ slug: string; codigo: string }> }) {
  const { codigo } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(codigo)) notFound();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('acompanhar_pedido', { p_codigo: codigo });
  if (error || !data) notFound();
  const p = data as Acompanhamento;
  const [extras, rastreio] = await Promise.all([
    supabase.rpc('extras_pedido_publico', { p_codigo: codigo }),
    supabase.rpc('rastreamento_publico', { p_slug: p.slug }),
  ]);
  return (
    <>
      <AcompanharPedido pedido={p} extras={(extras.data as ExtrasPedido | null) ?? { pix: null, avaliacao: null }} />
      <Rastreamento config={(rastreio.data as ConfigRastreio | null) ?? {}} compra={p.status === 'cancelado' ? undefined : { codigo, numero: p.numero, valor: p.total }} />
    </>
  );
}
