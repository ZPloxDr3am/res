// Equipe (D-051): funções explicadas em linguagem simples e as permissões que o dono pode ajustar.

export type Papel = 'dono' | 'gerente' | 'funcionario' | 'garcom' | 'entregador';

export type Funcao = {
  papel: Papel;
  nome: string;
  plural: string;
  icone: string;
  resumo: string;
  pode: string[];
  naoPode: string[];
  /** como a pessoa costuma entrar */
  entrada: 'usuario' | 'email' | 'qualquer';
  emBreve?: string;
};

export const FUNCOES: Record<Papel, Funcao> = {
  dono: {
    papel: 'dono',
    nome: 'Dono',
    plural: 'Donos',
    icone: '👑',
    resumo: 'Titular da conta. Faz tudo, inclusive criar gerentes e lojas.',
    pode: ['Tudo no painel, em todas as lojas da conta', 'Criar e tirar gerentes', 'Abrir novas lojas e cardápios'],
    naoPode: [],
    entrada: 'email',
  },
  gerente: {
    papel: 'gerente',
    nome: 'Gerente',
    plural: 'Gerentes',
    icone: '🧑‍💼',
    resumo: 'Cuida da loja junto com você, com acesso completo a esta loja.',
    pode: [
      'Pedidos, caixa, cardápio, delivery e entregas',
      'Relatórios, estoque, promoções e fidelidade',
      'Gestão Empresarial (custos, funcionários, faltas e advertências)',
      'Criar e cuidar dos usuários da equipe',
    ],
    naoPode: ['Criar ou tirar outros gerentes (só o dono)', 'Ver outras lojas a que não foi convidado'],
    entrada: 'qualquer',
  },
  funcionario: {
    papel: 'funcionario',
    nome: 'Caixa / Atendente',
    plural: 'Caixas e atendentes',
    icone: '🧾',
    resumo: 'Atende, lança e acompanha pedidos e opera o caixa. Você escolhe o que mais ele pode.',
    pode: [], // vem das permissões da loja (aba Funções e permissões)
    naoPode: ['Gestão Empresarial (custos e dados dos funcionários)', 'Criar usuários ou mudar funções', 'Dados da empresa e plano'],
    entrada: 'usuario',
  },
  entregador: {
    papel: 'entregador',
    nome: 'Motoboy',
    plural: 'Motoboys',
    icone: '🛵',
    resumo: 'Usa só o app de entregas no celular. Não vê o painel.',
    pode: [
      'Ler o QR da comanda para sair com o pedido',
      'Ver endereço, rota no Maps/Waze e quanto cobrar',
      'Marcar como entregue e ver o resumo do dia',
    ],
    naoPode: ['Abrir o painel, o caixa ou o cardápio'],
    entrada: 'usuario',
  },
  garcom: {
    papel: 'garcom',
    nome: 'Garçom',
    plural: 'Garçons',
    icone: '🍽️',
    resumo: 'Vai lançar pedidos nas mesas e comandas.',
    pode: [],
    naoPode: [],
    entrada: 'usuario',
    emBreve: 'Chega junto com Mesas e comandas.',
  },
};

/** Ordem em que as funções aparecem na tela. */
export const ORDEM_FUNCOES: Papel[] = ['dono', 'gerente', 'funcionario', 'entregador', 'garcom'];

/** O que o dono pode liberar para o Caixa / Atendente (mesma lista do banco, 0053). */
export const PERMISSOES_EQUIPE: { chave: string; titulo: string; ajuda: string }[] = [
  { chave: 'pedidos_delivery', titulo: 'Pedidos', ajuda: 'Ver, aceitar, lançar pedidos e mudar a etapa no quadro.' },
  { chave: 'caixa', titulo: 'Caixa', ajuda: 'Abrir e fechar o caixa, sangria e suprimento.' },
  { chave: 'cardapio', titulo: 'Cardápio', ajuda: 'Editar produtos, preços, fotos e grupos de opções.' },
  { chave: 'cardapio_visibilidade', titulo: 'Pausar itens', ajuda: 'Marcar produto como esgotado ou pausado.' },
  { chave: 'clientes', titulo: 'Clientes', ajuda: 'Ver o cadastro e os telefones dos clientes.' },
  { chave: 'estoque', titulo: 'Estoque', ajuda: 'Lançar entradas, notas fiscais e contagens.' },
  { chave: 'impressoras', titulo: 'Impressoras', ajuda: 'Configurar impressoras e reimprimir comandas.' },
  { chave: 'cardapio_digital', titulo: 'Delivery', ajuda: 'Abrir/fechar a loja, horários, bairros e taxas.' },
  { chave: 'marketing', titulo: 'Promoções e fidelidade', ajuda: 'Cupons, promoções e programa de fidelidade.' },
  { chave: 'relatorios', titulo: 'Relatórios', ajuda: 'Faturamento, desempenho e tempos de entrega.' },
  { chave: 'caixas_cadastro', titulo: 'Cadastro de caixas', ajuda: 'Criar caixas e definir quem opera cada um.' },
];

/** Sugestão de usuário a partir do nome: "Ana Souza" + caixa → "ana.caixa". */
export function sugerirUsuario(nome: string, papel: Papel): string {
  const primeiro = nome.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().split(/\s+/)[0]?.replace(/[^a-z0-9]/g, '') ?? '';
  const sufixo = papel === 'entregador' ? 'moto' : papel === 'gerente' ? 'gerente' : papel === 'garcom' ? 'garcom' : 'caixa';
  return primeiro.length >= 2 ? `${primeiro}.${sufixo}`.slice(0, 30) : '';
}

/** Senha fácil de ditar: 4 letras + 4 números, sem letras parecidas (l, o, i). */
export function gerarSenha(): string {
  const letras = 'abcdefghjkmnpqrstuvwxyz';
  const n = new Uint32Array(8);
  crypto.getRandomValues(n);
  return Array.from(n, (v, i) => (i < 4 ? letras[v % letras.length] : String(v % 10))).join('');
}

export const iniciais = (nome: string) =>
  nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
