// Cobrança do RES (D-085): Pix da fatura mensal pela conta Mercado Pago da empresa RES.
// Só no servidor. Sem MP_RES_ACCESS_TOKEN, a fatura fica para o time do RES marcar como paga (Pix manual).
import { clienteAdmin } from '@/lib/supabase/admin';

const API = 'https://api.mercadopago.com';
const BASE = process.env.RES_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://res-iqzs.vercel.app';
const token = () => process.env.MP_RES_ACCESS_TOKEN ?? '';
export const cobrancaAutomatica = () => !!token();

export type PixFatura =
  | { estado: 'paga' }
  | { estado: 'aguardando'; valor: number; qr: string; qr_base64: string | null; expira_em: string | null }
  | { estado: 'manual' }
  | { estado: 'erro'; mensagem: string };

type Fat = { id: string; conta_id: string; valor: number; status: string; inicio: string; mp_payment_id: number | null; pix_qr: string | null; pix_qr_base64: string | null; pix_expira_em: string | null; conta: string; email: string | null };

async function fatura(id: string) {
  const db = clienteAdmin();
  if (!db) return null;
  const { data } = await db.rpc('fatura_para_pix', { p_fatura: id });
  return data ? { db, f: data as Fat } : null;
}

/** Busca o pagamento no Mercado Pago e quita a fatura se for o Pix que o RES criou para ela. */
export async function conferirPagamentoRes(pagamentoId: number): Promise<'paga' | 'aguardando' | null> {
  if (!token()) return null;
  const db = clienteAdmin();
  if (!db) return null;
  const r = await fetch(`${API}/v1/payments/${pagamentoId}`, { headers: { Authorization: `Bearer ${token()}` }, cache: 'no-store' });
  if (!r.ok) return null;
  const pg = (await r.json()) as { id: number; status: string; transaction_amount: number; external_reference?: string };
  const ref = pg.external_reference ?? '';
  if (!ref.startsWith('res-fatura:')) return null;
  if (pg.status !== 'approved') return 'aguardando';
  const { data } = await db.rpc('fatura_quitar_mp', { p_fatura: ref.slice('res-fatura:'.length), p_mp: pg.id, p_valor: pg.transaction_amount });
  return data === 'paga' || data === 'ja_paga' ? 'paga' : null;
}

/** Pix da fatura: reaproveita o QR ainda válido ou cria um novo. */
export async function pixDaFatura(id: string): Promise<PixFatura> {
  if (!token()) return { estado: 'manual' };
  const x = await fatura(id);
  if (!x) return { estado: 'erro', mensagem: 'Fatura não encontrada.' };
  const { db, f } = x;
  if (f.status === 'paga') return { estado: 'paga' };
  if (f.status !== 'aberta') return { estado: 'erro', mensagem: 'Esta fatura foi cancelada.' };
  if (f.mp_payment_id) {
    if ((await conferirPagamentoRes(f.mp_payment_id)) === 'paga') return { estado: 'paga' };
    if (f.pix_qr && f.pix_expira_em && Date.parse(f.pix_expira_em) > Date.now() + 5 * 60_000) {
      return { estado: 'aguardando', valor: Number(f.valor), qr: f.pix_qr, qr_base64: f.pix_qr_base64, expira_em: f.pix_expira_em };
    }
  }
  const expira = new Date(Date.now() + 24 * 3600_000);
  const r = await fetch(`${API}/v1/payments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': `res-fatura-${f.id}-${Number(f.valor).toFixed(2)}-${Math.floor(Date.now() / 3600_000)}` },
    body: JSON.stringify({
      transaction_amount: Number(f.valor),
      description: `RES · assinatura a partir de ${f.inicio.split('-').reverse().join('/')}`,
      payment_method_id: 'pix',
      external_reference: `res-fatura:${f.id}`,
      notification_url: `${BASE}/api/mercadopago/res`,
      date_of_expiration: expira.toISOString().replace('Z', '-00:00'),
      payer: { email: f.email || 'financeiro@res.app', first_name: f.conta.slice(0, 40) },
    }),
    cache: 'no-store',
  });
  const corpo = (await r.json().catch(() => ({}))) as { id?: number; point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } } };
  const td = corpo.point_of_interaction?.transaction_data;
  if (!r.ok || !corpo.id || !td?.qr_code) return { estado: 'erro', mensagem: 'Não consegui gerar o Pix agora. Tente de novo em instantes.' };
  await db.rpc('fatura_registrar_pix', { p_fatura: f.id, p_mp: corpo.id, p_qr: td.qr_code, p_base64: td.qr_code_base64 ?? null, p_expira: expira.toISOString() });
  return { estado: 'aguardando', valor: Number(f.valor), qr: td.qr_code, qr_base64: td.qr_code_base64 ?? null, expira_em: expira.toISOString() };
}

export async function situacaoFatura(id: string): Promise<'paga' | 'aguardando'> {
  const x = await fatura(id);
  if (!x) return 'aguardando';
  if (x.f.status === 'paga') return 'paga';
  if (x.f.mp_payment_id && (await conferirPagamentoRes(x.f.mp_payment_id)) === 'paga') return 'paga';
  return 'aguardando';
}
