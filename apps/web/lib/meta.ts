/** Meta de vendas do mês com projeção (D-064). Valores em centavos. Sem dependências de servidor. */

export interface DadosMeta {
  mes: string; // AAAA-MM-01
  hoje: string; // AAAA-MM-DD
  lojas: { loja_id: string; loja: string; meta: number | null; meta_do_mes: boolean; vendido: number }[];
  dias: Record<string, number>;
  media_semana: number[]; // 0 = domingo
  dias_com_historico: number;
  anterior_ate_hoje: number;
  anterior_total: number;
}

const diaUTC = (d: string) => new Date(`${d}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function calcularMeta(d: DadosMeta) {
  const meta = d.lojas.every((l) => l.meta == null) ? null : d.lojas.reduce((a, l) => a + Number(l.meta ?? 0), 0);
  const semMeta = d.lojas.filter((l) => l.meta == null).map((l) => l.loja);
  const vendido = d.lojas.reduce((a, l) => a + Number(l.vendido), 0);
  const ini = diaUTC(d.mes);
  const fim = new Date(Date.UTC(ini.getUTCFullYear(), ini.getUTCMonth() + 1, 0, 12));
  const diasNoMes = fim.getUTCDate();
  const hoje = diaUTC(d.hoje);
  const mesAtual = d.hoje.slice(0, 7) === d.mes.slice(0, 7);
  const passado = hoje > fim;
  const diaHoje = mesAtual ? hoje.getUTCDate() : passado ? diasNoMes : 0;
  const media = d.media_semana.map(Number);
  const temHistorico = d.dias_com_historico >= 14 && media.some((v) => v > 0);

  // peso de cada dia do mês pela média do dia da semana (ou igual para todos, sem histórico)
  const peso = (dia: number) => {
    const dt = new Date(Date.UTC(ini.getUTCFullYear(), ini.getUTCMonth(), dia, 12));
    return temHistorico ? media[dt.getUTCDay()]! : 1;
  };
  const pesos = Array.from({ length: diasNoMes }, (_, i) => peso(i + 1));
  const pesoTotal = pesos.reduce((a, b) => a + b, 0) || 1;

  let projecao = vendido;
  if (mesAtual) {
    const vendidoHoje = Number(d.dias[d.hoje] ?? 0);
    if (temHistorico) {
      const resto = pesos.slice(diaHoje).reduce((a, b) => a + b, 0);
      projecao = vendido + resto + Math.max(0, pesos[diaHoje - 1]! - vendidoHoje);
    } else {
      const ritmo = diaHoje > 1 ? (vendido - vendidoHoje) / (diaHoje - 1) : vendido;
      projecao = vendido + ritmo * (diasNoMes - diaHoje) + Math.max(0, ritmo - vendidoHoje);
    }
  } else if (!passado) {
    projecao = temHistorico ? pesoTotal : 0;
  }

  // onde deveria estar hoje (fim do dia) para bater a meta, pela curva da semana
  const esperadoAteHoje = meta != null ? Math.round((meta * pesos.slice(0, diaHoje).reduce((a, b) => a + b, 0)) / pesoTotal) : null;
  const diasRestantes = mesAtual ? diasNoMes - diaHoje + 1 : passado ? 0 : diasNoMes;
  const falta = meta != null ? Math.max(0, meta - vendido) : null;
  const porDia = falta != null && diasRestantes > 0 ? Math.round(falta / diasRestantes) : null;

  // série acumulada para o gráfico: real até hoje, meta ideal o mês todo
  const serie = Array.from({ length: diasNoMes }, (_, i) => {
    const dia = iso(new Date(Date.UTC(ini.getUTCFullYear(), ini.getUTCMonth(), i + 1, 12)));
    return { dia, vendido: Number(d.dias[dia] ?? 0) };
  });
  let acc = 0;
  let accMeta = 0;
  const acumulado = serie.map((s, i) => {
    acc += s.vendido;
    accMeta += meta != null ? (meta * pesos[i]!) / pesoTotal : 0;
    return { dia: s.dia, real: i < diaHoje ? acc : null, meta: meta != null ? Math.round(accMeta) : null };
  });

  return {
    meta,
    semMeta,
    vendido,
    projecao: Math.round(projecao),
    pctVendido: meta ? (vendido / meta) * 100 : null,
    pctProjecao: meta ? (projecao / meta) * 100 : null,
    esperadoAteHoje,
    adiantado: esperadoAteHoje != null ? vendido - esperadoAteHoje : null,
    falta,
    porDia,
    diasRestantes,
    diasNoMes,
    diaHoje,
    temHistorico,
    mesAtual,
    anteriorAteHoje: Number(d.anterior_ate_hoje),
    anteriorTotal: Number(d.anterior_total),
    acumulado,
  };
}
export type Meta = ReturnType<typeof calcularMeta>;
