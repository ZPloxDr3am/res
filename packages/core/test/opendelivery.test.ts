import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { acaoDoEventoOD, avisosMerchantOD, chamadaOD, montarMerchantOD, normalizarPedidoOD, uuidDe, type BaseMerchant, type OdPedido } from '../src/opendelivery.js';

const ML = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

export const PEDIDO_OD: OdPedido = {
  id: 'b7c3a0f2-3f6e-4f4b-9a0e-0d9f3c2a1b11',
  displayId: 'K-4821',
  createdAt: '2026-11-14T19:00:00Z',
  type: 'DELIVERY',
  orderTiming: 'INSTANT',
  merchant: { id: '12345678000199-x', name: 'Pizza M' },
  customer: { name: 'Ana Keeta', phone: { number: '08001234567', extension: '998877' }, documentNumber: '123.456.789-09', ordersCountOnMerchant: 3 },
  delivery: {
    deliveredBy: 'MERCHANT',
    estimatedDeliveryDateTime: '2026-11-14T19:40:00Z',
    pickupCode: '5521',
    deliveryAddress: { street: 'Rua A', number: '10', district: 'Centro', city: 'Pomerode', state: 'SC', postalCode: '89107-000', complement: 'Casa 2', reference: 'Mercado', coordinates: { latitude: -26.74, longitude: -49.17 } },
  },
  items: [
    { id: 'i1', externalCode: 'prod-pizza', name: 'Pizza Grande', quantity: 2, unitPrice: { value: 60 }, totalPrice: { value: 130 }, specialInstructions: 'Sem cebola', options: [{ id: 'o1', externalCode: 'borda-cat', name: 'Catupiry', quantity: 1, unitPrice: { value: 5 }, totalPrice: { value: 5 } }] },
    { id: 'i2', externalCode: 'refri', name: 'Refri 2L', quantity: 1, unitPrice: { value: 12 }, totalPrice: { value: 12 } },
  ],
  otherFees: [
    { name: 'Entrega', type: 'DELIVERY_FEE', receivedBy: 'MERCHANT', price: { value: 8 } },
    { name: 'Serviço', type: 'SERVICE_FEE', receivedBy: 'MARKETPLACE', price: { value: 2 } },
  ],
  discounts: [{ amount: { value: 15 }, target: 'CART', sponsorshipValues: [{ name: 'MARKETPLACE', amount: { value: 10 } }, { name: 'MERCHANT', amount: { value: 5 } }] }],
  total: { itemsPrice: { value: 142 }, otherFees: { value: 10 }, discount: { value: 15 }, orderAmount: { value: 137 } },
  payments: { prepaid: 0, pending: 137, methods: [{ type: 'PENDING', method: 'CASH', value: 137, changeFor: 150 }] },
};

test('eventos do Open Delivery → ação do RES', () => {
  assert.deepEqual(acaoDoEventoOD('CREATED'), { acao: 'criar' });
  assert.deepEqual(acaoDoEventoOD('READY_FOR_PICKUP'), { acao: 'status', codigo: 'READY_TO_PICKUP' });
  assert.deepEqual(acaoDoEventoOD('DELIVERED'), { acao: 'status', codigo: 'CONCLUDED' });
  assert.deepEqual(acaoDoEventoOD('ORDER_CANCELLATION_REQUEST'), { acao: 'cancelamento_solicitado' });
  assert.deepEqual(acaoDoEventoOD('CANCELLED_DENIED'), { acao: 'cancelamento_negado' });
  assert.deepEqual(acaoDoEventoOD('PREPARING'), { acao: 'ignorar' });
});

test('pedido do Open Delivery → pedido canônico', () => {
  const p = normalizarPedidoOD(PEDIDO_OD, 'keeta', ML);
  assert.equal(p.canal, 'keeta');
  assert.equal(p.marketplace_loja_id, ML);
  assert.equal(p.tipo, 'entrega');
  assert.equal(p.externo_codigo, 'K-4821');
  assert.equal(p.subtotal, 142);
  assert.equal(p.taxa_entrega, 8);
  assert.equal(p.acrescimo, 2);
  assert.equal(p.desconto, 15);
  assert.equal(p.total, 137);
  assert.equal(p.total_externo, 137);
  assert.equal(p.pagamento, 'dinheiro');
  assert.equal(p.troco_para, 150);
  assert.equal(p.pago_online, false);
  assert.equal(p.telefone_mascarado, true);
  assert.equal(p.cliente.telefone, null);
  assert.equal(p.cliente.documento, '12345678909');
  assert.equal(p.prazo_min, 40);
  assert.equal(p.endereco?.cep, '89107000');
  assert.deepEqual(p.beneficios[0], { valor: 15, alvo: 'CART', loja: 5, marketplace: 10, descricao: null });
  assert.equal(p.itens[0]!.preco_unitario, 65);
  assert.equal(p.itens[0]!.opcoes[0]!.externo_codigo, 'borda-cat');
  const pre = normalizarPedidoOD({ ...PEDIDO_OD, type: 'TAKEOUT', payments: { prepaid: 137, pending: 0, methods: [{ type: 'PREPAID', method: 'CREDIT', value: 137, brand: 'VISA' }] } }, 'aiqfome', ML);
  assert.deepEqual([pre.tipo, pre.pagamento, pre.pago_online, pre.cartao_bandeira, pre.endereco], ['retirada', 'online', true, 'VISA', null]);
  assert.throws(() => normalizarPedidoOD({ ...PEDIDO_OD, items: [] }, 'keeta', ML));
});

