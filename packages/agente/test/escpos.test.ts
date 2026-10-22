import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codificar } from '../src/codepage.js';
import { gerarEscPos } from '../src/escpos.js';
import { montarCupom } from '../../core/src/cupom.js';

const temSeq = (b: Uint8Array, seq: number[]) => {
  outer: for (let i = 0; i + seq.length <= b.length; i++) {
    for (let j = 0; j < seq.length; j++) if (b[i + j] !== seq[j]) continue outer;
    return true;
  }
  return false;
};

test('páginas de código do português', () => {
  assert.deepEqual([...codificar('ção', '860')], [0x87, 0x84, 0x6f]);
  assert.deepEqual([...codificar('ção', '850')], [0x87, 0xc6, 0x6f]);
  assert.deepEqual([...codificar('ção', '1252')], [0xe7, 0xe3, 0x6f]);
  assert.deepEqual([...codificar('ÁÉÍÓÚ', '860')], [0x86, 0x90, 0x8b, 0x9f, 0x96]);
  assert.deepEqual([...codificar('º ª', '850')], [0xa7, 0x20, 0xa6]);
  assert.deepEqual([...codificar('R$ 1,00 — ok', '860')], [...'R$ 1,00 - ok'].map((c) => c.charCodeAt(0)));
  assert.deepEqual([...codificar('ő', '860')], [0x6f], 'fora da tabela: tira o acento');
  assert.deepEqual([...codificar('🍕', '860')], [0x3f]);
  assert.deepEqual([...codificar('ç', 'UTF8')], [0xc3, 0xa7]);
});

test('ESC/POS: início, página, estilos, avanço, corte e gaveta', () => {
  const linhas = montarCupom('teste', { teste: true, impressora: 'Cozinha', modelo: 'epson-tm-t20x', protocolo: 'EscPosEpson', colunas: 48, pagina_codigo: '860', loja: 'Loja', criado_em: '2026-10-21T23:00:00Z' }, 48);
  const b = gerarEscPos(linhas, { protocolo: 'EscPosEpson', colunas: 48, pagina_codigo: '860', espaco_linhas: 40, pular_linhas: 5, corte: true, gaveta: true });
  assert.deepEqual([...b.slice(0, 5)], [0x1b, 0x40, 0x1b, 0x74, 3], 'ESC @ + ESC t 3 (PC860)');
  assert.ok(temSeq(b, [0x1b, 0x33, 40]), 'espaço entre linhas');
  assert.ok(temSeq(b, [0x1d, 0x21, 0x11]), 'letra grande');
  assert.ok(temSeq(b, [0x1b, 0x45, 1]), 'negrito');
  assert.ok(temSeq(b, [0x1b, 0x61, 1]), 'centralizado');
  assert.ok(temSeq(b, [0x1b, 0x64, 5, 0x1d, 0x56, 0x01, 0x1b, 0x70, 0x00, 0x19, 0xfa]), 'avança 5, corta, abre gaveta');
  assert.ok(temSeq(b, codificar('Acentuação', '860') as unknown as number[]) || temSeq(b, [...codificar('Acentuação', '860')]), 'texto codificado em 860');
  assert.ok(temSeq(b, [...'='.repeat(48)].map((c) => c.charCodeAt(0))), 'separador na largura do papel');
});

test('sem corte nem gaveta e espaço padrão', () => {
  const b = gerarEscPos([{ t: 'oi' }], { protocolo: 'CustomPos', colunas: 32, pagina_codigo: '850', espaco_linhas: 0, pular_linhas: 2, corte: false, gaveta: false });
  assert.deepEqual([...b], [0x1b, 0x40, 0x1b, 0x74, 2, 0x1b, 0x32, 0x6f, 0x69, 0x0a, 0x1b, 0x64, 2]);
});
