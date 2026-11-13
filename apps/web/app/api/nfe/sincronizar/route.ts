import { NextResponse } from 'next/server';
import { clienteAdmin } from '@/lib/supabase/admin';
import { sincronizarLoja } from '@/lib/nfe/sefaz';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Chamada pelo agendador do banco (private.nfe_tique, a cada 15 min, D-102) com X-RES-Chave =
 * MARKETPLACE_CRON_SEGREDO: busca na SEFAZ as notas das lojas que já podem consultar (1 hora entre buscas).
 */
export async function POST(req: Request) {
  const chave = req.headers.get('x-res-chave');
  if (!process.env.MARKETPLACE_CRON_SEGREDO || chave !== process.env.MARKETPLACE_CRON_SEGREDO) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 });
  }
  const db = clienteAdmin();
  if (!db) return NextResponse.json({ erro: 'sem chave de serviço' }, { status: 500 });
  const { data } = await db.rpc('nfe_auto_lojas_devidas');
  const lojas = ((data ?? []) as (string | { nfe_auto_lojas_devidas: string })[]).map((x) => (typeof x === 'string' ? x : x.nfe_auto_lojas_devidas));
  const inicio = Date.now();
  const resultado: Record<string, string> = {};
  for (const l of lojas) {
    if (Date.now() - inicio > 45_000) break; // o resto fica para a próxima rodada
    resultado[l] = (await sincronizarLoja(l)).mensagem;
  }
  return NextResponse.json({ ok: true, resultado });
}
