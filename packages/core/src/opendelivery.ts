// Open Delivery 1.7.1 (Abrasel) — 99Food, Keeta e aiqfome (D-116). Sem rede: traduz pedido e eventos,
// monta o Merchant (cardápio + loja) e diz qual chamada fazer em cada mudança de status no RES.
// Spec técnica das integrações (12/11), seção 3. Valores do padrão em reais (value) — o RES guarda reais.
import type { CanalExterno, FormaRes, PedidoExterno } from './marketplace.js';

export const OD_VERSAO = '1.7.1';
export const CANAIS_OD = ['99food', 'keeta', 'aiqfome'] as const;
export type CanalOD = (typeof CANAIS_OD)[number];
export const eCanalOD = (c: string | null | undefined): c is CanalOD => !!c && (CANAIS_OD as readonly string[]).includes(c);

// ───────────────────────────── eventos ─────────────────────────────

export interface OdEvento {
  eventId: string;
  eventType: string;
  orderId: string;
  orderURL?: string;
  createdAt?: string;
  sourceAppId?: string;
  virtualBrand?: string;
}

export type AcaoEventoOD =
  | { acao: 'criar' }
  | { acao: 'status'; codigo: 'CONFIRMED' | 'READY_TO_PICKUP' | 'DISPATCHED' | 'CONCLUDED' }
  | { acao: 'cancelar' }
  | { acao: 'cancelamento_solicitado' }
  | { acao: 'cancelamento_negado' }
  | { acao: 'ignorar' };

/** Evento do padrão → o que o RES faz (o código de status já no nome que `aplicar_evento_externo` entende). */
export function acaoDoEventoOD(tipo: string): AcaoEventoOD {
  switch (tipo) {
    case 'CREATED':
      return { acao: 'criar' };
    case 'CONFIRMED':
      return { acao: 'status', codigo: 'CONFIRMED' };
    case 'READY_FOR_PICKUP':
      return { acao: 'status', codigo: 'READY_TO_PICKUP' };
    case 'DISPATCHED':
    case 'PICKED_UP':
      return { acao: 'status', codigo: 'DISPATCHED' };
    case 'DELIVERED':
    case 'CONCLUDED':
      return { acao: 'status', codigo: 'CONCLUDED' };
    case 'CANCELLED':
      return { acao: 'cancelar' };
    case 'CANCELLATION_REQUESTED':
    case 'ORDER_CANCELLATION_REQUEST':
      return { acao: 'cancelamento_solicitado' };
    case 'CANCELLATION_REQUEST_DENIED':
    case 'CANCELLED_DENIED':
      return { acao: 'cancelamento_negado' };
    default:
      return { acao: 'ignorar' };
  }
}

// ───────────────────────────── pedido ─────────────────────────────

type Valor = { value?: number; currency?: string };
export interface OdOpcao { id?: string; externalCode?: string; name?: string; quantity?: number; unitPrice?: Valor; totalPrice?: Valor; groupName?: string }
export interface OdItem {
  id?: string;
  externalCode?: string;
  name?: string;
  quantity?: number;
  unitPrice?: Valor;
  totalPrice?: Valor;
  specialInstructions?: string;
  options?: OdOpcao[];
}
export interface OdPedido {
  id: string;
  displayId?: string;
  createdAt?: string;
  type?: 'DELIVERY' | 'TAKEOUT' | 'INDOOR' | string;
  orderTiming?: 'INSTANT' | 'SCHEDULED' | string;
  schedule?: { scheduledDateTimeStart?: string; scheduledDateTimeEnd?: string };
  preparationStartDateTime?: string;
  merchant?: { id?: string; name?: string };
  customer?: { name?: string; phone?: { number?: string; extension?: string }; documentNumber?: string; ordersCountOnMerchant?: number };
  delivery?: {
    deliveredBy?: 'MERCHANT' | 'MARKETPLACE' | string;
    pickupCode?: string;
    estimatedDeliveryDateTime?: string;
    deliveryAddress?: {
      street?: string; number?: string; complement?: string; reference?: string; district?: string; city?: string; state?: string;
      postalCode?: string; formattedAddress?: string; coordinates?: { latitude?: number; longitude?: number };
    };
  };
  takeout?: { takeoutDateTime?: string };
  items?: OdItem[];
  otherFees?: { name?: string; type?: string; receivedBy?: string; price?: Valor }[];
  discounts?: { amount?: Valor; target?: string; sponsorshipValues?: { name?: string; amount?: Valor }[] }[];
  total?: { itemsPrice?: Valor; otherFees?: Valor; discount?: Valor; orderAmount?: Valor };
  payments?: { prepaid?: number; pending?: number; methods?: { type?: 'PREPAID' | 'PENDING' | string; method?: string; value?: number; brand?: string; changeFor?: number }[] };
  extraInfo?: string;
}

