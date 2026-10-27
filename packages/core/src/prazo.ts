// Prazo de entrega e lotes sugeridos na expedição (D-028).
import type { Ponto } from './entregas.js';
import { minutosEstimados, otimizarRota } from './rota.js';

/** Prazo prometido ao cliente (ms): o horário agendado ou o pedido + o prazo da loja. */
export function prazoEntrega(criadoEm: number, agendadoPara: number | null, prazoMin: number): number {
  return agendadoPara ?? criadoEm + prazoMin * 60_000;
}

export type SituacaoPrazo = { estado: 'ok' | 'perto' | 'atrasado'; minutos: number };

/** 'perto' quando faltam avisoMin minutos ou menos; minutos = quanto falta ou quanto passou. */
export function situacaoPrazo(prazo: number, agora: number, avisoMin = 10): SituacaoPrazo {
  const resta = (prazo - agora) / 60_000;
  if (resta < 0) return { estado: 'atrasado', minutos: Math.ceil(-resta) };
  return { estado: resta <= avisoMin ? 'perto' : 'ok', minutos: Math.floor(resta) };
}

export type PedidoExpedicao = { id: string; ponto: Ponto | null; bairro: string | null; prazo: number };
export type Lote = { ids: string[]; totalMin: number; atrasoMin: number };
export type OpcoesLote = { maxPorLote?: number; desvioMaxMin?: number };

const mesmoBairro = (a: string | null, b: string | null) =>
  !!a && !!b && a.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') === b.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Sugere quais pedidos prontos saem juntos. Começa pelo mais urgente e junta o que fica no
 * caminho: cada pedido a mais pode somar no máximo desvioMaxMin à volta e não pode fazer atrasar
 * quem já estava no lote. Sem local no mapa, junta só pelo mesmo bairro.
 */
export function agruparEntregas(pedidos: PedidoExpedicao[], loja: Ponto, agora: number, o: OpcoesLote = {}): Lote[] {
  const max = o.maxPorLote ?? 3;
  const desvio = o.desvioMaxMin ?? 8;
  const avaliar = (grupo: PedidoExpedicao[]) => {
    if (grupo.some((p) => !p.ponto)) return null;
    const pts = [loja, ...grupo.map((p) => p.ponto!)];
    return otimizarRota(grupo.map((p) => ({ id: p.id, ponto: p.ponto!, prazo: p.prazo })), (i, j) => minutosEstimados(pts[i]!, pts[j]!), agora);
  };
  const resto = [...pedidos].sort((a, b) => a.prazo - b.prazo);
  const lotes: Lote[] = [];
  while (resto.length) {
    const lote = [resto.shift()!];
    let atual = avaliar(lote);
    while (lote.length < max) {
      let melhor = -1;
      let melhorExtra = Infinity;
      let melhorR: ReturnType<typeof avaliar> = null;
      resto.forEach((c, k) => {
        const r = avaliar([...lote, c]);
        let extra: number;
        if (r && atual) {
          extra = r.totalMin - atual.totalMin;
          // não pode atrasar quem já estava no lote (além do que já ia atrasar)
          const antes = new Map(atual.paradas.map((x) => [x.id, x.atrasoMin]));
          if (r.paradas.some((x) => antes.has(x.id) && x.atrasoMin > antes.get(x.id)! + 2)) return;
          // nem fazer atrasar o pedido que entra (além do que atrasaria saindo sozinho)
          const sozinho = avaliar([c])!.atrasoTotalMin;
          if (r.atrasoTotalMin > atual.atrasoTotalMin + sozinho + 2) return;
        } else if (lote.every((p) => mesmoBairro(p.bairro, c.bairro))) {
          extra = 2;
        } else return;
        if (extra <= desvio && extra < melhorExtra) {
          melhor = k;
          melhorExtra = extra;
          melhorR = r;
        }
      });
      if (melhor < 0) break;
      lote.push(resto.splice(melhor, 1)[0]!);
      atual = melhorR;
    }
    const r = atual as ReturnType<typeof avaliar>;
    lotes.push({ ids: r ? r.ordem : lote.map((p) => p.id), totalMin: r?.totalMin ?? 0, atrasoMin: r?.atrasoTotalMin ?? 0 });
  }
  return lotes;
}
