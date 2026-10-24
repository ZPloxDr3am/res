'use server';
import type { FormaPagamento } from '@res/core';
import { criarClienteServidor } from '@/lib/supabase/server';

export interface PedidoCliente {
  tipo: 'entrega' | 'retirada';
  cliente: { nome: string; telefone: string };
  endereco?: { logradouro: string; numero?: string; complemento?: string; bairro: string; referencia?: string };
  itens: {
    produtoId: string;
    quantidade: number;
    observacao?: string;
    escolhas: Record<string, Record<string, number>>;
    /** combo: o que o cliente escolheu em cada passo */
    passos?: { passoId: string; produtoId: string; escolhas: Record<string, Record<string, number>> }[];
  }[];
  pagamento: FormaPagamento;
  /** centavos */
  trocoPara: number | null;
  observacao?: string;
  /** ISO de um dos horários de public.horarios_agendamento; null = o quanto antes. */
  agendadoPara: string | null;
  /** código do cupom (o banco confere e calcula o desconto) */
  cupom?: string | null;
}

/** Envia o pedido do cliente. O banco confere tudo de novo (aberto, bairro, taxa, preço, mínimo). */
export async function enviarPedido(slug: string, p: PedidoCliente): Promise<{ ok: true; codigo: string; numero: number } | { ok: false; erro: string }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('criar_pedido_publico', {
    p_slug: slug,
    p_dados: {
      tipo: p.tipo,
      cliente: p.cliente,
      endereco: p.tipo === 'entrega' ? p.endereco : null,
      itens: p.itens.map((i) => ({
        produto_id: i.produtoId,
        quantidade: i.quantidade,
        observacao: i.observacao || null,
        escolhas: i.passos ? { passos: i.passos.map((x) => ({ passo_id: x.passoId, produto_id: x.produtoId, escolhas: x.escolhas })) } : i.escolhas,
      })),
      pagamento: p.pagamento,
      troco_para: p.pagamento === 'dinheiro' && p.trocoPara != null ? p.trocoPara / 100 : null,
      observacao: p.observacao || null,
      agendado_para: p.agendadoPara,
      cupom: p.cupom || null,
    },
  });
  if (error) return { ok: false, erro: error.message };
  const r = data as { codigo: string; numero: number };
  return { ok: true, codigo: r.codigo, numero: r.numero };
}

/** Confere o cupom antes de enviar (centavos). O desconto final é recalculado pelo banco ao gravar. */
export async function conferirCupom(
  slug: string,
  codigo: string,
  subtotal: number,
  taxa: number,
  tipo: 'entrega' | 'retirada',
  telefone: string,
): Promise<{ ok: true; codigo: string; desconto: number; descricao: string } | { ok: false; erro: string }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('validar_cupom', { p_slug: slug, p_codigo: codigo, p_subtotal: subtotal, p_taxa: taxa, p_tipo: tipo, p_telefone: telefone });
  if (error) return { ok: false, erro: error.message };
  const r = data as { codigo: string; desconto: number; descricao: string };
  return { ok: true, codigo: r.codigo, desconto: Number(r.desconto), descricao: r.descricao };
}
