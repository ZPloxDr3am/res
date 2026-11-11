// Promoção De/Por com agenda (D-021). Espelho de private.promo_vigente (migração 0021).

export type AgendaPromo = {
  /** dias da semana (0 = domingo); null ou vazio = todos */
  dias: number[] | null;
  /** 'HH:MM' ou 'HH:MM:SS'; os dois juntos ou nenhum. Fim antes do início = passa da meia-noite. */
  inicio: string | null;
  fim: string | null;
  /** último dia (AAAA-MM-DD), inclusive */
  ate: string | null;
};

export const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;

const seg = (h: string) => {
  const [a = '0', b = '0', c = '0'] = h.split(':');
  return Number(a) * 3600 + Number(b) * 60 + Number(c);
};

function partesLocais(quando: Date, fuso: string): { data: string; segundos: number } {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(quando).map((x) => [x.type, x.value]));
  return { data: `${p.year}-${p.month}-${p.day}`, segundos: Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second) };
}

const diaAnterior = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, dd! - 1)).toISOString().slice(0, 10);
};
const diaDaSemana = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, dd!)).getUTCDay();
};

/** A promoção vale neste momento? (Sem agenda = sempre.) */
export function promoVale(a: AgendaPromo, quando: Date = new Date(), fuso = 'America/Sao_Paulo'): boolean {
  const { data, segundos } = partesLocais(quando, fuso);
  let dia = data;
  if (a.inicio && a.fim) {
    const i = seg(a.inicio);
    const f = seg(a.fim);
    if (i < f) {
      if (!(segundos >= i && segundos < f)) return false;
    } else if (segundos < f) {
      dia = diaAnterior(data); // madrugada: conta no dia em que começou
    } else if (segundos < i) {
      return false;
    }
  }
  if (a.dias && a.dias.length > 0 && !a.dias.includes(diaDaSemana(dia))) return false;
  if (a.ate && dia > a.ate) return false;
  return true;
}

/** A agenda já terminou (passou do último dia)? */
export function promoEncerrada(a: AgendaPromo, quando: Date = new Date(), fuso = 'America/Sao_Paulo'): boolean {
  return !!a.ate && partesLocais(quando, fuso).data > a.ate && !promoVale(a, quando, fuso);
}

/** "Ter, Qua, Qui · 18:00–23:59 · até 30/11" (sem agenda: "Todos os dias"). */
export function resumoAgenda(a: AgendaPromo): string {
  const partes: string[] = [];
  const dias = a.dias && a.dias.length > 0 && a.dias.length < 7 ? [...a.dias].sort((x, y) => x - y) : null;
  partes.push(dias ? dias.map((d) => DIAS_CURTOS[d]).join(', ') : 'Todos os dias');
  if (a.inicio && a.fim) partes.push(`${a.inicio.slice(0, 5)}–${a.fim.slice(0, 5)}`);
  if (a.ate) partes.push(`até ${a.ate.slice(8, 10)}/${a.ate.slice(5, 7)}`);
  return partes.join(' · ');
}

/** % de desconto arredondado (81,99 → 69,99 = 15%). */
export const percentualDesconto = (de: number, por: number) => (de > 0 && por < de ? Math.round(((de - por) / de) * 100) : 0);
