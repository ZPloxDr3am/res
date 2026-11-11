import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { agruparEntregas, prazoEntrega, situacaoPrazo } from '../src/prazo.js';

const MIN = 60_000;
const loja = { lat: -27.09, lng: -48.61 };
// ~1 km por 0,009 de latitude
const norte = (km: number) => ({ lat: loja.lat + km * 0.009, lng: loja.lng });
const sul = (km: number) => ({ lat: loja.lat - km * 0.009, lng: loja.lng });

describe('prazo de entrega', () => {
  it('usa o agendado ou o pedido + prazo da loja', () => {
    assert.equal(prazoEntrega(0, null, 35), 35 * MIN);
    assert.equal(prazoEntrega(0, 90 * MIN, 35), 90 * MIN);
  });
  it('ok, perto e atrasado', () => {
    assert.deepEqual(situacaoPrazo(30 * MIN, 0), { estado: 'ok', minutos: 30 });
    assert.deepEqual(situacaoPrazo(8 * MIN, 0), { estado: 'perto', minutos: 8 });
    assert.deepEqual(situacaoPrazo(0, 5 * MIN + 1), { estado: 'atrasado', minutos: 6 });
  });
});

describe('lotes da expedição', () => {
  it('junta quem fica no mesmo caminho e separa o lado oposto', () => {
    const lotes = agruparEntregas(
      [
        { id: 'A', ponto: norte(2), bairro: 'Centro', prazo: 20 * MIN },
        { id: 'B', ponto: norte(2.6), bairro: 'Morretes', prazo: 30 * MIN },
        { id: 'C', ponto: sul(3), bairro: 'Várzea', prazo: 25 * MIN },
      ],
      loja,
      0,
    );
    assert.deepEqual(lotes.map((l) => l.ids), [['A', 'B'], ['C']]);
  });
  it('sem local no mapa, junta pelo mesmo bairro (sem acento/maiúscula)', () => {
    const lotes = agruparEntregas(
      [
        { id: 'A', ponto: null, bairro: 'Meia Praia', prazo: 10 * MIN },
        { id: 'B', ponto: null, bairro: 'meia praia', prazo: 20 * MIN },
        { id: 'C', ponto: null, bairro: 'Centro', prazo: 15 * MIN },
      ],
      loja,
      0,
    );
    assert.deepEqual(lotes.map((l) => l.ids), [['A', 'B'], ['C']]);
  });
  it('limite de entregas por lote', () => {
    const p = (id: string, km: number) => ({ id, ponto: norte(km), bairro: 'X', prazo: 40 * MIN });
    const lotes = agruparEntregas([p('A', 1), p('B', 1.2), p('C', 1.4), p('D', 1.6)], loja, 0, { maxPorLote: 3 });
    assert.deepEqual(lotes.map((l) => l.ids.length), [3, 1]);
  });
  it('não junta se juntar faz alguém atrasar', () => {
    const lotes = agruparEntregas(
      [
        { id: 'N', ponto: norte(3), bairro: 'A', prazo: 12 * MIN },
        { id: 'S', ponto: sul(3), bairro: 'B', prazo: 12 * MIN },
      ],
      loja,
      0,
      { desvioMaxMin: 60 },
    );
    assert.deepEqual(lotes.map((l) => l.ids), [['N'], ['S']]);
  });
});
