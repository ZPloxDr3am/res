import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { AgendamentoPublico, CardapioPublico, VitrinePublica } from '@/lib/publico';
import { CardapioCliente } from '@/components/publico/cardapio-cliente';
import type { FaixaKm } from '@/app/c/[slug]/actions';
import { Rastreamento } from '@/components/publico/rastreamento';
import type { ConfigRastreio } from '@/lib/rastreio';
import Link from 'next/link';

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
  const [{ data }, rastreio, vit, fx, pz] = await Promise.all([
    supabase.rpc('horarios_agendamento', { p_slug: slug }),
    supabase.rpc('rastreamento_publico', { p_slug: slug }),
    supabase.rpc('vitrine_publica', { p_slug: slug }),
    supabase.rpc('faixas_km_publica', { p_slug: slug }),
    supabase.rpc('pausa_publica', { p_slug: slug }),
  ]);
  // pausa temporária com recado (D-059)
  const pausa = (pz.data as { ate: string; recado: string | null } | null) ?? null;
  // cardápio de evento (D-055): faixa com a validade; fora do período, só o aviso
  const { data: evData } = await supabase.rpc('evento_publico', { p_slug: slug });
  const ev = evData as { nome: string; inicio: string | null; fim: string | null; agora: string; base: string | null; prevenda?: boolean; entrega?: string | null; texto?: string | null } | null;
  const prevenda = ev?.prevenda && ev.entrega && Date.parse(ev.entrega) > Date.parse(ev.agora) ? { entrega: ev.entrega, texto: ev.texto ?? null } : null;
  const fmt = (d: string) => new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
  if (ev) {
    const agora = Date.parse(ev.agora);
    const antes = ev.inicio && agora < Date.parse(ev.inicio);
    const depois = ev.fim && agora > Date.parse(ev.fim);
    if (antes || depois) {
      return (
        <main className="pub-lista grade ev-fora" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2.5rem', margin: 0 }} aria-hidden>🎉</p>
          <h1 style={{ margin: 0 }}>{ev.nome}</h1>
          <p>{antes ? `Este cardápio especial abre em ${fmt(ev.inicio!)}.` : 'Este evento já terminou. Obrigado a todos que participaram!'}</p>
          {ev.base && <Link href={`/c/${ev.base}`} className="botao botao-primario" style={{ justifySelf: 'center' }}>Ver o cardápio de sempre</Link>}
        </main>
      );
    }
  }
  const agendamento = (data as AgendamentoPublico | null) ?? { dias: 0, horarios: [] };
  const vitrine = (vit.data as VitrinePublica | null) ?? null;
  return (
    <>
      {ev && (
        <div className="ev-faixa" role="note">
          🎉 <b>{ev.nome}</b> · {prevenda ? `pré-venda para ${fmt(prevenda.entrega)}` : 'cardápio especial'}{ev.fim ? ` · ${prevenda ? 'vendas' : 'válido'} até ${fmt(ev.fim)}` : ''}
          {ev.base && <> · <Link href={`/c/${ev.base}`}>ver cardápio completo</Link></>}
        </div>
      )}
      <CardapioCliente cardapio={cardapio} agendamento={agendamento} vitrine={vitrine} faixasKm={((fx.data as { faixas?: FaixaKm[] } | null)?.faixas ?? [])} prevenda={prevenda} pausa={pausa} />
      <Rastreamento config={(rastreio.data as ConfigRastreio | null) ?? {}} />
    </>
  );
}
