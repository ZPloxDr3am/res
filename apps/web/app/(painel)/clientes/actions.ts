'use server';
import { revalidatePath } from 'next/cache';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { ClienteBusca } from '@/lib/clientes';

/** Busca por telefone (4+ dígitos) ou nome (2+ letras); vazio = os mais recentes. */
export async function buscarClientes(termo: string, limite = 8): Promise<ClienteBusca[]> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('buscar_clientes', { p_loja: ctx.lojaId, p_termo: termo, p_limite: limite });
  if (error) return [];
  return (data as ClienteBusca[]) ?? [];
}

export async function salvarCliente(id: string, nome: string, observacoes: string, removerEnderecos: string[] = []): Promise<{ ok: true } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_cliente', { p_loja: ctx.lojaId, p_cliente: id, p_nome: nome, p_observacoes: observacoes, p_remover_enderecos: removerEnderecos });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/clientes');
  return { ok: true };
}
