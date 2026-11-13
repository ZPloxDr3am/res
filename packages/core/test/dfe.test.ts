import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cnpjDoNomeCertificado,
  dataHoraSefaz,
  eventoAssinado,
  infEventoCiencia,
  lerDocumentoDFe,
  lerRetornoDistribuicao,
  lerRetornoEvento,
  mesmaRaizCnpj,
  montarDistNSU,
  montarEnvEvento,
  proximaConsulta,
  signedInfoCanonico,
} from '../src/dfe.js';

const CHAVE = '42261112345678000199550010000012341000012345';

test('pedido de distribuição: NSU com 15 dígitos, UF em código IBGE', () => {
  const x = montarDistNSU({ ambiente: 1, uf: 'sc', cnpj: '12345678000199', ultNSU: 123 });
  assert.match(x, /<distDFeInt xmlns="http:\/\/www.portalfiscal.inf.br\/nfe" versao="1.01"><tpAmb>1<\/tpAmb><cUFAutor>42<\/cUFAutor><CNPJ>12345678000199<\/CNPJ><distNSU><ultNSU>000000000000123<\/ultNSU><\/distNSU><\/distDFeInt>/);
  assert.match(x, /<nfeDistDFeInteresse xmlns="http:\/\/www.portalfiscal.inf.br\/nfe\/wsdl\/NFeDistribuicaoDFe"><nfeDadosMsg>/);
  assert.throws(() => montarDistNSU({ ambiente: 1, uf: 'XX', cnpj: '12345678000199', ultNSU: 0 }));
  assert.throws(() => montarDistNSU({ ambiente: 1, uf: 'SC', cnpj: '123', ultNSU: 0 }));
});

test('retorno da distribuição com documentos', () => {
  const ret = `<soap:Envelope><soap:Body><nfeDistDFeInteresseResponse><nfeDistDFeInteresseResult><retDistDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
    <tpAmb>1</tpAmb><verAplic>1.4.0</verAplic><cStat>138</cStat><xMotivo>Documento localizado</xMotivo><dhResp>2026-11-13T10:00:00-03:00</dhResp>
    <ultNSU>000000000000052</ultNSU><maxNSU>000000000000120</maxNSU>
    <loteDistDFeInt><docZip NSU="000000000000051" schema="resNFe_v1.01.xsd">H4sIAAA=</docZip><docZip NSU="000000000000052" schema="procNFe_v4.00.xsd">H4sIBBB=</docZip></loteDistDFeInt>
    </retDistDFeInt></nfeDistDFeInteresseResult></nfeDistDFeInteresseResponse></soap:Body></soap:Envelope>`;
  const r = lerRetornoDistribuicao(ret);
  assert.equal(r.cStat, '138');
  assert.equal(r.ultNSU, '000000000000052');
  assert.equal(r.maxNSU, '000000000000120');
  assert.deepEqual(r.docs.map((d) => [d.nsu, d.schema, d.base64]), [['000000000000051', 'resNFe_v1.01.xsd', 'H4sIAAA='], ['000000000000052', 'procNFe_v4.00.xsd', 'H4sIBBB=']]);
  assert.throws(() => lerRetornoDistribuicao('<html>erro</html>'));
});

test('resumo, nota completa e evento', () => {
  const res = lerDocumentoDFe('resNFe_v1.01.xsd', `<resNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><chNFe>${CHAVE}</chNFe><CNPJ>11222333000181</CNPJ><xNome>DISTRIBUIDORA &amp; CIA</xNome><IE>123</IE><dhEmi>2026-11-10T08:00:00-03:00</dhEmi><tpNF>1</tpNF><vNF>314.79</vNF><digVal>x</digVal><dhRecbto>2026-11-10T08:00:05-03:00</dhRecbto><nProt>1</nProt><cSitNFe>3</cSitNFe></resNFe>`);
  assert.deepEqual(res, { tipo: 'resumo', chave: CHAVE, emitenteCnpj: '11222333000181', emitenteNome: 'DISTRIBUIDORA & CIA', emissao: '2026-11-10T08:00:00-03:00', valor: 31479, situacao: 'cancelada' });
  const xml = `<nfeProc><NFe><infNFe Id="NFe${CHAVE}" versao="4.00"><ide><dhEmi>2026-11-10T08:00:00-03:00</dhEmi></ide><emit><CNPJ>11222333000181</CNPJ><xNome>DISTRIB LTDA</xNome><xFant>Distrib</xFant></emit><total><ICMSTot><vNF>828.26</vNF></ICMSTot></total></infNFe></NFe></nfeProc>`;
  const c = lerDocumentoDFe('procNFe_v4.00.xsd', xml);
  assert.equal(c.tipo, 'completa');
  assert.ok(c.tipo === 'completa' && c.chave === CHAVE && c.valor === 82826 && c.emitenteNome === 'Distrib' && c.xml === xml);
  assert.deepEqual(lerDocumentoDFe('resEvento_v1.01.xsd', `<resEvento><chNFe>${CHAVE}</chNFe><tpEvento>110111</tpEvento></resEvento>`), { tipo: 'evento', chave: CHAVE, tpEvento: '110111' });
  assert.deepEqual(lerDocumentoDFe('qualquer.xsd', '<x/>'), { tipo: 'outro' });
});

