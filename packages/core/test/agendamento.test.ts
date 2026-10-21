import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dataNoFuso, faseAgendamento, horaNoFuso, rotuloHorario, taxaDoBairro } from '../src/agendamento.js';

const SP = 'America/Sao_Paulo';

test('fase do agendado no quadro', () => {
  const quando = new Date('2026-10-23T20:00:00-03:00');
  assert.equal(faseAgendamento(null, 30), 'imediato');
  // preparo 30 + folga 10 → acorda às 19:20
  assert.equal(faseAgendamento(quando, 30, new Date('2026-10-23T19:19:00-03:00')), 'agendado');
  assert.equal(faseAgendamento(quando, 30, new Date('2026-10-23T19:20:00-03:00')), 'preparar');
  assert.equal(faseAgendamento(quando, 30, new Date('2026-10-23T21:00:00-03:00')), 'preparar', 'atrasado continua em preparar');
});

test('taxa do bairro ignora maiúsculas, espaços e bairros inativos', () => {
  const areas = [
    { bairro: 'Centro', taxa: 500 },
    { bairro: 'Praia Brava', taxa: 800, ativo: false },
    { bairro: 'Meia Praia', taxa: 0 },
  ];
  assert.equal(taxaDoBairro(areas, '  CENTRO '), 500);
  assert.equal(taxaDoBairro(areas, 'meia praia'), 0, 'grátis é 0, não null');
  assert.equal(taxaDoBairro(areas, 'Praia Brava'), null);
  assert.equal(taxaDoBairro(areas, 'Morretes'), null);
  assert.equal(taxaDoBairro(areas, ''), null);
});

test('rótulos de horário no fuso da loja', () => {
  const agora = new Date('2026-10-21T12:00:00-03:00'); // quarta
  assert.equal(rotuloHorario(new Date('2026-10-21T20:00:00-03:00'), SP, agora), 'hoje 20:00');
  assert.equal(rotuloHorario(new Date('2026-10-22T19:30:00-03:00'), SP, agora), 'amanhã 19:30');
  assert.equal(rotuloHorario(new Date('2026-10-23T20:15:00-03:00'), SP, agora), 'sex 23/10 20:15');
  // 01:00 UTC de quinta ainda é quarta 22:00 em São Paulo
  assert.equal(rotuloHorario(new Date('2026-10-22T01:00:00Z'), SP, agora), 'hoje 22:00');
  assert.equal(horaNoFuso(new Date('2026-10-22T01:00:00Z'), SP), '22:00');
  assert.equal(dataNoFuso(new Date('2026-10-22T01:00:00Z'), SP), '2026-10-21');
});
