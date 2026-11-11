/**
 * Marketplaces (D-074): traduz o pedido do iFood para o formato do RES, sem depender de rede.
 * Os campos seguem a Order API do iFood (v1.0). Valores do iFood vêm em reais; aqui saem em reais
 * (o banco do RES guarda numeric em reais). Testado em test/marketplace.test.ts.
 */

export type CanalExterno = 'ifood';

// ---------- Pedido do iFood (só o que o RES usa) ----------
export interface IfoodOpcao {
  id?: string;
  name: string;
  externalCode?: string;
  groupName?: string;
  quantity: number;
  unitPrice?: number;
  price?: number;
}
export interface IfoodItem {
  id?: string;
  name: string;
  externalCode?: string;
  quantity: number;
  unitPrice: number;
  optionsPrice?: number;
  totalPrice: number;
  price?: number;
  observations?: string;
  options?: IfoodOpcao[];
}
export interface IfoodPagamento {
  method: 'CASH' | 'CREDIT' | 'DEBIT' | 'MEAL_VOUCHER' | 'FOOD_VOUCHER' | 'PIX' | 'DIGITAL_WALLET' | 'GIFT_CARD' | 'OTHER' | string;
  type: 'ONLINE' | 'OFFLINE' | string;
  value: number;
  prepaid?: boolean;
  card?: { brand?: string };
  cash?: { changeFor?: number };
}
export interface IfoodBeneficio {
  value: number;
  target?: 'CART' | 'DELIVERY_FEE' | 'ITEM' | string;
  sponsorshipValues?: { name: 'IFOOD' | 'MERCHANT' | string; value: number; description?: string }[];
  campaign?: { name?: string };
}
export interface IfoodPedido {
  id: string;
  displayId?: string;
  orderType: 'DELIVERY' | 'TAKEOUT' | 'DINE_IN' | 'INDOOR' | string;
  orderTiming?: 'IMMEDIATE' | 'SCHEDULED' | string;
  salesChannel?: string;
  createdAt: string;
  preparationStartDateTime?: string;
  merchant: { id: string; name?: string };
  customer: { name: string; documentNumber?: string; phone?: { number?: string; localizer?: string; localizerExpiration?: string } };
  items: IfoodItem[];
  benefits?: IfoodBeneficio[];
  additionalFees?: { type: string; value: number; description?: string }[];
  total: { subTotal: number; deliveryFee: number; benefits?: number; additionalFees?: number; orderAmount: number };
  payments: { prepaid: number; pending: number; methods: IfoodPagamento[] };
  delivery?: {
    mode?: string;
    deliveredBy?: 'IFOOD' | 'MERCHANT' | string;
    deliveryDateTime?: string;
    observations?: string;
    pickupCode?: string;
    deliveryAddress?: {
      streetName?: string;
      streetNumber?: string;
      formattedAddress?: string;
      neighborhood?: string;
      complement?: string;
      reference?: string;
      postalCode?: string;
      city?: string;
      state?: string;
      coordinates?: { latitude: number; longitude: number };
    };
  };
  takeout?: { mode?: string; takeoutDateTime?: string };
  schedule?: { deliveryDateTimeStart?: string; deliveryDateTimeEnd?: string };
  extraInfo?: string;
  picking?: unknown;
}

