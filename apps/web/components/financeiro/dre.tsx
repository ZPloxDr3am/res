import { brl, calcularDre, MESES, pctTxt, somarMeses, type Dre, type MesDre } from '@/lib/financeiro';

type Row = { rotulo: string; v: (d: Dre) => number | null; nivel: 'total' | 'item' | 'sub' | 'pct'; dica?: string; sinal?: -1 };
const LINHAS: Row[] = [
  { rotulo: 'Receita bruta', v: (d) => d.bruta, nivel: 'total' },
  { rotulo: 'Vendas (pedidos concluídos)', v: (d) => d.vendas, nivel: 'item' },
  { rotulo: 'Outras receitas', v: (d) => d.outrasReceitas, nivel: 'item' },
  { rotulo: '(−) Impostos sobre vendas', v: (d) => d.impostos, nivel: 'item', sinal: -1 },
  { rotulo: 'Receita líquida', v: (d) => d.liquida, nivel: 'total' },
  { rotulo: '(−) Custo das vendas (CMV)', v: (d) => d.custo, nivel: 'item', sinal: -1, dica: 'Do estoque (CMV real) quando houver movimento no mês; senão, as contas lançadas em "Custo das vendas".' },
  { rotulo: 'CMV % das vendas', v: (d) => d.cmvPct, nivel: 'pct' },
  { rotulo: 'Lucro bruto', v: (d) => d.lucroBruto, nivel: 'total' },
  { rotulo: '(−) Despesas operacionais', v: (d) => d.operacionais, nivel: 'item', sinal: -1 },
  { rotulo: 'Lucro operacional', v: (d) => d.lucroOperacional, nivel: 'total' },
  { rotulo: '(−) Taxas das formas de pagamento', v: (d) => d.taxas, nivel: 'sub', sinal: -1, dica: 'Calculadas sozinhas pelas taxas que você informou em Cadastros.' },
  { rotulo: '(−) Outras despesas financeiras', v: (d) => d.outrasFinanceiras, nivel: 'sub', sinal: -1 },
  { rotulo: '(−) Outras despesas / investimentos', v: (d) => d.outras, nivel: 'item', sinal: -1 },
  { rotulo: 'Lucro líquido', v: (d) => d.liquido, nivel: 'total' },
  { rotulo: 'Margem líquida', v: (d) => d.margem, nivel: 'pct' },
  { rotulo: '(−) Retiradas dos sócios', v: (d) => d.retiradas, nivel: 'item', sinal: -1 },
  { rotulo: 'Sobra no caixa da empresa', v: (d) => d.sobra, nivel: 'total' },
];

/** DRE do ano, mês a mês (D-060). Meses sem nada ficam apagados. */
export function TabelaDre({ meses, ate }: { meses: MesDre[]; ate: number }) {
  const usados = meses.filter((m) => m.mes <= ate);
  const dres = meses.map((m) => calcularDre(m));
  const total = calcularDre(somarMeses(usados));
  const vazio = (m: MesDre) => m.vendas === 0 && Object.keys(m.linhas).length === 0 && Object.keys(m.sem_categoria).length === 0;
  const fmt = (r: Row, v: number | null) => (v == null ? '—' : r.nivel === 'pct' ? pctTxt(v) : v === 0 ? '—' : brl(v));
  return (
    <div className="tabela-rolagem cartao" style={{ padding: 0 }}>
      <table className="tabela fin-dre">
        <thead>
          <tr>
            <th>DRE</th>
            {MESES.map((m, i) => <th key={m} className="num" data-vazio={vazio(meses[i]!) || undefined}>{m}</th>)}
            <th className="num">Total</th>
          </tr>
        </thead>
        <tbody>
          {LINHAS.map((r) => (
            <tr key={r.rotulo} data-nivel={r.nivel}>
              <td title={r.dica}>{r.rotulo}{r.dica ? ' ⓘ' : ''}</td>
              {dres.map((d, i) => {
                const v = r.v(d);
                return (
                  <td key={i} className="num" data-vazio={vazio(meses[i]!) || undefined} data-neg={(r.nivel === 'total' && v != null && v < 0) || undefined}>
                    {fmt(r, v)}
                    {r.rotulo.startsWith('(−) Custo') && d.custoDoEstoque && v ? <span className="dica" title="CMV real do estoque"> ⓔ</span> : null}
                  </td>
                );
              })}
              <td className="num" data-neg={(r.nivel === 'total' && (r.v(total) ?? 0) < 0) || undefined}><strong>{fmt(r, r.v(total))}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Exporta o DRE em CSV (abre no Excel). */
export function csvDre(meses: MesDre[]): string {
  const dres = meses.map((m) => calcularDre(m));
  const total = calcularDre(somarMeses(meses));
  const num = (v: number | null) => (v == null ? '' : v.toFixed(2).replace('.', ','));
  const linhas = [['DRE', ...MESES, 'Total'].join(';')];
  for (const r of LINHAS) linhas.push([r.rotulo, ...dres.map((d) => num(r.v(d))), num(r.v(total))].join(';'));
  return linhas.join('\n');
}
