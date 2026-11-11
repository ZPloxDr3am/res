// Segmentos de clientes para marketing (D-029). Usa duas medidas: há quantos dias foi o último
// pedido (recência) e quantos pedidos o cliente fez (frequência). O banco tem a mesma regra em
// private.segmento_cliente; os testes dos dois usam os mesmos casos.

export type Segmento = 'fieis' | 'potenciais' | 'promissores' | 'atencao' | 'quase_dormentes' | 'em_risco' | 'hibernando' | 'dormindo';

export const SEGMENTOS: { id: Segmento; rotulo: string; emoji: string; regra: string; acao: string }[] = [
  { id: 'fieis', rotulo: 'Fiéis', emoji: '💎', regra: '4+ pedidos e pediu nos últimos 30 dias', acao: 'Recompense: cashback, brinde, prévia de novidades.' },
  { id: 'potenciais', rotulo: 'Em potencial', emoji: '⭐', regra: '2 ou 3 pedidos e pediu nos últimos 30 dias', acao: 'Incentive o próximo pedido para virar fiel (combo, frete grátis).' },
  { id: 'promissores', rotulo: 'Promissores', emoji: '🌱', regra: '1º pedido nos últimos 30 dias', acao: 'Dê boas-vindas e um motivo para voltar (cupom de 2º pedido).' },
  { id: 'atencao', rotulo: 'Precisam de atenção', emoji: '⚠️', regra: '4+ pedidos, mas o último foi há 31 a 60 dias', acao: 'Bons clientes esfriando: lembre deles com uma oferta pessoal.' },
  { id: 'quase_dormentes', rotulo: 'Quase dormentes', emoji: '💤', regra: 'até 3 pedidos e o último foi há 31 a 60 dias', acao: 'Cupom com validade curta antes que esqueçam da loja.' },
  { id: 'em_risco', rotulo: 'Em risco', emoji: '🔥', regra: '4+ pedidos, mas o último foi há 61 a 120 dias', acao: 'Já foram bons clientes: oferta forte e pergunte o que houve.' },
  { id: 'hibernando', rotulo: 'Hibernando', emoji: '❄️', regra: 'até 3 pedidos e o último foi há 61 a 120 dias', acao: 'Campanha de reativação barata (SMS, público de anúncio).' },
  { id: 'dormindo', rotulo: 'Dormindo', emoji: '🌙', regra: 'último pedido há mais de 120 dias', acao: 'Só reative em campanhas grandes; custo alto de retorno.' },
];

/** Segmento de um cliente; null se ainda não tem pedido. */
export function segmentoCliente(diasDesdeUltimo: number | null, pedidos: number): Segmento | null {
  if (diasDesdeUltimo == null || pedidos < 1) return null;
  const d = diasDesdeUltimo;
  if (d > 120) return 'dormindo';
  if (d > 60) return pedidos >= 4 ? 'em_risco' : 'hibernando';
  if (d > 30) return pedidos >= 4 ? 'atencao' : 'quase_dormentes';
  if (pedidos >= 4) return 'fieis';
  return pedidos >= 2 ? 'potenciais' : 'promissores';
}

/** Casos usados também no teste do banco (paridade). [dias, pedidos, segmento] */
export const CASOS_SEGMENTO: [number | null, number, Segmento | null][] = [
  [null, 0, null],
  [3, 0, null],
  [0, 1, 'promissores'],
  [30, 1, 'promissores'],
  [10, 2, 'potenciais'],
  [30, 3, 'potenciais'],
  [5, 4, 'fieis'],
  [30, 12, 'fieis'],
  [31, 4, 'atencao'],
  [60, 9, 'atencao'],
  [31, 1, 'quase_dormentes'],
  [60, 3, 'quase_dormentes'],
  [61, 4, 'em_risco'],
  [120, 20, 'em_risco'],
  [61, 3, 'hibernando'],
  [120, 1, 'hibernando'],
  [121, 50, 'dormindo'],
  [400, 1, 'dormindo'],
];

/**
 * Telefone só com dígitos, DDD + número, no padrão atual (D-030): tira +55 e zeros da frente e
 * põe o 9 no celular que veio com 8 dígitos ("47 96731809" → "47996731809"). Fixo (número
 * começando com 2 a 5) fica como está. O banco faz o mesmo em private.normalizar_telefone.
 */
export function normalizarTelefone(t: string): string {
  let d = t.replace(/\D/g, '').replace(/^0+/, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if (d.length === 10 && /[6-9]/.test(d[2]!)) d = `${d.slice(0, 2)}9${d.slice(2)}`;
  return d;
}

/** Celular válido para SMS: DDD + 9 + 8 dígitos. */
export const eCelular = (t: string) => /^[1-9][0-9]9[0-9]{8}$/.test(normalizarTelefone(t));

/** Telefone no formato internacional (+55…) que Meta Ads, Google Ads e SMS aceitam. */
export function telefoneInternacional(t: string): string {
  return `+55${normalizarTelefone(t)}`;
}

/** Casos usados também no teste do banco (paridade). [entrada, esperado] */
export const CASOS_TELEFONE: [string, string][] = [
  ['4796731809', '47996731809'],
  ['+55 47 96731809', '47996731809'],
  ['554796731809', '47996731809'],
  ['047 9673-1809', '47996731809'],
  ['(47) 99673-1809', '47996731809'],
  ['5547996731809', '47996731809'],
  ['4733334444', '4733334444'],
  ['4788887777', '47988887777'],
  ['11912345678', '11912345678'],
];