// ---------- Formato do RES ----------
export type FormaRes = 'dinheiro' | 'pix' | 'cartao_credito' | 'cartao_debito' | 'vale_refeicao' | 'online';
export interface PedidoExterno {
  canal: CanalExterno;
  externo_id: string;
  externo_codigo: string;
  merchant_id: string;
  tipo: 'entrega' | 'retirada';
  agendado_para: string | null;
  cliente: { nome: string; telefone: string | null; localizador: string | null; documento: string | null };
  endereco: {
    logradouro: string;
    numero: string | null;
    bairro: string;
    complemento: string | null;
    referencia: string | null;
    cidade: string | null;
    cep: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
  itens: {
    externo_codigo: string | null;
    externo_id: string | null;
    nome: string;
    quantidade: number;
    preco_unitario: number;
    total: number;
    observacao: string | null;
    opcoes: { externo_codigo: string | null; grupo: string; nome: string; quantidade: number; preco: number }[];
  }[];
  subtotal: number;
  taxa_entrega: number;
  acrescimo: number;
  desconto: number;
  total: number;
  pagamento: FormaRes;
  pago_online: boolean;
  troco_para: number | null;
  cartao_bandeira: string | null;
  beneficios: { valor: number; alvo: string; loja: number; marketplace: number; descricao: string | null }[];
  codigo_retirada: string | null;
  entrega_pelo_marketplace: boolean;
  observacao: string | null;
  observacao_entrega: string | null;
}

const r2 = (v: number) => Math.round((Number(v) || 0) * 100) / 100;
const txt = (v: unknown, max = 300) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s.slice(0, max) : null;
};

/** Forma de pagamento principal: a de maior valor. Online (pré-pago) vira 'online', exceto Pix online, que fica 'pix'. */
function formaDoIfood(m: IfoodPagamento | undefined): FormaRes {
  if (!m) return 'online';
  const online = m.type === 'ONLINE' || m.prepaid === true;
  switch (m.method) {
    case 'CASH':
      return 'dinheiro';
    case 'CREDIT':
      return online ? 'online' : 'cartao_credito';
    case 'DEBIT':
      return online ? 'online' : 'cartao_debito';
    case 'MEAL_VOUCHER':
    case 'FOOD_VOUCHER':
      return online ? 'online' : 'vale_refeicao';
    case 'PIX':
      return online ? 'online' : 'pix';
    default:
      return 'online';
  }
}

