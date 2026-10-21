// Impressão pelo navegador (enquanto o agente do Windows não está instalado) e tipos da fila.
import { montarCupom, type CupomDados, type CupomTeste, type LayoutCupom, type Linha } from '@res/core';

export type CupomFila = {
  id: string;
  tipo: 'cozinha' | 'pedido' | 'teste';
  titulo: string;
  conteudo: CupomDados | CupomTeste;
  layout: LayoutCupom;
  impressora_id: string | null;
  impressora: string | null;
  colunas: number;
  status: string;
  motivo?: string;
  /** a impressora tem agente ligado: não imprimir pelo navegador */
  agente_online?: boolean;
};

/** Agente considera a impressora viva se avisou nos últimos 2 minutos. */
export const agenteOnline = (ultimoSinal: string | null | undefined) => !!ultimoSinal && Date.now() - new Date(ultimoSinal).getTime() < 120_000;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Linhas do cupom → HTML monoespaçado na largura do papel. */
export function cupomHtml(linhas: Linha[], colunas: number): string {
  return linhas
    .map((l) => {
      if ('sep' in l) return `<div class="l">${l.sep.repeat(colunas)}</div>`;
      const cls = ['l', l.negrito ? 'b' : '', l.grande ? 'g' : '', l.centro ? 'c' : ''].filter(Boolean).join(' ');
      return `<div class="${cls}">${esc(l.t) || '&nbsp;'}</div>`;
    })
    .join('');
}

export const CSS_CUPOM = `
.cupom{font-family:"Courier New",ui-monospace,monospace;font-size:12px;line-height:1.25;color:#000;background:#fff;white-space:pre;}
.cupom .b{font-weight:700}
.cupom .g{font-size:24px;line-height:1.15}
.cupom .c{text-align:center}
`;

export function linhasDoCupom(c: Pick<CupomFila, 'tipo' | 'conteudo' | 'layout' | 'colunas' | 'motivo'>): Linha[] {
  return montarCupom(c.tipo, c.conteudo, c.colunas, c.layout ?? {}, c.motivo === 'reimpressao');
}

/**
 * Abre a janela de impressão do navegador com os cupons (um por página).
 * Resolve quando a janela fecha. Não dá para saber se a pessoa cancelou: tratamos como impresso.
 */
export function imprimirNoNavegador(cupons: CupomFila[]): Promise<void> {
  return new Promise((resolve) => {
    if (cupons.length === 0) return resolve();
    const largura = Math.max(...cupons.map((c) => c.colunas)) <= 32 ? 58 : 80;
    const corpo = cupons
      .map((c) => `<div class="cupom" style="width:${c.colunas}ch">${cupomHtml(linhasDoCupom(c), c.colunas)}</div>`)
      .join('<div style="page-break-after:always"></div>');
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cupom</title><style>
@page{size:${largura}mm auto;margin:2mm}
html,body{margin:0;padding:0;background:#fff}
${CSS_CUPOM}
</style></head><body>${corpo}</body></html>`);
    doc.close();
    const fim = () => {
      setTimeout(() => iframe.remove(), 500);
      resolve();
    };
    iframe.contentWindow!.addEventListener('afterprint', fim, { once: true });
    setTimeout(() => {
      iframe.contentWindow!.focus();
      iframe.contentWindow!.print();
      // alguns navegadores não disparam afterprint
      setTimeout(fim, 60_000);
    }, 150);
  });
}
