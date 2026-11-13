import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alertasMargem, engenhariaCardapio, precoCardapio, type ProdutoMargem } from '../src/margem.js';

const p = (id: string, vendidos: number, preco: number, custoUnit: number, extra: Partial<ProdutoMargem> = {}): ProdutoMargem => ({
  id, nome: id, categoria: null, preco, vendidos, receita: preco * vendidos, custo: custoUnit * vendidos, custo_conhecido: true, custo_ficha: custoUnit, ...extra,
});

test('engenharia de cardápio: quatro quadrantes', () => {
  const r = engenhariaCardapio([
    p('estrela', 100, 5000, 1500), // margem 3500, popular
    p('burro', 100, 3000, 1800), // margem 1200, popular
    p('quebra', 5, 6000, 1500), // margem 4500, pouco vendido
    p('cao', 5, 2500, 1500), // margem 1000, pouco vendido
    p('sem custo', 50, 3000, 0, { custo_conhecido: false }),
    p('parado', 0, 3000, 1000),
  ]);
  assert.deepEqual(Object.fromEntries(r.itens.map((i) => [i.id, i.classe])), { estrela: 'estrela', burro: 'burro_de_carga', quebra: 'quebra_cabeca', cao: 'cao' });
  assert.equal(r.itens.find((i) => i.id === 'burro')!.cmvPct, 60);
  assert.equal(r.corteParticipacao, 0.7 / 4);
  assert.equal(engenhariaCardapio([]).itens.length, 0);
});

test('preço de cardápio termina em ,90', () => {
  assert.equal(precoCardapio(4321), 4390);
  assert.equal(precoCardapio(4390), 4390);
  assert.equal(precoCardapio(4395), 4490);
  assert.equal(precoCardapio(12345), 12400);
  assert.equal(precoCardapio(0), 0);
});

test('alertas: acima do CMV alvo com preço sugerido; sem venda usa a ficha', () => {
  const a = alertasMargem([
    p('ok', 10, 5000, 1500),
    p('caro', 10, 4000, 2000), // 50%
    p('novo', 0, 3000, 1500, { receita: 0, custo: 0 }), // ficha 50%
    p('sem ficha', 0, 3000, 0, { custo_ficha: null, receita: 0, custo: 0 }),
  ], 35);
  assert.deepEqual(a.map((x) => [x.id, x.cmvPct, x.precoAtual, x.precoSugerido, x.base]), [
    ['caro', 50, 4000, 5790, 'vendas'],
    ['novo', 50, 3000, 4290, 'ficha'],
  ]);
});
