// Planos e módulos do RES (D-085). O banco guarda preços e o que entra em cada plano
// (editável no painel da empresa); aqui ficam as telas de cada módulo e as contas da fatura.

export const MODULOS_IDS = ['ifood', 'pix_online', 'entregas', 'salao', 'clientes', 'promocoes', 'fidelidade', 'relatorios', 'estoque', 'financeiro', 'gestao', 'evento', 'marcas', 'app_entregador', 'app_garcom', 'turbo'] as const;
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
  turbo: ['/turbo'],
  salao: ['/salao'],
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
  /** preço do plano por mês, por conta (cobre 1 loja e 1 cardápio) — D-090 */
  preco_loja: number;
  modulos: string[];
  /** aparelhos inclusos: { app_entregador: 5 } */
  incluidos?: Record<string, number>;
  ordem: number;
  ativo: boolean;
}
export interface ModuloRes {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  /** conta = adicional único; cardapio = cada loja/cardápio além do 1º; aparelho = por unidade além dos inclusos */
  cobranca: 'conta' | 'loja' | 'cardapio' | 'aparelho';
  ordem: number;
}
export interface ItemFatura {
  descricao: string;
  qtd: number;
  unitario: number;
  total: number;
}

/** Mesma conta do banco (private.valor_conta, D-090): plano + lojas/cardápios extras + adicionais + aparelhos extras; anual com desconto. */
export function valorMensal(p: {
  plano: PlanoRes;
  cardapios: number;
  adicionais: { modulo: string; cobrar: boolean; ligado: boolean }[];
  aparelhosExtra?: Record<string, number>;
  catalogo: ModuloRes[];
  anual?: boolean;
  descontoAnual?: number;
}): { itens: ItemFatura[]; total: number; totalPeriodo: number } {
  const f = p.anual ? 1 - (p.descontoAnual ?? 20) / 100 : 1;
  const c2 = (n: number) => Math.round(n * 100) / 100;
  const item = (descricao: string, qtd: number, preco: number): ItemFatura => ({ descricao, qtd, unitario: c2(preco * f), total: c2(preco * f * qtd) });
  const itens: ItemFatura[] = [item(`Plano ${p.plano.nome}`, 1, p.plano.preco_loja)];
  const extra = p.catalogo.find((m) => m.id === 'marcas');
  const cortesia = p.adicionais.some((x) => x.modulo === 'marcas' && x.ligado && !x.cobrar);
  if (extra && p.cardapios > 1 && !cortesia) itens.push(item(extra.nome, p.cardapios - 1, extra.preco));
  const ord = [...p.catalogo].sort((a, b) => a.ordem - b.ordem);
  for (const m of ord) {
    const a = p.adicionais.find((x) => x.modulo === m.id);
    if ((m.cobranca === 'conta' || m.cobranca === 'loja') && a?.ligado && a.cobrar && m.preco > 0 && !p.plano.modulos.includes(m.id)) itens.push(item(m.nome, 1, m.preco));
  }
  for (const m of ord) {
    const n = p.aparelhosExtra?.[m.id] ?? 0;
    if (m.cobranca === 'aparelho' && n > 0 && m.preco > 0) itens.push(item(`${m.nome} extra`, n, m.preco));
  }
  const total = c2(itens.reduce((t, i) => t + i.total, 0));
  return { itens, total, totalPeriodo: c2(total * (p.anual ? 12 : 1)) };
}

export const reais = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Nome curto de cada módulo (o mesmo do catálogo no banco). */
export const NOME_MODULO: Record<ModuloId, string> = {
  ifood: 'Integração iFood', pix_online: 'Pix automático', entregas: 'Entregas e motoboy', clientes: 'Clientes', promocoes: 'Promoções e cupons',
  fidelidade: 'Fidelidade', relatorios: 'Relatórios', estoque: 'Estoque e CMV', financeiro: 'Financeiro', gestao: 'Gestão empresarial',
  evento: 'Eventos e aniversários', marcas: 'Loja ou cardápio extra', salao: 'Salão e garçom',
  app_entregador: 'App Entregador', app_garcom: 'App Garçom', turbo: 'Turbo-Vendas',
};
