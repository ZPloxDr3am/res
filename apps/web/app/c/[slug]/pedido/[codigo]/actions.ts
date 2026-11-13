'use server';
import { criarClienteServidor } from '@/lib/supabase/server';

/** Avaliação do pedido pelo cliente (D-111). Devolve o link do Google quando a nota é 4 ou 5. */
export async function avaliarPedido(codigo: string, nota: number, problemas: string[], comentario: string): Promise<{ ok: true; google: string | null } | { ok: false; erro: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(codigo)) return { ok: false, erro: 'Pedido inválido.' };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('avaliar_pedido', { p_codigo: codigo, p_nota: nota, p_problemas: problemas.slice(0, 8), p_comentario: comentario.slice(0, 500) });
  if (error) return { ok: false, erro: error.message };
  return { ok: true, google: ((data as { google?: string | null } | null)?.google as string | null) ?? null };
}
