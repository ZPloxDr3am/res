'use client';
import { useEffect, useState } from 'react';
import { brl, dataBr, hojeSP, type Lancamento } from '@/lib/financeiro';

const CHAVE = 'res_fin_saldo';
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const somaDias = (d: string, n: number) => {
  const x = new Date(`${d}T12:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

/** Fluxo de caixa dos próximos 30 dias: saldo de hoje + o que vence + as vendas previstas (média dos últimos 28 dias, líquida de taxas). */
export function FluxoCaixa({ abertos, vendaDiaLiquida }: { abertos: Lancamento[]; vendaDiaLiquida: number }) {
  const hoje = hojeSP();
  const [saldo, setSaldo] = useState('');
  const [comVendas, setComVendas] = useState(true);
  useEffect(() => {
    try {
      setSaldo(localStorage.getItem(CHAVE) ?? '');
    } catch {
      /* ignora */
    }
  }, []);
  const s0 = Number(saldo.replace(/\./g, '').replace(',', '.')) || 0;
  const dias = Array.from({ length: 31 }, (_, i) => somaDias(hoje, i));
  let acum = s0;
  let menor = { v: s0, dia: hoje };
  const linhas = dias.map((d, i) => {
    const doDia = abertos.filter((l) => (i === 0 ? l.vencimento <= d : l.vencimento === d));
    const sai = doDia.filter((l) => l.tipo === 'despesa').reduce((a, l) => a + l.valor, 0);
    const entra = doDia.filter((l) => l.tipo === 'receita').reduce((a, l) => a + l.valor, 0);
    const vendas = comVendas && i > 0 ? vendaDiaLiquida : 0;
    acum += entra + vendas - sai;
    if (acum < menor.v) menor = { v: acum, dia: d };
    return { d, sai, entra, vendas, saldo: acum, contas: doDia, atrasadas: i === 0 ? doDia.filter((l) => l.vencimento < d).length : 0 };
  });
  const saidas30 = linhas.reduce((a, l) => a + l.sai, 0);

  return (
    <div className="grade">
      <div className="cartao linha" style={{ alignItems: 'center', gap: '1rem' }}>
        <label className="grade" style={{ gap: '0.2rem' }}>
          Quanto tem hoje no caixa + banco?
          <input
            inputMode="decimal"
            placeholder="0,00"
            value={saldo}
            onChange={(e) => {
              setSaldo(e.target.value);
              try {
                localStorage.setItem(CHAVE, e.target.value);
              } catch {
                /* ignora */
              }
            }}
            style={{ maxWidth: '10rem' }}
          />
        </label>
        <label className="check" title="Média diária dos últimos 28 dias, já sem as taxas">
          <input type="checkbox" checked={comVendas} onChange={(e) => setComVendas(e.target.checked)} />
          Somar vendas previstas ({brl(vendaDiaLiquida)}/dia)
        </label>
        <span className="grade" style={{ gap: 0 }}>
          <span className="dica">A pagar em 30 dias</span>
          <strong>{brl(saidas30)}</strong>
        </span>
        <span className="grade" style={{ gap: 0 }}>
          <span className="dica">Saldo mais baixo</span>
          <strong style={{ color: menor.v < 0 ? 'var(--erro, #b91c1c)' : undefined }}>{brl(menor.v)} em {dataBr(menor.dia).slice(0, 5)}</strong>
        </span>
      </div>
      {menor.v < 0 && (
        <p className="cartao erro" style={{ margin: 0 }}>
          ⚠️ No ritmo atual o caixa fica negativo em {dataBr(linhas.find((l) => l.saldo < 0)!.d)}. Dá para negociar o vencimento de alguma conta ou segurar uma compra.
        </p>
      )}
      <div className="tabela-rolagem cartao" style={{ padding: 0 }}>
        <table className="tabela fin-fluxo">
          <thead>
            <tr>
              <th>Dia</th>
              <th>Contas</th>
              <th className="num">Entra</th>
              <th className="num">Sai</th>
              <th className="num">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.d} data-vazio={(!l.sai && !l.entra) || undefined}>
                <td>{l.d === hoje ? 'Hoje' : `${DIAS[new Date(`${l.d}T12:00:00Z`).getUTCDay()]} ${dataBr(l.d).slice(0, 5)}`}</td>
                <td style={{ whiteSpace: 'normal' }}>
                  {l.atrasadas > 0 && <span className="fin-selo" data-sit="vencido">{l.atrasadas} atrasada{l.atrasadas > 1 ? 's' : ''}</span>}{' '}
                  <span className="dica">{l.contas.map((c) => c.descricao).slice(0, 4).join(', ')}{l.contas.length > 4 ? ` +${l.contas.length - 4}` : ''}</span>
                </td>
                <td className="num">{l.entra + l.vendas ? brl(l.entra + l.vendas) : '—'}</td>
                <td className="num">{l.sai ? brl(l.sai) : '—'}</td>
                <td className="num" data-neg={l.saldo < 0 || undefined}><strong>{brl(l.saldo)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
