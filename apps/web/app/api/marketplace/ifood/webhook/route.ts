import { NextResponse } from 'next/server';
import { assinaturaValida, processarEvento, type EventoIfood } from '@/lib/marketplace/ifood';

export const dynamic = 'force-dynamic';

/** Webhook do iFood (D-074): confere a assinatura, registra cada evento uma vez e responde 202 rápido. */
export async function POST(req: Request) {
  const corpo = await req.text();
  if (!assinaturaValida(corpo, req.headers.get('x-ifood-signature'))) {
    return NextResponse.json({ erro: 'assinatura inválida' }, { status: 401 });
  }
  let eventos: EventoIfood[];
  try {
    const j = JSON.parse(corpo) as EventoIfood | EventoIfood[];
    eventos = Array.isArray(j) ? j : [j];
  } catch {
    return NextResponse.json({ erro: 'corpo inválido' }, { status: 400 });
  }
  const resultado: string[] = [];
  for (const ev of eventos) {
    try {
      resultado.push(await processarEvento(ev));
    } catch (e) {
      resultado.push(`erro: ${(e as Error).message}`);
    }
  }
  return NextResponse.json({ ok: true, resultado }, { status: 202 });
}
