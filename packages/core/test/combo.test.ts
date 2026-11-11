import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularCombo, precoSeparado, type PassoCombo } from '../src/combo.js';
import type { Grupo, Produto } from '../src/tipos.js';

// Mesmo cenário do teste do banco (supabase/tests/99zzz_combos.sql).
const prod = (id: string, nome: string, preco: number): Produto => ({ id, nome, preco, marcas: [{ marcaId: 'm', ativo: true, delivery: true, presencial: true, totem: false }] });
const sabores: Grupo = {
  id: 'sab', nome: 'Sabores', formacao: 'maior', obrigatorio: true, pizza: true, minQtd: 1, maxQtd: 2, permiteRepetir: false, ativo: true, delivery: true, presencial: true,
  opcoes: [
    { id: 'cal', nome: 'Calabresa', precoItem: 0, minQtd: 0, maxQtd: 1, ativo: true, delivery: true, presencial: true },
    { id: 'cos', nome: 'Costela', precoItem: 600, minQtd: 0, maxQtd: 1, ativo: true, delivery: true, presencial: true },
  ],
};
const combo = prod('combo', 'Combo Família', 9990);
const passos: PassoCombo[] = [
  { id: 'p1', titulo: 'Pizza', quantidade: 1, opcoes: [{ produto: prod('gig', 'Pizza Gigante', 9199), grupos: [sabores] }] },
  { id: 'p2', titulo: 'Refri 2L', quantidade: 1, opcoes: [{ produto: prod('coca', 'Coca 2L', 1500), grupos: [] }, { produto: prod('gua', 'Guaraná 2L', 1400), grupos: [] }] },
];

test('preço do combo soma os adicionais das escolhas', () => {
  const r = calcularCombo(combo, passos, [
    { passoId: 'p1', produtoId: 'gig', escolhas: { sab: { cal: 1, cos: 1 } } },
    { passoId: 'p2', produtoId: 'gua', escolhas: {} },
  ], 'm', 'delivery');
  assert.deepEqual(r, { base: 9990, extras: 600, unitario: 10590 });
  assert.equal(precoSeparado(passos, 'm', 'delivery'), 9199 + 1400);
});

test('faltando escolha ou produto que não vale', () => {
  assert.throws(() => calcularCombo(combo, passos, [{ passoId: 'p1', produtoId: 'gig', escolhas: { sab: { cal: 1 } } }], 'm', 'delivery'), /Refri 2L/);
  assert.throws(() => calcularCombo(combo, passos, [
    { passoId: 'p1', produtoId: 'coca', escolhas: {} },
    { passoId: 'p2', produtoId: 'coca', escolhas: {} },
  ], 'm', 'delivery'), /não vale/);
  assert.throws(() => calcularCombo(combo, passos, [
    { passoId: 'p1', produtoId: 'gig', escolhas: {} },
    { passoId: 'p2', produtoId: 'coca', escolhas: {} },
  ], 'm', 'delivery'), /Sabores/);
});
