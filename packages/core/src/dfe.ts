// Caixa de entrada de NF-e (D-102): mensagens da Distribuição de DF-e e da Manifestação do Destinatário
// (Ambiente Nacional da SEFAZ). Só montagem e leitura de XML: a conexão com o certificado e a assinatura
// ficam no servidor (apps/web/lib/nfe). Referência: NT 2014.002 (NFeDistribuicaoDFe) e NT 2020.001
// (eventos do destinatário).

export const NS_NFE = 'http://www.portalfiscal.inf.br/nfe';
export const NS_DSIG = 'http://www.w3.org/2000/09/xmldsig#';

export const SEFAZ_AN = {
  distribuicao: {
    1: 'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
    2: 'https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx',
    acao: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse',
    ns: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe',
  },
  evento: {
    1: 'https://www.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
    2: 'https://hom1.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx',
    acao: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento',
    ns: 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4',
  },
} as const;

export type Ambiente = 1 | 2;

/** Código IBGE da UF (cUFAutor). */
export const CODIGO_UF: Record<string, string> = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17', MA: '21', PI: '22', CE: '23', RN: '24', PB: '25', PE: '26', AL: '27',
  SE: '28', BA: '29', MG: '31', ES: '32', RJ: '33', SP: '35', PR: '41', SC: '42', RS: '43', MS: '50', MT: '51', GO: '52', DF: '53',
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const desesc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const tag = (xml: string, nome: string): string | null => {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${nome}>`));
  return m ? m[1]!.trim() : null;
};
const soap = (corpo: string) =>
  `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body>${corpo}</soap12:Body></soap12:Envelope>`;

/** Pedido de distribuição a partir do último NSU recebido. */
export function montarDistNSU(p: { ambiente: Ambiente; uf: string; cnpj: string; ultNSU: string | number }): string {
  const cUF = CODIGO_UF[p.uf.toUpperCase()];
  if (!cUF) throw new Error('UF inválida');
  if (!/^\d{14}$/.test(p.cnpj)) throw new Error('CNPJ inválido');
  const nsu = String(p.ultNSU).replace(/\D/g, '').padStart(15, '0').slice(-15);
  return soap(
    `<nfeDistDFeInteresse xmlns="${SEFAZ_AN.distribuicao.ns}"><nfeDadosMsg><distDFeInt xmlns="${NS_NFE}" versao="1.01"><tpAmb>${p.ambiente}</tpAmb><cUFAutor>${cUF}</cUFAutor><CNPJ>${p.cnpj}</CNPJ><distNSU><ultNSU>${nsu}</ultNSU></distNSU></distDFeInt></nfeDadosMsg></nfeDistDFeInteresse>`,
  );
}

export interface RetornoDistribuicao {
  cStat: string;
  xMotivo: string;
  ultNSU: string;
  maxNSU: string;
  docs: { nsu: string; schema: string; base64: string }[];
}

/** Lê o retDistDFeInt (os documentos vêm em base64 + gzip: descompactar no servidor). */
export function lerRetornoDistribuicao(xml: string): RetornoDistribuicao {
  const ret = tag(xml, 'retDistDFeInt');
  if (ret == null) throw new Error('Resposta da SEFAZ sem retDistDFeInt');
  const docs = [...ret.matchAll(/<(?:\w+:)?docZip\s([^>]*)>([^<]*)<\/(?:\w+:)?docZip>/g)].map((m) => ({
    nsu: (m[1]!.match(/NSU="(\d+)"/)?.[1] ?? '').padStart(15, '0'),
    schema: m[1]!.match(/schema="([^"]+)"/)?.[1] ?? '',
    base64: m[2]!.trim(),
  }));
  return {
    cStat: tag(ret, 'cStat') ?? '',
    xMotivo: desesc(tag(ret, 'xMotivo') ?? ''),
    ultNSU: (tag(ret, 'ultNSU') ?? '0').padStart(15, '0'),
    maxNSU: (tag(ret, 'maxNSU') ?? '0').padStart(15, '0'),
    docs,
  };
}

export type DocumentoDFe =
  | { tipo: 'resumo'; chave: string; emitenteCnpj: string; emitenteNome: string; emissao: string | null; valor: number; situacao: 'autorizada' | 'denegada' | 'cancelada' }
  | { tipo: 'completa'; chave: string; emitenteCnpj: string; emitenteNome: string; emissao: string | null; valor: number; xml: string }
  | { tipo: 'evento'; chave: string; tpEvento: string }
  | { tipo: 'outro' };

const centavos = (v: string | null) => Math.round(Number(v ?? '0') * 100);
const SITUACAO: Record<string, 'autorizada' | 'denegada' | 'cancelada'> = { '1': 'autorizada', '2': 'denegada', '3': 'cancelada' };

/** Interpreta um documento já descompactado pelo nome do schema. */
export function lerDocumentoDFe(schema: string, xml: string): DocumentoDFe {
  if (schema.startsWith('resNFe')) {
    return {
      tipo: 'resumo',
      chave: tag(xml, 'chNFe') ?? '',
      emitenteCnpj: tag(xml, 'CNPJ') ?? tag(xml, 'CPF') ?? '',
      emitenteNome: desesc(tag(xml, 'xNome') ?? ''),
      emissao: tag(xml, 'dhEmi'),
      valor: centavos(tag(xml, 'vNF')),
      situacao: SITUACAO[tag(xml, 'cSitNFe') ?? '1'] ?? 'autorizada',
    };
  }
  if (schema.startsWith('procNFe')) {
    const chave = xml.match(/<(?:\w+:)?infNFe[^>]*\sId="NFe(\d{44})"/)?.[1] ?? '';
    const emit = tag(xml, 'emit') ?? '';
    const ide = tag(xml, 'ide') ?? '';
    return {
      tipo: 'completa',
      chave,
      emitenteCnpj: tag(emit, 'CNPJ') ?? tag(emit, 'CPF') ?? '',
      emitenteNome: desesc(tag(emit, 'xFant') ?? tag(emit, 'xNome') ?? ''),
      emissao: tag(ide, 'dhEmi') ?? tag(ide, 'dEmi'),
      valor: centavos(tag(tag(xml, 'ICMSTot') ?? '', 'vNF')),
      xml,
    };
  }
  if (schema.startsWith('resEvento') || schema.startsWith('procEventoNFe')) {
    return { tipo: 'evento', chave: tag(xml, 'chNFe') ?? '', tpEvento: tag(xml, 'tpEvento') ?? '' };
  }
  return { tipo: 'outro' };
}

/** Data e hora no formato da SEFAZ, no fuso de Brasília (AAAA-MM-DDThh:mm:ss-03:00). */
export function dataHoraSefaz(d: Date): string {
  const sp = new Date(d.getTime() - 3 * 3600_000);
  return sp.toISOString().slice(0, 19) + '-03:00';
}

/**
 * infEvento da Ciência da Operação (210210), já na forma canônica (C14N inclusiva): o namespace herdado do
 * envEvento aparece no elemento e não há espaços. É este texto que entra no DigestValue.
 */
export function infEventoCiencia(p: { ambiente: Ambiente; cnpj: string; chave: string; dhEvento: string }): { id: string; canonico: string } {
  if (!/^\d{44}$/.test(p.chave)) throw new Error('Chave de acesso inválida');
  if (!/^\d{14}$/.test(p.cnpj)) throw new Error('CNPJ inválido');
  const id = `ID210210${p.chave}01`;
  const corpo =
    `<cOrgao>91</cOrgao><tpAmb>${p.ambiente}</tpAmb><CNPJ>${p.cnpj}</CNPJ><chNFe>${p.chave}</chNFe><dhEvento>${esc(p.dhEvento)}</dhEvento>` +
    `<tpEvento>210210</tpEvento><nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Ciencia da Operacao</descEvento></detEvento>`;
  return { id, canonico: `<infEvento xmlns="${NS_NFE}" Id="${id}">${corpo}</infEvento>` };
}

/** SignedInfo na forma canônica (o que é assinado com RSA-SHA1). */
export function signedInfoCanonico(id: string, digestBase64: string): string {
  return (
    `<SignedInfo xmlns="${NS_DSIG}"><CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"></SignatureMethod><Reference URI="#${id}"><Transforms>` +
    `<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform><Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></Transform>` +
    `</Transforms><DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"></DigestMethod><DigestValue>${digestBase64}</DigestValue></Reference></SignedInfo>`
  );
}

