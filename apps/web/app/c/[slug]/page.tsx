import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { AgendamentoPublico, CardapioPublico } from '@/lib/publico';
import { CardapioCliente } from '@/components/publico/cardapio-cliente';

export const dynamic = 'force-dynamic';

async function carregar(slug: string): Promise<CardapioPublico | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('cardapio_publico', { p_slug: slug });
  if (error) throw new Error(error.message);
  return (data as CardapioPublico | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await carregar(slug);
  return { title: c ? `${c.marca.nome} · Cardápio` : 'Cardápio' };
}

export default async function PaginaCardapio({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cardapio = await carregar(slug);
  if (!cardapio) notFound();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc('horarios_agendamento', { p_slug: slug });
  const agendamento = (data as AgendamentoPublico | null) ?? { dias: 0, horarios: [] };
  return <CardapioCliente cardapio={cardapio} agendamento={agendamento} />;
}
