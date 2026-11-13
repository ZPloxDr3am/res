import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contasParecidas, lerBoleto, lerOFX, pendenciasBomDia, sugerirConciliacao, textoBomDia, valorOfx, vencimentoDoFator, type BomDia } from '../src/banco.js';

const OFX_SGML = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
CHARSET:1252

<OFX>
<SIGNONMSGSRSV1><SONRS><STATUS><CODE>0<SEVERITY>INFO</STATUS><DTSERVER>20261113</SONRS></SIGNONMSGSRSV1>
<BANKMSGSRSV1><STMTTRNRS><STMTRS><CURDEF>BRL
<BANKACCTFROM><BANKID>0341<BRANCHID>1234<ACCTID>56789-0<ACCTTYPE>CHECKING</BANKACCTFROM>
<BANKTRANLIST><DTSTART>20261101000000[-3:BRT]<DTEND>20261112235959[-3:BRT]
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261105120000[-3:BRT]<TRNAMT>-1.250,00<FITID>A1<MEMO>PIX ENVIADO  ATACADAO &amp; CIA</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261103<TRNAMT>845.3<FITID>A2<NAME>REDE CARTOES</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261103<TRNAMT>-20,00<FITID>A3<MEMO>TARIFA</STMTTRN>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261103<TRNAMT>-20,00<FITID>A3<MEMO>TARIFA</STMTTRN>
<STMTTRN><TRNTYPE>OTHER<DTPOSTED>20261104<TRNAMT>0<FITID>A4<MEMO>ZERO</STMTTRN>
</BANKTRANLIST><LEDGERBAL><BALAMT>10500.75<DTASOF>20261112</LEDGERBAL></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

test('extrato OFX (SGML): conta, saldo, valores com vírgula, chaves únicas', () => {
  const e = lerOFX(OFX_SGML);
  assert.equal(e.banco, '0341');
  assert.equal(e.agencia, '1234');
  assert.equal(e.conta, '56789-0');
  assert.equal(e.inicio, '2026-11-01');
  assert.equal(e.fim, '2026-11-12');
  assert.equal(e.saldo, 1050075);
  assert.deepEqual(e.transacoes.map((t) => [t.data, t.valor, t.descricao]), [
    ['2026-11-03', 84530, 'REDE CARTOES'],
    ['2026-11-03', -2000, 'TARIFA'],
    ['2026-11-03', -2000, 'TARIFA'],
    ['2026-11-05', -125000, 'PIX ENVIADO ATACADAO & CIA'],
  ]);
  const chaves = e.transacoes.map((t) => t.chave);
  assert.equal(new Set(chaves).size, 4, 'tarifa repetida com o mesmo FITID ganha contador');
  // o mesmo arquivo de novo gera as mesmas chaves (não duplica na importação)
  assert.deepEqual(lerOFX(OFX_SGML).transacoes.map((t) => t.chave), chaves);
});

