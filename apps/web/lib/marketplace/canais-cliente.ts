// Delivery Much e Rappi (D-117): o RES é o cliente. A cada tique do agendador (30 s): busca pedidos novos,
// cria no quadro e envia a fila de volta. Credenciais do integrador nas variáveis do servidor; por loja,
// o login (Delivery Much) ou o storeId (Rappi). Só no servidor.
import { chamadaDM, chamadaRappi, eventoDoDM, normalizarPedidoDM, normalizarPedidoRappi, CAMINHO_RAPPI, type CanalCliente, type DmPedido, type RappiPedido } from '@res/core';
import { clienteAdmin } from '@/lib/supabase/admin';

type Conexao = {
  id: string;
  loja_id: string;
  canal: CanalCliente;
  merchant_id: string | null;
  token_expira_em: string | null;
  segredos: { usuario?: string; senha?: string; access_token?: string };
};

const db = () => {
  const c = clienteAdmin();
  if (!c) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada.');
  return c;
};

const DM = {
  api: () => (process.env.DELIVERYMUCH_API_URL || 'https://api.devmuch.io').replace(/\/+$/, ''),
  tokenUrl: () => process.env.DELIVERYMUCH_TOKEN_URL || 'https://devmuch-api.auth0.com/oauth/token',
};
const RP = {
  api: () => (process.env.RAPPI_API_URL || 'https://microservices.dev.rappi.com').replace(/\/+$/, ''),
  centavos: () => process.env.RAPPI_VALORES_EM_CENTAVOS !== '0',
};

/** As credenciais do integrador (uma para todas as lojas) estão no servidor? */
export function canalConfigurado(canal: CanalCliente): boolean {
  return canal === 'deliverymuch' ? !!(process.env.DELIVERYMUCH_CLIENT_ID && process.env.DELIVERYMUCH_CLIENT_SECRET) : !!(process.env.RAPPI_CLIENT_ID && process.env.RAPPI_CLIENT_SECRET);
}

/** Uuid das lojas que o JWT do Delivery Much traz (só leitura do conteúdo; quem valida é a API deles). */
export function lojasDoTokenDM(jwt: string): string[] {
  try {
    const json = JSON.parse(Buffer.from(jwt.split('.')[1] ?? '', 'base64url').toString('utf8')) as Record<string, unknown>;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const achados = new Set<string>();
    for (const v of Object.values(json)) if (Array.isArray(v)) for (const x of v) if (typeof x === 'string' && uuid.test(x)) achados.add(x);
    return [...achados];
  } catch {
    return [];
  }
}

// ───────────── token ─────────────

let tokenRappi: { valor: string; expira: number } | null = null;