test('ciência da operação: forma canônica, assinatura e lote', () => {
  const inf = infEventoCiencia({ ambiente: 1, cnpj: '12345678000199', chave: CHAVE, dhEvento: '2026-11-13T10:00:00-03:00' });
  assert.equal(inf.id, `ID210210${CHAVE}01`);
  assert.ok(inf.canonico.startsWith(`<infEvento xmlns="http://www.portalfiscal.inf.br/nfe" Id="ID210210${CHAVE}01"><cOrgao>91</cOrgao><tpAmb>1</tpAmb>`));
  assert.ok(inf.canonico.includes('<detEvento versao="1.00"><descEvento>Ciencia da Operacao</descEvento></detEvento></infEvento>'));
  const si = signedInfoCanonico(inf.id, 'DIGEST=');
  assert.ok(si.startsWith('<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#"><CanonicalizationMethod'));
  assert.ok(si.includes(`<Reference URI="#${inf.id}">`) && si.includes('<DigestValue>DIGEST=</DigestValue>'));
  const ev = eventoAssinado({ canonico: inf.canonico, signedInfo: si, assinaturaBase64: 'SIG=', certificadoBase64: 'CERT=' });
  assert.ok(ev.startsWith(`<evento versao="1.00"><infEvento Id="${inf.id}">`));
  assert.ok(ev.includes('<Signature xmlns="http://www.w3.org/2000/09/xmldsig#"><SignedInfo><CanonicalizationMethod'));
  const lote = montarEnvEvento('20261113100000', [ev]);
  assert.ok(lote.includes('<nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4"><envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>20261113100000</idLote><evento'));
  assert.throws(() => montarEnvEvento('1', []));
  assert.throws(() => infEventoCiencia({ ambiente: 1, cnpj: '12345678000199', chave: '123', dhEvento: 'x' }));
});

test('retorno do evento: registrado, duplicado e recusado', () => {
  const r = lerRetornoEvento(`<retEnvEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>1</idLote><tpAmb>1</tpAmb><cOrgao>91</cOrgao><cStat>128</cStat><xMotivo>Lote de evento processado</xMotivo>
    <retEvento versao="1.00"><infEvento><cStat>135</cStat><xMotivo>Evento registrado e vinculado a NF-e</xMotivo><chNFe>${CHAVE}</chNFe></infEvento></retEvento>
    <retEvento versao="1.00"><infEvento><cStat>573</cStat><xMotivo>Rejeicao: Duplicidade de evento</xMotivo><chNFe>1${CHAVE.slice(1)}</chNFe></infEvento></retEvento>
    <retEvento versao="1.00"><infEvento><cStat>650</cStat><xMotivo>Rejeicao: Evento de "Ciencia da Operacao" para NF-e Cancelada</xMotivo><chNFe>2${CHAVE.slice(1)}</chNFe></infEvento></retEvento></retEnvEvento>`);
  assert.equal(r.cStat, '128');
  assert.deepEqual(r.eventos.map((e) => [e.cStat, e.ok]), [['135', true], ['573', true], ['650', false]]);
  assert.equal(r.eventos[2]!.xMotivo, 'Rejeicao: Evento de "Ciencia da Operacao" para NF-e Cancelada');
});

test('quando consultar de novo (consumo indevido)', () => {
  const agora = new Date('2026-11-13T13:00:00Z');
  const min = (d: Date) => (d.getTime() - agora.getTime()) / 60000;
  assert.equal(min(proximaConsulta({ cStat: '138', ultNSU: '50', maxNSU: '120' }, agora)), 0);
  assert.equal(min(proximaConsulta({ cStat: '138', ultNSU: '120', maxNSU: '120' }, agora)), 61);
  assert.equal(min(proximaConsulta({ cStat: '137', ultNSU: '120', maxNSU: '120' }, agora)), 61);
  assert.equal(min(proximaConsulta({ cStat: '656', ultNSU: '120', maxNSU: '120' }, agora)), 61);
  assert.equal(min(proximaConsulta({ cStat: '108', ultNSU: '0', maxNSU: '0' }, agora)), 5);
  assert.equal(min(proximaConsulta({ cStat: '109', ultNSU: '0', maxNSU: '0' }, agora)), 20);
});

test('datas, CNPJ do certificado e raiz', () => {
  assert.equal(dataHoraSefaz(new Date('2026-11-13T13:05:09.500Z')), '2026-11-13T10:05:09-03:00');
  assert.equal(cnpjDoNomeCertificado('RESTAURANTE EXEMPLO LTDA:12345678000199'), '12345678000199');
  assert.equal(cnpjDoNomeCertificado('FULANO DE TAL:12345678901'), null);
  assert.equal(mesmaRaizCnpj('12345678000199', '12345678000270'), true);
  assert.equal(mesmaRaizCnpj('12345678000199', '87654321000199'), false);
});
