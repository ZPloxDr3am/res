// Converte texto para a página de código da impressora térmica.
// 860 (português), 850 (multilíngue) e 1252 (Windows Latin-1). Fora da tabela: tira o acento; senão "?".

export type Pagina = '860' | '850' | '1252' | 'UTF8';

const CP860: Record<string, number> = {
  Ç: 0x80, ü: 0x81, é: 0x82, â: 0x83, ã: 0x84, à: 0x85, Á: 0x86, ç: 0x87, ê: 0x88, Ê: 0x89, è: 0x8a, Í: 0x8b, Ô: 0x8c, ì: 0x8d, Ã: 0x8e, Â: 0x8f,
  É: 0x90, À: 0x91, È: 0x92, ô: 0x93, õ: 0x94, ò: 0x95, Ú: 0x96, ù: 0x97, Ì: 0x98, Õ: 0x99, Ü: 0x9a, '¢': 0x9b, '£': 0x9c, Ù: 0x9d, Ó: 0x9f,
  á: 0xa0, í: 0xa1, ó: 0xa2, ú: 0xa3, ñ: 0xa4, Ñ: 0xa5, ª: 0xa6, º: 0xa7, '¿': 0xa8, Ò: 0xa9, '½': 0xab, '¼': 0xac, '¡': 0xad, '«': 0xae, '»': 0xaf,
  '°': 0xf8, '·': 0xfa, '²': 0xfd,
};

const CP850: Record<string, number> = {
  Ç: 0x80, ü: 0x81, é: 0x82, â: 0x83, ä: 0x84, à: 0x85, å: 0x86, ç: 0x87, ê: 0x88, ë: 0x89, è: 0x8a, ï: 0x8b, î: 0x8c, ì: 0x8d, Ä: 0x8e, Å: 0x8f,
  É: 0x90, ô: 0x93, ö: 0x94, ò: 0x95, û: 0x96, ù: 0x97, Ö: 0x99, Ü: 0x9a, '£': 0x9c, '×': 0x9e,
  á: 0xa0, í: 0xa1, ó: 0xa2, ú: 0xa3, ñ: 0xa4, Ñ: 0xa5, ª: 0xa6, º: 0xa7, '¿': 0xa8, '½': 0xab, '¼': 0xac, '¡': 0xad, '«': 0xae, '»': 0xaf,
  Á: 0xb5, Â: 0xb6, À: 0xb7, ã: 0xc6, Ã: 0xc7, Ê: 0xd2, Ë: 0xd3, È: 0xd4, Í: 0xd6, Î: 0xd7, Ï: 0xd8, Ì: 0xde,
  Ó: 0xe0, ß: 0xe1, Ô: 0xe2, Ò: 0xe3, õ: 0xe4, Õ: 0xe5, Ú: 0xe9, Û: 0xea, Ù: 0xeb, '°': 0xf8, '·': 0xfa, '²': 0xfd,
};

/** Número do comando ESC t para cada página (padrão Epson). */
export const ESC_T: Record<Pagina, number | null> = { '860': 3, '850': 2, '1252': 16, UTF8: null };

const semAcento = (c: string) => c.normalize('NFD').replace(/[̀-ͯ]/g, '');

export function codificar(texto: string, pagina: Pagina): Uint8Array {
  if (pagina === 'UTF8') return new TextEncoder().encode(texto);
  const out: number[] = [];
  const tabela = pagina === '860' ? CP860 : pagina === '850' ? CP850 : null;
  for (const ch of texto) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x80) out.push(cp);
    else if (tabela && tabela[ch] !== undefined) out.push(tabela[ch]!);
    else if (!tabela && cp >= 0xa0 && cp <= 0xff) out.push(cp); // 1252 = Latin-1 nessa faixa
    else if (ch === '–' || ch === '—') out.push(0x2d);
    else if (ch === '→') out.push(0x3e);
    else if (ch === '…') out.push(0x2e, 0x2e, 0x2e);
    else if (ch === ' ') out.push(0x20);
    else {
      const s = semAcento(ch);
      if (s && s.codePointAt(0)! < 0x80) out.push(s.codePointAt(0)!);
      else out.push(0x3f);
    }
  }
  return Uint8Array.from(out);
}
