import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moduloDaRota, rotaLiberada, valorMensal } from '../src/planos.js';
test('rotas', () => {
  assert.equal(moduloDaRota('/estoque/fichas'), 'estoque');
  assert.equal(moduloDaRota('/pedidos'), null);
  assert.equal(rotaLiberada('/fidelidade', ['ifood']), false);
  assert.equal(rotaLiberada('/cardapio', []), true);
});
test('valor', () => {
  const cat = [{ id: 'estoque', nome: 'Estoque', descricao: '', preco: 59, cobranca: 'loja' as const, ordem: 1 }, { id: 'marcas', nome: 'Cardápio extra', descricao: '', preco: 99, cobranca: 'cardapio' as const, ordem: 2 }];
  const plano = { id: 'essencial', nome: 'Essencial', descricao: '', preco_loja: 199.99, modulos: [], ordem: 1, ativo: true };
  const v = valorMensal({ plano, lojas: 2, cardapios: 3, adicionais: [{ modulo: 'estoque', ligado: true, cobrar: true }], catalogo: cat });
  assert.equal(v.total, 399.98 + 118 + 99);
});
