'use client';
import Link from 'next/link';
import { formatarReais } from '@res/core';
import { n, nomeMes, pctDe, quantidadeTexto, type FechamentoEstoque } from '@/lib/estoque';

const somaMes = (ym: string, k: number) => {
  const [a, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + k, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const pctTexto = (v: number | null) => (v == null ? '—' : `${v.toString().replace('.', ',')}%`);
const dataCurta = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

/** Fechamento do mês e CMV (D-039): real (estoque inicial + compras − final) × teórico (pelas fichas). */
export function Fechamento({ f, mesAtual }: { f: FechamentoEstoque; mesAtual: string }) {
  const r = f.resumo;
  const pReal = pctDe(r.cmv_real, r.faturamento);
  const pTeo = pctDe(r.cmv_teorico, r.faturamento);
  const desvio = r.cmv_real - r.cmv_teorico;
  const outros = desvio - r.perdas + r.contagens;
  const maxPct = Math.max(40, ...f.historico.map((h) => pctDe(h.cmv_real, h.faturamento) ?? 0));

  const exportar = () => {
    const dec = (v: number, k = 3) => (Math.round(v * 10 ** k) / 10 ** k).toString().replace('.', ',');
    const rs = (c: number) => dec(c / 100, 2);
    const linhas = [
      [`Fechamento ${nomeMes(f.mes)}`, f.lojas.join(' + ')],
      [],
      ['Estoque inicial', rs(r.estoque_inicial)],
      ['Compras', rs(r.compras)],
      ['Estoque final', rs(r.estoque_final)],
      ['CMV real', rs(r.cmv_real)],
      ['CMV pelas fichas', rs(r.cmv_teorico)],
      ['Perdas registradas', rs(r.perdas)],
      ['Diferença nas contagens', rs(r.contagens)],
      ['Faturamento (sem taxa de entrega)', rs(r.faturamento)],
      ['CMV real %', pReal == null ? '' : dec(pReal, 1)],
      ['CMV pelas fichas %', pTeo == null ? '' : dec(pTeo, 1)],
      [],
      ['insumo', 'unidade', 'qtd_inicial', 'valor_inicial', 'qtd_compras', 'valor_compras', 'qtd_final', 'valor_final', 'consumo_real_qtd', 'consumo_real_valor', 'pelas_fichas_qtd', 'pelas_fichas_valor', 'perdas_valor', 'diferenca_valor'],
      ...f.por_insumo.map((x) => [x.insumo, x.unidade, dec(n(x.q_inicial)), rs(x.inicial), dec(n(x.q_compras)), rs(x.compras), dec(n(x.q_final)), rs(x.final), dec(n(x.q_real)), rs(x.real), dec(n(x.q_teorico)), rs(x.teorico), rs(x.perdas), rs(x.real - x.teorico)]),
    ];
    const esc = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const blob = new Blob(['﻿' + linhas.map((l) => l.map((c) => esc(String(c))).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fechamento-estoque-${f.mes}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div className="grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="linha cmv-mes" style={{ alignItems: 'center', gap: '0.4rem' }}>
          <Link className="botao mini" href={`/estoque?aba=cmv&mes=${somaMes(f.mes, -1)}`} aria-label="Mês anterior">‹</Link>
          <strong>{nomeMes(f.mes)}</strong>
          {f.mes < mesAtual ? <Link className="botao mini" href={`/estoque?aba=cmv&mes=${somaMes(f.mes, 1)}`} aria-label="Próximo mês">›</Link> : <span className="mini" />}
          {f.lojas.length > 1 && <span className="dica">· estoque do grupo: {f.lojas.join(', ')}</span>}
        </div>
        <div className="linha nao-imprimir" style={{ alignItems: 'center' }}>
          <button type="button" onClick={() => window.print()}>🖨 Imprimir</button>
          <button type="button" onClick={exportar}>⬇ Exportar (Excel/CSV)</button>
        </div>
      </div>

      {f.em_andamento ? (
        <p className="cmv-aviso">Mês em andamento: o estoque final é o saldo de agora. Para fechar, faça uma <Link href="/estoque?aba=contagem">contagem</Link> no último dia do mês.</p>
      ) : !f.contagem_fim ? (
        <p className="cmv-aviso" data-tom="alerta">
          Sem contagem no fechamento deste mês: o estoque final é o do sistema (compras − vendas pelas fichas − perdas){f.ultima_contagem ? `; última contagem em ${dataCurta(f.ultima_contagem)}` : ''}. O CMV real fica igual ao das fichas e esconde desperdícios. Conte no último dia de cada mês.
        </p>
      ) : (
        <p className="cmv-aviso" data-tom="ok">Fechado com a contagem de {dataCurta(f.contagem_fim)}.</p>
      )}

      <section className="cartao grade">
        <div className="cmv-conta">
          <div><span className="dica">Estoque inicial</span><strong>{formatarReais(r.estoque_inicial)}</strong></div>
          <span className="cmv-op">+</span>
          <div><span className="dica">Compras</span><strong>{formatarReais(r.compras)}</strong></div>
          <span className="cmv-op">−</span>
          <div><span className="dica">Estoque final</span><strong>{formatarReais(r.estoque_final)}</strong></div>
          <span className="cmv-op">=</span>
          <div className="cmv-total"><span className="dica">CMV real</span><strong>{formatarReais(r.cmv_real)}</strong></div>
        </div>
        <div className="mv-resumo">
          <div><span className="dica">Faturamento</span><strong>{formatarReais(r.faturamento)}</strong><span className="dica">{r.pedidos} pedido(s) concluído(s), sem taxa de entrega</span></div>
          <div><span className="dica">CMV real</span><strong className={pReal != null && pReal > 35 ? 'erro' : undefined}>{pctTexto(pReal)}</strong><span className="dica">do faturamento</span></div>
          <div><span className="dica">CMV pelas fichas</span><strong>{pctTexto(pTeo)}</strong><span className="dica">{formatarReais(r.cmv_teorico)}: o que deveria ter saído</span></div>
          <div>
            <span className="dica">Diferença (real − fichas)</span>
            <strong className={desvio > 0 ? 'erro' : undefined}>{desvio > 0 ? '+' : desvio < 0 ? '−' : ''}{formatarReais(Math.abs(desvio))}</strong>
            <span className="dica">perdas {formatarReais(r.perdas)} · contagens {r.contagens > 0 ? '+' : r.contagens < 0 ? '−' : ''}{formatarReais(Math.abs(r.contagens))}{Math.abs(outros) >= 100 ? ` · outros ${outros < 0 ? '−' : ''}${formatarReais(Math.abs(outros))}` : ''}</span>
          </div>
        </div>
        <p className="dica" style={{ margin: 0 }}>
          Diferença positiva = saiu mais do que as fichas dizem (perda, porção maior, ficha faltando, desvio). &quot;Contagens&quot; é a falta (−) ou sobra (+) achada ao contar; &quot;outros&quot; vem de mudança de custo no mês.
        </p>
      </section>

      <section className="cartao grade">
        <h2 style={{ margin: 0 }}>Últimos 6 meses</h2>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead><tr><th>Mês</th><th>Faturamento</th><th>Compras</th><th>CMV real</th><th>CMV %</th><th>Pelas fichas</th><th>Diferença</th></tr></thead>
            <tbody>
              {f.historico.map((h) => {
                const p = pctDe(h.cmv_real, h.faturamento);
                const d = h.cmv_real - h.cmv_teorico;
                return (
                  <tr key={h.mes} aria-current={h.mes === f.mes ? 'true' : undefined}>
                    <td><Link href={`/estoque?aba=cmv&mes=${h.mes}`}>{nomeMes(h.mes)}</Link></td>
                    <td>{formatarReais(h.faturamento)}</td>
                    <td>{formatarReais(h.compras)}</td>
                    <td>{formatarReais(h.cmv_real)}</td>
                    <td>
                      <span className="tp-trilho" style={{ display: 'inline-flex', width: '5rem', verticalAlign: 'middle', marginRight: '0.4rem' }}>
                        <span style={{ width: `${Math.min(100, ((p ?? 0) / maxPct) * 100)}%` }} />
                      </span>
                      {pctTexto(p)}
                    </td>
                    <td>{pctTexto(pctDe(h.cmv_teorico, h.faturamento))}</td>
                    <td className={d > 0 ? 'erro' : undefined}>{d ? `${d > 0 ? '+' : '−'}${formatarReais(Math.abs(d))}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cartao grade">
        <h2 style={{ margin: 0 }}>Por insumo</h2>
        {f.por_insumo.length === 0 ? (
          <p className="dica" style={{ margin: 0 }}>Nenhum movimento no mês.</p>
        ) : (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead><tr><th>Insumo</th><th>Inicial</th><th>Compras</th><th>Final</th><th>Consumo real</th><th>Pelas fichas</th><th>Diferença</th></tr></thead>
              <tbody>
                {f.por_insumo.map((x) => {
                  const d = x.real - x.teorico;
                  const qd = n(x.q_real) - n(x.q_teorico);
                  return (
                    <tr key={x.insumo}>
                      <td><strong>{x.insumo}</strong></td>
                      <td>{formatarReais(x.inicial)} <span className="dica">{quantidadeTexto(n(x.q_inicial), x.unidade)}</span></td>
                      <td>{x.compras ? <>{formatarReais(x.compras)} <span className="dica">{quantidadeTexto(n(x.q_compras), x.unidade)}</span></> : '—'}</td>
                      <td>{formatarReais(x.final)} <span className="dica">{quantidadeTexto(n(x.q_final), x.unidade)}</span></td>
                      <td>{formatarReais(x.real)} <span className="dica">{quantidadeTexto(n(x.q_real), x.unidade)}</span></td>
                      <td>{x.teorico ? <>{formatarReais(x.teorico)} <span className="dica">{quantidadeTexto(n(x.q_teorico), x.unidade)}</span></> : <span className="dica">sem ficha/venda</span>}</td>
                      <td className={d > 0 ? 'erro' : d < 0 ? 'ct-sobra' : undefined}>
                        {Math.abs(d) >= 1 ? <>{d > 0 ? '+' : '−'}{formatarReais(Math.abs(d))} <span className="dica">{qd > 0 ? '+' : ''}{quantidadeTexto(qd, x.unidade)}</span></> : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