test('extrato OFX em XML e arquivos inválidos', () => {
  const xml = `<?xml version="1.0"?><?OFX OFXHEADER="200"?><OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKACCTFROM><BANKID>260</BANKID><ACCTID>99</ACCTID></BANKACCTFROM><BANKTRANLIST>
    <STMTTRN><TRNTYPE>DEBIT</TRNTYPE><DTPOSTED>20261110</DTPOSTED><TRNAMT>-99.90</TRNAMT><FITID>x1</FITID><MEMO>Conta de luz</MEMO></STMTTRN>
  </BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
  const e = lerOFX(xml);
  assert.deepEqual(e.transacoes.map((t) => [t.data, t.valor, t.descricao]), [['2026-11-10', -9990, 'Conta de luz']]);
  assert.equal(e.saldo, null);
  assert.equal(lerOFX('<OFX><BANKTRANLIST></BANKTRANLIST></OFX>').transacoes.length, 0);
  assert.throws(() => lerOFX('data;valor\n01/11;10'), /não é um extrato OFX/);
  assert.equal(valorOfx('1.234,56'), 123456);
  assert.equal(valorOfx('-1,234.56'), -123456);
  assert.equal(valorOfx('abc'), null);
});

test('conciliação: mesmo valor e tipo, vencimento mais perto, cada conta uma vez', () => {
  const itens = [
    { id: 'e1', data: '2026-11-05', valor: -125000 },
    { id: 'e2', data: '2026-11-06', valor: -125000 },
    { id: 'e3', data: '2026-11-03', valor: 84530 },
    { id: 'e4', data: '2026-11-03', valor: -2000 },
  ];
  const abertas = [
    { id: 'c1', tipo: 'despesa' as const, valor: 125000, vencimento: '2026-11-06' },
    { id: 'c2', tipo: 'despesa' as const, valor: 125000, vencimento: '2026-11-30' },
    { id: 'c3', tipo: 'receita' as const, valor: 2000, vencimento: '2026-11-03' },
    { id: 'c4', tipo: 'despesa' as const, valor: 125000, vencimento: '2026-11-04' },
  ];
  const s = sugerirConciliacao(itens, abertas);
  assert.equal(s.size, 2);
  assert.equal(s.get('e2'), 'c1');
  assert.equal(s.get('e1'), 'c4');
  assert.equal(s.has('e4'), false, 'saída não casa com receita');
  assert.deepEqual(contasParecidas(itens[3]!, abertas).map((c) => c.id), ['c4', 'c1', 'c2']);
});

test('boleto bancário: linha digitável, código de barras e erros', () => {
  const b = lerBoleto('00190.50095 40144.816069 06809.350314 3 37370000000100', '2026-11-13');
  assert.equal(b.tipo, 'bancario');
  assert.equal(b.codigoBarras, '00193373700000001000500940144816060680935031');
  assert.equal(b.valor, 100);
  assert.equal(b.emissor, 'Boleto Banco do Brasil');
  // código de barras (o que o leitor bipa) dá a mesma linha digitável
  assert.equal(lerBoleto(b.codigoBarras, '2026-11-13').linhaDigitavel, b.linhaDigitavel);
  const br = lerBoleto('23793381286008301352856000063307789840000150000', '2022-05-01');
  assert.deepEqual([br.valor, br.vencimento, br.emissor], [150000, '2022-05-13', 'Boleto Bradesco']);
  assert.throws(() => lerBoleto('00190500954014481606906809350314337370000000101', '2026-11-13'), /não confere/);
  assert.throws(() => lerBoleto('00190500944014481606906809350314337370000000100', '2026-11-13'), /1º bloco/);
  assert.throws(() => lerBoleto('123', '2026-11-13'), /vieram 3/);
});

test('fator de vencimento: base antiga e a nova (desde 22/02/2025)', () => {
  assert.equal(vencimentoDoFator(1000, '2000-07-01'), '2000-07-03');
  assert.equal(vencimentoDoFator(9999, '2025-02-01'), '2025-02-21');
  assert.equal(vencimentoDoFator(1000, '2025-03-01'), '2025-02-22');
  assert.equal(vencimentoDoFator(1630, '2026-11-13'), '2026-11-14');
  assert.equal(vencimentoDoFator(0, '2026-11-13'), null);
});

test('contas de consumo (48 números) e código de barras que começa com 8', () => {
  const t = lerBoleto('84670000001-7 43590024020-9 02405000243-5 84221010811-9', '2026-11-13');
  assert.deepEqual([t.tipo, t.valor, t.emissor], ['arrecadacao', 14359, 'Telefone / internet']);
  assert.equal(t.codigoBarras.length, 44);
  const luz = lerBoleto('83620000000667800481001809756573100158963608', '2026-11-13');
  assert.deepEqual([luz.valor, luz.emissor, luz.linhaDigitavel], [6678, 'Energia ou gás', '836200000005667800481000180975657313001589636081']);
  assert.throws(() => lerBoleto('846700000018435900240209024050002435842210108119', '2026-11-13'), /1º bloco/);
});

test('bom dia: pendências e mensagem do WhatsApp', () => {
  const d: BomDia = {
    dia: '2026-11-13',
    ontem: { vendas: 245000, pedidos: 70, cancelados: 2 },
    semana_passada: { vendas: 200000, pedidos: 60 },
    agendados_hoje: 1,
    financeiro: { vencem_hoje: 2, valor_hoje: 30000, vencidas: 1, valor_vencidas: 9990, extrato_pendente: 0 },
    estoque: { abaixo_minimo: 3, pausados: 0 },
    nfe_para_entrada: 1,
    motoboys_pendentes: 0,
  };
  const p = pendenciasBomDia(d);
  assert.equal(p.length, 5);
  assert.match(p[0]!.texto, /1 conta vencida/);
  assert.deepEqual(p.map((x) => x.chave), ['vencidas', 'hoje', 'compras', 'nfe', 'agendados']);
  const txt = textoBomDia(d, 'Pizzaria Bella');
  assert.match(txt, /Bom dia, Pizzaria Bella/);
  assert.match(txt, /Ontem \(quinta\):\* R\$\s2\.450,00 em 70 pedidos · ticket R\$\s35,00/);
  assert.match(txt, /\+23% contra quinta passada/);
  assert.match(txt, /• 🧾 1 nota fiscal pronta para dar entrada/);
  const vazio = textoBomDia({ ...d, ontem: { vendas: 0, pedidos: 0, cancelados: 0 }, semana_passada: { vendas: 0, pedidos: 0 }, agendados_hoje: 0, financeiro: null, estoque: null, nfe_para_entrada: 0 }, 'X');
  assert.match(vazio, /Nada pendente/);
  assert.doesNotMatch(vazio, /contra/);
});
