import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chamadaRespostaIfood, descreverNegociacao, disputaIfoodExemplo, normalizarNegociacaoIfood, situacaoDoAcordo, validarResposta } from '../src/negociacao.js';

test('negociação do iFood: lê valores em centavos, alternativas e motivos (D-075)', () => {
  const n = normalizarNegociacaoIfood('ped-1', disputaIfoodExemplo('apos_entrega', 89.9));
  assert.equal(n.acao, 'CANCELLATION');
  assert.equal(n.tipo, 'AFTER_DELIVERY');
  assert.equal(n.alternativas[0]!.tipo, 'reembolso');
  assert.equal(n.alternativas[0]!.valor_max, 89.9);
  assert.equal(n.evidencias, 1);
  const atraso = normalizarNegociacaoIfood('ped-1', disputaIfoodExemplo('atraso', 50));
  assert.deepEqual(atraso.alternativas[0]!.minutos, [10, 20, 30]);
  assert.deepEqual(atraso.motivos_aceite, ['HIGH_STORE_DEMAND', 'DRIVER_NOT_AVAILABLE']);
  const parcial = normalizarNegociacaoIfood('ped-1', disputaIfoodExemplo('parcial', 100));
  assert.equal(parcial.itens[0]!.valor, 30);
});

test('regras de resposta: atraso não deixa recusar, teto do reembolso, motivo obrigatório', () => {
  const atraso = normalizarNegociacaoIfood('p', disputaIfoodExemplo('atraso', 50));
  assert.equal(descreverNegociacao(atraso.acao, atraso.tipo).podeRecusar, false);
  assert.match(validarResposta(atraso, { tipo: 'recusar', motivo: 'não' })!, /não deixa recusar/);
  assert.match(validarResposta(atraso, { tipo: 'aceitar' })!, /motivo/);
  assert.equal(validarResposta(atraso, { tipo: 'aceitar', motivo: 'HIGH_STORE_DEMAND' }), null);
  const alt = atraso.alternativas[0]!;
  assert.match(validarResposta(atraso, { tipo: 'alternativa', alternativaId: alt.id, alternativa: 'mais_tempo', minutos: 15, motivoTempo: 'HIGH_STORE_DEMAND' })!, /minutos/);
  assert.equal(validarResposta(atraso, { tipo: 'alternativa', alternativaId: alt.id, alternativa: 'mais_tempo', minutos: 20, motivoTempo: 'HIGH_STORE_DEMAND' }), null);
  const entrega = normalizarNegociacaoIfood('p', disputaIfoodExemplo('apos_entrega', 40));
  const r = entrega.alternativas[0]!;
  assert.match(validarResposta(entrega, { tipo: 'alternativa', alternativaId: r.id, alternativa: 'reembolso', valor: 41 })!, /máximo é R\$ 40,00/);
  assert.match(validarResposta(entrega, { tipo: 'recusar', motivo: '  ' })!, /motivo/);
});

test('chamadas ao iFood e resultado final', () => {
  assert.deepEqual(chamadaRespostaIfood('d1', { tipo: 'recusar', motivo: ' Entregue quente ' }), { caminho: '/order/v1.0/disputes/d1/reject', corpo: { reason: 'Entregue quente' } });
  assert.deepEqual(chamadaRespostaIfood('d1', { tipo: 'aceitar' }), { caminho: '/order/v1.0/disputes/d1/accept', corpo: null });
  assert.deepEqual(chamadaRespostaIfood('d1', { tipo: 'alternativa', alternativaId: 'a1', alternativa: 'reembolso', valor: 15 }).corpo, { type: 'REFUND', metadata: { amount: { value: '1500', currency: 'BRL' } } });
  assert.deepEqual(chamadaRespostaIfood('d1', { tipo: 'alternativa', alternativaId: 'a1', alternativa: 'mais_tempo', minutos: 20, motivoTempo: 'X' }), { caminho: '/order/v1.0/disputes/d1/alternatives/a1', corpo: { type: 'ADDITIONAL_TIME', metadata: { additionalTimeInMinutes: 20, additionalTimeReason: 'X' } } });
  assert.equal(situacaoDoAcordo('EXPIRED'), 'expirada');
  assert.equal(situacaoDoAcordo('ALTERNATIVE_REPLIED'), 'alternativa');
});
