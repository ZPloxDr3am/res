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

/**
 * Token do app (vale para todas as lojas autorizadas, ~6 h). Renova só perto de vencer ou quando a API
 * responde 401, como pede a homologação. Fica no banco (D-114) para valer entre as instâncias do servidor.
 */
export async function tokenIfood(forcar = false): Promise<string> {
  if (!forcar && tokenCache && tokenCache.expira - Date.now() > 5 * 60_000) return tokenCache.valor;
  const db = clienteAdmin();
  if (!forcar && db) {
    const { data } = await db.rpc('marketplace_app_token_ler', { p_canal: 'ifood' });
    const salvo = data as { token?: string; expira_em?: string } | null;
    if (salvo?.token && salvo.expira_em && Date.parse(salvo.expira_em) - Date.now() > 5 * 60_000) {
      tokenCache = { valor: salvo.token, expira: Date.parse(salvo.expira_em) };
      return salvo.token;
    }
  }
  const corpo = new URLSearchParams({
    grantType: process.env.IFOOD_GRANT ?? 'client_credentials',
    clientId: process.env.IFOOD_CLIENT_ID ?? '',
    clientSecret: process.env.IFOOD_CLIENT_SECRET ?? '',
  });
  const r = await fetch(`${BASE}/authentication/v1.0/oauth/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corpo, cache: 'no-store' });
  if (!r.ok) throw new Error(`iFood token: HTTP ${r.status}`);
  const j = (await r.json()) as { accessToken: string; expiresIn: number };
  tokenCache = { valor: j.accessToken, expira: Date.now() + j.expiresIn * 1000 };
  if (db) await db.rpc('marketplace_app_token_gravar', { p_canal: 'ifood', p_token: j.accessToken, p_expira_em: new Date(tokenCache.expira).toISOString() });
  return j.accessToken;
}

async function chamar(caminho: string, init: RequestInit = {}, jaRenovou = false): Promise<Response> {
  const token = await tokenIfood();
  const r = await fetch(`${BASE}${caminho}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) }, cache: 'no-store' });
  if (r.status === 401 && !jaRenovou) {
    // token revogado ou loja nova autorizada: pede outro uma vez
    tokenCache = null;
    await tokenIfood(true);
    return chamar(caminho, init, true);
  }
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

/** Grava o evento uma vez só (o webhook responde logo depois). true = novo; false = repetido. */
export async function registrarEvento(ev: EventoIfood): Promise<boolean> {
  const db = clienteAdmin();
  if (!db) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.');
  const { data, error } = await db.rpc('marketplace_registrar_evento', { p_canal: 'ifood', p_evento_id: ev.id, p_codigo: ev.code, p_externo_id: ev.orderId ?? null, p_merchant_id: ev.merchantId ?? null, p_corpo: ev });
  if (error) throw new Error(error.message);
  return !!data;
}

/** Dados do entregador do iFood que vêm no metadata dos eventos de logística (ADR, GTO, AAO, CLT, AAD). */
function entregadorDoEvento(m: Record<string, unknown> | undefined) {
  if (!m) return null;
  const pega = (k: string) => (typeof m[k] === 'string' ? (m[k] as string).slice(0, 120) : undefined);
  const e = { nome: pega('workerName'), telefone: pega('workerPhone'), veiculo: pega('workerVehicleType'), entrega_id: pega('deliveryId') };
  return Object.values(e).some(Boolean) ? e : null;
}

async function pedidoDoIfood(orderId: string) {
  const r = await chamar(`/order/v1.0/orders/${encodeURIComponent(orderId)}`);
  if (!r.ok) throw new Error(`iFood pedido ${orderId}: HTTP ${r.status}`);
  return normalizarPedidoIfood((await r.json()) as IfoodPedido);
}

/** Aplica no RES um evento já registrado. Grava o resultado (erro aparece no card do iFood). */
export async function tratarEvento(ev: EventoIfood): Promise<string> {
  const db = clienteAdmin();
  if (!db) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.');
  try {
    const r = await tratar(ev, db);
    await db.rpc('marketplace_evento_resultado', { p_canal: 'ifood', p_evento_id: ev.id, p_erro: null });
    return r;
  } catch (e) {
    await db.rpc('marketplace_evento_resultado', { p_canal: 'ifood', p_evento_id: ev.id, p_erro: (e as Error).message });
    throw e;
  }
}

