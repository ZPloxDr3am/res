// Testes de paridade (clone/parity.md do estudo) para as regras de cardápio em TypeScript.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  marcarObrigatorio, alterarMinimo, alterarMaximo, validarGrupo, descreverSelecao,
  calcularItem, precoBase, ErroEscolha, novoSetor, validarSetor, setorVisivel,
  temPermissao, RECURSOS, formatarReais,
  type Grupo, type Produto,
} from '../src/index.js';
import { readFileSync } from 'node:fs';

const grupoBase = { nome: 'Sabores', obrigatorio: false, minQtd: 0, maxQtd: 1 };

test('T-011: marcar obrigatório sobe o mínimo para 1 e a validação recusa obrigatório com mínimo 0', () => {
  const g = marcarObrigatorio(grupoBase, true);
  assert.equal(g.minQtd, 1);
  assert.deepEqual(validarGrupo({ ...g, minQtd: 0 }).map((e) => e.campo), ['minQtd']);
  assert.equal(validarGrupo(g).length, 0);
});

test('T-012: mínimo acima do máximo leva o máximo junto (e o contrário)', () => {
  const g = alterarMinimo({ ...grupoBase, maxQtd: 3 }, 5);
  assert.deepEqual([g.minQtd, g.maxQtd], [5, 5]);
  const h = alterarMaximo({ ...grupoBase, minQtd: 4, maxQtd: 4 }, 2);
  assert.deepEqual([h.minQtd, h.maxQtd], [2, 2]);
  assert.equal(validarGrupo({ ...grupoBase, minQtd: 3, maxQtd: 2 })[0]?.campo, 'maxQtd');
});

test('descrição da seleção acompanha mínimo e máximo', () => {
  assert.equal(descreverSelecao({ ...grupoBase, minQtd: 0, maxQtd: 3 }), 'O cliente escolhe até 3 opções (opcional).');
  assert.equal(descreverSelecao({ ...grupoBase, minQtd: 1, maxQtd: 1 }), 'O cliente escolhe exatamente 1 opção.');
});

test('T-001 / T-002: setor novo nasce nas marcas e canais; sem marca é recusado com mensagem clara', () => {
  const s = novoSetor(['m1', 'm2']);
  assert.deepEqual([s.delivery, s.presencial, s.marcas], [true, true, ['m1', 'm2']]);
  assert.deepEqual(validarSetor({ ...s, nome: 'Pizzas', marcas: [] }), ['A categoria precisa estar em pelo menos uma marca.']);
});

test('T-003: setor sem canais não aparece', () => {
  assert.equal(setorVisivel({ delivery: false, presencial: false }, 'delivery'), false);
});

test('T-006: nomes com emoji contam caracteres, não bytes', () => {
  assert.deepEqual(validarSetor({ ...novoSetor(['m']), nome: '🍕'.repeat(150) }), []);
});

// ---------------------------------------------------------------- preço

const produto: Produto = {
  id: 'p', nome: 'Pizza Grande', preco: 0,
  marcas: [
    { marcaId: 'pizzaria', ativo: true, delivery: true, presencial: true, totem: true },
    { marcaId: 'burger', ativo: false, delivery: true, presencial: true, totem: true },
  ],
};
const opc = (id: string, preco: number, extra: Partial<Grupo['opcoes'][number]> = {}) => ({
  id, nome: id, precoItem: preco, minQtd: 0, maxQtd: 4, ativo: true, delivery: true, presencial: true, ...extra,
});
const grupo = (formacao: Grupo['formacao'], extra: Partial<Grupo> = {}): Grupo => ({
  id: 'g', nome: 'Sabores', formacao, obrigatorio: true, pizza: true, minQtd: 1, maxQtd: 2, permiteRepetir: false,
  ativo: true, delivery: true, presencial: true,
  opcoes: [opc('calabresa', 4000), opc('quatro_queijos', 5000), opc('borda', 900)],
  ...extra,
});

test('T-013: proporcional — meio a meio de R$ 40 e R$ 50 custa R$ 45', () => {
  const r = calcularItem(produto, [grupo('proporcional')], { g: { calabresa: 1, quatro_queijos: 1 } }, 'pizzaria', 'delivery');
  assert.equal(r.unitario, 4500);
  assert.equal(formatarReais(r.unitario).replace(/\s/g, ' '), 'R$ 45,00');
});

