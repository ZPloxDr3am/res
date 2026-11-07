// Cadastro sozinho (D-076): o restaurante cria a conta, a loja e o cardápio sem ajuda,
// e o painel mostra os "Primeiros passos" até o cardápio estar pronto para vender.

export const TIPOS_RESTAURANTE = [
  { id: 'pizzaria', rotulo: 'Pizzaria', emoji: '🍕' },
  { id: 'hamburgueria', rotulo: 'Hamburgueria', emoji: '🍔' },
  { id: 'lanchonete', rotulo: 'Lanchonete', emoji: '🥪' },
  { id: 'restaurante', rotulo: 'Restaurante / marmitaria', emoji: '🍛' },
  { id: 'japones', rotulo: 'Japonês', emoji: '🍣' },
  { id: 'acai', rotulo: 'Açaí e sorvetes', emoji: '🍧' },
  { id: 'doceria', rotulo: 'Doceria / confeitaria', emoji: '🍰' },
  { id: 'outro', rotulo: 'Outro', emoji: '🍽️' },
] as const;
export type TipoRestaurante = (typeof TIPOS_RESTAURANTE)[number]['id'];
export const tipoRestauranteValido = (s: string): s is TipoRestaurante => TIPOS_RESTAURANTE.some((x) => x.id === s);

/** Endereço do cardápio a partir do nome: "Pizzaria do Zé!" → "pizzaria-do-ze". Mesmo formato que o banco aceita. */
export function sugerirSlug(nome: string): string {
  const base = nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return base.length >= 3 ? base : base ? `${base}-delivery` : '';
}
export const slugValido = (s: string) => /^[a-z0-9]([a-z0-9-]{1,58}[a-z0-9])?$/.test(s);

/** Texto que marca um produto de exemplo ainda não editado. */
export const DESCRICAO_EXEMPLO = 'Exemplo: troque nome, foto, descrição e preço.';

export type CardapioExemplo = { categoria: string; produtos: { nome: string; preco: number }[] }[];

/** Cardápio de exemplo por tipo de restaurante: só para não começar do zero (tudo editável). */
export const CARDAPIO_EXEMPLO: Record<TipoRestaurante, CardapioExemplo> = {
  pizzaria: [
    { categoria: 'Pizzas', produtos: [{ nome: 'Pizza Calabresa (grande)', preco: 59.9 }, { nome: 'Pizza Margherita (grande)', preco: 59.9 }, { nome: 'Pizza Frango com Catupiry (grande)', preco: 64.9 }, { nome: 'Pizza Portuguesa (grande)', preco: 64.9 }] },
    { categoria: 'Pizzas doces', produtos: [{ nome: 'Pizza de Chocolate (média)', preco: 44.9 }] },
    { categoria: 'Bebidas', produtos: [{ nome: 'Refrigerante 2 L', preco: 14 }, { nome: 'Refrigerante lata', preco: 6.5 }, { nome: 'Água mineral', preco: 4 }] },
  ],
  hamburgueria: [
    { categoria: 'Hambúrgueres', produtos: [{ nome: 'X-Burguer', preco: 26.9 }, { nome: 'X-Salada', preco: 28.9 }, { nome: 'X-Bacon', preco: 32.9 }, { nome: 'Smash duplo', preco: 34.9 }] },
    { categoria: 'Porções', produtos: [{ nome: 'Batata frita', preco: 19.9 }, { nome: 'Onion rings', preco: 22.9 }] },
    { categoria: 'Bebidas', produtos: [{ nome: 'Refrigerante lata', preco: 6.5 }, { nome: 'Suco natural', preco: 9 }] },
  ],
  lanchonete: [
    { categoria: 'Lanches', produtos: [{ nome: 'Misto quente', preco: 12 }, { nome: 'X-Tudo', preco: 29.9 }, { nome: 'Cachorro-quente', preco: 15 }] },
    { categoria: 'Salgados', produtos: [{ nome: 'Coxinha', preco: 7 }, { nome: 'Pastel de carne', preco: 9 }] },
    { categoria: 'Bebidas', produtos: [{ nome: 'Refrigerante lata', preco: 6.5 }, { nome: 'Suco natural', preco: 9 }] },
  ],
  restaurante: [
    { categoria: 'Pratos do dia', produtos: [{ nome: 'Marmita média', preco: 22 }, { nome: 'Marmita grande', preco: 27 }, { nome: 'Prato executivo', preco: 32 }] },
    { categoria: 'Acompanhamentos', produtos: [{ nome: 'Porção de fritas', preco: 15 }, { nome: 'Salada', preco: 10 }] },
    { categoria: 'Bebidas', produtos: [{ nome: 'Refrigerante lata', preco: 6.5 }, { nome: 'Suco natural', preco: 9 }] },
  ],
  japones: [
    { categoria: 'Combinados', produtos: [{ nome: 'Combinado 20 peças', preco: 69.9 }, { nome: 'Combinado 40 peças', preco: 119.9 }] },
    { categoria: 'Temakis', produtos: [{ nome: 'Temaki salmão', preco: 29.9 }, { nome: 'Temaki skin', preco: 24.9 }] },
    { categoria: 'Bebidas', produtos: [{ nome: 'Refrigerante lata', preco: 6.5 }, { nome: 'Chá gelado', preco: 8 }] },
  ],
  acai: [
    { categoria: 'Açaí', produtos: [{ nome: 'Açaí 300 ml', preco: 16 }, { nome: 'Açaí 500 ml', preco: 22 }, { nome: 'Açaí 700 ml', preco: 28 }] },
    { categoria: 'Sorvetes', produtos: [{ nome: 'Milk-shake 400 ml', preco: 18 }, { nome: 'Sundae', preco: 14 }] },
  ],
  doceria: [
    { categoria: 'Bolos', produtos: [{ nome: 'Fatia de bolo', preco: 12 }, { nome: 'Bolo inteiro (1 kg)', preco: 79.9 }] },
    { categoria: 'Doces', produtos: [{ nome: 'Brigadeiro (unidade)', preco: 3.5 }, { nome: 'Caixa com 12 doces', preco: 36 }, { nome: 'Torta (fatia)', preco: 14 }] },
    { categoria: 'Bebidas', produtos: [{ nome: 'Café', preco: 5 }, { nome: 'Refrigerante lata', preco: 6.5 }] },
  ],
  outro: [
    { categoria: 'Principais', produtos: [{ nome: 'Produto 1', preco: 25 }, { nome: 'Produto 2', preco: 30 }, { nome: 'Produto 3', preco: 35 }] },
    { categoria: 'Bebidas', produtos: [{ nome: 'Refrigerante lata', preco: 6.5 }, { nome: 'Água mineral', preco: 4 }] },
  ],
};

