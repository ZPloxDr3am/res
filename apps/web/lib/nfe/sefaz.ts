// Caixa de entrada de NF-e (D-102): busca na SEFAZ as notas emitidas contra o CNPJ do restaurante, com o
// certificado A1 dele, e manda a "Ciência da Operação" para liberar o XML completo. Só no servidor.
// Regras de consumo da NT 2014.002: com nada novo (137) ou fila em dia, só consultar de novo depois de 1 hora.
import https from 'node:https';
import tls from 'node:tls';
import { gunzipSync } from 'node:zlib';
import {
  dataHoraSefaz,
  infEventoCiencia,
  lerDocumentoDFe,
  lerRetornoDistribuicao,
  lerRetornoEvento,
  mesmaRaizCnpj,
  montarDistNSU,
  montarEnvEvento,
  proximaConsulta,
  SEFAZ_AN,
  type Ambiente,
} from '@res/core';
import { clienteAdmin } from '@/lib/supabase/admin';
import { assinarEvento, lerCertificado, type CertificadoA1 } from './certificado';
import { CADEIA_ICP_BRASIL } from './icp-brasil';

const LOTES_POR_VEZ = 6; // até 6 × 50 documentos por execução; o resto continua na próxima
const DIAS_CIENCIA = 30; // a ciência automática vale para notas emitidas nos últimos 30 dias

function agente(cert: CertificadoA1) {
  return new https.Agent({
    key: cert.chavePem,
    cert: cert.cadeiaPem,
    ca: [...tls.rootCertificates, ...CADEIA_ICP_BRASIL],
    minVersion: 'TLSv1.2',
    keepAlive: true,
  });
}

/** POST SOAP 1.2 com o certificado do cliente (TLS mútuo). */
function soap(url: string, acao: string, envelope: string, ag: https.Agent): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'POST',
        agent: ag,
        timeout: 25_000,
        headers: { 'Content-Type': `application/soap+xml; charset=utf-8; action="${acao}"`, 'Content-Length': Buffer.byteLength(envelope) },
      },
      (res) => {
        const partes: Buffer[] = [];
        res.on('data', (c: Buffer) => partes.push(c));
        res.on('end', () => {
          const corpo = Buffer.concat(partes).toString('utf8');
          if ((res.statusCode ?? 500) >= 500 && !corpo.includes('ret')) reject(new Error(`SEFAZ respondeu ${res.statusCode}`));
          else resolve(corpo);
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('A SEFAZ demorou demais para responder.')));
    req.on('error', reject);
    req.end(envelope);
  });
}

type Credenciais = { cnpj: string; uf: string; ambiente: Ambiente; ult_nsu: string; pfx: string; senha: string };

const mensagemDeErro = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  if (/certificate|CERT_|self.signed|unable to verify/i.test(m)) return 'Não consegui validar a conexão segura com a SEFAZ. Tente mais tarde.';
  if (/ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|demorou/i.test(m)) return 'A SEFAZ não respondeu agora. Tento de novo na próxima busca.';
  if (/handshake|alert|bad certificate|SSL/i.test(m)) return 'A SEFAZ recusou o certificado. Confira se é o A1 do CNPJ desta loja e se está válido.';
  return m.slice(0, 200);
};

export type ResultadoBusca = { ok: boolean; novas: number; xmls: number; ciencias: number; mensagem: string };

