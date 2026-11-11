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

/** Linhas do cupom → HTML monoespaçado na largura do papel. `qrs`: SVG de cada QR (sem ele, um quadro marca o lugar). */
export function cupomHtml(linhas: Linha[], colunas: number, qrs: Record<string, string> = {}): string {
  return linhas
    .map((l) => {
      if ('qr' in l) {
        return `<div class="c qr">${qrs[l.qr] ?? '<span class="qr-lugar">QR do motoboy</span>'}</div>`;
      }
      if ('sep' in l) return `<div class="l">${l.sep.repeat(colunas)}</div>`;
      const cls = ['l', l.negrito ? 'b' : '', l.grande ? 'g' : '', l.centro ? 'c' : ''].filter(Boolean).join(' ');
      return `<div class="${cls}">${esc(l.t) || '&nbsp;'}</div>`;
    })
    .join('');
}

// Na tela (prévia): tamanho fixo. Na impressão pelo navegador o cupom ocupa a largura útil do papel
// com letra grossa (as térmicas imprimem fraco as fontes finas como Courier).
export const CSS_CUPOM = `
.cupom{font-family:"Lucida Console",Consolas,"Courier New",ui-monospace,monospace;font-size:12px;line-height:1.25;color:#000;background:#fff;white-space:pre;font-weight:600}
.cupom .b{font-weight:800}
.cupom .g{font-size:2em;line-height:1.1}
.cupom .c{text-align:center}
.cupom .qr{padding:1.5mm 0;white-space:normal}
.cupom .qr svg{width:34mm;height:34mm;display:inline-block}
.cupom .qr-lugar{display:inline-grid;place-items:center;width:30mm;height:30mm;border:2px dashed #000;font-size:10px}
`;

/** Colunas usadas na impressão pelo navegador: menos colunas = letra maior no mesmo papel. */
export const colunasNavegador = (colunas: number) => (colunas <= 32 ? 32 : Math.min(colunas, 40));

export function linhasDoCupom(c: Pick<CupomFila, 'tipo' | 'conteudo' | 'layout' | 'colunas' | 'motivo'>): Linha[] {
  return montarCupom(c.tipo, c.conteudo, c.colunas, c.layout ?? {}, c.motivo === 'reimpressao');
}

/**
 * Abre a janela de impressão do navegador com os cupons (um por página).
 * Resolve quando a janela fecha. Não dá para saber se a pessoa cancelou: tratamos como impresso.
 */
/** SVG de cada QR que aparece nos cupons. */
async function qrsDosCupons(cupons: CupomFila[]): Promise<Record<string, string>> {
  const urls = new Set<string>();
  for (const c of cupons) for (const l of linhasDoCupom({ ...c, colunas: colunasNavegador(c.colunas) })) if ('qr' in l) urls.add(l.qr);
  if (urls.size === 0) return {};
  const QR = await import('qrcode');
  const out: Record<string, string> = {};
  for (const u of urls) out[u] = await QR.toString(u, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' });
  return out;
}

export async function imprimirNoNavegador(cupons: CupomFila[]): Promise<void> {
  const qrs = await qrsDosCupons(cupons);
  return new Promise((resolve) => {
    if (cupons.length === 0) return resolve();
    const largura = Math.max(...cupons.map((c) => c.colunas)) <= 32 ? 58 : 80;
    const util = largura === 58 ? 48 : 72; // mm imprimíveis
    const corpo = cupons
      .map((c) => {
        const cols = colunasNavegador(c.colunas);
        // letra do tamanho que enche a largura do papel (caractere monoespaçado ≈ 0,6 da altura)
        const fonte = (util / (cols * 0.6)).toFixed(2);
        return `<div class="cupom" style="width:${util}mm;font-size:${fonte}mm">${cupomHtml(linhasDoCupom({ ...c, colunas: cols }), cols, qrs)}</div>`;
      })
      .join('<div style="page-break-after:always"></div>');
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cupom</title><style>
@page{size:${largura}mm auto;margin:2mm}
html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
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
