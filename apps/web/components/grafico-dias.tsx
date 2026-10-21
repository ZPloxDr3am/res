'use client';
import { useState } from 'react';
import { formatarReais } from '@res/core';

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const rotulo = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
const semana = (dia: string) => DIAS[new Date(`${dia}T12:00:00Z`).getUTCDay()];

/** Barras do faturamento por dia (uma série; o título nomeia). Passe o mouse para ver o valor. */
export function GraficoDias({ serie }: { serie: { dia: string; faturamento: number; pedidos: number }[] }) {
  const [foco, setFoco] = useState<number | null>(null);
  if (serie.every((s) => s.faturamento === 0)) return <p className="dica" style={{ margin: 0 }}>Sem vendas no período.</p>;
  const max = Math.max(1, ...serie.map((s) => s.faturamento));
  // escala "redonda" para a linha de referência
  const passo = 10 ** Math.floor(Math.log10(max));
  const topo = Math.ceil(max / passo) * passo;
  const L = 640;
  const A = 180;
  const larg = L / serie.length;
  const barra = Math.max(2, Math.min(28, larg - 2)); // 2px de respiro entre barras
  const marcarCada = Math.ceil(serie.length / 10);
  const f = foco !== null ? serie[foco] : null;

  return (
    <div className="grafico" onMouseLeave={() => setFoco(null)}>
      <div className="grafico-dica" aria-live="polite">
        {f ? (
          <>
            <strong>{semana(f.dia)} {rotulo(f.dia)}</strong> · {formatarReais(f.faturamento)} · {f.pedidos} pedido{f.pedidos === 1 ? '' : 's'}
          </>
        ) : (
          <span className="dica">Passe o mouse (ou toque) numa barra para ver o dia.</span>
        )}
      </div>
      <svg viewBox={`0 0 ${L} ${A + 22}`} role="img" aria-label="Faturamento por dia" style={{ width: '100%', height: 'auto' }}>
        {[0.5, 1].map((t) => (
          <g key={t}>
            <line x1={0} x2={L} y1={A - A * t} y2={A - A * t} className="grafico-grade" />
            <text x={2} y={A - A * t - 3} className="grafico-eixo">{formatarReais(Math.round(topo * t))}</text>
          </g>
        ))}
        <line x1={0} x2={L} y1={A} y2={A} className="grafico-base" />
        {serie.map((s, i) => {
          const h = (s.faturamento / topo) * A;
          const x = i * larg + (larg - barra) / 2;
          return (
            <g key={s.dia} onMouseEnter={() => setFoco(i)} onClick={() => setFoco(i)}>
              <rect x={i * larg} y={0} width={larg} height={A} fill="transparent" />
              {h > 0 && <path d={`M${x},${A} V${A - h + Math.min(4, h)} q0,-${Math.min(4, h)} ${Math.min(4, barra / 2)},-${Math.min(4, h)} H${x + barra - Math.min(4, barra / 2)} q${Math.min(4, barra / 2)},0 ${Math.min(4, barra / 2)},${Math.min(4, h)} V${A} Z`} className={`grafico-barra ${foco === i ? 'ativa' : ''}`} />}
              {i % marcarCada === 0 && <text x={i === 0 ? 0 : i * larg + larg / 2} y={A + 15} textAnchor={i === 0 ? 'start' : 'middle'} className="grafico-eixo">{rotulo(s.dia)}</text>}
            </g>
          );
        })}
      </svg>
      <details className="dica">
        <summary>Ver em tabela</summary>
        <table className="tabela">
          <thead><tr><th>Dia</th><th className="num">Faturamento</th><th className="num">Pedidos</th></tr></thead>
          <tbody>{serie.map((s) => <tr key={s.dia}><td>{semana(s.dia)} {rotulo(s.dia)}</td><td className="num">{formatarReais(s.faturamento)}</td><td className="num">{s.pedidos}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  );
}
