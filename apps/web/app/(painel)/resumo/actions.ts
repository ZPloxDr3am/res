'use server';
import { revalidatePath } from 'next/cache';
import { criarClienteServidor } from '@/lib/supabase/server';

/** Meta de vendas do mês de uma loja (D-064). valor em reais; 0 tira a meta deste mês. */
export async function salvarMeta(lojaId: string, mes: string, valor: number): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (!Number.isFinite(valor) || valor < 0) return { ok: false, erro: 'Confira o valor da meta.' };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_meta_vendas', { p_loja: lojaId, p_mes: mes, p_valor: valor });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/resumo');
  return { ok: true };
}
