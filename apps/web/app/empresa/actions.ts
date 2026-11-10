'use server';
import { revalidatePath } from 'next/cache';
import { criarClienteServidor } from '@/lib/supabase/server';

type R = { ok: true } | { ok: false; erro: string };

export async function criarConvite(nota: string, diasTeste: number): Promise<({ ok: true; codigo: string }) | { ok: false; erro: string }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('criar_convite', { p_nota: nota, p_dias_teste: diasTeste, p_validade_dias: 30 });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/empresa', 'layout');
  return { ok: true, codigo: String(data) };
}

export async function cancelarConvite(codigo: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('cancelar_convite', { p_codigo: codigo });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/empresa', 'layout');
  return { ok: true };
}

export async function mudarSituacao(conta: string, acao: 'ativar' | 'estender_teste' | 'suspender', dias: number | null, nota: string | null): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('mudar_situacao_conta', { p_conta: conta, p_acao: acao, p_dias: dias, p_nota: nota });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/empresa', 'layout');
  return { ok: true };
}

export async function definirModo(modo: 'convite' | 'aberto'): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('definir_cadastro_modo', { p_modo: modo });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/empresa', 'layout');
  return { ok: true };
}

export async function adicionarEquipe(email: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('equipe_res_adicionar', { p_email: email });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/empresa', 'layout');
  return { ok: true };
}

export async function removerEquipe(userId: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('equipe_res_remover', { p_user: userId });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/empresa', 'layout');
  return { ok: true };
}
