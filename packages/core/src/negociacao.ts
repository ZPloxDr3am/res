// Plataforma de Negociação do iFood (D-075): o cliente pede cancelamento/reembolso depois de confirmado
// e a loja responde (aceitar, recusar ou contraproposta) antes do prazo. Sem resposta, o iFood decide.
// Valores do iFood vêm em centavos como texto ("1399"); aqui ficam em reais.

export type AcaoNegociacao = 'CANCELLATION' | 'PARTIAL_CANCELLATION' | 'PROPOSED_AMOUNT_REFUND' | 'PROPOSED_ADDITIONAL_TIME' | 'VOID' | string;
export type TipoNegociacao = 'AFTER_DELIVERY' | 'DELAY' | 'PREPARATION_TIME' | 'AFTER_DELIVERY_PARTIALLY' | string;

/** Formato do metadata do evento HANDSHAKE_DISPUTE (HSD). */
export interface IfoodDisputa {
  disputeId: string;
  action?: AcaoNegociacao;
  handshakeType?: TipoNegociacao;
  handshakeGroup?: string;
  timeoutAction?: 'ACCEPT_CANCELLATION' | 'REJECT_CANCELLATION' | 'VOID' | string;
  expiresAt?: string;
  createdAt?: string;
  message?: string | null;
  alternatives?: IfoodAlternativa[] | null;
  metadata?: {
    evidences?: { url: string; contentType?: string }[] | null;
    acceptCancellationReasons?: string[] | null;
    items?: { id?: string; uniqueId?: string; externalCode?: string; quantity?: number; index?: number; amount?: { value: string | number; currency?: string }; reason?: string }[] | null;
    garnishItems?: { id?: string; parentUniqueId?: string; externalCode?: string; quantity?: number; index?: number; amount?: { value: string | number; currency?: string }; reason?: string }[] | null;
  } | null;
}
export interface IfoodAlternativa {
  id: string;
  type: 'REFUND' | 'BENEFIT' | 'ADDITIONAL_TIME' | string;
  metadata?: {
    maxAmount?: { value: string | number; currency?: string };
    allowedsAdditionalTimeInMinutes?: number[];
    allowedsAdditionalTimeMinutes?: number[];
    allowedsAdditionalTimeReasons?: string[];
  } | null;
}

export type TipoAlternativa = 'reembolso' | 'beneficio' | 'mais_tempo';
export interface Alternativa {
  id: string;
  tipo: TipoAlternativa;
  /** teto da contraproposta em reais (reembolso/benefício) */
  valor_max: number | null;
  minutos: number[];
  motivos_tempo: string[];
}
/** Negociação no formato do RES (vai para public.marketplace_negociacoes). */
export interface Negociacao {
  canal: 'ifood';
  externo_id: string;
  disputa_id: string;
  acao: string;
  tipo: string | null;
  mensagem: string | null;
  expira_em: string | null;
  acao_no_prazo: string | null;
  alternativas: Alternativa[];
  motivos_aceite: string[];
  itens: { externo_codigo: string | null; quantidade: number; valor: number; motivo: string | null; adicional: boolean }[];
  evidencias: number;
}

const centavos = (v: string | number | undefined | null) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.round(n) / 100 : 0;
};

const TIPO_ALT: Record<string, TipoAlternativa> = { REFUND: 'reembolso', BENEFIT: 'beneficio', ADDITIONAL_TIME: 'mais_tempo', ADDTIONAL_TIME: 'mais_tempo' };

export function normalizarNegociacaoIfood(externoId: string, d: IfoodDisputa): Negociacao {
  const m = d.metadata ?? {};
  return {
    canal: 'ifood',
    externo_id: externoId,
    disputa_id: d.disputeId,
    acao: d.action ?? 'CANCELLATION',
    tipo: d.handshakeType ?? null,
    mensagem: d.message ? String(d.message).slice(0, 500) : null,
    expira_em: d.expiresAt ?? null,
    acao_no_prazo: d.timeoutAction ?? null,
    alternativas: (d.alternatives ?? [])
      .filter((a) => TIPO_ALT[a.type])
      .map((a) => ({
        id: a.id,
        tipo: TIPO_ALT[a.type]!,
        valor_max: a.metadata?.maxAmount ? centavos(a.metadata.maxAmount.value) : null,
        minutos: a.metadata?.allowedsAdditionalTimeInMinutes ?? a.metadata?.allowedsAdditionalTimeMinutes ?? [],
        motivos_tempo: a.metadata?.allowedsAdditionalTimeReasons ?? [],
      })),
    motivos_aceite: m.acceptCancellationReasons ?? [],
    itens: [
      ...(m.items ?? []).map((i) => ({ externo_codigo: i.externalCode ?? null, quantidade: i.quantity ?? 1, valor: centavos(i.amount?.value), motivo: i.reason ?? null, adicional: false })),
      ...(m.garnishItems ?? []).map((i) => ({ externo_codigo: i.externalCode ?? null, quantidade: i.quantity ?? 1, valor: centavos(i.amount?.value), motivo: i.reason ?? null, adicional: true })),
    ],
    evidencias: (m.evidences ?? []).length,
  };
}

