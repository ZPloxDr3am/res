import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanciaReta, fecharMotoboys, formatarKm, fraseAcerto, lerCoordenadas, type EntregaFechamento } from '../src/entregas.js';
import { formatarReais } from '../src/index.js';

test('distância em linha reta (Pomerode → Blumenau ≈ 22 km)', () => {
  const d = distanciaReta({ lat: -26.7409, lng: -49.1765 }, { lat: -26.9194, lng: -49.0661 });
  assert.ok(d > 21 && d < 24, String(d));
  assert.equal(distanciaReta({ lat: 1, lng: 1 }, { lat: 1, lng: 1 }), 0);
});

test('formatar km', () => {
  assert.equal(formatarKm(3.17), '3,2 km');
  assert.equal(formatarKm(0.85), '850 m');
  assert.equal(formatarKm(null), '—');
  assert.equal(formatarKm(0), '0 km');
});

test('coordenadas coladas do Google Maps', () => {
  assert.deepEqual(lerCoordenadas('-26.7409, -49.1765'), { lat: -26.7409, lng: -49.1765 });
  assert.deepEqual(lerCoordenadas('(-26.74 -49.17)'), { lat: -26.74, lng: -49.17 });
  assert.equal(lerCoordenadas('Rua XV'), null);
  assert.equal(lerCoordenadas('-126.7, -49.1'), null);
});

const base = (x: Partial<EntregaFechamento>): EntregaFechamento => ({
  id: 'p', numero: 1, loja: 'L', status: 'concluido', entregador_id: 'z', entregador: 'Zeca', bairro: 'Centro',
  saiu_em: '2026-10-23T22:00:00Z', concluido_em: '2026-10-23T22:20:00Z', pagamento: 'dinheiro', pago: false,
  total: 5000, taxa_entrega: 500, valor_motoboy: 700, distancia_km: 2.5, distancia_fonte: 'rota', ...x,
});

test('fechamento da noite por motoboy', () => {
  const { motoboys, total } = fecharMotoboys([
    base({ id: '1' }),
    base({ id: '2', pagamento: 'cartao_credito', total: 8000, valor_motoboy: 900, distancia_km: 6 }),
    base({ id: '3', pagamento: 'pix', pago: true, total: 4000, distancia_km: null }),
    base({ id: '4', status: 'em_entrega' }),
    base({ id: '5', entregador_id: 'a', entregador: 'Andrei', total: 3000, valor_motoboy: 500, taxa_entrega: 500, distancia_km: 1.25 }),
  ]);
  assert.deepEqual(motoboys.map((m) => m.nome), ['Andrei', 'Zeca']);
  const z = motoboys[1]!;
  assert.equal(z.entregas, 3);
  assert.equal(z.emRota, 1);
  assert.equal(z.km, 8.5);
  assert.equal(z.aReceber, 2300);
  assert.equal(z.taxasClientes, 1500);
  assert.equal(z.dinheiro, 5000);
  assert.equal(z.outros, 8000);
  assert.equal(z.acerto, 2700);
  assert.equal(z.lista.length, 4);
  assert.equal(motoboys[0]!.acerto, 2500);
  assert.equal(total.entregas, 4);
  assert.equal(total.aReceber, 2800);
  assert.equal(total.km, 9.75);
  assert.equal(fraseAcerto(2700, formatarReais).replace(/\s/g, ' '), 'Devolver R$ 27,00 à loja');
  assert.equal(fraseAcerto(-500, formatarReais).replace(/\s/g, ' '), 'A loja paga R$ 5,00 ao motoboy');
});
