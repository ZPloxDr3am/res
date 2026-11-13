// Financeiro automático (D-105): extrato do banco (OFX), conciliação com as contas a pagar/receber,
// leitura de boleto (linha digitável ou código de barras) e o texto do "Bom dia" para o WhatsApp.
// Sem dependências: tudo em centavos e datas AAAA-MM-DD.
import { formatarReais } from './preco.js';

export class ErroExtrato extends Error {}
export class ErroBoleto extends Error {}

// ───────────────────────────── extrato OFX ─────────────────────────────

export type TransacaoExtrato = {
  /** identifica a transação para não importar duas vezes o mesmo extrato */
  chave: string;
  data: string;
  /** centavos; negativo = saída */
  valor: number;
  descricao: string;
};

export type Extrato = {
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  inicio: string | null;
  fim: string | null;
  /** saldo informado pelo banco (centavos) */
  saldo: number | null;
  transacoes: TransacaoExtrato[];
};

const ENTIDADES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const limparTexto = (s: string) =>
  s
    .replace(/&(#\d+|[a-z]+);/gi, (m, e: string) => (e.startsWith('#') ? String.fromCharCode(Number(e.slice(1))) : (ENTIDADES[e.toLowerCase()] ?? m)))
    .replace(/\s+/g, ' ')
    .trim();

/** Valor de uma tag OFX, no formato SGML (sem fechamento) ou XML. */
function tag(bloco: string, nome: string): string | null {
  const m = bloco.match(new RegExp(`<${nome}>([^<\\r\\n]*)`, 'i'));
  const v = m ? limparTexto(m[1]!) : '';
  return v ? v : null;
}

function dataOfx(s: string | null): string | null {
  const m = s?.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, a, me, d] = m;
  if (Number(me) < 1 || Number(me) > 12 || Number(d) < 1 || Number(d) > 31) return null;
  return `${a}-${me}-${d}`;
}

/** "−1.234,56", "-1234.56" ou "1234,5" → centavos. */
export function valorOfx(s: string | null): number | null {
  if (!s) return null;
  let t = s.replace(/\s/g, '');
  if (t.includes(',') && t.includes('.')) t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  else if (t.includes(',')) t = t.replace(',', '.');
  if (!/^[+-]?\d+(\.\d+)?$/.test(t)) return null;
  return Math.round(Number(t) * 100);
}

/** Lê o extrato OFX (o arquivo que todo banco exporta: "Money", "OFX" ou "extrato para conciliação"). */
export function lerOFX(texto: string): Extrato {
  if (!/<OFX>/i.test(texto) || !/<STMTTRN>/i.test(texto)) {
    if (/<OFX>/i.test(texto)) return { banco: null, agencia: null, conta: null, inicio: null, fim: null, saldo: null, transacoes: [] };
    throw new ErroExtrato('Este arquivo não é um extrato OFX. No site ou app do banco, procure "Exportar extrato" no formato OFX (ou "Money").');
  }
  const banco = tag(texto, 'BANKID');
  const agencia = tag(texto, 'BRANCHID');
  const conta = tag(texto, 'ACCTID');
  const ledger = texto.match(/<LEDGERBAL>[\s\S]*?(?:<\/LEDGERBAL>|$)/i)?.[0] ?? '';
  const blocos = texto.match(/<STMTTRN>[\s\S]*?(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>)/gi) ?? [];
  const vistos = new Map<string, number>();
  const transacoes: TransacaoExtrato[] = [];
  for (const b of blocos) {
    const data = dataOfx(tag(b, 'DTPOSTED'));
    const valor = valorOfx(tag(b, 'TRNAMT'));
    if (!data || valor == null || valor === 0) continue;
    const descricao = (tag(b, 'MEMO') ?? tag(b, 'NAME') ?? tag(b, 'TRNTYPE') ?? 'Sem descrição').slice(0, 120);
    // alguns bancos repetem o FITID: a chave leva também data e valor, e um contador quando ainda assim repete
    const base = `${banco ?? ''}|${conta ?? ''}|${tag(b, 'FITID') ?? tag(b, 'CHECKNUM') ?? descricao}|${data}|${valor}`;
    const n = (vistos.get(base) ?? 0) + 1;
    vistos.set(base, n);
    transacoes.push({ chave: n > 1 ? `${base}#${n}` : base, data, valor, descricao });
  }
  transacoes.sort((a, b) => a.data.localeCompare(b.data));
  return {
    banco,
    agencia,
    conta,
    inicio: dataOfx(tag(texto, 'DTSTART')) ?? transacoes[0]?.data ?? null,
    fim: dataOfx(tag(texto, 'DTEND')) ?? transacoes.at(-1)?.data ?? null,
    saldo: ledger ? valorOfx(tag(ledger, 'BALAMT')) : null,
    transacoes,
  };
}

// ───────────────────────────── conciliação ─────────────────────────────

const diaMs = 86_400_000;
const dias = (a: string, b: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / diaMs);

export type ItemExtrato = { id: string; data: string; valor: number };
export type ContaAberta = { id: string; tipo: 'despesa' | 'receita'; valor: number; vencimento: string };

/**
 * Sugere qual conta em aberto cada linha do extrato pagou: mesmo tipo (saída = despesa), mesmo valor e
 * vencimento até `janela` dias de distância. Cada conta é usada uma vez; fica a de vencimento mais perto.
 */
export function sugerirConciliacao(itens: ItemExtrato[], abertas: ContaAberta[], janela = 10): Map<string, string> {
  const usadas = new Set<string>();
  const res = new Map<string, string>();
  const pares: { item: string; conta: string; dist: number }[] = [];
  for (const it of itens) {
    const tipo = it.valor < 0 ? 'despesa' : 'receita';
    for (const c of abertas) {
      if (c.tipo !== tipo || c.valor !== Math.abs(it.valor)) continue;
      const d = Math.abs(dias(it.data, c.vencimento));
      if (d <= janela) pares.push({ item: it.id, conta: c.id, dist: d });
    }
  }
  pares.sort((a, b) => a.dist - b.dist);
  for (const p of pares) {
    if (res.has(p.item) || usadas.has(p.conta)) continue;
    res.set(p.item, p.conta);
    usadas.add(p.conta);
  }
  return res;
}

/** Contas do mesmo tipo ordenadas pela semelhança (valor e data) — para escolher à mão. */
export function contasParecidas<T extends ContaAberta>(it: ItemExtrato, abertas: T[], limite = 8): T[] {
  const tipo = it.valor < 0 ? 'despesa' : 'receita';
  const v = Math.abs(it.valor);
  return abertas
    .filter((c) => c.tipo === tipo)
    .map((c) => ({ c, nota: Math.abs(c.valor - v) / Math.max(v, 1) + Math.abs(dias(it.data, c.vencimento)) / 60 }))
    .sort((a, b) => a.nota - b.nota)
    .slice(0, limite)
    .map((x) => x.c);
}

// ───────────────────────────── boleto ─────────────────────────────

export type Boleto = {
  tipo: 'bancario' | 'arrecadacao';
  /** 44 dígitos */
  codigoBarras: string;
  /** 47 (bancário) ou 48 (contas de consumo e tributos) dígitos */
  linhaDigitavel: string;
  /** centavos; null quando o boleto não traz valor */
  valor: number | null;
  vencimento: string | null;
  /** quem cobra: banco (bancário) ou segmento (luz, água, telefone, prefeitura…) */
  emissor: string;
};

const BANCOS: Record<string, string> = {
  '001': 'Banco do Brasil', '004': 'Banco do Nordeste', '021': 'Banestes', '033': 'Santander', '041': 'Banrisul', '070': 'BRB',
  '077': 'Inter', '085': 'Ailos', '097': 'Credisis', '104': 'Caixa', '136': 'Unicred', '208': 'BTG Pactual', '212': 'Original',
  '237': 'Bradesco', '260': 'Nubank', '290': 'PagBank', '323': 'Mercado Pago', '336': 'C6 Bank', '341': 'Itaú', '380': 'PicPay',
  '389': 'Mercantil', '422': 'Safra', '633': 'Rendimento', '655': 'Votorantim', '745': 'Citibank', '748': 'Sicredi', '756': 'Sicoob',
};
const SEGMENTOS: Record<string, string> = {
  '1': 'Prefeitura', '2': 'Água e esgoto', '3': 'Energia ou gás', '4': 'Telefone / internet', '5': 'Órgão do governo', '6': 'Carnê', '7': 'Multa de trânsito', '9': 'Banco',
};

/** Módulo 10 (pesos 2,1 da direita para a esquerda; soma os algarismos dos produtos). */
export function modulo10(num: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    const p = Number(num[i]) * peso;
    soma += p > 9 ? p - 9 : p;
    peso = peso === 2 ? 1 : 2;
  }
  return (10 - (soma % 10)) % 10;
}

