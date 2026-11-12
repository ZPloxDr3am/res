'use server';
import { revalidatePath } from 'next/cache';
import type { FormaPagamento } from '@res/core';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { ItemRodada } from '@/components/novo-pedido';
import type { ContaSalao } from '@/components/salao/tipos';

type R<T = undefined> = T extends undefined ? { ok: true } | { ok: false; erro: string } : { ok: true; dados: T } | { ok: false; erro: string };

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<{ ok: true; dados: T } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc(fn, { p_loja: ctx.lojaId, ...args });
  if (error) return { ok: false, erro: error.message };
  return { ok: true, dados: data as T };
}

const ok = <T,>(r: { ok: true; dados: T } | { ok: false; erro: string }) => {
  revalidatePath('/salao');
  return r;
};

/** Item da tela → formato do banco (o mesmo do novo pedido). */
const paraBanco = (itens: ItemRodada[]) =>
  itens.map((i) => ({
    produto_id: i.produtoId,
    quantidade: i.quantidade,
    observacao: i.observacao || null,
    escolhas: i.passos ? { passos: i.passos.map((x) => ({ passo_id: x.passoId, produto_id: x.produtoId, escolhas: x.escolhas })) } : i.escolhas,
  }));

export async function abrirConta(localId: string, pessoas: number, cliente: string): Promise<R<string>> {
  return ok(await rpc<string>('salao_abrir_conta', { p_local: localId, p_pessoas: pessoas, p_cliente: cliente || null }));
}

export async function verConta(contaId: string): Promise<R<ContaSalao>> {
  return rpc<ContaSalao>('salao_conta', { p_conta: contaId });
}

export async function lancarRodada(contaId: string, marcaId: string, itens: ItemRodada[], observacao: string): Promise<{ ok: true; numero: number } | { ok: false; erro: string }> {
  const r = await rpc<number>('salao_lancar', { p_conta: contaId, p_marca: marcaId, p_itens: paraBanco(itens), p_obs: observacao || null });
  revalidatePath('/salao');
  return r.ok ? { ok: true, numero: r.dados } : r;
}

export async function confirmarRodada(pedidoId: string): Promise<R> {
  const r = await rpc('salao_confirmar_rodada', { p_pedido: pedidoId });
  revalidatePath('/salao');
  return r.ok ? { ok: true } : r;
}

export async function cancelarRodada(pedidoId: string, motivo: string): Promise<R> {
  const r = await rpc('salao_cancelar_rodada', { p_pedido: pedidoId, p_motivo: motivo });
  revalidatePath('/salao');
  return r.ok ? { ok: true } : r;
}

export async function acaoConta(contaId: string, acao: 'pedir_conta' | 'reabrir' | 'pessoas' | 'transferir' | 'cancelar', extra?: { localId?: string; pessoas?: number }): Promise<R> {
  const r = await rpc('salao_acao_conta', { p_conta: contaId, p_acao: acao, p_local: extra?.localId ?? null, p_pessoas: extra?.pessoas ?? null });
  revalidatePath('/salao');
  return r.ok ? { ok: true } : r;
}

/** Valores em centavos. */
export async function fecharConta(contaId: string, comTaxa: boolean, desconto: number, pagamentos: { forma: FormaPagamento; valor: number }[]): Promise<R<{ total: number; troco: number; caixa: boolean }>> {
  return ok(
    await rpc<{ total: number; troco: number; caixa: boolean }>('salao_fechar', {
      p_conta: contaId,
      p_com_taxa: comTaxa,
      p_desconto: desconto / 100,
      p_pagamentos: pagamentos.filter((p) => p.valor > 0).map((p) => ({ forma: p.forma, valor: p.valor / 100 })),
    }),
  );
}

export async function criarLocais(tipo: 'mesa' | 'comanda', de: number, ate: number, lugares: number | null): Promise<R<number>> {
  return ok(await rpc<number>('salao_salvar_locais', { p_tipo: tipo, p_de: de, p_ate: ate, p_lugares: lugares }));
}

export async function editarLocal(localId: string, nome: string, lugares: number | null, ativo: boolean, novoQr = false): Promise<R> {
  const r = await rpc('salao_editar_local', { p_local: localId, p_nome: nome, p_lugares: lugares, p_ativo: ativo, p_novo_qr: novoQr });
  revalidatePath('/salao');
  return r.ok ? { ok: true } : r;
}

export async function salvarTaxaServico(pct: number): Promise<R> {
  const r = await rpc('salao_config', { p_taxa: pct });
  revalidatePath('/salao');
  return r.ok ? { ok: true } : r;
}
