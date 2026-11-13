'use client';
import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { formatarReais } from '@res/core';
import { definirPausaSemInsumo } from '@/app/(painel)/estoque/actions';
import { salvando } from '@/components/tempo-real';
import { n, quantidadeTexto, type ItemCompra } from '@/lib/estoque';

const qtd = (v: number) => (Number.isInteger(v) ? String(v) : v.toLocaleString('pt-BR', { maximumFractionDigits: 3 }));

/** Compras (D-103): o que está no mínimo ou abaixo, por fornecedor, pronto para pedir. E a pausa automática do cardápio. */
export function ListaCompras({ itens, loja, pausar, gestor, semMinimo }: { itens: ItemCompra[]; loja: string; pausar: boolean; gestor: boolean; semMinimo: number }) {
  const [quanto, setQuanto] = useState<Record<string, string>>({});
  const [fora, setFora] = useState<Set<string>>(new Set());
  const [copiado, setCopiado] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [ligado, setLigado] = useState(pausar);
  const [pendente, iniciar] = useTransition();
  const grupos = useMemo(() => {
    const m = new Map<string, ItemCompra[]>();
    for (const i of itens) m.set(i.fornecedor ?? 'Sem fornecedor ainda', [...(m.get(i.fornecedor ?? 'Sem fornecedor ainda') ?? []), i]);
    return [...m.entries()];
  }, [itens]);
  const pedir = (i: ItemCompra) => {
    const v = Number((quanto[i.id] ?? '').replace(',', '.'));
    return Number.isFinite(v) && v > 0 ? v : n(i.sugestao);
  };
  const texto = (forn: string, lista: ItemCompra[]) =>
    [`Olá! Pedido da ${loja}:`, ...lista.filter((i) => !fora.has(i.id)).map((i) => `• ${qtd(pedir(i))} ${i.unidade.toLowerCase()} — ${i.nome}`), '', 'Pode confirmar o prazo e o valor? Obrigado!'].join('\n');
  const total = (lista: ItemCompra[]) => lista.filter((i) => !fora.has(i.id)).reduce((s, i) => s + (i.custo != null ? pedir(i) * n(i.custo) : 0), 0);

  return (
    <div className="grade">
      <section className="cartao grade">
        <label className="check" style={{ alignItems: 'flex-start' }}>
          <input type="checkbox" checked={ligado} disabled={!gestor || pendente} onChange={(e) => {
            const v = e.target.checked;
            setLigado(v);
            iniciar(async () => {
              const r = await salvando(definirPausaSemInsumo(v));
              if (!r.ok) { setLigado(!v); return setMsg(r.erro); }
              setMsg(v ? (r.pausados ? `Ligado. ${r.pausados} produto(s) já saíram do cardápio por falta de insumo.` : 'Ligado. Nenhum produto está sem insumo agora.') : 'Desligado. Os produtos pausados voltaram ao cardápio.');
            });
          }} />
          <span>
            <strong>Tirar do cardápio o produto que ficou sem insumo</strong>
            <br />
            <span className="dica">Quando um insumo da ficha técnica zera, o produto aparece como esgotado no cardápio digital e volta sozinho quando a nota de compra entra. Só vale para produtos com ficha técnica e com o estoque em dia.{!gestor ? ' Só o dono ou o gerente mudam.' : ''}</span>
          </span>
        </label>
        {msg && <span className="dica" role="status">{msg}</span>}
      </section>

      {itens.length === 0 ? (
        <p className="cartao dica">
          Nada para comprar agora: nenhum insumo chegou ao mínimo.
          {semMinimo > 0 && <> {semMinimo} insumo(s) ainda não têm mínimo: defina em <Link href="/estoque?aba=insumos">Insumos</Link> (&quot;Avisar abaixo de&quot;) para eles entrarem nesta lista.</>}
        </p>
      ) : (
        grupos.map(([forn, lista]) => (
          <section key={forn} className="cartao grade">
            <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h2 style={{ margin: 0 }}>{forn}</h2>
                <span className="dica">{lista.length} item(ns){total(lista) > 0 ? ` · cerca de ${formatarReais(Math.round(total(lista) * 100))} pelo último preço` : ''}</span>
              </div>
              <div className="linha nao-imprimir" style={{ gap: '0.35rem' }}>
                <button type="button" onClick={async () => { await navigator.clipboard?.writeText(texto(forn, lista)).catch(() => undefined); setCopiado(forn); }}>{copiado === forn ? '✓ Copiado' : 'Copiar pedido'}</button>
                <a className="botao botao-primario" href={`https://wa.me/?text=${encodeURIComponent(texto(forn, lista))}`} target="_blank" rel="noopener noreferrer">Enviar no WhatsApp</a>
              </div>
            </div>
            <div className="tabela-rolagem">
              <table className="tabela">
                <thead><tr><th /><th>Insumo</th><th>Tem</th><th>Mínimo</th><th>Pedir</th><th>Último preço</th></tr></thead>
                <tbody>
                  {lista.map((i) => (
                    <tr key={i.id} style={fora.has(i.id) ? { opacity: 0.45 } : undefined}>
                      <td><input type="checkbox" checked={!fora.has(i.id)} aria-label={`Incluir ${i.nome}`} onChange={(e) => setFora((f) => { const x = new Set(f); if (e.target.checked) x.delete(i.id); else x.add(i.id); return x; })} /></td>
                      <td><strong>{i.nome}</strong></td>
                      <td className={n(i.saldo) <= 0 ? 'erro' : undefined}>{quantidadeTexto(n(i.saldo), i.unidade)}</td>
                      <td className="dica">{quantidadeTexto(n(i.minimo), i.unidade)}</td>
                      <td>
                        <span className="ct-campo">
                          <input inputMode="decimal" value={quanto[i.id] ?? qtd(n(i.sugestao)).replace('.', ',')} aria-label={`Quanto pedir de ${i.nome}`} style={{ width: '5.5rem' }} onChange={(e) => setQuanto((q) => ({ ...q, [i.id]: e.target.value }))} />
                          <span className="dica">{i.unidade.toLowerCase()}</span>
                        </span>
                      </td>
                      <td className="dica">{i.custo != null ? `${formatarReais(Math.round(n(i.custo) * 100))} / ${i.unidade.toLowerCase()}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
