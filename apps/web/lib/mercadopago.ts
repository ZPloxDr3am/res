// Mercado Pago (D-044): Pix automático. Só no servidor: usa o token da loja (tabela mp_contas,
// lida com service_role) e nunca o devolve ao navegador.
import { clienteAdmin } from '@/lib/supabase/admin';

const API = 'https://api.mercadopago.com';
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://res-iqzs.vercel.app';

export type PixMp = { estado: 'pago' } | { estado: 'aguardando'; valor: number; qr: string; qr_base64: string | null; expira_em: string | null } | { estado: 'erro'; mensagem: string };

/** Confere o token no Mercado Pago e devolve a conta. */
export async function contaDoToken(token: string): Promise<{ id: number; email: string | null; apelido: string | null } | null> {
  const r = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!r.ok) return null;
  const u = (await r.json()) as { id: number; email?: string; nickname?: string };
  return { id: u.id, email: u.email ?? null, apelido: u.nickname ?? null };
}

type Ped = { id: string; numero: number; total: number; status: string; pagamento: string; pago_em: string | null; loja_id: string; marca_id: string; cliente_nome: string };

async function pedidoECConta(codigo: string) {
  const db = clienteAdmin();
  if (!db) return null;
  const { data: p } = await db.from('pedidos').select('id, numero, total, status, pagamento, pago_em, loja_id, marca_id, cliente_nome').eq('codigo', codigo).maybeSingle();
  if (!p) return null;
  const { data: c } = await db.from('mp_contas').select('access_token, email').eq('loja_id', p.loja_id).maybeSingle();
  return { db, p: p as Ped, conta: c as { access_token: string; email: string | null } | null };
}

/** A loja do pedido tem Mercado Pago ligado e o pedido é Pix? */
export async function usaPixMp(codigo: string): Promise<boolean> {
  const x = await pedidoECConta(codigo);
  return !!x?.conta && x.p.pagamento === 'pix';
}

async function marcarPago(db: NonNullable<ReturnType<typeof clienteAdmin>>, pedidoId: string) {
  await db.from('pedidos').update({ pago_em: new Date().toISOString() }).eq('id', pedidoId).is('pago_em', null);
}

/** Busca o pagamento no Mercado Pago e atualiza (vale para o webhook e para a conferência da página). */
export async function atualizarPagamento(lojaId: string, pagamentoId: number): Promise<string | null> {
  const db = clienteAdmin();
  if (!db) return null;
  const { data: c } = await db.from('mp_contas').select('access_token').eq('loja_id', lojaId).maybeSingle();
  if (!c) return null;
  const r = await fetch(`${API}/v1/payments/${pagamentoId}`, { headers: { Authorization: `Bearer ${c.access_token}` }, cache: 'no-store' });
  if (!r.ok) return null;
  const pg = (await r.json()) as { id: number; status: string; transaction_amount: number; external_reference?: string };
  const { data: reg } = await db.from('mp_pagamentos').select('pedido_id, loja_id').eq('id', pg.id).maybeSingle();
  // só pagamentos que o RES criou para um pedido desta loja
  if (!reg || reg.loja_id !== lojaId || pg.external_reference !== reg.pedido_id) return null;
  await db.from('mp_pagamentos').update({ status: pg.status, atualizado_em: new Date().toISOString() }).eq('id', pg.id);
  if (pg.status === 'approved') {
    const { data: p } = await db.from('pedidos').select('total').eq('id', reg.pedido_id).single();
    if (p && pg.transaction_amount + 0.009 >= Number(p.total)) await marcarPago(db, reg.pedido_id);
  }
  return pg.status;
}

/** Pix do pedido: reaproveita o QR ainda válido ou cria um novo no Mercado Pago. */
export async function pixDoPedido(codigo: string): Promise<PixMp | null> {
  const x = await pedidoECConta(codigo);
  if (!x || !x.conta || x.p.pagamento !== 'pix') return null;
  const { db, p, conta } = x;
  if (p.pago_em) return { estado: 'pago' };
  if (p.status === 'cancelado') return { estado: 'erro', mensagem: 'Pedido cancelado.' };

  const { data: ult } = await db.from('mp_pagamentos').select('*').eq('pedido_id', p.id).order('criado_em', { ascending: false }).limit(1).maybeSingle();
  if (ult) {
    // talvez já pagou (webhook atrasado): confere
    const st = ult.status === 'approved' ? 'approved' : await atualizarPagamento(p.loja_id, ult.id);
    if (st === 'approved') return { estado: 'pago' };
    const valido = st === 'pending' && ult.expira_em && new Date(ult.expira_em).getTime() > Date.now() + 60_000 && Number(ult.valor) === Number(p.total);
    if (valido) return { estado: 'aguardando', valor: Math.round(Number(ult.valor) * 100), qr: ult.qr, qr_base64: ult.qr_base64, expira_em: ult.expira_em };
  }

  const expira = new Date(Date.now() + 30 * 60_000);
  const { data: marca } = await db.from('marcas').select('nome').eq('id', p.marca_id).single();
  const r = await fetch(`${API}/v1/payments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${conta.access_token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': `res-${p.id}-${Math.floor(Date.now() / 60_000)}` },
    body: JSON.stringify({
      transaction_amount: Number(p.total),
      description: `Pedido #${p.numero} · ${marca?.nome ?? 'Delivery'}`,
      payment_method_id: 'pix',
      external_reference: p.id,
      notification_url: `${BASE}/api/mercadopago/notificacao?l=${p.loja_id}`,
      date_of_expiration: expira.toISOString().replace('Z', '-00:00'),
      payer: { ...(conta.email ? { email: conta.email } : {}), first_name: p.cliente_nome.split(' ')[0]?.slice(0, 40) },
    }),
    cache: 'no-store',
  });
  const corpo = (await r.json().catch(() => ({}))) as {
    id?: number;
    status?: string;
    message?: string;
    point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string } };
  };
  const td = corpo.point_of_interaction?.transaction_data;
  if (!r.ok || !corpo.id || !td?.qr_code) {
    return { estado: 'erro', mensagem: 'Não consegui gerar o Pix agora. Tente de novo ou pague na entrega.' };
  }
  await db.from('mp_pagamentos').insert({
    id: corpo.id, pedido_id: p.id, loja_id: p.loja_id, status: corpo.status ?? 'pending', valor: Number(p.total),
    qr: td.qr_code, qr_base64: td.qr_code_base64 ?? null, expira_em: expira.toISOString(),
  });
  return { estado: 'aguardando', valor: Math.round(Number(p.total) * 100), qr: td.qr_code, qr_base64: td.qr_code_base64 ?? null, expira_em: expira.toISOString() };
}

/** Só confere (a página pergunta a cada poucos segundos). */
export async function conferirPix(codigo: string): Promise<'pago' | 'aguardando' | null> {
  const x = await pedidoECConta(codigo);
  if (!x || !x.conta) return null;
  if (x.p.pago_em) return 'pago';
  const { data: ult } = await x.db.from('mp_pagamentos').select('id').eq('pedido_id', x.p.id).order('criado_em', { ascending: false }).limit(1).maybeSingle();
  if (!ult) return 'aguardando';
  return (await atualizarPagamento(x.p.loja_id, ult.id)) === 'approved' ? 'pago' : 'aguardando';
}
