// Pedidos agendados e taxa por bairro (D-011). O banco repete as regras em
// supabase/migrations/*_agendamento_taxa_bairro.sql (validar_agendamento, taxa_bairro).

import type { Centavos } from './tipos.js';

/** Minutos de folga além do tempo de preparo para o agendado "acordar" no quadro. */
export const FOLGA_AGENDADO_MIN = 10;

export type FaseAgendamento = 'imediato' | 'agendado' | 'preparar';

/**
 * Onde o pedido fica no quadro:
 * - imediato: não é agendado;
 * - agendado: ainda falta para começar (fica em "Agendados", sem alerta repetido);
 * - preparar: chegou a hora (agendado − preparo − folga) e vai para "Novo" com alerta.
 */
export function faseAgendamento(agendadoPara: Date | null, tempoPreparoMin: number, agora: Date = new Date()): FaseAgendamento {
  if (!agendadoPara) return 'imediato';
  const acorda = agendadoPara.getTime() - (tempoPreparoMin + FOLGA_AGENDADO_MIN) * 60000;
  return agora.getTime() >= acorda ? 'preparar' : 'agendado';
}

/** Normaliza o nome do bairro para comparar ("  CENTRO " = "centro"). */
export const chaveBairro = (b: string) => b.trim().toLowerCase();

/** Taxa do bairro cadastrado; null = bairro fora da área. */
export function taxaDoBairro(areas: { bairro: string; taxa: Centavos; ativo?: boolean }[], bairro: string): Centavos | null {
  const k = chaveBairro(bairro);
  if (!k) return null;
  const a = areas.find((x) => x.ativo !== false && chaveBairro(x.bairro) === k);
  return a ? a.taxa : null;
}

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function partes(d: Date, fuso: string) {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday!);
  return { data: `${p.year}-${p.month}-${p.day}`, dd: p.day!, mm: p.month!, hora: `${p.hour}:${p.minute}`, dia };
}

/** Data (AAAA-MM-DD) no fuso da loja — para agrupar horários por dia. */
export const dataNoFuso = (d: Date, fuso: string) => partes(d, fuso).data;

/** "hoje 20:00", "amanhã 19:30", "sex 24/10 20:00" no fuso da loja. */
export function rotuloHorario(d: Date, fuso: string, agora: Date = new Date()): string {
  const x = partes(d, fuso);
  const hoje = partes(agora, fuso).data;
  const amanha = partes(new Date(agora.getTime() + 86400000), fuso).data;
  if (x.data === hoje) return `hoje ${x.hora}`;
  if (x.data === amanha) return `amanhã ${x.hora}`;
  return `${DIAS_CURTOS[x.dia]} ${x.dd}/${x.mm} ${x.hora}`;
}

/** Só a hora ("20:00") no fuso da loja. */
export const horaNoFuso = (d: Date, fuso: string) => partes(d, fuso).hora;
