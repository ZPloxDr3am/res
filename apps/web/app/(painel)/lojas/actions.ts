'use server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';

type R = { ok: true } | { ok: false; erro: string };
const SLUG = /^[a-z0-9]([a-z0-9-]{1,58}[a-z0-9])?$/;
const msg = (m: string) => (/marcas_slug_key/.test(m) ? 'Esse endereço de cardápio já está em uso. Escolha outro.' : /convites_pendentes_idx/.test(m) ? 'Já existe um convite pendente para esse e-mail nesta loja.' : m);

/** Troca a loja ativa do painel (fica salva neste navegador). */
export async function trocarLoja(lojaId: string, voltarPara: string) {
  (await cookies()).set('res_loja', lojaId, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', httpOnly: true, secure: true });
  redirect(voltarPara.startsWith('/') ? voltarPara : '/pedidos');
}

export async function criarLoja(contaId: string, form: FormData): Promise<R> {
  const nome = String(form.get('nome') ?? '').trim();
  const marca = String(form.get('marca') ?? '').trim();
  const slug = String(form.get('slug') ?? '').trim().toLowerCase();
  if (!nome || !marca) return { ok: false, erro: 'Informe o nome da loja e do primeiro cardápio.' };
  if (!SLUG.test(slug)) return { ok: false, erro: 'Endereço: letras minúsculas, números e hífen (3 a 60).' };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('criar_loja_na_conta', { p_conta: contaId, p_nome: nome, p_marca: marca, p_slug: slug });
  if (error) return { ok: false, erro: msg(error.message) };
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function criarCardapio(lojaId: string, form: FormData): Promise<R> {
  const nome = String(form.get('nome') ?? '').trim();
  const slug = String(form.get('slug') ?? '').trim().toLowerCase();
  if (!nome) return { ok: false, erro: 'Informe o nome do cardápio (marca).' };
  if (!SLUG.test(slug)) return { ok: false, erro: 'Endereço: letras minúsculas, números e hífen (3 a 60).' };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('criar_marca', { p_loja: lojaId, p_nome: nome, p_slug: slug });
  if (error) return { ok: false, erro: msg(error.message) };
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function convidar(lojaId: string, form: FormData): Promise<R> {
  const email = String(form.get('email') ?? '').trim();
  const nome = String(form.get('nome') ?? '').trim();
  const papel = String(form.get('papel') ?? 'funcionario');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, erro: 'E-mail inválido.' };
  if (!nome) return { ok: false, erro: 'Informe o nome da pessoa.' };
  if (!['gerente', 'funcionario', 'garcom', 'entregador'].includes(papel)) return { ok: false, erro: 'Função inválida.' };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('convidar', { p_loja: lojaId, p_email: email, p_nome: nome, p_papel: papel });
  if (error) return { ok: false, erro: msg(error.message) };
  revalidatePath('/lojas');
  return { ok: true };
}

export async function cancelarConvite(id: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from('convites').delete().eq('id', id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/lojas');
  return { ok: true };
}

export async function definirAtivo(membroId: string, ativo: boolean): Promise<R> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from('membros').update({ ativo }).eq('id', membroId).select('id');
  if (error) return { ok: false, erro: /dono/.test(error.message) ? 'A loja precisa de pelo menos um dono ativo.' : error.message };
  if (!data?.length) return { ok: false, erro: 'Você não tem permissão para mexer na equipe desta loja.' };
  revalidatePath('/lojas');
  return { ok: true };
}
