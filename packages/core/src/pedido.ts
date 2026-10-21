// Regras do pedido de delivery: fluxo de status e totais.
// O banco repete as mesmas regras (supabase/migrations/*_pedidos.sql): private.transicao_valida e criar_pedido.

import type { Centavos } from './tipos.js';

export type StatusPedido = 'novo' | 'em_preparo' | 'pronto' | 'em_entrega' | 'concluido' | 'cancelado';
export type TipoPedido = 'entrega' | 'retirada' | 'balcao';
export type FormaPagamento = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'vale_refeicao' | 'online';

export const STATUS_ROTULO: Record<StatusPedido, string> = {
  novo: 'Novo',
  em_preparo: 'Em preparo',
  pronto: 'Pronto',
  em_entrega: 'Saiu para entrega',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const TIPO_ROTULO: Record<TipoPedido, string> = { entrega: 'Entrega', retirada: 'Retirada', balcao: 'Balcão' };

export const PAGAMENTO_ROTULO: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'Cartão de crédito',
  cartao_debito: 'Cartão de débito',
  vale_refeicao: 'Vale-refeição',
  online: 'Pago online',
};

/** Próximos status permitidos. Só entrega passa por "Saiu para entrega"; cancelar vale até concluir. */
export function proximosStatus(atual: StatusPedido, tipo: TipoPedido): StatusPedido[] {
  switch (atual) {
    case 'novo':
      return ['em_preparo', 'cancelado'];
    case 'em_preparo':
      return ['pronto', 'cancelado'];
    case 'pronto':
      return tipo === 'entrega' ? ['em_entrega', 'cancelado'] : ['concluido', 'cancelado'];
    case 'em_entrega':
      return ['concluido', 'cancelado'];
    case 'concluido':
    case 'cancelado':
      return [];
  }
}

export const transicaoValida = (de: StatusPedido, para: StatusPedido, tipo: TipoPedido) => proximosStatus(de, tipo).includes(para);

/** Rótulo do botão que avança o pedido (o "caminho feliz"). */
export function acaoAvancar(atual: StatusPedido, tipo: TipoPedido): { para: StatusPedido; rotulo: string } | null {
  const para = proximosStatus(atual, tipo).find((s) => s !== 'cancelado');
  if (!para) return null;
  const rotulos: Partial<Record<StatusPedido, string>> = {
    em_preparo: 'Aceitar',
    pronto: 'Marcar pronto',
    em_entrega: 'Saiu para entrega',
    concluido: tipo === 'entrega' ? 'Entregue' : 'Concluir',
  };
  return { para, rotulo: rotulos[para] ?? STATUS_ROTULO[para] };
}

export interface LinhaTotal {
  unitario: Centavos;
  quantidade: number;
}

export interface Totais {
  subtotal: Centavos;
  taxaEntrega: Centavos;
  desconto: Centavos;
  total: Centavos;
}

export class ErroPedido extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErroPedido';
  }
}

/** Totais do pedido. Mesmas validações do banco: desconto até o subtotal, taxa só em entrega. */
export function totalizar(linhas: LinhaTotal[], tipo: TipoPedido, taxaEntrega: Centavos, desconto: Centavos): Totais {
  if (linhas.length === 0) throw new ErroPedido('Adicione pelo menos um item.');
  for (const l of linhas) {
    if (!Number.isInteger(l.quantidade) || l.quantidade < 1 || l.quantidade > 99) throw new ErroPedido('Quantidade deve ser de 1 a 99.');
  }
  if (taxaEntrega < 0 || desconto < 0) throw new ErroPedido('Valores não podem ser negativos.');
  const subtotal = linhas.reduce((s, l) => s + l.unitario * l.quantidade, 0);
  const taxa = tipo === 'entrega' ? taxaEntrega : 0;
  if (desconto > subtotal) throw new ErroPedido('O desconto não pode passar do subtotal.');
  return { subtotal, taxaEntrega: taxa, desconto, total: subtotal + taxa - desconto };
}

/** Troco a levar. null = não precisa. */
export function troco(total: Centavos, pagamento: FormaPagamento, trocoPara: Centavos | null): Centavos | null {
  if (pagamento !== 'dinheiro' || trocoPara == null) return null;
  if (trocoPara < total) throw new ErroPedido('O valor para troco é menor que o total.');
  return trocoPara - total;
}

/** "há 12 min" — para o quadro. */
export function tempoDecorrido(desde: Date, agora: Date = new Date()): string {
  const min = Math.max(0, Math.floor((agora.getTime() - desde.getTime()) / 60000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return `há ${h}h${String(min % 60).padStart(2, '0')}`;
}
