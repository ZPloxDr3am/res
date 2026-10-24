'use server';
import { revalidatePath } from 'next/cache';
import type { FormaPagamento } from '@res/core';
import { criarClienteServidor } from '@/lib/supabase/server';

export interface ConfigDelivery {
  status: 'auto' | 'aberto' | 'fechado';
  pedidoMinimo: number; // centavos
  aceitaEntrega: boolean;
  aceitaRetirada: boolean;
  formasPagamento: FormaPagamento[];
  mensagem: string;
  /** 0 = não aceita pedido agendado; até 7 dias à frente. */
  agendamentoDias: number;
  horarios: { dia: number; abre: string; fecha: string }[];
  /** só leitura aqui: bairros e taxas são editados em Entregas (D-020); taxa em centavos */
  areas?: { bairro: string; taxa: number; ativo: boolean }[];
}

export async function salvarConfig(marcaId: string, c: ConfigDelivery): Promise<{ ok: true } | { ok: false; erro: string }> {
  if (c.horarios.some((h) => h.abre === h.fecha)) return { ok: false, erro: 'Um horário abre e fecha na mesma hora.' };
  if (c.formasPagamento.length === 0) return { ok: false, erro: 'Escolha pelo menos uma forma de pagamento.' };
  if (!c.aceitaEntrega && !c.aceitaRetirada) return { ok: false, erro: 'Aceite pelo menos entrega ou retirada.' };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_config_delivery', {
    p_marca: marcaId,
    p_config: {
      status: c.status,
      pedido_minimo: c.pedidoMinimo / 100,
      aceita_entrega: c.aceitaEntrega,
      aceita_retirada: c.aceitaRetirada,
      formas_pagamento: c.formasPagamento,
      mensagem: c.mensagem,
      agendamento_dias: c.agendamentoDias,
      horarios: c.horarios,
    },
  });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/delivery');
  return { ok: true };
}

/** Abrir/fechar na hora (botão rápido), sem mexer no resto. */
export async function definirStatus(marcaId: string, status: 'auto' | 'aberto' | 'fechado') {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_config_delivery', { p_marca: marcaId, p_config: { status } });
  if (error) return { ok: false as const, erro: error.message };
  revalidatePath('/delivery');
  return { ok: true as const };
}

/** Salva os horários desta tela e copia para os outros cardápios de todas as lojas do grupo (conta). */
export async function replicarHorarios(marcaId: string, horarios: ConfigDelivery['horarios']): Promise<{ ok: true; n: number } | { ok: false; erro: string }> {
  if (horarios.some((h) => h.abre === h.fecha)) return { ok: false, erro: 'Um horário abre e fecha na mesma hora.' };
  const supabase = await criarClienteServidor();
  const salvo = await supabase.rpc('salvar_config_delivery', { p_marca: marcaId, p_config: { horarios } });
  if (salvo.error) return { ok: false, erro: salvo.error.message };
  const { data, error } = await supabase.rpc('replicar_horarios', { p_marca: marcaId });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/delivery');
  return { ok: true, n: data as number };
}
