import Link from 'next/link';
import { contextoLoja } from '@/lib/loja';

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await contextoLoja();
  return (
    <>
      <header className="topo">
        <div className="linha" style={{ alignItems: 'center' }}>
          <span className="marca-res">RES</span>
          <span>{ctx.lojaNome}</span>
          <span className="dica">{ctx.marcas.map((m) => m.nome).join(' · ')}</span>
        </div>
        <nav className="linha" style={{ alignItems: 'center' }}>
          <Link href="/cardapio">Cardápio</Link>
          <form action="/auth/sair" method="post">
            <button>Sair</button>
          </form>
        </nav>
      </header>
      <main className="conteudo">{children}</main>
    </>
  );
}
