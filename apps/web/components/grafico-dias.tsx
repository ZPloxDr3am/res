'use client';
import { useState } from 'react';
import { formatarReais } from '@res/core';

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const rotulo = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
const semana = (dia: string) => DIAS[new Date(`${dia}T12:00:00Z`).getUTCDay()];

export type DiaLojas = { dia: string; porLoja: Record<string, { faturamento: number; pedidos: number }> };
export type LojaCor = { id: string; nome: string; cor: string };

const totalDia = (d: DiaLojas) => Object.values(d.porLoja).reduce((s, x) => s + x.faturamento, 0);
const pedidosDia = (d: DiaLojas) => Object.values(d.porLoja).reduce((s, x) => s + x.pedidos, 0);

/**
 * Faturamento por dia em colunas verticais empilhadas por loja (ordem e cor fixas por loja,
 * 2px de respiro entre os pedaços). O topo de cada coluna mostra o total do dia quando cabe.
 */
export function GraficoDias({ serie, lojas }: { serie: DiaLojas[]; lojas: LojaCor[] }) {
  const [foco, setFoco] = useState<number | null>(null);
  if (serie.every((s) => totalDia(s) === 0)) return <p className="dica" style={{ margin: 0 }}>Sem vendas no período.</p>;
  const max = Math.max(1, ...serie.map(totalDia));
  const passo = 10 ** Math.floor(Math.log10(max));
  const topo = Math.ceil(max / passo) * passo;
  const L = 640;
  const A = 190;
  const TOPO = 18; // espaço para o rótulo de total
  const larg = L / serie.length;
  const barra = Math.max(3, Math.min(34, larg - 3));
  const marcarCada = Math.ceil(serie.length / 10);
  const mostrarTotal = serie.length <= 14;
  const media = serie.reduce((s, d) => s + totalDia(d), 0) / serie.length;
  const melhor = serie.reduce((a, b) => (totalDia(b) > totalDia(a) ? b : a));
  const f = foco !== null ? serie[foco] : null;
  const y = (v: number) => TOPO + A - (v / topo) * A;
  const curto = (v: number) => formatarReais(v).replace(/,\d{2}$/, '');

  return (
    <div className="grafico" onMouseLeave={() => setFoco(null)}>
      {lojas.length > 1 && (
        <div className="legenda">
          {lojas.map((l) => <span key={l.id}><i className="cor-loja" style={{ background: l.cor }} />{l.nome}</span>)}
        </div>
      )}
      <p className="kpi-frase">
        Média de <b>{formatarReais(Math.round(media))}</b> por dia. Melhor dia: <b>{semana(melhor.dia)} {rotulo(melhor.dia)}</b> com <b>{formatarReais(totalDia(melhor))}</b>.
      </p>
      <div className="grafico-dica" aria-live="polite">
        {f ? (
          <>
            <strong>{semana(f.dia)} {rotulo(f.dia)}</strong> · {formatarReais(totalDia(f))} · {pedidosDia(f)} pedido{pedidosDia(f) === 1 ? '' : 's'}
            {lojas.length > 1 && (
              <ul>
                {lojas.filter((l) => f.porLoja[l.id]?.faturamento).map((l) => (
                  <li key={l.id}><i className="cor-loja" style={{ background: l.cor }} />{l.nome}: {formatarReais(f.porLoja[l.id]!.faturamento)}</li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <span className="dica">Passe o mouse (ou toque) numa coluna para ver o dia.</span>
        )}
      </div>
      <svg viewBox={`0 0 ${L} ${TOPO + A + 22}`} role="img" aria-label="Faturamento por dia, por loja" style={{ width: '100%', height: 'auto' }}>
        {[0.5, 1].map((t) => (
          <g key={t}>
            <line x1={0} x2={L} y1={y(topo * t)} y2={y(topo * t)} className="grafico-grade" />
            <text x={2} y={y(topo * t) - 3} className="grafico-eixo">{formatarReais(Math.round(topo * t))}</text>
          </g>
        ))}
        <line x1={0} x2={L} y1={y(media)} y2={y(media)} stroke="var(--texto-suave)" strokeDasharray="6 4" strokeWidth={1} opacity={0.7} />
        <text x={L - 2} y={y(media) - 3} textAnchor="end" className="grafico-eixo">média {curto(Math.round(media))}</text>
        <line x1={0} x2={L} y1={TOPO + A} y2={TOPO + A} className="grafico-base" />
        {serie.map((s, i) => {
          const x = i * larg + (larg - barra) / 2;
          let base = 0;
          const pedacos = lojas
            .map((l) => ({ l, v: s.porLoja[l.id]?.faturamento ?? 0 }))
            .filter((p) => p.v > 0);
          const tot = totalDia(s);
          return (
            <g key={s.dia} onMouseEnter={() => setFoco(i)} onClick={() => setFoco(i)} style={{ cursor: 'default' }}>
              <rect x={i * larg} y={0} width={larg} height={TOPO + A} fill="transparent" />
              {pedacos.map((p, k) => {
                const y0 = y(base);
                base += p.v;
                const y1 = y(base);
                const ultimo = k === pedacos.length - 1;
                const h = Math.max(1, y0 - y1 - (k > 0 ? 2 : 0)); // 2px de respiro entre pedaços
                const topoY = y0 - (k > 0 ? 2 : 0) - h;
                const r = ultimo ? Math.min(4, h, barra / 2) : 0;
                return (
                  <path
                    key={p.l.id}
                    className="grafico-segmento"
                    opacity={foco === null || foco === i ? 1 : 0.55}
                    fill={p.l.cor}
                    d={`M${x},${topoY + h} V${topoY + r} q0,-${r} ${r},-${r} H${x + barra - r} q${r},0 ${r},${r} V${topoY + h} Z`}
                  />
                );
              })}
              {mostrarTotal && tot > 0 && (
                <text x={i * larg + larg / 2} y={y(tot) - 4} textAnchor="middle" className="grafico-eixo" style={{ fontWeight: 700, fill: 'var(--texto)' }}>
                  {curto(tot)}
                </text>
              )}
              {i % marcarCada === 0 && (
                <text x={i === 0 ? 0 : i * larg + larg / 2} y={TOPO + A + 15} textAnchor={i === 0 ? 'start' : 'middle'} className="grafico-eixo">
                  {serie.length <= 7 ? `${semana(s.dia)} ` : ''}{rotulo(s.dia)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="dica">
        <summary>Ver em tabela</summary>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>Dia</th>
                {lojas.length > 1 && lojas.map((l) => <th key={l.id} className="num"><i className="cor-loja" style={{ background: l.cor }} />{l.nome}</th>)}
                <th className="num">Total</th>
                <th className="num">Pedidos</th>
              </tr>
            </thead>
            <tbody>
              {serie.map((s) => (
                <tr key={s.dia}>
                  <td>{semana(s.dia)} {rotulo(s.dia)}</td>
                  {lojas.length > 1 && lojas.map((l) => <td key={l.id} className="num">{formatarReais(s.porLoja[l.id]?.faturamento ?? 0)}</td>)}
                  <td className="num">{formatarReais(totalDia(s))}</td>
                  <td className="num">{pedidosDia(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
