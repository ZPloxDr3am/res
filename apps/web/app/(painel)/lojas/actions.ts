'use server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DOMINIO_USUARIOS, normalizarUsuario, validarSenha, validarUsuario } from '@res/core';
import { criarClienteServidor } from '@/lib/supabase/server';
import { clienteAdmin, SEM_CHAVE_ADMIN } from '@/lib/supabase/admin';

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
  const copiarDe = String(form.get('copiarDe') ?? '');
  const supabase = await criarClienteServidor();
  const { data: novaLoja, error } = await supabase.rpc('criar_loja_na_conta', { p_conta: contaId, p_nome: nome, p_marca: marca, p_slug: slug });
  if (error) return { ok: false, erro: msg(error.message) };
  if (copiarDe) {
    const imp = await supabase.rpc('importar_cardapio', { p_origem: copiarDe, p_destino: novaLoja as string });
    revalidatePath('/', 'layout');
    if (imp.error) return { ok: false, erro: `A loja foi criada, mas o cardápio não foi copiado: ${imp.error.message}` };
  }
  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function criarCardapio(lojaId: string, form: FormData): Promise<R> {
  const nome = String(form.get('nome') ?? '').trim();
  const slug = String(form.get('slug') ?? '').trim().toLowerCase();
  if (!nome) return { ok: false, erro: 'Informe o nome do cardápio (marca).' };
  if (!SLUG.test(slug)) return { ok: false, erro: 'Endereço: letras minúsculas, números e hífen (3 a 60).' };
  const base = String(form.get('base') ?? '');
  const supabase = await criarClienteServidor();
  const { data: nova, error } = await supabase.rpc('criar_marca', { p_loja: lojaId, p_nome: nome, p_slug: slug });
  if (error) return { ok: false, erro: msg(error.message) };
  if (base) {
    const c = await supabase.rpc('compartilhar_catalogo', { p_marca_nova: nova as string, p_marca_base: base });
    revalidatePath('/', 'layout');
    if (c.error) return { ok: false, erro: `O cardápio foi criado, mas não recebeu os produtos: ${c.error.message}` };
  }
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

/**
 * Cria um usuário de caixa (login por usuário e senha, sem e-mail). O Auth recebe um e-mail interno
 * (<usuario>@equipe.res.invalid) já confirmado; o banco confere a permissão "equipe" e registra a pessoa.
 */
export async function criarUsuarioCaixa(lojaId: string, form: FormData): Promise<{ ok: true; membroId?: string } | { ok: false; erro: string }> {
  const usuario = normalizarUsuario(String(form.get('usuario') ?? ''));
  const senha = String(form.get('senha') ?? '');
  const nome = String(form.get('nome') ?? '').trim();
  const papel = String(form.get('papel') ?? 'funcionario');
  const erroU = validarUsuario(usuario) ?? validarSenha(senha);
  if (erroU) return { ok: false, erro: erroU };
  if (!nome) return { ok: false, erro: 'Informe o nome da pessoa.' };
  if (!['gerente', 'funcionario', 'garcom', 'entregador'].includes(papel)) return { ok: false, erro: 'Função inválida.' };

  const supabase = await criarClienteServidor();
  // confere a permissão antes de criar qualquer conta no Auth (o banco confere de novo ao registrar)
  const { data: pode } = await supabase.rpc('posso', { p_loja: lojaId, p_recurso: 'equipe' });
  if (!pode) return { ok: false, erro: 'Você não tem permissão para criar usuários nesta loja.' };
  const admin = clienteAdmin();
  if (!admin) return { ok: false, erro: SEM_CHAVE_ADMIN };

  const criado = await admin.auth.admin.createUser({
    email: `${usuario}@${DOMINIO_USUARIOS}`,
    password: senha,
    email_confirm: true,
    user_metadata: { usuario, nome },
  });
  if (criado.error || !criado.data.user) {
    const m = criado.error?.message ?? '';
    return { ok: false, erro: /already|registered|exists/i.test(m) ? 'Esse usuário já existe. Escolha outro.' : `Não foi possível criar o usuário: ${m}` };
  }
  const { data: membroId, error } = await supabase.rpc('registrar_usuario_caixa', {
    p_loja: lojaId, p_user: criado.data.user.id, p_usuario: usuario, p_nome: nome, p_papel: papel,
  });
  if (error) {
    await admin.auth.admin.deleteUser(criado.data.user.id); // não deixa conta solta no Auth
    return { ok: false, erro: error.message };
  }
  revalidatePath('/lojas');
  revalidatePath('/caixa');
  return { ok: true, membroId: (membroId as string | null) ?? undefined };
}

/** Troca a senha de um usuário de caixa desta loja (quem cuida da equipe). */
export async function trocarSenhaUsuario(lojaId: string, userId: string, senha: string): Promise<R> {
  const erro = validarSenha(senha);
  if (erro) return { ok: false, erro };
  const supabase = await criarClienteServidor();
  const { data: pode, error } = await supabase.rpc('pode_gerir_usuario', { p_loja: lojaId, p_user: userId });
  if (error) return { ok: false, erro: error.message };
  if (!pode) return { ok: false, erro: 'Você só pode trocar a senha de usuários de caixa criados nesta loja.' };
  const admin = clienteAdmin();
  if (!admin) return { ok: false, erro: SEM_CHAVE_ADMIN };
  const r = await admin.auth.admin.updateUserById(userId, { password: senha });
  if (r.error) return { ok: false, erro: r.error.message };
  return { ok: true };
}

/** Cidade da loja: completa o endereço que o motoboy abre no Google Maps. */
export async function definirCidade(lojaId: string, cidade: string): Promise<R> {
  const c = cidade.trim();
  if (c && (c.length < 2 || c.length > 80)) return { ok: false, erro: 'Cidade com 2 a 80 letras (ex.: Itapema - SC).' };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from('lojas').update({ cidade: c || null }).eq('id', lojaId).select('id');
  if (error) return { ok: false, erro: error.message };
  if (!data?.length) return { ok: false, erro: 'Só quem cuida dos dados da empresa pode mudar a cidade.' };
  revalidatePath('/lojas');
  return { ok: true };
}

/** Muda a função de alguém da equipe (o banco confere: só dono/gerente; gerente só o dono cria). */
export async function alterarFuncao(membroId: string, papel: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('alterar_funcao_membro', { p_membro: membroId, p_papel: papel });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/lojas');
  return { ok: true };
}

/** O que o Caixa / Atendente pode fazer nesta loja. */
export async function salvarPermissoesEquipe(lojaId: string, permissoes: string[]): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_permissoes_equipe', { p_loja: lojaId, p_permissoes: permissoes });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/lojas');
  return { ok: true };
}
