'use client';
import { useState } from 'react';
import { formatarReais, formatarVariacao, variacao } from '@res/core';

export type LojaDesempenho = {
  id: string;
  nome: string;
  cor: string;
  faturamento: number; // centavos
  faturamentoAnt: number;
  pedidos: number;
  pedidosAnt: number;
};

type Metrica = 'faturamento' | 'pedidos' | 'ticket';
const METRICAS: { id: Metrica; rotulo: string; explica: string }[] = [
  { id: 'faturamento', rotulo: 'Faturamento', explica: 'Quanto cada loja vendeu (pedidos não cancelados, com frete).' },
  { id: 'pedidos', rotulo: 'Pedidos', explica: 'Quantos pedidos cada loja recebeu (sem os cancelados).' },
  { id: 'ticket', rotulo: 'Ticket médio', explica: 'Valor médio de cada pedido: faturamento ÷ pedidos.' },
];

const valor = (l: LojaDesempenho, m: Metrica, anterior = false) => {
  const fat = anterior ? l.faturamentoAnt : l.faturamento;
  const ped = anterior ? l.pedidosAnt : l.pedidos;
  return m === 'faturamento' ? fat : m === 'pedidos' ? ped : ped ? Math.round(fat / ped) : 0;
};
const formatar = (v: number, m: Metrica) => (m === 'pedidos' ? `${v} pedido${v === 1 ? '' : 's'}` : formatarReais(v));
const curto = (v: number, m: Metrica) => (m === 'pedidos' ? String(v) : formatarReais(v).replace(/,\d{2}$/, ''));

/** Colunas verticais por loja, coloridas pela loja, com a barra hachurada do período anterior ao lado. */
export function GraficoLojas({ lojas, comparacao }: { lojas: LojaDesempenho[]; comparacao: string }) {
  const [m, setM] = useState<Metrica>('faturamento');
  const [foco, setFoco] = useState<string | null>(null);
  const total = lojas.reduce((s, l) => s + valor(l, m), 0);
  const max = Math.max(1, ...lojas.flatMap((l) => [valor(l, m), valor(l, m, true)]));
  const ordenadas = [...lojas].sort((a, b) => valor(b, m) - valor(a, m));
  const lider = ordenadas[0];
  const info = METRICAS.find((x) => x.id === m)!;
  const f = lojas.find((l) => l.id === foco);

  return (
    <div className="grade" style={{ gap: '0.6rem' }}>
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="abas-metrica" role="group" aria-label="O que comparar">
          {METRICAS.map((x) => (
            <button key={x.id} type="button" aria-pressed={m === x.id} onClick={() => setM(x.id)}>{x.rotulo}</button>
          ))}
        </div>
        <span className="legenda">
          <span><i className="cor-loja coluna-anterior" style={{ width: '0.7rem', height: '0.7rem', borderRadius: 2 }} />barra listrada = período anterior ({comparacao.replace(/^vs /, '')})</span>
        </span>
      </div>
      <p className="kpi-frase">
        {info.explica}{' '}
        {lider && valor(lider, m) > 0 && lojas.length > 1 && (
          <>Quem mais vendeu: <b>{lider.nome}</b> com <b>{formatar(valor(lider, m), m)}</b>{m !== 'ticket' && total ? ` (${Math.round((valor(lider, m) / total) * 100)}% do total)` : ''}.</>
        )}
      </p>

      <div className="grafico-dica" aria-live="polite">
        {f ? (
          <>
            <i className="cor-loja" style={{ background: f.cor }} />
            <strong>{f.nome}</strong> · {formatar(valor(f, m), m)} · antes {formatar(valor(f, m, true), m)} ·{' '}
            {(() => {
              const v = variacao(valor(f, m), valor(f, m, true));
              const dif = valor(f, m) - valor(f, m, true);
              return `${formatarVariacao(v)} (${dif >= 0 ? '+' : '−'}${m === 'pedidos' ? Math.abs(dif) : formatarReais(Math.abs(dif))})`;
            })()}
          </>
        ) : (
          <span className="dica">Passe o mouse (ou toque) numa coluna para ver os detalhes.</span>
        )}
      </div>

      <div className="colunas" onMouseLeave={() => setFoco(null)}>
        {lojas.map((l) => {
          const v = valor(l, m);
          const a = valor(l, m, true);
          const vr = variacao(v, a);
          const pct = vr === null || Math.round(vr * 100) === 0 ? 'neutra' : vr > 0 ? 'boa' : 'ruim';
          return (
            <div
              key={l.id}
              className="coluna-loja"
              data-foco={foco === l.id ? 'sim' : undefined}
              onMouseEnter={() => setFoco(l.id)}
              onClick={() => setFoco(l.id)}
              style={{ color: l.cor }}
            >
              <span className="coluna-valor" style={{ color: 'var(--texto)' }}>
                {curto(v, m)}
                {m !== 'ticket' && total > 0 && <small className="dica">{Math.round((v / total) * 100)}% do total</small>}
              </span>
              <div className="coluna-area" aria-hidden="true">
                <div className="coluna-barra" style={{ height: `${(v / max) * 100}%`, background: l.cor }} />
                <div className="coluna-anterior" style={{ height: `${(a / max) * 100}%` }} title={`Antes: ${formatar(a, m)}`} />
              </div>
              <div className="coluna-rotulo" style={{ color: 'var(--texto)' }}>
                <strong title={l.nome}><i className="cor-loja" style={{ background: l.cor }} />{l.nome}</strong>
                <span className={`var ${pct}`}>{vr === null ? 'novo' : `${vr > 0 ? '▲' : vr < 0 ? '▼' : '='} ${formatarVariacao(vr)}`}</span>
                <span className="dica" style={{ display: 'block' }}>antes {curto(a, m)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <details className="dica">
        <summary>Ver em tabela</summary>
        <table className="tabela">
          <thead><tr><th>Loja</th><th className="num">{info.rotulo}</th><th className="num">Período anterior</th><th className="num">Variação</th></tr></thead>
          <tbody>
            {ordenadas.map((l) => (
              <tr key={l.id}>
                <td><i className="cor-loja" style={{ background: l.cor }} />{l.nome}</td>
                <td className="num">{formatar(valor(l, m), m)}</td>
                <td className="num">{formatar(valor(l, m, true), m)}</td>
                <td className="num">{formatarVariacao(variacao(valor(l, m), valor(l, m, true)))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