test('chamadas de saída: caminhos e corpos (aiqfome com hífen)', () => {
  const c = chamadaOD('keeta', 'confirm', { externoId: 'abc', numero: 42, preparoMin: 25 })!;
  assert.equal(c.caminho, '/orders/abc/confirm');
  assert.equal((c.corpo as { orderExternalCode: string }).orderExternalCode, '42');
  assert.equal(chamadaOD('aiqfome', 'readyToPickup', { externoId: 'abc' })!.caminho, '/orders/abc/ready-for-pickup');
  assert.equal(chamadaOD('99food', 'readyToPickup', { externoId: 'abc' })!.caminho, '/orders/abc/readyForPickup');
  const cancel = chamadaOD('keeta', 'requestCancellation', { externoId: 'abc', motivo: 'UNAVAILABLE_ITEM · Item indisponível' })!.corpo as { code: string; mode: string };
  assert.deepEqual([cancel.code, cancel.mode], ['UNAVAILABLE_ITEM', 'MANUAL']);
  assert.equal((chamadaOD('keeta', 'requestCancellation', { externoId: 'abc', motivo: 'qualquer coisa' })!.corpo as { code: string }).code, 'INTERNAL_DIFFICULTIES_OF_THE_RESTAURANT');
  assert.equal(chamadaOD('keeta', 'negociacao', { externoId: 'abc' }), null);
});

export const BASE: BaseMerchant = {
  conexao: { id: ML, marca_id: 'a1b2c3d4-0000-4000-8000-000000000001', atualizado_em: '2026-11-14T18:00:00Z' },
  loja: { cnpj: '12345678000199', razao_social: 'Pizza M Ltda', telefone: '47999990000', logradouro: 'Rua B', numero: '1', bairro: 'Centro', cidade: 'Pomerode', uf: 'SC', cep: '89107000', lat: -26.74, lng: -49.17, aberta: true },
  marca: { id: 'a1b2c3d4-0000-4000-8000-000000000001', nome: 'Pizza M', logo_url: 'https://exemplo.com/logo.png', capa_url: null, whatsapp: '47999990000', pedido_minimo: 2000, tempo_preparo_min: 35, aceita_entrega: true, aceita_retirada: true, horarios: [{ dia: 5, abre: '18:00', fecha: '23:30' }, { dia: 6, abre: '18:00', fecha: '00:00' }] },
  raio_km: 6,
  precos: { 'b1000000-0000-4000-8000-000000000002': 4590 },
  setores: [
    {
      id: 'c1000000-0000-4000-8000-000000000001',
      nome: 'Pizzas',
      produtos: [
        {
          id: 'b1000000-0000-4000-8000-000000000001', nome: 'Pizza Grande', descricao: '8 fatias', imagem_url: null, preco: 6000, preco_original: 6500, combo: false,
          grupos: [{ id: 'd1000000-0000-4000-8000-000000000001', nome: 'Sabores', formacao: 'maior', pizza: true, min: 1, max: 2, obrigatorio: true, opcoes: [{ id: 'e1000000-0000-4000-8000-000000000001', nome: 'Calabresa', preco: 0, imagem_url: null }, { id: 'e1000000-0000-4000-8000-000000000002', nome: 'Quatro queijos', preco: 500, imagem_url: null }] }],
        },
        { id: 'b1000000-0000-4000-8000-000000000002', nome: 'Pizza Broto', descricao: null, imagem_url: null, preco: 4000, preco_original: null, combo: false, grupos: [] },
      ],
    },
  ],
};

test('Merchant 1.7.1 a partir do cardápio do RES', () => {
  const m = montarMerchantOD(BASE);
  assert.equal(m.id, `12345678000199-${ML}`);
  assert.equal(m.status, 'AVAILABLE');
  assert.equal(m.basicInfo.merchantCategories[0], 'PIZZA');
  assert.equal(m.services.length, 2);
  const entrega = m.services.find((s) => s.serviceType === 'DELIVERY') as { serviceArea?: { geoRadius: { radius: { size: number }[] } }; serviceHours: { weekHours: { dayOfWeek: string[]; timePeriods: { endTime: string } }[] } };
  assert.equal(entrega.serviceArea!.geoRadius.radius[0]!.size, 6000);
  assert.deepEqual(entrega.serviceHours.weekHours.map((w) => [w.dayOfWeek[0], w.timePeriods.endTime]), [['FRIDAY', '23:30:00'], ['SATURDAY', '23:59:00']]);
  const ofertas = m.itemOffers as { itemId: string; price: { value: number; originalValue?: number }; optionGroupsId: string[] }[];
  assert.deepEqual(ofertas.map((o) => o.price.value), [60, 45.9]);
  assert.equal(ofertas[0]!.price.originalValue, 65);
  assert.equal(ofertas[1]!.price.originalValue, 45.9);
  const grupo = m.optionGroups[0] as { priceMethod: string; minPermitted: number; maxPermitted: number; options: { itemId: string }[] };
  assert.deepEqual([grupo.priceMethod, grupo.minPermitted, grupo.maxPermitted, grupo.options.length], ['MAX', 1, 2, 2]);
  // toda opção aponta para um Item existente
  const ids = new Set((m.items as { id: string }[]).map((i) => i.id));
  assert.ok(grupo.options.every((o) => ids.has(o.itemId)));
  assert.match(uuidDe('x'), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(uuidDe('a'), uuidDe('a'));
  assert.notEqual(uuidDe('a'), uuidDe('b'));
  assert.deepEqual(avisosMerchantOD(BASE), []);
  assert.equal(avisosMerchantOD({ ...BASE, raio_km: null, loja: { ...BASE.loja, cnpj: null } }).length, 2);
  if (process.env.OD_DUMP) writeFileSync(process.env.OD_DUMP, JSON.stringify(m, null, 1));
});
