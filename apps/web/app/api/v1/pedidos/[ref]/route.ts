import { opcoes, responder } from '@/lib/api-publica';

/** GET /api/v1/pedidos/{número ou id} */
export async function GET(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  return responder(req, 'api_pedido', (chave) => ({ p_chave: chave, p_ref: ref.slice(0, 40) }));
}
export const OPTIONS = opcoes;
