import type { ConfigFidelidade } from '@res/core';

// Tipos do JSON das funções de fidelidade (D-031). Valores em centavos; pontos inteiros.
export type Recompensa = { id: string; tipo: 'desconto' | 'produto'; nome: string; pontos: number; valor: number | null; produto_id: string | null; produto: string | null };
export type PainelFidelidade = {
  config: ConfigFidelidade | null;
  pode_editar: boolean;
  recompensas: Recompensa[];
  produtos: { id: string; nome: string; loja: string }[];
};
export type SaldoLinha = {
  id: string;
  nome: string;
  telefone: string;
  cashback: number;
  pontos: number;
  ultimo_pedido_em: string | null;
  cashback_vence_em: string | null;
  pontos_vence_em: string | null;
};
export type Saldos = { total_clientes: number; total_cashback: number; total_pontos: number; clientes: SaldoLinha[] };
export type Movimento = { tipo: 'cashback' | 'pontos'; natureza: 'ganho' | 'uso' | 'expirado' | 'ajuste' | 'estorno'; valor: number; pedido: number | null; loja: string | null; motivo: string | null; em: string };
export type SaldoCliente = { config: ConfigFidelidade; recompensas: Recompensa[]; cashback: number; pontos: number };
export type ProgramaPublico = { config: ConfigFidelidade; recompensas: Recompensa[] };

export type RelatorioFidelidade = {
  vendas: number;
  faturamento: number;
  vendas_fid: number;
  faturamento_fid: number;
  ticket_fid: number | null;
  ticket_sem: number | null;
  desconto_cupom: number;
  desconto_cashback: number;
  desconto_pontos: number;
  cashback_gerado: number;
  cashback_vencido: number;
  pontos_gerados: number;
  pontos_usados: number;
  mecanicas: { tipo: 'cupom' | 'cashback' | 'pontos'; nome: string; usos: number; desconto: number; faturamento: number }[];
  por_dia_semana: { dow: number; vendas: number; faturamento: number; fat_cupom: number; desc_cupom: number; fat_fid: number; desc_fid: number }[];
  por_perfil: { perfil: 'novo' | 'recorrente' | 'sem_cliente'; vendas: number; faturamento: number; desconto: number }[];
  por_origem: { origem: string; vendas: number; faturamento: number; desconto: number }[];
  por_dia: { dia: string; cupom: number; fidelidade: number; influenciado: number }[];
};

/** O banco devolve números como texto às vezes (numeric): normaliza a config. */
export function lerConfig(c: Record<string, unknown> | null): ConfigFidelidade | null {
  if (!c) return null;
  const n = (v: unknown) => (v == null || v === '' ? null : Number(v));
  return {
    canais: (c.canais as ConfigFidelidade['canais']) ?? [],
    cashbackAtivo: !!c.cashbackAtivo,
    cashbackPct: n(c.cashbackPct) ?? 0,
    cashbackPctDia: Object.fromEntries(Object.entries((c.cashbackPctDia as Record<string, unknown>) ?? {}).map(([k, v]) => [Number(k), Number(v)])),
    cashbackDias: ((c.cashbackDias as unknown[]) ?? []).map(Number),
    cashbackValidadeDias: n(c.cashbackValidadeDias) ?? 0,
    cashbackMinimo: n(c.cashbackMinimo) ?? 0,
    cashbackMaxPct: n(c.cashbackMaxPct),
    pontosAtivo: !!c.pontosAtivo,
    pontosPorReal: n(c.pontosPorReal) ?? 0,
    pontosPorRealTaxa: n(c.pontosPorRealTaxa) ?? 0,
    pontosValidadeDias: n(c.pontosValidadeDias) ?? 0,
    pontosBoasVindas: n(c.pontosBoasVindas) ?? 0,
  };
}
