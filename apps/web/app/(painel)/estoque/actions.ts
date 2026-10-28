'use server';
import { revalidatePath } from 'next/cache';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';

type R<T = object> = ({ ok: true } & T) | { ok: false; erro: string };
const feito = (): R => {
  revalidatePath('/estoque');
  return { ok: true };
};

export async function definirModoEstoque(compartilhado: boolean): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('definir_modo_estoque', { p_loja: ctx.lojaId, p_compartilhado: compartilhado });
  return error ? { ok: false, erro: error.message } : feito();
}

export async function salvarInsumo(id: string | null, dados: { nome: string; unidade: string; categoria?: string | null; minimo?: number | null; controla?: boolean; aceita_negativo?: boolean }): Promise<R<{ id: string }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('salvar_insumo', { p_loja: ctx.lojaId, p_id: id, p_dados: dados });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/estoque');
  return { ok: true, id: data as string };
}

export async function excluirInsumo(id: string): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('excluir_insumo', { p_loja: ctx.lojaId, p_id: id });
  return error ? { ok: false, erro: error.message } : feito();
}

/** tipo: entrada (com custo em centavos por unidade), perda ou contagem (quantidade contada). */
export async function ajustarEstoque(insumoId: string, tipo: 'entrada' | 'perda' | 'contagem', quantidade: number, custo: number | null, motivo: string): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('ajustar_estoque', { p_loja: ctx.lojaId, p_insumo: insumoId, p_tipo: tipo, p_qtd: quantidade, p_custo: custo, p_motivo: motivo });
  return error ? { ok: false, erro: error.message } : feito();
}

export async function vinculosFornecedor(cnpj: string): Promise<Record<string, { insumo_id: string; fator: number }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc('vinculos_fornecedor', { p_loja: ctx.lojaId, p_cnpj: cnpj });
  return ((data as { vinculos?: Record<string, { insumo_id: string; fator: number }> } | null)?.vinculos) ?? {};
}

export type ItemImportar = {
  n: number;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  custo_total: number;
  acao: 'vincular' | 'novo' | 'ignorar';
  insumo_id?: string | null;
  novo?: { nome: string; unidade: string } | null;
  fator: number;
};
export async function importarNFe(nfe: { chave: string; numero: string; serie: string; emissao: string | null; emitente_cnpj: string; emitente_nome: string; valor_total: number; itens: ItemImportar[] }): Promise<R<{ entradas: number }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('importar_nfe', { p_loja: ctx.lojaId, p_nfe: nfe });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/estoque');
  return { ok: true, entradas: (data as { entradas: number }).entradas };
}

export async function salvarFicha(produtoId: string | null, opcaoId: string | null, itens: { insumo_id: string; quantidade: number }[]): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_ficha', { p_loja: ctx.lojaId, p_produto: produtoId, p_opcao: opcaoId, p_itens: itens });
  return error ? { ok: false, erro: error.message } : feito();
}
