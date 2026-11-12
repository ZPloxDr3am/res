'use server';
import { revalidatePath } from 'next/cache';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { Segmento } from '@res/core';
import type { ClienteBusca, ClienteExportado, ListagemClientes } from '@/lib/clientes';

/** Busca por telefone (4+ dígitos) ou nome (2+ letras); vazio = os mais recentes. */
export async function buscarClientes(termo: string, limite = 8): Promise<ClienteBusca[]> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('buscar_clientes', { p_loja: ctx.lojaId, p_termo: termo, p_limite: limite });
  if (error) return [];
  return (data as ClienteBusca[]) ?? [];
}

export async function salvarCliente(id: string, nome: string, observacoes: string, removerEnderecos: string[] = []): Promise<{ ok: true } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_cliente', { p_loja: ctx.lojaId, p_cliente: id, p_nome: nome, p_observacoes: observacoes, p_remover_enderecos: removerEnderecos });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/clientes');
  return { ok: true };
}

/** Tela Clientes (D-029): contagem por segmento + página da lista (filtro por segmento e busca). */
export async function listarClientes(segmento: Segmento | null, termo = '', offset = 0): Promise<ListagemClientes | null> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('listar_clientes', { p_loja: ctx.lojaId, p_segmento: segmento, p_termo: termo, p_limite: 50, p_offset: offset });
  return error ? null : (data as ListagemClientes);
}

/** Lista completa do segmento para campanhas (SMS, Meta/Google Ads). */
export async function exportarClientes(segmento: Segmento | null): Promise<{ ok: true; clientes: ClienteExportado[] } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('exportar_clientes', { p_loja: ctx.lojaId, p_segmento: segmento });
  if (error) return { ok: false, erro: error.message };
  return { ok: true, clientes: (data as ClienteExportado[]) ?? [] };
}

/** LGPD (D-092): cópia dos dados do cliente (dono/gerente). */
export async function dadosDoCliente(clienteId: string): Promise<{ ok: true; dados: unknown } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const { data, error } = await (await criarClienteServidor()).rpc('dados_do_cliente', { p_loja: ctx.lojaId, p_cliente: clienteId });
  return error ? { ok: false, erro: error.message } : { ok: true, dados: data };
}

/** LGPD (D-092): apaga os dados do cliente em todas as lojas do grupo. */
export async function apagarDadosCliente(clienteId: string, confirmacao: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const { error } = await (await criarClienteServidor()).rpc('apagar_dados_cliente', { p_loja: ctx.lojaId, p_cliente: clienteId, p_confirmacao: confirmacao });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/clientes');
  return { ok: true };
}

/** Perfil do cliente (D-096): gasto, ticket, intervalo, favoritos, dia/hora e canal preferidos. */
export async function perfilCliente(clienteId: string): Promise<Record<string, unknown> | null> {
  const ctx = await contextoLoja();
  const { data } = await (await criarClienteServidor()).rpc('turbo_perfil', { p_loja: ctx.lojaId, p_cliente: clienteId });
  return (data as Record<string, unknown> | null) ?? null;
}
