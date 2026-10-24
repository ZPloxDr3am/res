import { test } from 'node:test';
import assert from 'node:assert/strict';
import { percentualDesconto, promoEncerrada, promoVale, resumoAgenda, type AgendaPromo } from '../src/promocao.js';

// Mesmos casos do teste do banco (supabase/tests/99zz_promocao.sql). 2026-10-27 é terça-feira.
const noite: AgendaPromo = { dias: [2, 3, 4], inicio: '18:00', fim: '23:59', ate: '2026-11-30' };
const madrugada: AgendaPromo = { dias: [5], inicio: '18:00', fim: '02:00', ate: null };
const em = (s: string) => new Date(s);

test('sem agenda vale sempre', () => {
  assert.equal(promoVale({ dias: null, inicio: null, fim: null, ate: null }, em('2026-10-25T15:00:00-03:00')), true);
  assert.equal(promoVale({ dias: [], inicio: null, fim: null, ate: null }, em('2026-10-25T15:00:00-03:00')), true);
});

test('dias e horário (fuso de São Paulo)', () => {
  assert.equal(promoVale(noite, em('2026-10-27T19:00:00-03:00')), true); // terça 19h
  assert.equal(promoVale(noite, em('2026-10-27T17:59:00-03:00')), false); // terça antes
  assert.equal(promoVale(noite, em('2026-10-26T19:00:00-03:00')), false); // segunda
  assert.equal(promoVale(noite, em('2026-10-27T22:30:00Z')), true); // 19:30 em SP
  assert.equal(promoVale(noite, em('2026-12-01T19:00:00-03:00')), false); // depois do último dia
  assert.equal(promoVale(noite, em('2026-11-26T19:00:00-03:00')), true); // quinta antes do fim
});

test('horário que passa da meia-noite conta no dia em que começou', () => {
  assert.equal(promoVale(madrugada, em('2026-10-30T23:00:00-03:00')), true); // sexta 23h
  assert.equal(promoVale(madrugada, em('2026-10-31T01:30:00-03:00')), true); // sábado 1h30 = noite de sexta
  assert.equal(promoVale(madrugada, em('2026-10-31T03:00:00-03:00')), false);
  assert.equal(promoVale(madrugada, em('2026-10-30T01:30:00-03:00')), false); // sexta 1h30 = noite de quinta
});

test('resumo, encerrada e percentual', () => {
  assert.equal(resumoAgenda(noite), 'Ter, Qua, Qui · 18:00–23:59 · até 30/11');
  assert.equal(resumoAgenda({ dias: null, inicio: null, fim: null, ate: null }), 'Todos os dias');
  assert.equal(promoEncerrada(noite, em('2026-12-02T12:00:00-03:00')), true);
  assert.equal(promoEncerrada(noite, em('2026-10-26T12:00:00-03:00')), false);
  assert.equal(percentualDesconto(8199, 6999), 15);
  assert.equal(percentualDesconto(5000, 6000), 0);
});
