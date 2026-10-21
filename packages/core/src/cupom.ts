// Monta o cupom (texto de impressora térmica) a partir do snapshot gravado na fila (public.impressoes).
// O mesmo resultado vai para o navegador (HTML monoespaçado) e para o agente do Windows (ESC/POS).

import { formatarReais } from './preco.js';
import { PAGAMENTO_ROTULO, TIPO_ROTULO, type FormaPagamento, type TipoPedido } from './pedido.js';
import type { Centavos } from './tipos.js';

export interface CupomDados {
  loja: string;
  marca: string;
  numero: number;
  tipo_pedido: TipoPedido;
  origem: string;
  criado_em: string;
  agendado_para: string | null;
  fuso: string;
  setor: string | null;
  cliente: { nome: string; telefone: string | null };
  endereco: { logradouro: string; numero?: string; complemento?: string; bairro: string; referencia?: string } | null;
  observacao: string | null;
  pagamento: FormaPagamento;
  troco_para: Centavos | null;
  subtotal: Centavos;
  taxa_entrega: Centavos;
  desconto: Centavos;
  total: Centavos;
  itens: { quantidade: number; nome: string; total: Centavos; observacao: string | null; opcoes: { grupo: string; nome: string; quantidade: number; fracao: number | null }[] }[];
}

export interface CupomTeste {
  teste: true;
  impressora: string;
  modelo: string;
  protocolo: string;
  colunas: number;
  pagina_codigo: string;
  loja: string;
  criado_em: string;
}

export interface LayoutCupom {
  /** itens em letra grande (dupla altura) */
  fonte?: 'normal' | 'grande';
  negrito_itens?: boolean;
  destacar_obs?: boolean;
  mostrar_grupos?: boolean;
  mostrar_cliente?: boolean;
  mostrar_endereco?: boolean;
  mostrar_precos?: boolean;
  cabecalho?: string;
  rodape?: string;
}

export const LAYOUT_PADRAO: Record<'cozinha' | 'pedido', Required<LayoutCupom>> = {
  cozinha: { fonte: 'grande', negrito_itens: true, destacar_obs: true, mostrar_grupos: false, mostrar_cliente: true, mostrar_endereco: false, mostrar_precos: false, cabecalho: '', rodape: '' },
  pedido: { fonte: 'normal', negrito_itens: true, destacar_obs: true, mostrar_grupos: false, mostrar_cliente: true, mostrar_endereco: true, mostrar_precos: true, cabecalho: '', rodape: 'Obrigado pela preferência!' },
};

/** Uma linha já cortada na largura do papel. `grande` = dupla altura e largura (ocupa metade das colunas). */
export type Linha = { t: string; negrito?: boolean; grande?: boolean; centro?: boolean } | { sep: '-' | '=' };

const FRACAO: Record<string, string> = { '0.5': '1/2', '0.3333': '1/3', '0.25': '1/4', '0.6667': '2/3', '0.75': '3/4' };
const fracaoTexto = (f: number | null) => (f == null || f >= 1 ? '' : `${FRACAO[String(Number(f))] ?? `${Math.round(f * 100)}%`} `);

/** Quebra o texto em linhas de até `largura`, sem cortar palavras (palavra maior que a linha é cortada).
 *  Da segunda linha em diante usa o `recuo`. */
export function quebrar(texto: string, largura: number, recuo = ''): string[] {
  const out: string[] = [];
  let linha = '';
  const inicio = () => (out.length ? recuo : '');
  const fechar = () => {
    if (linha) out.push(linha);
    linha = '';
  };
  for (const paragrafo of texto.split('\n')) {
    for (let p of paragrafo.split(/\s+/).filter(Boolean)) {
      if (linha && linha.length + 1 + p.length <= largura) {
        linha += ' ' + p;
        continue;
      }
      fechar();
      while (inicio().length + p.length > largura) {
        const cabe = Math.max(1, largura - inicio().length);
        out.push(inicio() + p.slice(0, cabe));
        p = p.slice(cabe);
      }
      linha = inicio() + p;
    }
    fechar();
  }
  return out.length ? out : [''];
}

