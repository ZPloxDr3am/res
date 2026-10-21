// Tipos do JSON de public.meus_caixas / public.resumo_caixa (valores em reais, como o banco devolve).
import { formatarReais, paraCentavos, type FormaPagamento } from '@res/core';

export type CaixaLista = {
  id: string;
  nome: string;
  pode_operar: boolean;
  operadores: string[];
  sessao: { id: string; numero: number; aberto_em: string; aberto_por: string | null } | null;
};
export type MeusCaixas = { caixas: CaixaLista[]; sem_caixa: number; ve_valores: boolean; cadastra: boolean };

export type FormaResumo = { forma: FormaPagamento; quantidade: number; vendas?: number; esperado?: number };
export type ResumoCaixa = {
  id: string;
  numero: number;
  status: 'aberto' | 'fechado';
  caixa: string;
  caixa_id: string;
  aberto_em: string;
  fechado_em: string | null;
  aberto_por: string | null;
  fechado_por: string | null;
  abertura: number;
  ve_valores: boolean;
  observacao: string | null;
  formas: FormaResumo[];
  sangrias: number | null;
  suprimentos: number | null;
  pedidos: number;
  movimentos: { tipo: 'sangria' | 'suprimento'; valor: number; descricao: string | null; em: string; por: string | null }[];
  diferencas: { forma: FormaPagamento; esperado: number; informado: number; diferenca: number }[] | null;
};

/** Reais (número do banco) → "R$ 1.234,50". */
export const r$ = (v: number | string | null | undefined) => formatarReais(paraCentavos(Number(v ?? 0)));

export const FUSO = 'America/Sao_Paulo';
export const dataHora = (iso: string | null, fuso = FUSO) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: fuso, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

/** Horas desde a abertura (para o alerta de caixa esquecido aberto). */
export const horasAberto = (iso: string, agora = Date.now()) => (agora - new Date(iso).getTime()) / 3600000;
export const ALERTA_HORAS = 16;
