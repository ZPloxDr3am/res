import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chamadaDM, chamadaRappi, eventoDoDM, formaDaRappi, normalizarPedidoDM, normalizarPedidoRappi, type DmPedido, type RappiPedido } from '../src/canais-cliente.js';

const ML = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

export const PEDIDO_DM: DmPedido = {
  id: 'dm-1', code: 'DM4821', created_at: '2026-11-14T19:00:00Z', status: 'OPENED', stage: 'WAITING_COMPANY',
  company: { id: '0b0c0d0e-0000-4000-8000-000000000001' },
  consumer: { name: 'Bia Much', phone: '(47) 99999-1234', cpf: '123.456.789-09' },
  delivery_form: { method: 'DELIVERY', estimated_time: 45, address: { street: 'Rua C', number: '5', district: 'Centro', city: 'Pomerode', postal_code: '89107-000', lat: -26.7, lng: -49.1 } },
  payment: { subtotal: 70, delivery: 6, total: 71, coupon: { code: 'BEMVINDO', discount: 5 }, payment_form: { method: 'MONEY', change: 100 } },
  products: [
    { id: 'p1', id_erp: 'prod-pizza', name: 'Pizza', quantity: 1, total_price: 60, size_options: { size: { id: 's1', name: 'Grande', price: 0 } }, groups: [{ name: 'Sabores', rule: 'MAX_VALUE', subgroups: [{ name: 'Sabores', items: [{ id: 'i1', id_erp: 'calab', name: 'Calabresa', price: 0, quantity: 1 }] }] }] },
    { id: 'p2', name: 'Refri', quantity: 2, total_price: 10 },
  ],
};

test('Delivery Much → pedido canônico', () => {
  const p = normalizarPedidoDM(PEDIDO_DM, ML);
  assert.deepEqual([p.canal, p.tipo, p.externo_codigo, p.marketplace_loja_id], ['deliverymuch', 'entrega', 'DM4821', ML]);
  assert.deepEqual([p.subtotal, p.taxa_entrega, p.desconto, p.total, p.total_externo], [70, 6, 5, 71, 71]);
  assert.deepEqual([p.pagamento, p.troco_para, p.pago_online], ['dinheiro', 100, false]);
  assert.equal(p.cliente.telefone, '47999991234');
  assert.equal(p.prazo_min, 45);
  assert.equal(p.itens[0]!.opcoes.length, 2);
  assert.equal(p.itens[0]!.opcoes[1]!.externo_codigo, 'calab');
  assert.equal(p.itens[1]!.preco_unitario, 5);
  const online = normalizarPedidoDM({ ...PEDIDO_DM, delivery_form: { method: 'PICKUP' }, payment: { ...PEDIDO_DM.payment, payment_form: { method: 'ONLINE' } } }, ML);
  assert.deepEqual([online.tipo, online.pagamento, online.pago_online, online.endereco], ['retirada', 'online', true, null]);
  const maq = normalizarPedidoDM({ ...PEDIDO_DM, payment: { ...PEDIDO_DM.payment, payment_form: { method: 'MACHINE', card: { name: 'Elo Débito' } } } }, ML);
  assert.equal(maq.pagamento, 'cartao_debito');
  assert.equal(eventoDoDM({ status: 'CANCELED' }), 'CANCELLED');
  assert.equal(eventoDoDM({ status: 'OPENED', stage: 'WAITING_COMPANY' }), null);
  assert.throws(() => normalizarPedidoDM({ ...PEDIDO_DM, products: [] }, ML));
});

test('Delivery Much: rotas de saída', () => {
  assert.equal(chamadaDM('confirm', { externoId: 'x' })!.caminho, '/orders/x/accept');
  assert.equal(chamadaDM('dispatch', { externoId: 'x' })!.caminho, '/orders/x/ready');
  assert.equal(chamadaDM('readyToPickup', { externoId: 'x' })!.caminho, '/orders/x/ready');
  assert.equal((chamadaDM('requestCancellation', { externoId: 'x', motivo: 'ITEM_INDISPONIVEL · Acabou a massa' })!.corpo as { reason: string }).reason, 'Acabou a massa');
  assert.equal(chamadaDM('pausar', { externoId: '', merchantId: 'abc' })!.caminho, '/companies/abc/offline');
  assert.equal(chamadaDM('abrir', { externoId: '' }), null);
});

export const PEDIDO_RAPPI: RappiPedido = {
  order_detail: {
    order_id: 9988776655, created_at: '2026-11-14T19:00:00Z', delivery_method: 'marketplace', payment_method: 'rappi_pay',
    totals: { total_products: 7000, total_order: 7500, charges: { shipping: 800, service_fee: 200 } },
    items: [{ sku: 'prod-pizza', id: 1, name: 'Pizza', price: 6000, quantity: 1, comments: 'Bem assada', subitems: [{ sku: 'borda', name: 'Borda', price: 500, quantity: 1 }] }, { sku: 'refri', id: 2, name: 'Refri', price: 500, quantity: 1 }],
    discounts: [{ value: 500, amount_by_rappi: 300, amount_by_partner: 200, type: 'offer' }],
  },
  customer: { first_name: 'Caio', last_name: 'Rappi', phone_number: '+55 47 98888-7777' },
  store: { internal_id: 777 },
};

test('Rappi → pedido canônico (centavos)', () => {
  const p = normalizarPedidoRappi(PEDIDO_RAPPI, ML);
  assert.deepEqual([p.canal, p.externo_id, p.tipo, p.entrega_pelo_marketplace], ['rappi', '9988776655', 'entrega', true]);
  assert.deepEqual([p.subtotal, p.taxa_entrega, p.acrescimo, p.desconto, p.total, p.total_externo], [70, 8, 2, 5, 75, 75]);
  assert.equal(p.itens[0]!.preco_unitario, 65);
  assert.deepEqual(p.beneficios[0], { valor: 5, alvo: 'CART', loja: 2, marketplace: 3, descricao: null });
  assert.deepEqual([p.pagamento, p.pago_online, p.cliente.nome, p.cliente.telefone], ['online', true, 'Caio Rappi', '47988887777']);
  assert.equal(normalizarPedidoRappi({ ...PEDIDO_RAPPI, order_detail: { ...PEDIDO_RAPPI.order_detail, delivery_method: 'pickup' } }, ML, true).tipo, 'retirada');
  assert.equal(normalizarPedidoRappi({ ...PEDIDO_RAPPI, order_detail: { ...PEDIDO_RAPPI.order_detail, items: [{ name: 'X', price: 10, quantity: 2 }] } }, ML, false).subtotal, 20);
  assert.deepEqual(['cash', 'pos_terminal', 'dc', 'PIX', 'sodexo', 'rappi_pay', 'cc'].map(formaDaRappi), ['dinheiro', 'cartao_credito', 'online', 'online', 'vale_refeicao', 'online', 'online']);
});

test('Rappi: rotas de saída', () => {
  assert.equal(chamadaRappi('confirm', { externoId: '1', preparoMin: 25 })!.caminho, '/api/v2/restaurants-integrations-public-api/orders/1/take/25');
  assert.equal(chamadaRappi('readyToPickup', { externoId: '1' })!.metodo, 'POST');
  assert.equal(chamadaRappi('requestCancellation', { externoId: '1' })!.caminho.endsWith('/reject'), true);
  assert.equal(chamadaRappi('dispatch', { externoId: '1' }), null);
});
