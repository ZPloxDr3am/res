'use server';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { PainelMotoboy, Entrega } from '@/lib/motoboy';

export async function painelMotoboy(): Promise<PainelMotoboy | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('motoboy_painel');
  if (error) throw new Error(error.message);
  return data as PainelMotoboy | null;
}

/** Leu o QR da comanda: o pedido sai com este motoboy. Aceita o link inteiro ou só o código. */
export async function despachar(lido: string): Promise<{ ok: true; entrega: Entrega } | { ok: false; erro: string }> {
  const token = (lido.trim().match(/\/m\/d\/([A-Za-z0-9]+)/)?.[1] ?? lido.trim()).slice(0, 64);
  if (!/^[A-Za-z0-9]{16,64}$/.test(token)) return { ok: false, erro: 'Esse QR não é de uma comanda do RES.' };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('motoboy_despachar', { p_token: token });
  if (error) return { ok: false, erro: error.message };
  return { ok: true, entrega: data as Entrega };
}

export async function entregar(pedidoId: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('motoboy_entregar', { p_pedido: pedidoId });
  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}
