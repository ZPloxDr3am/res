import { NavPainel } from '@/components/nav-painel';
import { SeletorLoja } from '@/components/seletor-loja';
import { redirect } from 'next/navigation';
import { contextoLoja } from '@/lib/loja';
import { PedidoFlutuanteProvider } from '@/components/pedido-flutuante';
import { criarClienteServidor } from '@/lib/supabase/server';

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await contextoLoja();
  // motoboy usa o app do celular, não o painel
  if (ctx.papel === 'entregador' && ctx.lojas.length >= 1) redirect('/m');
  // loja nova do cadastro (D-076): mostra "Primeiros passos" no menu até o dono concluir
  let primeirosPassos = false;
  if (ctx.papel === 'dono' || ctx.papel === 'gerente') {
    const { data } = await (await criarClienteServidor()).from('lojas').select('primeiros_passos_ocultos').eq('id', ctx.lojaId).maybeSingle();
    primeirosPassos = (data as { primeiros_passos_ocultos?: boolean } | null)?.primeiros_passos_ocultos === false;
  }
  return (
    <PedidoFlutuanteProvider lojaId={ctx.lojaId}>
    <div className="painel">
      <aside className="menu" aria-label="Menu principal">
        <div className="menu-topo">
          <span className="marca-res">RES</span>
          {ctx.lojas.length > 1 ? (
            <SeletorLoja lojas={ctx.lojas} atual={ctx.lojaId} />
          ) : (
            <span className="menu-loja" title={ctx.lojaNome}>{ctx.lojaNome}</span>
          )}
          {ctx.marcas.length > 1 && <span className="dica menu-marcas">{ctx.marcas.map((m) => m.nome).join(' · ')}</span>}
        </div>
        <nav>
          <NavPainel lojas={ctx.lojas.map((l) => ({ id: l.id, nome: l.nome }))} lojaAtual={ctx.lojaId} lojaNome={ctx.lojaNome} primeirosPassos={primeirosPassos} />
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
    </PedidoFlutuanteProvider>
  );
}
