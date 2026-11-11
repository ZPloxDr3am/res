'use server';
import { revalidatePath } from 'next/cache';
import { criarClienteServidor } from '@/lib/supabase/server';
import { contextoLoja } from '@/lib/loja';

type R<T = object> = ({ ok: true } & T) | { ok: false; erro: string };
const SLUG = /^[a-z0-9]([a-z0-9-]{1,58}[a-z0-9])?$/;
const msg = (m: string) => (/marcas_slug_key/.test(m) ? 'Esse endereço de link já está em uso. Escolha outro.' : /marcas_evento_periodo/.test(m) ? 'O fim do evento precisa ser depois do início.' : m);

function refrescar() {
  revalidatePath('/evento');
  revalidatePath('/', 'layout');
}

export async function criarEvento(d: { nome: string; slug: string; base: string; inicio: string | null; fim: string | null }): Promise<R<{ id: string }>> {
  const ctx = await contextoLoja();
  const slug = d.slug.trim().toLowerCase();
  if (!SLUG.test(slug)) return { ok: false, erro: 'Endereço do link: letras minúsculas, números e hífen (3 a 60).' };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('criar_evento', { p_loja: ctx.lojaId, p_nome: d.nome, p_slug: slug, p_base: d.base, p_inicio: d.inicio, p_fim: d.fim });
  if (error) return { ok: false, erro: msg(error.message) };
  refrescar();
  return { ok: true, id: data as string };
}

export async function salvarEvento(marca: string, d: { nome: string; inicio: string | null; fim: string | null; mensagem: string; ativa: boolean }): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_evento', { p_marca: marca, p_dados: { nome: d.nome, inicio: d.inicio ?? '', fim: d.fim ?? '', mensagem: d.mensagem, ativa: d.ativa } });
  if (error) return { ok: false, erro: msg(error.message) };
  refrescar();
  return { ok: true };
}

export async function copiarParaEvento(evento: string, produto: string): Promise<R<{ id: string }>> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('copiar_para_evento', { p_evento: evento, p_produto: produto });
  if (error) return { ok: false, erro: error.message };
  refrescar();
  return { ok: true, id: data as string };
}

export type AjusteProduto = {
  nome: string;
  descricao: string;
  /** reais */
  preco: number;
  ativo: boolean;
  grupos: { id: string; nome: string; min: number; max: number; obrigatorio: boolean; permite_repetir: boolean; remover?: boolean; opcoes: { id: string; ativo: boolean; preco: number }[] }[];
};

export async function salvarProdutoEvento(produto: string, d: AjusteProduto): Promise<R> {
  if (!Number.isFinite(d.preco) || d.preco < 0) return { ok: false, erro: 'Confira o preço.' };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_produto_evento', { p_produto: produto, p_dados: d });
  if (error) return { ok: false, erro: error.message };
  refrescar();
  return { ok: true };
}

export async function removerProdutoEvento(produto: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('remover_produto_evento', { p_produto: produto });
  if (error) return { ok: false, erro: error.message };
  refrescar();
  return { ok: true };
}

/** Pré-venda do evento (D-056): só Pix, para a data de entrega/retirada; entrega e/ou retirada. */
export async function salvarPrevenda(marca: string, d: { ativa: boolean; entrega: string | null; texto: string; aceitaEntrega: boolean; aceitaRetirada: boolean }): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_prevenda', {
    p_marca: marca,
    p_dados: { ativa: d.ativa, entrega: d.entrega ?? '', texto: d.texto, aceita_entrega: d.aceitaEntrega, aceita_retirada: d.aceitaRetirada },
  });
  if (error) return { ok: false, erro: error.message };
  refrescar();
  return { ok: true };
}
