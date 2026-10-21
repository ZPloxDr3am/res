// Tipos das linhas do cardápio e conversões puras (servem no servidor e no navegador).
import type { Grupo, Produto } from '@res/core';

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
  produto_marcas: ProdutoMarcaRow[];
  produto_grupos: { grupo_id: string; ordem: number }[];
};

export type SetorRow = {
  id: string;
  nome: string;
  nome_publico: string | null;
  delivery: boolean;
  presencial: boolean;
  ordem: number;
  setor_marcas: { marca_id: string }[];
};

const c = (v: number | null | undefined) => (v == null ? null : Math.round(Number(v) * 100));

export const nomeOpcao = (o: OpcaoRow) => o.nome ?? o.complementos?.nome ?? o.produtos?.nome ?? '';

/** Converte as linhas do banco nos tipos do núcleo de regras (para simular preço na tela). */
export function paraProdutoCore(p: ProdutoRow): Produto {
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
      precoPromocional: c(m.preco_promocional),
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
