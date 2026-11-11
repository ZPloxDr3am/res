// API aberta (D-043): a rota recebe a chave da loja e chama as funções api_* do banco com a chave
// PÚBLICA (anon). Quem confere a chave e a área é o banco (private.loja_da_chave). Nada secreto aqui.
import { NextResponse } from 'next/server';
import { createClient, type PostgrestError } from '@supabase/supabase-js';

export const clienteApi = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

/** Authorization: Bearer res_… ou X-API-Key: res_… */
export function chaveDe(req: Request): string | null {
  const a = req.headers.get('authorization');
  const k = a?.toLowerCase().startsWith('bearer ') ? a.slice(7).trim() : req.headers.get('x-api-key')?.trim();
  return k && /^res_[0-9a-f]{64}$/.test(k) ? k : null;
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, X-API-Key, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };

export function statusDoErro(e: PostgrestError): number {
  if (e.code === '28000') return 401;
  if (e.code === '42501') return 403;
  if (e.code === 'P0002') return 404;
  if (e.code === '23514' || e.code === '22P02' || e.code === '22007' || e.code === '22008') return 400;
  return 500;
}

export function json(corpo: unknown, status = 200) {
  return NextResponse.json(corpo, { status, headers: { ...CORS, 'Cache-Control': 'no-store' } });
}

/** Roda a função da API e responde no formato { dados } ou { erro }. */
export async function responder(req: Request, fn: string, args: (chave: string) => Record<string, unknown>) {
  const chave = chaveDe(req);
  if (!chave) return json({ erro: 'Envie a chave no cabeçalho Authorization: Bearer res_…' }, 401);
  const { data, error } = await clienteApi().rpc(fn, args(chave));
  if (error) return json({ erro: error.message }, statusDoErro(error));
  return json({ dados: data });
}

export const opcoes = () => new NextResponse(null, { status: 204, headers: CORS });
/** "2026-10-01" ou nada */
export const data = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
