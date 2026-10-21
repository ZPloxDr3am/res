'use server';
import { revalidatePath } from 'next/cache';
import { validarSetor, validarGrupo, type FormacaoPreco } from '@res/core';
import { criarClienteServidor } from '@/lib/supabase/server';
import { contextoLoja, lerReais } from '@/lib/loja';

export type Resultado = { ok: true } | { ok: false; erro: string };

const mensagem = (e: { message: string; code?: string } | null): string => {
  if (!e) return 'Erro desconhecido.';
  if (e.code === '42501' || /row-level security/.test(e.message)) return 'Você não tem permissão para alterar o cardápio.';
  if (/grupo_obrigatorio_min/.test(e.message)) return 'Grupo obrigatório precisa de mínimo 1 ou mais.';
  if (/grupo_max_ge_min/.test(e.message)) return 'O máximo não pode ser menor que o mínimo.';
  return e.message;
};

const pronto = (): Resultado => {
  revalidatePath('/cardapio');
  return { ok: true };
};

// ---------------------------------------------------------------- setores

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
  return error ? { ok: false, erro: mensagem(error) } : pronto();
}

export async function excluirSetor(id: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from('setores').delete().eq('id', id);
  return error ? { ok: false, erro: mensagem(error) } : pronto();
}

/** Sobe ou desce um item entre os irmãos (setores da loja, produtos do setor, opções não passam por aqui). */
export async function mover(tabela: 'setores' | 'produtos', id: string, direcao: -1 | 1): Promise<Resultado> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  let consulta = supabase.from(tabela).select('id, ordem').eq('loja_id', ctx.lojaId).order('ordem').order('nome');
  if (tabela === 'produtos') {
    const { data: atual } = await supabase.from('produtos').select('setor_id').eq('id', id).single();
    consulta = atual?.setor_id ? consulta.eq('setor_id', atual.setor_id) : consulta.is('setor_id', null);
  }
  const { data, error } = await consulta;
  if (error) return { ok: false, erro: mensagem(error) };
  const ids = (data ?? []).map((r) => r.id as string);
  const i = ids.indexOf(id);
  const j = i + direcao;
  if (i < 0 || j < 0 || j >= ids.length) return { ok: true };
  [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  const r = await supabase.rpc('reordenar', { p_tabela: tabela, p_ids: ids });
  return r.error ? { ok: false, erro: mensagem(r.error) } : pronto();
}

// ---------------------------------------------------------------- produtos

export async function criarProduto(form: FormData): Promise<Resultado & { id?: string }> {
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
  const { data, error } = await supabase.rpc('criar_produto', {
    p_loja: ctx.lojaId,
    p_nome: nome,
    p_setor: (form.get('setor') as string) || null,
    p_preco: preco,
    p_descricao: String(form.get('descricao') ?? '') || null,
    p_marcas: null, // R-008 / D-010: nasce em todas as marcas e canais
  });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/cardapio');
  return { ok: true, id: data as string };
}

const ETIQUETAS = ['novo', 'recomendado', 'mais_vendido', 'edicao_limitada', 'esgotado'];

/** Salva os dados do produto e os preços por marca (delivery, presencial, promocional). */
export async function salvarProduto(form: FormData): Promise<Resultado> {
  const id = String(form.get('id') ?? '');
  const nome = String(form.get('nome') ?? '').trim();
  if (!id) return { ok: false, erro: 'Produto não informado.' };
  if (!nome) return { ok: false, erro: 'Informe o nome do produto.' };
  const etiqueta = String(form.get('etiqueta') ?? '');
  try {
    const supabase = await criarClienteServidor();
    const { error } = await supabase
      .from('produtos')
      .update({
        nome,
        descricao: String(form.get('descricao') ?? '').trim() || null,
        setor_id: (form.get('setor') as string) || null,
        preco: lerReais(form.get('preco')),
        etiqueta: ETIQUETAS.includes(etiqueta) ? etiqueta : null,
      })
      .eq('id', id);
    if (error) return { ok: false, erro: mensagem(error) };

    for (const marca of form.getAll('marca').map(String)) {
      const r = await supabase
        .from('produto_marcas')
        .update({
          preco_delivery: lerReais(form.get(`preco_delivery_${marca}`)),
          preco_presencial: lerReais(form.get(`preco_presencial_${marca}`)),
          preco_promocional: lerReais(form.get(`preco_promocional_${marca}`)),
        })
        .eq('produto_id', id)
        .eq('marca_id', marca);
      if (r.error) return { ok: false, erro: mensagem(r.error) };
    }
  } catch {
    return { ok: false, erro: 'Há um preço inválido. Use o formato 49,90.' };
  }
  return pronto();
}

