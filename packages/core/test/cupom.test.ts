import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colunasLR, cupomTexto, montarCupom, quebrar, type CupomDados } from '../src/cupom.js';
import { MODELOS_IMPRESSORA, modeloPorId } from '../src/impressoras.js';

const pedido: CupomDados = {
  loja: 'Loja I', marca: 'LA PIZZA', numero: 123, tipo_pedido: 'entrega', origem: 'cardapio_digital',
  criado_em: '2026-10-21T23:15:00Z', agendado_para: null, fuso: 'America/Sao_Paulo', setor: 'Pizzas',
  cliente: { nome: 'Ana', telefone: '48999990000' },
  endereco: { logradouro: 'Rua das Flores', numero: '10', bairro: 'Centro', referencia: 'portão azul' },
  observacao: 'sem cebola', pagamento: 'dinheiro', troco_para: 10000,
  subtotal: 8500, taxa_entrega: 500, desconto: 0, total: 9000,
  itens: [
    { quantidade: 1, nome: 'Pizza Grande', total: 8500, observacao: 'bem passada', opcoes: [
      { grupo: 'Sabores', nome: 'Calabresa', quantidade: 1, fracao: 0.5 },
      { grupo: 'Sabores', nome: 'Frango', quantidade: 1, fracao: 0.5 },
    ] },
  ],
};

test('quebra de linha respeita a largura e o recuo', () => {
  assert.deepEqual(quebrar('um dois tres', 7), ['um dois', 'tres']);
  assert.deepEqual(quebrar('- opção bem comprida', 10, '  '), ['- opção', '  bem', '  comprida']);
  assert.deepEqual(quebrar('ABCDEFGHIJ', 4), ['ABCD', 'EFGH', 'IJ']);
  for (const l of quebrar('x '.repeat(100), 32)) assert.ok(l.length <= 32);
  assert.deepEqual(colunasLR('Total', 'R$ 9,00', 20), ['Total        R$ 9,00']);
});

