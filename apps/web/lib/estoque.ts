// Tipos do JSON das funções de estoque (D-036). Custos em centavos (com decimais); saldo na unidade do insumo.
import type { UnidadeEstoque } from '@res/core';

export type Insumo = {
  id: string;
  nome: string;
  unidade: UnidadeEstoque;
  categoria: string | null;
  custo_medio: number;
  saldo: number;
  minimo: number | null;
  controla: boolean;
  aceita_negativo: boolean;
};
export type PainelEstoque = {
  compartilhado: boolean;
  pode_escolher: boolean;
  pode_mudar_modo: boolean;
  lojas: string[];
  insumos: Insumo[];
  valor_estoque: number;
  notas: number;
};
export type Movimento = {
  id: number;
  insumo: string;
  unidade: UnidadeEstoque;
  tipo: 'entrada_nfe' | 'entrada' | 'perda' | 'contagem' | 'venda' | 'estorno_venda';
  quantidade: number;
  custo_unit: number | null;
  saldo_apos: number;
  motivo: string | null;
  loja: string | null;
  pedido: number | null;
  em: string;
};
export type NotaImportada = { id: string; chave: string; numero: string; emitente: string; emissao: string | null; valor: number; itens: number; loja: string; em: string };
export type ItemFicha = { produto_id: string | null; opcao_id: string | null; insumo_id: string; insumo: string; unidade: UnidadeEstoque; quantidade: number; custo: number };

export const n = (v: unknown) => Number(v ?? 0);
/** 1,5 kg · 300 g · 12 un */
export function quantidadeTexto(q: number, u: string): string {
  const v = Math.round(q * 1000) / 1000;
  return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${u.toLowerCase()}`;
}

export type MovimentoDetalhado = Movimento & { valor: number; nf: string | null; fornecedor: string | null };
export type MovimentosFiltrados = {
  inicio: string;
  fim: string;
  total: number;
  resumo: { entradas: number; entradas_n: number; notas: number; vendas: number; pedidos: number; perdas: number; perdas_n: number; contagens: number; contagens_n: number };
  por_insumo: { insumo: string; unidade: string; entrou: number | null; saida: number | null; custo_vendas: number; custo_perdas: number }[];
  movimentos: MovimentoDetalhado[];
  fornecedores: { cnpj: string; nome: string }[];
};

export type ProdutoEstoque = { id: string; nome: string; categoria: string | null; imagem_url: string | null; preco: number | null; grupos: number; ficha: { insumo_id: string; quantidade: number }[]; custo: number };
export type MeuEstoque = {
  outras_lojas: number;
  lojas: { id: string; nome: string; estoque: string; produtos: ProdutoEstoque[] }[];
  /** insumos por estoque (loja ou grupo) */
  insumos: Record<string, Insumo[]>;
};
export type ContagemPainel = { de_nfe: string[]; ultima: Record<string, string> };

export type ResumoCmv = {
  estoque_inicial: number;
  compras: number;
  estoque_final: number;
  cmv_real: number;
  cmv_teorico: number;
  perdas: number;
  contagens: number;
  faturamento: number;
  pedidos: number;
};
export type FechamentoEstoque = {
  mes: string;
  inicio: string;
  fim: string;
  em_andamento: boolean;
  lojas: string[];
  resumo: ResumoCmv;
  historico: (ResumoCmv & { mes: string })[];
  contagem_fim: string | null;
  ultima_contagem: string | null;
  por_insumo: {
    insumo: string;
    unidade: string;
    q_inicial: number;
    inicial: number;
    q_compras: number;
    compras: number;
    q_final: number;
    final: number;
    q_real: number;
    real: number;
    q_teorico: number;
    teorico: number;
    perdas: number;
  }[];
};
export const pctDe = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
export const nomeMes = (ym: string) => {
  const [a, m] = ym.split('-').map(Number);
  const t = new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return t.charAt(0).toUpperCase() + t.slice(1);
};
