import { NavPainel } from '@/components/nav-painel';
import { SeletorLoja } from '@/components/seletor-loja';
import { redirect } from 'next/navigation';
import { contextoLoja } from '@/lib/loja';
import { PedidoFlutuanteProvider } from '@/components/pedido-flutuante';
import { criarClienteServidor } from '@/lib/supabase/server';
import { MenuRodape } from '@/components/menu-rodape';

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await contextoLoja();
  // motoboy usa o app do celular, não o painel
  if (ctx.papel === 'entregador' && ctx.lojas.length >= 1) redirect('/m');
  const supa = await criarClienteServidor();
  // D-082: situação da conta (teste com prazo, vencida)
  const { data: sitConta } = await supa.rpc('situacao_conta', { p_loja: ctx.lojaId });
  const situacao = sitConta as { situacao: string; teste_ate: string | null; pago_ate: string | null; liberada: boolean } | null;
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
        <MenuRodape
          marcas={ctx.marcas.filter((m) => !m.evento).map((m) => ({ nome: m.nome, slug: m.slug }))}
          lojaNome={ctx.lojaNome}
          versao={process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) : null}
        />
      </aside>
      <main className="conteudo">
        {situacao && <FaixaConta s={situacao} />}
        {children}
      </main>
    </div>
    </PedidoFlutuanteProvider>
  );
}

/** Faixa da assinatura (D-082): dias de teste no fim do prazo, ou conta pausada. */
function FaixaConta({ s }: { s: { situacao: string; teste_ate: string | null; pago_ate: string | null; liberada: boolean } }) {
  const dias = (iso: string | null) => (iso ? Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000) : null);
  if (!s.liberada) {
    return (
      <div className="faixa-conta" data-tipo="pausada" role="alert">
        <strong>Novos pedidos pausados.</strong> {s.situacao === 'teste' ? 'O teste grátis terminou.' : s.situacao === 'suspensa' ? 'A conta está suspensa.' : 'A assinatura venceu.'} Seus dados continuam aqui. Fale com o time do RES (Suporte, no menu) para reativar.
      </div>
    );
  }
  const d = s.situacao === 'teste' ? dias(s.teste_ate) : dias(s.pago_ate);
  if (d == null || (s.situacao !== 'teste' && d > 5)) return null;
  return (
    <div className="faixa-conta" data-tipo={d <= 3 ? 'fim' : 'teste'} role="status">
      {s.situacao === 'teste'
        ? <><strong>Teste grátis: {d <= 0 ? 'último dia' : `${d} dia${d === 1 ? '' : 's'} restante${d === 1 ? '' : 's'}`}.</strong> Para continuar depois do teste, fale com o time do RES (Suporte, no menu).</>
        : <><strong>A assinatura vence em {d <= 0 ? 'hoje' : `${d} dia${d === 1 ? '' : 's'}`}.</strong> Fale com o time do RES para renovar e não pausar os pedidos.</>}
    </div>
  );
}
