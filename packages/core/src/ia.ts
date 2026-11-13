// Inteligência artificial (D-107): o que a IA devolve passa por aqui antes de chegar na tela.
// A IA erra e inventa: tudo é limpo, limitado e conferido contra o que existe na loja; nada é gravado sem o dono revisar.
import type { UnidadeEstoque } from './estoque.js';

// ───────────────────────────── cardápio por foto, PDF ou link ─────────────────────────────

export type ProdutoLido = { nome: string; descricao: string | null; /** centavos */ preco: number | null };
export type CategoriaLida = { nome: string; produtos: ProdutoLido[] };

/** Ferramenta (tool) que obriga a IA a devolver o cardápio neste formato. */
export const FERRAMENTA_CARDAPIO = {
  name: 'registrar_cardapio',
  description: 'Registra o cardápio lido, na ordem em que aparece.',
  input_schema: {
    type: 'object',
    properties: {
      categorias: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nome: { type: 'string', description: 'Nome da categoria como está no cardápio (ex.: Pizzas, Bebidas).' },
            produtos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  nome: { type: 'string' },
                  descricao: { type: 'string', description: 'Ingredientes ou descrição, se houver. Vazio se não houver.' },
                  preco: { type: 'number', description: 'Preço em reais (ex.: 39.9). Se houver vários tamanhos, o menor. Omitir se não houver preço.' },
                },
                required: ['nome'],
              },
            },
          },
          required: ['nome', 'produtos'],
        },
      },
    },
    required: ['categorias'],
  },
} as const;

export const INSTRUCAO_CARDAPIO =
  'Você lê cardápios de restaurantes brasileiros (foto, PDF ou texto de site) e registra categorias e produtos com a ferramenta. ' +
  'Copie nomes, descrições e preços exatamente como aparecem; não invente produtos, preços nem descrições. ' +
  'Se um produto tem tamanhos (P/M/G, broto/grande), registre o menor preço e cite os tamanhos na descrição. ' +
  'Ignore endereço, telefone, horários e textos que não são produtos. Sem categoria visível, use "Cardápio".';

const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** "R$ 39,90", "39.9", 39.9 → centavos (null quando não dá para confiar). */
export function precoLido(v: unknown): number | null {
  let n: number;
  if (typeof v === 'number') n = v;
  else if (typeof v === 'string') {
    const t = v.replace(/[^\d.,]/g, '');
    if (!t) return null;
    n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  } else return null;
  if (!Number.isFinite(n) || n <= 0 || n > 10_000) return null;
  return Math.round(n * 100);
}

const chave = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Limpa o que a IA leu: tira vazios e repetidos, corta tamanhos, no máximo 40 categorias e 400 produtos. */
export function normalizarCardapioLido(bruto: unknown): CategoriaLida[] {
  const cats = (bruto as { categorias?: unknown })?.categorias;
  if (!Array.isArray(cats)) return [];
  const saida: CategoriaLida[] = [];
  let total = 0;
  for (const c of cats) {
    const nome = texto((c as { nome?: unknown })?.nome, 60) || 'Cardápio';
    const vistos = new Set<string>();
    const produtos: ProdutoLido[] = [];
    for (const p of ((c as { produtos?: unknown })?.produtos as unknown[]) ?? []) {
      if (total >= 400) break;
      const pn = texto((p as { nome?: unknown })?.nome, 80);
      if (!pn || vistos.has(chave(pn))) continue;
      vistos.add(chave(pn));
      produtos.push({ nome: pn, descricao: texto((p as { descricao?: unknown })?.descricao, 400) || null, preco: precoLido((p as { preco?: unknown })?.preco) });
      total++;
    }
    if (!produtos.length) continue;
    const mesma = saida.find((s) => chave(s.nome) === chave(nome));
    if (mesma) mesma.produtos.push(...produtos.filter((p) => !mesma.produtos.some((x) => chave(x.nome) === chave(p.nome))));
    else if (saida.length < 40) saida.push({ nome, produtos });
  }
  return saida;
}

/** O produto já existe no cardápio (mesmo nome, sem acento/caixa)? */
export function jaExiste(nome: string, existentes: string[]): boolean {
  const k = chave(nome);
  return existentes.some((e) => chave(e) === k);
}

