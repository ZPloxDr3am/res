// Previsão de compra e produção (D-110): média de consumo de cada dia da semana nas últimas 4 semanas.
// dow: 0 = domingo … 6 = sábado (como Date.getUTCDay).

export const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'] as const;

const somarDias = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const dow = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

export type PrevisaoInsumo = {
  /** consumo previsto do período */
  previsto: number;
  /** consumo médio por dia (média da semana) */
  porDia: number;
  /** primeiro dia (AAAA-MM-DD) em que o saldo não cobre o consumo previsto; null se cobre o período */
  acabaEm: string | null;
  /** quanto comprar para atravessar o período e ainda ficar com o mínimo */
  comprar: number;
};

/**
 * Projeta o consumo de `dias` dias a partir de `inicio` com a média de cada dia da semana (`consumoDow`, 7 números)
 * contra o saldo atual. Arredonda para 3 casas.
 */
export function preverInsumo(consumoDow: number[], saldo: number, minimo: number | null, inicio: string, dias: number): PrevisaoInsumo {
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  let restante = Math.max(saldo, 0);
  let previsto = 0;
  let acabaEm: string | null = null;
  for (let i = 0; i < dias; i++) {
    const d = somarDias(inicio, i);
    const c = Math.max(consumoDow[dow(d)] ?? 0, 0);
    previsto += c;
    restante -= c;
    if (restante < 0 && !acabaEm) acabaEm = d;
  }
  const porDia = consumoDow.reduce((s, v) => s + Math.max(v, 0), 0) / 7;
  return { previsto: r3(previsto), porDia: r3(porDia), acabaEm, comprar: r3(Math.max(0, previsto + (minimo ?? 0) - Math.max(saldo, 0))) };
}

/** Os próximos `n` dias (a partir de amanhã) com o nome do dia da semana, para escolher a produção. */
export function proximosDias(hoje: string, n = 7): { data: string; dow: number; rotulo: string }[] {
  return Array.from({ length: n }, (_, i) => {
    const data = somarDias(hoje, i + 1);
    const d = dow(data);
    return { data, dow: d, rotulo: i === 0 ? `amanhã (${DIAS_SEMANA[d]})` : `${DIAS_SEMANA[d]} ${data.slice(8, 10)}/${data.slice(5, 7)}` };
  });
}
