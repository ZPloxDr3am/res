import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acaoDoEvento, acaoParaIfood, normalizarPedidoIfood, pedidoIfoodExemplo, type IfoodPedido } from '../src/index.js';

const base: IfoodPedido = {
  id: 'f2c1a7e0-0000-4000-8000-000000000001',
  displayId: '4821',
  orderType: 'DELIVERY',
  orderTiming: 'IMMEDIATE',
  createdAt: '2026-11-06T22:10:00.000Z',
  merchant: { id: 'merchant-1' },
  customer: { name: 'Ana Souza', documentNumber: '123.456.789-09', phone: { number: '0800 705 0070', localizer: '87654321' } },
  items: [
    { id: 'i1', name: 'Pizza Grande', externalCode: 'PZ-G', quantity: 2, unitPrice: 60, optionsPrice: 10, price: 120, totalPrice: 130, observations: 'Sem cebola',
      options: [{ name: 'Borda catupiry', groupName: 'Borda', externalCode: 'BD-CAT', quantity: 1, unitPrice: 5, price: 5 }] },
    { name: 'Refri 2L', quantity: 1, unitPrice: 12, totalPrice: 12 },
  ],
  benefits: [{ value: 15, target: 'CART', sponsorshipValues: [{ name: 'IFOOD', value: 10 }, { name: 'MERCHANT', value: 5 }] }],
  additionalFees: [{ type: 'SMALL_ORDER_FEE', value: 2 }],
  total: { subTotal: 142, deliveryFee: 8, benefits: 15, additionalFees: 2, orderAmount: 137 },
  payments: { prepaid: 0, pending: 137, methods: [{ method: 'CASH', type: 'OFFLINE', value: 137, cash: { changeFor: 150 } }] },
  delivery: { deliveredBy: 'MERCHANT', observations: 'Portão azul', pickupCode: '5521',
    deliveryAddress: { streetName: 'Rua A', streetNumber: '10', neighborhood: 'Centro', complement: 'Casa 2', reference: 'Mercado', city: 'Pomerode', postalCode: '89107-000', coordinates: { latitude: -26.7, longitude: -49.1 } } },
};

test('pedido do iFood vira pedido do RES com os valores fechando', () => {
  const p = normalizarPedidoIfood(base);
  assert.equal(p.tipo, 'entrega');
  assert.equal(p.externo_codigo, '4821');
  assert.equal(p.subtotal, 142);
  assert.equal(p.taxa_entrega, 8);
  assert.equal(p.acrescimo, 2);
  assert.equal(p.desconto, 15);
  assert.equal(p.total, 137);
  assert.equal(p.total, p.subtotal + p.taxa_entrega + p.acrescimo - p.desconto);
  assert.equal(p.itens[0]!.preco_unitario, 65);
  assert.equal(p.itens[0]!.total, 130);
  assert.equal(p.itens[0]!.opcoes[0]!.nome, 'Borda catupiry');
  assert.equal(p.pagamento, 'dinheiro');
  assert.equal(p.troco_para, 150);
  assert.equal(p.pago_online, false);
  assert.equal(p.codigo_retirada, '5521');
  assert.equal(p.cliente.telefone, null); // 0800 do iFood não é telefone do cliente
  assert.equal(p.cliente.localizador, '87654321');
  assert.equal(p.cliente.documento, '12345678909');
  assert.equal(p.beneficios[0]!.loja, 5);
  assert.equal(p.beneficios[0]!.marketplace, 10);
  assert.equal(p.endereco?.bairro, 'Centro');
  assert.equal(p.endereco?.cep, '89107000');
  assert.equal(p.observacao_entrega, 'Portão azul');
});

test('cartão online, retirada e agendado', () => {
  const p = normalizarPedidoIfood({
    ...base, orderType: 'TAKEOUT', orderTiming: 'SCHEDULED', schedule: { deliveryDateTimeStart: '2026-11-07T15:00:00Z' }, delivery: { pickupCode: '1234' },
    payments: { prepaid: 137, pending: 0, methods: [{ method: 'CREDIT', type: 'ONLINE', value: 137, card: { brand: 'VISA' } }] },
  });
  assert.equal(p.tipo, 'retirada');
  assert.equal(p.endereco, null);
  assert.equal(p.agendado_para, '2026-11-07T15:00:00Z');
  assert.equal(p.pagamento, 'online');
  assert.equal(p.pago_online, true);
  assert.equal(p.cartao_bandeira, 'VISA');
  assert.equal(p.troco_para, null);
});

test('eventos e chamadas de volta para o iFood', () => {
  assert.equal(acaoDoEvento('PLC').acao, 'criar');
  assert.equal(acaoDoEvento('CAN').acao, 'cancelar');
  assert.equal(acaoDoEvento('XYZ').acao, 'ignorar');
  assert.equal(acaoParaIfood('novo', 'em_preparo', 'entrega', false), 'confirm');
  assert.equal(acaoParaIfood('em_preparo', 'pronto', 'retirada', false), 'readyToPickup');
  assert.equal(acaoParaIfood('em_preparo', 'pronto', 'entrega', false), null);
  assert.equal(acaoParaIfood('pronto', 'em_entrega', 'entrega', false), 'dispatch');
  assert.equal(acaoParaIfood('pronto', 'em_entrega', 'entrega', true), null);
  assert.equal(acaoParaIfood('em_preparo', 'cancelado', 'entrega', false), 'requestCancellation');
});

test('pedido de exemplo do simulador passa pela mesma tradução', () => {
  for (const pagamento of ['online', 'dinheiro', 'cartao_na_entrega'] as const) {
    const p = normalizarPedidoIfood(pedidoIfoodExemplo({ merchantId: 'm', pagamento, cupom: true }));
    assert.equal(p.total, Math.round((p.subtotal + p.taxa_entrega + p.acrescimo - p.desconto) * 100) / 100);
    assert.ok(p.itens.length > 0);
  }
});
