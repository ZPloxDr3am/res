'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { CARDAPIO_EXEMPLO, DESCRICAO_EXEMPLO, VERSAO_TERMOS, slugValido, tipoRestauranteValido, type TipoRestaurante } from '@res/core';
import { criarClienteServidor } from '@/lib/supabase/server';

export type DadosCadastro = {
  nome: string;
  email: string;
  senha: string;
  whatsapp: string;
  restaurante: string;
  tipo: string;
  cidade: string;
  slug: string;
  exemplo: boolean;
  aceite: boolean;
};

/** Endereço do cardápio livre? (confere enquanto a pessoa digita) */
export async function verificarSlug(slug: string): Promise<boolean> {
  if (!slugValido(slug)) return false;
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc('slug_disponivel', { p_slug: slug });
  return data === true;
}

function conferir(d: DadosCadastro): string | null {
  if (d.nome.trim().length < 2) return 'Informe seu nome.';
  if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) return 'E-mail inválido.';
  if (d.senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  const zap = d.whatsapp.replace(/\D/g, '');
  if (zap.length < 10 || zap.length > 13) return 'WhatsApp com DDD, por favor.';
  if (d.restaurante.trim().length < 2) return 'Informe o nome do restaurante.';
  if (!tipoRestauranteValido(d.tipo)) return 'Escolha o tipo de restaurante.';
  if (d.cidade.trim().length < 2) return 'Informe a cidade.';
  if (!slugValido(d.slug)) return 'Endereço do cardápio: letras minúsculas, números e hífen (3 a 60).';
  if (!d.aceite) return 'É preciso aceitar os Termos de Uso e a Política de Privacidade.';
  return null;
}

/** O que vai para o banco ao criar a loja (também guardado na conta, para quando o e-mail precisar ser confirmado antes). */
const pedidoDeLoja = (d: DadosCadastro) => ({
  restaurante: d.restaurante.trim(),
  slug: d.slug,
  nome: d.nome.trim(),
  cidade: d.cidade.trim(),
  whatsapp: d.whatsapp,
  tipo: d.tipo,
  exemplo: d.exemplo,
  aceite_versao: VERSAO_TERMOS,
});
export type PedidoDeLoja = ReturnType<typeof pedidoDeLoja>;

/** Cria a loja do cadastro e, se pedido, o cardápio de exemplo. Usado aqui e depois da confirmação do e-mail. */
export async function montarLojaDoCadastro(p: PedidoDeLoja): Promise<{ ok: true } | { ok: false; erro: string }> {
  const supabase = await criarClienteServidor();
  const { data: loja, error } = await supabase.rpc('criar_loja_cadastro', { p });
  if (error) return { ok: false, erro: error.message.includes('marcas_slug_key') ? 'Esse endereço do cardápio acabou de ser usado. Escolha outro.' : error.message };
  if (p.exemplo && tipoRestauranteValido(p.tipo)) {
    const categorias = CARDAPIO_EXEMPLO[p.tipo as TipoRestaurante];
    await supabase.rpc('criar_cardapio_exemplo', { p_loja: loja as string, p: { descricao: DESCRICAO_EXEMPLO, categorias } });
  }
  await supabase.auth.updateUser({ data: { cadastro: null } });
  return { ok: true };
}

export async function cadastrarRestaurante(d: DadosCadastro): Promise<{ ok: false; erro: string }> {
  const erro = conferir(d);
  if (erro) return { ok: false, erro };
  if (!(await verificarSlug(d.slug))) return { ok: false, erro: 'Esse endereço do cardápio já está em uso. Escolha outro.' };

  const supabase = await criarClienteServidor();
  const origem = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const p = pedidoDeLoja(d);
  const { data, error } = await supabase.auth.signUp({
    email: d.email.trim().toLowerCase(),
    password: d.senha,
    options: { emailRedirectTo: `${origem}/auth/confirmar`, data: { nome: p.nome, cadastro: p } },
  });
  if (error) {
    return { ok: false, erro: /registered|already/i.test(error.message) ? 'Esse e-mail já tem conta no RES. Entre pelo login.' : error.message };
  }
  // e-mail já cadastrado (o Supabase não revela: devolve usuário sem identidade)
  if (data.user && (data.user.identities?.length ?? 0) === 0) return { ok: false, erro: 'Esse e-mail já tem conta no RES. Entre pelo login.' };

  if (data.session) {
    const r = await montarLojaDoCadastro(p);
    if (!r.ok) return r;
    redirect('/comecar');
  }
  redirect('/cadastro/confirme');
}
