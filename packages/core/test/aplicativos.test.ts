import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crc16Pix, normalizarChavePix, pixCopiaECola, FORMATOS_RASTREAMENTO } from '../src/index.js';

test('BR Code do exemplo do manual do Pix (Banco Central)', () => {
  const t = pixCopiaECola({ chave: '123e4567-e12b-12d1-a456-426655440000', nome: 'Fulano de Tal', cidade: 'BRASILIA', valor: null });
  assert.equal(t, '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D');
});

test('Pix com valor, txid do pedido e nome/cidade com acento', () => {
  const t = pixCopiaECola({ chave: '+5547996731809', nome: 'Pizzaria Pomerode Ltda', cidade: 'Pomerode', valor: 8199, txid: 'RES1234' });
  assert.match(t, /540581\.99/);
  assert.match(t, /5922Pizzaria Pomerode Ltda/);
  assert.match(t, /62110507RES1234/);
  assert.equal(t.slice(-4), crc16Pix(t.slice(0, -4)));
  const a = pixCopiaECola({ chave: 'x@y.com', nome: 'Açaí São João', cidade: 'Itapema', valor: 100 });
  assert.match(a, /5913Acai Sao Joao/);
});

test('chave Pix por tipo', () => {
  assert.equal(normalizarChavePix('123.456.789-09', 'cpf'), '12345678909');
  assert.equal(normalizarChavePix('12.345.678/0001-99', 'cnpj'), '12345678000199');
  assert.equal(normalizarChavePix('(47) 99673-1809', 'telefone'), '+5547996731809');
  assert.equal(normalizarChavePix('+55 47 99673-1809', 'telefone'), '+5547996731809');
  assert.equal(normalizarChavePix('Loja@Exemplo.com', 'email'), 'loja@exemplo.com');
  assert.equal(normalizarChavePix('123', 'cpf'), null);
  assert.equal(normalizarChavePix('nao-e-uuid', 'aleatoria'), null);
});

test('IDs de rastreamento', () => {
  assert.ok(FORMATOS_RASTREAMENTO.meta_pixel.test('1234567890123456'));
  assert.ok(FORMATOS_RASTREAMENTO.google_analytics.test('G-ABC123XYZ9'));
  assert.ok(FORMATOS_RASTREAMENTO.google_ads.test('AW-123456789'));
  assert.ok(FORMATOS_RASTREAMENTO.google_tag_manager.test('GTM-ABCD12'));
  assert.ok(!FORMATOS_RASTREAMENTO.google_analytics.test('UA-1234-1'));
});
