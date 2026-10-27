import { test } from 'node:test';
import assert from 'node:assert/strict';
import { minutosEstimados, otimizarRota, type Parada } from '../src/rota.js';

// tempos em minutos entre: 0 = loja, 1 = A, 2 = B, 3 = C
const M = [
  [0, 5, 10, 15],
  [5, 0, 5, 10],
  [10, 5, 0, 5],
  [15, 10, 5, 0],
];
const t = (i: number, j: number) => M[i]![j]!;
const agora = Date.UTC(2026, 9, 27, 22, 0);
const min = (m: number) => agora + m * 60_000;

test('sem pressa: segue o caminho mais curto (A, B, C)', () => {
  const p: Parada[] = [
    { id: 'C', ponto: { lat: 0, lng: 0 }, prazo: min(120) },
    { id: 'A', ponto: { lat: 0, lng: 0 }, prazo: min(120) },
    { id: 'B', ponto: { lat: 0, lng: 0 }, prazo: min(120) },
  ];
  const T = (i: number, j: number) => t([0, 3, 1, 2][i]!, [0, 3, 1, 2][j]!);
  const r = otimizarRota(p, T, agora, { minutosPorParada: 0 });
  assert.deepEqual(r.ordem, ['A', 'B', 'C']);
  assert.equal(r.totalMin, 15);
  assert.equal(r.atrasoTotalMin, 0);
});

test('pedido já atrasado vai primeiro, mesmo sendo mais longe', () => {
  const p: Parada[] = [
    { id: 'A', ponto: { lat: 0, lng: 0 }, prazo: min(60) },
    { id: 'B', ponto: { lat: 0, lng: 0 }, prazo: min(60) },
    { id: 'C', ponto: { lat: 0, lng: 0 }, prazo: min(-10) }, // já passou do prazo
  ];
  // C fica para o outro lado da loja: pelo caminho mais curto (A, B, C) ele chegaria por último
  const M2 = [
    [0, 5, 10, 8],
    [5, 0, 5, 13],
    [10, 5, 0, 18],
    [8, 13, 18, 0],
  ];
  const r = otimizarRota(p, (i, j) => M2[i]![j]!, agora, { minutosPorParada: 0 });
  assert.deepEqual(r.ordem, ['C', 'A', 'B']);
  assert.deepEqual(r.paradas.map((x) => x.id), r.ordem);
  assert.equal(r.paradas[0]!.atrasoMin, 18); // chega em 8 min, o prazo era há 10
});

test('muitas entregas usam a escolha passo a passo', () => {
  const pts = Array.from({ length: 10 }, (_, k) => ({ id: `P${k}`, ponto: { lat: -27.1 + k * 0.005, lng: -48.6 }, prazo: min(90) }));
  const todos = [{ lat: -27.1, lng: -48.6 }, ...pts.map((x) => x.ponto)];
  const r = otimizarRota(pts, (i, j) => minutosEstimados(todos[i]!, todos[j]!), agora);
  assert.equal(r.ordem.length, 10);
  assert.equal(new Set(r.ordem).size, 10);
  assert.deepEqual(r.ordem.slice(0, 3), ['P0', 'P1', 'P2']); // em linha: do mais perto ao mais longe
});
