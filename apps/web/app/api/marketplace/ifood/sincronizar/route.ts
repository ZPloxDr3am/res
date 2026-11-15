import { NextResponse } from 'next/server';
import { clienteAdmin } from '@/lib/supabase/admin';
import { enviarSaida, ifoodConfigurado, sincronizarEventos } from '@/lib/marketplace/ifood';
import { enviarSaidaOD } from '@/lib/marketplace/opendelivery';
import { sincronizarCanaisCliente } from '@/lib/marketplace/canais-cliente';

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
  // Open Delivery (99Food, Keeta, aiqfome; D-116): a fila de saída vai também, com ou sem iFood ligado
  const od = await enviarSaidaOD().catch((e: Error) => ({ enviados: 0, erros: 1, falha: e.message }));
  // Delivery Much e Rappi (D-117): o RES busca os pedidos e envia a fila
  const clientes = await sincronizarCanaisCliente().catch((e: Error) => ({ conexoes: 0, novos: 0, enviados: 0, erros: 1, falha: e.message }));
  if (!ifoodConfigurado()) return NextResponse.json({ ok: true, modo: 'teste', od, clientes });
  const db = clienteAdmin();
  const { data } = db ? await db.from('marketplace_lojas').select('merchant_id, loja_id').eq('canal', 'ifood').eq('ativo', true).eq('modo', 'producao') : { data: [] };
  // D-085: só lojas com o módulo iFood no plano
  const lista = (data ?? []) as { merchant_id: string; loja_id: string }[];
  const liberadas = new Set<string>();
  for (const l of new Set(lista.map((m) => m.loja_id))) {
    const { data: tem } = await db!.rpc('loja_tem_modulo', { p_loja: l, p_modulo: 'ifood' });
    if (tem !== false) liberadas.add(l);
  }
  const merchants = lista.filter((m) => liberadas.has(m.loja_id)).map((m) => m.merchant_id);
  if (merchants.length === 0) return NextResponse.json({ ok: true, merchants: 0, od, clientes });
  const eventos = await sincronizarEventos(merchants);
  const saida = await enviarSaida();
  return NextResponse.json({ ok: true, merchants: merchants.length, ...eventos, ...saida, od, clientes });
}