function soma11(num: string): number {
  let soma = 0;
  let peso = 2;
  for (let i = num.length - 1; i >= 0; i--) {
    soma += Number(num[i]) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  return soma % 11;
}
/** DV geral do boleto bancário (0, 10 e 11 viram 1). */
const dvBancario = (num: string) => {
  const d = 11 - soma11(num);
  return d === 0 || d === 10 || d === 11 ? 1 : d;
};
/** Módulo 11 das contas de consumo (resto 0 ou 1 → 0). */
const dvArrecadacao11 = (num: string) => {
  const r = soma11(num);
  return r === 0 || r === 1 ? 0 : 11 - r;
};

const somarDiasIso = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * diaMs).toISOString().slice(0, 10);

/**
 * Vencimento pelo fator (dias desde 07/10/1997). O fator chegou a 9999 em 21/02/2025 e recomeçou em 1000 no
 * dia 22/02/2025: entre as duas leituras, fica a mais perto da data de referência.
 */
export function vencimentoDoFator(fator: number, referencia: string): string | null {
  if (!fator || fator < 1000) return null;
  const antiga = somarDiasIso('1997-10-07', fator);
  const nova = somarDiasIso('2025-02-22', fator - 1000);
  return Math.abs(dias(antiga, referencia)) <= Math.abs(dias(nova, referencia)) ? antiga : nova;
}

