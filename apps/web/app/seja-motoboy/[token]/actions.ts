'use server';
import { DOMINIO_USUARIOS, normalizarUsuario, validarSenha, validarUsuario } from '@res/core';
import { clienteAdmin } from '@/lib/supabase/admin';

/** Cadastro do motoboy pelo link da loja (D-104): cria a conta de login dele e o pedido para o gerente aprovar. */
export async function cadastrarMotoboy(token: string, form: FormData): Promise<{ ok: true } | { ok: false; erro: string }> {
  const usuario = normalizarUsuario(String(form.get('usuario') ?? ''));
  const senha = String(form.get('senha') ?? '');
  const nome = String(form.get('nome') ?? '').trim();
  const telefone = String(form.get('telefone') ?? '').replace(/\D/g, '');
  const erro = validarUsuario(usuario) ?? validarSenha(senha);
  if (erro) return { ok: false, erro };
  if (nome.length < 2) return { ok: false, erro: 'Digite seu nome.' };
  if (telefone.length < 10 || telefone.length > 13) return { ok: false, erro: 'Digite seu WhatsApp com DDD.' };
  if (String(form.get('aceite') ?? '') !== 'sim') return { ok: false, erro: 'Para continuar, aceite que a loja guarde seus dados para as entregas.' };
  const admin = clienteAdmin();
  if (!admin) return { ok: false, erro: 'Cadastro indisponível agora. Fale com a loja.' };
  const { data: info } = await admin.rpc('motoboy_link_info', { p_token: token });
  if (!info) return { ok: false, erro: 'Link de cadastro inválido. Peça o link novo para a loja.' };
  const criado = await admin.auth.admin.createUser({ email: `${usuario}@${DOMINIO_USUARIOS}`, password: senha, email_confirm: true, user_metadata: { usuario, nome } });
  if (criado.error || !criado.data.user) {
    const m = criado.error?.message ?? '';
    return { ok: false, erro: /already|registered|exists/i.test(m) ? 'Esse usuário já existe. Escolha outro.' : 'Não consegui criar o seu acesso. Tente de novo.' };
  }
  const { error } = await admin.rpc('motoboy_solicitar', {
    p_token: token,
    p_user: criado.data.user.id,
    p_usuario: usuario,
    p_nome: nome,
    p_telefone: telefone,
    p_veiculo: String(form.get('veiculo') ?? '').slice(0, 40),
    p_placa: String(form.get('placa') ?? '').slice(0, 10),
    p_pix: String(form.get('pix') ?? '').slice(0, 120),
  });
  if (error) {
    await admin.auth.admin.deleteUser(criado.data.user.id);
    return { ok: false, erro: error.message };
  }
  return { ok: true };
}
