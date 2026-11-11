import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Grupo = { nome: string; cardapios: { nome: string; slug: string; loja: string; cidade: string | null; aberta: boolean }[] };

async function carregar(link: string): Promise<Grupo | null> {
  if (!/^[a-z0-9-]{3,40}$/i.test(link)) return null;
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc('grupo_publico', { p_link: link });
  return (data as Grupo | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ link: string }> }): Promise<Metadata> {
  const g = await carregar((await params).link);
  return { title: g ? `${g.nome} · Cardápios` : 'Cardápios' };
}

/** Link único do grupo (D-042): todos os cardápios das lojas num lugar só. */
export default async function PaginaGrupo({ params }: { params: Promise<{ link: string }> }) {
  const g = await carregar((await params).link);
  if (!g) notFound();
  return (
    <div className="pub">
      <header className="pub-topo">
        <h1>{g.nome}</h1>
        <p className="dica" style={{ margin: 0 }}>Escolha onde quer pedir</p>
      </header>
      <main className="pub-lista grade">
        {g.cardapios.length === 0 && <p className="dica">Nenhum cardápio disponível agora.</p>}
        {g.cardapios.map((c) => (
          <Link key={c.slug} href={`/c/${c.slug}`} className="cartao pub-grupo-item">
            <span className="grade" style={{ gap: '0.1rem' }}>
              <strong>{c.nome}</strong>
              <span className="dica">{[c.loja !== c.nome ? c.loja : null, c.cidade].filter(Boolean).join(' · ')}</span>
            </span>
            <span className={c.aberta ? 'pub-grupo-aberta' : 'dica'}>{c.aberta ? 'Aberto' : 'Fechado'}</span>
          </Link>
        ))}
      </main>
    </div>
  );
}