/** Evento assinado, pronto para entrar no envEvento. */
export function eventoAssinado(p: { canonico: string; signedInfo: string; assinaturaBase64: string; certificadoBase64: string }): string {
  const inf = p.canonico.replace(` xmlns="${NS_NFE}"`, ''); // o namespace vem do envEvento
  const si = p.signedInfo.replace(` xmlns="${NS_DSIG}"`, ''); // e o da assinatura vem do Signature
  return (
    `<evento versao="1.00">${inf}<Signature xmlns="${NS_DSIG}">${si}<SignatureValue>${p.assinaturaBase64}</SignatureValue>` +
    `<KeyInfo><X509Data><X509Certificate>${p.certificadoBase64}</X509Certificate></X509Data></KeyInfo></Signature></evento>`
  );
}

/** Lote de até 20 eventos. */
export function montarEnvEvento(idLote: string, eventos: string[]): string {
  if (eventos.length === 0 || eventos.length > 20) throw new Error('Um lote tem de 1 a 20 eventos');
  return soap(`<nfeDadosMsg xmlns="${SEFAZ_AN.evento.ns}"><envEvento xmlns="${NS_NFE}" versao="1.00"><idLote>${idLote.replace(/\D/g, '').slice(0, 15) || '1'}</idLote>${eventos.join('')}</envEvento></nfeDadosMsg>`);
}