// ───────────────────────────── ficha técnica sugerida ─────────────────────────────

export type InsumoParaIA = { id: string; nome: string; unidade: UnidadeEstoque };
export type ItemFichaSugerido = { insumo_id: string; quantidade: number; nome: string; unidade: UnidadeEstoque };

export const FERRAMENTA_FICHA = {
  name: 'sugerir_ficha',
  description: 'Sugere a ficha técnica (ingredientes e quantidades para UMA unidade vendida).',
  input_schema: {
    type: 'object',
    properties: {
      itens: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            insumo_id: { type: 'string', description: 'id do insumo da lista da loja; vazio se a loja não tem esse insumo' },
            nome: { type: 'string', description: 'nome do ingrediente' },
            quantidade: { type: 'number', description: 'quantidade para uma unidade vendida' },
            unidade: { type: 'string', enum: ['UN', 'KG', 'G', 'L', 'ML'] },
          },
          required: ['nome', 'quantidade', 'unidade'],
        },
      },
      observacao: { type: 'string', description: 'uma frase curta sobre a premissa (ex.: pizza grande de 35 cm)' },
    },
    required: ['itens'],
  },
} as const;

export const INSTRUCAO_FICHA =
  'Você é um chef de cozinha brasileiro que monta fichas técnicas para controle de estoque e CMV. ' +
  'Com o nome (e a descrição) do produto, liste os ingredientes com a quantidade usada em UMA unidade vendida, em porções típicas de restaurante no Brasil. ' +
  'Use os insumos da lista da loja sempre que servirem (copie o id); só sugira ingrediente fora da lista se for essencial. ' +
  'Não inclua embalagem nem gás, a não ser que estejam na lista. Seja conservador e realista.';

const FATOR: Record<string, { base: 'massa' | 'volume' | 'un'; f: number }> = {
  KG: { base: 'massa', f: 1000 },
  G: { base: 'massa', f: 1 },
  L: { base: 'volume', f: 1000 },
  ML: { base: 'volume', f: 1 },
  UN: { base: 'un', f: 1 },
};

/** Converte a quantidade da IA para a unidade do insumo (ex.: 120 G → 0,12 KG). null se não converte. */
export function converterUnidade(qtd: number, de: string, para: UnidadeEstoque): number | null {
  const a = FATOR[de.toUpperCase()];
  const b = FATOR[para];
  if (!a || !b || a.base !== b.base) return null;
  return Math.round(((qtd * a.f) / b.f) * 10000) / 10000;
}

/**
 * Confere a sugestão: só aceita insumo que existe na loja (pelo id ou pelo nome), converte a unidade e
 * separa o que a loja não tem cadastrado.
 */
export function normalizarFichaSugerida(bruto: unknown, insumos: InsumoParaIA[]): { itens: ItemFichaSugerido[]; faltam: string[]; observacao: string | null } {
  const lista = (bruto as { itens?: unknown })?.itens;
  const itens: ItemFichaSugerido[] = [];
  const faltam: string[] = [];
  if (!Array.isArray(lista)) return { itens, faltam, observacao: null };
  for (const x of lista.slice(0, 40)) {
    const nome = texto((x as { nome?: unknown })?.nome, 60);
    const q = Number((x as { quantidade?: unknown })?.quantidade);
    const un = texto((x as { unidade?: unknown })?.unidade, 4) || 'UN';
    if (!nome || !Number.isFinite(q) || q <= 0) continue;
    const id = texto((x as { insumo_id?: unknown })?.insumo_id, 40);
    const ins = insumos.find((i) => i.id === id) ?? insumos.find((i) => chave(i.nome) === chave(nome)) ?? null;
    const qtd = ins ? converterUnidade(q, un, ins.unidade) : null;
    if (!ins || qtd == null || qtd <= 0) {
      if (!faltam.includes(nome)) faltam.push(nome);
      continue;
    }
    const ja = itens.find((i) => i.insumo_id === ins.id);
    if (ja) ja.quantidade = Math.round((ja.quantidade + qtd) * 10000) / 10000;
    else itens.push({ insumo_id: ins.id, quantidade: qtd, nome: ins.nome, unidade: ins.unidade });
  }
  return { itens, faltam, observacao: texto((bruto as { observacao?: unknown })?.observacao, 160) || null };
}
