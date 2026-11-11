import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { criarClienteServidor } from '@/lib/supabase/server';
import { NavEmpresa } from '@/components/empresa/nav';

export const metadata: Metadata = { title: { default: 'RES Empresa', template: '%s · RES Empresa' } };
export const dynamic = 'force-dynamic';

/** Painel da empresa RES (D-083): separado do painel do restaurante, só para a equipe RES. */
export default async function LayoutEmpresa({ children }: { children: React.ReactNode }) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: equipe } = await supabase.rpc('sou_equipe_res');
  if (equipe !== true) {
    return (
      <main className="conteudo" style={{ maxWidth: 460, marginTop: '10vh' }}>
        <div className="cartao grade">
          <span className="marca-res">RES</span>
          <h1 style={{ margin: 0 }}>Acesso só da equipe RES</h1>
          <p style={{ margin: 0 }}>Este login não faz parte da equipe. Entre com a conta da equipe ou peça para alguém da equipe incluir você em Configurações.</p>
          <form action="/auth/sair" method="post"><button className="botao" style={{ width: '100%' }}>Sair e entrar com outra conta</button></form>
        </div>
      </main>
    );
  }
  return (
    <div className="painel painel-empresa">
      <aside className="menu">
        <div className="menu-topo">
          <span className="marca-res">RES</span>
          <span className="empresa-selo">Empresa</span>
        </div>
        <nav>
          <NavEmpresa />
        </nav>
        <div className="menu-rodape">
          <form action="/auth/sair" method="post">
            <button className="menu-item">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>
              <span>Sair</span>
            </button>
          </form>
        </div>
      </aside>
      <main className="conteudo">{children}</main>
    </div>
  );
}
