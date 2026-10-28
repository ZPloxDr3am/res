import { opcoes, responder } from '@/lib/api-publica';

/** GET /api/v1/estoque — insumos, saldo, custo médio e situação */
export async function GET(req: Request) {
  return responder(req, 'api_estoque', (chave) => ({ p_chave: chave }));
}
export const OPTIONS = opcoes;
