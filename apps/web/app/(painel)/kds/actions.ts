'use server';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { FilaKds } from '@/components/kds/kds';

export async function filaKds(estacaoId: string | null): Promise<{ ok: true; fila: FilaKds } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('kds_fila', { p_loja: ctx.lojaId, p_estacao: estacaoId });
  if (error) return { ok: false, erro: error.message };
  return { ok: true, fila: data as FilaKds };
}

export async function marcarKds(pedidoId: string, itens: string[], pronto: boolean): Promise<{ ok: true; status: string } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('kds_marcar', { p_loja: ctx.lojaId, p_pedido: pedidoId, p_itens: itens, p_pronto: pronto });
  if (error) return { ok: false, erro: error.message };
  return { ok: true, status: data as string };
}

export async function salvarEstacao(id: string | null, nome: string, setores: string[], apagar = false): Promise<{ ok: true; id: string | null } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('kds_estacoes_salvar', { p_loja: ctx.lojaId, p_id: id, p_nome: nome, p_setores: setores, p_apagar: apagar });
  if (error) return { ok: false, erro: error.message };
  return { ok: true, id: (data as string | null) ?? null };
}
