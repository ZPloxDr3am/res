// Certificado A1 (e-CNPJ) do restaurante (D-102). Só no servidor: a senha e a chave privada nunca vão para o
// navegador. O node-forge lê também os .pfx antigos (RC2/3DES) que o OpenSSL 3 do Node recusa.
import { createHash, createSign } from 'node:crypto';
import forge from 'node-forge';
import { cnpjDoNomeCertificado, eventoAssinado, signedInfoCanonico } from '@res/core';

export interface CertificadoA1 {
  chavePem: string;
  certificadoPem: string;
  /** certificado do titular + intermediárias que vieram no .pfx (para o TLS) */
  cadeiaPem: string;
  certificadoBase64: string;
  cnpj: string | null;
  titular: string;
  validoDe: Date;
  validoAte: Date;
}

export class ErroCertificado extends Error {}

const OID_CNPJ = '2.16.76.1.3.3';

/** CNPJ gravado no "outro nome" do subjectAltName (padrão ICP-Brasil). */
function cnpjDoSubjectAltName(cert: forge.pki.Certificate): string | null {
  try {
    const ext = cert.getExtension('subjectAltName') as { value?: string } | null;
    if (!ext?.value) return null;
    const asn = forge.asn1.fromDer(ext.value);
    for (const nome of (asn.value as forge.asn1.Asn1[]) ?? []) {
      if (nome.type !== 0 || !Array.isArray(nome.value)) continue; // otherName [0]
      const [oid, valor] = nome.value as forge.asn1.Asn1[];
      if (!oid || forge.asn1.derToOid(oid.value as string) !== OID_CNPJ) continue;
      const bruto = JSON.stringify(valor ? forge.asn1.toDer(valor).getBytes() : '');
      const m = bruto.match(/(\d{14})/);
      if (m) return m[1]!;
    }
  } catch {
    /* sem SAN legível */
  }
  return null;
}

/** Abre o .pfx com a senha. Erro claro para senha errada, arquivo inválido ou vencido. */
export function lerCertificado(pfx: Buffer, senha: string): CertificadoA1 {
  let p12: forge.pkcs12.Pkcs12Pfx;
  try {
    const asn = forge.asn1.fromDer(forge.util.createBuffer(pfx.toString('binary')));
    p12 = forge.pkcs12.pkcs12FromAsn1(asn, false, senha);
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    if (/password|MAC|decrypt|Invalid/i.test(msg)) throw new ErroCertificado('Senha do certificado incorreta.');
    throw new ErroCertificado('Este arquivo não é um certificado A1 (.pfx ou .p12) válido.');
  }
  const chaves = [
    ...(p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? []),
    ...(p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? []),
  ];
  const certs = (p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? []).map((b) => b.cert).filter((c): c is forge.pki.Certificate => !!c);
  const chave = chaves[0]?.key as forge.pki.rsa.PrivateKey | undefined;
  if (!chave || certs.length === 0) throw new ErroCertificado('O arquivo não traz a chave privada e o certificado. Exporte o certificado A1 completo (.pfx).');
  // o certificado do titular é o que combina com a chave
  const titular =
    certs.find((c) => {
      const pub = c.publicKey as forge.pki.rsa.PublicKey;
      return pub.n && pub.n.compareTo(chave.n) === 0;
    }) ?? certs[0]!;
  const cn = String(titular.subject.getField('CN')?.value ?? '');
  const outros = certs.filter((c) => c !== titular);
  const certificadoPem = forge.pki.certificateToPem(titular);
  return {
    chavePem: forge.pki.privateKeyToPem(chave),
    certificadoPem,
    cadeiaPem: [certificadoPem, ...outros.map((c) => forge.pki.certificateToPem(c))].join(''),
    certificadoBase64: forge.util.encode64(forge.asn1.toDer(forge.pki.certificateToAsn1(titular)).getBytes()),
    cnpj: cnpjDoSubjectAltName(titular) ?? cnpjDoNomeCertificado(cn),
    titular: cn.replace(/:\d{11,14}\s*$/, '').trim() || cn,
    validoDe: titular.validity.notBefore,
    validoAte: titular.validity.notAfter,
  };
}

/** Assina o infEvento (já canônico) com RSA-SHA1, como pede o leiaute da NF-e, e devolve o <evento>. */
export function assinarEvento(cert: CertificadoA1, inf: { id: string; canonico: string }): string {
  const digest = createHash('sha1').update(inf.canonico, 'utf8').digest('base64');
  const si = signedInfoCanonico(inf.id, digest);
  const assinatura = createSign('RSA-SHA1').update(si, 'utf8').sign(cert.chavePem, 'base64');
  return eventoAssinado({ canonico: inf.canonico, signedInfo: si, assinaturaBase64: assinatura, certificadoBase64: cert.certificadoBase64 });
}
