// Tipos do domínio de cardápio. Espelham as tabelas de supabase/migrations/*_cardapio.sql.
// Valores em dinheiro são inteiros em centavos (o banco guarda numeric(12,2)).

export type Centavos = number;

export type Canal = 'delivery' | 'presencial' | 'totem';

export type FormacaoPreco = 'soma' | 'brinde' | 'maior' | 'proporcional';

export interface ProdutoMarca {
  marcaId: string;
  ativo: boolean;
  delivery: boolean;
  presencial: boolean;
  totem: boolean;
  precoDelivery?: Centavos | null;
  precoPresencial?: Centavos | null;
  precoPromocional?: Centavos | null;
  /** % de desconto da categoria valendo agora (D-023); vale sobre o preço normal do canal */
  descontoPct?: number | null;
}

export interface Produto {
  id: string;
  nome: string;
  preco?: Centavos | null;
  marcas: ProdutoMarca[];
}

export interface Opcao {
  id: string;
  nome: string;
  /** Preço do item de origem (complemento ou produto). */
  precoItem: Centavos;
  /** Preço próprio da opção neste grupo; sobrepõe o do item. */
  preco?: Centavos | null;
  precoDelivery?: Centavos | null;
  precoPresencial?: Centavos | null;
  minQtd: number;
  maxQtd: number;
  ativo: boolean;
  delivery: boolean;
  presencial: boolean;
}

export interface Grupo {
  id: string;
  nome: string;
  formacao: FormacaoPreco;
  obrigatorio: boolean;
  pizza: boolean;
  minQtd: number;
  maxQtd: number;
  permiteRepetir: boolean;
  ativo: boolean;
  delivery: boolean;
  presencial: boolean;
  opcoes: Opcao[];
}

/** Escolhas do cliente: grupoId → (opcaoId → quantidade). */
export type Escolhas = Record<string, Record<string, number>>;
