// Cálculo de preço de um item com grupos de opções (D-009).
// Decisão provisória até conferir com o BeeFood (Q-009); toda a regra fica aqui.

import type { Canal, Centavos, Escolhas, Grupo, Opcao, Produto } from './tipos.js';

export class ErroEscolha extends Error {
  constructor(public grupoId: string, message: string) {
    super(message);
    this.name = 'ErroEscolha';
  }
}

/** Preço base do produto numa marca e canal: promocional → preço do canal → preço padrão. */
export function precoBase(produto: Produto, marcaId: string, canal: Canal): Centavos | null {
  const pm = produto.marcas.find((m) => m.marcaId === marcaId);
  if (!pm || !pm.ativo || !pm[canal]) return null; // indisponível nesta marca/canal
  if (pm.precoPromocional != null) return pm.precoPromocional;
  const doCanal = canal === 'delivery' ? pm.precoDelivery : pm.precoPresencial;
  if (doCanal != null) return doCanal;
  return produto.preco ?? 0;
}

/** Preço de uma opção no canal: preço do canal na opção → preço da opção → preço do item. */
export function precoOpcao(o: Opcao, canal: Canal): Centavos {
  const doCanal = canal === 'delivery' ? o.precoDelivery : o.precoPresencial;
  return doCanal ?? o.preco ?? o.precoItem;
}

function grupoVisivel(g: Grupo, canal: Canal): boolean {
  return g.ativo && (canal === 'delivery' ? g.delivery : g.presencial);
}

function opcaoVisivel(o: Opcao, canal: Canal): boolean {
  return o.ativo && (canal === 'delivery' ? o.delivery : o.presencial);
}

/** Confere as escolhas de um grupo contra mínimo, máximo, repetição e obrigatoriedade. */
export function validarEscolhasGrupo(g: Grupo, escolhas: Record<string, number> | undefined, canal: Canal): void {
  const itens = Object.entries(escolhas ?? {}).filter(([, q]) => q > 0);
  const total = itens.reduce((s, [, q]) => s + q, 0);
  const min = g.obrigatorio ? Math.max(1, g.minQtd) : g.minQtd;
  if (total < min) throw new ErroEscolha(g.id, `Escolha pelo menos ${min} em "${g.nome}".`);
  if (total > g.maxQtd) throw new ErroEscolha(g.id, `Escolha no máximo ${g.maxQtd} em "${g.nome}".`);
  for (const [opcaoId, q] of itens) {
    const o = g.opcoes.find((x) => x.id === opcaoId);
    if (!o || !opcaoVisivel(o, canal)) throw new ErroEscolha(g.id, `Opção indisponível em "${g.nome}".`);
    if (!Number.isInteger(q)) throw new ErroEscolha(g.id, `Quantidade inválida em "${g.nome}".`);
    if (q > 1 && !g.permiteRepetir) throw new ErroEscolha(g.id, `"${o.nome}" não pode repetir em "${g.nome}".`);
    if (q > o.maxQtd) throw new ErroEscolha(g.id, `No máximo ${o.maxQtd} de "${o.nome}".`);
  }
}

/** Quanto um grupo soma ao preço do item, conforme a formação de preço. */
export function precoGrupo(g: Grupo, escolhas: Record<string, number> | undefined, canal: Canal): Centavos {
  const itens = Object.entries(escolhas ?? {})
    .filter(([, q]) => q > 0)
    .map(([id, q]) => ({ o: g.opcoes.find((x) => x.id === id)!, q }));
  if (itens.length === 0) return 0;
  switch (g.formacao) {
    case 'brinde':
      return 0;
    case 'soma':
      return itens.reduce((s, { o, q }) => s + precoOpcao(o, canal) * q, 0);
    case 'maior':
      return Math.max(...itens.map(({ o }) => precoOpcao(o, canal)));
    case 'proporcional': {
      const total = itens.reduce((s, { q }) => s + q, 0);
      // Soma inteira primeiro e uma única divisão: o banco faz a mesma conta (paridade exata).
      return Math.round(itens.reduce((s, { o, q }) => s + precoOpcao(o, canal) * q, 0) / total);
    }
  }
}

export interface ResultadoPreco {
  base: Centavos;
  porGrupo: Record<string, Centavos>;
  unitario: Centavos;
  /** Para relatórios e estoque de pizza (R-014): opcaoId → fração do item (1/2, 1/3, 1/4...). */
  fracoes: Record<string, number>;
}

/** Preço unitário de um item montado. Lança ErroEscolha se as escolhas não respeitam os grupos. */
export function calcularItem(produto: Produto, grupos: Grupo[], escolhas: Escolhas, marcaId: string, canal: Canal): ResultadoPreco {
  const base = precoBase(produto, marcaId, canal);
  if (base === null) throw new ErroEscolha('', `"${produto.nome}" não está disponível neste canal.`);
  const porGrupo: Record<string, Centavos> = {};
  const fracoes: Record<string, number> = {};
  for (const g of grupos) {
    if (!grupoVisivel(g, canal)) continue;
    validarEscolhasGrupo(g, escolhas[g.id], canal);
    porGrupo[g.id] = precoGrupo(g, escolhas[g.id], canal);
    if (g.pizza) {
      const itens = Object.entries(escolhas[g.id] ?? {}).filter(([, q]) => q > 0);
      const total = itens.reduce((s, [, q]) => s + q, 0);
      for (const [id, q] of itens) fracoes[id] = q / total;
    }
  }
  const unitario = base + Object.values(porGrupo).reduce((s, v) => s + v, 0);
  return { base, porGrupo, unitario, fracoes };
}

/** Converte "R$ 49,90" / 49.9 em centavos; e centavos em texto. */
export const paraCentavos = (reais: number): Centavos => Math.round(reais * 100);
export const formatarReais = (c: Centavos): string =>
  (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