test('cupom da cozinha: sem preço, frações, obs em destaque, horário no fuso da loja', () => {
  const txt = cupomTexto(montarCupom('cozinha', pedido, 48), 48);
  assert.match(txt, /COZINHA · PIZZAS/);
  assert.match(txt, /#123 ENTREGA/);
  assert.match(txt, /21\/10 20:15 · Cardápio digital/);
  assert.match(txt, /- 1\/2 Calabresa/);
  assert.match(txt, />> OBS: BEM PASSADA/);
  assert.match(txt, /OBS DO PEDIDO: SEM CEBOLA/);
  assert.doesNotMatch(txt, /R\$/);
  assert.doesNotMatch(txt, /Rua das Flores/, 'cozinha não mostra endereço por padrão');
});

test('via do pedido: endereço, totais e troco a levar', () => {
  const linhas = montarCupom('pedido', pedido, 32, {}, true);
  const txt = cupomTexto(linhas, 32);
  assert.match(txt, /2ª VIA/);
  assert.match(txt, /Rua das Flores, 10/);
  assert.match(txt, /Troco para R\$\s100,00: levar R\$\s10,00/);
  for (const l of linhas) if ('t' in l) assert.ok(l.t.length <= (l.grande ? 16 : 32), `linha longa: "${l.t}"`);
});

test('via do pedido de entrega leva o QR do motoboy', () => {
  const comQr = montarCupom('pedido', { ...pedido, qr: 'abc123' }, 48);
  assert.ok(comQr.some((l) => 'qr' in l && l.qr === 'https://res-iqzs.vercel.app/m/d/abc123'));
  const coz = montarCupom('cozinha', { ...pedido, qr: 'abc123' }, 48);
  assert.ok(coz.some((l) => 'qr' in l), 'via da cozinha também leva o QR (loja que imprime só ela)');
  assert.match(cupomTexto(coz, 48), /COBRAR R\$\s90,00/);
  assert.match(cupomTexto(coz, 48), /levar R\$\s10,00 de troco/);
  assert.match(cupomTexto(montarCupom('cozinha', { ...pedido, qr: 'abc123', pago: true }, 48), 48), /PAGO - NAO COBRAR/);
  assert.ok(!montarCupom('cozinha', { ...pedido, qr: 'abc123' }, 48, { mostrar_qr: false }).some((l) => 'qr' in l), 'dá para desligar no layout');
  assert.ok(!montarCupom('pedido', { ...pedido, tipo_pedido: 'retirada', qr: 'abc123' }, 48).some((l) => 'qr' in l));
});

test('layout: grupos, sem destaque e rodapé', () => {
  const txt = cupomTexto(montarCupom('cozinha', pedido, 48, { fonte: 'normal', mostrar_grupos: true, destacar_obs: false, rodape: 'Bom trabalho' }), 48);
  assert.match(txt, /- Sabores: 1\/2 Calabresa, 1\/2 Frango/);
  assert.match(txt, /Obs\.: bem passada/);
  assert.match(txt, /Bom trabalho/);
});

test('catálogo de modelos', () => {
  assert.equal(new Set(MODELOS_IMPRESSORA.map((x) => x.id)).size, MODELOS_IMPRESSORA.length, 'ids únicos');
  assert.equal(modeloPorId('epson-tm-t20x')?.colunas, 48);
  assert.equal(modeloPorId('generica-58')?.papel, 58);
  assert.equal(MODELOS_IMPRESSORA.filter((x) => x.homologada).length, 23);
});

test('combo sai em blocos organizados na comanda', async () => {
  const { blocosCombo } = await import('../src/cupom.js');
  const opcoes = [
    { grupo: 'Pizza', nome: 'Pizza Gigante 40cm', quantidade: 1, fracao: null, passo: true },
    { grupo: 'Pizza Gigante 40cm · Sabores Gigante', nome: 'Calabresa', quantidade: 1, fracao: 0.5 },
    { grupo: 'Pizza Gigante 40cm · Sabores Gigante', nome: 'Costela Supreme', quantidade: 1, fracao: 0.5 },
    { grupo: 'Pizza pequena', nome: 'Pizza Broto 25cm', quantidade: 1, fracao: null, passo: true },
    { grupo: 'Pizza Broto 25cm · Sabores Broto', nome: 'Do Cheff', quantidade: 1, fracao: null },
    { grupo: 'Refrigerante 2L', nome: 'Kuat 2 litros', quantidade: 1, fracao: null, passo: true },
  ];
  assert.deepEqual(blocosCombo(opcoes), [
    { titulo: 'Pizza Gigante 40cm', itens: ['1/2 Calabresa', '1/2 Costela Supreme'] },
    { titulo: 'Pizza Broto 25cm', itens: ['Do Cheff'] },
    { titulo: 'Refrigerante 2L', itens: ['Kuat 2 litros'] },
  ]);
  const texto = cupomTexto(montarCupom('cozinha', { ...pedido, itens: [{ quantidade: 1, nome: 'Combo Família', total: 13690, observacao: null, opcoes }] }, 48), 48);
  assert.ok(texto.includes('1x Combo Família'));
  assert.match(texto, /> PIZZA GIGANTE 40CM\n\s+- 1\/2 Calabresa\n\s+- 1\/2 Costela\s+Supreme\n\s+> PIZZA BROTO 25CM\n\s+- Do Cheff\n\s+> REFRIGERANTE 2L\n\s+- Kuat 2 litros/);
  assert.equal(blocosCombo([{ grupo: 'Sabores', nome: 'Calabresa', quantidade: 1, fracao: null }]), null);
});

test('via da cozinha de entrega traz o endereço por extenso junto do QR', () => {
  const t = cupomTexto(montarCupom('cozinha', { ...pedido, qr: 'abc123', cidade: 'Itapema - SC' }, 48), 48);
  assert.match(t, /ENTREGAR EM:/);
  assert.match(t, /Rua das Flores, 10/);
  assert.match(t, /Bairro: Centro - Itapema - SC/);
  assert.match(t, /Ref\.: portão azul/);
  assert.match(t, /Cliente: Ana · 48999990000/);
  // a via do pedido já mostra o endereço em cima: não repete
  const v = cupomTexto(montarCupom('pedido', { ...pedido, qr: 'abc123' }, 48), 48);
  assert.doesNotMatch(v, /ENTREGAR EM:/);
});
