// Aplicativos (D-042): Pix "copia e cola" (BR Code do Banco Central) e validação dos IDs de rastreamento.

export type TipoChavePix = 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria';

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Deixa a chave no formato que o Pix aceita; null se não for válida para o tipo. */
export function normalizarChavePix(chave: string, tipo: TipoChavePix): string | null {
  const t = chave.trim();
  const dig = t.replace(/\D/g, '');
  switch (tipo) {
    case 'cpf':
      return dig.length === 11 ? dig : null;
    case 'cnpj':
      return dig.length === 14 ? dig : null;
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) && t.length <= 77 ? t.toLowerCase() : null;
    case 'telefone': {
      const n = dig.startsWith('55') && dig.length >= 12 ? dig.slice(2) : dig;
      return n.length === 10 || n.length === 11 ? `+55${n}` : null;
    }
    case 'aleatoria':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) ? t.toLowerCase() : null;
  }
}

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), em 4 hexadecimais maiúsculos. */
export function crc16Pix(texto: string): string {
  let crc = 0xffff;
  for (const b of new TextEncoder().encode(texto)) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const campo = (id: string, valor: string) => `${id}${String(new TextEncoder().encode(valor).length).padStart(2, '0')}${valor}`;

/**
 * Pix "copia e cola" estático (BR Code). valor em centavos (null = o cliente digita).
 * nome até 25 e cidade até 15 caracteres, sem acento; txid até 25 letras/números (*** = sem identificador).
 */
export function pixCopiaECola(p: { chave: string; nome: string; cidade: string; valor: number | null; txid?: string; descricao?: string }): string {
  const nome = semAcento(p.nome).replace(/[^A-Za-z0-9 .&-]/g, '').trim().slice(0, 25) || 'LOJA';
  const cidade = semAcento(p.cidade).replace(/[^A-Za-z0-9 .-]/g, '').trim().slice(0, 15) || 'BRASIL';
  const txid = (p.txid ?? '***').replace(/[^A-Za-z0-9*]/g, '').slice(0, 25) || '***';
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', p.chave) + (p.descricao ? campo('02', semAcento(p.descricao).slice(0, 40)) : '');
  const corpo =
    campo('00', '01') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    (p.valor != null && p.valor > 0 ? campo('54', (p.valor / 100).toFixed(2)) : '') +
    campo('58', 'BR') +
    campo('59', nome) +
    campo('60', cidade) +
    campo('62', campo('05', txid)) +
    '6304';
  return corpo + crc16Pix(corpo);
}

/** IDs de rastreamento aceitos (o que o dono cola do Meta/Google). */
export const FORMATOS_RASTREAMENTO = {
  meta_pixel: /^\d{10,20}$/,
  google_analytics: /^G-[A-Z0-9]{4,14}$/,
  google_ads: /^AW-\d{6,14}$/,
  google_ads_rotulo: /^[A-Za-z0-9_-]{4,40}$/,
  google_tag_manager: /^GTM-[A-Z0-9]{4,10}$/,
} as const;