/** Telefone do iFood costuma ser o 0800 com localizador; só guarda celular/fixo brasileiro de verdade. */
function telefoneReal(n: string | undefined): string | null {
  const d = (n ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (/^0800/.test(d) || d.length < 10 || d.length > 11) return null;
  return d;
}

/** Traduz o pedido do iFood (GET /order/v1.0/orders/{id}) para o pedido do RES. Lança se faltar o essencial. */
export function normalizarPedidoIfood(o: IfoodPedido): PedidoExterno {
  if (!o?.id || !o.merchant?.id) throw new Error('Pedido do iFood sem id ou loja.');
  if (!Array.isArray(o.items) || o.items.length === 0) throw new Error('Pedido do iFood sem itens.');
  const tipo: 'entrega' | 'retirada' = o.orderType === 'DELIVERY' ? 'entrega' : 'retirada';
  const ad = o.delivery?.deliveryAddress;
  const itens = o.items.map((i) => {
    const qtd = Math.max(1, Math.round(Number(i.quantity) || 1));
    const total = r2(i.totalPrice ?? (i.price ?? 0) + (i.optionsPrice ?? 0));
    return {
      externo_codigo: txt(i.externalCode, 80),
      externo_id: txt(i.id, 80),
      nome: txt(i.name, 200) ?? 'Item',
      quantidade: qtd,
      // preço por unidade já com as opções, para fechar item_total = unitário × quantidade
      preco_unitario: r2(total / qtd),
      total: r2(r2(total / qtd) * qtd),
      observacao: txt(i.observations, 300),
      opcoes: (i.options ?? []).map((op) => ({
        externo_codigo: txt(op.externalCode, 80),
        grupo: txt(op.groupName, 120) ?? 'Opções',
        nome: txt(op.name, 200) ?? 'Opção',
        quantidade: Math.max(1, Math.round(Number(op.quantity) || 1)),
        preco: r2(op.unitPrice ?? (op.price != null ? op.price / Math.max(1, op.quantity || 1) : 0)),
      })),
    };
  });
  const subtotal = r2(itens.reduce((a, i) => a + i.total, 0));
  const taxa = r2(o.total?.deliveryFee ?? 0);
  const acrescimo = r2(o.total?.additionalFees ?? (o.additionalFees ?? []).reduce((a, f) => a + (f.value || 0), 0));
  const beneficios = (o.benefits ?? []).map((b) => {
    const loja = r2((b.sponsorshipValues ?? []).filter((s) => s.name === 'MERCHANT').reduce((a, s) => a + s.value, 0));
    const mkt = r2((b.sponsorshipValues ?? []).filter((s) => s.name !== 'MERCHANT').reduce((a, s) => a + s.value, 0));
    return { valor: r2(b.value), alvo: b.target ?? 'CART', loja, marketplace: mkt, descricao: txt(b.campaign?.name, 120) };
  });
  const desconto = r2(o.total?.benefits ?? beneficios.reduce((a, b) => a + b.valor, 0));
  // o total do RES fecha sempre: subtotal + taxa + acréscimo − desconto (o do iFood vai junto para conferência)
  const total = r2(subtotal + taxa + acrescimo - desconto);
  const metodos = [...(o.payments?.methods ?? [])].sort((a, b) => (b.value || 0) - (a.value || 0));
  const principal = metodos[0];
  const dinheiro = metodos.find((m) => m.method === 'CASH');
  const cartao = metodos.find((m) => m.card?.brand);
  const agendado =
    o.orderTiming === 'SCHEDULED'
      ? o.schedule?.deliveryDateTimeStart ?? o.delivery?.deliveryDateTime ?? o.takeout?.takeoutDateTime ?? null
      : null;
  return {
    canal: 'ifood',
    externo_id: o.id,
    externo_codigo: txt(o.displayId, 20) ?? o.id.slice(0, 8),
    merchant_id: o.merchant.id,
    tipo,
    agendado_para: agendado,
    cliente: {
      nome: txt(o.customer?.name, 120) ?? 'Cliente iFood',
      telefone: telefoneReal(o.customer?.phone?.number),
      localizador: txt(o.customer?.phone?.localizer, 20),
      documento: txt((o.customer?.documentNumber ?? '').replace(/\D/g, ''), 14),
    },
    endereco:
      tipo === 'entrega'
        ? {
            logradouro: txt(ad?.streetName, 200) ?? txt(ad?.formattedAddress, 200) ?? 'Endereço no iFood',
            numero: txt(ad?.streetNumber, 20),
            bairro: txt(ad?.neighborhood, 120) ?? '—',
            complemento: txt(ad?.complement, 200),
            referencia: txt(ad?.reference, 200),
            cidade: txt(ad?.city, 120),
            cep: txt((ad?.postalCode ?? '').replace(/\D/g, ''), 8),
            lat: ad?.coordinates?.latitude ?? null,
            lng: ad?.coordinates?.longitude ?? null,
          }
        : null,
    itens,
    subtotal,
    taxa_entrega: taxa,
    acrescimo,
    desconto: Math.min(desconto, r2(subtotal + taxa + acrescimo)),
    total: Math.max(0, total),
    pagamento: formaDoIfood(principal),
    pago_online: (o.payments?.pending ?? 0) <= 0,
    troco_para: dinheiro?.cash?.changeFor ? r2(dinheiro.cash.changeFor) : null,
    cartao_bandeira: txt(cartao?.card?.brand, 40),
    beneficios,
    codigo_retirada: txt(o.delivery?.pickupCode, 20),
    entrega_pelo_marketplace: o.delivery?.deliveredBy === 'IFOOD',
    observacao: txt(o.extraInfo, 500),
    observacao_entrega: txt(o.delivery?.observations, 300),
  };
}

// ---------- Eventos ----------
/** Códigos de evento do iFood → o que o RES faz. */
export const EVENTOS_IFOOD: Record<string, { acao: 'criar' | 'status' | 'cancelar' | 'negociacao' | 'ignorar'; status?: 'em_preparo' | 'pronto' | 'em_entrega' | 'concluido'; rotulo: string }> = {
  PLC: { acao: 'criar', rotulo: 'Pedido novo' },
  PLACED: { acao: 'criar', rotulo: 'Pedido novo' },
  CFM: { acao: 'status', status: 'em_preparo', rotulo: 'Confirmado' },
  CONFIRMED: { acao: 'status', status: 'em_preparo', rotulo: 'Confirmado' },
  RTP: { acao: 'status', status: 'pronto', rotulo: 'Pronto para retirar' },
  READY_TO_PICKUP: { acao: 'status', status: 'pronto', rotulo: 'Pronto para retirar' },
  DSP: { acao: 'status', status: 'em_entrega', rotulo: 'Saiu para entrega' },
  DISPATCHED: { acao: 'status', status: 'em_entrega', rotulo: 'Saiu para entrega' },
  CON: { acao: 'status', status: 'concluido', rotulo: 'Concluído' },
  CONCLUDED: { acao: 'status', status: 'concluido', rotulo: 'Concluído' },
  CAN: { acao: 'cancelar', rotulo: 'Cancelado' },
  CANCELLED: { acao: 'cancelar', rotulo: 'Cancelado' },
  HSD: { acao: 'negociacao', rotulo: 'Negociação aberta' },
  HANDSHAKE_DISPUTE: { acao: 'negociacao', rotulo: 'Negociação aberta' },
  HSS: { acao: 'negociacao', rotulo: 'Negociação resolvida' },
  HANDSHAKE_SETTLEMENT: { acao: 'negociacao', rotulo: 'Negociação resolvida' },
};
export function acaoDoEvento(codigo: string) {
  return EVENTOS_IFOOD[codigo] ?? { acao: 'ignorar' as const, rotulo: codigo };
}

/** Status do RES → chamada que precisa ir para o iFood. */
export function acaoParaIfood(de: string, para: string, tipo: 'entrega' | 'retirada', entregaPeloMarketplace: boolean): 'confirm' | 'readyToPickup' | 'dispatch' | 'requestCancellation' | null {
  if (para === 'cancelado') return 'requestCancellation';
  if (de === 'novo' && para === 'em_preparo') return 'confirm';
  if (para === 'pronto' && (tipo === 'retirada' || entregaPeloMarketplace)) return 'readyToPickup';
  if (para === 'em_entrega' && tipo === 'entrega' && !entregaPeloMarketplace) return 'dispatch';
  return null;
}

/** Motivos de cancelamento padrão (usados no modo de teste; com o iFood ligado, vêm de /cancellationReasons). */
export const MOTIVOS_CANCELAMENTO_PADRAO: { codigo: string; descricao: string }[] = [
  { codigo: '501', descricao: 'Problemas de sistema' },
  { codigo: '502', descricao: 'Pedido em duplicidade' },
  { codigo: '503', descricao: 'Item indisponível' },
  { codigo: '504', descricao: 'Restaurante sem motoboy' },
  { codigo: '505', descricao: 'Cardápio desatualizado' },
  { codigo: '506', descricao: 'Pedido fora da área de entrega' },
  { codigo: '507', descricao: 'Cliente golpista / trote' },
  { codigo: '508', descricao: 'Fora do horário do delivery' },
  { codigo: '509', descricao: 'Dificuldades internas do restaurante' },
  { codigo: '511', descricao: 'Área de risco' },
  { codigo: '512', descricao: 'Restaurante abrirá mais tarde' },
  { codigo: '513', descricao: 'Restaurante fechou mais cedo' },
];

/** Pedido de exemplo (simulador do modo de teste): mesmo formato da Order API. */
export function pedidoIfoodExemplo(opcoes: {
  merchantId: string;
  tipo?: 'entrega' | 'retirada';
  agendado?: boolean;
  pagamento?: 'online' | 'dinheiro' | 'cartao_na_entrega';
  cupom?: boolean;
  itens?: { nome: string; externalCode?: string; preco: number; quantidade?: number; opcoes?: { grupo: string; nome: string; preco: number; externalCode?: string }[]; obs?: string }[];
  agora?: Date;
}): IfoodPedido {
  const agora = opcoes.agora ?? new Date();
  const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${agora.getTime()}-${Math.random().toString(16).slice(2)}`) as string;
  const its = (opcoes.itens?.length ? opcoes.itens : [{ nome: 'Pizza Grande', preco: 69.9, opcoes: [{ grupo: 'Sabores', nome: 'Calabresa', preco: 0 }, { grupo: 'Borda', nome: 'Catupiry', preco: 12 }], obs: 'Sem cebola' }]).map((i, k) => {
    const q = i.quantidade ?? 1;
    const opPreco = (i.opcoes ?? []).reduce((a, o) => a + o.preco, 0);
    return {
      id: `${id.slice(0, 8)}-${k}`,
      name: i.nome,
      externalCode: i.externalCode,
      quantity: q,
      unitPrice: i.preco,
      optionsPrice: r2(opPreco * q),
      price: r2(i.preco * q),
      totalPrice: r2((i.preco + opPreco) * q),
      observations: i.obs,
      options: (i.opcoes ?? []).map((o) => ({ name: o.nome, groupName: o.grupo, externalCode: o.externalCode, quantity: 1, unitPrice: o.preco, price: o.preco })),
    };
  });
  const sub = r2(its.reduce((a, i) => a + i.totalPrice, 0));
  const entrega = (opcoes.tipo ?? 'entrega') === 'entrega';
  const taxa = entrega ? 7.99 : 0;
  const ben = opcoes.cupom ? [{ value: 10, target: 'CART', sponsorshipValues: [{ name: 'IFOOD', value: 6 }, { name: 'MERCHANT', value: 4 }], campaign: { name: 'Cupom R$ 10' } }] : [];
  const descontos = ben.reduce((a, b) => a + b.value, 0);
  const total = r2(sub + taxa - descontos);
  const pag = opcoes.pagamento ?? 'online';
  const metodo: IfoodPagamento =
    pag === 'dinheiro'
      ? { method: 'CASH', type: 'OFFLINE', value: total, cash: { changeFor: Math.ceil(total / 50) * 50 } }
      : pag === 'cartao_na_entrega'
        ? { method: 'CREDIT', type: 'OFFLINE', value: total, card: { brand: 'MASTERCARD' } }
        : { method: 'CREDIT', type: 'ONLINE', value: total, prepaid: true, card: { brand: 'VISA' } };
  const inicio = new Date(agora.getTime() + 2 * 3600_000);
  return {
    id,
    displayId: String(1000 + Math.floor(Math.random() * 9000)),
    orderType: entrega ? 'DELIVERY' : 'TAKEOUT',
    orderTiming: opcoes.agendado ? 'SCHEDULED' : 'IMMEDIATE',
    salesChannel: 'IFOOD',
    createdAt: agora.toISOString(),
    merchant: { id: opcoes.merchantId, name: 'Loja teste' },
    customer: { name: 'Cliente Teste iFood', documentNumber: '12345678909', phone: { number: '0800 705 0070', localizer: '12345678' } },
    items: its,
    benefits: ben,
    additionalFees: [],
    total: { subTotal: sub, deliveryFee: taxa, benefits: descontos, additionalFees: 0, orderAmount: total },
    payments: { prepaid: pag === 'online' ? total : 0, pending: pag === 'online' ? 0 : total, methods: [metodo] },
    delivery: entrega
      ? {
          mode: 'DEFAULT',
          deliveredBy: 'MERCHANT',
          observations: 'Interfone 12',
          pickupCode: String(1000 + Math.floor(Math.random() * 9000)),
          deliveryAddress: { streetName: 'Rua XV de Novembro', streetNumber: '100', neighborhood: 'Centro', complement: 'Apto 3', reference: 'Perto da praça', city: 'Pomerode', state: 'SC', postalCode: '89107000' },
        }
      : { pickupCode: String(1000 + Math.floor(Math.random() * 9000)) },
    takeout: entrega ? undefined : { mode: 'DEFAULT', takeoutDateTime: opcoes.agendado ? inicio.toISOString() : undefined },
    schedule: opcoes.agendado ? { deliveryDateTimeStart: inicio.toISOString(), deliveryDateTimeEnd: new Date(inicio.getTime() + 30 * 60_000).toISOString() } : undefined,
  };
}
