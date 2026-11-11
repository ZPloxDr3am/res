import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PAGAMENTO_ROTULO, paraCentavos, situacaoDiferenca } from '@res/core';
import { criarClienteServidor } from '@/lib/supabase/server';
import { dataHora, r$, type ResumoCaixa } from '@/lib/caixa';
import { BotaoImprimir } from '@/components/caixa/botao-imprimir';

export const dynamic = 'force-dynamic';

/** Relatório de uma sessão de caixa (aberta: parcial; fechada: com sobra/falta). Pronto para imprimir. */
export default async function RelatorioCaixa({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ fechado?: string }> }) {
  const { id } = await params;
  const { fechado } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc('resumo_caixa', { p_sessao: id });
  const r = data as ResumoCaixa | null;
  if (!r) notFound();
  const difTotal = (r.diferencas ?? []).reduce((s, d) => s + paraCentavos(Number(d.diferenca)), 0);
  const sit = situacaoDiferenca(difTotal);

  return (
    <div className="grade relatorio-caixa">
      <div className="linha nao-imprimir" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/caixa">← Caixa</Link>
        <BotaoImprimir />
      </div>
      {fechado && (
        <p className={`aviso nao-imprimir ${sit}`} role="status">
          Caixa fechado. {sit === 'confere' ? 'Tudo conferiu.' : sit === 'sobra' ? `Sobrou ${r$(difTotal / 100)} no total.` : `Faltou ${r$(-difTotal / 100)} no total.`}
        </p>
      )}
      <section className="cartao grade" style={{ gap: '0.6rem' }}>
        <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h1 style={{ margin: 0 }}>{r.caixa} · fechamento #{r.numero}</h1>
          <span className={`pub-status ${r.status === 'aberto' ? 'aberto' : 'fechado'}`}>{r.status === 'aberto' ? 'Ainda aberto (parcial)' : 'Fechado'}</span>
        </div>
        <div className="linha" style={{ gap: '0.3rem 2rem' }}>
          <span><span className="dica">Abertura: </span>{dataHora(r.aberto_em)} · {r.aberto_por ?? '—'}</span>
          <span><span className="dica">Fechamento: </span>{dataHora(r.fechado_em)}{r.fechado_por ? ` · ${r.fechado_por}` : ''}</span>
          <span><span className="dica">Troco inicial: </span>{r$(r.abertura)}</span>
          <span><span className="dica">Pedidos no caixa: </span>{r.pedidos}</span>
        </div>

        {r.ve_valores && (
          <>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>Vendas por forma de pagamento</h2>
            <table className="tabela">
              <thead><tr><th>Forma</th><th className="num">Pedidos</th><th className="num">Vendido</th></tr></thead>
              <tbody>
                {r.formas.filter((f) => f.quantidade > 0).map((f) => (
                  <tr key={f.forma}><td>{PAGAMENTO_ROTULO[f.forma]}{f.forma === 'online' ? ' (pago online, fora da gaveta)' : ''}</td><td className="num">{f.quantidade}</td><td className="num">{r$(f.vendas)}</td></tr>
                ))}
                {r.formas.every((f) => f.quantidade === 0) && <tr><td colSpan={3} className="dica">Nenhuma venda neste caixa.</td></tr>}
              </tbody>
            </table>
            <p className="kpi-frase">
              Dinheiro que deveria estar na gaveta = troco inicial {r$(r.abertura)} + vendas em dinheiro + suprimentos {r$(r.suprimentos)} − sangrias {r$(r.sangrias)}.
            </p>
          </>
        )}

        {r.diferencas && (
          <>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>Conferência</h2>
            <table className="tabela">
              <thead><tr><th>Forma</th><th className="num">Deveria ter</th><th className="num">Contado / informado</th><th className="num">Diferença</th></tr></thead>
              <tbody>
                {r.diferencas.map((d) => {
                  const c = paraCentavos(Number(d.diferenca));
                  return (
                    <tr key={d.forma}>
                      <td>{PAGAMENTO_ROTULO[d.forma] ?? d.forma}</td>
                      <td className="num">{r$(d.esperado)}</td>
                      <td className="num">{r$(d.informado)}</td>
                      <td className="num"><span className={`var ${c === 0 ? 'neutra' : c > 0 ? 'boa' : 'ruim'}`}>{c === 0 ? '✓ conferiu' : `${c > 0 ? 'sobrou' : 'faltou'} ${r$(Math.abs(c) / 100)}`}</span></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr><td>Resultado</td><td></td><td></td><td className="num">{sit === 'confere' ? '✓ conferiu' : `${sit === 'sobra' ? 'sobrou' : 'faltou'} ${r$(Math.abs(difTotal) / 100)}`}</td></tr>
              </tfoot>
            </table>
          </>
        )}

        {r.movimentos.length > 0 && (
          <>
            <h2 style={{ margin: 0, fontSize: '1rem' }}>Sangrias e suprimentos</h2>
            <table className="tabela">
              <thead><tr><th>Quando</th><th>Tipo</th><th>Motivo</th><th>Quem</th><th className="num">Valor</th></tr></thead>
              <tbody>
                {r.movimentos.map((m, i) => (
                  <tr key={i}><td>{dataHora(m.em)}</td><td>{m.tipo === 'sangria' ? 'Sangria' : 'Suprimento'}</td><td>{m.descricao ?? '—'}</td><td>{m.por ?? '—'}</td><td className="num">{r$(m.valor)}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {r.observacao && <p><span className="dica">Observação: </span>{r.observacao}</p>}
        <div className="assinaturas">
          <span>Operador(a)</span>
          <span>Conferido por</span>
        </div>
      </section>
    </div>
  );
}
