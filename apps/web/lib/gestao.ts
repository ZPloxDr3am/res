// Gestão Empresarial (D-050): tipos e utilidades compartilhadas pelas telas e pelos documentos.

export type Custo = {
  id?: string;
  tipo: 'fixo' | 'variavel';
  nome: string;
  forma: 'valor' | 'percentual';
  /** R$ por mês (forma 'valor') ou % do faturamento (forma 'percentual') */
  valor: number;
  observacao: string | null;
  ordem: number;
};

export type Empresa = {
  razao_social: string | null;
  cnpj: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  responsavel: string | null;
  cargo_responsavel: string | null;
  faturamento_base: number | null;
};

export type Funcionario = {
  id: string;
  nome: string;
  cpf: string | null;
  rg: string | null;
  ctps: string | null;
  pis: string | null;
  cargo: string | null;
  admissao: string | null;
  nascimento: string | null;
  telefone: string | null;
  endereco: string | null;
  ativo: boolean;
  /** acesso ao RES ligado (D-052) */
  membro_id?: string | null;
};

export type Registro = {
  id: string;
  funcionario_id: string;
  tipo: 'falta' | 'advertencia';
  numero: number;
  data: string;
  data_fim: string | null;
  justificada: boolean | null;
  motivo: string;
  descricao: string | null;
  testemunha1: string | null;
  testemunha2: string | null;
  criado_em: string;
};

export const MOTIVOS_FALTA = ['Não compareceu sem aviso', 'Não compareceu com aviso', 'Atestado médico', 'Saiu antes do horário', 'Outro'];
export const MOTIVOS_ADVERTENCIA = [
  'Atraso',
  'Falta sem justificativa',
  'Descumprimento de normas da empresa',
  'Desrespeito com colegas ou clientes',
  'Uso de celular em horário de trabalho',
  'Higiene ou uniforme',
  'Negligência no trabalho',
  'Outro',
];

export const soDigitos = (t: string | null | undefined) => (t ?? '').replace(/\D/g, '');

/** CPF com dígitos verificadores corretos (11 dígitos). */
export function cpfValido(t: string): boolean {
  const c = soDigitos(t);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(c[9]) && dv(10) === Number(c[10]);
}

/** CNPJ com dígitos verificadores corretos (14 dígitos). */
export function cnpjValido(t: string): boolean {
  const c = soDigitos(t);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const dv = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const s = pesos.reduce((a, p, i) => a + Number(c[i]) * p, 0);
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(12) === Number(c[12]) && dv(13) === Number(c[13]);
}

export const formatarCpf = (t: string | null) => {
  const c = soDigitos(t);
  return c.length === 11 ? `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}` : t ?? '';
};
export const formatarCnpj = (t: string | null) => {
  const c = soDigitos(t);
  return c.length === 14 ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}` : t ?? '';
};
export const formatarCep = (t: string | null) => {
  const c = soDigitos(t);
  return c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : t ?? '';
};
/** "2026-10-28" → "28/10/2026" */
export const dataBr = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}/.test(d) ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '');

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
/** "2026-10-28" → "28 de outubro de 2026" */
export const dataExtenso = (d: string) => `${Number(d.slice(8, 10))} de ${MESES[Number(d.slice(5, 7)) - 1]} de ${d.slice(0, 4)}`;

export type ResumoCustos = {
  faturamento: number;
  fixos: number;
  variaveisValor: number;
  variaveisPct: number;
  variaveis: number;
  lucro: number;
  margemPct: number;
  /** faturamento mínimo para não ter prejuízo; null quando os variáveis passam de 100% */
  equilibrio: number | null;
};

/** Conta da planilha. Valores em reais; percentuais sobre o faturamento do mês. */
export function resumirCustos(custos: Pick<Custo, 'tipo' | 'forma' | 'valor'>[], faturamento: number): ResumoCustos {
  const fixos = custos.filter((c) => c.tipo === 'fixo').reduce((s, c) => s + c.valor, 0);
  const vv = custos.filter((c) => c.tipo === 'variavel' && c.forma === 'valor').reduce((s, c) => s + c.valor, 0);
  const vp = custos.filter((c) => c.tipo === 'variavel' && c.forma === 'percentual').reduce((s, c) => s + c.valor, 0);
  const variaveis = vv + (faturamento * vp) / 100;
  const lucro = faturamento - fixos - variaveis;
  // os variáveis em R$ entram no ponto de equilíbrio como % do faturamento atual (quando há faturamento)
  const pctTotal = vp + (faturamento > 0 ? (vv / faturamento) * 100 : 0);
  const equilibrio = pctTotal < 100 ? fixos / (1 - pctTotal / 100) : null;
  return { faturamento, fixos, variaveisValor: vv, variaveisPct: vp, variaveis, lucro, margemPct: faturamento > 0 ? (lucro / faturamento) * 100 : 0, equilibrio };
}
