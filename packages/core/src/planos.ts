// Planos e módulos do RES (D-085). O banco guarda preços e o que entra em cada plano
// (editável no painel da empresa); aqui ficam as telas de cada módulo e as contas da fatura.

export const MODULOS_IDS = ['ifood', 'pix_online', 'entregas', 'clientes', 'promocoes', 'fidelidade', 'relatorios', 'estoque', 'financeiro', 'gestao', 'evento', 'marcas'] as const;
export type ModuloId = (typeof MODULOS_IDS)[number];

/** Telas do painel que pertencem a um módulo. O resto (pedidos, cardápio, delivery, caixa, impressão, lojas) vem em todo plano. */
export const ROTAS_DO_MODULO: Partial<Record<ModuloId, string[]>> = {
  entregas: ['/entregas'],
  clientes: ['/clientes'],
  promocoes: ['/promocoes'],
  fidelidade: ['/fidelidade'],
  relatorios: ['/relatorios'],
  estoque: ['/estoque'],
  financeiro: ['/financeiro'],
  gestao: ['/gestao'],
  evento: ['/evento'],
};

/** Módulo que libera a tela (ou null se a tela vem em todo plano). */
export function moduloDaRota(caminho: string): ModuloId | null {
  for (const [m, rotas] of Object.entries(ROTAS_DO_MODULO) as [ModuloId, string[]][]) {
    if (rotas.some((r) => caminho === r || caminho.startsWith(r + '/'))) return m;
  }
  return null;
}

export const rotaLiberada = (caminho: string, modulos: readonly string[]) => {
  const m = moduloDaRota(caminho);
  return !m || modulos.includes(m);
};

export interface PlanoRes {
  id: string;
  nome: string;
  descricao: string;
  preco_loja: number;
  modulos: string[];
  ordem: number;
  ativo: boolean;
}
export interface ModuloRes {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  cobranca: 'loja' | 'cardapio';
  ordem: number;
}
export interface ItemFatura {
  descricao: string;
  qtd: number;
  unitario: number;
  total: number;
}

/** Mesma conta do banco (private.valor_conta): plano × lojas + adicionais × lojas + cardápios extras. */
export function valorMensal(p: { plano: PlanoRes; lojas: number; cardapios: number; adicionais: { modulo: string; cobrar: boolean; ligado: boolean }[]; catalogo: ModuloRes[] }): { itens: ItemFatura[]; total: number } {
  const lojas = Math.max(p.lojas, 1);
  const c2 = (n: number) => Math.round(n * 100) / 100;
  const itens: ItemFatura[] = [{ descricao: `Plano ${p.plano.nome}`, qtd: lojas, unitario: p.plano.preco_loja, total: c2(p.plano.preco_loja * lojas) }];
  for (const m of [...p.catalogo].sort((a, b) => a.ordem - b.ordem)) {
    const a = p.adicionais.find((x) => x.modulo === m.id);
    if (m.cobranca === 'loja' && a?.ligado && a.cobrar && m.preco > 0 && !p.plano.modulos.includes(m.id)) {
      itens.push({ descricao: m.nome, qtd: lojas, unitario: m.preco, total: c2(m.preco * lojas) });
    }
  }
  const marcas = p.catalogo.find((m) => m.id === 'marcas');
  const cortesia = p.adicionais.some((x) => x.modulo === 'marcas' && x.ligado && !x.cobrar);
  const extra = Math.max(p.cardapios - lojas, 0);
  if (marcas && extra > 0 && !p.plano.modulos.includes('marcas') && !cortesia) {
    itens.push({ descricao: marcas.nome, qtd: extra, unitario: marcas.preco, total: c2(marcas.preco * extra) });
  }
  return { itens, total: c2(itens.reduce((t, i) => t + i.total, 0)) };
}

export const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Nome curto de cada módulo (o mesmo do catálogo no banco). */
export const NOME_MODULO: Record<ModuloId, string> = {
  ifood: 'Integração iFood', pix_online: 'Pix automático', entregas: 'Entregas e motoboy', clientes: 'Clientes', promocoes: 'Promoções e cupons',
  fidelidade: 'Fidelidade', relatorios: 'Relatórios', estoque: 'Estoque e CMV', financeiro: 'Financeiro', gestao: 'Gestão empresarial',
  evento: 'Eventos e aniversários', marcas: 'Cardápio extra (marca)',
};
