import { NextResponse } from 'next/server';
import { clienteAdmin } from '@/lib/supabase/admin';
import { enviarSaida, ifoodConfigurado, sincronizarEventos } from '@/lib/marketplace/ifood';

export const dynamic = 'force-dynamic';

/**
 * Chamada pelo agendador do banco (private.marketplace_tique, a cada 30 s, D-075) com o cabeçalho
 * X-RES-Chave = MARKETPLACE_CRON_SEGREDO (ou ?chave= para teste manual): busca eventos (reserva do
 * webhook), confirma o recebimento e envia a fila de volta para o iFood.
 */
export async function POST(req: Request) {
  return GET(req);
}

export async function GET(req: Request) {
  const chave = req.headers.get('x-res-chave') ?? new URL(req.url).searchParams.get('chave');
  if (!process.env.MARKETPLACE_CRON_SEGREDO || chave !== process.env.MARKETPLACE_CRON_SEGREDO) {
    return NextResponse.json({ erro: 'não autorizado' }, { status: 401 });
  }
  if (!ifoodConfigurado()) return NextResponse.json({ ok: true, modo: 'teste' });
  const db = clienteAdmin();
  const { data } = db ? await db.from('marketplace_lojas').select('merchant_id').eq('canal', 'ifood').eq('ativo', true).eq('modo', 'producao') : { data: [] };
  const merchants = (data ?? []).map((m) => m.merchant_id as string);
  if (merchants.length === 0) return NextResponse.json({ ok: true, merchants: 0 });
  const eventos = await sincronizarEventos(merchants);
  const saida = await enviarSaida();
  return NextResponse.json({ ok: true, merchants: merchants.length, ...eventos, ...saida });
}
