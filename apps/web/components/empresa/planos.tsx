'use client';
import { useState, useTransition } from 'react';
import { type ModuloRes, type PlanoRes } from '@res/core';
import { salvarDescontoAnual, salvarPlano, salvarPrecoModulo } from '@/app/empresa/actions';

const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
const txt = (n: number) => Number(n).toFixed(2).replace('.', ',');

/** Editor de planos (D-085): preço por loja, módulos de cada plano e preço do adicional. */
export function PlanosRes({ planos, modulos, descontoAnual }: { planos: PlanoRes[]; modulos: ModuloRes[]; descontoAnual: number }) {
  const [ps, setPs] = useState(() => planos.map((p) => ({ ...p, incluidos: p.incluidos ?? {}, precoTxt: txt(p.preco_loja) })));
  const [desc, setDesc] = useState(String(descontoAnual));
  const [ms, setMs] = useState(() => modulos.map((m) => ({ ...m, precoTxt: txt(m.preco) })));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const mudaPlano = (id: string, f: Partial<(typeof ps)[number]>) => setPs((x) => x.map((p) => (p.id === id ? { ...p, ...f } : p)));
  const alterna = (id: string, m: string) => setPs((x) => x.map((p) => (p.id === id ? { ...p, modulos: p.modulos.includes(m) ? p.modulos.filter((y) => y !== m) : [...p.modulos, m] } : p)));
  const salvarTudo = () =>
    iniciar(async () => {
      setMsg(null);
      for (const p of ps) {
        const r = await salvarPlano({ id: p.id, nome: p.nome, descricao: p.descricao, preco: num(p.precoTxt), modulos: p.modulos.filter((m) => ms.find((x) => x.id === m)?.cobranca !== 'aparelho'), ativo: p.ativo, incluidos: p.incluidos });
        if (!r.ok) return setMsg({ ok: false, t: `${p.nome}: ${r.erro}` });
      }
      for (const m of ms) {
        if (num(m.precoTxt) === Number(m.preco)) continue;
        const r = await salvarPrecoModulo(m.id, num(m.precoTxt));
        if (!r.ok) return setMsg({ ok: false, t: `${m.nome}: ${r.erro}` });
      }
      if (num(desc) !== descontoAnual) {
        const r = await salvarDescontoAnual(num(desc));
        if (!r.ok) return setMsg({ ok: false, t: `Desconto anual: ${r.erro}` });
      }
      setMsg({ ok: true, t: 'Planos e preços salvos.' });
    });
  return (
    <div className="grade">
      <section className="cartao grade" style={{ overflowX: 'auto' }}>
        <table className="mod-matriz">
          <thead>
            <tr>
              <th>Módulo</th>
              <th>Adicional (R$/mês)</th>
              {ps.map((p) => <th key={p.id}>{p.nome}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Nome do plano</strong></td>
              <td />
              {ps.map((p) => <td key={p.id}><input value={p.nome} maxLength={40} onChange={(e) => mudaPlano(p.id, { nome: e.target.value })} aria-label={`Nome do plano ${p.id}`} /></td>)}
            </tr>
            <tr>
              <td><strong>Preço do plano (R$/mês, por conta)</strong></td>
              <td />
              {ps.map((p) => <td key={p.id}><input type="text" inputMode="decimal" value={p.precoTxt} onChange={(e) => mudaPlano(p.id, { precoTxt: e.target.value })} aria-label={`Preço do plano ${p.nome}`} /></td>)}
            </tr>
            <tr>
              <td>Básico: cardápio, pedidos, delivery, impressão, caixa</td>
              <td className="dica">incluso</td>
              {ps.map((p) => <td key={p.id}>✓</td>)}
            </tr>
            {ms.map((m) => (
              <tr key={m.id}>
                <td>{m.nome}<br /><span className="dica">{m.cobranca === 'cardapio' ? 'por loja ou cardápio além do 1º (vale em todo plano)' : m.cobranca === 'aparelho' ? 'por aparelho além dos grátis no plano' : 'adicional único por conta'}</span></td>
                <td><input type="text" inputMode="decimal" value={m.precoTxt} onChange={(e) => setMs((x) => x.map((y) => (y.id === m.id ? { ...y, precoTxt: e.target.value } : y)))} aria-label={`Preço do adicional ${m.nome}`} /></td>
                {ps.map((p) => (
                  <td key={p.id}>
                    {m.cobranca === 'aparelho' ? (
                      <label className="dica">grátis <input type="number" min={0} max={200} value={p.incluidos[m.id] ?? 0} style={{ width: '4.5rem' }} aria-label={`${m.nome} grátis no plano ${p.nome}`}
                        onChange={(e) => mudaPlano(p.id, { incluidos: { ...p.incluidos, [m.id]: Math.max(0, Number(e.target.value) || 0) } })} /></label>
                    ) : m.cobranca === 'cardapio' ? (
                      <span className="dica">—</span>
                    ) : (
                      <input type="checkbox" checked={p.modulos.includes(m.id)} onChange={() => alterna(p.id, m.id)} aria-label={`${m.nome} no plano ${p.nome}`} style={{ width: 'auto' }} />
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td>Descrição (aparece para o cliente)</td>
              <td />
              {ps.map((p) => <td key={p.id}><textarea rows={3} maxLength={300} value={p.descricao} onChange={(e) => mudaPlano(p.id, { descricao: e.target.value })} aria-label={`Descrição do plano ${p.nome}`} /></td>)}
            </tr>
            <tr>
              <td>Disponível para novos clientes</td>
              <td />
              {ps.map((p) => <td key={p.id}><input type="checkbox" checked={p.ativo} onChange={(e) => mudaPlano(p.id, { ativo: e.target.checked })} aria-label={`Plano ${p.nome} disponível`} style={{ width: 'auto' }} /></td>)}
            </tr>
          </tbody>
        </table>
      </section>
      <label className="linha" style={{ gap: 'var(--e2)', maxWidth: '28rem' }}>Desconto no plano anual (%)
        <input type="number" min={0} max={60} step={1} value={desc} onChange={(e) => setDesc(e.target.value)} style={{ width: '6rem' }} />
        <span className="dica">vale para plano, adicionais e aparelhos</span>
      </label>
      {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}
      <div><button type="button" className="botao-primario" disabled={pendente} onClick={salvarTudo}>{pendente ? 'Salvando…' : 'Salvar planos e preços'}</button></div>
    </div>
  );
}
