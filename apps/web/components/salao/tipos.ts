import type { FormaPagamento, StatusPedido } from '@res/core';

/** Mesa ou comanda no mapa do salão (salao_mapa). */
export interface LocalSalao {
  id: string;
  tipo: 'mesa' | 'comanda';
  numero: number;
  nome: string | null;
  lugares: number | null;
  ativo: boolean;
  qr: string;
  conta: {
    id: string;
    status: 'aberta' | 'conta_pedida';
    pessoas: number;
    cliente: string | null;
    aberta_em: string;
    garcom: string | null;
    parcial: number;
    a_confirmar: number;
    prontos: number;
  } | null;
}

export interface MapaSalao {
  taxa_servico_pct: number;
  gestor: boolean;
  locais: LocalSalao[];
}

export interface RodadaSalao {
  id: string;
  numero: number;
  status: StatusPedido;
  criado_em: string;
  total: number;
  qr: boolean;
  observacao: string | null;
  itens: { nome: string; quantidade: number; total: number; observacao: string | null; pronto: boolean; opcoes: string | null }[];
}

/** Detalhe da conta (salao_conta). Valores em reais. */
export interface ContaSalao {
  id: string;
  status: 'aberta' | 'conta_pedida' | 'fechada' | 'cancelada';
  pessoas: number;
  cliente: string | null;
  aberta_em: string;
  fechada_em: string | null;
  local: { id: string; rotulo: string; tipo: 'mesa' | 'comanda'; numero: number };
  taxa_servico_pct: number;
  garcom: string | null;
  rodadas: RodadaSalao[];
  subtotal: number;
  base_taxa: number;
  pagamentos: { forma: FormaPagamento; valor: number }[];
  taxa_servico: number | null;
  desconto: number | null;
  total: number | null;
}

export const rotuloLocal = (l: { tipo: 'mesa' | 'comanda'; numero: number; nome?: string | null }) =>
  `${l.tipo === 'mesa' ? 'Mesa' : 'Comanda'} ${l.numero}${l.nome ? ` · ${l.nome}` : ''}`;
