import { after, NextResponse } from 'next/server';
import { OD_VERSAO, type OdEvento } from '@res/core';
import { apiKeyValida, conexaoOD, eventoAutorizado, merchantOD, registrarEventoOD, tratarEventoOD } from '@/lib/marketplace/opendelivery';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Servidor Open Delivery 1.7.1 do RES (D-116). Uma URL base por conexão (loja × marca × app):
 *   https://res-iqzs.vercel.app/api/od/<conexão>/v1
 * GET  /merchant              — Merchant (X-API-KEY)
 * GET  /versions/merchant     — versão do padrão
 * POST /newEvent | /orderUpdate — eventos do pedido (responde 200 vazio na hora; processa depois)
 * POST /deliveryUpdate | /confirmationCode — logística do app (registrado)
 */
type Ctx = { params: Promise<{ conexao: string; rota: string[] }> };

const erro = (status: number, title: string) => NextResponse.json({ title, status }, { status });

export async function GET(req: Request, { params }: Ctx) {
  const { conexao, rota } = await params;
  const caminho = rota.join('/');
  if (caminho === 'versions/merchant') return NextResponse.json({ version: OD_VERSAO });
  if (caminho !== 'merchant') return erro(404, 'Rota não encontrada');
  const c = await conexaoOD(conexao);
  if (!c) return erro(404, 'Conexão não encontrada');
  if (!apiKeyValida(c, req.headers.get('x-api-key'))) return erro(403, 'X-API-KEY inválida');
  try {
    return NextResponse.json(await merchantOD(c));
  } catch {
    return erro(503, 'Merchant indisponível no momento');
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { conexao, rota } = await params;
  const caminho = rota.join('/');
  const c = await conexaoOD(conexao);
  if (!c) return erro(404, 'Conexão não encontrada');
  const corpo = await req.text();
  if (!eventoAutorizado(c, corpo, req.headers)) return erro(403, 'Assinatura ou merchant inválidos');

  if (caminho === 'newEvent' || caminho === 'orderUpdate') {
    let eventos: OdEvento[];
    try {
      const j = JSON.parse(corpo) as OdEvento | OdEvento[];
      eventos = (Array.isArray(j) ? j : [j]).filter((e) => e && typeof e.eventId === 'string' && typeof e.eventType === 'string');
    } catch {
      return erro(400, 'Corpo inválido');
    }
    const novos: OdEvento[] = [];
    try {
      for (const ev of eventos) if (await registrarEventoOD(c, ev)) novos.push(ev);
    } catch {
      return erro(503, 'Tente de novo');
    }
    after(async () => {
      for (const ev of novos) {
        try {
          await tratarEventoOD(c, ev);
        } catch {
          /* o erro fica no evento e aparece no card do app em Aplicativos */
        }
      }
    });
    return new NextResponse(null, { status: 200 });
  }
  if (caminho === 'deliveryUpdate' || caminho === 'confirmationCode') {
    // registrado para auditoria; o status do pedido vem pelos eventos
    try {
      const j = JSON.parse(corpo || '{}') as { orderId?: string; id?: string };
      await registrarEventoOD(c, { eventId: `${caminho}:${j.orderId ?? j.id ?? ''}:${Date.now()}`, eventType: caminho.toUpperCase(), orderId: j.orderId ?? j.id ?? '' });
    } catch {
      return erro(400, 'Corpo inválido');
    }
    return new NextResponse(null, { status: 200 });
  }
  return erro(404, 'Rota não encontrada');
}
