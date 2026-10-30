/** Financeiro (D-060): tipos e contas do DRE, sem dependências de servidor. */

export type TipoLanc = 'despesa' | 'receita';
export type Linha = 'outras_receitas' | 'aportes' | 'impostos' | 'custo_vendas' | 'despesas_operacionais' | 'despesas_financeiras' | 'outras_despesas' | 'retiradas';

export interface Categoria {
  id: string;
  tipo: TipoLanc;
  linha: Linha;
  grupo: string;
  nome: string;
  ativo: boolean;
  ordem: number;
}
export interface Fornecedor {
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  observacao: string | null;
  ativo: boolean;
}
export interface ContaFin {
  id: string;
  nome: string;
  tipo: 'caixa' | 'banco' | 'carteira';
  ativo: boolean;
}
export interface Taxa {
  forma: string;
  percentual: number;
  fixa: number;
  dias: number;
}
export interface Lancamento {
  id: string;
  tipo: TipoLanc;
  descricao: string;
  valor: number;
  vencimento: string;
  competencia: string;
  categoria_id: string | null;
  fornecedor_id: string | null;
  conta_id: string | null;
  forma: string | null;
  pago_em: string | null;
  serie: string | null;
  parcela: number | null;
  parcelas: number | null;
  recorrente: boolean;
  origem: 'manual' | 'custo' | 'nfe';
  observacao: string | null;
}
export interface NfePendente {
  id: string;
  numero: string | null;
  emissao: string | null;
  emitente: string | null;
  cnpj: string | null;
  valor: number;
}
export interface MesDre {
  mes: number;
  vendas: number;
  pedidos: number;
  taxas: number;
  cmv_estoque: number | null;
  linhas: Partial<Record<Linha, number>>;
  sem_categoria: Partial<Record<TipoLanc, number>>;
}

export const LINHAS: Record<Linha, string> = {
  outras_receitas: 'Outras receitas',
  aportes: 'Aportes (fora do resultado)',
  impostos: 'Impostos sobre vendas',
  custo_vendas: 'Custo das vendas',
  despesas_operacionais: 'Despesas operacionais',
  despesas_financeiras: 'Despesas financeiras',
  outras_despesas: 'Outras despesas / investimentos',
  retiradas: 'Retiradas dos sócios',
};

export const FORMAS_VENDA: Record<string, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  vale_refeicao: 'Vale-refeição',
  online: 'Pagamento online',
};
export const DICA_TAXA: Record<string, string> = {
  dinheiro: 'normalmente 0%',
  pix: '0% no Pix direto; ~1% no Pix da maquininha',
  cartao_credito: 'costuma ficar entre 2,5% e 4%',
  cartao_debito: 'costuma ficar entre 1% e 2%',
  vale_refeicao: 'costuma ficar entre 4% e 7%',
  online: 'Mercado Pago: confira no seu plano',
};
export const FORMAS_LANC = ['Pix', 'Boleto', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência', 'Débito automático'];

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const pctTxt = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
export const dataBr = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '—');
export const hojeSP = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
export const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export type Situacao = 'pago' | 'vencido' | 'hoje' | 'aberto';
export function situacao(l: Pick<Lancamento, 'pago_em' | 'vencimento'>, hoje = hojeSP()): Situacao {
  if (l.pago_em) return 'pago';
  if (l.vencimento < hoje) return 'vencido';
  if (l.vencimento === hoje) return 'hoje';
  return 'aberto';
}

/** Linhas do DRE de um mês. Custo das vendas: CMV do estoque quando houver; senão, as contas lançadas. */
export function calcularDre(m: MesDre) {
  const L = (k: Linha) => m.linhas[k] ?? 0;
  const bruta = m.vendas + L('outras_receitas') + (m.sem_categoria.receita ?? 0);
  const impostos = L('impostos');
  const liquida = bruta - impostos;
  const custo = m.cmv_estoque ?? L('custo_vendas');
  const lucroBruto = liquida - custo;
  const operacionais = L('despesas_operacionais') + (m.sem_categoria.despesa ?? 0);
  const lucroOperacional = lucroBruto - operacionais;
  const financeiras = m.taxas + L('despesas_financeiras');
  const outras = L('outras_despesas');
  const liquido = lucroOperacional - financeiras - outras;
  const retiradas = L('retiradas');
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return {
    bruta: r2(bruta),
    vendas: r2(m.vendas),
    outrasReceitas: r2(L('outras_receitas') + (m.sem_categoria.receita ?? 0)),
    impostos: r2(impostos),
    liquida: r2(liquida),
    custo: r2(custo),
    custoDoEstoque: m.cmv_estoque != null,
    lucroBruto: r2(lucroBruto),
    operacionais: r2(operacionais),
    lucroOperacional: r2(lucroOperacional),
    taxas: r2(m.taxas),
    outrasFinanceiras: r2(L('despesas_financeiras')),
    financeiras: r2(financeiras),
    outras: r2(outras),
    liquido: r2(liquido),
    retiradas: r2(retiradas),
    sobra: r2(liquido - retiradas),
    margem: bruta > 0 ? (liquido / bruta) * 100 : null,
    cmvPct: m.vendas > 0 ? (custo / m.vendas) * 100 : null,
  };
}
export type Dre = ReturnType<typeof calcularDre>;

export function somarMeses(ms: MesDre[]): MesDre {
  const linhas: Partial<Record<Linha, number>> = {};
  const sem: Partial<Record<TipoLanc, number>> = {};
  let cmv: number | null = null;
  for (const m of ms) {
    for (const [k, v] of Object.entries(m.linhas)) linhas[k as Linha] = (linhas[k as Linha] ?? 0) + Number(v);
    for (const [k, v] of Object.entries(m.sem_categoria)) sem[k as TipoLanc] = (sem[k as TipoLanc] ?? 0) + Number(v);
  }
  // CMV: soma o do estoque onde houver e o lançado onde não houver (cada mês decide)
  const custoMisto = ms.reduce((s, m) => s + (m.cmv_estoque ?? m.linhas.custo_vendas ?? 0), 0);
  if (ms.some((m) => m.cmv_estoque != null)) cmv = custoMisto;
  return {
    mes: 0,
    vendas: ms.reduce((s, m) => s + m.vendas, 0),
    pedidos: ms.reduce((s, m) => s + m.pedidos, 0),
    taxas: ms.reduce((s, m) => s + m.taxas, 0),
    cmv_estoque: cmv,
    linhas: cmv != null ? { ...linhas, custo_vendas: custoMisto } : linhas,
    sem_categoria: sem,
  };
}
