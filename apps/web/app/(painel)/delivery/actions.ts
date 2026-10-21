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
  horarios: { dia: number; abre: string; fecha: string }[];
  areas: { bairro: string; taxa: number; ativo: boolean }[]; // taxa em centavos
}

export async function salvarConfig(marcaId: string, c: ConfigDelivery): Promise<{ ok: true } | { ok: false; erro: string }> {
  const nomes = c.areas.map((a) => a.bairro.trim().toLowerCase());
  if (nomes.some((n) => !n)) return { ok: false, erro: 'Há um bairro sem nome.' };
  if (new Set(nomes).size !== nomes.length) return { ok: false, erro: 'Há bairros repetidos na lista.' };
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
      horarios: c.horarios,
      areas: c.areas.map((a) => ({ bairro: a.bairro.trim(), taxa: a.taxa / 100, ativo: a.ativo })),
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
