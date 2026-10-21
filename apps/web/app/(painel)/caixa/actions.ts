'use server';
import { revalidatePath } from 'next/cache';
import { limparContagem, type Contagem } from '@res/core';
import { criarClienteServidor } from '@/lib/supabase/server';
import { contextoLoja } from '@/lib/loja';

type R = { ok: true } | { ok: false; erro: string };
const msg = (e: { message: string }) => (/caixas_nome_idx/.test(e.message) ? 'Já existe um caixa com esse nome.' : e.message);

/** Abre o caixa com o troco contado por cédula (ou um valor direto, em centavos). */
export async function abrirCaixa(caixaId: string, contagem: Contagem | null, valor: number | null): Promise<R> {
  const supabase = await criarClienteServidor();
  const dados = contagem ? { contagem: limparContagem(contagem) } : { valor: (valor ?? 0) / 100 };
  const { error } = await supabase.rpc('abrir_caixa', { p_caixa: caixaId, p_dados: dados });
  if (error) return { ok: false, erro: msg(error) };
  revalidatePath('/caixa');
  return { ok: true };
}

/** Sangria (retirada) ou suprimento (reforço) de dinheiro. valor em centavos. */
export async function movimentar(sessaoId: string, tipo: 'sangria' | 'suprimento', valor: number, descricao: string): Promise<R> {
  if (!(valor > 0)) return { ok: false, erro: 'Informe um valor maior que zero.' };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('movimentar_caixa', { p_sessao: sessaoId, p_tipo: tipo, p_valor: valor / 100, p_descricao: descricao || null });
  if (error) return { ok: false, erro: msg(error) };
  revalidatePath('/caixa');
  return { ok: true };
}

/** Fechamento cego: contagem do dinheiro + valores das maquininhas/Pix (centavos). */
export async function fecharCaixa(
  sessaoId: string,
  contagem: Contagem,
  informado: Record<string, number>,
  observacao: string,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const supabase = await criarClienteServidor();
  const inf: Record<string, number> = {};
  for (const [k, v] of Object.entries(informado)) if (v > 0) inf[k] = v / 100;
  const { error } = await supabase.rpc('fechar_caixa', {
    p_sessao: sessaoId,
    p_dados: { contagem: limparContagem(contagem), informado: inf, observacao: observacao || null },
  });
  if (error) return { ok: false, erro: msg(error) };
  revalidatePath('/caixa');
  return { ok: true };
}

export async function vincularSemCaixa(sessaoId: string): Promise<{ ok: true; n: number } | { ok: false; erro: string }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('vincular_pedidos_sem_caixa', { p_sessao: sessaoId });
  if (error) return { ok: false, erro: msg(error) };
  revalidatePath('/caixa');
  return { ok: true, n: data as number };
}

export async function salvarCaixa(id: string | null, nome: string, ativo: boolean, operadores: string[]): Promise<R> {
  if (!nome.trim()) return { ok: false, erro: 'Dê um nome ao caixa.' };
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_caixa', { p_loja: ctx.lojaId, p_id: id, p_nome: nome.trim(), p_ativo: ativo, p_operadores: operadores });
  if (error) return { ok: false, erro: msg(error) };
  revalidatePath('/caixa');
  return { ok: true };
}
