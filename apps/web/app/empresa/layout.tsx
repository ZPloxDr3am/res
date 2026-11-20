import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { criarClienteServidor } from '@/lib/supabase/server';
import { NavEmpresa, RodapeEmpresa } from '@/components/empresa/nav';

// D-127: mesma marca do painel do restaurante (D-120): título da aba, favicon e logotipo oficiais.
export const metadata: Metadata = {
  title: { default: 'SINO Empresa', template: '%s · SINO Empresa' },
  icons: { icon: [{ url: '/marca/favicon.ico', sizes: '16x16 32x32 48x48' }, { url: '/marca/favicon.svg', type: 'image/svg+xml' }], apple: '/marca/apple-touch-icon.png' },
};
export const dynamic = 'force-dynamic';

/** Painel da empresa SINO (D-083, visual D-127): separado do painel do restaurante, só para a equipe SINO. */
export default async function LayoutEmpresa({ children }: { children: React.ReactNode }) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: equipe } = await supabase.rpc('sou_equipe_res');
  if (equipe !== true) {
    return (
      <main className="s-tela emp-sem-acesso">
        <div className="s-cartao emp-sem-acesso-cartao">
          <picture>
            <source srcSet="/marca/sino-logotipo-horizontal-negativo.svg" media="(prefers-color-scheme: dark)" />
            <img src="/marca/sino-logotipo-horizontal-cor.svg" alt="SINO" width={128} height={42} />
          </picture>
          <p className="s-sobretitulo">Painel da empresa</p>
          <h1 className="s-titulo">Acesso só da equipe SINO</h1>
          <p className="s-subtitulo">Este login não faz parte da equipe. Entre com a conta da equipe ou peça para alguém da equipe incluir você em Configurações.</p>
          <form action="/auth/sair" method="post"><button className="botao botao-primario" style={{ width: '100%' }}>Sair e entrar com outra conta</button></form>
        </div>
      </main>
    );
  }
  const versao = process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) : null;
  return (
    <div className="painel painel-empresa">
      <aside className="menu s-menu" aria-label="Menu da empresa">
        <div className="menu-topo">
          {/* logotipo oficial SINO (arquivo da marca, nunca redesenhado); no tablet, o símbolo de 32 px */}
          <div className="s-logo">
            <img className="s-logo-principal" src="/marca/sino-logotipo-horizontal-negativo.svg" alt="SINO" width={128} height={42} />
            <img className="s-logo-simbolo" src="/marca/sino-simbolo-32px-negativo.svg" alt="" width={32} height={32} />
          </div>
          <span className="empresa-selo">Empresa</span>
        </div>
        <nav>
          <NavEmpresa />
        </nav>
        <RodapeEmpresa versao={versao} />
      </aside>
      <main className="conteudo">{children}</main>
    </div>
  );
}
