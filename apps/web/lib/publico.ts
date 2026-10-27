// Tipos do cardápio público (o JSON de public.cardapio_publico) e conversões para o núcleo de regras.
// Valores em centavos.
import type { FormaPagamento, Grupo, PassoCombo, Produto, StatusPedido, TipoPedido } from '@res/core';

export type OpcaoPublica = { id: string; nome: string; preco: number; max: number };
export type GrupoPublico = {
  id: string;
  nome: string;
  formacao: Grupo['formacao'];
  obrigatorio: boolean;
  pizza: boolean;
  min: number;
  max: number;
  permite_repetir: boolean;
  opcoes: OpcaoPublica[];
};
export type ProdutoPublico = {
  id: string;
  nome: string;
  descricao: string | null;
  imagem_url: string | null;
  etiqueta: string | null;
  preco: number;
  preco_original: number | null;
  grupos: GrupoPublico[];
  /** combo com escolhas (D-022) */
  combo?: boolean;
  passos?: PassoPublico[] | null;
};
export type PassoPublico = { id: string; titulo: string; quantidade: number; produtos: ProdutoPublico[] };
export type SetorPublico = { id: string; nome: string; upsell?: boolean; produtos: ProdutoPublico[] };
export type MarcaPublica = {
  id: string;
  nome: string;
  slug: string;
  aberta: boolean;
  status: 'auto' | 'aberto' | 'fechado';
  mensagem: string | null;
  pedido_minimo: number;
  aceita_entrega: boolean;
  aceita_retirada: boolean;
  formas_pagamento: FormaPagamento[];
  tempo_preparo_min: number;
  fuso: string;
  horarios: { dia: number; abre: string; fecha: string }[];
  areas: { bairro: string; taxa: number }[];
};
export type CardapioPublico = { marca: MarcaPublica; setores: SetorPublico[] };

/** public.horarios_agendamento: dias à frente (0 = não agenda) e horários livres em ISO. */
export type AgendamentoPublico = { dias: number; horarios: string[] };

export type Acompanhamento = {
  numero: number;
  status: StatusPedido;
  tipo: TipoPedido;
  marca: string;
  slug: string;
  fuso: string;
  criado_em: string;
  agendado_para: string | null;
  aceito_em: string | null;
  pronto_em: string | null;
  saiu_em: string | null;
  concluido_em: string | null;
  cancelado_em: string | null;
  motivo_cancelamento: string | null;
  subtotal: number;
  taxa_entrega: number;
  total: number;
  pagamento: FormaPagamento;
  troco_para: number | null;
  tempo_preparo_min: number;
  /** prazo prometido (agendado ou pedido + prazo da loja) */
  prazo: string;
  /** só em entrega: hora prevista pela rota do motoboy */
  previsao_chegada: string | null;
  motoboy_nome: string | null;
  paradas_antes: number | null;
  destino: { lat: number; lng: number } | null;
  /** só quando este pedido é a próxima parada do motoboy */
  motoboy: { lat: number; lng: number; em: string } | null;
  itens: { nome: string; quantidade: number; total: number; opcoes: { nome: string; quantidade: number; fracao: number | null }[] }[];
};

const MARCA = 'm';

export function produtoCore(p: ProdutoPublico): Produto {
  return { id: p.id, nome: p.nome, preco: p.preco, marcas: [{ marcaId: MARCA, ativo: true, delivery: true, presencial: false, totem: false }] };
}

export function grupoCore(g: GrupoPublico): Grupo {
  return {
    id: g.id,
    nome: g.nome,
    formacao: g.formacao,
    obrigatorio: g.obrigatorio,
    pizza: g.pizza,
    minQtd: g.min,
    maxQtd: g.max,
    permiteRepetir: g.permite_repetir,
    ativo: true,
    delivery: true,
    presencial: false,
    opcoes: g.opcoes.map((o) => ({ id: o.id, nome: o.nome, precoItem: o.preco, minQtd: 0, maxQtd: o.max, ativo: true, delivery: true, presencial: false })),
  };
}

export const MARCA_CORE = MARCA;

/** Passos do combo no formato do núcleo. */
export function passosPublicosCore(p: ProdutoPublico): PassoCombo[] {
  return (p.passos ?? []).map((ps) => ({
    id: ps.id,
    titulo: ps.titulo,
    quantidade: ps.quantidade,
    opcoes: ps.produtos.map((x) => ({ produto: produtoCore(x), grupos: x.grupos.map(grupoCore) })),
  }));
}

export const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** Dia da semana (0 = domingo) no fuso da loja. */
export function diaNoFuso(fuso: string, agora = new Date()): number {
  const nome = new Intl.DateTimeFormat('en-US', { timeZone: fuso, weekday: 'short' }).format(agora);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(nome);
}
