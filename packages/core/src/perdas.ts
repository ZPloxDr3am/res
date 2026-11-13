// Perdas e conferência da maquininha (D-109). Valores em centavos.

export const MOTIVOS_PERDA = ['Venceu', 'Estragou', 'Caiu / quebrou', 'Erro no preparo', 'Devolvido pelo cliente', 'Consumo da equipe'] as const;

const SINONIMOS: [RegExp, (typeof MOTIVOS_PERDA)[number]][] = [
  [/venc|validade/i, 'Venceu'],
  [/estrag|podre|mofo|azed|fora da temperatura/i, 'Estragou'],
  [/ca[ií]u|quebr|derrub|derram/i, 'Caiu / quebrou'],
  [/erro|errad|queim|passou do ponto|refeito|refazer/i, 'Erro no preparo'],
  [/devol|reclama/i, 'Devolvido pelo cliente'],
  [/equipe|funcion|consumo interno|lanche/i, 'Consumo da equipe'],
];

/** Agrupa o motivo digitado num dos motivos padrão (ou "Outros"). */
export function categoriaPerda(motivo: string | null): string {
  const m = (motivo ?? '').trim();
  for (const [re, cat] of SINONIMOS) if (re.test(m)) return cat;
  return 'Outros';
}

export type MovPerda = { insumo: string; unidade: string; quantidade: number; valor: number; motivo: string | null; em: string };

/** Perdas do período por motivo e por insumo, do maior valor para o menor. */
export function resumoPerdas(movs: MovPerda[]): { total: number; porMotivo: { motivo: string; valor: number; n: number }[]; porInsumo: { insumo: string; unidade: string; quantidade: number; valor: number }[] } {
  const mot = new Map<string, { valor: number; n: number }>();
  const ins = new Map<string, { unidade: string; quantidade: number; valor: number }>();
  let total = 0;
  for (const m of movs) {
    total += m.valor;
    const c = categoriaPerda(m.motivo);
    const a = mot.get(c) ?? { valor: 0, n: 0 };
    mot.set(c, { valor: a.valor + m.valor, n: a.n + 1 });
    const b = ins.get(m.insumo) ?? { unidade: m.unidade, quantidade: 0, valor: 0 };
    ins.set(m.insumo, { unidade: b.unidade, quantidade: Math.round((b.quantidade + m.quantidade) * 1000) / 1000, valor: b.valor + m.valor });
  }
  return {
    total,
    porMotivo: [...mot].map(([motivo, v]) => ({ motivo, ...v })).sort((a, b) => b.valor - a.valor),
    porInsumo: [...ins].map(([insumo, v]) => ({ insumo, ...v })).sort((a, b) => b.valor - a.valor),
  };
}

// ───────────────────────────── maquininha ─────────────────────────────

export type MesMaquininha = { mes: string; bruto: number; esperado: number; recebido: number; vendas: number };

/**
 * Compara o que devia cair (vendas no cartão menos as taxas combinadas, na data prevista) com o que caiu no
 * extrato vindo das maquininhas. Alerta quando caiu menos de 99% do esperado e a diferença passa de R$ 20.
 */
export function avaliarMaquininha(m: MesMaquininha): { diferenca: number; taxaCombinada: number | null; taxaReal: number | null; alerta: boolean } {
  const diferenca = m.recebido - m.esperado;
  const taxaCombinada = m.bruto > 0 ? Math.round((1 - m.esperado / m.bruto) * 1000) / 10 : null;
  const taxaReal = m.bruto > 0 && m.recebido > 0 ? Math.round((1 - m.recebido / m.bruto) * 1000) / 10 : null;
  return { diferenca, taxaCombinada, taxaReal, alerta: m.esperado > 0 && m.recebido < m.esperado * 0.99 && -diferenca > 2000 };
}