/** Título e o que a loja pode fazer em cada tipo (conforme a documentação do iFood). */
export function descreverNegociacao(acao: string, tipo: string | null): { titulo: string; podeRecusar: boolean; aceitarRotulo: string } {
  if (acao === 'PARTIAL_CANCELLATION') return { titulo: 'Cliente reclama de itens e pede reembolso parcial', podeRecusar: true, aceitarRotulo: 'Aceitar reembolso' };
  if (acao === 'PROPOSED_AMOUNT_REFUND') return { titulo: 'Cliente propõe um reembolso', podeRecusar: true, aceitarRotulo: 'Aceitar' };
  if (acao === 'PROPOSED_ADDITIONAL_TIME') return { titulo: 'Pedido de mais tempo', podeRecusar: true, aceitarRotulo: 'Aceitar' };
  if (tipo === 'DELAY') return { titulo: 'Cliente quer cancelar pelo atraso', podeRecusar: false, aceitarRotulo: 'Aceitar cancelamento' };
  if (tipo === 'PREPARATION_TIME') return { titulo: 'Cliente quer cancelar durante o preparo', podeRecusar: true, aceitarRotulo: 'Aceitar cancelamento' };
  if (tipo === 'AFTER_DELIVERY') return { titulo: 'Cliente pede cancelamento depois da entrega', podeRecusar: true, aceitarRotulo: 'Aceitar cancelamento' };
  return { titulo: 'Cliente pede cancelamento', podeRecusar: true, aceitarRotulo: 'Aceitar cancelamento' };
}

/** O que acontece se a loja não responder a tempo. */
export function seNaoResponder(acaoNoPrazo: string | null): string {
  if (acaoNoPrazo === 'ACCEPT_CANCELLATION') return 'o iFood aceita o cancelamento';
  if (acaoNoPrazo === 'REJECT_CANCELLATION') return 'o iFood recusa o cancelamento';
  return 'o iFood encerra a negociação';
}

/** Rótulos dos motivos que o iFood manda (o que não estiver aqui aparece como veio). */
export const MOTIVOS_NEGOCIACAO: Record<string, string> = {
  HIGH_STORE_DEMAND: 'Loja com muitos pedidos',
  DRIVER_NOT_AVAILABLE: 'Sem entregador disponível',
  ORDER_OUT_FOR_DELIVERY: 'Pedido já saiu para entrega',
  ORDER_IN_PREPARATION: 'Pedido em preparo',
  PROBLEM_WITH_ORDER: 'Problema com o pedido',
  CUSTOMER_REQUEST: 'A pedido do cliente',
  ITEM_UNAVAILABLE: 'Item indisponível',
  WRONG_ITEM: 'Item errado',
  MISSING_ITEM: 'Item faltando',
  DAMAGED_ITEM: 'Item danificado',
  DELAY: 'Atraso',
};
export const rotuloMotivo = (m: string) => MOTIVOS_NEGOCIACAO[m] ?? m.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());

export type RespostaNegociacao =
  | { tipo: 'aceitar'; motivo?: string | null; detalhe?: string | null }
  | { tipo: 'recusar'; motivo: string }
  | { tipo: 'alternativa'; alternativaId: string; alternativa: TipoAlternativa; valor?: number; minutos?: number; motivoTempo?: string };

/** Confere a resposta com o que o iFood permite nesta negociação. Devolve o erro em português ou null. */
export function validarResposta(n: Pick<Negociacao, 'acao' | 'tipo' | 'alternativas' | 'motivos_aceite'>, r: RespostaNegociacao): string | null {
  if (r.tipo === 'aceitar') {
    if (n.motivos_aceite.length && (!r.motivo || !n.motivos_aceite.includes(r.motivo))) return 'Escolha o motivo do aceite.';
    if (r.detalhe && r.detalhe.length > 250) return 'Detalhe com no máximo 250 letras.';
    return null;
  }
  if (r.tipo === 'recusar') {
    if (!descreverNegociacao(n.acao, n.tipo).podeRecusar) return 'Nesse caso o iFood não deixa recusar: aceite ou ofereça mais tempo.';
    const m = (r.motivo ?? '').trim();
    if (!m) return 'Escreva o motivo da recusa (o cliente vai ler).';
    if (m.length > 250) return 'Motivo com no máximo 250 letras.';
    return null;
  }
  const alt = n.alternativas.find((a) => a.id === r.alternativaId);
  if (!alt || alt.tipo !== r.alternativa) return 'Essa contraproposta não está disponível.';
  if (alt.tipo === 'mais_tempo') {
    if (!r.minutos || (alt.minutos.length && !alt.minutos.includes(r.minutos))) return 'Escolha quantos minutos a mais.';
    if (alt.motivos_tempo.length && (!r.motivoTempo || !alt.motivos_tempo.includes(r.motivoTempo))) return 'Escolha o motivo do tempo a mais.';
    return null;
  }
  if (!r.valor || r.valor <= 0) return 'Informe o valor.';
  if (alt.valor_max != null && r.valor > alt.valor_max + 1e-9) return `O valor máximo é R$ ${alt.valor_max.toFixed(2).replace('.', ',')}.`;
  return null;
}

