import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASOS_GANHO, CONFIG_FIDELIDADE_PADRAO, cashbackUsavel, faixaRoi, ganhoFidelidade, recomendacaoDia, roi } from '../src/fidelidade.js';

test('ganho de cashback e pontos (mesmos casos do banco)', () => {
  for (const c of CASOS_GANHO) assert.deepEqual(ganhoFidelidade({ ...CONFIG_FIDELIDADE_PADRAO, ...c.cfg }, c.p), c.esperado, JSON.stringify(c));
});

test('cashback usável: saldo, mínimo, teto e dia', () => {
  const c = { ...CONFIG_FIDELIDADE_PADRAO, cashbackAtivo: true, cashbackMinimo: 1000, cashbackMaxPct: 50, cashbackDias: [1, 2, 3, 4, 5] };
  assert.equal(cashbackUsavel(c, 800, 5000, 3, 'balcao'), 0); // abaixo do mínimo
  assert.equal(cashbackUsavel(c, 4000, 5000, 3, 'balcao'), 2500); // teto de 50%
  assert.equal(cashbackUsavel(c, 1200, 5000, 3, 'balcao'), 1200);
  assert.equal(cashbackUsavel(c, 4000, 5000, 0, 'balcao'), 0); // domingo fora
  assert.equal(cashbackUsavel({ ...c, cashbackMaxPct: null }, 9000, 5000, 3, 'balcao'), 5000);
});

test('ROI e recomendação do dia', () => {
  assert.equal(roi(242542, 26540), 9.14);
  assert.equal(roi(1000, 0), null);
  assert.equal(faixaRoi(9.14), 'excelente');
  assert.equal(faixaRoi(1.5), 'ok');
  assert.equal(recomendacaoDia(1000, 2000, null, 0), 'criar');
  assert.equal(recomendacaoDia(3000, 2000, 1.2, 10), 'revisar');
  assert.equal(recomendacaoDia(3000, 2000, 9, 1), 'explorar');
  assert.equal(recomendacaoDia(3000, 2000, 9, 10), 'manter');
});
