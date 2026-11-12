'use server';
import { revalidatePath } from 'next/cache';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';

type R = { ok: true } | { ok: false; erro: string };

async function rpc<T = unknown>(nome: string, args: Record<string, unknown>): Promise<{ ok: true; data: T } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const { data, error } = await (await criarClienteServidor()).rpc(nome, { p_loja: ctx.lojaId, ...args });
  return error ? { ok: false, erro: error.message } : { ok: true, data: data as T };
}

export async function marcarEnvio(envio: string, acao: 'enviado' | 'pular' | 'sair'): Promise<R> {
  const r = await rpc('turbo_marcar', { p_envio: envio, p_acao: acao });
  return r.ok ? { ok: true } : r;
}

export async function salvarAutomacao(a: { tipo: string; ativo: boolean; mensagem: string; cupom: string; config: Record<string, number> }): Promise<R> {
  const r = await rpc('turbo_salvar_automacao', { p_tipo: a.tipo, p_ativo: a.ativo, p_mensagem: a.mensagem, p_cupom: a.cupom || null, p_config: a.config });
  revalidatePath('/turbo');
  return r.ok ? { ok: true } : r;
}

export async function contarPublico(publico: Record<string, unknown>): Promise<number | null> {
  const r = await rpc<number>('turbo_publico_contar', { p_publico: publico });
  return r.ok ? Number(r.data) : null;
}

export async function criarCampanha(c: { nome: string; publico: Record<string, unknown>; mensagem: string; cupom: string; janela: number; quando: string | null }): Promise<{ ok: true; gerados: number } | { ok: false; erro: string }> {
  const r = await rpc<number>('turbo_criar_campanha', { p_nome: c.nome, p_publico: c.publico, p_mensagem: c.mensagem, p_cupom: c.cupom || null, p_janela: c.janela, p_quando: c.quando });
  revalidatePath('/turbo');
  return r.ok ? { ok: true, gerados: Number(r.data) } : r;
}

export async function cancelarCampanha(id: string): Promise<R> {
  const r = await rpc('turbo_cancelar_campanha', { p_campanha: id });
  revalidatePath('/turbo');
  return r.ok ? { ok: true } : r;
}
