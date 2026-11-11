import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASOS_SEGMENTO, CASOS_TELEFONE, eCelular, normalizarTelefone, SEGMENTOS, segmentoCliente, telefoneInternacional } from '../src/segmentos.js';

test('segmento de cada caso (mesmos casos do banco)', () => {
  for (const [dias, pedidos, esperado] of CASOS_SEGMENTO) assert.equal(segmentoCliente(dias, pedidos), esperado, `${dias} dias, ${pedidos} pedidos`);
});

test('todo cliente com pedido cai em um segmento conhecido', () => {
  const ids = new Set(SEGMENTOS.map((s) => s.id));
  for (let d = 0; d <= 500; d += 7) for (let n = 1; n <= 30; n++) assert.ok(ids.has(segmentoCliente(d, n)!));
});

test('telefone internacional', () => {
  assert.equal(telefoneInternacional('47991234567'), '+5547991234567');
  assert.equal(telefoneInternacional('5547991234567'), '+5547991234567');
  assert.equal(telefoneInternacional('(47) 3333-4444'), '+554733334444');
});

test('põe o 9 no celular de 8 dígitos (mesmos casos do banco)', () => {
  for (const [entrada, esperado] of CASOS_TELEFONE) assert.equal(normalizarTelefone(entrada), esperado, entrada);
  assert.equal(telefoneInternacional('+55 47 96731809'), '+5547996731809');
  assert.ok(eCelular('47 96731809'));
  assert.ok(!eCelular('4733334444'));
});
