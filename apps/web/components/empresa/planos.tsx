'use client';
import { useState, useTransition } from 'react';
import { type ModuloRes, type PlanoRes } from '@res/core';
import { salvarPlano, salvarPrecoModulo } from '@/app/empresa/actions';

const num = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));
const txt = (n: number) => Number(n).toFixed(2).replace('.', ',');

/** Editor de planos (D-085): preço por loja, módulos de cada plano e preço do adicional. */
export function PlanosRes({ planos, modulos }: { planos: PlanoRes[]; modulos: ModuloRes[] }) {
  const [ps, setPs] = useState(() => planos.map((p) => ({ ...p, precoTxt: txt(p.preco_loja) })));
  const [ms, setMs] = useState(() => modulos.map((m) => ({ ...m, precoTxt: txt(m.preco) })));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const mudaPlano = (id: string, f: Partial<(typeof ps)[number]>) => setPs((x) => x.map((p) => (p.id === id ? { ...p, ...f } : p)));
  const alterna = (id: string, m: string) => setPs((x) => x.map((p) => (p.id === id ? { ...p, modulos: p.modulos.includes(m) ? p.modulos.filter((y) => y !== m) : [...p.modulos, m] } : p)));
  const salvarTudo = () =>
    iniciar(async () => {
      setMsg(null);
      for (const p of ps) {
        const r = await salvarPlano({ id: p.id, nome: p.nome, descricao: p.descricao, preco: num(p.precoTxt), modulos: p.modulos, ativo: p.ativo });
        if (!r.ok) return setMsg({ ok: false, t: `${p.nome}: ${r.erro}` });
      }
      for (const m of ms) {
        if (num(m.precoTxt) === Number(m.preco)) continue;
        const r = await salvarPrecoModulo(m.id, num(m.precoTxt));
        if (!r.ok) return setMsg({ ok: false, t: `${m.nome}: ${r.erro}` });
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
              <td><strong>Preço por loja (R$/mês)</strong></td>
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
                <td>{m.nome}<br /><span className="dica">{m.cobranca === 'cardapio' ? 'cobra por cardápio além do 1º de cada loja' : m.descricao}</span></td>
                <td><input type="text" inputMode="decimal" value={m.precoTxt} onChange={(e) => setMs((x) => x.map((y) => (y.id === m.id ? { ...y, precoTxt: e.target.value } : y)))} aria-label={`Preço do adicional ${m.nome}`} /></td>
                {ps.map((p) => (
                  <td key={p.id}><input type="checkbox" checked={p.modulos.includes(m.id)} onChange={() => alterna(p.id, m.id)} aria-label={`${m.nome} no plano ${p.nome}`} style={{ width: 'auto' }} /></td>
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
      {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}
      <div><button type="button" className="botao-primario" disabled={pendente} onClick={salvarTudo}>{pendente ? 'Salvando…' : 'Salvar planos e preços'}</button></div>
    </div>
  );
}
