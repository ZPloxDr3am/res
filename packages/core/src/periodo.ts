// Períodos do painel de faturamento e comparação com o período anterior.
// Datas no formato AAAA-MM-DD, no fuso da loja (Brasil: −03:00, sem horário de verão desde 2019).

export type Preset = 'hoje' | 'ontem' | '7d' | '30d' | 'mes' | 'personalizado';

export const PRESET_ROTULO: Record<Preset, string> = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  mes: 'Este mês',
  personalizado: 'Escolher datas',
};

const DIA = /^\d{4}-\d{2}-\d{2}$/;

export function somarDias(dia: string, n: number): string {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(de: string, ate: string): number {
  return Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 86400000);
}

/** Hoje (AAAA-MM-DD) no fuso informado. */
export function hojeNoFuso(fuso = 'America/Sao_Paulo', agora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
}

export interface Intervalo {
  /** primeiro dia incluído */
  de: string;
  /** último dia incluído */
  ate: string;
  /** início e fim (exclusivo) com fuso, para o banco */
  inicio: string;
  fim: string;
  /** "vs ontem", "vs 7 dias anteriores"… */
  comparacao: string;
  /** período em andamento: o fim real é "agora", e o anterior compara até a mesma hora */
  emAndamento: boolean;
}

/**
 * Intervalo de um preset. Períodos que incluem hoje terminam "agora" (quem chama corta o fim),
 * e o banco compara com o mesmo tamanho imediatamente antes (hoje até 15h × ontem até 15h).
 */
export function intervalo(preset: Preset, hoje: string, offset = '-03:00', de?: string, ate?: string): Intervalo {
  let a: string;
  let b: string;
  let comparacao: string;
  switch (preset) {
    case 'hoje':
      [a, b, comparacao] = [hoje, hoje, 'vs ontem até a mesma hora'];
      break;
    case 'ontem':
      [a, b, comparacao] = [somarDias(hoje, -1), somarDias(hoje, -1), 'vs anteontem'];
      break;
    case '7d':
      [a, b, comparacao] = [somarDias(hoje, -6), hoje, 'vs 7 dias anteriores'];
      break;
    case '30d':
      [a, b, comparacao] = [somarDias(hoje, -29), hoje, 'vs 30 dias anteriores'];
      break;
    case 'mes':
      [a, b, comparacao] = [`${hoje.slice(0, 8)}01`, hoje, 'vs mesmo nº de dias antes'];
      break;
    case 'personalizado': {
      if (!de || !ate || !DIA.test(de) || !DIA.test(ate)) throw new Error('Escolha as duas datas.');
      if (ate < de) throw new Error('A data final vem antes da inicial.');
      if (diasEntre(de, ate) > 366) throw new Error('Escolha até 1 ano.');
      const n = diasEntre(de, ate) + 1;
      [a, b, comparacao] = [de, ate, `vs ${n} dia${n > 1 ? 's' : ''} anteriores`];
      break;
    }
  }
  return {
    de: a,
    ate: b,
    inicio: `${a}T00:00:00${offset}`,
    fim: `${somarDias(b, 1)}T00:00:00${offset}`,
    comparacao,
    emAndamento: b >= hoje,
  };
}

/** Variação relativa (0,12 = +12%). null quando não há base para comparar. */
export function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual === 0 ? 0 : null;
  return (atual - anterior) / anterior;
}

/** "+12%", "−8%", "0%", ou "novo" quando antes era zero. */
export function formatarVariacao(v: number | null): string {
  if (v === null) return 'novo';
  const p = Math.round(v * 100);
  if (p === 0) return '0%';
  return `${p > 0 ? '+' : '−'}${Math.abs(p)}%`;
}
