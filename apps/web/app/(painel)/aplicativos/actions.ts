'use server';
import { revalidatePath } from 'next/cache';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { TipoIntegracao } from '@/lib/aplicativos';

type R<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

export async function salvarIntegracao(tipo: TipoIntegracao, ativo: boolean, config: Record<string, string | null>, todas: boolean): Promise<R<{ lojas: number }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('salvar_integracao', { p_loja: ctx.lojaId, p_tipo: tipo, p_ativo: ativo, p_config: config, p_todas: todas });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/aplicativos');
  return { ok: true, lojas: data as number };
}

export async function removerIntegracao(tipo: TipoIntegracao): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('remover_integracao', { p_loja: ctx.lojaId, p_tipo: tipo });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/aplicativos');
  return { ok: true };
}

export async function salvarLinkGrupo(link: string): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_link_grupo', { p_loja: ctx.lojaId, p_link: link });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/aplicativos');
  return { ok: true };
}

// ---- API aberta, webhooks e MCP (D-043)
export async function criarChaveApi(nome: string, escopos: string[]): Promise<R<{ chave: string }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('criar_chave_api', { p_loja: ctx.lojaId, p_nome: nome, p_escopos: escopos });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/aplicativos');
  return { ok: true, chave: (data as { chave: string }).chave };
}

export async function revogarChaveApi(id: string): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('revogar_chave_api', { p_loja: ctx.lojaId, p_id: id });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/aplicativos');
  return { ok: true };
}

export async function salvarWebhook(id: string | null, url: string, eventos: string[], ativo: boolean): Promise<R<{ segredo?: string }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('salvar_webhook', { p_loja: ctx.lojaId, p_id: id, p_url: url, p_eventos: eventos, p_ativo: ativo });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/aplicativos');
  return { ok: true, segredo: (data as { segredo?: string }).segredo };
}

export async function excluirWebhook(id: string): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('excluir_webhook', { p_loja: ctx.lojaId, p_id: id });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/aplicativos');
  return { ok: true };
}

export async function testarWebhook(id: string): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('testar_webhook', { p_loja: ctx.lojaId, p_id: id });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/aplicativos');
  return { ok: true };
}

// ---- Mercado Pago (D-044)
export async function conectarMercadoPago(token: string): Promise<R<{ apelido: string | null }>> {
  const t = token.trim();
  if (!/^APP_USR-[A-Za-z0-9_-]{20,}$/.test(t)) return { ok: false, erro: 'Use o Access Token de produção: começa com APP_USR-.' };
  const { contaDoToken } = await import('@/lib/mercadopago');
  const conta = await contaDoToken(t);
  if (!conta) return { ok: false, erro: 'O Mercado Pago não aceitou esse token. Confira se copiou o Access Token de produção inteiro.' };
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_mp', { p_loja: ctx.lojaId, p_token: t, p_email: conta.email, p_user_id: conta.id, p_apelido: conta.apelido });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/aplicativos');
  return { ok: true, apelido: conta.apelido };
}

export async function desconectarMercadoPago(): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('desconectar_mp', { p_loja: ctx.lojaId });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/aplicativos');
  return { ok: true };
}

export async function mpAceitarAoPagar(ligado: boolean): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('mp_aceitar_ao_pagar', { p_loja: ctx.lojaId, p_ligado: ligado });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/aplicativos');
  return { ok: true };
}
