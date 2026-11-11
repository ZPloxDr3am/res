import { NextResponse } from 'next/server';
import { conferirPagamentoRes } from '@/lib/cobranca';

// Aviso do Mercado Pago para as faturas do RES (D-085). Não confiamos no corpo: buscamos o
// pagamento com o token da empresa e só quitamos o Pix que o RES criou para aquela fatura.
export async function POST(req: Request) {
  const u = new URL(req.url);
  let id = Number(u.searchParams.get('data.id') ?? u.searchParams.get('id'));
  let tipo = u.searchParams.get('type') ?? u.searchParams.get('topic');
  try {
    const b = (await req.json()) as { type?: string; topic?: string; data?: { id?: string | number }; resource?: string };
    tipo = b.type ?? b.topic ?? tipo;
    id = Number(b.data?.id ?? (b.resource ? b.resource.split('/').pop() : id)) || id;
  } catch {}
  if (tipo === 'payment' && Number.isFinite(id) && id > 0) await conferirPagamentoRes(id).catch(() => null);
  return NextResponse.json({ ok: true });
}
