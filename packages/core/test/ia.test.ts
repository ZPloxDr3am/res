import { test } from 'node:test';
import assert from 'node:assert/strict';
import { converterUnidade, jaExiste, normalizarCardapioLido, normalizarFichaSugerida, precoLido } from '../src/ia.js';

test('cardápio lido: limpa, junta categorias repetidas, tira produtos repetidos e preços absurdos', () => {
  const c = normalizarCardapioLido({
    categorias: [
      { nome: '  Pizzas  ', produtos: [{ nome: 'Calabresa', descricao: 'calabresa,  cebola', preco: 49.9 }, { nome: 'calabresa', preco: 10 }, { nome: '', preco: 5 }] },
      { nome: 'Bebidas', produtos: [{ nome: 'Coca 2L', preco: 'R$ 14,00' }, { nome: 'Água', preco: -1 }] },
      { nome: 'PIZZAS', produtos: [{ nome: 'Margherita', preco: 'trinta' }] },
      { nome: 'Vazia', produtos: [] },
      { produtos: [{ nome: 'Sem categoria', preco: 999999 }] },
    ],
  });
  assert.deepEqual(c.map((x) => x.nome), ['Pizzas', 'Bebidas', 'Cardápio']);
  assert.deepEqual(c[0]!.produtos, [
    { nome: 'Calabresa', descricao: 'calabresa, cebola', preco: 4990 },
    { nome: 'Margherita', descricao: null, preco: null },
  ]);
  assert.deepEqual(c[1]!.produtos.map((p) => p.preco), [1400, null]);
  assert.equal(c[2]!.produtos[0]!.preco, null);
  assert.deepEqual(normalizarCardapioLido(null), []);
  assert.deepEqual(normalizarCardapioLido({ categorias: 'x' }), []);
});

test('preço lido e produto existente', () => {
  assert.equal(precoLido('1.234,50'), 123450);
  assert.equal(precoLido(0), null);
  assert.equal(precoLido('R$'), null);
  assert.equal(jaExiste('Pão de Queijo', ['pao de queijo']), true);
  assert.equal(jaExiste('X-Salada', ['X-Bacon']), false);
});

test('ficha sugerida: só insumo da loja, unidade convertida, faltantes separados', () => {
  const insumos = [
    { id: 'i1', nome: 'Mussarela', unidade: 'KG' as const },
    { id: 'i2', nome: 'Massa de pizza', unidade: 'UN' as const },
    { id: 'i3', nome: 'Molho de tomate', unidade: 'L' as const },
  ];
  const r = normalizarFichaSugerida(
    {
      itens: [
        { insumo_id: 'i1', nome: 'Mussarela', quantidade: 250, unidade: 'G' },
        { insumo_id: '', nome: 'massa de pizza', quantidade: 1, unidade: 'UN' },
        { insumo_id: 'i3', nome: 'Molho', quantidade: 120, unidade: 'ML' },
        { insumo_id: 'inventado', nome: 'Manjericão', quantidade: 5, unidade: 'G' },
        { insumo_id: 'i1', nome: 'Mussarela extra', quantidade: 50, unidade: 'G' },
        { insumo_id: 'i2', nome: 'Massa', quantidade: 200, unidade: 'G' },
        { nome: 'Nada', quantidade: 0, unidade: 'G' },
      ],
      observacao: 'Pizza grande de 35 cm',
    },
    insumos,
  );
  assert.deepEqual(r.itens.map((i) => [i.insumo_id, i.quantidade]), [['i1', 0.3], ['i2', 1], ['i3', 0.12]]);
  assert.deepEqual(r.faltam, ['Manjericão', 'Massa']);
  assert.equal(r.observacao, 'Pizza grande de 35 cm');
  assert.equal(converterUnidade(1.5, 'kg', 'G'), 1500);
  assert.equal(converterUnidade(1, 'L', 'KG'), null);
});
