'use server';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';

export async function salvarEstacao(id: string | null, nome: string, setores: string[], apagar = false): Promise<{ ok: true; id: string | null } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('kds_estacoes_salvar', { p_loja: ctx.lojaId, p_id: id, p_nome: nome, p_setores: setores, p_apagar: apagar });
  if (error) return { ok: false, erro: error.message };
  return { ok: true, id: (data as string | null) ?? null };
}
