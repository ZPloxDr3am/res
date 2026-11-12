import type { Metadata } from 'next';
import Link from 'next/link';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { CardapioPublico, VitrinePublica } from '@/lib/publico';
import { CardapioCliente } from '@/components/publico/cardapio-cliente';
import { ContaDaMesa, type MesaPublica } from '@/components/publico/conta-mesa';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Pedir na mesa' };

/** QR na mesa (D-099): o cliente vê o cardápio, pede para a mesa e acompanha a conta. */
export default async function PaginaMesa({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ m?: string }> }) {
  const { token } = await params;
  const { m } = await searchParams;
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc('salao_mesa_publica', { p_token: token });
  const mesa = data as MesaPublica | null;
  if (!mesa || !mesa.marcas?.length) {
    return (
      <main className="pub-lista grade" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <p style={{ fontSize: '2.5rem', margin: 0 }} aria-hidden>🍽️</p>
        <h1 style={{ margin: 0 }}>QR code não encontrado</h1>
        <p>Este código não está ativo. Chame o garçom, por favor.</p>
      </main>
    );
  }
  const slug = mesa.marcas.find((x) => x.slug === m)?.slug ?? mesa.marcas[0]!.slug;
  const [cp, vit] = await Promise.all([
    supabase.rpc('cardapio_publico', { p_slug: slug }),
    supabase.rpc('vitrine_publica', { p_slug: slug }),
  ]);
  const cardapio = cp.data as CardapioPublico | null;
  if (!cardapio) return <main className="pub-lista"><p>Cardápio indisponível. Chame o garçom.</p></main>;
  return (
    <>
      <ContaDaMesa token={token} mesa={mesa} />
      {mesa.marcas.length > 1 && (
        <nav className="ev-faixa" aria-label="Cardápios">
          {mesa.marcas.map((x) => (x.slug === slug ? <b key={x.slug}>{x.nome}</b> : <Link key={x.slug} href={`/mesa/${token}?m=${x.slug}`}>{x.nome}</Link>)).flatMap((el, i) => (i ? [' · ', el] : [el]))}
        </nav>
      )}
      <CardapioCliente cardapio={cardapio} agendamento={{ dias: 0, horarios: [] }} vitrine={(vit.data as VitrinePublica | null) ?? null} mesa={{ token, rotulo: mesa.rotulo }} />
    </>
  );
}