function dataValida(s: string): string | null {
  const m = s.match(/^(20\d{2})(\d{2})(\d{2})$/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  const t = Date.parse(`${iso}T12:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === iso ? iso : null;
}

/**
 * Lê o boleto digitado, colado ou bipado: linha digitável (47 ou 48 números) ou código de barras (44).
 * Confere os dígitos verificadores; devolve valor, vencimento e quem cobra. `hoje` = AAAA-MM-DD.
 */
export function lerBoleto(entrada: string, hoje: string): Boleto {
  const n = entrada.replace(/\D/g, '');
  if (n.length === 48 || (n.length === 44 && n[0] === '8')) return lerArrecadacao(n, hoje);
  if (n.length !== 47 && n.length !== 44) {
    throw new ErroBoleto(n.length ? `O boleto tem 47 ou 48 números (ou 44 no código de barras); vieram ${n.length}.` : 'Digite, cole ou bipe o código do boleto.');
  }
  let barras: string;
  let linha: string;
  if (n.length === 47) {
    const campos: [string, string][] = [[n.slice(0, 9), n[9]!], [n.slice(10, 20), n[20]!], [n.slice(21, 31), n[31]!]];
    campos.forEach(([c, dv], i) => {
      if (modulo10(c) !== Number(dv)) throw new ErroBoleto(`O ${i + 1}º bloco da linha digitável não confere. Confira os números digitados.`);
    });
    barras = n.slice(0, 4) + n[32] + n.slice(33, 47) + n.slice(4, 9) + n.slice(10, 20) + n.slice(21, 31);
    linha = n;
  } else {
    barras = n;
    const livre = n.slice(19);
    const c1 = n.slice(0, 4) + livre.slice(0, 5);
    const c2 = livre.slice(5, 15);
    const c3 = livre.slice(15, 25);
    linha = c1 + modulo10(c1) + c2 + modulo10(c2) + c3 + modulo10(c3) + n[4] + n.slice(5, 19);
  }
  if (dvBancario(barras.slice(0, 4) + barras.slice(5)) !== Number(barras[4])) throw new ErroBoleto('O código do boleto não confere (dígito verificador). Confira os números.');
  const valor = Number(barras.slice(9, 19));
  return {
    tipo: 'bancario',
    codigoBarras: barras,
    linhaDigitavel: linha,
    valor: valor > 0 ? valor : null,
    vencimento: vencimentoDoFator(Number(barras.slice(5, 9)), hoje),
    emissor: BANCOS[barras.slice(0, 3)] ? `Boleto ${BANCOS[barras.slice(0, 3)]}` : `Boleto banco ${barras.slice(0, 3)}`,
  };
}

function lerArrecadacao(n: string, hoje: string): Boleto {
  if (n[0] !== '8') throw new ErroBoleto('Este código não é de boleto. Confira os números.');
  const ind = n[2];
  if (!['6', '7', '8', '9'].includes(ind!)) throw new ErroBoleto('O código da conta não confere. Confira os números.');
  const dv = ind === '6' || ind === '7' ? modulo10 : dvArrecadacao11;
  let barras: string;
  if (n.length === 48) {
    barras = '';
    for (let i = 0; i < 4; i++) {
      const bloco = n.slice(i * 12, i * 12 + 11);
      if (dv(bloco) !== Number(n[i * 12 + 11])) throw new ErroBoleto(`O ${i + 1}º bloco da conta não confere. Confira os números digitados.`);
      barras += bloco;
    }
  } else barras = n;
  if (dv(barras.slice(0, 3) + barras.slice(4)) !== Number(barras[3])) throw new ErroBoleto('O código da conta não confere (dígito verificador). Confira os números.');
  const linha = n.length === 48 ? n : [0, 1, 2, 3].map((i) => barras.slice(i * 11, i * 11 + 11) + dv(barras.slice(i * 11, i * 11 + 11))).join('');
  const valor = ind === '6' || ind === '8' ? Number(barras.slice(4, 15)) : 0;
  // muitas contas de consumo trazem o vencimento (AAAAMMDD) no começo do campo livre; só vale se for uma data plausível
  let venc: string | null = null;
  for (const ini of [19, 23, 20]) {
    const d = dataValida(barras.slice(ini, ini + 8));
    if (d && Math.abs(dias(d, hoje)) <= 120) {
      venc = d;
      break;
    }
  }
  return { tipo: 'arrecadacao', codigoBarras: barras, linhaDigitavel: linha, valor: valor > 0 ? valor : null, vencimento: venc, emissor: SEGMENTOS[barras[1]!] ?? 'Conta' };
}

// ───────────────────────────── bom dia ─────────────────────────────

export type BomDia = {
  dia: string;
  ontem: { vendas: number; pedidos: number; cancelados: number };
  semana_passada: { vendas: number; pedidos: number };
  agendados_hoje: number;
  financeiro: { vencem_hoje: number; valor_hoje: number; vencidas: number; valor_vencidas: number; extrato_pendente: number } | null;
  estoque: { abaixo_minimo: number; pausados: number } | null;
  nfe_para_entrada: number;
  motoboys_pendentes: number;
  /** insumos que ficaram 5% ou mais caros na última entrada, nos últimos 7 dias (D-108) */
  insumos_subiram?: number;
};

const ROTULO_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** Variação % de ontem contra o mesmo dia da semana passada (null sem base). */
export function variacaoBomDia(d: BomDia): number | null {
  const a = d.semana_passada.vendas;
  return a > 0 ? Math.round(((d.ontem.vendas - a) / a) * 100) : null;
}

export type PendenciaBomDia = { chave: 'vencidas' | 'hoje' | 'pausados' | 'compras' | 'nfe' | 'extrato' | 'motoboys' | 'agendados' | 'margem'; texto: string };

/** O que precisa de atenção hoje, em ordem de urgência (para o cartão e para a mensagem). */
export function pendenciasBomDia(d: BomDia): PendenciaBomDia[] {
  const p: PendenciaBomDia[] = [];
  const s = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;
  const f = d.financeiro;
  if (f?.vencidas) p.push({ chave: 'vencidas', texto: `⚠️ ${s(f.vencidas, 'conta vencida', 'contas vencidas')} (${formatarReais(f.valor_vencidas)})` });
  if (f?.vencem_hoje) p.push({ chave: 'hoje', texto: `📅 ${s(f.vencem_hoje, 'conta vence', 'contas vencem')} hoje (${formatarReais(f.valor_hoje)})` });
  if (d.insumos_subiram) p.push({ chave: 'margem', texto: `📈 ${s(d.insumos_subiram, 'insumo ficou', 'insumos ficaram')} mais caro${d.insumos_subiram > 1 ? 's' : ''}: confira a margem` });
  if (d.estoque?.pausados) p.push({ chave: 'pausados', texto: `⏸️ ${s(d.estoque.pausados, 'produto pausado', 'produtos pausados')} por falta de insumo` });
  if (d.estoque?.abaixo_minimo) p.push({ chave: 'compras', texto: `🛒 ${s(d.estoque.abaixo_minimo, 'insumo', 'insumos')} abaixo do mínimo` });
  if (d.nfe_para_entrada) p.push({ chave: 'nfe', texto: `🧾 ${s(d.nfe_para_entrada, 'nota fiscal pronta', 'notas fiscais prontas')} para dar entrada` });
  if (f?.extrato_pendente) p.push({ chave: 'extrato', texto: `🏦 ${s(f.extrato_pendente, 'lançamento', 'lançamentos')} do extrato para conferir` });
  if (d.motoboys_pendentes) p.push({ chave: 'motoboys', texto: `🛵 ${s(d.motoboys_pendentes, 'motoboy esperando', 'motoboys esperando')} aprovação` });
  if (d.agendados_hoje) p.push({ chave: 'agendados', texto: `🗓️ ${s(d.agendados_hoje, 'pedido agendado', 'pedidos agendados')} para hoje` });
  return p;
}

/** Mensagem do "Bom dia" para mandar no WhatsApp. */
export function textoBomDia(d: BomDia, loja: string): string {
  const ontem = ROTULO_SEMANA[new Date(Date.parse(`${d.dia}T12:00:00Z`) - diaMs).getUTCDay()];
  const v = variacaoBomDia(d);
  const ticket = d.ontem.pedidos ? Math.round(d.ontem.vendas / d.ontem.pedidos) : 0;
  const linhas = [
    `☀️ *Bom dia, ${loja}!*`,
    '',
    `*Ontem (${ontem}):* ${formatarReais(d.ontem.vendas)} em ${d.ontem.pedidos} pedido${d.ontem.pedidos === 1 ? '' : 's'}${ticket ? ` · ticket ${formatarReais(ticket)}` : ''}`,
    v != null ? `${v >= 0 ? '📈' : '📉'} ${v >= 0 ? '+' : ''}${v}% contra ${ontem} passada (${formatarReais(d.semana_passada.vendas)})` : null,
    d.ontem.cancelados ? `❌ ${d.ontem.cancelados} cancelado${d.ontem.cancelados > 1 ? 's' : ''}` : null,
  ];
  const p = pendenciasBomDia(d);
  linhas.push('', p.length ? '*Para hoje:*' : '✅ Nada pendente para hoje.', ...p.map((x) => `• ${x.texto}`));
  return linhas.filter((x) => x !== null).join('\n');
}