/** Registra e aplica (polling e reprocessar). Devolve o que foi feito. */
export async function processarEvento(ev: EventoIfood): Promise<string> {
  if (!(await registrarEvento(ev))) return 'repetido';
  return tratarEvento(ev);
}

async function tratar(ev: EventoIfood, db: NonNullable<ReturnType<typeof clienteAdmin>>): Promise<string> {
  const codigo = ev.code;
  const meta = ev.metadata;
  // o que o evento conta além do status (entregador, cancelamento pedido por alguém)
  const entregador = ['ADR', 'GTO', 'AAO', 'CLT', 'AAD', 'ASSIGN_DRIVER', 'GOING_TO_ORIGIN', 'ARRIVED_AT_ORIGIN', 'COLLECTED', 'ARRIVED_AT_DESTINATION'].includes(codigo) ? entregadorDoEvento(meta) : null;
  const cancelamento = ['CAR', 'CANCELLATION_REQUESTED'].includes(codigo)
    ? { origem: meta?.ORIGIN ?? meta?.origin ?? null, motivo: meta?.reason_code ?? meta?.CANCEL_REASON ?? meta?.reason ?? null }
    : null;
  if (ev.orderId) {
    const dados: Record<string, unknown> = {};
    if (entregador) dados.entregador = entregador;
    if (cancelamento) dados.cancelamento = cancelamento;
    if (['CARF', 'CANCELLATION_REQUEST_FAILED'].includes(codigo)) dados.motivo = meta?.CANCELLATION_REQUEST_FAILED_REASON ?? meta?.reason ?? null;
    await db.rpc('marketplace_evento_info', { p_canal: 'ifood', p_externo_id: ev.orderId, p_codigo: codigo, p_dados: dados });
  }
  const acao = acaoDoEvento(codigo);
  if (acao.acao === 'criar') {
    const { error } = await db.rpc('marketplace_receber_pedido', { p: await pedidoDoIfood(ev.orderId) });
    if (error) throw new Error(error.message);
    return 'criado';
  }
  // pedido alterado (itens) ou endereço alterado: relê o pedido e refaz itens/valores/endereço
  if (['OPA', 'ORDER_PATCHED', 'DAR', 'DELIVERY_ADDRESS_CHANGE_REQUESTED'].includes(codigo)) {
    const p = { ...(await pedidoDoIfood(ev.orderId)), motivo_alteracao: codigo.startsWith('D') ? 'iFood: endereço alterado' : 'iFood: pedido alterado' };
    const { data, error } = await db.rpc('marketplace_atualizar_pedido', { p });
    if (error) throw new Error(error.message);
    return String(data);
  }
  if (acao.acao === 'status' || acao.acao === 'cancelar') {
    const motivo = typeof meta?.CANCEL_REASON === 'string' ? (meta.CANCEL_REASON as string) : null;
    const { data, error } = await db.rpc('marketplace_aplicar_evento', { p_canal: 'ifood', p_externo_id: ev.orderId, p_codigo: codigo, p_motivo: motivo });
    if (error) throw new Error(error.message);
    return String(data);
  }
  // Plataforma de Negociação (D-075): HSD abre, HSS fecha
  if (codigo === 'HSD' || codigo === 'HANDSHAKE_DISPUTE') {
    const d = (meta ?? {}) as unknown as IfoodDisputa;
    if (!d.disputeId) throw new Error('negociação sem disputeId');
    const { error } = await db.rpc('marketplace_receber_negociacao', { p: normalizarNegociacaoIfood(ev.orderId, d) });
    if (error) throw new Error(error.message);
    return 'negociacao_aberta';
  }
  if (codigo === 'HSS' || codigo === 'HANDSHAKE_SETTLEMENT') {
    const m = (meta ?? {}) as { disputeId?: string; status?: string };
    if (!m.disputeId || !m.status) throw new Error('acordo sem disputeId/status');
    const { data, error } = await db.rpc('marketplace_resolver_negociacao', { p_canal: 'ifood', p_disputa: m.disputeId, p_status: m.status, p_resultado: meta ?? null });
    if (error) throw new Error(error.message);
    return String(data);
  }
  return acao.acao;
}

