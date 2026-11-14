import { after, NextResponse } from 'next/server';
import { assinaturaValida, lojasAbertas, registrarEvento, tratarEvento, type EventoIfood } from '@/lib/marketplace/ifood';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Corpo = EventoIfood & { merchantIds?: string[] };

/**
 * Webhook do iFood (D-074, D-114). Regras da homologação:
 *  - assinatura X-IFood-Signature (HMAC-SHA256 do corpo bruto com o clientSecret) conferida ANTES do parse; inválida = 401;
 *  - responde 202 em bem menos de 5 s: grava o evento (sem repetir) e processa DEPOIS da resposta (after);
 *  - KEEPALIVE: responde 202 com as lojas abertas agora (pausa e horário da marca) — as outras ficam offline.
 */
export async function POST(req: Request) {
  const corpo = await req.text();
  if (!assinaturaValida(corpo, req.headers.get('x-ifood-signature'))) {
    return NextResponse.json({ erro: 'assinatura inválida' }, { status: 401 });
  }
  let eventos: Corpo[];
  try {
    const j = JSON.parse(corpo) as Corpo | Corpo[];
    eventos = Array.isArray(j) ? j : [j];
  } catch {
    return NextResponse.json({ erro: 'corpo inválido' }, { status: 400 });
  }
  const keepalive = eventos.find((e) => e.code === 'KEEPALIVE' || e.fullCode === 'KEEPALIVE');
  if (keepalive) {
    const perguntadas = Array.isArray(keepalive.merchantIds) ? keepalive.merchantIds : [];
    return NextResponse.json({ merchantIds: await lojasAbertas(perguntadas) }, { status: 202 });
  }
  const novos: EventoIfood[] = [];
  try {
    for (const ev of eventos) if (await registrarEvento(ev)) novos.push(ev);
  } catch {
    // não gravou: o iFood reenvia (e o polling de reserva pega)
    return NextResponse.json({ erro: 'tente de novo' }, { status: 503 });
  }
  after(async () => {
    for (const ev of novos) {
      try {
        await tratarEvento(ev);
      } catch {
        /* o erro fica gravado no evento e aparece no card do iFood */
      }
    }
  });
  return new NextResponse(null, { status: 202 });
}
