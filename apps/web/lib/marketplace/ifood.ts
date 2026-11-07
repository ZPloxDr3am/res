import { createHmac, timingSafeEqual } from 'node:crypto';
import { acaoDoEvento, chamadaRespostaIfood, normalizarNegociacaoIfood, normalizarPedidoIfood, type IfoodDisputa, type IfoodPedido, type RespostaNegociacao } from '@res/core';
import { clienteAdmin } from '@/lib/supabase/admin';

/**
 * Integração com o iFood (D-074), só no servidor.
 * Configuração (Vercel → Environment Variables, nunca NEXT_PUBLIC_):
 *   IFOOD_CLIENT_ID, IFOOD_CLIENT_SECRET  — do aplicativo criado no Portal do Desenvolvedor
 *   IFOOD_GRANT                           — "client_credentials" (centralizado, padrão) ou "authorization_code" (distribuído)
 *   MARKETPLACE_CRON_SEGREDO              — protege a rota de sincronização chamada pelo agendador
 * Sem IFOOD_CLIENT_ID, tudo fica no modo teste (o simulador do painel).
 * Endpoints conforme a Order API v1.0; conferir no portal quando as credenciais existirem.
 */
const BASE = process.env.IFOOD_API_URL ?? 'https://merchant-api.ifood.com.br';

export const ifoodConfigurado = () => !!process.env.IFOOD_CLIENT_ID && !!process.env.IFOOD_CLIENT_SECRET;

let tokenCache: { valor: string; expira: number } | null = null;

/** Token do app (renovado só perto de vencer, como pede a homologação). */
export async function tokenIfood(): Promise<string> {
  if (tokenCache && tokenCache.expira - Date.now() > 5 * 60_000) return tokenCache.valor;
  const corpo = new URLSearchParams({
    grantType: process.env.IFOOD_GRANT ?? 'client_credentials',
    clientId: process.env.IFOOD_CLIENT_ID ?? '',
    clientSecret: process.env.IFOOD_CLIENT_SECRET ?? '',
  });
  const r = await fetch(`${BASE}/authentication/v1.0/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corpo, cache: 'no-store' });
  if (!r.ok) throw new Error(`iFood token: HTTP ${r.status}`);
  const j = (await r.json()) as { accessToken: string; expiresIn: number };
  tokenCache = { valor: j.accessToken, expira: Date.now() + j.expiresIn * 1000 };
  return j.accessToken;
}

async function chamar(caminho: string, init: RequestInit = {}) {
  const token = await tokenIfood();
  const r = await fetch(`${BASE}${caminho}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) }, cache: 'no-store' });
  if (r.status === 429) throw new Error('iFood: limite de chamadas, tentar de novo');
  return r;
}

export type EventoIfood = { id: string; code: string; fullCode?: string; orderId: string; merchantId: string; createdAt?: string; metadata?: Record<string, unknown> };

