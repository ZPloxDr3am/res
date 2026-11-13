import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avaliarMaquininha, categoriaPerda, resumoPerdas } from '../src/perdas.js';

test('motivo da perda vira categoria', () => {
  assert.equal(categoriaPerda('venceu ontem'), 'Venceu');
  assert.equal(categoriaPerda('Produto: Pizza × 1 — caiu no chão'), 'Caiu / quebrou');
  assert.equal(categoriaPerda('queimou no forno'), 'Erro no preparo');
  assert.equal(categoriaPerda('lanche da equipe'), 'Consumo da equipe');
  assert.equal(categoriaPerda('xyz'), 'Outros');
  assert.equal(categoriaPerda(null), 'Outros');
});

test('resumo das perdas por motivo e insumo', () => {
  const r = resumoPerdas([
    { insumo: 'Mussarela', unidade: 'KG', quantidade: 0.5, valor: 2000, motivo: 'venceu', em: '2026-11-10' },
    { insumo: 'Mussarela', unidade: 'KG', quantidade: 0.25, valor: 1000, motivo: 'caiu', em: '2026-11-11' },
    { insumo: 'Tomate', unidade: 'KG', quantidade: 1, valor: 800, motivo: 'estragou', em: '2026-11-12' },
  ]);
  assert.equal(r.total, 3800);
  assert.deepEqual(r.porMotivo.map((m) => [m.motivo, m.valor]), [['Venceu', 2000], ['Caiu / quebrou', 1000], ['Estragou', 800]]);
  assert.deepEqual(r.porInsumo[0], { insumo: 'Mussarela', unidade: 'KG', quantidade: 0.75, valor: 3000 });
});

test('maquininha: taxa real contra a combinada e alerta', () => {
  const ok = avaliarMaquininha({ mes: '2026-10', bruto: 1_000_000, esperado: 970_000, recebido: 969_000, vendas: 300 });
  assert.deepEqual([ok.taxaCombinada, ok.taxaReal, ok.alerta, ok.diferenca], [3, 3.1, false, -1000]);
  const ruim = avaliarMaquininha({ mes: '2026-10', bruto: 1_000_000, esperado: 970_000, recebido: 950_000, vendas: 300 });
  assert.deepEqual([ruim.taxaReal, ruim.alerta], [5, true]);
  assert.equal(avaliarMaquininha({ mes: 'x', bruto: 0, esperado: 0, recebido: 0, vendas: 0 }).taxaCombinada, null);
});
