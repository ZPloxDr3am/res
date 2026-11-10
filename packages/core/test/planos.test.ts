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
  const cat = [
    { id: 'estoque', nome: 'Estoque', descricao: '', preco: 29.9, cobranca: 'conta' as const, ordem: 1 },
    { id: 'marcas', nome: 'Loja ou cardápio extra', descricao: '', preco: 49.9, cobranca: 'cardapio' as const, ordem: 2 },
    { id: 'app_entregador', nome: 'App Entregador', descricao: '', preco: 19.9, cobranca: 'aparelho' as const, ordem: 3 },
  ];
  const plano = { id: 'completo', nome: 'Completo', descricao: '', preco_loja: 239.9, modulos: [], ordem: 1, ativo: true };
  // 3 lojas (2 extras) + estoque + 1 aparelho extra
  const v = valorMensal({ plano, cardapios: 3, adicionais: [{ modulo: 'estoque', ligado: true, cobrar: true }], aparelhosExtra: { app_entregador: 1 }, catalogo: cat });
  assert.equal(v.total, 389.5);
  const a = valorMensal({ plano, cardapios: 1, adicionais: [], catalogo: cat, anual: true, descontoAnual: 20 });
  assert.equal(a.total, 191.92);
  assert.equal(a.totalPeriodo, 2303.04);
});
