// Margem e engenharia de cardápio (D-108). Valores em centavos.
// Matriz de Kasavana & Smith: popularidade (participação nas vendas contra 70% da média) × margem de
// contribuição unitária (contra a média ponderada pelas vendas).

export type ProdutoMargem = {
  id: string;
  nome: string;
  categoria: string | null;
  preco: number | null;
  vendidos: number;
  receita: number;
  custo: number;
  custo_conhecido: boolean;
  /** custo de uma unidade pela ficha do produto (sem opções) */
  custo_ficha: number | null;
};

export type Classe = 'estrela' | 'burro_de_carga' | 'quebra_cabeca' | 'cao';

export const CLASSES: Record<Classe, { titulo: string; icone: string; acao: string }> = {
  estrela: { titulo: 'Estrelas', icone: '⭐', acao: 'Vendem muito e dão lucro: destaque no cardápio, foto boa, não mexa no preço.' },
  burro_de_carga: { titulo: 'Burros de carga', icone: '🐴', acao: 'Vendem muito e lucram pouco: suba um pouco o preço ou reduza o custo da receita.' },
  quebra_cabeca: { titulo: 'Quebra-cabeças', icone: '🧩', acao: 'Lucram bem e vendem pouco: promova, mude o nome ou a posição no cardápio.' },
  cao: { titulo: 'Cães', icone: '🐶', acao: 'Vendem pouco e lucram pouco: tire do cardápio ou refaça.' },
};

export type ItemMatriz = ProdutoMargem & { classe: Classe; margemUnit: number; cmvPct: number; participacao: number };

/** Classifica os produtos com custo conhecido e vendas no período. */
export function engenhariaCardapio(produtos: ProdutoMargem[]): { itens: ItemMatriz[]; corteParticipacao: number; corteMargem: number } {
  const base = produtos.filter((p) => p.custo_conhecido && p.vendidos > 0 && p.receita > 0);
  const total = base.reduce((s, p) => s + p.vendidos, 0);
  if (!base.length || !total) return { itens: [], corteParticipacao: 0, corteMargem: 0 };
  const corteParticipacao = 0.7 / base.length;
  const corteMargem = base.reduce((s, p) => s + (p.receita - p.custo), 0) / total;
  const itens = base.map((p) => {
    const margemUnit = Math.round((p.receita - p.custo) / p.vendidos);
    const participacao = p.vendidos / total;
    const popular = participacao >= corteParticipacao;
    const lucra = margemUnit >= corteMargem;
    const classe: Classe = popular ? (lucra ? 'estrela' : 'burro_de_carga') : lucra ? 'quebra_cabeca' : 'cao';
    return { ...p, classe, margemUnit, participacao, cmvPct: Math.round((p.custo / p.receita) * 1000) / 10 };
  });
  return { itens, corteParticipacao, corteMargem: Math.round(corteMargem) };
}

/** Preço "de cardápio": para cima, terminando em ,90 (ou inteiro acima de R$ 100). */
export function precoCardapio(centavos: number): number {
  if (centavos <= 0) return 0;
  if (centavos >= 10_000) return Math.ceil(centavos / 100) * 100;
  const reais = Math.floor(centavos / 100);
  const com90 = reais * 100 + 90;
  return com90 >= centavos ? com90 : com90 + 100;
}

export type AlertaMargem = { id: string; nome: string; cmvPct: number; precoAtual: number; precoSugerido: number; base: 'vendas' | 'ficha' };

/**
 * Produtos acima do CMV alvo, com o preço que volta para o alvo. Com vendas: custo médio real (inclui as
 * opções); sem vendas no período: pela ficha contra o preço do cardápio.
 */
export function alertasMargem(produtos: ProdutoMargem[], alvo: number): AlertaMargem[] {
  const a: AlertaMargem[] = [];
  for (const p of produtos) {
    if (p.custo_conhecido && p.vendidos > 0 && p.receita > 0) {
      const cmv = (p.custo / p.receita) * 100;
      if (cmv > alvo + 0.05) {
        const precoMedio = p.receita / p.vendidos;
        const custoUnit = p.custo / p.vendidos;
        a.push({ id: p.id, nome: p.nome, cmvPct: Math.round(cmv * 10) / 10, precoAtual: Math.round(precoMedio), precoSugerido: precoCardapio(custoUnit / (alvo / 100)), base: 'vendas' });
      }
    } else if (!p.vendidos && p.custo_ficha && p.preco) {
      const cmv = (p.custo_ficha / p.preco) * 100;
      if (cmv > alvo + 0.05) a.push({ id: p.id, nome: p.nome, cmvPct: Math.round(cmv * 10) / 10, precoAtual: p.preco, precoSugerido: precoCardapio(p.custo_ficha / (alvo / 100)), base: 'ficha' });
    }
  }
  return a.sort((x, y) => y.cmvPct - x.cmvPct);
}