/** Lê o retEnvEvento: 128 = lote processado; por evento, 135/136 = registrado e 573 = já estava registrado. */
export function lerRetornoEvento(xml: string): { cStat: string; xMotivo: string; eventos: { chave: string; cStat: string; xMotivo: string; ok: boolean }[] } {
  const ret = tag(xml, 'retEnvEvento');
  if (ret == null) throw new Error('Resposta da SEFAZ sem retEnvEvento');
  const eventos = [...ret.matchAll(/<(?:\w+:)?retEvento[^>]*>([\s\S]*?)<\/(?:\w+:)?retEvento>/g)].map((m) => {
    const c = tag(m[1]!, 'cStat') ?? '';
    return { chave: tag(m[1]!, 'chNFe') ?? '', cStat: c, xMotivo: desesc(tag(m[1]!, 'xMotivo') ?? ''), ok: c === '135' || c === '136' || c === '573' };
  });
  const cab = ret.replace(/<(?:\w+:)?retEvento[\s\S]*$/, '');
  return { cStat: tag(cab, 'cStat') ?? '', xMotivo: desesc(tag(cab, 'xMotivo') ?? ''), eventos };
}

/**
 * Quando consultar de novo (NT 2014.002): com 137 (nada novo) ou fila em dia (ultNSU = maxNSU), só depois de 1 hora;
 * 656 (consumo indevido) bloqueia por 1 hora; paralisação 108/109 espera 5/20 minutos. Com fila pendente, na hora.
 */
export function proximaConsulta(r: { cStat: string; ultNSU: string; maxNSU: string }, agora: Date): Date {
  const mais = (min: number) => new Date(agora.getTime() + min * 60_000);
  if (r.cStat === '108') return mais(5);
  if (r.cStat === '109') return mais(20);
  if (r.cStat === '138' && BigInt(r.ultNSU || '0') < BigInt(r.maxNSU || '0')) return agora;
  return mais(61);
}

/** CNPJ do titular a partir do CN do e-CNPJ ("RAZAO SOCIAL:12345678000199"). */
export function cnpjDoNomeCertificado(cn: string): string | null {
  return cn.match(/:(\d{14})\s*$/)?.[1] ?? null;
}

/** O certificado pode consultar notas deste CNPJ? (mesma raiz: matriz e filiais) */
export function mesmaRaizCnpj(a: string, b: string): boolean {
  return /^\d{14}$/.test(a) && /^\d{14}$/.test(b) && a.slice(0, 8) === b.slice(0, 8);
}
