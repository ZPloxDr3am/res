import { test } from 'node:test';
import assert from 'node:assert/strict';
import { custoMedio, entradaDoItem, ErroNFe, lerNFe, palpiteUnidade, situacaoEstoque, sugerirInsumo } from '../src/estoque.js';

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe42261012345678000199550010000123451234567890" versao="4.00">
<ide><cUF>42</cUF><nNF>12345</nNF><serie>1</serie><dhEmi>2026-10-27T10:00:00-03:00</dhEmi></ide>
<emit><CNPJ>12345678000199</CNPJ><xNome>Laticínios Serra Azul LTDA</xNome><xFant>Serra Azul</xFant></emit>
<dest><CNPJ>98765432000155</CNPJ><xNome>LA PIZZA &amp; CIA</xNome></dest>
<det nItem="1"><prod><cProd>MUS01</cProd><cEAN>SEM GTIN</cEAN><xProd>QUEIJO MUSSARELA FATIADO</xProd><NCM>04061090</NCM><CFOP>5102</CFOP><uCom>KG</uCom><qCom>10.0000</qCom><vUnCom>32.5000</vUnCom><vProd>325.00</vProd><vDesc>5.00</vDesc></prod>
<imposto><ICMS><ICMS00><vICMS>0</vICMS></ICMS00></ICMS></imposto></det>
<det nItem="2"><prod><cProd>CAL02</cProd><cEAN>7891234567895</cEAN><xProd>CALABRESA DEFUMADA CX 6KG</xProd><NCM>16010000</NCM><CFOP>5102</CFOP><uCom>CX</uCom><qCom>2</qCom><vUnCom>150.00</vUnCom><vProd>300.00</vProd><vFrete>10.00</vFrete></prod>
<imposto><IPI><IPITrib><vIPI>6.00</vIPI></IPITrib></IPI></imposto></det>
<total><ICMSTot><vProd>625.00</vProd><vNF>636.00</vNF></ICMSTot></total>
</infNFe></NFe></nfeProc>`;

test('lê a NF-e do fornecedor', () => {
  const n = lerNFe(XML);
  assert.equal(n.chave, '42261012345678000199550010000123451234567890');
  assert.equal(n.numero, '12345');
  assert.equal(n.emitente.cnpj, '12345678000199');
  assert.equal(n.emitente.nome, 'Serra Azul');
  assert.equal(n.destinatario.nome, 'LA PIZZA & CIA');
  assert.equal(n.valorTotal, 63600);
  assert.equal(n.itens.length, 2);
  assert.deepEqual(
    n.itens.map((i) => [i.codigo, i.unidade, i.quantidade, i.custoTotal, i.ean]),
    [
      ['MUS01', 'KG', 10, 32000, null],
      ['CAL02', 'CX', 2, 31600, '7891234567895'],
    ],
  );
});

test('arquivo que não é NF-e', () => {
  assert.throws(() => lerNFe('<html></html>'), ErroNFe);
});

test('unidade, fator e custo da entrada', () => {
  assert.deepEqual(palpiteUnidade('kg'), { unidade: 'KG', fator: 1, confirmar: false });
  assert.equal(palpiteUnidade('CX').confirmar, true);
  // 2 caixas de 6 kg = 12 kg; R$ 316 → R$ 26,33/kg
  const e = entradaDoItem({ quantidade: 2, custoTotal: 31600 }, 6);
  assert.equal(e.quantidade, 12);
  assert.equal(Math.round(e.custoUnitario), 2633);
});

test('custo médio ponderado', () => {
  assert.equal(custoMedio(0, 0, 10, 3200), 3200);
  assert.equal(custoMedio(10, 3000, 10, 3400), 3200);
  assert.equal(custoMedio(-2, 3000, 10, 3400), 3400); // saldo negativo não puxa
});

test('situação e sugestão de insumo', () => {
  assert.equal(situacaoEstoque(5, 2, false), 'sem_controle');
  assert.equal(situacaoEstoque(0, 2, true), 'critico');
  assert.equal(situacaoEstoque(2, 2, true), 'baixo');
  assert.equal(situacaoEstoque(3, 2, true), 'regular');
  const ins = [{ id: 'a', nome: 'Mussarela' }, { id: 'b', nome: 'Calabresa defumada' }];
  assert.equal(sugerirInsumo('QUEIJO MUSSARELA FATIADO', ins)?.id, 'a');
  assert.equal(sugerirInsumo('CALABRESA DEFUMADA CX 6KG', ins)?.id, 'b');
  assert.equal(sugerirInsumo('Guardanapo', ins), null);
});