export async function definirFoto(produtoId: string, url: string | null): Promise<Resultado> {
  if (url && !/^https:\/\/[a-z0-9.-]+\/storage\/v1\/object\/public\/cardapio\//.test(url)) return { ok: false, erro: 'Endereço de foto inválido.' };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from('produtos').update({ imagem_url: url }).eq('id', produtoId);
  return error ? { ok: false, erro: mensagem(error) } : pronto();
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
  return error ? { ok: false, erro: mensagem(error) } : pronto();
}

export async function excluirProduto(id: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from('produtos').delete().eq('id', id);
  return error ? { ok: false, erro: mensagem(error) } : pronto();
}

// ---------------------------------------------------------------- grupos de opções

export interface DadosGrupo {
  /** Presente ao editar um grupo existente. */
  id?: string;
  /** Ao criar: liga o grupo novo a este produto. Sem ele, o grupo vai só para a biblioteca. */
  produtoId?: string;
  nome: string;
  formacao: FormacaoPreco;
  obrigatorio: boolean;
  minQtd: number;
  maxQtd: number;
  pizza: boolean;
  permiteRepetir: boolean;
  opcoes: { id?: string; nome: string; preco: number | null }[];
}

/** Cria (vinculado ao produto) ou salva o grupo com as opções, numa transação (D-005). */
export async function salvarGrupo(g: DadosGrupo): Promise<Resultado & { id?: string }> {
  const erros = validarGrupo(g);
  if (erros.length) return { ok: false, erro: erros.map((e) => e.mensagem).join(' ') };
  const opcoes = g.opcoes.filter((o) => o.nome.trim());
  if (opcoes.length === 0) return { ok: false, erro: 'Adicione pelo menos uma opção.' };
  const supabase = await criarClienteServidor();
  // cada opção pode ir até o máximo do grupo (a repetição é controlada por "permite repetir")
  const json = opcoes.map((o) => ({ ...(o.id ? { id: o.id } : {}), nome: o.nome.trim(), preco: o.preco, max_qtd: g.maxQtd }));
  const { data, error } = g.id
    ? await supabase.rpc('salvar_grupo', {
        p_grupo: g.id,
        p_nome: g.nome.trim(),
        p_formacao: g.formacao,
        p_obrigatorio: g.obrigatorio,
        p_min: g.minQtd,
        p_max: g.maxQtd,
        p_pizza: g.pizza,
        p_permite_repetir: g.permiteRepetir,
        p_opcoes: json,
      })
    : !g.produtoId
    ? await supabase.rpc('criar_grupo', {
        p_loja: (await contextoLoja()).lojaId,
        p_nome: g.nome.trim(),
        p_formacao: g.formacao,
        p_obrigatorio: g.obrigatorio,
        p_min: g.minQtd,
        p_max: g.maxQtd,
        p_pizza: g.pizza,
        p_permite_repetir: g.permiteRepetir,
        p_opcoes: json,
      })
    : await supabase.rpc('criar_grupo_vinculado', {
        p_produto: g.produtoId,
        p_nome: g.nome.trim(),
        p_formacao: g.formacao,
        p_obrigatorio: g.obrigatorio,
        p_min: g.minQtd,
        p_max: g.maxQtd,
        p_pizza: g.pizza,
        p_opcoes: json,
        p_permite_repetir: g.permiteRepetir,
      });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/cardapio');
  return { ok: true, id: g.id ?? (data as string) };
}

export async function vincularGrupo(produtoId: string, grupoId: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('vincular_grupo', { p_produto: produtoId, p_grupo: grupoId });
  return error ? { ok: false, erro: mensagem(error) } : pronto();
}

export async function desvincularGrupo(produtoId: string, grupoId: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('desvincular_grupo', { p_produto: produtoId, p_grupo: grupoId });
  return error ? { ok: false, erro: mensagem(error) } : pronto();
}

export async function excluirGrupo(id: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from('grupos_opcoes').delete().eq('id', id);
  return error ? { ok: false, erro: mensagem(error) } : pronto();
}

/** Grupos do produto, na ordem da lista (marca/desmarca e ordena de uma vez). */
export async function definirGruposDoProduto(produtoId: string, grupos: string[]): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('definir_grupos_do_produto', { p_produto: produtoId, p_grupos: grupos });
  return error ? { ok: false, erro: mensagem(error) } : pronto();
}

