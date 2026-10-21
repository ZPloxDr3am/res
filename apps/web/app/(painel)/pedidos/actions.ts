'use server';
import { revalidatePath } from 'next/cache';
import type { FormaPagamento, StatusPedido, TipoPedido } from '@res/core';
import { criarClienteServidor } from '@/lib/supabase/server';
import { contextoLoja } from '@/lib/loja';

export type Resultado = { ok: true } | { ok: false; erro: string };

const mensagem = (e: { message: string; code?: string }) =>
  e.code === '42501' || /permission denied|row-level security/.test(e.message) ? 'Você não tem permissão para mexer nos pedidos.' : e.message;

export async function mudarStatus(pedidoId: string, status: StatusPedido, motivo?: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('mudar_status_pedido', { p_pedido: pedidoId, p_status: status, p_motivo: motivo ?? null });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/pedidos');
  return { ok: true };
}

export async function definirAceiteAutomatico(valor: boolean): Promise<Resultado> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from('lojas').update({ aceite_automatico: valor }).eq('id', ctx.lojaId).select('id');
  if (error) return { ok: false, erro: mensagem(error) };
  if (!data?.length) return { ok: false, erro: 'Só quem cuida dos dados da empresa pode mudar o aceite automático.' };
  revalidatePath('/pedidos');
  return { ok: true };
}

export interface NovoPedido {
  marcaId: string;
  tipo: TipoPedido;
  cliente: { nome: string; telefone?: string };
  endereco?: { logradouro: string; numero?: string; complemento?: string; bairro: string; referencia?: string };
  itens: { produtoId: string; quantidade: number; observacao?: string; escolhas: Record<string, Record<string, number>> }[];
  /** Valores em centavos. O banco recalcula os preços dos itens a partir do cardápio.
   *  taxaEntrega null = usar a taxa do bairro cadastrada na marca (o banco busca). */
  taxaEntrega: number | null;
  desconto: number;
  pagamento: FormaPagamento;
  trocoPara: number | null;
  observacao?: string;
  /** ISO; null = o quanto antes. */
  agendadoPara?: string | null;
}

export async function criarPedido(p: NovoPedido): Promise<{ ok: true; numero: number } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  if (!p.cliente.nome.trim()) return { ok: false, erro: 'Informe o nome do cliente.' };
  const supabase = await criarClienteServidor();
  const { data: id, error } = await supabase.rpc('criar_pedido', {
    p_loja: ctx.lojaId,
    p_marca: p.marcaId,
    p_dados: {
      tipo: p.tipo,
      cliente: { nome: p.cliente.nome.trim(), telefone: p.cliente.telefone || null },
      endereco: p.tipo === 'entrega' ? p.endereco : null,
      itens: p.itens.map((i) => ({ produto_id: i.produtoId, quantidade: i.quantidade, observacao: i.observacao || null, escolhas: i.escolhas })),
      taxa_entrega: p.taxaEntrega == null ? null : p.taxaEntrega / 100,
      desconto: p.desconto / 100,
      pagamento: p.pagamento,
      troco_para: p.trocoPara == null ? null : p.trocoPara / 100,
      observacao: p.observacao || null,
      agendado_para: p.agendadoPara ?? null,
    },
  });
  if (error) return { ok: false, erro: mensagem(error) };
  const { data } = await supabase.from('pedidos').select('numero').eq('id', id as string).single();
  revalidatePath('/pedidos');
  return { ok: true, numero: data?.numero ?? 0 };
}