async function token(c: Conexao, forcar = false): Promise<string> {
  if (c.canal === 'rappi') {
    if (!forcar && tokenRappi && tokenRappi.expira - Date.now() > 5 * 60_000) return tokenRappi.valor;
    const r = await fetch(`${RP.api()}${CAMINHO_RAPPI}/token/login/integrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: process.env.RAPPI_CLIENT_ID, client_secret: process.env.RAPPI_CLIENT_SECRET }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) throw new Error(`token Rappi: HTTP ${r.status}`);
    const j = (await r.json()) as { access_token?: string; token?: string; expires_in?: number };
    const valor = j.access_token ?? j.token;
    if (!valor) throw new Error('token Rappi: resposta sem token');
    tokenRappi = { valor, expira: Date.now() + (j.expires_in ?? 3600) * 1000 };
    return valor;
  }
  // Delivery Much: login da loja (password grant). Há bloqueio por tentativa: só tenta de novo se o token venceu.
  if (!forcar && c.segredos.access_token && c.token_expira_em && Date.parse(c.token_expira_em) - Date.now() > 5 * 60_000) return c.segredos.access_token;
  if (!c.segredos.usuario || !c.segredos.senha) throw new Error('Falta o login da loja no Delivery Much.');
  const corpo: Record<string, string> = {
    grant_type: 'password',
    client_id: process.env.DELIVERYMUCH_CLIENT_ID ?? '',
    client_secret: process.env.DELIVERYMUCH_CLIENT_SECRET ?? '',
    username: c.segredos.usuario,
    password: c.segredos.senha,
  };
  if (process.env.DELIVERYMUCH_AUDIENCE) corpo.audience = process.env.DELIVERYMUCH_AUDIENCE;
  const r = await fetch(DM.tokenUrl(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), cache: 'no-store', signal: AbortSignal.timeout(15_000) });
  if (!r.ok) {
    // a mensagem começa sempre igual: é ela que trava novas tentativas até a loja salvar o login de novo
    const m = `Login no Delivery Much recusado (HTTP ${r.status}). Confira o e-mail e a senha.`;
    await db().from('marketplace_lojas').update({ estado: 'erro', ultimo_erro: m }).eq('id', c.id);
    throw new Error(m);
  }
  const j = (await r.json()) as { access_token: string; expires_in?: number };
  const expira = new Date(Date.now() + (j.expires_in ?? 3600) * 1000).toISOString();
  await db().rpc('marketplace_segredos_gravar', { p_marketplace_loja: c.id, p_segredos: { access_token: j.access_token }, p_expira_em: expira });
  c.segredos.access_token = j.access_token;
  c.token_expira_em = expira;
  // sem o uuid da loja ainda: se o token traz uma loja só, é ela
  if (!c.merchant_id) {
    const lojas = lojasDoTokenDM(j.access_token);
    if (lojas.length === 1) {
      const { error } = await db().from('marketplace_lojas').update({ merchant_id: lojas[0], estado: 'conectado', ultimo_erro: null }).eq('id', c.id);
      if (!error) c.merchant_id = lojas[0]!;
    }
  }
  return j.access_token;
}

async function chamar(c: Conexao, caminho: string, init: RequestInit = {}, jaRenovou = false): Promise<Response> {
  const base = c.canal === 'rappi' ? RP.api() : DM.api();
  const t = await token(c);
  const headers: Record<string, string> = { 'Content-Type': 'application/json', [c.canal === 'rappi' ? 'x-authorization' : 'Authorization']: `Bearer ${t}` };
  const r = await fetch(`${base}${caminho}`, { ...init, headers, cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  if (r.status === 401 && !jaRenovou) {
    await token(c, true);
    return chamar(c, caminho, init, true);
  }
  return r;
}

const lista = <T,>(j: unknown): T[] => (Array.isArray(j) ? j : Array.isArray((j as { data?: unknown })?.data) ? (j as { data: T[] }).data : Array.isArray((j as { orders?: unknown })?.orders) ? (j as { orders: T[] }).orders : []) as T[];

// ───────────── conexões ─────────────

async function conexoes(): Promise<Conexao[]> {
  const d = db();
  const { data } = await d.from('marketplace_lojas').select('id, loja_id, canal, merchant_id, token_expira_em, estado, ultimo_erro').in('canal', ['deliverymuch', 'rappi']).eq('ativo', true).eq('modo', 'producao');
  const out: Conexao[] = [];
  const modulo = new Map<string, boolean>();
  for (const c of data ?? []) {
    if (!canalConfigurado(c.canal as CanalCliente)) continue;
    // login recusado: não tenta de novo em laço (o Delivery Much bloqueia por tentativa) — espera a loja salvar de novo
    if (c.estado === 'erro' && /^Login no Delivery Much recusado/.test((c.ultimo_erro as string | null) ?? '')) continue;
    if (!modulo.has(c.loja_id as string)) {
      const { data: tem } = await d.rpc('loja_tem_modulo', { p_loja: c.loja_id, p_modulo: 'ifood' });
      modulo.set(c.loja_id as string, tem !== false);
    }
    if (!modulo.get(c.loja_id as string)) continue;
    const { data: seg } = await d.rpc('marketplace_segredos_ler', { p_marketplace_loja: c.id });
    out.push({ id: c.id as string, loja_id: c.loja_id as string, canal: c.canal as CanalCliente, merchant_id: (c.merchant_id as string | null) ?? null, token_expira_em: (c.token_expira_em as string | null) ?? null, segredos: (seg ?? {}) as Conexao['segredos'] });
  }
  return out;
}

async function registrar(c: Conexao, eventoId: string, codigo: string, externoId: string, corpo: unknown): Promise<boolean> {
  const { data, error } = await db().rpc('marketplace_registrar_evento_conexao', { p_marketplace_loja: c.id, p_evento_id: eventoId, p_codigo: codigo, p_externo_id: externoId, p_corpo: corpo });
  if (error) throw new Error(error.message);
  return !!data;
}

async function resultado(c: Conexao, eventoId: string, erro: string | null) {
  await db().rpc('marketplace_evento_resultado', { p_canal: c.canal, p_evento_id: eventoId, p_erro: erro });
}

/** Trata um pedido novo já registrado (também usado para reprocessar). */
export async function criarPedidoCliente(conexaoId: string, canal: CanalCliente, corpo: unknown): Promise<void> {
  const p = canal === 'deliverymuch' ? normalizarPedidoDM(corpo as DmPedido, conexaoId) : normalizarPedidoRappi(corpo as RappiPedido, conexaoId, RP.centavos());
  const { error } = await db().rpc('marketplace_receber_pedido', { p });
  if (error) throw new Error(error.message);
}

/** externo_id dos pedidos deste app ainda abertos no RES (últimas 12 h). */
async function abertosNoRes(c: Conexao, limite = 50): Promise<Set<string>> {
  const { data } = await db().from('pedidos').select('externo_id').eq('loja_id', c.loja_id).eq('externo_canal', c.canal).in('status', ['novo', 'em_preparo', 'pronto', 'em_entrega']).gte('criado_em', new Date(Date.now() - 12 * 3600_000).toISOString()).order('criado_em', { ascending: false }).limit(limite);
  return new Set((data ?? []).map((p) => p.externo_id as string).filter(Boolean));
}

/** Nomes de evento numa resposta de eventos da Rappi (só os campos de nome/tipo/status, nunca o resto). */
export function nomesDeEvento(j: unknown, out: string[] = []): string[] {
  if (Array.isArray(j)) for (const x of j) nomesDeEvento(x, out);
  else if (j && typeof j === 'object') {
    for (const [k, v] of Object.entries(j as Record<string, unknown>)) {
      if (typeof v === 'string' && /^(event|event_type|type|name|status|state)$/i.test(k)) out.push(v.toUpperCase());
      else if (v && typeof v === 'object') nomesDeEvento(v, out);
    }
  }
  return out;
}

async function aplicar(c: Conexao, externoId: string, codigo: string) {
  const { error } = await db().rpc('marketplace_aplicar_evento', { p_canal: c.canal, p_externo_id: externoId, p_codigo: codigo, p_motivo: null });
  if (error) throw new Error(error.message);
}

// ───────────── polling ─────────────

async function pollingDM(c: Conexao): Promise<number> {
  await token(c);
  if (!c.merchant_id) throw new Error('Informe o id (uuid) da loja no Delivery Much.');
  const empresa = encodeURIComponent(c.merchant_id);
  let novos = 0;
  const r = await chamar(c, `/orders?company.id=${empresa}&status=OPENED&stage=WAITING_COMPANY`);
  if (!r.ok) throw new Error(`pedidos Delivery Much: HTTP ${r.status}`);
  for (const o of lista<DmPedido>(await r.json())) {
    const ev = `dm:${o.id}:novo`;
    if (!(await registrar(c, ev, 'CREATED', o.id, o))) continue;
    try {
      await criarPedidoCliente(c.id, 'deliverymuch', o);
      // "receive" é o ack obrigatório antes do aceite
      const ack = chamadaDM('receive', { externoId: o.id })!;
      const ra = await chamar(c, ack.caminho, { method: ack.metodo, body: JSON.stringify(ack.corpo) });
      // o pedido já está no quadro; se o ack falhou, o aceite manda o "receive" de novo antes
      await resultado(c, ev, ra.ok ? null : `receive: HTTP ${ra.status} (vai de novo no aceite)`);
      novos++;
    } catch (e) {
      await resultado(c, ev, (e as Error).message);
    }
  }
  // cancelados pelo app/cliente (ou por tempo): fecham no RES — só os que ainda estão abertos aqui
  const abertos = await abertosNoRes(c);
  const rc = abertos.size ? await chamar(c, `/orders?company.id=${empresa}&status=CANCELED`) : null;
  if (rc?.ok) {
    for (const o of lista<DmPedido>(await rc.json())) {
      if (!abertos.has(o.id)) continue;
      const cod = eventoDoDM(o);
      if (!cod) continue;
      const ev = `dm:${o.id}:${cod}`;
      if (!(await registrar(c, ev, cod, o.id, { id: o.id, status: o.status, cancellation_reason: o.cancellation_reason ?? null }))) continue;
      try {
        await aplicar(c, o.id, cod);
        await resultado(c, ev, null);
      } catch (e) {
        await resultado(c, ev, (e as Error).message);
      }
    }
  }
  return novos;
}

async function pollingRappi(c: Conexao): Promise<number> {
  if (!c.merchant_id) throw new Error('Informe o storeId da loja na Rappi.');
  const r = await chamar(c, `${CAMINHO_RAPPI}/orders?storeId=${encodeURIComponent(c.merchant_id)}`);
  if (!r.ok) throw new Error(`pedidos Rappi: HTTP ${r.status}`);
  let novos = 0;
  for (const o of lista<RappiPedido>(await r.json())) {
    const id = String(o?.order_detail?.order_id ?? '');
    if (!id) continue;
    const ev = `rappi:${id}:novo`;
    if (!(await registrar(c, ev, 'NEW_ORDER', id, o))) continue;
    try {
      await criarPedidoCliente(c.id, 'rappi', o);
      await resultado(c, ev, null);
      novos++;
    } catch (e) {
      await resultado(c, ev, (e as Error).message);
    }
  }
  // cancelamento e conclusão pela Rappi: olha os eventos dos pedidos ainda abertos (até 10 por tique, por causa do limite de chamadas)
  for (const ex of await abertosNoRes(c, 10)) {
    const re = await chamar(c, `${CAMINHO_RAPPI}/orders/${encodeURIComponent(ex)}/events`);
    if (!re.ok) continue;
    const nomes = nomesDeEvento(await re.json());
    const cod = nomes.some((n) => /(^|_)CANCEL(L?ED)?($|_)|^REJECTED$/.test(n)) ? 'CANCELLED' : nomes.some((n) => /^(DELIVERED|FINISHED|CLOSED|ORDER_DELIVERED)$/.test(n)) ? 'CONCLUDED' : null;
    if (!cod) continue;
    const ev = `rappi:${ex}:${cod}`;
    if (!(await registrar(c, ev, cod, ex, null))) continue;
    try {
      await aplicar(c, ex, cod);
      await resultado(c, ev, null);
    } catch (e) {
      await resultado(c, ev, (e as Error).message);
    }
  }
  return novos;
}

// ───────────── fila de saída ─────────────

async function enviarSaida(porId: Map<string, Conexao>): Promise<{ enviados: number; erros: number }> {
  const d = db();
  const { data } = await d
    .from('marketplace_saida')
    .select('id, canal, externo_id, acao, marketplace_loja_id, pedido_id')
    .in('canal', ['deliverymuch', 'rappi'])
    .in('situacao', ['pendente', 'erro'])
    .lte('proxima_em', new Date().toISOString())
    .order('proxima_em')
    .limit(50);
  let enviados = 0;
  let erros = 0;
  for (const s of data ?? []) {
    try {
      const c = porId.get(s.marketplace_loja_id as string);
      if (!c) throw new Error('conexão desligada ou sem credenciais');
      let motivo: string | null = null;
      let preparoMin = 20;
      if (s.pedido_id) {
        const { data: ped } = await d.from('pedidos').select('motivo_cancelamento, loja_id').eq('id', s.pedido_id as string).maybeSingle();
        motivo = (ped?.motivo_cancelamento as string | null) ?? null;
        const { data: loja } = await d.from('lojas').select('tempo_preparo_min').eq('id', c.loja_id).maybeSingle();
        preparoMin = (loja?.tempo_preparo_min as number | null) ?? 20;
        // Delivery Much: pronto e saiu são a mesma rota — se o "pronto" já foi, o "saiu" não vai de novo
        if (c.canal === 'deliverymuch' && s.acao === 'dispatch') {
          const { count } = await d.from('marketplace_saida').select('id', { count: 'exact', head: true }).eq('pedido_id', s.pedido_id as string).eq('acao', 'readyToPickup').eq('situacao', 'enviado');
          if (count) {
            await d.rpc('marketplace_marcar_saida', { p_id: s.id, p_ok: true, p_erro: null });
            continue;
          }
        }
      }
      const ch = c.canal === 'deliverymuch'
        ? chamadaDM(s.acao as string, { externoId: (s.externo_id as string) ?? '', motivo, merchantId: c.merchant_id })
        : chamadaRappi(s.acao as string, { externoId: (s.externo_id as string) ?? '', motivo, preparoMin });
      if (!ch) {
        await d.rpc('marketplace_marcar_saida', { p_id: s.id, p_ok: true, p_erro: null });
        continue;
      }
      if (c.canal === 'deliverymuch' && s.acao === 'confirm') {
        // o aceite exige o "receive" antes; repetir não faz mal
        const ack = chamadaDM('receive', { externoId: (s.externo_id as string) ?? '' })!;
        await chamar(c, ack.caminho, { method: ack.metodo, body: JSON.stringify(ack.corpo) }).catch(() => undefined);
      }
      const r = await chamar(c, ch.caminho, { method: ch.metodo, body: JSON.stringify(ch.corpo) });
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

/** Um tique: busca os pedidos de cada conexão em produção e envia a fila. Erros ficam na conexão. */
export async function sincronizarCanaisCliente(): Promise<{ conexoes: number; novos: number; enviados: number; erros: number }> {
  const lista = await conexoes();
  let novos = 0;
  for (const c of lista) {
    try {
      novos += c.canal === 'deliverymuch' ? await pollingDM(c) : await pollingRappi(c);
      // deu certo (o login também): conexão em ordem
      await db().from('marketplace_lojas').update({ ultimo_sinal: new Date().toISOString(), ultimo_erro: null, estado: 'conectado' }).eq('id', c.id);
    } catch (e) {
      const m = (e as Error).message.slice(0, 300);
      await db().from('marketplace_lojas').update(/^Login no Delivery Much recusado/.test(m) ? { estado: 'erro', ultimo_erro: m } : { ultimo_erro: m }).eq('id', c.id);
    }
  }
  const saida = await enviarSaida(new Map(lista.map((c) => [c.id, c])));
  return { conexoes: lista.length, novos, ...saida };
}