/** KEEPALIVE: das lojas que o iFood perguntou, as que estão abertas agora no RES (pausa e horário da marca). */
export async function lojasAbertas(merchants: string[]): Promise<string[]> {
  const db = clienteAdmin();
  if (!db || !merchants.length) return [];
  const { data } = await db.rpc('marketplace_abertas', { p_canal: 'ifood', p_merchants: merchants.slice(0, 500) });
  return (data as string[] | null) ?? [];
}

/**
 * Busca eventos (polling a cada 30 s; reserva do webhook) em lotes de até 100 lojas e confirma (ack) só o que
 * já foi gravado no banco — o que não gravou volta no próximo polling.
 */
export async function sincronizarEventos(merchants: string[]): Promise<{ eventos: number; erros: string[] }> {
  const erros: string[] = [];
  let total = 0;
  const lotes = merchants.length ? Array.from({ length: Math.ceil(merchants.length / 100) }, (_, i) => merchants.slice(i * 100, i * 100 + 100)) : [[]];
  for (const lote of lotes) {
    const r = await chamar('/events/v1.0/events:polling', { headers: lote.length ? { 'x-polling-merchants': lote.join(',') } : {} });
    if (r.status === 204) continue;
    if (!r.ok) throw new Error(`iFood polling: HTTP ${r.status}`);
    const eventos = (await r.json()) as EventoIfood[];
    total += eventos.length;
    const gravados: string[] = [];
    for (const ev of eventos) {
      try {
        const novo = await registrarEvento(ev);
        gravados.push(ev.id);
        if (novo) await tratarEvento(ev);
      } catch (e) {
        erros.push(`${ev.code} ${ev.orderId ?? ''}: ${(e as Error).message}`);
      }
    }
    for (let i = 0; i < gravados.length; i += 2000) {
      await chamar('/events/v1.0/events/acknowledgment', { method: 'POST', body: JSON.stringify(gravados.slice(i, i + 2000).map((id) => ({ id }))) });
    }
  }
  return { eventos: total, erros };
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
  const { data } = await db.from('marketplace_saida').select('id, externo_id, acao, payload, tentativas, marketplace_loja_id').eq('canal', 'ifood').in('situacao', ['pendente', 'erro']).lte('proxima_em', new Date().toISOString()).order('proxima_em').limit(50);
  let enviados = 0;
  let erros = 0;
  for (const s of data ?? []) {
    try {
      let r: Response;
      if (s.acao === 'pausar' || s.acao === 'abrir') {
        r = await interrupcao(s.marketplace_loja_id as string, s.acao, s.payload as { fim?: string; descricao?: string });
      } else if (s.acao === 'negociacao') {
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

/** Pausa (POST interruptions) ou reabre (DELETE das interrupções ativas) a loja no iFood. */
async function interrupcao(marketplaceLojaId: string, acao: 'pausar' | 'abrir', p: { fim?: string; descricao?: string }): Promise<Response> {
  const db = clienteAdmin();
  const { data } = await db!.from('marketplace_lojas').select('merchant_id').eq('id', marketplaceLojaId).maybeSingle();
  const merchant = data?.merchant_id as string | undefined;
  if (!merchant) throw new Error('loja do iFood sem merchantId');
  const base = `/merchant/v1.0/merchants/${encodeURIComponent(merchant)}/interruptions`;
  if (acao === 'pausar') {
    const fim = p.fim && Date.parse(p.fim) > Date.now() + 60_000 ? p.fim : new Date(Date.now() + 60 * 60_000).toISOString();
    return chamar(base, { method: 'POST', body: JSON.stringify({ id: crypto.randomUUID(), description: p.descricao ?? 'Pausa pelo RES', start: new Date().toISOString(), end: fim }) });
  }
  const lista = await chamar(base);
  if (!lista.ok) return lista;
  const ativas = ((await lista.json()) as { id: string; end?: string }[]).filter((i) => !i.end || Date.parse(i.end) > Date.now());
  let ultima: Response = new Response(null, { status: 204 });
  for (const i of ativas) {
    ultima = await chamar(`${base}/${encodeURIComponent(i.id)}`, { method: 'DELETE' });
    if (!ultima.ok) return ultima;
  }
  return ultima;
}
