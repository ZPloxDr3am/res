import type { FormaPagamento, StatusPedido, TipoPedido } from '@res/core';
import { criarClienteServidor } from './supabase/server';

export type PedidoRow = {
  id: string;
  loja_id: string;
  numero: number;
  status: StatusPedido;
  tipo: TipoPedido;
  origem: string;
  marca_id: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  endereco: { logradouro: string; numero?: string; complemento?: string; bairro: string; referencia?: string } | null;
  subtotal: number;
  taxa_entrega: number;
  desconto: number;
  total: number;
  pagamento: FormaPagamento;
  troco_para: number | null;
  observacao: string | null;
  motivo_cancelamento: string | null;
  criado_em: string;
  agendado_para: string | null;
  entregador_nome: string | null;
  pago_em: string | null;
  /** rodada de mesa/comanda do salão (D-099) */
  salao_conta_id?: string | null;
  /** Pix do Mercado Pago ainda não pago (D-044) */
  aguarda_pagamento?: boolean;
  /** marketplace (D-074): iFood */
  acrescimo?: number;
  externo_canal?: string | null;
  externo_codigo?: string | null;
  codigo_retirada?: string | null;
  cartao_bandeira?: string | null;
  documento_cliente?: string | null;
  localizador?: string | null;
  observacao_entrega?: string | null;
  beneficios?: { valor: number; alvo: string; loja: number; marketplace: number; descricao: string | null }[] | null;
  entrega_marketplace?: boolean;
  /** etapas em que o cliente já foi avisado no WhatsApp (D-058): { em_entrega: '2026-…' } */
  avisos?: Record<string, string>;
  /** minutos a mais prometidos porque o pedido entrou no modo movimento (D-062) */
  prazo_extra_min?: number;
  codigo?: string;
  aceito_em: string | null;
  pronto_em: string | null;
  saiu_em: string | null;
  concluido_em: string | null;
  cancelado_em: string | null;
  previsao_chegada: string | null;
  pedido_itens: {
    id: string;
    nome: string;
    quantidade: number;
    total: number;
    observacao: string | null;
    ordem: number;
    pedido_item_opcoes: { grupo_id?: string | null; opcao_id?: string | null; grupo_nome: string; nome: string; quantidade: number; fracao: number | null; ordem?: number }[];
  }[];
};

/** Pedidos em aberto (inclusive agendados para outro dia) e os criados ou encerrados nas últimas 12 horas, do mais antigo para o mais novo. Uma ou várias lojas. */
export async function carregarQuadro(lojaIds: string[], lojaPrincipal: string) {
  const supabase = await criarClienteServidor();
  const desde = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
  const [pedidos, loja, fila, prazos] = await Promise.all([
    supabase
      .from('pedidos')
      .select(
        'id, loja_id, numero, status, tipo, origem, marca_id, cliente_nome, cliente_telefone, endereco, subtotal, taxa_entrega, desconto, total, pagamento, troco_para, observacao, motivo_cancelamento, criado_em, agendado_para, entregador_nome, pago_em, aguarda_pagamento, avisos, prazo_extra_min, acrescimo, externo_canal, externo_codigo, codigo_retirada, cartao_bandeira, documento_cliente, localizador, observacao_entrega, beneficios, entrega_marketplace, codigo, salao_conta_id, aceito_em, pronto_em, saiu_em, concluido_em, cancelado_em, previsao_chegada, pedido_itens(id, nome, quantidade, total, observacao, ordem, pedido_item_opcoes(grupo_id, opcao_id, grupo_nome, nome, quantidade, fracao, ordem))',
      )
      .in('loja_id', lojaIds)
      // encerrados: os que fecharam nas últimas 12 h (pedido antigo concluído agora também aparece em Concluídos)
      .or(`status.not.in.(concluido,cancelado),criado_em.gte.${desde},concluido_em.gte.${desde},cancelado_em.gte.${desde}`)
      .order('criado_em', { ascending: true })
      .limit(500),
    supabase.from('lojas').select('aceite_automatico, tempo_preparo_min, fuso_horario, movimento_min, movimento_ate, pronto_auto_retirada').eq('id', lojaPrincipal).single(),
    supabase
      .from('impressoes')
      .select('id', { count: 'exact', head: true })
      .eq('loja_id', lojaPrincipal)
      .in('status', ['pendente', 'erro'])
      .gte('criado_em', new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
    supabase.from('lojas').select('id, prazo_entrega_min').in('id', lojaIds),
  ]);
  if (pedidos.error) throw new Error(pedidos.error.message);
  // salão (D-099): rodadas das mesas ficam na tela do Salão; no quadro só enquanto esperam alguém aceitar (pedido pelo QR)
  const lista = ((pedidos.data ?? []) as unknown as PedidoRow[]).filter((p) => !p.salao_conta_id || p.status === 'novo');
  for (const p of lista) {
    p.pedido_itens.sort((a, b) => a.ordem - b.ordem);
    for (const i of p.pedido_itens) i.pedido_item_opcoes.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  }
  return {
    pedidos: lista,
    aceiteAutomatico: loja.data?.aceite_automatico ?? false,
    /** retirada vira "Pronto" sozinha no fim do preparo (D-063) */
    prontoAutoRetirada: (loja.data?.pronto_auto_retirada as boolean | undefined) ?? false,
    tempoPreparo: loja.data?.tempo_preparo_min ?? 30,
    fuso: (loja.data?.fuso_horario as string | undefined) ?? 'America/Sao_Paulo',
    filaImpressao: fila.count ?? 0,
    /** modo movimento em vigor na loja (D-062) */
    movimento:
      loja.data?.movimento_ate && Date.parse(loja.data.movimento_ate as string) > Date.now() && Number(loja.data.movimento_min) > 0
        ? { min: Number(loja.data.movimento_min), ate: loja.data.movimento_ate as string }
        : null,
    /** prazo de entrega (min) de cada loja (D-028) */
    prazoEntrega: Object.fromEntries((prazos.data ?? []).map((l) => [l.id as string, (l.prazo_entrega_min as number | null) ?? 35])) as Record<string, number>,
  };
}
