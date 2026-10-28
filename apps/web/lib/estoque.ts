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
