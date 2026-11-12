import { NextResponse } from 'next/server';
import { clienteAdmin } from '@/lib/supabase/admin';
import { processarFila } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Chamada pelo agendador do banco (private.whatsapp_tique, a cada 5 min, D-097) com X-RES-Chave =
 * MARKETPLACE_CRON_SEGREDO: envia a fila do Turbo-Vendas das lojas com WhatsApp oficial e envio automático.
 */
export async function POST(req: Request) {
  const chave = req.headers.get('x-res-chave') ?? new URL(req.url).searchParams.get('chave');
  if (!process.env.MARKETPLACE_CRON_SEGREDO || chave !== process.env.MARKETPLACE_CRON_SEGREDO) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 });
  }
  const db = clienteAdmin();
  if (!db) return NextResponse.json({ erro: 'sem chave de serviço' }, { status: 500 });
  const { data } = await db.rpc('whatsapp_lojas_automaticas');
  const lojas = ((data ?? []) as (string | { whatsapp_lojas_automaticas: string })[]).map((x) => (typeof x === 'string' ? x : x.whatsapp_lojas_automaticas));
  const resultado: Record<string, { enviados: number; falhas: number }> = {};
  for (const l of lojas) resultado[l] = await processarFila(l, 80);
  return NextResponse.json({ ok: true, resultado });
}

export const GET = POST;
