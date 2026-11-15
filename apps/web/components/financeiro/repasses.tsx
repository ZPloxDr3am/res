import Link from 'next/link';
import { formatarReais } from '@res/core';

type MesRepasse = { mes: string; pedidos: number; vendas: number; online: number; subsidio: number; comissao: number | null; taxa: number | null; repasse: number | null; recebido: number };
export type DadosRepasses = {
  ate: string | null;
  canais: { canal: string; nome: string; taxas: { comissao_pct: number; ciclo: string; dias_repasse: number } | null; meses: MesRepasse[] }[];
};

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const nomeMes = (ym: string) => `${MESES[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}`;
const r = (centavos: number | null) => (centavos == null ? '—' : formatarReais(Number(centavos) / 100));
const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/**
 * 🛵 Repasses dos apps (D-118): por app e mês, o que o app recebeu do cliente, o subsídio do app nos cupons,
 * a comissão e as taxas (pelas suas taxas em Cadastros), o repasse esperado e o que caiu no extrato.
 */
export function RepassesApps({ dados }: { dados: DadosRepasses }) {
  return (
    <section className="cartao grade" style={{ gap: '0.6rem' }} aria-label="Repasses dos apps de delivery">
      <h2 style={{ margin: 0 }}>🛵 Repasses dos apps de delivery</h2>
      <p className="dica" style={{ margin: 0 }}>
        Repasse esperado = o que o cliente pagou no app + o que o app bancou dos cupons − comissão − taxa do pagamento online − fixo por pedido.
        Nos pedidos pagos na entrega, o dinheiro já ficou com você, e a comissão sai do repasse. “Caiu” = créditos do extrato com o nome do app
        {dados.ate ? <> (extrato importado até {dataBr(dados.ate)})</> : ' (importe o extrato acima)'}. O repasse do fim do mês costuma cair no mês seguinte.
      </p>
      {dados.canais.map((c) => {
        const meses = c.meses.filter((m) => m.pedidos > 0 || m.recebido > 0);
        return (
          <div key={c.canal} className="grade" style={{ gap: '0.3rem' }}>
            <strong>
              {c.nome}
              <span className="dica" style={{ fontWeight: 400 }}>
                {' '}· {c.taxas ? `comissão ${String(c.taxas.comissao_pct).replace('.', ',')}% · repasse ${c.taxas.ciclo}, ${c.taxas.dias_repasse} dias depois` : <>sem taxas cadastradas — <Link href="/financeiro?aba=cadastros">cadastrar</Link></>}
              </span>
            </strong>
            {meses.length === 0 ? (
              <span className="dica">Sem pedidos concluídos nem créditos no período.</span>
            ) : (
              <div className="tabela-rolagem">
                <table className="tabela">
                  <thead>
                    <tr><th>Mês</th><th className="num">Pedidos</th><th className="num">Vendido</th><th className="num">Pago no app</th><th className="num">Subsídio do app</th><th className="num">Comissão</th><th className="num">Taxas</th><th className="num">Repasse esperado</th><th className="num">Caiu</th></tr>
                  </thead>
                  <tbody>
                    {meses.map((m) => (
                      <tr key={m.mes}>
                        <td>{nomeMes(m.mes)}</td>
                        <td className="num">{m.pedidos}</td>
                        <td className="num">{r(m.vendas)}</td>
                        <td className="num">{r(m.online)}</td>
                        <td className="num">{r(m.subsidio)}</td>
                        <td className="num">{r(m.comissao)}</td>
                        <td className="num">{r(m.taxa)}</td>
                        <td className="num" style={{ fontWeight: 700 }}>{r(m.repasse)}</td>
                        <td className="num">{r(m.recebido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
