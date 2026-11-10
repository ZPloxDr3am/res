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

// D-085: planos, módulos e faturas
async function rpc(nome: string, args: Record<string, unknown>): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc(nome, args);
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/empresa', 'layout');
  return { ok: true };
}
export const ajustarContaPlano = async (conta: string, plano: string | null, modulo: string | null, estado: string | null) =>
  rpc('ajustar_conta_plano', { p_conta: conta, p_plano: plano, p_modulo: modulo, p_estado: estado });
export const salvarPlano = async (p: { id: string; nome: string; descricao: string; preco: number; modulos: string[]; ativo: boolean; incluidos: Record<string, number> }) =>
  rpc('salvar_plano', { p_id: p.id, p_nome: p.nome, p_descricao: p.descricao, p_preco: p.preco, p_modulos: p.modulos, p_ativo: p.ativo, p_incluidos: p.incluidos });
export const salvarDescontoAnual = async (pct: number) => rpc('definir_desconto_anual', { p_pct: pct });
export const salvarPrecoModulo = async (modulo: string, preco: number) => rpc('salvar_preco_modulo', { p_modulo: modulo, p_preco: preco });
export const acaoFatura = async (fatura: string, acao: 'pagar' | 'cancelar', nota: string | null) => rpc('fatura_acao', { p_fatura: fatura, p_acao: acao, p_nota: nota });
export const gerarFaturaPara = async (conta: string) => rpc('fatura_gerar_para', { p_conta: conta });
