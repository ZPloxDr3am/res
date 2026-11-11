'use server';
import { revalidatePath } from 'next/cache';
import type { ConfigFidelidade } from '@res/core';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { lerConfig, type Movimento, type SaldoCliente, type Saldos } from '@/lib/fidelidade';

type R<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

export async function salvarConfigFidelidade(cfg: ConfigFidelidade): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_config_fidelidade', { p_loja: ctx.lojaId, p_cfg: cfg });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/fidelidade');
  return { ok: true };
}

/** Copia as regras (não recompensas nem saldos) para outras lojas do grupo; o banco confere a permissão em cada uma. */
export async function copiarPrograma(cfg: ConfigFidelidade, lojaIds: string[]): Promise<R> {
  const ctx = await contextoLoja();
  const permitidas = new Set(ctx.lojas.map((l) => l.id));
  const supabase = await criarClienteServidor();
  for (const id of lojaIds) {
    if (!permitidas.has(id)) return { ok: false, erro: 'Loja fora do seu acesso.' };
    const { error } = await supabase.rpc('salvar_config_fidelidade', { p_loja: id, p_cfg: cfg });
    if (error) return { ok: false, erro: `${ctx.lojas.find((l) => l.id === id)?.nome ?? 'Loja'}: ${error.message}` };
  }
  revalidatePath('/fidelidade');
  return { ok: true };
}

export async function salvarRecompensa(id: string | null, dados: { tipo: 'desconto' | 'produto'; nome: string; pontos: number; valor?: number | null; produto_id?: string | null }): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_recompensa', { p_loja: ctx.lojaId, p_id: id, p_dados: dados });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/fidelidade');
  return { ok: true };
}

export async function excluirRecompensa(id: string): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('excluir_recompensa', { p_loja: ctx.lojaId, p_id: id });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/fidelidade');
  return { ok: true };
}

export async function buscarSaldos(termo: string, offset = 0): Promise<Saldos | null> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('saldos_fidelidade', { p_loja: ctx.lojaId, p_termo: termo, p_limite: 50, p_offset: offset });
  return error ? null : (data as Saldos);
}

export async function extratoCliente(clienteId: string): Promise<Movimento[]> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc('extrato_fidelidade', { p_loja: ctx.lojaId, p_cliente: clienteId });
  return (data as Movimento[]) ?? [];
}

/** valor: centavos (cashback) ou pontos; negativo tira. */
export async function ajustarSaldo(clienteId: string, tipo: 'cashback' | 'pontos', valor: number, motivo: string): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('ajustar_fidelidade', { p_loja: ctx.lojaId, p_cliente: clienteId, p_tipo: tipo, p_valor: valor, p_motivo: motivo });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/fidelidade');
  return { ok: true };
}

/** Novo pedido (balcão): saldo do cliente escolhido. null = programa desligado. */
export async function saldoDoCliente(clienteId: string): Promise<SaldoCliente | null> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('saldo_cliente_fidelidade', { p_loja: ctx.lojaId, p_cliente: clienteId });
  if (error || !data) return null;
  const d = data as SaldoCliente & { config: Record<string, unknown> };
  return { ...d, config: lerConfig(d.config)! };
}
