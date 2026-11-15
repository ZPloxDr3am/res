// Delivery Much (OpenAPI v2) e Rappi (portal de aliados): o RES é o CLIENTE — busca os pedidos (polling) e
// chama aceitar/pronto/cancelar (D-117). Aqui só a tradução; HTTP e segredos ficam no servidor.
import type { FormaRes, PedidoExterno } from './marketplace.js';

const r2 = (v: unknown) => Math.round((Number(v) || 0) * 100) / 100;
const txt = (v: unknown, max = 300) => {
  const s = typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '';
  return s ? s.slice(0, max) : null;
};
const telefoneReal = (n: unknown): string | null => {
  const d = String(n ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  return /^0800/.test(d) || d.length < 10 || d.length > 11 ? null : d;
};
const prazoDe = (criado: string | undefined, estimado: unknown): number | null => {
  let m = NaN;
  if (typeof estimado === 'number') m = estimado;
  else if (typeof estimado === 'string' && /^\d+$/.test(estimado)) m = Number(estimado);
  else if (typeof estimado === 'string' && criado) m = Math.round((Date.parse(estimado) - Date.parse(criado)) / 60000);
  return Number.isFinite(m) && m > 0 && m <= 1440 ? Math.round(m) : null;
};

export const CANAIS_CLIENTE = ['deliverymuch', 'rappi'] as const;
export type CanalCliente = (typeof CANAIS_CLIENTE)[number];
export const eCanalCliente = (c: string | null | undefined): c is CanalCliente => !!c && (CANAIS_CLIENTE as readonly string[]).includes(c);

/** Chamada HTTP de saída: caminho relativo à URL da API do canal. null = nada a enviar (marca como feito). */
export type ChamadaCanal = { metodo: 'PATCH' | 'PUT' | 'POST'; caminho: string; corpo: unknown } | null;

// ───────────────────────────── Delivery Much ─────────────────────────────

export interface DmItem { id?: string; id_erp?: string | null; name?: string; price?: number; quantity?: number }
export interface DmProduto {
  id?: string;
  id_erp?: string | null;
  name?: string;
  quantity?: number;
  total_price?: number;
  unit_price?: number;
  comment?: string | null;
  size_options?: { size?: { id?: string; name?: string; price?: number } } | null;
  groups?: { name?: string; rule?: 'SUM' | 'AVERAGE' | 'MAX_VALUE'; subgroups?: { name?: string; items?: DmItem[] }[] }[];
}
export interface DmPedido {
  id: string;
  code?: string | number;
  created_at?: string;
  status?: string;
  stage?: string;
  cancellation_reason?: string | null;
  scheduled?: boolean;
  scheduled_to?: string | null;
  company?: { id?: string; name?: string };
  consumer?: { name?: string; phone?: string | null; cpf?: string | null; orders_company?: number };
  delivery_form?: {
    method?: 'PICKUP' | 'DELIVERY';
    estimated_time?: number | string;
    address?: { street?: string; number?: string; complement?: string; reference?: string; district?: string; city?: string; state_acronym?: string; postal_code?: string; lat?: number; lng?: number };
  };
  payment?: {
    subtotal?: number;
    delivery?: number;
    total?: number;
    change?: number | null;
    coupon?: { code?: string; discount?: number } | null;
    payment_form?: { method?: 'MONEY' | 'MACHINE' | 'ONLINE'; change?: number | null; card?: { name?: string } | null };
  };
  fees?: { service_fee?: number };
  products?: DmProduto[];
  observation?: string | null;
}

/** Pedido do Delivery Much (vem inteiro no polling) → pedido canônico. */
export function normalizarPedidoDM(o: DmPedido, marketplaceLojaId: string): PedidoExterno {
  if (!o?.id) throw new Error('Pedido do Delivery Much sem id.');
  if (!Array.isArray(o.products) || o.products.length === 0) throw new Error('Pedido do Delivery Much sem itens.');
  const tipo: PedidoExterno['tipo'] = o.delivery_form?.method === 'DELIVERY' ? 'entrega' : 'retirada';
  const ad = o.delivery_form?.address;
  const itens = o.products.map((p) => {
    const qtd = Math.max(1, Math.round(Number(p.quantity) || 1));
    const opcoes = [
      ...(p.size_options?.size?.name ? [{ externo_codigo: txt(p.size_options.size.id, 80), grupo: 'Tamanho', nome: txt(p.size_options.size.name, 200)!, quantidade: 1, preco: r2(p.size_options.size.price) }] : []),
      ...(p.groups ?? []).flatMap((g) =>
        (g.subgroups ?? []).flatMap((sg) =>
          (sg.items ?? []).map((it) => ({ externo_codigo: txt(it.id_erp, 80) ?? txt(it.id, 80), grupo: txt(sg.name, 120) ?? txt(g.name, 120) ?? 'Opções', nome: txt(it.name, 200) ?? 'Opção', quantidade: Math.max(1, Math.round(Number(it.quantity) || 1)), preco: r2(it.price) })),
        ),
      ),
    ];
    const total = r2(p.total_price ?? (p.unit_price ?? 0) * qtd);
    return {
      externo_codigo: txt(p.id_erp, 80),
      externo_id: txt(p.id, 80),
      nome: txt(p.name, 200) ?? 'Item',
      quantidade: qtd,
      preco_unitario: r2(total / qtd),
      total: r2(r2(total / qtd) * qtd),
      observacao: txt(p.comment, 300),
      opcoes,
    };
  });
  const subtotal = r2(itens.reduce((a, i) => a + i.total, 0));
  const taxa = r2(o.payment?.delivery);
  const acrescimo = r2(o.fees?.service_fee);
  const cupom = r2(o.payment?.coupon?.discount);
  const forma = o.payment?.payment_form;
  const pagamento: FormaRes = forma?.method === 'MONEY' ? 'dinheiro' : forma?.method === 'MACHINE' ? (/d[eé]bito/i.test(forma.card?.name ?? '') ? 'cartao_debito' : /vale|refei|alim|sodexo|alelo|ticket|vr\b/i.test(forma.card?.name ?? '') ? 'vale_refeicao' : 'cartao_credito') : 'online';
  const troco = Number(forma?.change ?? o.payment?.change) || 0;
  const telefone = telefoneReal(o.consumer?.phone);
  return {
    canal: 'deliverymuch',
    externo_id: o.id,
    externo_codigo: txt(o.code, 20) ?? o.id.slice(0, 8),
    merchant_id: txt(o.company?.id, 80),
    marketplace_loja_id: marketplaceLojaId,
    tipo,
    agendado_para: o.scheduled ? o.scheduled_to ?? null : null,
    cliente: { nome: txt(o.consumer?.name, 120) ?? 'Cliente', telefone, localizador: null, documento: txt(String(o.consumer?.cpf ?? '').replace(/\D/g, ''), 14) },
    endereco:
      tipo === 'entrega'
        ? {
            logradouro: txt(ad?.street, 200) ?? 'Endereço no app',
            numero: txt(ad?.number, 20),
            bairro: txt(ad?.district, 120) ?? '—',
            complemento: txt(ad?.complement, 200),
            referencia: txt(ad?.reference, 200),
            cidade: txt(ad?.city, 120),
            cep: txt(String(ad?.postal_code ?? '').replace(/\D/g, ''), 8),
            lat: typeof ad?.lat === 'number' ? ad.lat : null,
            lng: typeof ad?.lng === 'number' ? ad.lng : null,
          }
        : null,
    itens,
    subtotal,
    taxa_entrega: taxa,
    acrescimo,
    desconto: Math.min(cupom, r2(subtotal + taxa + acrescimo)),
    total: Math.max(0, r2(subtotal + taxa + acrescimo - cupom)),
    pagamento,
    pago_online: forma?.method === 'ONLINE',
    troco_para: pagamento === 'dinheiro' && troco > 0 ? r2(troco) : null,
    cartao_bandeira: forma?.method === 'MACHINE' ? txt(forma.card?.name, 40) : null,
    // o cupom do Delivery Much é da loja (o franqueado combina); sem detalhe de quem paga
    beneficios: cupom > 0 ? [{ valor: cupom, alvo: 'CART', loja: cupom, marketplace: 0, descricao: txt(o.payment?.coupon?.code, 60) }] : [],
    codigo_retirada: null,
    entrega_pelo_marketplace: false,
    observacao: txt(o.observation, 500),
    observacao_entrega: txt(ad?.reference, 300),
    telefone_mascarado: false,
    prazo_min: prazoDe(o.created_at, o.delivery_form?.estimated_time),
    total_externo: o.payment?.total != null ? r2(o.payment.total) : null,
    corpo_original: o,
  };
}

/** Situação de um pedido do Delivery Much no polling → código de evento do RES (ou null se nada muda). */
export function eventoDoDM(o: Pick<DmPedido, 'status' | 'stage'>): 'CANCELLED' | 'CONCLUDED' | null {
  if (o.status === 'CANCELED' || o.status === 'CANCELLED') return 'CANCELLED';
  if (o.stage === 'DELIVERED' || o.status === 'CLOSED') return 'CONCLUDED';
  return null;
}

/**
 * Ações do RES (fila) → rota do Delivery Much. O aceite exige o "receive" antes (feito no polling).
 * Pronto e saiu para entrega são a mesma rota (ready): o servidor manda uma vez só.
 * Cancelar só antes do aceite (depois, o Delivery Much recusa e a fila mostra o erro).
 */
export function chamadaDM(acao: string, pedido: { externoId: string; motivo?: string | null; merchantId?: string | null }): ChamadaCanal {
  const id = encodeURIComponent(pedido.externoId);
  switch (acao) {
    case 'receive':
      return { metodo: 'PATCH', caminho: `/orders/${id}/receive`, corpo: {} };
    case 'confirm':
      return { metodo: 'PATCH', caminho: `/orders/${id}/accept`, corpo: {} };
    case 'readyToPickup':
    case 'dispatch':
      return { metodo: 'PATCH', caminho: `/orders/${id}/ready`, corpo: {} };
    case 'requestCancellation':
      return { metodo: 'PATCH', caminho: `/orders/${id}/cancel`, corpo: { reason: (pedido.motivo ?? 'Cancelado pela loja').replace(/^\s*\[?[A-Z0-9_]{3,}\]?\s*·\s*/, '').slice(0, 250) } };
    case 'pausar':
      return pedido.merchantId ? { metodo: 'PATCH', caminho: `/companies/${encodeURIComponent(pedido.merchantId)}/offline`, corpo: {} } : null;
    case 'abrir':
      return pedido.merchantId ? { metodo: 'PATCH', caminho: `/companies/${encodeURIComponent(pedido.merchantId)}/online`, corpo: {} } : null;
    default:
      return null;
  }
}

// ───────────────────────────── Rappi ─────────────────────────────

export interface RappiSubitem { sku?: string | null; id?: string | number; name?: string; type?: string; price?: number; quantity?: number }
export interface RappiItem { sku?: string | null; id?: string | number; name?: string; type?: string; comments?: string | null; price?: number; quantity?: number; subitems?: RappiSubitem[] }
export interface RappiPedido {
  order_detail: {
    order_id: string | number;
    created_at?: string;
    place_at?: string | null;
    delivery_method?: 'delivery' | 'marketplace' | 'pickup' | string;
    payment_method?: string;
    cooking_time?: number;
    delivery_information?: { street_name?: string; street_number?: string; neighborhood?: string; complement?: string; postal_code?: string; city?: string; complete_address?: string };
    totals?: { total_products?: number; total_discounts?: number; total_order?: number; total_to_pay?: number; charges?: { shipping?: number; service_fee?: number }; other_totals?: { tip?: number } };
    items?: RappiItem[];
    discounts?: { value?: number; amount_by_rappi?: number; amount_by_partner?: number; description?: string; type?: string }[];
    billing_information?: { document_number?: string } | null;
  };
  customer?: { first_name?: string; last_name?: string; phone_number?: string | null; document_number?: string | null };
  store?: { internal_id?: string | number; external_id?: string | null };
}

const ONLINE_RAPPI = new Set(['rappi_pay', 'cc', 'paypal', 'google_pay', 'apple_pay', 'nequi', 'pse', 'online']);
export function formaDaRappi(m: string | undefined): FormaRes {
  const x = (m ?? '').toLowerCase();
  if (x === 'cash') return 'dinheiro';
  if (x === 'pix') return 'pix';
  if (x === 'pos_terminal') return 'cartao_credito';
  if (x === 'dc') return 'cartao_debito';
  if (/sodexo|alelo|ticket|vale|vr_|pluxee/.test(x)) return 'vale_refeicao';
  return 'online';
}

/** Pedido da Rappi → pedido canônico. `centavos`: os exemplos do portal vêm em centavos (confirmar para o Brasil). */
export function normalizarPedidoRappi(o: RappiPedido, marketplaceLojaId: string, centavos = true): PedidoExterno {
  const d = o?.order_detail;
  if (!d?.order_id) throw new Error('Pedido da Rappi sem id.');
  if (!Array.isArray(d.items) || d.items.length === 0) throw new Error('Pedido da Rappi sem itens.');
  const v = (x: unknown) => r2(centavos ? (Number(x) || 0) / 100 : x);
  const tipo: PedidoExterno['tipo'] = d.delivery_method === 'pickup' ? 'retirada' : 'entrega';
  const itens = d.items.map((i) => {
    const qtd = Math.max(1, Math.round(Number(i.quantity) || 1));
    const opcoes = (i.subitems ?? []).map((s) => ({ externo_codigo: txt(s.sku, 80) ?? txt(s.id, 80), grupo: 'Adicionais', nome: txt(s.name, 200) ?? 'Opção', quantidade: Math.max(1, Math.round(Number(s.quantity) || 1)), preco: v(s.price) }));
    const unit = r2(v(i.price) + opcoes.reduce((a, op) => a + op.preco * op.quantidade, 0));
    return { externo_codigo: txt(i.sku, 80), externo_id: txt(i.id, 80), nome: txt(i.name, 200) ?? 'Item', quantidade: qtd, preco_unitario: unit, total: r2(unit * qtd), observacao: txt(i.comments, 300), opcoes };
  });
  const subtotal = r2(itens.reduce((a, i) => a + i.total, 0));
  const t = d.totals ?? {};
  const taxa = v(t.charges?.shipping);
  const acrescimo = r2(v(t.charges?.service_fee) + v(t.other_totals?.tip));
  const beneficios = (d.discounts ?? []).map((x) => {
    const loja = v(x.amount_by_partner);
    const valor = x.value != null ? v(x.value) : r2(loja + v(x.amount_by_rappi));
    return { valor, alvo: x.type === 'shipping' ? 'DELIVERY_FEE' : 'CART', loja, marketplace: r2(valor - loja), descricao: txt(x.description, 80) };
  });
  const desconto = beneficios.length ? r2(beneficios.reduce((a, b) => a + b.valor, 0)) : v(t.total_discounts);
  const pagamento = formaDaRappi(d.payment_method);
  const telefone = telefoneReal(o.customer?.phone_number);
  const ad = d.delivery_information;
  const nome = [o.customer?.first_name, o.customer?.last_name].filter(Boolean).join(' ');
  return {
    canal: 'rappi',
    externo_id: String(d.order_id),
    externo_codigo: String(d.order_id).slice(-8),
    merchant_id: txt(o.store?.internal_id, 80),
    marketplace_loja_id: marketplaceLojaId,
    tipo,
    agendado_para: d.place_at ?? null,
    cliente: { nome: txt(nome, 120) ?? 'Cliente', telefone, localizador: null, documento: txt(String(o.customer?.document_number ?? d.billing_information?.document_number ?? '').replace(/\D/g, ''), 14) },
    endereco:
      tipo === 'entrega'
        ? { logradouro: txt(ad?.street_name, 200) ?? txt(ad?.complete_address, 200) ?? 'Endereço no app', numero: txt(ad?.street_number, 20), bairro: txt(ad?.neighborhood, 120) ?? '—', complemento: txt(ad?.complement, 200), referencia: null, cidade: txt(ad?.city, 120), cep: txt(String(ad?.postal_code ?? '').replace(/\D/g, ''), 8), lat: null, lng: null }
        : null,
    itens,
    subtotal,
    taxa_entrega: taxa,
    acrescimo,
    desconto: Math.min(desconto, r2(subtotal + taxa + acrescimo)),
    total: Math.max(0, r2(subtotal + taxa + acrescimo - desconto)),
    pagamento,
    pago_online: pagamento === 'online' || ONLINE_RAPPI.has((d.payment_method ?? '').toLowerCase()),
    troco_para: null,
    cartao_bandeira: null,
    beneficios,
    codigo_retirada: null,
    entrega_pelo_marketplace: d.delivery_method === 'marketplace',
    observacao: null,
    observacao_entrega: null,
    telefone_mascarado: !!o.customer?.phone_number && telefone === null,
    prazo_min: null,
    total_externo: t.total_order != null ? v(t.total_order) : null,
    corpo_original: o,
  };
}

const RAPPI = '/api/v2/restaurants-integrations-public-api';
/** Ações do RES → rotas da Rappi. Saiu para entrega: a logística é da Rappi (nada a enviar). */
export function chamadaRappi(acao: string, pedido: { externoId: string; preparoMin?: number; motivo?: string | null }): ChamadaCanal {
  const id = encodeURIComponent(pedido.externoId);
  switch (acao) {
    case 'confirm':
      return { metodo: 'PUT', caminho: `${RAPPI}/orders/${id}/take/${Math.min(120, Math.max(5, Math.round(pedido.preparoMin ?? 20)))}`, corpo: {} };
    case 'readyToPickup':
      return { metodo: 'POST', caminho: `${RAPPI}/orders/${id}/ready-for-pickup`, corpo: {} };
    case 'requestCancellation':
      return { metodo: 'PUT', caminho: `${RAPPI}/orders/${id}/reject`, corpo: { reason: (pedido.motivo ?? 'Cancelado pela loja').replace(/^\s*\[?[A-Z0-9_]{3,}\]?\s*·\s*/, '').slice(0, 250) } };
    default:
      return null;
  }
}
export const CAMINHO_RAPPI = RAPPI;


// ───────────────────────────── simulador (modo teste) ─────────────────────────────

export type ItemSimulado = { nome: string; codigo: string; preco: number; quantidade: number; obs?: string };
export type OpcoesSimulacao = { tipo: 'entrega' | 'retirada'; pagamento: 'online' | 'dinheiro' | 'cartao_na_entrega'; cupom: boolean; itens: ItemSimulado[]; agora?: Date };

const idSimulado = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const ITENS_PADRAO: ItemSimulado[] = [{ nome: 'Pizza Grande', codigo: 'simulado-pizza', preco: 69.9, quantidade: 1, obs: 'Sem cebola' }];
const ENDERECO = { rua: 'Rua XV de Novembro', numero: '100', bairro: 'Centro', cidade: 'Pomerode', uf: 'SC', cep: '89107000', lat: -26.7408, lng: -49.1769 };

/** Pedido fictício no formato do app (o mesmo caminho de tradução do pedido real). */
export function pedidoSimuladoDM(o: OpcoesSimulacao): DmPedido {
  const its = o.itens.length ? o.itens : ITENS_PADRAO;
  const sub = r2(its.reduce((a, i) => a + i.preco * i.quantidade, 0));
  const taxa = o.tipo === 'entrega' ? 6 : 0;
  const cupom = o.cupom ? 5 : 0;
  const total = r2(sub + taxa - cupom);
  return {
    id: idSimulado(),
    code: `DM${Math.floor(1000 + Math.random() * 9000)}`,
    created_at: (o.agora ?? new Date()).toISOString(),
    status: 'OPENED',
    stage: 'WAITING_COMPANY',
    consumer: { name: 'Cliente Simulado DM', phone: '47999990001', cpf: null },
    delivery_form: { method: o.tipo === 'entrega' ? 'DELIVERY' : 'PICKUP', estimated_time: 45, address: o.tipo === 'entrega' ? { street: ENDERECO.rua, number: ENDERECO.numero, district: ENDERECO.bairro, city: ENDERECO.cidade, state_acronym: ENDERECO.uf, postal_code: ENDERECO.cep, lat: ENDERECO.lat, lng: ENDERECO.lng } : undefined },
    payment: { subtotal: sub, delivery: taxa, total, coupon: cupom ? { code: 'SIMULADO', discount: cupom } : null, payment_form: { method: o.pagamento === 'online' ? 'ONLINE' : o.pagamento === 'dinheiro' ? 'MONEY' : 'MACHINE', change: o.pagamento === 'dinheiro' ? Math.ceil(total / 50) * 50 : null, card: o.pagamento === 'cartao_na_entrega' ? { name: 'Visa Crédito' } : null } },
    products: its.map((i, k) => ({ id: `p${k}`, id_erp: i.codigo, name: i.nome, quantity: i.quantidade, total_price: r2(i.preco * i.quantidade), comment: i.obs ?? null })),
  };
}

export function pedidoSimuladoRappi(o: OpcoesSimulacao): RappiPedido {
  const its = o.itens.length ? o.itens : ITENS_PADRAO;
  const c = (v: number) => Math.round(v * 100);
  const sub = its.reduce((a, i) => a + c(i.preco) * i.quantidade, 0);
  const taxa = o.tipo === 'entrega' ? 800 : 0;
  const desc = o.cupom ? 500 : 0;
  return {
    order_detail: {
      order_id: String(Date.now()).slice(-10),
      created_at: (o.agora ?? new Date()).toISOString(),
      delivery_method: o.tipo === 'retirada' ? 'pickup' : 'marketplace',
      payment_method: o.pagamento === 'online' ? 'rappi_pay' : o.pagamento === 'dinheiro' ? 'cash' : 'pos_terminal',
      totals: { total_products: sub, total_discounts: desc, total_order: sub + taxa - desc, charges: { shipping: taxa, service_fee: 0 } },
      items: its.map((i, k) => ({ sku: i.codigo, id: k + 1, name: i.nome, price: c(i.preco), quantity: i.quantidade, comments: i.obs ?? null })),
      discounts: desc ? [{ value: desc, amount_by_rappi: 300, amount_by_partner: 200, type: 'offer', description: 'Cupom simulado' }] : [],
      delivery_information: o.tipo === 'entrega' ? { street_name: ENDERECO.rua, street_number: ENDERECO.numero, neighborhood: ENDERECO.bairro, city: ENDERECO.cidade, postal_code: ENDERECO.cep } : undefined,
    },
    customer: { first_name: 'Cliente', last_name: 'Simulado Rappi', phone_number: '47999990002' },
  };
}
