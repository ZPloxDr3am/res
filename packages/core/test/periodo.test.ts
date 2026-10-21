import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatarVariacao, hojeNoFuso, intervalo, somarDias, variacao } from '../src/periodo.js';

test('somar dias atravessa mês e ano', () => {
  assert.equal(somarDias('2026-10-31', 1), '2026-11-01');
  assert.equal(somarDias('2026-01-01', -1), '2025-12-31');
  assert.equal(somarDias('2028-02-28', 1), '2028-02-29');
});

test('hoje no fuso de Brasília', () => {
  assert.equal(hojeNoFuso('America/Sao_Paulo', new Date('2026-10-21T02:30:00Z')), '2026-10-20'); // 23h30 do dia 20 em SP
  assert.equal(hojeNoFuso('America/Sao_Paulo', new Date('2026-10-21T03:30:00Z')), '2026-10-21');
});

test('presets', () => {
  const h = '2026-10-21';
  assert.deepEqual(intervalo('hoje', h), {
    de: h, ate: h, inicio: '2026-10-21T00:00:00-03:00', fim: '2026-10-22T00:00:00-03:00', comparacao: 'vs ontem até a mesma hora', emAndamento: true,
  });
  const o = intervalo('ontem', h);
  assert.equal(o.inicio, '2026-10-20T00:00:00-03:00');
  assert.equal(o.fim, '2026-10-21T00:00:00-03:00');
  assert.equal(o.emAndamento, false);
  assert.equal(intervalo('7d', h).de, '2026-10-15');
  assert.equal(intervalo('30d', h).de, '2026-09-22');
  assert.equal(intervalo('mes', h).de, '2026-10-01');
  const p = intervalo('personalizado', h, '-03:00', '2026-09-01', '2026-09-30');
  assert.equal(p.fim, '2026-10-01T00:00:00-03:00');
  assert.equal(p.comparacao, 'vs 30 dias anteriores');
  assert.throws(() => intervalo('personalizado', h, '-03:00', '2026-09-30', '2026-09-01'), /antes/);
  assert.throws(() => intervalo('personalizado', h), /duas datas/);
});

test('variação', () => {
  assert.equal(variacao(112, 100), 0.12);
  assert.equal(variacao(0, 0), 0);
  assert.equal(variacao(50, 0), null);
  assert.equal(formatarVariacao(0.124), '+12%');
  assert.equal(formatarVariacao(-0.08), '−8%');
  assert.equal(formatarVariacao(null), 'novo');
  assert.equal(formatarVariacao(0.001), '0%');
});
