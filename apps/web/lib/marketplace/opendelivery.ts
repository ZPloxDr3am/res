// Servidor Open Delivery 1.7.1 (D-116): 99Food, Keeta e aiqfome. Só no servidor.
// Entrada: rotas /api/od/<conexão>/v1/... (merchant, newEvent). Saída: chamadas ao app com o token OAuth da conexão.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { acaoDoEventoOD, chamadaOD, eCanalOD, montarMerchantOD, normalizarPedidoOD, type BaseMerchant, type CanalOD, type OdEvento, type OdPedido } from '@res/core';
import { clienteAdmin } from '@/lib/supabase/admin';

export type ConexaoOD = {
  id: string;
  loja_id: string;
  marca_id: string;
  canal: CanalOD;
  merchant_id: string | null;
  modo: 'teste' | 'producao';
  estado: string;
  ativo: boolean;
  config: { base_url?: string; token_url?: string; client_id?: string; grant?: 'client_credentials' | 'refresh_token' };
  token_expira_em: string | null;
  segredos: { api_key?: string; client_secret?: string; access_token?: string; refresh_token?: string; webhook_secret?: string };
};

const db = () => {
  const c = clienteAdmin();
  if (!c) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.');
  return c;
};

export async function conexaoOD(id: string): Promise<ConexaoOD | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().rpc('od_conexao', { p_id: id });
  const c = data as ConexaoOD | null;
  return c && eCanalOD(c.canal) && c.ativo ? c : null;
}

const igual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** GET /merchant: o app manda X-API-KEY = a chave que geramos para a conexão. */
export function apiKeyValida(c: ConexaoOD, recebida: string | null): boolean {
  return !!c.segredos.api_key && !!recebida && igual(c.segredos.api_key, recebida.trim());
}

/**
 * newEvent: o padrão manda X-App-MerchantId (tem de bater com a conexão, quando já sabemos o id) e
 * X-App-Signature (algoritmo não está na spec; quando o app nos der um segredo, conferimos HMAC-SHA256 do corpo).
 */
export function eventoAutorizado(c: ConexaoOD, corpo: string, h: Headers): boolean {
  const merchant = h.get('x-app-merchantid');
  if (c.merchant_id && merchant && merchant !== c.merchant_id) return false;
  if (c.segredos.webhook_secret) {
    const ass = (h.get('x-app-signature') ?? '').trim().toLowerCase().replace(/^sha256=/, '');
    const esperada = createHmac('sha256', c.segredos.webhook_secret).update(corpo).digest('hex');
    return !!ass && igual(esperada, ass);
  }
  return true;
}

export async function merchantOD(c: ConexaoOD) {
  const { data, error } = await db().rpc('od_merchant_base', { p_id: c.id });
  if (error || !data) throw new Error(error?.message ?? 'Merchant indisponível');
  return montarMerchantOD(data as BaseMerchant);
}

// ───────────── OAuth do app (um par de credenciais por loja; token guardado nos segredos) ─────────────

async function tokenOD(c: ConexaoOD, forcar = false): Promise<string> {
  if (!forcar && c.segredos.access_token && c.token_expira_em && Date.parse(c.token_expira_em) - Date.now() > 5 * 60_000) return c.segredos.access_token;
  const base = (c.config.base_url ?? '').replace(/\/+$/, '');
  const url = c.config.token_url || `${base}/oauth/token`;
  if (!url.startsWith('https://')) throw new Error('Configure a URL do token (https) da conexão.');
  const usarRefresh = c.config.grant === 'refresh_token' && c.segredos.refresh_token;
  const corpo = new URLSearchParams(
    usarRefresh
      ? { grant_type: 'refresh_token', refresh_token: c.segredos.refresh_token!, client_id: c.config.client_id ?? '', client_secret: c.segredos.client_secret ?? '' }
      : { grant_type: 'client_credentials', client_id: c.config.client_id ?? '', client_secret: c.segredos.client_secret ?? '' },
  );
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corpo, cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`token ${c.canal}: HTTP ${r.status}`);
  const j = (await r.json()) as { access_token: string; expires_in?: number; refresh_token?: string };
  const expira = new Date(Date.now() + (j.expires_in ?? 3600) * 1000).toISOString();
  await db().rpc('marketplace_segredos_gravar', { p_marketplace_loja: c.id, p_segredos: { access_token: j.access_token, ...(j.refresh_token ? { refresh_token: j.refresh_token } : {}) }, p_expira_em: expira });
  c.segredos.access_token = j.access_token;
  c.token_expira_em = expira;
  return j.access_token;
}

async function chamarOD(c: ConexaoOD, caminhoOuUrl: string, init: RequestInit = {}, jaRenovou = false): Promise<Response> {
  const base = (c.config.base_url ?? '').replace(/\/+$/, '');
  if (!base.startsWith('https://')) throw new Error('Configure a URL base (https) do app na conexão.');
  const url = caminhoOuUrl.startsWith('https://') ? caminhoOuUrl : `${base}/v1${caminhoOuUrl}`;
  const token = await tokenOD(c);
  const r = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) }, cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  if (r.status === 401 && !jaRenovou) {
    await tokenOD(c, true);
    return chamarOD(c, caminhoOuUrl, init, true);
  }
  return r;
}

// ───────────── eventos ─────────────

export async function registrarEventoOD(c: ConexaoOD, ev: OdEvento): Promise<boolean> {
  const { data, error } = await db().rpc('marketplace_registrar_evento_conexao', { p_marketplace_loja: c.id, p_evento_id: ev.eventId, p_codigo: ev.eventType, p_externo_id: ev.orderId ?? null, p_corpo: ev });
  if (error) throw new Error(error.message);
  return !!data;
}

