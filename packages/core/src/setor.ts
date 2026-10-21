// Regras do formulário de setor (R-001, R-002, D-007).

export interface SetorForm {
  nome: string;
  nomePublico?: string | null;
  delivery: boolean;
  presencial: boolean;
  marcas: string[];
}

/** R-002: setor novo nasce nos dois canais e em todas as marcas. */
export function novoSetor(todasAsMarcas: string[]): SetorForm {
  return { nome: '', nomePublico: null, delivery: true, presencial: true, marcas: [...todasAsMarcas] };
}

export function validarSetor(s: SetorForm): string[] {
  const erros: string[] = [];
  const nome = s.nome.trim();
  if (!nome) erros.push('Informe o nome da categoria.');
  if ([...nome].length > 150) erros.push('O nome pode ter até 150 caracteres.');
  if (s.nomePublico && [...s.nomePublico].length > 150) erros.push('O nome público pode ter até 150 caracteres.');
  if (s.marcas.length === 0) erros.push('A categoria precisa estar em pelo menos uma marca.'); // R-001, com mensagem clara (T-001)
  return erros;
}

/** R-003: setor sem canais não aparece no cardápio digital nem na tela de pedidos. */
export const setorVisivel = (s: Pick<SetorForm, 'delivery' | 'presencial'>, canal: 'delivery' | 'presencial') =>
  canal === 'delivery' ? s.delivery : s.presencial;
