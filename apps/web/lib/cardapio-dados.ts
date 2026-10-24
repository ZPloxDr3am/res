// Tipos das linhas do cardápio e conversões puras (servem no servidor e no navegador).
import { promoVale, type AgendaPromo, type Grupo, type PassoCombo, type Produto } from '@res/core';

export type OpcaoRow = {
  id: string;
  nome: string | null;
  preco: number | null;
  preco_delivery: number | null;
  preco_presencial: number | null;
  min_qtd: number;
  max_qtd: number;
  ativo: boolean;
  delivery: boolean;
  presencial: boolean;
  ordem: number;
  complementos: { nome: string; preco: number } | null;
  produtos: { nome: string; preco: number | null } | null;
};

export type GrupoRow = {
  id: string;
  nome: string;
  formacao: Grupo['formacao'];
  obrigatorio: boolean;
  pizza: boolean;
  min_qtd: number;
  max_qtd: number;
  permite_repetir: boolean;
  ativo: boolean;
  delivery: boolean;
  presencial: boolean;
  opcoes: OpcaoRow[];
};

export type ProdutoMarcaRow = {
  marca_id: string;
  ativo: boolean;
  delivery: boolean;
  presencial: boolean;
  totem: boolean;
  preco_delivery: number | null;
  preco_presencial: number | null;
  preco_promocional: number | null;
  /** agenda da promoção (D-021): dias 0–6, horário 'HH:MM:SS', último dia 'AAAA-MM-DD' */
  promo_dias?: number[] | null;
  promo_inicio?: string | null;
  promo_fim?: string | null;
  promo_ate?: string | null;
};

export type ProdutoRow = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number | null;
  setor_id: string | null;
  etiqueta: string | null;
  imagem_url: string | null;
  ordem: number;
  /** combo com escolhas (D-022): os passos ficam em Cardapio.passos */
  combo?: boolean;
  produto_marcas: ProdutoMarcaRow[];
  produto_grupos: { grupo_id: string; ordem: number }[];
};

export type SetorRow = {
  id: string;
  nome: string;
  nome_publico: string | null;
  delivery: boolean;
  presencial: boolean;
  /** categoria de up-sell: sugerida no carrinho e no balcão */
  upsell?: boolean;
  ordem: number;
  setor_marcas: { marca_id: string }[];
};

export type PassoRow = { id: string; combo_id: string; ordem: number; titulo: string; quantidade: number; setor_id: string | null; produtos: string[] };

const c = (v: number | null | undefined) => (v == null ? null : Math.round(Number(v) * 100));

export interface Cardapio {
  setores: SetorRow[];
  produtos: ProdutoRow[];
  grupos: Record<string, GrupoRow>;
  /** grupoId → quantos produtos usam */
  usos: Record<string, number>;
  /** comboId → passos do combo, em ordem */
  passos: Record<string, PassoRow[]>;
}

/** Passos do combo no formato do núcleo (produtos que valem em cada passo, com os grupos deles). */
export function passosCore(c: Cardapio, comboId: string, agora = new Date()): PassoCombo[] {
  return (c.passos[comboId] ?? []).map((ps) => ({
    id: ps.id,
    titulo: ps.titulo,
    quantidade: ps.quantidade,
    opcoes: c.produtos
      .filter((p) => !p.combo && (ps.produtos.includes(p.id) || (ps.setor_id != null && p.setor_id === ps.setor_id)))
      .map((p) => ({ produto: paraProdutoCore(p, agora), grupos: p.produto_grupos.map((pg) => c.grupos[pg.grupo_id]).filter((g): g is GrupoRow => !!g).map(paraGrupoCore) })),
  }));
}

export const nomeOpcao = (o: OpcaoRow) => o.nome ?? o.complementos?.nome ?? o.produtos?.nome ?? '';

export const agendaDe = (m: ProdutoMarcaRow): AgendaPromo => ({ dias: m.promo_dias ?? null, inicio: m.promo_inicio ?? null, fim: m.promo_fim ?? null, ate: m.promo_ate ?? null });

/** Situação da promoção do produto numa marca agora: sem, valendo, agendada (fora do horário) ou encerrada. */
export function situacaoPromo(m: ProdutoMarcaRow | undefined, agora = new Date()): 'sem' | 'valendo' | 'fora' {
  if (!m || m.preco_promocional == null) return 'sem';
  return promoVale(agendaDe(m), agora) ? 'valendo' : 'fora';
}

/** Converte as linhas do banco nos tipos do núcleo de regras (para simular preço na tela). Promoção só se vale agora. */
export function paraProdutoCore(p: ProdutoRow, agora = new Date()): Produto {
  return {
    id: p.id,
    nome: p.nome,
    preco: c(p.preco),
    marcas: p.produto_marcas.map((m) => ({
      marcaId: m.marca_id,
      ativo: m.ativo,
      delivery: m.delivery,
      presencial: m.presencial,
      totem: m.totem,
      precoDelivery: c(m.preco_delivery),
      precoPresencial: c(m.preco_presencial),
      precoPromocional: situacaoPromo(m, agora) === 'valendo' ? c(m.preco_promocional) : null,
    })),
  };
}

export function paraGrupoCore(g: GrupoRow): Grupo {
  return {
    id: g.id,
    nome: g.nome,
    formacao: g.formacao,
    obrigatorio: g.obrigatorio,
    pizza: g.pizza,
    minQtd: g.min_qtd,
    maxQtd: g.max_qtd,
    permiteRepetir: g.permite_repetir,
    ativo: g.ativo,
    delivery: g.delivery,
    presencial: g.presencial,
    opcoes: g.opcoes.map((o) => ({
      id: o.id,
      nome: nomeOpcao(o),
      precoItem: c(o.complementos?.preco ?? o.produtos?.preco ?? 0) ?? 0,
      preco: c(o.preco),
      precoDelivery: c(o.preco_delivery),
      precoPresencial: c(o.preco_presencial),
      minQtd: o.min_qtd,
      maxQtd: o.max_qtd,
      ativo: o.ativo,
      delivery: o.delivery,
      presencial: o.presencial,
    })),
  };
}