test('T-013: maior valor — cobra o sabor mais caro', () => {
  const r = calcularItem(produto, [grupo('maior')], { g: { calabresa: 1, quatro_queijos: 1 } }, 'pizzaria', 'delivery');
  assert.equal(r.unitario, 5000);
});

test('T-013: soma e brinde', () => {
  assert.equal(calcularItem(produto, [grupo('soma')], { g: { calabresa: 1, borda: 1 } }, 'pizzaria', 'delivery').unitario, 4900);
  assert.equal(calcularItem(produto, [grupo('brinde')], { g: { calabresa: 1, borda: 1 } }, 'pizzaria', 'delivery').unitario, 0);
});

test('T-013: proporcional com 3 sabores arredonda no centavo', () => {
  const g = grupo('proporcional', { maxQtd: 3, opcoes: [opc('a', 1000), opc('b', 1000), opc('c', 1001)] });
  assert.equal(calcularItem(produto, [g], { g: { a: 1, b: 1, c: 1 } }, 'pizzaria', 'delivery').unitario, 1000);
});

test('T-014: grupo de pizza registra frações para relatório e estoque', () => {
  const r = calcularItem(produto, [grupo('proporcional')], { g: { calabresa: 1, quatro_queijos: 1 } }, 'pizzaria', 'delivery');
  assert.deepEqual(r.fracoes, { calabresa: 0.5, quatro_queijos: 0.5 });
});

test('escolhas fora de mínimo/máximo, repetição e obrigatoriedade são recusadas', () => {
  const g = grupo('soma');
  assert.throws(() => calcularItem(produto, [g], {}, 'pizzaria', 'delivery'), ErroEscolha);
  assert.throws(() => calcularItem(produto, [g], { g: { calabresa: 1, quatro_queijos: 1, borda: 1 } }, 'pizzaria', 'delivery'), /no máximo 2/);
  assert.throws(() => calcularItem(produto, [g], { g: { calabresa: 2 } }, 'pizzaria', 'delivery'), /não pode repetir/);
  const comRepeticao = grupo('soma', { permiteRepetir: true });
  assert.equal(calcularItem(produto, [comRepeticao], { g: { calabresa: 2 } }, 'pizzaria', 'delivery').unitario, 8000);
});

test('preço base: promocional → canal → padrão; indisponível na marca inativa', () => {
  const p: Produto = { id: 'x', nome: 'X', preco: 2000, marcas: [
    { marcaId: 'm', ativo: true, delivery: true, presencial: true, totem: false, precoDelivery: 2500, precoPresencial: null, precoPromocional: null },
  ] };
  assert.equal(precoBase(p, 'm', 'delivery'), 2500);
  assert.equal(precoBase(p, 'm', 'presencial'), 2000);
  assert.equal(precoBase(p, 'm', 'totem'), null);
  assert.equal(precoBase({ ...p, marcas: [{ ...p.marcas[0]!, precoPromocional: 1800 }] }, 'm', 'delivery'), 1800);
  assert.equal(precoBase(produto, 'burger', 'delivery'), null); // T-010: inativo na marca
});

test('preço da opção por canal sobrepõe o do item', () => {
  const g = grupo('soma', { opcoes: [opc('borda', 900, { precoPresencial: 700 })], obrigatorio: false, minQtd: 0 });
  assert.equal(calcularItem(produto, [g], { g: { borda: 1 } }, 'pizzaria', 'presencial').unitario, 700);
  assert.equal(calcularItem(produto, [g], { g: { borda: 1 } }, 'pizzaria', 'delivery').unitario, 900);
});

// ---------------------------------------------------------------- permissões

test('permissões: dono e gerente podem tudo; demais conforme o grupo', () => {
  assert.equal(temPermissao('gerente', [], 'fiscal'), true);
  assert.equal(temPermissao('funcionario', ['cardapio'], 'cardapio'), true);
  assert.equal(temPermissao('funcionario', ['cardapio'], 'financeiro'), false);
});

test('lista de recursos igual à da migração', () => {
  const sql = readFileSync(new URL('../../../supabase/migrations/20261020000001_base.sql', import.meta.url), 'utf8');
  const doSql = [...sql.matchAll(/^\s+\('([a-z_]+)',\s*'/gm)].map((m) => m[1]);
  assert.deepEqual([...doSql].sort(), [...RECURSOS].sort());
});
