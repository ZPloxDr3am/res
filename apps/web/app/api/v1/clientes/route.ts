import { opcoes, responder } from '@/lib/api-publica';

/** GET /api/v1/clientes?segmento=fieis&limite=100 */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  return responder(req, 'api_clientes', (chave) => ({ p_chave: chave, p_segmento: u.get('segmento') || null, p_limite: Number(u.get('limite')) || 100 }));
}
export const OPTIONS = opcoes;
