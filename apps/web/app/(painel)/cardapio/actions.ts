'use server';
import { revalidatePath } from 'next/cache';
import { validarSetor, validarGrupo, type FormacaoPreco } from '@res/core';
import { criarClienteServidor } from '@/lib/supabase/server';
import { contextoLoja, lerReais } from '@/lib/loja';

export type Resultado = { ok: true } | { ok: false; erro: string };

const mensagem = (e: { message: string; code?: string } | null): string => {
  if (!e) return 'Erro desconhecido.';
  if (e.code === '42501' || /row-level security/.test(e.message)) return 'Você não tem permissão para alterar o cardápio.';
  return e.message;
};

export async function salvarSetor(form: FormData): Promise<Resultado> {
  const ctx = await contextoLoja();
  const dados = {
    nome: String(form.get('nome') ?? ''),
    nomePublico: String(form.get('nomePublico') ?? '') || null,
    delivery: form.get('delivery') === 'on',
    presencial: form.get('presencial') === 'on',
    marcas: form.getAll('marcas').map(String),
  };
  const erros = validarSetor(dados);
  if (erros.length) return { ok: false, erro: erros.join(' ') };

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_setor', {
    p_loja: ctx.lojaId,
    p_id: (form.get('id') as string) || null,
    p_nome: dados.nome.trim(),
    p_nome_publico: dados.nomePublico,
    p_delivery: dados.delivery,
    p_presencial: dados.presencial,
    p_marcas: dados.marcas,
  });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/cardapio');
  return { ok: true };
}

export async function excluirSetor(id: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from('setores').delete().eq('id', id);
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/cardapio');
  return { ok: true };
}

export async function criarProduto(form: FormData): Promise<Resultado> {
  const ctx = await contextoLoja();
  const nome = String(form.get('nome') ?? '').trim();
  if (!nome) return { ok: false, erro: 'Informe o nome do produto.' };
  let preco: number | null;
  try {
    preco = lerReais(form.get('preco'));
  } catch {
    return { ok: false, erro: 'Preço inválido.' };
  }
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('criar_produto', {
    p_loja: ctx.lojaId,
    p_nome: nome,
    p_setor: (form.get('setor') as string) || null,
    p_preco: preco,
    p_descricao: String(form.get('descricao') ?? '') || null,
    p_marcas: null, // R-008 / D-010: nasce em todas as marcas e canais
  });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/cardapio');
  return { ok: true };
}

export async function alterarDisponibilidade(
  produtoId: string,
  marcaId: string,
  campo: 'ativo' | 'delivery' | 'presencial' | 'totem',
  valor: boolean,
): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from('produto_marcas')
    .update({ [campo]: valor })
    .eq('produto_id', produtoId)
    .eq('marca_id', marcaId);
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/cardapio');
  return { ok: true };
}

export async function excluirProduto(id: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from('produtos').delete().eq('id', id);
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/cardapio');
  return { ok: true };
}

export interface NovoGrupo {
  produtoId: string;
  nome: string;
  formacao: FormacaoPreco;
  obrigatorio: boolean;
  minQtd: number;
  maxQtd: number;
  pizza: boolean;
  opcoes: { nome: string; preco: number | null }[];
}

/** Cria o grupo já vinculado ao produto, com as opções, numa transação (D-005). */
export async function criarGrupo(g: NovoGrupo): Promise<Resultado> {
  const erros = validarGrupo(g);
  if (erros.length) return { ok: false, erro: erros.map((e) => e.mensagem).join(' ') };
  if (g.opcoes.length === 0) return { ok: false, erro: 'Adicione pelo menos uma opção.' };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('criar_grupo_vinculado', {
    p_produto: g.produtoId,
    p_nome: g.nome.trim(),
    p_formacao: g.formacao,
    p_obrigatorio: g.obrigatorio,
    p_min: g.minQtd,
    p_max: g.maxQtd,
    p_pizza: g.pizza,
    p_opcoes: g.opcoes.map((o) => ({ nome: o.nome.trim(), preco: o.preco })),
  });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/cardapio');
  return { ok: true };
}
