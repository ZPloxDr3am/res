import { data, opcoes, responder } from '@/lib/api-publica';

/** GET /api/v1/vendas?de=AAAA-MM-DD&ate=AAAA-MM-DD — resumo, por dia, por tipo/origem e mais vendidos */
export async function GET(req: Request) {
  const u = new URL(req.url).searchParams;
  return responder(req, 'api_vendas', (chave) => ({ p_chave: chave, p_de: data(u.get('de')), p_ate: data(u.get('ate')) }));
}
export const OPTIONS = opcoes;
