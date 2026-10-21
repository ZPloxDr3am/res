import { NavPainel } from '@/components/nav-painel';
import { contextoLoja } from '@/lib/loja';

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await contextoLoja();
  return (
    <div className="painel">
      <aside className="menu" aria-label="Menu principal">
        <div className="menu-topo">
          <span className="marca-res">RES</span>
          <span className="menu-loja" title={ctx.lojaNome}>{ctx.lojaNome}</span>
          {ctx.marcas.length > 1 && <span className="dica menu-marcas">{ctx.marcas.map((m) => m.nome).join(' · ')}</span>}
        </div>
        <nav>
          <NavPainel />
        </nav>
        <form action="/auth/sair" method="post" className="menu-rodape">
          <button className="menu-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
            </svg>
            <span>Sair</span>
          </button>
        </form>
      </aside>
      <main className="conteudo">{children}</main>
    </div>
  );
}