/** Assinatura do webhook: HMAC-SHA256 do corpo com o clientSecret (cabeçalho X-IFood-Signature). */
export function assinaturaValida(corpo: string, assinatura: string | null): boolean {
  const segredo = process.env.IFOOD_CLIENT_SECRET;
  if (!segredo || !assinatura) return false;
  const esperada = createHmac('sha256', segredo).update(corpo).digest('hex');
  const a = Buffer.from(esperada);
  const b = Buffer.from(assinatura.trim().toLowerCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Processa um evento: registra (sem repetir) e aplica no RES. Devolve o que foi feito. */
export async function processarEvento(ev: EventoIfood): Promise<string> {
  const db = clienteAdmin();
  if (!db) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.');
  const { data: novo, error } = await db.rpc('marketplace_registrar_evento', { p_canal: 'ifood', p_evento_id: ev.id, p_codigo: ev.code, p_externo_id: ev.orderId, p_merchant_id: ev.merchantId });
  if (error) throw new Error(error.message);
  if (!novo) return 'repetido';
  const acao = acaoDoEvento(ev.code);
  if (acao.acao === 'criar') {
    const r = await chamar(`/order/v1.0/orders/${encodeURIComponent(ev.orderId)}`);
    if (!r.ok) throw new Error(`iFood pedido ${ev.orderId}: HTTP ${r.status}`);
    const pedido = normalizarPedidoIfood((await r.json()) as IfoodPedido);
    const { error: e2 } = await db.rpc('marketplace_receber_pedido', { p: pedido });
    if (e2) throw new Error(e2.message);
    return 'criado';
  }
  if (acao.acao === 'status' || acao.acao === 'cancelar') {
    const motivo = typeof ev.metadata?.CANCEL_REASON === 'string' ? (ev.metadata.CANCEL_REASON as string) : null;
    const { data, error: e3 } = await db.rpc('marketplace_aplicar_evento', { p_canal: 'ifood', p_externo_id: ev.orderId, p_codigo: ev.code, p_motivo: motivo });
    if (e3) throw new Error(e3.message);
    return String(data);
  }
  // Plataforma de Negociação (D-075): HSD abre, HSS fecha
  if (ev.code === 'HSD' || ev.code === 'HANDSHAKE_DISPUTE') {
    const d = (ev.metadata ?? {}) as unknown as IfoodDisputa;
    if (!d.disputeId) throw new Error('negociação sem disputeId');
    const { error: e4 } = await db.rpc('marketplace_receber_negociacao', { p: normalizarNegociacaoIfood(ev.orderId, d) });
    if (e4) throw new Error(e4.message);
    return 'negociacao_aberta';
  }
  if (ev.code === 'HSS' || ev.code === 'HANDSHAKE_SETTLEMENT') {
    const m = (ev.metadata ?? {}) as { disputeId?: string; status?: string };
    if (!m.disputeId || !m.status) throw new Error('acordo sem disputeId/status');
    const { data, error: e5 } = await db.rpc('marketplace_resolver_negociacao', { p_canal: 'ifood', p_disputa: m.disputeId, p_status: m.status, p_resultado: ev.metadata ?? null });
    if (e5) throw new Error(e5.message);
    return String(data);
  }
  return acao.acao;
}

/** Busca eventos (polling a cada 30 s) e confirma o recebimento de todos. */
export async function sincronizarEventos(merchants: string[]): Promise<{ eventos: number; erros: string[] }> {
  const r = await chamar('/events/v1.0/events:polling', { headers: merchants.length ? { 'x-polling-merchants': merchants.join(',') } : {} });
  if (r.status === 204) return { eventos: 0, erros: [] };
  if (!r.ok) throw new Error(`iFood polling: HTTP ${r.status}`);
  const eventos = (await r.json()) as EventoIfood[];
  const erros: string[] = [];
  for (const ev of eventos) {
    try {
      await processarEvento(ev);
    } catch (e) {
      erros.push(`${ev.code} ${ev.orderId}: ${(e as Error).message}`);
    }
  }
  if (eventos.length) {
    await chamar('/events/v1.0/events/acknowledgment', { method: 'POST', body: JSON.stringify(eventos.map((e) => ({ id: e.id }))) });
  }
  return { eventos: eventos.length, erros };
}

const CAMINHO_ACAO: Record<string, string> = {
  confirm: 'confirm',
  readyToPickup: 'readyToPickup',
  dispatch: 'dispatch',
  requestCancellation: 'requestCancellation',
};

/** Envia ao iFood o que mudou no RES (fila marketplace_saida). */
export async function enviarSaida(): Promise<{ enviados: number; erros: number }> {
  const db = clienteAdmin();
  if (!db) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.');
  const { data } = await db.from('marketplace_saida').select('id, externo_id, acao, payload, tentativas').in('situacao', ['pendente', 'erro']).lt('tentativas', 5).order('criado_em').limit(50);
  let enviados = 0;
  let erros = 0;
  for (const s of data ?? []) {
    try {
      let r: Response;
      if (s.acao === 'negociacao') {
        // resposta da negociação: o caminho é montado aqui (disputa + resposta já conferidas no banco)
        const p = s.payload as { disputa_id: string; resposta: RespostaNegociacao };
        const c = chamadaRespostaIfood(p.disputa_id, p.resposta);
        r = await chamar(c.caminho, { method: 'POST', body: c.corpo ? JSON.stringify(c.corpo) : undefined });
      } else {
        r = await chamar(`/order/v1.0/orders/${encodeURIComponent(s.externo_id as string)}/${CAMINHO_ACAO[s.acao as string]}`, {
          method: 'POST',
          body: s.acao === 'requestCancellation' ? JSON.stringify(s.payload) : undefined,
        });
      }
      await db.rpc('marketplace_marcar_saida', { p_id: s.id, p_ok: r.ok, p_erro: r.ok ? null : `HTTP ${r.status}` });
      if (r.ok) enviados++;
      else erros++;
    } catch (e) {
      erros++;
      await db.rpc('marketplace_marcar_saida', { p_id: s.id, p_ok: false, p_erro: (e as Error).message });
    }
  }
  return { enviados, erros };
}

/** Motivos de cancelamento aceitos pelo iFood para este pedido. */
export async function motivosCancelamento(externoId: string): Promise<{ codigo: string; descricao: string }[] | null> {
  if (!ifoodConfigurado()) return null;
  const r = await chamar(`/order/v1.0/orders/${encodeURIComponent(externoId)}/cancellationReasons`);
  if (!r.ok) return null;
  const j = (await r.json()) as { cancelCodeId: string; description: string }[];
  return j.map((m) => ({ codigo: m.cancelCodeId, descricao: m.description }));
}
