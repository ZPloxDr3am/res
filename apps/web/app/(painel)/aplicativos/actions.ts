'use server';
import { revalidatePath } from 'next/cache';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { TipoIntegracao } from '@/lib/aplicativos';

type R<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

export async function salvarIntegracao(tipo: TipoIntegracao, ativo: boolean, config: Record<string, string | null>, todas: boolean): Promise<R<{ lojas: number }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('salvar_integracao', { p_loja: ctx.lojaId, p_tipo: tipo, p_ativo: ativo, p_config: config, p_todas: todas });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/aplicativos');
  return { ok: true, lojas: data as number };
}

export async function removerIntegracao(tipo: TipoIntegracao): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('remover_integracao', { p_loja: ctx.lojaId, p_tipo: tipo });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/aplicativos');
  return { ok: true };
}

export async function salvarLinkGrupo(link: string): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_link_grupo', { p_loja: ctx.lojaId, p_link: link });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/aplicativos');
  return { ok: true };
}
