import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acaoAvancar, ErroPedido, proximosStatus, tempoDecorrido, totalizar, transicaoValida, troco } from '../src/pedido.js';

test('fluxo de entrega passa por "saiu para entrega"', () => {
  assert.deepEqual(proximosStatus('pronto', 'entrega'), ['em_entrega', 'cancelado']);
  assert.deepEqual(proximosStatus('pronto', 'retirada'), ['concluido', 'cancelado']);
  assert.equal(transicaoValida('novo', 'pronto', 'entrega'), false, 'não pula o preparo');
  assert.equal(transicaoValida('concluido', 'cancelado', 'entrega'), false, 'concluído é final');
  assert.equal(transicaoValida('em_entrega', 'cancelado', 'entrega'), true);
});

test('botão de avançar', () => {
  assert.deepEqual(acaoAvancar('novo', 'entrega'), { para: 'em_preparo', rotulo: 'Aceitar' });
  assert.deepEqual(acaoAvancar('em_entrega', 'entrega'), { para: 'concluido', rotulo: 'Entregue' });
  assert.deepEqual(acaoAvancar('pronto', 'balcao'), { para: 'concluido', rotulo: 'Concluir' });
  assert.equal(acaoAvancar('cancelado', 'entrega'), null);
});

test('totais: taxa só na entrega, desconto até o subtotal', () => {
  const linhas = [{ unitario: 4500, quantidade: 2 }, { unitario: 800, quantidade: 1 }];
  assert.deepEqual(totalizar(linhas, 'entrega', 700, 500), { subtotal: 9800, taxaEntrega: 700, desconto: 500, total: 10000 });
  assert.equal(totalizar(linhas, 'retirada', 700, 0).total, 9800);
  assert.throws(() => totalizar(linhas, 'entrega', 0, 9801), ErroPedido);
  assert.throws(() => totalizar([], 'entrega', 0, 0), ErroPedido);
  assert.throws(() => totalizar([{ unitario: 100, quantidade: 0 }], 'balcao', 0, 0), ErroPedido);
});

test('troco', () => {
  assert.equal(troco(9300, 'dinheiro', 10000), 700);
  assert.equal(troco(9300, 'pix', 10000), null);
  assert.equal(troco(9300, 'dinheiro', null), null);
  assert.throws(() => troco(9300, 'dinheiro', 5000), ErroPedido);
});

test('tempo decorrido', () => {
  const t0 = new Date('2026-10-21T12:00:00Z');
  assert.equal(tempoDecorrido(t0, new Date('2026-10-21T12:00:30Z')), 'agora');
  assert.equal(tempoDecorrido(t0, new Date('2026-10-21T12:12:00Z')), 'há 12 min');
  assert.equal(tempoDecorrido(t0, new Date('2026-10-21T13:05:00Z')), 'há 1h05');
});