/** Uma rodada completa para a loja: distribuição (até a fila ficar em dia) e ciência das notas novas. */
export async function sincronizarLoja(lojaId: string): Promise<ResultadoBusca> {
  const db = clienteAdmin();
  if (!db) return { ok: false, novas: 0, xmls: 0, ciencias: 0, mensagem: 'Servidor sem a chave de serviço.' };
  const { data: credBruto, error: erroCred } = await db.rpc('nfe_auto_credenciais', { p_loja: lojaId });
  if (erroCred || !credBruto) return { ok: false, novas: 0, xmls: 0, ciencias: 0, mensagem: erroCred?.message ?? 'Certificado não cadastrado.' };
  const cred = credBruto as Credenciais & { pode_consultar: boolean; proxima: string | null };
  if (!cred.pode_consultar) {
    const quando = cred.proxima ? new Date(cred.proxima).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) : 'mais tarde';
    return { ok: true, novas: 0, xmls: 0, ciencias: 0, mensagem: `A SEFAZ só permite uma nova busca a partir das ${quando} (regra contra consumo indevido).` };
  }

  let cert: CertificadoA1;
  try {
    cert = lerCertificado(Buffer.from(cred.pfx, 'base64'), cred.senha);
  } catch (e) {
    await db.rpc('nfe_auto_registrar', { p_loja: lojaId, p_docs: [], p_ult_nsu: null, p_max_nsu: null, p_status: 'erro', p_erro: e instanceof Error ? e.message : 'Certificado ilegível.', p_proxima: new Date(Date.now() + 6 * 3600_000).toISOString() });
    return { ok: false, novas: 0, xmls: 0, ciencias: 0, mensagem: e instanceof Error ? e.message : 'Certificado ilegível.' };
  }
  if (cert.validoAte.getTime() < Date.now()) {
    await db.rpc('nfe_auto_registrar', { p_loja: lojaId, p_docs: [], p_ult_nsu: null, p_max_nsu: null, p_status: 'erro', p_erro: 'Certificado vencido. Envie o certificado novo.', p_proxima: new Date(Date.now() + 24 * 3600_000).toISOString() });
    return { ok: false, novas: 0, xmls: 0, ciencias: 0, mensagem: 'Certificado vencido. Envie o certificado novo.' };
  }

  const ag = agente(cert);
  let ult = cred.ult_nsu;
  let novas = 0;
  let xmls = 0;
  let ciencias = 0;
  let ultimo = { cStat: '', xMotivo: '', ultNSU: ult, maxNSU: ult };
  try {
    // 1. distribuição: lotes de até 50 documentos, enquanto houver fila
    for (let i = 0; i < LOTES_POR_VEZ; i++) {
      const xml = await soap(SEFAZ_AN.distribuicao[cred.ambiente], SEFAZ_AN.distribuicao.acao, montarDistNSU({ ambiente: cred.ambiente, uf: cred.uf, cnpj: cred.cnpj, ultNSU: ult }), ag);
      const r = lerRetornoDistribuicao(xml);
      ultimo = r;
      const docs = r.docs.flatMap((d) => {
        try {
          const conteudo = gunzipSync(Buffer.from(d.base64, 'base64')).toString('utf8');
          const doc = lerDocumentoDFe(d.schema, conteudo);
          return doc.tipo === 'outro' ? [] : [{ ...doc, nsu: d.nsu }];
        } catch {
          return [];
        }
      });
      const proxima = proximaConsulta(r, new Date());
      const { data: reg, error } = await db.rpc('nfe_auto_registrar', {
        p_loja: lojaId,
        p_docs: docs,
        p_ult_nsu: r.cStat === '138' || r.cStat === '137' ? r.ultNSU : null,
        p_max_nsu: r.cStat === '138' || r.cStat === '137' ? r.maxNSU : null,
        p_status: r.cStat,
        p_erro: r.cStat === '138' || r.cStat === '137' ? null : `${r.cStat} · ${r.xMotivo}`,
        p_proxima: proxima.toISOString(),
      });
      if (error) throw new Error(error.message);
      novas += Number((reg as { novas?: number } | null)?.novas ?? 0);
      xmls += Number((reg as { xmls?: number } | null)?.xmls ?? 0);
      if (r.cStat !== '138' || proxima.getTime() > Date.now()) break;
      ult = r.ultNSU;
    }

    // 2. ciência da operação: libera o XML completo (chega numa próxima busca, em até ~1 hora)
    const { data: pend } = await db.rpc('nfe_auto_para_ciencia', { p_loja: lojaId, p_dias: DIAS_CIENCIA });
    const chaves = ((pend ?? []) as string[]).slice(0, 20);
    if (chaves.length) {
      if (!cert.cnpj || !mesmaRaizCnpj(cert.cnpj, cred.cnpj)) throw new Error('O certificado não é do CNPJ desta loja.');
      const agora = dataHoraSefaz(new Date());
      const eventos = chaves.map((chave) => assinarEvento(cert, infEventoCiencia({ ambiente: cred.ambiente, cnpj: cred.cnpj, chave, dhEvento: agora })));
      const lote = String(Date.now()).slice(-15);
      const ret = lerRetornoEvento(await soap(SEFAZ_AN.evento[cred.ambiente], SEFAZ_AN.evento.acao, montarEnvEvento(lote, eventos), ag));
      const resultado = chaves.map((chave) => {
        const e = ret.eventos.find((x) => x.chave === chave);
        return { chave, ok: !!e?.ok, erro: e && !e.ok ? `${e.cStat} · ${e.xMotivo}` : e ? null : `${ret.cStat} · ${ret.xMotivo}` };
      });
      await db.rpc('nfe_auto_ciencia', { p_loja: lojaId, p_resultado: resultado });
      ciencias = resultado.filter((x) => x.ok).length;
    }
  } catch (e) {
    const msg = mensagemDeErro(e);
    await db.rpc('nfe_auto_registrar', { p_loja: lojaId, p_docs: [], p_ult_nsu: null, p_max_nsu: null, p_status: 'erro', p_erro: msg, p_proxima: new Date(Date.now() + 61 * 60_000).toISOString() });
    return { ok: false, novas, xmls, ciencias, mensagem: msg };
  } finally {
    ag.destroy();
  }

  const partes = [
    novas ? `${novas} nota(s) nova(s)` : null,
    xmls ? `${xmls} XML(s) pronto(s) para dar entrada` : null,
    ciencias ? `ciência enviada em ${ciencias} (o XML chega na próxima busca, em até 1 hora)` : null,
  ].filter(Boolean);
  const msg = partes.length ? partes.join(' · ') + '.' : ultimo.cStat === '137' || ultimo.cStat === '138' ? 'Nenhuma nota nova na SEFAZ.' : `SEFAZ: ${ultimo.cStat} · ${ultimo.xMotivo}`;
  return { ok: ultimo.cStat === '137' || ultimo.cStat === '138', novas, xmls, ciencias, mensagem: msg };
}
