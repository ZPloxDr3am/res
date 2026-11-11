'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { formatarReais } from '@res/core';
import { buscarMovimentos, type FiltroMovimentos } from '@/app/(painel)/estoque/actions';
import { n, quantidadeTexto, type Insumo, type MovimentosFiltrados } from '@/lib/estoque';

const TIPOS = [
  { id: 'entrada_nfe', rotulo: 'Entrada NF-e' },
  { id: 'entrada', rotulo: 'Entrada avulsa' },
  { id: 'venda', rotulo: 'Venda' },
  { id: 'estorno_venda', rotulo: 'Venda cancelada' },
  { id: 'perda', rotulo: 'Perda' },
  { id: 'contagem', rotulo: 'Contagem' },
] as const;
const ROTULO: Record<string, string> = Object.fromEntries(TIPOS.map((t) => [t.id, t.rotulo]));
const hoje = () => new Date(Date.now() - 5 * 3600_000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const menos = (d: string, k: number) => new Date(Date.parse(`${d}T12:00:00Z`) - k * 86400_000).toISOString().slice(0, 10);
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

/** Movimentações com filtros (período, tipo, fornecedor, insumo, produto vendido, busca), resumo e Excel (D-037). */
export function Movimentacoes({ insumos, produtos, inicial }: { insumos: Insumo[]; produtos: { id: string; nome: string }[]; inicial?: Partial<FiltroMovimentos> }) {
  const [f, setF] = useState<FiltroMovimentos>({ de: menos(hoje(), 29), ate: hoje(), tipos: [], fornecedor: '', insumo: '', produto: '', busca: '', ...inicial });
  const [dados, setDados] = useState<MovimentosFiltrados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const primeira = useRef(true);
  const muda = (p: Partial<FiltroMovimentos>) => setF((x) => ({ ...x, ...p }));

  useEffect(() => {
    const t = setTimeout(
      () =>
        iniciar(async () => {
          const r = await buscarMovimentos(f);
          if (!r.ok) return setErro(r.erro);
          setErro(null);
          setDados(r.dados);
        }),
      primeira.current ? 0 : 300,
    );
    primeira.current = false;
    return () => clearTimeout(t);
  }, [f]);

  const atalho = (dias: number) => muda({ de: menos(hoje(), dias - 1), ate: hoje() });
  const alternaTipo = (t: string) => muda({ tipos: f.tipos.includes(t) ? f.tipos.filter((x) => x !== t) : [...f.tipos, t] });
  const filtrando = f.tipos.length || f.fornecedor || f.insumo || f.produto || f.busca;

  const exportar = () => {
    if (!dados) return;
    const esc = (v: unknown) => {
      const t = v == null ? '' : String(v);
      return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const dec = (v: number, k = 3) => (Math.round(v * 10 ** k) / 10 ** k).toString().replace('.', ',');
    const linhas = [
      ['data', 'insumo', 'tipo', 'quantidade', 'unidade', 'custo_unitario', 'valor', 'saldo_depois', 'nota', 'fornecedor', 'pedido', 'observacao', 'loja'],
      ...dados.movimentos.map((m) => [quando(m.em), m.insumo, ROTULO[m.tipo] ?? m.tipo, dec(n(m.quantidade)), m.unidade, dec(n(m.custo_unit) / 100, 2), dec(n(m.valor) / 100, 2), dec(n(m.saldo_apos)), m.nf ?? '', m.fornecedor ?? '', m.pedido ?? '', m.motivo ?? '', m.loja ?? '']),
    ];
    const blob = new Blob(['﻿' + linhas.map((l) => l.map(esc).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `movimentacoes-${f.de}-a-${f.ate}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const r = dados?.resumo;
  return (
    <div className="grade">
      <section className="cartao grade mv-filtros" aria-label="Filtros">
        <div className="linha" style={{ alignItems: 'end' }}>
          <div className="segmentos" role="group" aria-label="Período">
            {[[1, 'Hoje'], [7, '7 dias'], [30, '30 dias'], [90, '90 dias']].map(([d, t]) => {
              const ativo = f.ate === hoje() && f.de === menos(hoje(), (d as number) - 1);
              return <a key={d} href="#" aria-current={ativo ? 'true' : undefined} onClick={(e) => { e.preventDefault(); atalho(d as number); }}>{t}</a>;
            })}
          </div>
          <label>De<input type="date" value={f.de} max={f.ate} onChange={(e) => e.target.value && muda({ de: e.target.value })} /></label>
          <label>Até<input type="date" value={f.ate} min={f.de} onChange={(e) => e.target.value && muda({ ate: e.target.value })} /></label>
        </div>
        <div className="linha">
          <label>Fornecedor
            <select value={f.fornecedor} onChange={(e) => muda({ fornecedor: e.target.value })}>
              <option value="">Todos</option>
              {(dados?.fornecedores ?? []).map((x) => <option key={x.cnpj} value={x.cnpj}>{x.nome}</option>)}
            </select>
          </label>
          <label>Insumo
            <select value={f.insumo} onChange={(e) => muda({ insumo: e.target.value })}>
              <option value="">Todos</option>
              {insumos.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
            </select>
          </label>
          <label>Produto vendido
            <select value={f.produto} onChange={(e) => muda({ produto: e.target.value })}>
              <option value="">Todos</option>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </label>
          <label style={{ flex: '1 1 12rem' }}>Buscar<input type="search" value={f.busca} onChange={(e) => muda({ busca: e.target.value })} placeholder="Nº da nota, nº do pedido, observação" /></label>
        </div>
        <div className="linha" style={{ alignItems: 'center', gap: '0.4rem' }}>
          {TIPOS.map((t) => (
            <button key={t.id} type="button" className="mini" aria-pressed={f.tipos.includes(t.id)} onClick={() => alternaTipo(t.id)}>{t.rotulo}</button>
          ))}
          {filtrando ? <button type="button" className="mini dica" onClick={() => muda({ tipos: [], fornecedor: '', insumo: '', produto: '', busca: '' })}>Limpar filtros</button> : null}
        </div>
      </section>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {r && (
        <div className="mv-resumo" aria-busy={pendente}>
          <div><span className="dica">Entradas</span><strong>{formatarReais(r.entradas)}</strong><span className="dica">{r.entradas_n} lançamentos · {r.notas} nota(s)</span></div>
          <div><span className="dica">Saiu nas vendas</span><strong>{formatarReais(r.vendas)}</strong><span className="dica">custo de {r.pedidos} pedido(s)</span></div>
          <div><span className="dica">Perdas</span><strong className={r.perdas > 0 ? 'erro' : undefined}>{formatarReais(r.perdas)}</strong><span className="dica">{r.perdas_n} registro(s)</span></div>
          <div><span className="dica">Diferença nas contagens</span><strong className={r.contagens < 0 ? 'erro' : undefined}>{r.contagens > 0 ? '+' : ''}{formatarReais(r.contagens)}</strong><span className="dica">{r.contagens_n} contagem(ns) · falta (−) ou sobra (+)</span></div>
        </div>
      )}

      {dados && dados.por_insumo.length > 1 && !f.insumo && (
        <details className="cartao">
          <summary><strong>Por insumo</strong> <span className="dica">quanto entrou e saiu de cada um no período</span></summary>
          <div className="tabela-rolagem" style={{ marginTop: '0.6rem' }}>
            <table className="tabela">
              <thead><tr><th>Insumo</th><th>Entrou</th><th>Saiu</th><th>Custo nas vendas</th><th>Perdas</th><th /></tr></thead>
              <tbody>
                {dados.por_insumo.map((x) => (
                  <tr key={x.insumo}>
                    <td>{x.insumo}</td>
                    <td>{x.entrou ? quantidadeTexto(n(x.entrou), x.unidade) : '—'}</td>
                    <td>{x.saida ? quantidadeTexto(n(x.saida), x.unidade) : '—'}</td>
                    <td>{formatarReais(n(x.custo_vendas))}</td>
                    <td className={n(x.custo_perdas) > 0 ? 'erro' : undefined}>{n(x.custo_perdas) ? formatarReais(n(x.custo_perdas)) : '—'}</td>
                    <td><button type="button" className="mini" onClick={() => muda({ insumo: insumos.find((i) => i.nome === x.insumo)?.id ?? '' })}>Ver</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="dica">{pendente ? 'Atualizando…' : dados ? `${dados.total} movimentação(ões)${dados.total > 500 ? ' · mostrando as 500 mais recentes' : ''}` : 'Carregando…'}</span>
        <button type="button" onClick={exportar} disabled={!dados || dados.movimentos.length === 0}>⬇ Exportar (Excel/CSV)</button>
      </div>
      {dados && dados.movimentos.length === 0 && <p className="cartao dica" style={{ margin: 0 }}>Nenhuma movimentação com esses filtros.</p>}
      {dados && dados.movimentos.length > 0 && (
        <div className="cartao tabela-rolagem" style={{ padding: 0, opacity: pendente ? 0.6 : 1 }}>
          <table className="tabela">
            <thead><tr><th>Quando</th><th>Insumo</th><th>O quê</th><th>Quantidade</th><th>Valor</th><th>Saldo depois</th><th>Origem</th></tr></thead>
            <tbody>
              {dados.movimentos.map((m) => (
                <tr key={m.id}>
                  <td className="dica">{quando(m.em)}</td>
                  <td><button type="button" className="mv-link" onClick={() => muda({ insumo: insumos.find((i) => i.nome === m.insumo)?.id ?? '' })}>{m.insumo}</button></td>
                  <td><span className="est-mov" data-tipo={m.tipo}>{ROTULO[m.tipo] ?? m.tipo}</span></td>
                  <td className={n(m.quantidade) < 0 ? 'erro' : undefined}>{n(m.quantidade) > 0 ? '+' : ''}{quantidadeTexto(n(m.quantidade), m.unidade)}</td>
                  <td>{n(m.valor) ? formatarReais(Math.abs(n(m.valor))) : '—'}</td>
                  <td>{quantidadeTexto(n(m.saldo_apos), m.unidade)}</td>
                  <td className="dica mv-origem">
                    {m.nf ? <button type="button" className="mv-link" onClick={() => muda({ busca: m.nf! })}>NF {m.nf}</button> : null}
                    {m.fornecedor ? ` · ${m.fornecedor}` : ''}
                    {m.pedido ? <button type="button" className="mv-link" onClick={() => muda({ busca: `#${m.pedido}` })}>Pedido #{m.pedido}</button> : null}
                    {!m.nf && !m.pedido && m.motivo ? m.motivo : ''}
                    {m.loja ? <span> · {m.loja}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
