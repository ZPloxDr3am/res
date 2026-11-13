import { avaliarMaquininha, formatarReais, type MesMaquininha } from '@res/core';
import Link from 'next/link';

export type DadosMaquininha = { ate: string | null; meses: MesMaquininha[]; adquirentes: { descricao: string; valor: number; n: number }[] };

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const nomeMes = (ym: string) => `${MESES[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}`;
const pct = (v: number | null) => (v == null ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

/** 💳 Conferência da maquininha (D-109): o que devia cair (vendas − taxas combinadas) contra o que caiu no extrato. */
export function ConferenciaMaquininha({ dados }: { dados: DadosMaquininha }) {
  const meses = dados.meses.map((m) => ({ ...m, bruto: Number(m.bruto), esperado: Number(m.esperado), recebido: Number(m.recebido), vendas: Number(m.vendas) }));
  const comDados = meses.filter((m) => m.esperado > 0 || m.recebido > 0);
  const alertas = comDados.filter((m) => avaliarMaquininha(m).alerta);
  return (
    <section className="cartao grade" style={{ gap: '0.6rem' }} aria-label="Conferência da maquininha">
      <h2 style={{ margin: 0 }}>💳 Conferência da maquininha</h2>
      <p className="dica" style={{ margin: 0 }}>
        O que <b>devia cair</b> (vendas no cartão, vale e Pix da maquininha, menos as taxas que você cadastrou em <Link href="/financeiro?aba=cadastros">Cadastros e taxas</Link>, na data prevista) contra o que <b>caiu</b> no extrato vindo das maquininhas
        {dados.ate ? <> — comparado até {dataBr(dados.ate)}, o último dia do extrato importado</> : ''}.
      </p>
      {!dados.ate ? (
        <p className="dica" style={{ margin: 0 }}>Importe o extrato do banco acima para conferir.</p>
      ) : comDados.length === 0 ? (
        <p className="dica" style={{ margin: 0 }}>Sem vendas no cartão nem créditos de maquininha no período.</p>
      ) : (
        <>
          {alertas.length > 0 && (
            <p className="erro" style={{ margin: 0 }}>
              ⚠️ Caiu menos que o esperado em {alertas.map((m) => nomeMes(m.mes)).join(', ')}. Confira no portal da maquininha se a taxa cobrada é a combinada e se alguma venda não foi paga
              (ou se o crédito caiu em outra conta).
            </p>
          )}
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr><th>Mês</th><th className="num">Vendido</th><th className="num">Devia cair</th><th className="num">Caiu</th><th className="num">Diferença</th><th className="num">Taxa combinada</th><th className="num">Taxa real</th></tr>
              </thead>
              <tbody>
                {comDados.map((m) => {
                  const a = avaliarMaquininha(m);
                  return (
                    <tr key={m.mes}>
                      <td>{nomeMes(m.mes)}</td>
                      <td className="num">{formatarReais(m.bruto)}</td>
                      <td className="num">{formatarReais(m.esperado)}</td>
                      <td className="num">{formatarReais(m.recebido)}</td>
                      <td className="num" style={{ color: a.alerta ? 'var(--fin-despesa)' : undefined, fontWeight: a.alerta ? 700 : undefined }}>
                        {a.diferenca >= 0 ? '+' : '−'} {formatarReais(Math.abs(a.diferenca))}
                      </td>
                      <td className="num">{pct(a.taxaCombinada)}</td>
                      <td className="num">{pct(a.taxaReal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="dica" style={{ margin: 0 }}>
            Créditos reconhecidos como maquininha: {dados.adquirentes.length ? dados.adquirentes.slice(0, 6).map((d) => `${d.descricao} (${formatarReais(Number(d.valor))})`).join(' · ') : 'nenhum'}.
            A diferença de um mês costuma compensar no seguinte (crédito parcelado ou que caiu um dia depois); repetida mês após mês, é taxa a mais.
          </p>
        </>
      )}
    </section>
  );
}