const r2 = (v: unknown) => Math.round((Number(v) || 0) * 100) / 100;
const txt = (v: unknown, max = 300) => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s.slice(0, max) : null;
};

/** Forma de pagamento do padrão → forma do RES (pré-pago no app vira 'online'). */
export function formaDoOD(m: { type?: string; method?: string } | undefined): FormaRes {
  if (!m) return 'online';
  if (m.type === 'PREPAID') return m.method === 'PIX' ? 'online' : 'online';
  switch (m.method) {
    case 'CASH':
      return 'dinheiro';
    case 'PIX':
      return 'pix';
    case 'CREDIT':
      return 'cartao_credito';
    case 'DEBIT':
    case 'CREDIT_DEBIT':
      return 'cartao_debito';
    case 'MEAL_VOUCHER':
    case 'FOOD_VOUCHER':
      return 'vale_refeicao';
    default:
      return 'online';
  }
}

function telefoneReal(n: string | undefined): string | null {
  const d = (n ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (/^0800/.test(d) || d.length < 10 || d.length > 11) return null;
  return d;
}

/** Order do Open Delivery → pedido canônico do RES. A conexão vem pela URL (marketplace_loja_id). */
export function normalizarPedidoOD(o: OdPedido, canal: CanalOD, marketplaceLojaId: string): PedidoExterno {
  if (!o?.id) throw new Error('Pedido do Open Delivery sem id.');
  if (!Array.isArray(o.items) || o.items.length === 0) throw new Error('Pedido do Open Delivery sem itens.');
  const tipo: PedidoExterno['tipo'] = o.type === 'DELIVERY' ? 'entrega' : o.type === 'INDOOR' ? 'balcao' : 'retirada';
  const ad = o.delivery?.deliveryAddress;
  const itens = o.items.map((i) => {
    const qtd = Math.max(1, Math.round(Number(i.quantity) || 1));
    const total = r2(i.totalPrice?.value ?? (i.unitPrice?.value ?? 0) * qtd + (i.options ?? []).reduce((a, op) => a + r2(op.totalPrice?.value ?? (op.unitPrice?.value ?? 0) * (op.quantity ?? 1)), 0) * qtd);
    return {
      externo_codigo: txt(i.externalCode, 80),
      externo_id: txt(i.id, 80),
      nome: txt(i.name, 200) ?? 'Item',
      quantidade: qtd,
      preco_unitario: r2(total / qtd),
      total: r2(r2(total / qtd) * qtd),
      observacao: txt(i.specialInstructions, 300),
      opcoes: (i.options ?? []).map((op) => ({
        externo_codigo: txt(op.externalCode, 80),
        grupo: txt(op.groupName, 120) ?? 'Opções',
        nome: txt(op.name, 200) ?? 'Opção',
        quantidade: Math.max(1, Math.round(Number(op.quantity) || 1)),
        preco: r2(op.unitPrice?.value ?? 0),
      })),
    };
  });
  const subtotal = r2(itens.reduce((a, i) => a + i.total, 0));
  const fees = o.otherFees ?? [];
  const taxa = r2(fees.filter((f) => f.type === 'DELIVERY_FEE').reduce((a, f) => a + r2(f.price?.value), 0));
  const acrescimo = r2(fees.filter((f) => f.type !== 'DELIVERY_FEE').reduce((a, f) => a + r2(f.price?.value), 0));
  const beneficios = (o.discounts ?? []).map((d) => {
    const loja = r2((d.sponsorshipValues ?? []).filter((s) => s.name === 'MERCHANT').reduce((a, s) => a + r2(s.amount?.value), 0));
    const valor = r2(d.amount?.value);
    return { valor, alvo: d.target ?? 'CART', loja, marketplace: r2(valor - loja), descricao: null };
  });
  const desconto = r2(beneficios.reduce((a, b) => a + b.valor, 0));
  const metodos = [...(o.payments?.methods ?? [])].sort((a, b) => (b.value || 0) - (a.value || 0));
  const principal = metodos[0];
  const dinheiro = metodos.find((m) => m.method === 'CASH');
  const cartao = metodos.find((m) => m.brand);
  const agendado = o.orderTiming === 'SCHEDULED' ? o.schedule?.scheduledDateTimeStart ?? null : null;
  const prazoAte = o.delivery?.estimatedDeliveryDateTime ?? o.takeout?.takeoutDateTime;
  const prazo = o.createdAt && prazoAte ? Math.round((Date.parse(prazoAte) - Date.parse(o.createdAt)) / 60000) : NaN;
  const telefone = telefoneReal(o.customer?.phone?.number);
  return {
    canal: canal as CanalExterno,
    externo_id: o.id,
    externo_codigo: txt(o.displayId, 20) ?? o.id.slice(0, 8),
    merchant_id: txt(o.merchant?.id, 80),
    marketplace_loja_id: marketplaceLojaId,
    tipo,
    agendado_para: agendado,
    cliente: {
      nome: txt(o.customer?.name, 120) ?? 'Cliente',
      telefone,
      localizador: txt(o.customer?.phone?.extension, 20),
      documento: txt((o.customer?.documentNumber ?? '').replace(/\D/g, ''), 14),
    },
    endereco:
      tipo === 'entrega'
        ? {
            logradouro: txt(ad?.street, 200) ?? txt(ad?.formattedAddress, 200) ?? 'Endereço no app',
            numero: txt(ad?.number, 20),
            bairro: txt(ad?.district, 120) ?? '—',
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
    total: Math.max(0, r2(subtotal + taxa + acrescimo - desconto)),
    pagamento: formaDoOD(principal),
    pago_online: (o.payments?.pending ?? metodos.filter((m) => m.type === 'PENDING').reduce((a, m) => a + (m.value || 0), 0)) <= 0,
    troco_para: dinheiro?.changeFor ? r2(dinheiro.changeFor) : null,
    cartao_bandeira: txt(cartao?.brand, 40),
    beneficios,
    codigo_retirada: txt(o.delivery?.pickupCode, 20),
    entrega_pelo_marketplace: o.delivery?.deliveredBy === 'MARKETPLACE',
    observacao: txt(o.extraInfo, 500),
    observacao_entrega: txt(ad?.reference, 300),
    telefone_mascarado: !!o.customer?.phone?.number && telefone === null,
    prazo_min: Number.isFinite(prazo) && prazo > 0 && prazo <= 1440 ? prazo : null,
    total_externo: o.total?.orderAmount?.value != null ? r2(o.total.orderAmount.value) : null,
    corpo_original: o,
  };
}

// ───────────────────────────── chamadas de saída ─────────────────────────────

/** Os 11 códigos de cancelamento pela loja no padrão. */
export const MOTIVOS_CANCELAMENTO_OD: { codigo: string; descricao: string }[] = [
  { codigo: 'SYSTEMIC_ISSUES', descricao: 'Problemas de sistema' },
  { codigo: 'DUPLICATE_APPLICATION', descricao: 'Pedido em duplicidade' },
  { codigo: 'UNAVAILABLE_ITEM', descricao: 'Item indisponível' },
  { codigo: 'RESTAURANT_WITHOUT_DELIVERY_PERSON', descricao: 'Sem entregador' },
  { codigo: 'OUTDATED_MENU', descricao: 'Cardápio desatualizado' },
  { codigo: 'ORDER_OUTSIDE_THE_DELIVERY_AREA', descricao: 'Fora da área de entrega' },
  { codigo: 'BLOCKED_CUSTOMER', descricao: 'Cliente bloqueado' },
  { codigo: 'OUTSIDE_DELIVERY_HOURS', descricao: 'Fora do horário' },
  { codigo: 'INTERNAL_DIFFICULTIES_OF_THE_RESTAURANT', descricao: 'Dificuldades internas da loja' },
  { codigo: 'RISK_AREA', descricao: 'Área de risco' },
  { codigo: 'DELIVERY_PROBLEM', descricao: 'Problema na entrega' },
];

/**
 * Ação da fila (marketplace_saida) → chamada do padrão. `aiqfome` usa `ready-for-pickup` com hífen.
 * Caminhos relativos à baseURL do marketplace (`…/v1`).
 */
export function chamadaOD(
  canal: CanalOD,
  acao: string,
  pedido: { externoId: string; numero?: number; preparoMin?: number; motivo?: string | null; entregador?: { nome?: string; telefone?: string } },
): { metodo: 'POST'; caminho: string; corpo: unknown } | null {
  const base = `/orders/${encodeURIComponent(pedido.externoId)}`;
  switch (acao) {
    case 'confirm':
      return { metodo: 'POST', caminho: `${base}/confirm`, corpo: { createdAt: new Date().toISOString(), orderExternalCode: String(pedido.numero ?? ''), preparationTime: pedido.preparoMin ?? 30, reason: 'Aceito pela loja' } };
    case 'preparing':
      return { metodo: 'POST', caminho: `${base}/preparing`, corpo: {} };
    case 'readyToPickup':
    case 'readyForPickup':
      return { metodo: 'POST', caminho: `${base}/${canal === 'aiqfome' ? 'ready-for-pickup' : 'readyForPickup'}`, corpo: {} };
    case 'dispatch':
      return { metodo: 'POST', caminho: `${base}/dispatch`, corpo: { deliveryTrackingInfo: { name: pedido.entregador?.nome ?? null, phone: pedido.entregador?.telefone ?? null } } };
    case 'delivered':
      return { metodo: 'POST', caminho: `${base}/delivered`, corpo: {} };
    case 'requestCancellation': {
      const m = (pedido.motivo ?? '').match(/^\s*\[?([A-Z_]{5,})/);
      const codigo = m && MOTIVOS_CANCELAMENTO_OD.some((x) => x.codigo === m[1]) ? m[1]! : 'INTERNAL_DIFFICULTIES_OF_THE_RESTAURANT';
      return { metodo: 'POST', caminho: `${base}/requestCancellation`, corpo: { reason: (pedido.motivo ?? 'Cancelado pela loja').slice(0, 250), code: codigo, mode: 'MANUAL', outOfStockItems: [] } };
    }
    case 'acceptCancellation':
      return { metodo: 'POST', caminho: `${base}/acceptCancellation`, corpo: {} };
    case 'denyCancellation':
      return { metodo: 'POST', caminho: `${base}/denyCancellation`, corpo: { reason: pedido.motivo ?? 'O pedido já está pronto', code: 'DISH_ALREADY_DONE' } };
    default:
      return null;
  }
}

// ───────────────────────────── Merchant (GET /merchant) ─────────────────────────────

/** Cardápio como sai de `cardapio_publico` (centavos) — só o que o Merchant usa. */
export interface BaseMerchant {
  conexao: { id: string; marca_id: string; atualizado_em: string };
  loja: { cnpj: string | null; razao_social: string | null; telefone: string | null; logradouro: string | null; numero: string | null; bairro: string | null; cidade: string | null; uf: string | null; cep: string | null; lat: number | null; lng: number | null; aberta: boolean };
  marca: { id: string; nome: string; logo_url: string | null; capa_url: string | null; whatsapp: string | null; pedido_minimo: number; tempo_preparo_min: number; aceita_entrega: boolean; aceita_retirada: boolean; horarios: { dia: number; abre: string; fecha: string }[] };
  raio_km: number | null;
  precos: Record<string, number>;
  setores: {
    id: string;
    nome: string;
    produtos: {
      id: string; nome: string; descricao: string | null; imagem_url: string | null; preco: number; preco_original: number | null; combo: boolean;
      grupos: { id: string; nome: string; formacao: string | null; pizza: boolean; min: number | null; max: number | null; obrigatorio: boolean; opcoes: { id: string; nome: string; preco: number; imagem_url: string | null }[] }[];
      passos?: { id: string; titulo: string; quantidade: number; produtos: { id: string; nome: string; preco: number }[] }[] | null;
    }[];
  }[];
}

const DIAS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;
const reais = (c: number) => ({ value: Math.round(c) / 100, currency: 'BRL' });

/** UUID estável a partir de um texto (o padrão pede uuid em grupos, opções e ofertas). */
export function uuidDe(texto: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  const hex: string[] = [];
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i < texto.length; i++) {
      h1 = Math.imul(h1 ^ texto.charCodeAt(i), 16777619) >>> 0;
      h2 = Math.imul(h2 ^ (texto.charCodeAt(i) + r * 31), 2246822519) >>> 0;
    }
    hex.push(((h1 ^ h2) >>> 0).toString(16).padStart(8, '0'));
    h1 = Math.imul(h1 ^ r, 2654435761) >>> 0;
  }
  const s = hex.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-5${s.slice(13, 16)}-${'89ab'[parseInt(s[16]!, 16) % 4]}${s.slice(17, 20)}-${s.slice(20, 32)}`;
}

function categoriaDaMarca(nome: string): string {
  const n = nome.toLowerCase();
  if (/pizz/.test(n)) return 'PIZZA';
  if (/burg|hamb|lanche|smash/.test(n)) return 'BURGERS';
  if (/hot ?dog|dog/.test(n)) return 'HOT_DOG';
  if (/sushi|japa|temaki/.test(n)) return 'JAPANESE';
  if (/a[cç]a[ií]|sorvet|gelat/.test(n)) return 'ICE_CREAM';
  if (/doce|confeit|bolo/.test(n)) return 'DESSERTS';
  if (/caf[eé]/.test(n)) return 'CAFE';
  if (/padar/.test(n)) return 'BAKERY';
  if (/pastel/.test(n)) return 'PASTRY';
  if (/churras|espeto/.test(n)) return 'BBQ';
  return 'BRAZILIAN';
}

/** O que falta na loja para o app aceitar o Merchant (aparece no card do canal). */
export function avisosMerchantOD(b: BaseMerchant): string[] {
  const a: string[] = [];
  if (!b.loja.cnpj) a.push('Cadastre o CNPJ da loja (Lojas e equipe → Dados da empresa).');
  if (!b.marca.logo_url) a.push('Cadastre o logo da marca (Cardápio digital → Vitrine): o app exige.');
  if (b.loja.lat == null || b.loja.lng == null) a.push('Marque a localização da loja (Entregas): o app usa para a área de entrega.');
  if (b.marca.aceita_entrega && !b.raio_km) a.push('Cadastre ao menos uma faixa de km (Delivery → Taxa por km): os apps só aceitam área por raio.');
  if (!b.marca.horarios.length) a.push('Cadastre os horários da marca.');
  if (!b.setores.some((s) => s.produtos.length)) a.push('O cardápio de delivery está vazio.');
  return a;
}

/** Monta o Merchant 1.7.1 a partir do cardápio do RES (um Merchant por marca). Conferido com o openapi.yaml 1.7.1. */
export function montarMerchantOD(b: BaseMerchant, agora = new Date()) {
  const horas = (h: { abre: string; fecha: string }) => ({
    startTime: `${h.abre.slice(0, 5)}:00`,
    endTime: h.fecha === '00:00' ? '23:59:00' : `${h.fecha.slice(0, 5)}:00`,
  });
  const weekHours = b.marca.horarios.map((h) => ({ dayOfWeek: [DIAS[h.dia] ?? 'MONDAY'], timePeriods: horas(h) }));
  const servicos = [
    ...(b.marca.aceita_entrega ? (['DELIVERY'] as const) : []),
    ...(b.marca.aceita_retirada ? (['TAKEOUT'] as const) : []),
  ].map((t) => ({
    id: uuidDe(`${b.conexao.id}:servico:${t}`),
    status: 'AVAILABLE',
    serviceType: t,
    serviceTiming: { timing: ['INSTANT'] },
    menuId: uuidDe(`${b.conexao.id}:menu`),
    ...(t === 'DELIVERY' && b.raio_km && b.loja.lat != null && b.loja.lng != null
      ? {
          serviceArea: {
            id: uuidDe(`${b.conexao.id}:area`),
            geoRadius: { geoMidpointLatitude: b.loja.lat, geoMidpointLongitude: b.loja.lng, radius: [{ size: Math.round(b.raio_km * 1000), estimateDeliveryTime: b.marca.tempo_preparo_min }] },
          },
        }
      : {}),
    serviceHours: { id: uuidDe(`${b.conexao.id}:horas:${t}`), weekHours },
  }));
  const categorias: unknown[] = [];
  const itens = new Map<string, unknown>();
  const ofertas: unknown[] = [];
  const grupos = new Map<string, unknown>();
  b.setores.forEach((s, si) => {
    const ofertasDaCategoria: string[] = [];
    for (const p of s.produtos) {
      const preco = b.precos[p.id] ?? p.preco;
      itens.set(p.id, { id: p.id, name: p.nome, description: p.descricao ?? '', externalCode: p.id, status: 'AVAILABLE', unit: 'UN', ...(p.imagem_url ? { image: { URL: p.imagem_url } } : {}) });
      const gruposDoItem = p.combo
        ? (p.passos ?? []).map((ps) => ({ id: uuidDe(`passo:${ps.id}`), externo: ps.id, nome: ps.titulo, min: ps.quantidade, max: ps.quantidade, metodo: 'SUM', opcoes: ps.produtos.map((x) => ({ id: uuidDe(`passo:${ps.id}:${x.id}`), item: x.id, nome: x.nome, preco: 0 })) }))
        : p.grupos.map((g) => ({
            id: g.id,
            externo: g.id,
            nome: g.nome,
            min: g.min ?? (g.obrigatorio ? 1 : 0),
            max: g.max ?? Math.max(1, g.opcoes.length),
            // fração de pizza: maior preço → MAX, proporcional/média → AVG; o resto soma
            metodo: g.pizza ? (g.formacao === 'maior' ? 'MAX' : g.formacao === 'proporcional' || g.formacao === 'media' ? 'AVG' : 'SUM') : 'SUM',
            opcoes: g.opcoes.map((o) => ({ id: o.id, item: o.id, nome: o.nome, preco: o.preco })),
          }));
      for (const g of gruposDoItem) {
        if (grupos.has(g.id)) continue;
        grupos.set(g.id, {
          id: g.id,
          index: grupos.size,
          name: g.nome,
          externalCode: g.externo,
          status: 'AVAILABLE',
          minPermitted: g.min,
          maxPermitted: g.max,
          priceMethod: g.metodo,
          options: g.opcoes.map((o, oi) => {
            // toda opção aponta para um Item (o padrão pede)
            if (!itens.has(o.item)) itens.set(o.item, { id: o.item, name: o.nome, description: '', externalCode: o.item, status: 'AVAILABLE', unit: 'UN' });
            return { id: o.id, itemId: o.item, index: oi, status: 'AVAILABLE', price: { ...reais(o.preco), originalValue: Math.round(o.preco) / 100 }, maxPermitted: g.max };
          }),
        });
      }
      const ofertaId = uuidDe(`oferta:${b.conexao.id}:${p.id}`);
      ofertas.push({
        id: ofertaId,
        itemId: p.id,
        index: ofertas.length,
        status: 'AVAILABLE',
        // o padrão exige originalValue: o preço "de" quando há promoção, senão o próprio preço
        price: { ...reais(preco), originalValue: (p.preco_original && p.preco_original > preco ? p.preco_original : Math.round(preco)) / 100 },
        optionGroupsId: gruposDoItem.map((g) => g.id),
      });
      ofertasDaCategoria.push(ofertaId);
    }
    categorias.push({ id: s.id, index: si, name: s.nome, externalCode: s.id, status: 'AVAILABLE', itemOfferId: ofertasDaCategoria });
  });
  const logo = b.marca.logo_url ?? b.marca.capa_url;
  return {
    lastUpdate: b.conexao.atualizado_em ?? agora.toISOString(),
    TTL: 3600,
    id: `${b.loja.cnpj ?? 'sem-cnpj'}-${b.conexao.id}`,
    status: b.loja.aberta ? 'AVAILABLE' : 'UNAVAILABLE',
    basicInfo: {
      name: b.marca.nome,
      document: b.loja.cnpj ?? '',
      corporateName: b.loja.razao_social ?? b.marca.nome,
      description: b.marca.nome,
      averagePreparationTime: b.marca.tempo_preparo_min,
      minOrderValue: reais(b.marca.pedido_minimo),
      merchantType: 'RESTAURANT',
      merchantCategories: [categoriaDaMarca(b.marca.nome)],
      address: {
        country: 'BR', state: b.loja.uf ?? '', city: b.loja.cidade ?? '', district: b.loja.bairro ?? '', street: b.loja.logradouro ?? '', number: b.loja.numero ?? '',
        postalCode: b.loja.cep ?? '', complement: '', reference: '', latitude: b.loja.lat ?? 0, longitude: b.loja.lng ?? 0,
      },
      contactEmails: [],
      contactPhones: { commercialNumber: b.marca.whatsapp ?? b.loja.telefone ?? '', ...(b.marca.whatsapp ? { whatsappNumber: b.marca.whatsapp } : {}) },
      logoImage: { URL: logo ?? '' },
      ...(b.marca.capa_url ? { bannerImage: { URL: b.marca.capa_url } } : {}),
      createdAt: b.conexao.atualizado_em,
    },
    services: servicos,
    menus: [{ id: uuidDe(`${b.conexao.id}:menu`), name: b.marca.nome, externalCode: b.marca.id, categoryId: b.setores.map((s) => s.id) }],
    categories: categorias,
    itemOffers: ofertas,
    items: [...itens.values()],
    optionGroups: [...grupos.values()],
    availabilities: [],
  };
}

/** Pedido fictício no formato Open Delivery 1.7.1 (simulador do modo teste). */
export function pedidoSimuladoOD(o: { tipo: 'entrega' | 'retirada'; pagamento: 'online' | 'dinheiro' | 'cartao_na_entrega'; cupom: boolean; itens: { nome: string; codigo: string; preco: number; quantidade: number; obs?: string }[]; agora?: Date }): OdPedido {
  const agora = o.agora ?? new Date();
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${agora.getTime()}-${Math.random().toString(16).slice(2)}`;
  const its = o.itens.length ? o.itens : [{ nome: 'Pizza Grande', codigo: 'simulado-pizza', preco: 69.9, quantidade: 1, obs: 'Sem cebola' }];
  const sub = r2(its.reduce((a, i) => a + i.preco * i.quantidade, 0));
  const taxa = o.tipo === 'entrega' ? 7 : 0;
  const desc = o.cupom ? 10 : 0;
  const total = r2(sub + taxa - desc);
  const metodo = o.pagamento === 'online' ? { type: 'PREPAID', method: 'CREDIT', value: total, brand: 'VISA' } : o.pagamento === 'dinheiro' ? { type: 'PENDING', method: 'CASH', value: total, changeFor: Math.ceil(total / 50) * 50 } : { type: 'PENDING', method: 'CREDIT', value: total, brand: 'MASTERCARD' };
  return {
    id,
    displayId: `S-${id.slice(0, 4).toUpperCase()}`,
    createdAt: agora.toISOString(),
    type: o.tipo === 'entrega' ? 'DELIVERY' : 'TAKEOUT',
    orderTiming: 'INSTANT',
    customer: { name: 'Cliente Simulado', phone: { number: '08007654321', extension: '123456' } },
    delivery: o.tipo === 'entrega' ? { deliveredBy: 'MERCHANT', estimatedDeliveryDateTime: new Date(agora.getTime() + 45 * 60000).toISOString(), deliveryAddress: { street: 'Rua XV de Novembro', number: '100', district: 'Centro', city: 'Pomerode', state: 'SC', postalCode: '89107-000', coordinates: { latitude: -26.7408, longitude: -49.1769 } } } : undefined,
    takeout: o.tipo === 'retirada' ? { takeoutDateTime: new Date(agora.getTime() + 30 * 60000).toISOString() } : undefined,
    items: its.map((i, k) => ({ id: `${id.slice(0, 8)}-${k}`, externalCode: i.codigo, name: i.nome, quantity: i.quantidade, unitPrice: { value: i.preco }, totalPrice: { value: r2(i.preco * i.quantidade) }, specialInstructions: i.obs })),
    otherFees: taxa ? [{ name: 'Entrega', type: 'DELIVERY_FEE', receivedBy: 'MERCHANT', price: { value: taxa } }] : [],
    discounts: desc ? [{ amount: { value: desc }, target: 'CART', sponsorshipValues: [{ name: 'MARKETPLACE', amount: { value: 6 } }, { name: 'MERCHANT', amount: { value: 4 } }] }] : [],
    total: { itemsPrice: { value: sub }, otherFees: { value: taxa }, discount: { value: desc }, orderAmount: { value: total } },
    payments: { prepaid: metodo.type === 'PREPAID' ? total : 0, pending: metodo.type === 'PENDING' ? total : 0, methods: [metodo] },
  };
}