/** "Texto ........ R$ 10,00" ocupando a linha toda. */
export function colunasLR(esq: string, dir: string, largura: number): string[] {
  if (esq.length + 1 + dir.length <= largura) return [esq + ' '.repeat(largura - esq.length - dir.length) + dir];
  const ls = quebrar(esq, largura);
  const ult = ls.pop()!;
  return [...ls, ...colunasLR(ult, dir, largura)];
}

const dataHora = (iso: string, fuso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: fuso, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');

export type TipoCupom = 'cozinha' | 'pedido' | 'teste';

/**
 * Monta as linhas do cupom. `colunas` = largura da impressora em caracteres (48 em 80 mm, 32 em 58 mm).
 * `reimpressao` marca a via como 2ª via no topo.
 */
export function montarCupom(tipo: TipoCupom, dados: CupomDados | CupomTeste, colunas: number, layout: LayoutCupom = {}, reimpressao = false): Linha[] {
  const L: Linha[] = [];
  const w = Math.max(24, Math.min(64, colunas));
  const meia = Math.floor(w / 2);
  const add = (t: string, o: { negrito?: boolean; grande?: boolean; centro?: boolean; recuo?: string } = {}) => {
    for (const s of quebrar(t, o.grande ? meia : w, o.recuo)) L.push({ t: s, negrito: o.negrito, grande: o.grande, centro: o.centro });
  };

  if ('teste' in dados) {
    add('TESTE DE IMPRESSÃO', { negrito: true, grande: true, centro: true });
    add(dados.loja, { centro: true });
    L.push({ sep: '=' });
    add(`Impressora: ${dados.impressora}`);
    add(`Modelo: ${dados.modelo} (${dados.protocolo})`);
    add(`Colunas: ${dados.colunas} · Página: ${dados.pagina_codigo}`);
    add(`Data: ${dataHora(dados.criado_em, 'America/Sao_Paulo')}`);
    L.push({ sep: '-' });
    add('Acentuação: ÁÉÍÓÚ ÂÊÔ ÃÕ Ç àéíóú ãõ ç');
    add('Régua:');
    add('1234567890'.repeat(Math.ceil(w / 10)).slice(0, w));
    add('Letra grande', { grande: true });
    add('Negrito', { negrito: true });
    L.push({ sep: '-' });
    add('Se a acentuação saiu errada, troque a página de código: 860 → 850 → 1252 → UTF8.');
    return L;
  }

  const lay = { ...LAYOUT_PADRAO[tipo === 'cozinha' ? 'cozinha' : 'pedido'], ...layout };
  const d = dados;

  if (reimpressao) add('*** 2ª VIA ***', { negrito: true, centro: true });
  if (lay.cabecalho) add(lay.cabecalho, { centro: true });
  add(d.marca, { negrito: true, centro: true });
  if (tipo === 'cozinha') add(`COZINHA${d.setor ? ` · ${d.setor.toUpperCase()}` : ''}`, { centro: true });
  L.push({ sep: '=' });
  add(`#${d.numero} ${TIPO_ROTULO[d.tipo_pedido].toUpperCase()}`, { negrito: true, grande: true });
  const origem = d.origem === 'ifood' ? 'iFood' : d.origem === 'cardapio_digital' ? 'Cardápio digital' : null;
  add(`${dataHora(d.criado_em, d.fuso)}${origem ? ` · ${origem}` : ''}`);
  if (d.agendado_para) add(`AGENDADO: ${dataHora(d.agendado_para, d.fuso)}`, { negrito: true, grande: tipo === 'cozinha' });
  if (lay.mostrar_cliente && d.cliente.nome) add(`Cliente: ${d.cliente.nome}${tipo === 'pedido' && d.cliente.telefone ? ` · ${d.cliente.telefone}` : ''}`);
  if (lay.mostrar_endereco && d.endereco) {
    const e = d.endereco;
    add(`${e.logradouro}${e.numero ? `, ${e.numero}` : ''}${e.complemento ? ` - ${e.complemento}` : ''}`, { negrito: true });
    add(`Bairro: ${e.bairro}`, { negrito: true });
    if (e.referencia) add(`Ref.: ${e.referencia}`);
  }
  L.push({ sep: '-' });

  for (const it of d.itens) {
    const nome = `${it.quantidade}x ${it.nome}`;
    if (lay.mostrar_precos) {
      for (const s of colunasLR(nome, formatarReais(it.total), w)) L.push({ t: s, negrito: lay.negrito_itens });
    } else add(nome, { negrito: lay.negrito_itens, grande: lay.fonte === 'grande' });
    if (lay.mostrar_grupos) {
      const porGrupo = new Map<string, string[]>();
      for (const o of it.opcoes) (porGrupo.get(o.grupo) ?? porGrupo.set(o.grupo, []).get(o.grupo)!).push(`${fracaoTexto(o.fracao)}${o.quantidade > 1 && o.fracao == null ? `${o.quantidade}x ` : ''}${o.nome}`);
      for (const [g, ops] of porGrupo) add(`- ${g}: ${ops.join(', ')}`, { recuo: '  ', grande: lay.fonte === 'grande' && tipo === 'cozinha' });
    } else {
      for (const o of it.opcoes) add(`- ${fracaoTexto(o.fracao)}${o.quantidade > 1 && o.fracao == null ? `${o.quantidade}x ` : ''}${o.nome}`, { recuo: '  ', grande: lay.fonte === 'grande' && tipo === 'cozinha' });
    }
    if (it.observacao) add(lay.destacar_obs ? `>> OBS: ${it.observacao.toUpperCase()}` : `Obs.: ${it.observacao}`, { negrito: lay.destacar_obs, recuo: '   ' });
  }
  L.push({ sep: '-' });
  if (d.observacao) {
    add(lay.destacar_obs ? `OBS DO PEDIDO: ${d.observacao.toUpperCase()}` : `Obs. do pedido: ${d.observacao}`, { negrito: lay.destacar_obs });
    L.push({ sep: '-' });
  }

  if (tipo === 'pedido') {
    for (const s of colunasLR('Subtotal', formatarReais(d.subtotal), w)) L.push({ t: s });
    if (d.taxa_entrega) for (const s of colunasLR('Entrega', formatarReais(d.taxa_entrega), w)) L.push({ t: s });
    if (d.desconto) for (const s of colunasLR('Desconto', `-${formatarReais(d.desconto)}`, w)) L.push({ t: s });
    for (const s of colunasLR('TOTAL', formatarReais(d.total), meia)) L.push({ t: s, negrito: true, grande: true });
    add(`Pagamento: ${PAGAMENTO_ROTULO[d.pagamento] ?? d.pagamento}`);
    // melhoria sobre o BeeFood (EV-021): troco no cupom
    if (d.pagamento === 'dinheiro' && d.troco_para) {
      add(`Troco para ${formatarReais(d.troco_para)}: levar ${formatarReais(Math.max(0, d.troco_para - d.total))}`, { negrito: true });
    }
    L.push({ sep: '-' });
  }
  if (lay.rodape) add(lay.rodape, { centro: true });
  return L;
}

/** Texto puro (para pré-visualização, testes e impressoras sem formatação). */
export function cupomTexto(linhas: Linha[], colunas: number): string {
  return linhas
    .map((l) => {
      if ('sep' in l) return l.sep.repeat(colunas);
      const larg = l.grande ? Math.floor(colunas / 2) : colunas;
      if (!l.centro) return l.t;
      const pad = Math.max(0, Math.floor((larg - l.t.length) / 2));
      return ' '.repeat(pad) + l.t;
    })
    .join('\n');
}
