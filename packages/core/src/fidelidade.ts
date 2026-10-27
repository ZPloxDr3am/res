// Programa de fidelidade (D-031): cashback e pontos, valendo nas lojas do grupo. O banco faz as
// mesmas contas (private.ganho_fidelidade); os testes dos dois usam os mesmos casos.
// Valores em centavos; pontos inteiros.

export type CanalFidelidade = 'cardapio_digital' | 'balcao_entrega' | 'balcao';
export const CANAIS_FIDELIDADE: { id: CanalFidelidade; rotulo: string }[] = [
  { id: 'cardapio_digital', rotulo: 'Cardápio digital' },
  { id: 'balcao_entrega', rotulo: 'Delivery lançado no balcão/telefone' },
  { id: 'balcao', rotulo: 'Balcão e retirada' },
];

export type ConfigFidelidade = {
  canais: CanalFidelidade[];
  cashbackAtivo: boolean;
  /** % padrão */
  cashbackPct: number;
  /** % por dia da semana (0 = domingo); ausente = padrão */
  cashbackPctDia: Partial<Record<number, number>>;
  /** dias em que ganha e usa (0 = domingo) */
  cashbackDias: number[];
  /** saldo vale N dias depois do último pedido (0 = não vence) */
  cashbackValidadeDias: number;
  /** saldo mínimo para usar (centavos) */
  cashbackMinimo: number;
  /** usar no máximo X% do pedido (null = sem limite) */
  cashbackMaxPct: number | null;
  pontosAtivo: boolean;
  /** pontos por R$ 1 gasto em produtos */
  pontosPorReal: number;
  /** pontos por R$ 1 de taxa de entrega */
  pontosPorRealTaxa: number;
  pontosValidadeDias: number;
  pontosBoasVindas: number;
};

export const CONFIG_FIDELIDADE_PADRAO: ConfigFidelidade = {
  canais: ['cardapio_digital', 'balcao_entrega', 'balcao'],
  cashbackAtivo: false,
  cashbackPct: 5,
  cashbackPctDia: {},
  cashbackDias: [0, 1, 2, 3, 4, 5, 6],
  cashbackValidadeDias: 60,
  cashbackMinimo: 0,
  cashbackMaxPct: null,
  pontosAtivo: false,
  pontosPorReal: 1,
  pontosPorRealTaxa: 0,
  pontosValidadeDias: 180,
  pontosBoasVindas: 0,
};

export function canalFidelidade(origem: string, tipo: string): CanalFidelidade {
  if (origem === 'cardapio_digital') return 'cardapio_digital';
  return tipo === 'entrega' ? 'balcao_entrega' : 'balcao';
}

export const pctCashbackDoDia = (c: ConfigFidelidade, dia: number) =>
  c.cashbackDias.includes(dia) ? (c.cashbackPctDia[dia] ?? c.cashbackPct) : 0;

export type PedidoFidelidade = {
  /** total pago (já com descontos), centavos */
  total: number;
  taxaEntrega: number;
  /** dia da semana do pedido (0 = domingo) */
  dia: number;
  canal: CanalFidelidade;
  /** primeiro pedido do cliente no grupo */
  primeiro: boolean;
};

/** Quanto o cliente ganha ao concluir o pedido. Taxa de entrega não gera cashback. */
export function ganhoFidelidade(c: ConfigFidelidade, p: PedidoFidelidade): { cashback: number; pontos: number } {
  if (!c.canais.includes(p.canal)) return { cashback: 0, pontos: 0 };
  const taxaPaga = Math.min(p.taxaEntrega, Math.max(0, p.total));
  const base = Math.max(0, p.total - taxaPaga);
  const cashback = c.cashbackAtivo ? Math.round((base * pctCashbackDoDia(c, p.dia)) / 100) : 0;
  const pontos = c.pontosAtivo
    ? Math.floor((base * c.pontosPorReal) / 100 + 1e-9) + Math.floor((taxaPaga * c.pontosPorRealTaxa) / 100 + 1e-9) + (p.primeiro ? c.pontosBoasVindas : 0)
    : 0;
  return { cashback, pontos };
}

