// Regras do formulário de grupo de opções. As mesmas regras valem no banco (D-003):
// constraints grupo_obrigatorio_min e grupo_max_ge_min.

export interface GrupoForm {
  nome: string;
  obrigatorio: boolean;
  minQtd: number;
  maxQtd: number;
}

/** R-011: marcar "obrigatório" sobe o mínimo de 0 para 1. */
export function marcarObrigatorio<T extends GrupoForm>(g: T, obrigatorio: boolean): T {
  return { ...g, obrigatorio, minQtd: obrigatorio ? Math.max(1, g.minQtd) : g.minQtd };
}

/** R-012: mínimo acima do máximo leva o máximo junto. */
export function alterarMinimo<T extends GrupoForm>(g: T, minQtd: number): T {
  const min = Math.max(0, Math.trunc(minQtd));
  return { ...g, minQtd: min, maxQtd: Math.max(g.maxQtd, min, 1) };
}

/** Máximo abaixo do mínimo leva o mínimo junto (simétrico a R-012). */
export function alterarMaximo<T extends GrupoForm>(g: T, maxQtd: number): T {
  const max = Math.max(1, Math.trunc(maxQtd));
  return { ...g, maxQtd: max, minQtd: Math.min(g.minQtd, max) };
}

export interface ErroCampo {
  campo: keyof GrupoForm;
  mensagem: string;
}

/** Validação idêntica à do banco: o formulário nunca mostra algo que o servidor vai mudar (B-006). */
export function validarGrupo(g: GrupoForm): ErroCampo[] {
  const erros: ErroCampo[] = [];
  const nome = g.nome.trim();
  if (nome.length === 0) erros.push({ campo: 'nome', mensagem: 'Informe o nome do grupo.' });
  if (nome.length > 100) erros.push({ campo: 'nome', mensagem: 'O nome pode ter até 100 caracteres.' });
  if (!Number.isInteger(g.minQtd) || g.minQtd < 0) erros.push({ campo: 'minQtd', mensagem: 'O mínimo não pode ser negativo.' });
  if (!Number.isInteger(g.maxQtd) || g.maxQtd < 1) erros.push({ campo: 'maxQtd', mensagem: 'O máximo deve ser pelo menos 1.' });
  if (g.maxQtd < g.minQtd) erros.push({ campo: 'maxQtd', mensagem: 'O máximo não pode ser menor que o mínimo.' });
  if (g.obrigatorio && g.minQtd < 1) erros.push({ campo: 'minQtd', mensagem: 'Grupo obrigatório precisa de mínimo 1 ou mais.' });
  return erros;
}

/** Frase que o formulário mostra abaixo de "Obrigatório". */
export function descreverSelecao(g: GrupoForm): string {
  const un = (n: number) => (n === 1 ? 'opção' : 'opções');
  if (g.minQtd === g.maxQtd) return `O cliente escolhe exatamente ${g.minQtd} ${un(g.minQtd)}.`;
  if (g.minQtd === 0) return `O cliente escolhe até ${g.maxQtd} ${un(g.maxQtd)} (opcional).`;
  return `O cliente escolhe de ${g.minQtd} a ${g.maxQtd} opções.`;
}
