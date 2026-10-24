// Combo com escolhas (D-022). Espelho de private.preco_combo (migração 0022).
import { calcularItem, ErroEscolha, precoBase } from './preco.js';
import type { Canal, Centavos, Escolhas, Grupo, Produto } from './tipos.js';

export type PassoCombo = {
  id: string;
  titulo: string;
  quantidade: number;
  /** produtos que valem neste passo, cada um com os grupos dele (sabores, borda…) */
  opcoes: { produto: Produto; grupos: Grupo[] }[];
};

export type EscolhaPasso = { passoId: string; produtoId: string; escolhas: Escolhas };

/**
 * Preço do combo: preço do combo (com promoção) + o que cada escolha cobra além do preço base
 * dela (sabor mais caro, borda). Lança ErroEscolha se faltar ou sobrar escolha.
 */
export function calcularCombo(combo: Produto, passos: PassoCombo[], escolhas: EscolhaPasso[], marcaId: string, canal: Canal): { base: Centavos; extras: Centavos; unitario: Centavos } {
  const base = precoBase(combo, marcaId, canal);
  if (base === null) throw new ErroEscolha('', `"${combo.nome}" não está disponível neste canal.`);
  if (escolhas.some((e) => !passos.some((p) => p.id === e.passoId))) throw new ErroEscolha('', `Escolha inválida no combo "${combo.nome}".`);
  let extras = 0;
  for (const p of passos) {
    const doPasso = escolhas.filter((e) => e.passoId === p.id);
    if (doPasso.length !== p.quantidade) throw new ErroEscolha(p.id, `Escolha ${p.quantidade} em "${p.titulo}".`);
    for (const e of doPasso) {
      const o = p.opcoes.find((x) => x.produto.id === e.produtoId);
      if (!o) throw new ErroEscolha(p.id, `Produto que não vale em "${p.titulo}".`);
      const r = calcularItem(o.produto, o.grupos, e.escolhas, marcaId, canal);
      extras += Math.max(0, r.unitario - r.base);
    }
  }
  return { base, extras, unitario: base + extras };
}

/** Quanto sairia separado: em cada passo, o produto mais barato que vale (preço base), vezes a quantidade. */
export function precoSeparado(passos: PassoCombo[], marcaId: string, canal: Canal): Centavos {
  return passos.reduce((s, p) => {
    const precos = p.opcoes.map((o) => precoBase(o.produto, marcaId, canal)).filter((x): x is number => x != null);
    return s + (precos.length ? Math.min(...precos) * p.quantidade : 0);
  }, 0);
}
