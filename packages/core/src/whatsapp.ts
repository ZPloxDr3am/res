// WhatsApp oficial (D-097): regras puras dos modelos (templates) da Meta. Sem rede aqui.

export const VARIAVEIS_TURBO = ['nome', 'loja', 'cupom', 'link', 'favorito', 'avaliacao'] as const;
export type VariavelTurbo = (typeof VARIAVEIS_TURBO)[number];

/** Exemplo de cada variável (a Meta exige exemplo para aprovar o modelo). */
export const EXEMPLO_VARIAVEL: Record<VariavelTurbo, string> = {
  nome: 'Maria',
  loja: 'Pizzaria Exemplo',
  cupom: 'VOLTA10',
  link: 'https://res-iqzs.vercel.app/c/exemplo',
  favorito: 'Pizza Calabresa',
  avaliacao: 'https://g.page/r/exemplo/review',
};

/** Ordem em que as variáveis aparecem (repetida conta uma vez), igual a whatsapp_salvar_modelo no banco. */
export function ordemVariaveis(corpo: string): VariavelTurbo[] {
  const ordem: VariavelTurbo[] = [];
  for (const m of corpo.matchAll(/\{(nome|loja|cupom|link|favorito|avaliacao)\}/g)) {
    const v = m[1] as VariavelTurbo;
    if (!ordem.includes(v)) ordem.push(v);
  }
  return ordem;
}

/** Texto do RES ({nome}) → texto da Meta ({{1}}), com a ordem e os exemplos. */
export function corpoParaMeta(corpo: string): { texto: string; ordem: VariavelTurbo[]; exemplos: string[] } {
  const ordem = ordemVariaveis(corpo);
  const texto = corpo.replace(/\{(nome|loja|cupom|link|favorito|avaliacao)\}/g, (_m, v: VariavelTurbo) => `{{${ordem.indexOf(v) + 1}}}`);
  return { texto, ordem, exemplos: ordem.map((v) => EXEMPLO_VARIAVEL[v]) };
}

/** Nome aceito pela Meta: minúsculas, números e _ (3 a 100). */
export const nomeModeloValido = (s: string) => /^[a-z0-9_]{3,100}$/.test(s);
export const nomeModeloWhatsapp = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 100);

/** Telefone do cliente no formato da Meta (com 55). */
export function telefoneWhatsapp(tel: string): string {
  const d = tel.replace(/\D/g, '');
  return d.length <= 11 ? `55${d}` : d;
}

/** Parâmetros do corpo na ordem do modelo (valor vazio vira "-", a Meta recusa parâmetro vazio). */
export function parametrosModelo(ordem: string[], variaveis: Record<string, string | null | undefined>): string[] {
  return ordem.map((k) => {
    const v = (variaveis[k] ?? '').toString().trim();
    return v ? v.slice(0, 1000) : '-';
  });
}