/** Chamada ao iFood para a resposta (Order API v1.0, /disputes). */
export function chamadaRespostaIfood(disputaId: string, r: RespostaNegociacao): { caminho: string; corpo: Record<string, unknown> | null } {
  const base = `/order/v1.0/disputes/${encodeURIComponent(disputaId)}`;
  if (r.tipo === 'aceitar') return { caminho: `${base}/accept`, corpo: r.motivo ? { reason: r.motivo, ...(r.detalhe ? { detailReason: r.detalhe.slice(0, 250) } : {}) } : null };
  if (r.tipo === 'recusar') return { caminho: `${base}/reject`, corpo: { reason: r.motivo.trim().slice(0, 250) } };
  const caminho = `${base}/alternatives/${encodeURIComponent(r.alternativaId)}`;
  if (r.alternativa === 'mais_tempo') return { caminho, corpo: { type: 'ADDITIONAL_TIME', metadata: { additionalTimeInMinutes: r.minutos, additionalTimeReason: r.motivoTempo } } };
  return { caminho, corpo: { type: r.alternativa === 'beneficio' ? 'BENEFIT' : 'REFUND', metadata: { amount: { value: String(Math.round((r.valor ?? 0) * 100)), currency: 'BRL' } } } };
}

/** Resultado final (HANDSHAKE_SETTLEMENT.status) → situação no RES. */
export function situacaoDoAcordo(status: string): 'aceita' | 'recusada' | 'expirada' | 'alternativa' | null {
  return ({ ACCEPTED: 'aceita', REJECTED: 'recusada', EXPIRED: 'expirada', ALTERNATIVE_REPLIED: 'alternativa' } as const)[status as 'ACCEPTED'] ?? null;
}

/** Negociação de exemplo para o simulador (modo teste). */
export function disputaIfoodExemplo(tipo: 'apos_entrega' | 'preparo' | 'atraso' | 'parcial', total: number, agora = new Date()): IfoodDisputa {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${agora.getTime()}`;
  const expira = new Date(agora.getTime() + (tipo === 'atraso' ? 5 : 15) * 60_000).toISOString();
  const max = String(Math.round(total * 100));
  if (tipo === 'atraso') {
    return {
      disputeId: id, action: 'CANCELLATION', handshakeType: 'DELAY', timeoutAction: 'ACCEPT_CANCELLATION', expiresAt: expira, createdAt: agora.toISOString(),
      message: 'O pedido está demorando muito.',
      alternatives: [{ id: `${id}-tempo`, type: 'ADDITIONAL_TIME', metadata: { allowedsAdditionalTimeInMinutes: [10, 20, 30], allowedsAdditionalTimeReasons: ['HIGH_STORE_DEMAND', 'DRIVER_NOT_AVAILABLE', 'ORDER_OUT_FOR_DELIVERY'] } }],
      metadata: { acceptCancellationReasons: ['HIGH_STORE_DEMAND', 'DRIVER_NOT_AVAILABLE'] },
    };
  }
  if (tipo === 'preparo') {
    return { disputeId: id, action: 'CANCELLATION', handshakeType: 'PREPARATION_TIME', timeoutAction: 'REJECT_CANCELLATION', expiresAt: expira, createdAt: agora.toISOString(), message: 'Pedi errado, quero cancelar.', alternatives: null, metadata: {} };
  }
  if (tipo === 'parcial') {
    return {
      disputeId: id, action: 'PARTIAL_CANCELLATION', handshakeType: 'AFTER_DELIVERY_PARTIALLY', timeoutAction: 'ACCEPT_CANCELLATION', expiresAt: expira, createdAt: agora.toISOString(),
      message: 'Veio faltando um item.',
      alternatives: [{ id: `${id}-reemb`, type: 'REFUND', metadata: { maxAmount: { value: String(Math.round(total * 30)), currency: 'BRL' } } }],
      metadata: { items: [{ quantity: 1, amount: { value: String(Math.round(total * 30)), currency: 'BRL' }, reason: 'MISSING_ITEM' }], evidences: [{ url: 'https://exemplo/evidencia.jpg', contentType: 'image/jpeg' }] },
    };
  }
  return {
    disputeId: id, action: 'CANCELLATION', handshakeType: 'AFTER_DELIVERY', timeoutAction: 'ACCEPT_CANCELLATION', expiresAt: expira, createdAt: agora.toISOString(),
    message: 'A pizza chegou fria.',
    alternatives: [{ id: `${id}-reemb`, type: 'REFUND', metadata: { maxAmount: { value: max, currency: 'BRL' } } }],
    metadata: { evidences: [{ url: 'https://exemplo/foto.jpg', contentType: 'image/jpeg' }] },
  };
}