/** Estado da loja que o banco devolve (public.primeiros_passos). */
export interface EstadoPrimeirosPassos {
  cidade: boolean;
  whatsapp: boolean;
  produtos: number;
  produtos_exemplo: number;
  logo: boolean;
  horarios: number;
  entrega: boolean;
  impressoras: number;
  equipe: number;
  cardapio_aberto: boolean;
  slug: string | null;
}

export type IdPasso = 'dados' | 'cardapio' | 'vitrine' | 'horarios' | 'entrega' | 'abrir' | 'impressora' | 'equipe';
export interface Passo {
  id: IdPasso;
  titulo: string;
  explicacao: string;
  feito: boolean;
  opcional: boolean;
  href: string;
  botao: string;
  aviso?: string;
}

/** Lista de primeiros passos com o que já foi feito. Os obrigatórios vêm antes de abrir o cardápio. */
export function primeirosPassos(e: EstadoPrimeirosPassos): { passos: Passo[]; feitos: number; obrigatorios: number; obrigatoriosFeitos: number; pronto: boolean } {
  const reais = e.produtos - e.produtos_exemplo;
  const passos: Passo[] = [
    { id: 'dados', titulo: 'Dados do restaurante', explicacao: 'Cidade e WhatsApp: aparecem no cardápio e no cupom.', feito: e.cidade && e.whatsapp, opcional: false, href: '/delivery', botao: 'Preencher' },
    {
      id: 'cardapio', titulo: 'Cardápio com seus produtos', explicacao: 'Pelo menos 3 produtos seus, com preço (os de exemplo só contam depois de editados).',
      feito: reais >= 3, opcional: false, href: '/cardapio', botao: 'Montar cardápio',
      aviso: e.produtos_exemplo > 0 ? `${e.produtos_exemplo} produto(s) de exemplo ainda sem editar: troque nome, preço e descrição.` : undefined,
    },
    { id: 'vitrine', titulo: 'Logo e capa', explicacao: 'Deixa o cardápio com a cara do seu restaurante.', feito: e.logo, opcional: false, href: '/delivery', botao: 'Enviar logo' },
    { id: 'horarios', titulo: 'Horário de funcionamento', explicacao: 'O cardápio abre e fecha sozinho nesses horários.', feito: e.horarios > 0, opcional: false, href: '/delivery', botao: 'Definir horários' },
    { id: 'entrega', titulo: 'Entrega ou retirada', explicacao: 'Bairros e taxas, taxa por km, ou só retirada no balcão.', feito: e.entrega, opcional: false, href: '/delivery', botao: 'Configurar entrega' },
    { id: 'abrir', titulo: 'Abrir o cardápio', explicacao: 'Quando estiver tudo certo, abra e divulgue o link.', feito: e.cardapio_aberto, opcional: false, href: '/comecar#abrir', botao: 'Abrir' },
    { id: 'impressora', titulo: 'Impressora da cozinha', explicacao: 'Pedido impresso sozinho assim que é aceito.', feito: e.impressoras > 0, opcional: true, href: '/impressoras', botao: 'Ligar impressora' },
    { id: 'equipe', titulo: 'Equipe', explicacao: 'Acesso para caixa, gerente e motoboys.', feito: e.equipe > 1, opcional: true, href: '/lojas', botao: 'Convidar' },
  ];
  const obrig = passos.filter((p) => !p.opcional);
  const obrigatoriosFeitos = obrig.filter((p) => p.feito).length;
  return { passos, feitos: passos.filter((p) => p.feito).length, obrigatorios: obrig.length, obrigatoriosFeitos, pronto: obrigatoriosFeitos === obrig.length };
}

/** O que falta antes de poder abrir o cardápio (abrir sem produto ou sem entrega/retirada não faz sentido). */
export function faltaParaAbrir(e: EstadoPrimeirosPassos): string[] {
  const falta: string[] = [];
  if (e.produtos < 1) falta.push('cadastrar produtos');
  if (e.horarios < 1) falta.push('definir o horário de funcionamento');
  if (!e.entrega) falta.push('configurar entrega ou retirada');
  return falta;
}

/** Versão dos termos aceitos no cadastro (muda quando o texto mudar). */
export const VERSAO_TERMOS = '2026-11-07';
