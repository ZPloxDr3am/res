'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import {
  CARDAPIO_EXEMPLO, DESCRICAO_EXEMPLO, UFS, VERSAO_TERMOS, cepValido, cnpjValido, cpfValido, dadosDaReceita, enderecoDoCep, slugValido, soDigitos, telefoneValido, tipoRestauranteValido,
  type DadosReceita, type EnderecoEmpresa, type TipoRestaurante,
} from '@res/core';
import { criarClienteServidor } from '@/lib/supabase/server';

export type DadosCadastro = {
  // responsável
  nome: string;
  email: string;
  senha: string;
  whatsapp: string;
  // empresa (D-077)
  semCnpj: boolean;
  documento: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  telefoneLoja: string;
  emailLoja: string;
  endereco: EnderecoEmpresa;
  // restaurante
  restaurante: string;
  tipo: string;
  slug: string;
  qtdLojas: string;
  sistemaAtual: string;
  pedidosDia: string;
  comoConheceu: string;
  exemplo: boolean;
  aceite: boolean;
};

/** Dados públicos do CNPJ (Receita Federal, pela BrasilAPI). null se não achar ou o serviço falhar: aí a pessoa digita. */
export async function consultarCnpj(cnpj: string): Promise<DadosReceita | null> {
  const d = soDigitos(cnpj);
  if (!cnpjValido(d)) return null;
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${d}`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    return dadosDaReceita((await r.json()) as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Endereço pelo CEP (BrasilAPI, com o ViaCEP de reserva). */
export async function consultarCep(cep: string): Promise<Omit<EnderecoEmpresa, 'numero' | 'complemento'> | null> {
  const d = soDigitos(cep);
  if (!cepValido(d)) return null;
  for (const url of [`https://brasilapi.com.br/api/cep/v2/${d}`, `https://viacep.com.br/ws/${d}/json/`]) {
    try {
      const r = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(6000) });
      if (!r.ok) continue;
      const j = (await r.json()) as Record<string, unknown>;
      if (j.erro) continue;
      const e = enderecoDoCep(j);
      if (e.cidade) return e;
    } catch {
      /* tenta o próximo */
    }
  }
  return null;
}

/** Endereço do cardápio livre? (confere enquanto a pessoa digita) */
export async function verificarSlug(slug: string): Promise<boolean> {
  if (!slugValido(slug)) return false;
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc('slug_disponivel', { p_slug: slug });
  return data === true;
}

/** Confere cada etapa (a tela usa a mesma regra para não deixar avançar). */
export async function conferirEtapa(d: DadosCadastro, etapa: 1 | 2 | 3): Promise<string | null> {
  if (etapa === 1) {
    if (d.nome.trim().split(/\s+/).length < 2) return 'Informe seu nome completo.';
    if (!telefoneValido(d.whatsapp)) return 'Seu celular/WhatsApp com DDD, por favor.';
    if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) return 'E-mail inválido.';
    if (d.senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
    return null;
  }
  if (etapa === 2) {
    if (d.semCnpj ? !cpfValido(d.documento) : !cnpjValido(d.documento)) return d.semCnpj ? 'CPF inválido.' : 'CNPJ inválido.';
    if (!d.semCnpj && d.razaoSocial.trim().length < 2) return 'Informe a razão social.';
    if (!telefoneValido(d.telefoneLoja)) return 'Telefone da loja com DDD, por favor.';
    if (d.emailLoja.trim() && !/^\S+@\S+\.\S+$/.test(d.emailLoja.trim())) return 'E-mail da loja inválido.';
    const e = d.endereco;
    if (!cepValido(e.cep)) return 'CEP inválido.';
    if (!e.logradouro.trim() || !e.bairro.trim() || !e.cidade.trim()) return 'Complete o endereço (rua, bairro e cidade).';
    if (!e.numero.trim()) return 'Informe o número (ou "s/n").';
    if (!(UFS as readonly string[]).includes(e.uf)) return 'Escolha a UF.';
    return null;
  }
  if (d.restaurante.trim().length < 2) return 'Informe o nome do restaurante no cardápio.';
  if (!tipoRestauranteValido(d.tipo)) return 'Escolha o tipo de restaurante.';
  if (!slugValido(d.slug)) return 'Endereço do cardápio: letras minúsculas, números e hífen (3 a 60).';
  if (!d.qtdLojas) return 'Quantas lojas você tem?';
  if (!d.aceite) return 'É preciso aceitar os Termos de Uso e a Política de Privacidade.';
  return null;
}

/** O que vai para o banco ao criar a loja (também guardado na conta, para quando o e-mail precisar ser confirmado antes). */
const pedidoDeLoja = (d: DadosCadastro) => ({
  restaurante: d.restaurante.trim(),
  slug: d.slug,
  nome: d.nome.trim(),
  whatsapp: soDigitos(d.whatsapp),
  tipo: d.tipo,
  exemplo: d.exemplo,
  aceite_versao: VERSAO_TERMOS,
  empresa: {
    documento: soDigitos(d.documento),
    razao_social: d.semCnpj ? '' : d.razaoSocial.trim(),
    nome_fantasia: d.nomeFantasia.trim() || d.restaurante.trim(),
    inscricao_estadual: d.semCnpj ? '' : d.inscricaoEstadual.trim(),
    telefone: soDigitos(d.telefoneLoja),
    email: d.emailLoja.trim().toLowerCase(),
    cep: soDigitos(d.endereco.cep),
    logradouro: d.endereco.logradouro.trim(),
    numero: d.endereco.numero.trim(),
    complemento: d.endereco.complemento.trim(),
    bairro: d.endereco.bairro.trim(),
    cidade: d.endereco.cidade.trim(),
    uf: d.endereco.uf,
    lat: d.endereco.lat ?? null,
    lng: d.endereco.lng ?? null,
  },
  comercial: { lojas: d.qtdLojas, sistema: d.sistemaAtual, pedidos_dia: d.pedidosDia, como_conheceu: d.comoConheceu },
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
  for (const etapa of [1, 2, 3] as const) {
    const erro = await conferirEtapa(d, etapa);
    if (erro) return { ok: false, erro };
  }
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
