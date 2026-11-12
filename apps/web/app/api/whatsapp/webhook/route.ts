import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { clienteAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * Webhook do WhatsApp oficial (D-097), configurado no app da Meta:
 *  - GET: verificação (hub.verify_token = WHATSAPP_VERIFY_TOKEN).
 *  - POST: status das mensagens (entregue, lida, falhou) e mensagens recebidas ("SAIR" tira do marketing).
 * Com WHATSAPP_APP_SECRET configurado, só aceita o que vem assinado pela Meta (X-Hub-Signature-256).
 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const ok = u.searchParams.get('hub.mode') === 'subscribe' && !!process.env.WHATSAPP_VERIFY_TOKEN && u.searchParams.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN;
  return ok ? new Response(u.searchParams.get('hub.challenge') ?? '', { status: 200 }) : new Response('não autorizado', { status: 403 });
}

type Valor = {
  metadata?: { phone_number_id?: string };
  statuses?: { id: string; status: string; errors?: { title?: string; message?: string }[] }[];
  messages?: { from: string; type: string; text?: { body?: string }; button?: { text?: string } }[];
};

export async function POST(req: Request) {
  const corpo = await req.text();
  const segredo = process.env.WHATSAPP_APP_SECRET;
  if (segredo) {
    const assinatura = req.headers.get('x-hub-signature-256') ?? '';
    const esperado = 'sha256=' + createHmac('sha256', segredo).update(corpo).digest('hex');
    const a = Buffer.from(assinatura);
    const b = Buffer.from(esperado);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response('assinatura inválida', { status: 401 });
  }
  const db = clienteAdmin();
  if (!db) return NextResponse.json({ ok: true });
  let j: { entry?: { changes?: { value?: Valor }[] }[] } = {};
  try {
    j = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ ok: true });
  }
  for (const e of j.entry ?? []) {
    for (const ch of e.changes ?? []) {
      const v = ch.value ?? {};
      for (const s of v.statuses ?? []) {
        const erro = s.errors?.[0] ? `${s.errors[0].title ?? ''} ${s.errors[0].message ?? ''}`.trim() : null;
        await db.rpc('whatsapp_status_mensagem', { p_wa_id: s.id, p_status: s.status, p_erro: erro });
      }
      for (const m of v.messages ?? []) {
        const texto = m.text?.body ?? m.button?.text ?? '';
        if (v.metadata?.phone_number_id) await db.rpc('whatsapp_entrada', { p_phone_id: v.metadata.phone_number_id, p_de: m.from, p_texto: texto });
      }
    }
  }
  return NextResponse.json({ ok: true });
}