/** Quanto do saldo de cashback dá para usar neste pedido (centavos). */
export function cashbackUsavel(c: ConfigFidelidade, saldo: number, aPagar: number, dia: number, canal: CanalFidelidade): number {
  if (!c.cashbackAtivo || !c.canais.includes(canal) || !c.cashbackDias.includes(dia)) return 0;
  if (saldo <= 0 || saldo < c.cashbackMinimo) return 0;
  const teto = c.cashbackMaxPct == null ? aPagar : Math.floor((aPagar * c.cashbackMaxPct) / 100);
  return Math.max(0, Math.min(saldo, teto, aPagar));
}

/** Retorno de cada R$ 1 dado em desconto. */
export const roi = (faturamento: number, desconto: number) => (desconto > 0 ? Math.round((faturamento / desconto) * 100) / 100 : null);
export function faixaRoi(r: number | null): 'excelente' | 'bom' | 'ok' | 'atencao' | null {
  if (r == null) return null;
  return r >= 5 ? 'excelente' : r >= 2 ? 'bom' : r >= 1 ? 'ok' : 'atencao';
}

/**
 * Recomendação por dia da semana: dia fraco (abaixo de 85% da média) pede uma ação do dia;
 * desconto que não se paga (ROI < 2) pede revisão; dia forte com pouca fidelidade, explorar.
 */
export function recomendacaoDia(faturamento: number, mediaDias: number, roiDia: number | null, pctFidelidade: number): 'criar' | 'revisar' | 'explorar' | 'manter' {
  if (roiDia != null && roiDia < 2) return 'revisar';
  if (mediaDias > 0 && faturamento < mediaDias * 0.85) return 'criar';
  if (pctFidelidade < 5) return 'explorar';
  return 'manter';
}

/** Casos usados também no teste do banco (paridade). */
export const CASOS_GANHO: { cfg: Partial<ConfigFidelidade>; p: PedidoFidelidade; esperado: { cashback: number; pontos: number } }[] = [
  { cfg: { cashbackAtivo: true, cashbackPct: 5 }, p: { total: 10000, taxaEntrega: 0, dia: 3, canal: 'cardapio_digital', primeiro: false }, esperado: { cashback: 500, pontos: 0 } },
  { cfg: { cashbackAtivo: true, cashbackPct: 5 }, p: { total: 10800, taxaEntrega: 800, dia: 3, canal: 'balcao_entrega', primeiro: false }, esperado: { cashback: 500, pontos: 0 } },
  { cfg: { cashbackAtivo: true, cashbackPct: 5, cashbackPctDia: { 3: 10 } }, p: { total: 4990, taxaEntrega: 0, dia: 3, canal: 'balcao', primeiro: false }, esperado: { cashback: 499, pontos: 0 } },
  { cfg: { cashbackAtivo: true, cashbackPct: 5, cashbackDias: [5, 6] }, p: { total: 9000, taxaEntrega: 0, dia: 3, canal: 'balcao', primeiro: false }, esperado: { cashback: 0, pontos: 0 } },
  { cfg: { cashbackAtivo: true, cashbackPct: 5, canais: ['cardapio_digital'] }, p: { total: 9000, taxaEntrega: 0, dia: 3, canal: 'balcao', primeiro: false }, esperado: { cashback: 0, pontos: 0 } },
  { cfg: { pontosAtivo: true, pontosPorReal: 1 }, p: { total: 4990, taxaEntrega: 0, dia: 1, canal: 'cardapio_digital', primeiro: false }, esperado: { cashback: 0, pontos: 49 } },
  { cfg: { pontosAtivo: true, pontosPorReal: 1.5, pontosPorRealTaxa: 2, pontosBoasVindas: 50 }, p: { total: 10800, taxaEntrega: 800, dia: 1, canal: 'balcao_entrega', primeiro: true }, esperado: { cashback: 0, pontos: 216 } },
  { cfg: { cashbackAtivo: true, cashbackPct: 3, pontosAtivo: true, pontosPorReal: 1 }, p: { total: 333, taxaEntrega: 500, dia: 0, canal: 'cardapio_digital', primeiro: false }, esperado: { cashback: 0, pontos: 0 } },
];
