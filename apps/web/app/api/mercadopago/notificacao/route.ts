import { NextResponse } from 'next/server';
import { atualizarPagamento } from '@/lib/mercadopago';

// Aviso do Mercado Pago (D-044). Não confiamos no corpo: buscamos o pagamento na API do Mercado Pago
// com o token da loja e só marcamos pago se for um pagamento que o RES criou para aquele pedido.
export async function POST(req: Request) {
  const u = new URL(req.url);
  const loja = u.searchParams.get('l') ?? '';
  let id = Number(u.searchParams.get('data.id') ?? u.searchParams.get('id'));
  let tipo = u.searchParams.get('type') ?? u.searchParams.get('topic');
  try {
    const b = (await req.json()) as { type?: string; topic?: string; data?: { id?: string | number }; resource?: string };
    tipo = b.type ?? b.topic ?? tipo;
    id = Number(b.data?.id ?? (b.resource ? b.resource.split('/').pop() : id)) || id;
  } catch {}
  if (/^[0-9a-f-]{36}$/i.test(loja) && tipo === 'payment' && Number.isFinite(id) && id > 0) {
    await atualizarPagamento(loja, id).catch(() => null);
  }
  return NextResponse.json({ ok: true });
}
