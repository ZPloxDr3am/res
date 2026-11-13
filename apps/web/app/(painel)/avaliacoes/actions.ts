'use server';
import { revalidatePath } from 'next/cache';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';

export async function resolverAvaliacao(id: string, resolvido: boolean): Promise<{ ok: true } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('avaliacao_resolver', { p_loja: ctx.lojaId, p_id: id, p_resolvido: resolvido });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/avaliacoes');
  return { ok: true };
}
