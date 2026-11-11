/** Relatórios (D-065): curva ABC. Sem dependências de servidor. */

export type ClasseAbc = 'A' | 'B' | 'C';
export interface LinhaAbc<T> {
  item: T;
  base: number;
  pct: number;
  acumulado: number;
  classe: ClasseAbc;
}

/**
 * Curva ABC: ordena pelo peso (valor, ou quantidade quando não há valor) e classifica pelo acumulado:
 * A = os que somam os primeiros 80%, B = até 95%, C = o resto.
 */
export function curvaAbc<T>(itens: T[], peso: (x: T) => number): LinhaAbc<T>[] {
  const ord = itens.map((item) => ({ item, base: Math.max(0, peso(item)) })).filter((x) => x.base > 0).sort((a, b) => b.base - a.base);
  const total = ord.reduce((a, x) => a + x.base, 0) || 1;
  let acc = 0;
  return ord.map((x) => {
    const antes = acc;
    acc += x.base;
    const pctAntes = (antes / total) * 100;
    return { ...x, pct: (x.base / total) * 100, acumulado: (acc / total) * 100, classe: pctAntes < 80 ? 'A' : pctAntes < 95 ? 'B' : 'C' };
  });
}

export const ETAPA: Record<string, string> = { novo: 'Novo (antes de aceitar)', em_preparo: 'Em preparo', pronto: 'Pronto', em_entrega: 'Saiu para entrega', concluido: 'Concluído' };
export const ORIGEM: Record<string, string> = { painel: 'Lançado na loja', cardapio_digital: 'Cardápio digital', ifood: 'iFood', whatsapp: 'WhatsApp' };
