// Estoque (D-036): leitura do XML da NF-e, conversão de unidades, custo médio e situação.
// Sem dependências: o XML da NF-e é regular o bastante para ler por tags.

export class ErroNFe extends Error {}

export type ItemNFe = {
  n: number;
  codigo: string;
  descricao: string;
  ean: string | null;
  ncm: string | null;
  cfop: string | null;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  /** vProd, centavos */
  valorProdutos: number;
  /** quanto o item custou de fato: produtos − desconto + frete + seguro + outros + IPI + ICMS-ST (centavos) */
  custoTotal: number;
};

export type NFe = {
  chave: string;
  numero: string;
  serie: string;
  emissao: string | null;
  emitente: { cnpj: string; nome: string };
  destinatario: { cnpj: string | null; nome: string | null };
  /** vNF, centavos */
  valorTotal: number;
  itens: ItemNFe[];
};

const tag = (xml: string, nome: string): string | null => {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${nome}>`));
  return m ? m[1]!.trim() : null;
};
const bloco = (xml: string, nome: string): string => tag(xml, nome) ?? '';
const blocos = (xml: string, nome: string): string[] => {
  const re = new RegExp(`<(?:\\w+:)?${nome}(?:\\s[^>]*)?>[\\s\\S]*?</(?:\\w+:)?${nome}>`, 'g');
  return xml.match(re) ?? [];
};
const texto = (s: string | null) =>
  (s ?? '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
const num = (s: string | null) => (s == null || s === '' ? 0 : Number(s));
const cent = (s: string | null) => Math.round(num(s) * 100);

/** Lê o XML de uma NF-e (modelo 55) — o que o fornecedor manda por e-mail. */
export function lerNFe(xml: string): NFe {
  const inf = xml.match(/<(?:\w+:)?infNFe[^>]*\sId="NFe(\d{44})"/);
  if (!inf) throw new ErroNFe('Este arquivo não é o XML de uma NF-e (não achei a chave de acesso).');
  const ide = bloco(xml, 'ide');
  const emit = bloco(xml, 'emit');
  const dest = bloco(xml, 'dest');
  const tot = bloco(bloco(xml, 'total'), 'ICMSTot');
  const itens = blocos(xml, 'det').map((det, i): ItemNFe => {
    const prod = bloco(det, 'prod');
    const imp = bloco(det, 'imposto');
    const ipi = cent(tag(bloco(imp, 'IPI'), 'vIPI'));
    const st = cent(tag(bloco(imp, 'ICMS'), 'vICMSST'));
    const vProd = cent(tag(prod, 'vProd'));
    const nItem = det.match(/nItem="(\d+)"/);
    return {
      n: nItem ? Number(nItem[1]) : i + 1,
      codigo: texto(tag(prod, 'cProd')),
      descricao: texto(tag(prod, 'xProd')),
      ean: ((e) => (e && /^\d{8,14}$/.test(e) ? e : null))(tag(prod, 'cEAN')),
      ncm: tag(prod, 'NCM'),
      cfop: tag(prod, 'CFOP'),
      unidade: texto(tag(prod, 'uCom')).toUpperCase(),
      quantidade: num(tag(prod, 'qCom')),
      valorUnitario: num(tag(prod, 'vUnCom')),
      valorProdutos: vProd,
      custoTotal: vProd - cent(tag(prod, 'vDesc')) + cent(tag(prod, 'vFrete')) + cent(tag(prod, 'vSeg')) + cent(tag(prod, 'vOutro')) + ipi + st,
    };
  });
  if (itens.length === 0) throw new ErroNFe('A nota não tem itens.');
  return {
    chave: inf[1]!,
    numero: tag(ide, 'nNF') ?? '',
    serie: tag(ide, 'serie') ?? '',
    emissao: tag(ide, 'dhEmi') ?? tag(ide, 'dEmi'),
    emitente: { cnpj: tag(emit, 'CNPJ') ?? tag(emit, 'CPF') ?? '', nome: texto(tag(emit, 'xFant') ?? tag(emit, 'xNome')) },
    destinatario: { cnpj: tag(dest, 'CNPJ') ?? tag(dest, 'CPF'), nome: tag(dest, 'xNome') ? texto(tag(dest, 'xNome')) : null },
    valorTotal: cent(tag(tot, 'vNF')),
    itens,
  };
}

export type UnidadeEstoque = 'UN' | 'KG' | 'G' | 'L' | 'ML';
export const UNIDADES_ESTOQUE: { id: UnidadeEstoque; rotulo: string }[] = [
  { id: 'UN', rotulo: 'Unidade' },
  { id: 'KG', rotulo: 'Quilo' },
  { id: 'G', rotulo: 'Grama' },
  { id: 'L', rotulo: 'Litro' },
  { id: 'ML', rotulo: 'Mililitro' },
];

/** Palpite de unidade e fator a partir da unidade da nota (CX/FD/PCT pedem o fator do dono). */
export function palpiteUnidade(uCom: string): { unidade: UnidadeEstoque; fator: number; confirmar: boolean } {
  const u = uCom.toUpperCase().replace(/[^A-Z]/g, '');
  if (u === 'KG' || u === 'KGS') return { unidade: 'KG', fator: 1, confirmar: false };
  if (u === 'G' || u === 'GR' || u === 'GRS') return { unidade: 'G', fator: 1, confirmar: false };
  if (u === 'L' || u === 'LT' || u === 'LTS') return { unidade: 'L', fator: 1, confirmar: false };
  if (u === 'ML') return { unidade: 'ML', fator: 1, confirmar: false };
  if (u === 'UN' || u === 'UND' || u === 'UNID' || u === 'PC' || u === 'PCA') return { unidade: 'UN', fator: 1, confirmar: false };
  return { unidade: 'UN', fator: 1, confirmar: true }; // CX, FD, PCT, DZ…: quantas unidades vêm em cada?
}

/** Entrada no estoque: quantidade na unidade do insumo e custo de cada unidade (centavos, com decimais). */
export function entradaDoItem(item: Pick<ItemNFe, 'quantidade' | 'custoTotal'>, fator: number): { quantidade: number; custoUnitario: number } {
  const quantidade = Math.round(item.quantidade * fator * 1000) / 1000;
  return { quantidade, custoUnitario: quantidade > 0 ? item.custoTotal / quantidade : 0 };
}

/** Custo médio ponderado depois de uma entrada (centavos por unidade). Saldo negativo não puxa a média. */
export function custoMedio(saldo: number, custoAtual: number, entrada: number, custoEntrada: number): number {
  const s = Math.max(0, saldo);
  if (s + entrada <= 0) return custoEntrada;
  return (s * custoAtual + entrada * custoEntrada) / (s + entrada);
}

export type SituacaoEstoque = 'sem_controle' | 'critico' | 'baixo' | 'regular';
export function situacaoEstoque(saldo: number, minimo: number | null, controla: boolean): SituacaoEstoque {
  if (!controla) return 'sem_controle';
  if (saldo <= 0) return 'critico';
  if (minimo != null && saldo <= minimo) return 'baixo';
  return 'regular';
}

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 2);

/** Sugere o insumo cadastrado mais parecido com a descrição da nota (null se nada parecido). */
export function sugerirInsumo<T extends { id: string; nome: string }>(descricao: string, insumos: T[]): T | null {
  const d = new Set(normalizar(descricao));
  let melhor: T | null = null;
  let nota = 0;
  for (const i of insumos) {
    const p = normalizar(i.nome);
    if (!p.length) continue;
    const comuns = p.filter((w) => d.has(w)).length;
    const n = comuns / p.length;
    if (n > nota) {
      nota = n;
      melhor = i;
    }
  }
  return nota >= 0.6 ? melhor : null;
}