/** Aplica o grupo nos produtos marcados (e tira dos desmarcados). */
export async function definirProdutosDoGrupo(grupoId: string, produtos: string[]): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('definir_produtos_do_grupo', { p_grupo: grupoId, p_produtos: produtos });
  return error ? { ok: false, erro: mensagem(error) } : pronto();
}

export async function duplicarProduto(id: string): Promise<Resultado & { id?: string }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('duplicar_produto', { p_produto: id });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/cardapio');
  return { ok: true, id: data as string };
}

export async function duplicarSetor(id: string): Promise<Resultado & { id?: string }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('duplicar_setor', { p_setor: id });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/cardapio');
  return { ok: true, id: data as string };
}

export async function duplicarGrupo(id: string): Promise<Resultado & { id?: string }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('duplicar_grupo', { p_grupo: id });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/cardapio');
  return { ok: true, id: data as string };
}

// ---------------------------------------------------------------- importar de outra loja do grupo

export type CategoriaOrigem = { id: string; nome: string; produtos: string[] };

/** Categorias (com nomes dos produtos) e marcas de outra loja, para escolher o que importar. */
export async function listarCardapioDe(lojaId: string): Promise<{ ok: true; categorias: CategoriaOrigem[]; marcas: { id: string; nome: string }[] } | { ok: false; erro: string }> {
  const supabase = await criarClienteServidor();
  const [s, m] = await Promise.all([
    supabase.from('setores').select('id, nome, ordem, produtos(nome, ordem)').eq('loja_id', lojaId).order('ordem'),
    supabase.from('marcas').select('id, nome').eq('loja_id', lojaId).order('ordem'),
  ]);
  if (s.error) return { ok: false, erro: mensagem(s.error) };
  const categorias = (s.data ?? []).map((x) => ({
    id: x.id as string,
    nome: x.nome as string,
    produtos: ((x.produtos as { nome: string; ordem: number }[]) ?? []).sort((a, b) => a.ordem - b.ordem).map((p) => p.nome),
  }));
  return { ok: true, categorias, marcas: (m.data ?? []) as { id: string; nome: string }[] };
}

export async function importarDe(
  origem: string,
  setores: string[] | null,
  marcaOrigem: string | null,
): Promise<{ ok: true; categorias: number; produtos: number; grupos: number; renomeados: number } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('importar_cardapio', { p_origem: origem, p_destino: ctx.lojaId, p_setores: setores, p_marca_origem: marcaOrigem });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/cardapio');
  return { ok: true, ...(data as { categorias: number; produtos: number; grupos: number; renomeados: number }) };
}

// ---------------------------------------------------------------- organizar (ordem e categorias)

/** Salva de uma vez a ordem das categorias e, para cada produto, a categoria e a posição. */
export async function organizarCardapio(
  setores: string[],
  produtos: { id: string; setor: string | null }[],
): Promise<{ ok: true; categorias: number; produtos: number; movidos: number } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('organizar_cardapio', { p_loja: ctx.lojaId, p_setores: setores, p_produtos: produtos });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/cardapio');
  revalidatePath('/cardapio/organizar');
  return { ok: true, ...(data as { categorias: number; produtos: number; movidos: number }) };
}

/** Leva um ou mais produtos para outra categoria (null = sem categoria), no fim da lista dela. */
export async function moverProdutos(ids: string[], setor: string | null): Promise<Resultado> {
  if (!ids.length) return { ok: true };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('mover_produtos', { p_produtos: ids, p_setor: setor });
  return error ? { ok: false, erro: mensagem(error) } : pronto();
}
