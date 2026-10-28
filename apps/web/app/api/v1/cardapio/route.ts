import { opcoes, responder } from '@/lib/api-publica';

/** GET /api/v1/cardapio — categorias, produtos, grupos e opções */
export async function GET(req: Request) {
  return responder(req, 'api_cardapio', (chave) => ({ p_chave: chave }));
}
export const OPTIONS = opcoes;
