// Linhas do cupom (core/cupom.ts) → bytes ESC/POS para a impressora térmica.
import type { Linha } from '../../core/src/cupom.js';
import { codificar, ESC_T, type Pagina } from './codepage.js';

export interface ConfigImpressora {
  protocolo: string;
  colunas: number;
  pagina_codigo: Pagina;
  espaco_linhas: number;
  pular_linhas: number;
  corte: boolean;
  gaveta: boolean;
}

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** QR Code nativo da impressora (GS ( k, modelo 2), correção M. Tamanho do módulo 1–16. */
export function qrEscPos(dado: string, modulo: number): number[] {
  const bytes = [...new TextEncoder().encode(dado)];
  const n = bytes.length + 3;
  return [
    GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00, // modelo 2
    GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, Math.max(1, Math.min(16, modulo)), // tamanho
    GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x31, // correção M
    GS, 0x28, 0x6b, n & 0xff, (n >> 8) & 0xff, 0x31, 0x50, 0x30, ...bytes, // guarda
    GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30, // imprime
  ];
}

export function gerarEscPos(linhas: Linha[], cfg: ConfigImpressora): Uint8Array {
  const b: number[] = [];
  const push = (...x: number[]) => b.push(...x);
  const texto = (t: string) => b.push(...codificar(t, cfg.pagina_codigo));

  push(ESC, 0x40); // inicializa
  const t = ESC_T[cfg.pagina_codigo];
  if (t !== null) push(ESC, 0x74, t); // página de código
  if (cfg.espaco_linhas > 0) push(ESC, 0x33, Math.min(255, cfg.espaco_linhas));
  else push(ESC, 0x32);

  let negrito = false;
  let grande = false;
  let centro = false;
  const estilo = (n: boolean, g: boolean, c: boolean) => {
    if (n !== negrito) push(ESC, 0x45, n ? 1 : 0);
    if (g !== grande) push(GS, 0x21, g ? 0x11 : 0x00);
    if (c !== centro) push(ESC, 0x61, c ? 1 : 0);
    negrito = n;
    grande = g;
    centro = c;
  };

  for (const l of linhas) {
    if ('qr' in l) {
      estilo(false, false, true);
      push(...qrEscPos(l.qr, cfg.colunas <= 32 ? 5 : 7));
      push(LF);
      continue;
    }
    if ('sep' in l) {
      estilo(false, false, false);
      texto(l.sep.repeat(cfg.colunas));
    } else {
      estilo(!!l.negrito, !!l.grande, !!l.centro);
      texto(l.t);
    }
    push(LF);
  }
  estilo(false, false, false);
  push(ESC, 0x64, Math.max(0, Math.min(20, cfg.pular_linhas))); // avança antes do corte
  if (cfg.corte) push(GS, 0x56, 0x01); // corte parcial
  if (cfg.gaveta) push(ESC, 0x70, 0x00, 0x19, 0xfa); // pulso da gaveta
  return Uint8Array.from(b);
}
