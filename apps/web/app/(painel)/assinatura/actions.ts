'use server';
import { revalidatePath } from 'next/cache';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { pixDaFatura, situacaoFatura, type PixFatura } from '@/lib/cobranca';

type R = { ok: true } | { ok: false; erro: string };
const falha = (e: { message: string } | null): R => (e ? { ok: false, erro: e.message } : { ok: true });

export async function escolherPlano(plano: string): Promise<R> {
  const ctx = await contextoLoja();
  const { error } = await (await criarClienteServidor()).rpc('escolher_plano', { p_loja: ctx.lojaId, p_plano: plano });
  revalidatePath('/', 'layout');
  return falha(error);
}

export async function contratarAdicional(modulo: string, ligar: boolean): Promise<R> {
  const ctx = await contextoLoja();
  const { error } = await (await criarClienteServidor()).rpc('contratar_adicional', { p_loja: ctx.lojaId, p_modulo: modulo, p_ligar: ligar });
  revalidatePath('/', 'layout');
  return falha(error);
}

export async function gerarFatura(): Promise<R> {
  const ctx = await contextoLoja();
  const { error } = await (await criarClienteServidor()).rpc('gerar_minha_fatura', { p_loja: ctx.lojaId });
  revalidatePath('/assinatura');
  return falha(error);
}

/** Só o titular vê a fatura (RLS); com isso confirmado, o servidor gera o Pix na conta do RES. */
async function minhaFatura(id: string) {
  const { data } = await (await criarClienteServidor()).from('faturas_res').select('id').eq('id', id).maybeSingle();
  return !!data;
}

export async function pagarFatura(id: string): Promise<PixFatura> {
  if (!(await minhaFatura(id))) return { estado: 'erro', mensagem: 'Fatura não encontrada.' };
  return pixDaFatura(id);
}

export async function conferirFatura(id: string): Promise<'paga' | 'aguardando'> {
  if (!(await minhaFatura(id))) return 'aguardando';
  const s = await situacaoFatura(id);
  if (s === 'paga') revalidatePath('/', 'layout');
  return s;
}

export async function definirCiclo(ciclo: 'mensal' | 'anual'): Promise<R> {
  const ctx = await contextoLoja();
  const { error } = await (await criarClienteServidor()).rpc('definir_ciclo', { p_loja: ctx.lojaId, p_ciclo: ciclo });
  revalidatePath('/assinatura');
  return falha(error);
}

export async function contratarAparelhos(modulo: string, qtd: number): Promise<R> {
  const ctx = await contextoLoja();
  const { error } = await (await criarClienteServidor()).rpc('contratar_aparelhos', { p_loja: ctx.lojaId, p_modulo: modulo, p_qtd: Math.max(0, Math.round(qtd)) });
  revalidatePath('/assinatura');
  return falha(error);
}
