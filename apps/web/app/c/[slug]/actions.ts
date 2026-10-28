'use server';
import type { FormaPagamento } from '@res/core';
import { lerConfig, type ProgramaPublico } from '@/lib/fidelidade';
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
  /** cashback (centavos) e/ou recompensa (D-031); prova = código de um pedido anterior guardado no aparelho */
  fidelidade?: { cashback: number; recompensa: string | null } | null;
  fidelidadeProva?: string | null;
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
      fidelidade: p.fidelidade && (p.fidelidade.cashback > 0 || p.fidelidade.recompensa) ? p.fidelidade : null,
      fidelidade_prova: p.fidelidadeProva ?? null,
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

/** O programa de fidelidade da loja (para mostrar quanto o cliente ganha). null = desligado. */
export async function programaFidelidade(slug: string): Promise<ProgramaPublico | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc('fidelidade_publica', { p_slug: slug });
  if (!data) return null;
  const d = data as ProgramaPublico & { config: Record<string, unknown> };
  return { ...d, config: lerConfig(d.config)! };
}

/** Saldo do cliente, só com a prova (código de um pedido anterior dele guardado neste aparelho). */
export async function saldoFidelidade(slug: string, telefone: string, prova: string): Promise<{ cashback: number; pontos: number } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(prova)) return null;
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc('saldo_fidelidade_publico', { p_slug: slug, p_telefone: telefone, p_prova: prova });
  return (data as { cashback: number; pontos: number } | null) ?? null;
}

// ---- Pix automático pelo Mercado Pago (D-044)
export async function pixMercadoPago(codigo: string) {
  if (!/^[0-9a-f-]{36}$/i.test(codigo)) return null;
  const { pixDoPedido } = await import('@/lib/mercadopago');
  return pixDoPedido(codigo);
}
export async function conferirPixMercadoPago(codigo: string) {
  if (!/^[0-9a-f-]{36}$/i.test(codigo)) return null;
  const { conferirPix } = await import('@/lib/mercadopago');
  return conferirPix(codigo);
}