/** O pedido: orderURL só se for do mesmo app (mesmo host da URL base) — senão monta pelo id. */
async function pedidoOD(c: ConexaoOD, ev: OdEvento): Promise<OdPedido> {
  const base = new URL(c.config.base_url ?? 'https://invalido.local');
  let alvo = `/orders/${encodeURIComponent(ev.orderId)}`;
  if (ev.orderURL) {
    try {
      const u = new URL(ev.orderURL);
      if (u.protocol === 'https:' && u.host === base.host) alvo = u.toString();
    } catch {
      /* fica o caminho padrão */
    }
  }
  const r = await chamarOD(c, alvo);
  if (!r.ok) throw new Error(`pedido ${ev.orderId}: HTTP ${r.status}`);
  return (await r.json()) as OdPedido;
}

export async function tratarEventoOD(c: ConexaoOD, ev: OdEvento): Promise<string> {
  const d = db();
  try {
    const r = await tratar(c, ev);
    await d.rpc('marketplace_evento_resultado', { p_canal: c.canal, p_evento_id: ev.eventId, p_erro: null });
    return r;
  } catch (e) {
    await d.rpc('marketplace_evento_resultado', { p_canal: c.canal, p_evento_id: ev.eventId, p_erro: (e as Error).message });
    throw e;
  }
}

async function tratar(c: ConexaoOD, ev: OdEvento): Promise<string> {
  const d = db();
  const a = acaoDoEventoOD(ev.eventType);
  if (a.acao === 'criar') {
    const p = normalizarPedidoOD(await pedidoOD(c, ev), c.canal, c.id);
    const { error } = await d.rpc('marketplace_receber_pedido', { p });
    if (error) throw new Error(error.message);
    return 'criado';
  }
  if (a.acao === 'status' || a.acao === 'cancelar') {
    const { data, error } = await d.rpc('marketplace_aplicar_evento', { p_canal: c.canal, p_externo_id: ev.orderId, p_codigo: a.acao === 'cancelar' ? 'CANCELLED' : a.codigo, p_motivo: null });
    if (error) throw new Error(error.message);
    return String(data);
  }
  if (a.acao === 'cancelamento_solicitado' || a.acao === 'cancelamento_negado') {
    const { error } = await d.rpc('marketplace_evento_info', {
      p_canal: c.canal,
      p_externo_id: ev.orderId,
      p_codigo: a.acao === 'cancelamento_solicitado' ? 'CANCELLATION_REQUESTED' : 'CANCELLATION_REQUEST_FAILED',
      p_dados: a.acao === 'cancelamento_solicitado' ? { cancelamento: { origem: 'CUSTOMER', motivo: null } } : { motivo: 'negado' },
    });
    if (error) throw new Error(error.message);
    return a.acao;
  }
  await d.rpc('marketplace_evento_info', { p_canal: c.canal, p_externo_id: ev.orderId, p_codigo: ev.eventType, p_dados: {} });
  return 'ignorado';
}

// ───────────── fila de saída ─────────────

/** Envia a fila (status dos pedidos e merchantUpdate) das conexões Open Delivery em produção. */
export async function enviarSaidaOD(): Promise<{ enviados: number; erros: number }> {
  const d = db();
  const { data } = await d
    .from('marketplace_saida')
    .select('id, canal, externo_id, acao, payload, marketplace_loja_id, pedido_id')
    .in('canal', ['99food', 'keeta', 'aiqfome'])
    .in('situacao', ['pendente', 'erro'])
    .lte('proxima_em', new Date().toISOString())
    .order('proxima_em')
    .limit(50);
  let enviados = 0;
  let erros = 0;
  const conexoes = new Map<string, ConexaoOD | null>();
  for (const s of data ?? []) {
    try {
      const id = s.marketplace_loja_id as string | null;
      if (!id) throw new Error('chamada sem conexão');
      if (!conexoes.has(id)) conexoes.set(id, await conexaoOD(id));
      const c = conexoes.get(id);
      if (!c) throw new Error('conexão desligada');
      let r: Response;
      if (s.acao === 'merchantUpdate') {
        r = await chamarOD(c, '/merchantUpdate', { method: 'POST', body: JSON.stringify(s.payload ?? {}) });
      } else {
        const { data: ped } = await d.from('pedidos').select('numero, motivo_cancelamento, entregador_nome, loja_id').eq('id', s.pedido_id as string).maybeSingle();
        const { data: loja } = ped ? await d.from('lojas').select('tempo_preparo_min').eq('id', ped.loja_id as string).maybeSingle() : { data: null };
        const ch = chamadaOD(c.canal, s.acao as string, {
          externoId: s.externo_id as string,
          numero: ped?.numero as number | undefined,
          preparoMin: (loja?.tempo_preparo_min as number | undefined) ?? 30,
          motivo: (ped?.motivo_cancelamento as string | null) ?? null,
          entregador: ped?.entregador_nome ? { nome: ped.entregador_nome as string } : undefined,
        });
        if (!ch) {
          await d.rpc('marketplace_marcar_saida', { p_id: s.id, p_ok: true, p_erro: null });
          continue;
        }
        r = await chamarOD(c, ch.caminho, { method: ch.metodo, body: JSON.stringify(ch.corpo) });
      }
      await d.rpc('marketplace_marcar_saida', { p_id: s.id, p_ok: r.ok, p_erro: r.ok ? null : `HTTP ${r.status}` });
      if (r.ok) enviados++;
      else erros++;
    } catch (e) {
      erros++;
      await d.rpc('marketplace_marcar_saida', { p_id: s.id, p_ok: false, p_erro: (e as Error).message });
    }
  }
  return { enviados, erros };
}
