// Catálogo da tela Aplicativos (D-042).
export type TipoIntegracao = 'pix' | 'meta_pixel' | 'google_analytics' | 'google_ads' | 'google_tag_manager' | 'google_avaliacao';
export type Integracao = { ativo: boolean; config: Record<string, string | null>; atualizado_em: string };
export type PainelAplicativos = {
  integracoes: Partial<Record<TipoIntegracao, Integracao>>;
  outras_lojas: number;
  link: string | null;
  pode_link: boolean;
  cardapios: { nome: string; slug: string; loja: string }[];
};

/** nativo: já faz parte do RES (abre a tela); config: liga aqui; link: link do grupo; breve: em breve; depois: combinado para mais tarde */
export type App = { id: string; nome: string; desc: string; icone: string; tipo: 'nativo' | 'config' | 'link' | 'breve' | 'depois' | 'api' | 'mcp'; href?: string; nota?: string };

export const CATALOGO: { titulo: string; apps: App[] }[] = [
  {
    titulo: 'Pagamentos',
    apps: [
      { id: 'pix', nome: 'Pix no cardápio', desc: 'QR Code e copia e cola com o valor exato do pedido', icone: '💠', tipo: 'config' },
      { id: 'mercadopago', nome: 'Mercado Pago', desc: 'Pix e cartão online com confirmação automática', icone: '💳', tipo: 'breve', nota: 'Precisa de uma conta de desenvolvedor no Mercado Pago (cada loja liga a própria conta).' },
      { id: 'tef', nome: 'Maquininha integrada (TEF)', desc: 'Stone e PayGo: o valor vai direto para a maquininha', icone: '🧾', tipo: 'breve' },
    ],
  },
  {
    titulo: 'Anúncios e medição',
    apps: [
      { id: 'meta_pixel', nome: 'Pixel do Meta', desc: 'Facebook e Instagram: mede visitas, carrinho e vendas', icone: '📘', tipo: 'config' },
      { id: 'google_analytics', nome: 'Google Analytics 4', desc: 'Visitas e vendas do cardápio digital', icone: '📊', tipo: 'config' },
      { id: 'google_ads', nome: 'Google Ads', desc: 'Conta cada pedido como conversão do anúncio', icone: '🎯', tipo: 'config' },
      { id: 'google_tag_manager', nome: 'Google Tag Manager', desc: 'Para quem já usa o Tag Manager com uma agência', icone: '🏷️', tipo: 'config' },
    ],
  },
  {
    titulo: 'Clientes e marketing',
    apps: [
      { id: 'google_avaliacao', nome: 'Avaliações no Google', desc: 'Pede avaliação no Google depois da entrega', icone: '⭐', tipo: 'config' },
      { id: 'segmentos', nome: 'Segmentação de clientes', desc: 'Fiéis, em risco, dormindo… com exportação', icone: '🧭', tipo: 'nativo', href: '/clientes' },
      { id: 'fidelidade', nome: 'Cashback e pontos', desc: 'Programa de fidelidade por loja', icone: '💚', tipo: 'nativo', href: '/fidelidade' },
      { id: 'cupons', nome: 'Cupons e promoções', desc: 'Cupons, % por categoria e preço De/Por', icone: '🏷', tipo: 'nativo', href: '/promocoes' },
      { id: 'sms', nome: 'Campanhas por SMS', desc: 'Envio para um segmento de clientes', icone: '✉️', tipo: 'breve', nota: 'Depende de contratar um provedor de SMS e do consentimento do cliente (LGPD).' },
      { id: 'whatsapp', nome: 'WhatsApp', desc: 'Avisos do pedido e campanhas', icone: '💬', tipo: 'breve', nota: 'Pela plataforma oficial do WhatsApp (Meta), com custo por mensagem.' },
    ],
  },
  {
    titulo: 'Delivery',
    apps: [
      { id: 'cardapio', nome: 'Cardápio digital', desc: 'Link e QR do seu cardápio, sem taxa por pedido', icone: '📱', tipo: 'nativo', href: '/delivery' },
      { id: 'link', nome: 'Link único do grupo', desc: 'Um link com todos os cardápios das suas lojas', icone: '🔗', tipo: 'link' },
      { id: 'ifood', nome: 'iFood', desc: 'Pedidos do iFood direto no quadro', icone: '🛵', tipo: 'depois', nota: 'Combinado para quando o sistema estiver mais avançado. Exige homologação no portal de parceiros do iFood.' },
      { id: 'marketplaces', nome: '99Food, Keeta, Rappi, Aiqfome', desc: 'Outros aplicativos de delivery', icone: '🧩', tipo: 'breve' },
    ],
  },
  {
    titulo: 'Entrega',
    apps: [
      { id: 'motoboy', nome: 'App do motoboy', desc: 'QR na comanda, rota sugerida e rastreio ao vivo', icone: '🏍️', tipo: 'nativo', href: '/entregas' },
      { id: 'frota', nome: 'Entregador sob demanda', desc: 'Uber Direct, 99 Entrega e similares', icone: '🚚', tipo: 'breve' },
    ],
  },
  {
    titulo: 'Cozinha e gestão',
    apps: [
      { id: 'impressao', nome: 'Impressão automática', desc: 'RES Impressão no computador da cozinha', icone: '🖨️', tipo: 'nativo', href: '/impressoras' },
      { id: 'estoque', nome: 'Estoque por NF-e', desc: 'XML da nota, ficha técnica e CMV', icone: '📦', tipo: 'nativo', href: '/estoque' },
      { id: 'kds', nome: 'Tela da cozinha (KDS)', desc: 'Pedidos numa TV ou tablet da cozinha', icone: '🍳', tipo: 'breve' },
      { id: 'api', nome: 'API aberta e webhooks', desc: 'Para integrar o RES com outros sistemas', icone: '🔌', tipo: 'api' },
      { id: 'mcp', nome: 'Conectar com IA', desc: 'Pergunte sobre suas vendas no ChatGPT ou no Claude', icone: '✨', tipo: 'mcp' },
    ],
  },
];

// ---- API aberta, webhooks e MCP (D-043)
export const ESCOPOS_API = [
  { id: 'vendas', rotulo: 'Vendas', desc: 'faturamento, pedidos por dia, mais vendidos' },
  { id: 'pedidos', rotulo: 'Pedidos', desc: 'pedidos com itens, cliente e pagamento' },
  { id: 'cardapio', rotulo: 'Cardápio', desc: 'produtos, preços e opções' },
  { id: 'clientes', rotulo: 'Clientes', desc: 'nome, telefone e segmento (dados pessoais)' },
  { id: 'estoque', rotulo: 'Estoque', desc: 'insumos, saldo e custo' },
] as const;
export const EVENTOS_WEBHOOK = [
  { id: 'pedido.criado', rotulo: 'Pedido novo' },
  { id: 'pedido.status', rotulo: 'Mudou de status' },
  { id: 'pedido.cancelado', rotulo: 'Cancelado' },
] as const;
export type ChaveApi = { id: string; nome: string; prefixo: string; escopos: string[]; criado_em: string; ultimo_uso: string | null; usos: number };
export type EnvioWebhook = { id: number; evento: string; status: 'pendente' | 'enviando' | 'ok' | 'erro' | 'desistiu'; resposta: number | null; erro: string | null; tentativas: number; em: string; numero: string | null };
export type Webhook = { id: string; url: string; eventos: string[]; ativo: boolean; segredo_fim: string; envios: EnvioWebhook[] };
export type PainelApi = { envio_automatico: boolean; chaves: ChaveApi[]; webhooks: Webhook[] };
