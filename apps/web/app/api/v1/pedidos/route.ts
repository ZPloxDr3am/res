import { data, opcoes, responder } from '@/lib/api-publica';

/** GET /api/v1/pedidos?de=AAAA-MM-DD&ate=AAAA-MM-DD&status=concluido&limite=50&pagina=1 */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  const filtro = { de: data(u.get('de')), ate: data(u.get('ate')), status: u.get('status') || null, limite: Number(u.get('limite')) || 50, pagina: Number(u.get('pagina')) || 1 };
  return responder(req, 'api_pedidos', (chave) => ({ p_chave: chave, p_filtro: filtro }));
}
export const OPTIONS = opcoes;
