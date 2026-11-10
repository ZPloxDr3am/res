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
  const [{ data: equipe }, { count }] = await Promise.all([
    supabase.rpc('sou_equipe_res'),
    supabase.from('membros').select('loja_id', { count: 'exact', head: true }).eq('user_id', user.id).eq('ativo', true),
  ]);
  if (equipe !== true) redirect('/pedidos');
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
          {(count ?? 0) > 0 && (
            <a className="menu-item" href="/pedidos">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
              <span>Painel do restaurante</span>
            </a>
          )}
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
