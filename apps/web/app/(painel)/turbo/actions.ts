'use server';
import { revalidatePath } from 'next/cache';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { enviarModeloParaMeta, processarFila, sincronizarModelos, verificarNumero } from '@/lib/whatsapp';

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

export async function criarCampanha(c: { nome: string; publico: Record<string, unknown>; mensagem: string; cupom: string; janela: number; quando: string | null; modelo?: string | null }): Promise<{ ok: true; gerados: number } | { ok: false; erro: string }> {
  const r = await rpc<number>('turbo_criar_campanha', { p_nome: c.nome, p_publico: c.publico, p_mensagem: c.mensagem, p_cupom: c.cupom || null, p_janela: c.janela, p_quando: c.quando, p_modelo: c.modelo || null });
  revalidatePath('/turbo');
  return r.ok ? { ok: true, gerados: Number(r.data) } : r;
}

export async function cancelarCampanha(id: string): Promise<R> {
  const r = await rpc('turbo_cancelar_campanha', { p_campanha: id });
  revalidatePath('/turbo');
  return r.ok ? { ok: true } : r;
}

// ---- WhatsApp oficial (D-097)

type StatusWa = { conectado: boolean; modelos: { id: string; nome: string; categoria: string; corpo: string; status: string }[] };
/** Lê o status com o login da pessoa (confere permissão e plano antes de usar a chave de serviço). */
async function statusWa(): Promise<{ ok: true; lojaId: string; s: StatusWa } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const { data, error } = await (await criarClienteServidor()).rpc('whatsapp_status', { p_loja: ctx.lojaId });
  return error ? { ok: false, erro: error.message } : { ok: true, lojaId: ctx.lojaId, s: data as StatusWa };
}

export async function whatsappConectar(phoneId: string, wabaId: string, token: string): Promise<R> {
  const p = phoneId.replace(/\D/g, '');
  const w = wabaId.replace(/\D/g, '');
  const t = token.trim();
  if (!p || !w || t.length < 20) return { ok: false, erro: 'Preencha o ID do número, o ID da conta e o token.' };
  const v = await verificarNumero(p, t);
  if (!v.ok) return { ok: false, erro: `A Meta recusou: ${v.erro}` };
  const r = await rpc('whatsapp_conectar', { p_phone_id: p, p_waba_id: w, p_token: t, p_numero: v.data.display_phone_number ?? null, p_nome: v.data.verified_name ?? null, p_qualidade: v.data.quality_rating ?? null });
  revalidatePath('/turbo');
  return r.ok ? { ok: true } : r;
}

export async function whatsappDesconectar(): Promise<R> {
  const r = await rpc('whatsapp_desconectar', {});
  revalidatePath('/turbo');
  return r.ok ? { ok: true } : r;
}

export async function whatsappAutomatico(ligado: boolean): Promise<R> {
  const r = await rpc('whatsapp_definir_automatico', { p_ligado: ligado });
  revalidatePath('/turbo');
  return r.ok ? { ok: true } : r;
}

export async function whatsappSalvarModelo(nome: string, categoria: string, corpo: string): Promise<R> {
  const r = await rpc('whatsapp_salvar_modelo', { p_nome: nome, p_categoria: categoria, p_corpo: corpo });
  revalidatePath('/turbo');
  return r.ok ? { ok: true } : r;
}

export async function whatsappApagarModelo(id: string): Promise<R> {
  const r = await rpc('whatsapp_apagar_modelo', { p_modelo: id });
  revalidatePath('/turbo');
  return r.ok ? { ok: true } : r;
}

export async function whatsappEnviarModelo(id: string): Promise<R> {
  const st = await statusWa();
  if (!st.ok) return st;
  const m = st.s.modelos.find((x) => x.id === id);
  if (!m) return { ok: false, erro: 'Modelo não encontrado.' };
  const r = await enviarModeloParaMeta(st.lojaId, m);
  revalidatePath('/turbo');
  return r.ok ? { ok: true } : { ok: false, erro: r.erro };
}

export async function whatsappSincronizar(): Promise<R> {
  const st = await statusWa();
  if (!st.ok) return st;
  const r = await sincronizarModelos(st.lojaId, st.s.modelos);
  revalidatePath('/turbo');
  return r.ok ? { ok: true } : { ok: false, erro: r.erro };
}

export async function definirModelo(tipo: 'automacao' | 'campanha', id: string, modelo: string | null): Promise<R> {
  const r = await rpc('turbo_definir_modelo', { p_tipo: tipo, p_id: id, p_modelo: modelo });
  revalidatePath('/turbo');
  return r.ok ? { ok: true } : r;
}

export async function enviarTudo(): Promise<{ ok: true; enviados: number; falhas: number } | { ok: false; erro: string }> {
  const st = await statusWa();
  if (!st.ok) return st;
  if (!st.s.conectado) return { ok: false, erro: 'Conecte o WhatsApp oficial primeiro.' };
  const r = await processarFila(st.lojaId, 100);
  revalidatePath('/turbo');
  return r.erro ? { ok: false, erro: r.erro } : { ok: true, enviados: r.enviados, falhas: r.falhas };
}
