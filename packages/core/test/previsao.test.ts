import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preverInsumo, proximosDias } from '../src/previsao.js';

// 2026-11-13 é sexta (dow 5)
const SEMANA = [0, 1, 1, 1, 2, 5, 6]; // dom … sáb (kg)

test('previsão: soma por dia da semana, quando acaba e quanto comprar', () => {
  const p = preverInsumo(SEMANA, 10, 2, '2026-11-13', 7);
  assert.equal(p.previsto, 16);
  assert.equal(p.porDia, 16 / 7 > 0 ? Math.round((16 / 7) * 1000) / 1000 : 0);
  assert.equal(p.acabaEm, '2026-11-14'); // sexta 5 + sábado 6 = 11 > 10
  assert.equal(p.comprar, 8); // 16 + 2 − 10
  const folga = preverInsumo(SEMANA, 50, 2, '2026-11-13', 7);
  assert.deepEqual([folga.acabaEm, folga.comprar], [null, 0]);
  assert.equal(preverInsumo([0, 0, 0, 0, 0, 0, 0], -3, null, '2026-11-13', 7).comprar, 0);
});

test('próximos dias para a produção', () => {
  const d = proximosDias('2026-11-13', 3);
  assert.deepEqual(d.map((x) => [x.data, x.dow]), [['2026-11-14', 6], ['2026-11-15', 0], ['2026-11-16', 1]]);
  assert.equal(d[0]!.rotulo, 'amanhã (sábado)');
  assert.equal(d[2]!.rotulo, 'segunda 16/11');
});
