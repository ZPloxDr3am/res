// Ordem das entregas de um motoboy com várias comandas (D-027).
// Mistura duas coisas: não deixar pedido atrasar (ou atrasar o menos possível — o mais atrasado
// vai antes) e rodar o mínimo. Com até 8 entregas testa todas as ordens; acima disso, escolhe passo
// a passo a melhor próxima.
import { distanciaReta, type Ponto } from './entregas.js';

export type Parada = { id: string; ponto: Ponto; /** prazo prometido (ms desde 1970) */ prazo: number };

export type ResultadoRota = {
  ordem: string[];
  /** previsão de chegada e atraso em cada parada, na ordem */
  paradas: { id: string; chegada: number; atrasoMin: number }[];
  totalMin: number;
  atrasoTotalMin: number;
};

export type OpcoesRota = {
  /** quanto pesa 1 minuto de atraso frente a 1 minuto a mais rodando (padrão 3) */
  pesoAtraso?: number;
  /** tempo parado em cada entrega (padrão 3 min) */
  minutosPorParada?: number;
};

/** Tempo de moto estimado sem mapa: linha reta × 1,4 a 25 km/h (cidade). */
export const minutosEstimados = (a: Ponto, b: Ponto) => (distanciaReta(a, b) * 1.4 * 60) / 25;

/**
 * tempo(i, j) em minutos, com 0 = ponto de partida e 1..n = paradas[0..n-1].
 * Sem matriz de rotas, use (i, j) => minutosEstimados(...).
 */
export function otimizarRota(paradas: Parada[], tempo: (i: number, j: number) => number, agora: number, o: OpcoesRota = {}): ResultadoRota {
  const peso = o.pesoAtraso ?? 3;
  const parada = o.minutosPorParada ?? 3;
  const n = paradas.length;

  const avaliar = (seq: number[]) => {
    let t = agora;
    let anterior = 0;
    let rodando = 0;
    let atraso = 0;
    const det: ResultadoRota['paradas'] = [];
    for (const k of seq) {
      const min = tempo(anterior, k + 1);
      rodando += min;
      t += min * 60_000;
      const a = Math.max(0, (t - paradas[k]!.prazo) / 60_000);
      atraso += a;
      det.push({ id: paradas[k]!.id, chegada: t, atrasoMin: Math.round(a) });
      t += parada * 60_000;
      anterior = k + 1;
    }
    return { custo: rodando + peso * atraso, rodando, atraso, det };
  };

  let melhor: number[] = [];
  if (n <= 8) {
    let melhorCusto = Infinity;
    const usados = new Array<boolean>(n).fill(false);
    const seq: number[] = [];
    const permutar = () => {
      if (seq.length === n) {
        const c = avaliar(seq).custo;
        if (c < melhorCusto - 1e-9) {
          melhorCusto = c;
          melhor = [...seq];
        }
        return;
      }
      for (let k = 0; k < n; k++) {
        if (usados[k]) continue;
        usados[k] = true;
        seq.push(k);
        permutar();
        seq.pop();
        usados[k] = false;
      }
    };
    permutar();
  } else {
    // muitas entregas: a cada passo, a próxima que menos custa (atraso pesa)
    const resto = new Set(paradas.map((_, k) => k));
    let t = agora;
    let anterior = 0;
    while (resto.size) {
      let escolhido = -1;
      let menor = Infinity;
      for (const k of resto) {
        const min = tempo(anterior, k + 1);
        const chegada = t + min * 60_000;
        const c = min + peso * Math.max(0, (chegada - paradas[k]!.prazo) / 60_000) - peso * Math.max(0, (t - paradas[k]!.prazo) / 60_000) * 0.5;
        if (c < menor) {
          menor = c;
          escolhido = k;
        }
      }
      melhor.push(escolhido);
      resto.delete(escolhido);
      t += (tempo(anterior, escolhido + 1) + parada) * 60_000;
      anterior = escolhido + 1;
    }
  }
  const r = avaliar(melhor);
  return { ordem: melhor.map((k) => paradas[k]!.id), paradas: r.det, totalMin: Math.round(r.rodando), atrasoTotalMin: Math.round(r.atraso) };
}
