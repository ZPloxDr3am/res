// Entregas: distância, valor do motoboy e fechamento da noite (D-020). Valores em centavos.
import type { FormaPagamento } from './pedido.js';

export type Ponto = { lat: number; lng: number };

/** Distância em linha reta (km) entre dois pontos — fórmula de haversine. */
export function distanciaReta(a: Ponto, b: Ponto): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "3,2 km" (abaixo de 1 km: "850 m"). */
export function formatarKm(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return '—';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

/**
 * Lê coordenadas coladas do Google Maps ("-26.7409, -49.1765", com ou sem espaço/parênteses).
 * null se não for um par válido.
 */
export function lerCoordenadas(texto: string): Ponto | null {
  const m = texto.trim().replace(/[()]/g, '').match(/^(-?\d{1,2}(?:[.,]\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:[.,]\d+)?)$/);
  if (!m) return null;
  const n = (s: string) => Number(s.replace(',', '.'));
  const lat = n(m[1]!);
  const lng = n(m[2]!);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/** Uma entrega do fechamento (JSON de public.fechamento_motoboys). */
export type EntregaFechamento = {
  id: string;
  numero: number;
  loja: string;
  status: 'em_entrega' | 'concluido';
  entregador_id: string;
  entregador: string | null;
  bairro: string | null;
  saiu_em: string;
  concluido_em: string | null;
  pagamento: FormaPagamento;
  pago: boolean;
  total: number;
  taxa_entrega: number;
  valor_motoboy: number;
  distancia_km: number | null;
  distancia_fonte: 'rota' | 'reta' | 'bairro' | 'manual' | null;
};

export type FechamentoMotoboy = {
  id: string;
  nome: string;
  entregas: number;
  emRota: number;
  km: number;
  /** taxas de entrega cobradas dos clientes */
  taxasClientes: number;
  /** soma do valor do motoboy de cada entrega */
  aReceber: number;
  /** dinheiro recebido na porta (fica com ele até prestar contas) */
  dinheiro: number;
  /** cartão/Pix na maquininha ou Pix na porta (vai direto para a loja) */
  outros: number;
  /** dinheiro − a receber: positivo = ele devolve à loja; negativo = a loja paga a ele */
  acerto: number;
  lista: EntregaFechamento[];
};

/**
 * Soma a noite de cada motoboy. Só entregas concluídas contam em dinheiro/valores; as que ainda
 * estão em rota aparecem em "emRota" e na lista.
 */
export function fecharMotoboys(entregas: EntregaFechamento[]): { motoboys: FechamentoMotoboy[]; total: Omit<FechamentoMotoboy, 'id' | 'nome' | 'lista'> } {
  const por = new Map<string, FechamentoMotoboy>();
  for (const e of entregas) {
    let m = por.get(e.entregador_id);
    if (!m) {
      m = { id: e.entregador_id, nome: e.entregador ?? 'Motoboy', entregas: 0, emRota: 0, km: 0, taxasClientes: 0, aReceber: 0, dinheiro: 0, outros: 0, acerto: 0, lista: [] };
      por.set(e.entregador_id, m);
    }
    m.lista.push(e);
    if (e.status !== 'concluido') {
      m.emRota++;
      continue;
    }
    m.entregas++;
    m.km += e.distancia_km ?? 0;
    m.taxasClientes += e.taxa_entrega;
    m.aReceber += e.valor_motoboy;
    if (!e.pago && e.pagamento === 'dinheiro') m.dinheiro += e.total;
    else if (!e.pago && e.pagamento !== 'online') m.outros += e.total;
  }
  const motoboys = [...por.values()]
    .map((m) => ({ ...m, km: Math.round(m.km * 100) / 100, acerto: m.dinheiro - m.aReceber }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const total = motoboys.reduce(
    (t, m) => ({
      entregas: t.entregas + m.entregas,
      emRota: t.emRota + m.emRota,
      km: Math.round((t.km + m.km) * 100) / 100,
      taxasClientes: t.taxasClientes + m.taxasClientes,
      aReceber: t.aReceber + m.aReceber,
      dinheiro: t.dinheiro + m.dinheiro,
      outros: t.outros + m.outros,
      acerto: t.acerto + m.acerto,
    }),
    { entregas: 0, emRota: 0, km: 0, taxasClientes: 0, aReceber: 0, dinheiro: 0, outros: 0, acerto: 0 },
  );
  return { motoboys, total };
}

/** Frase do acerto: quem paga quem. */
export function fraseAcerto(acerto: number, formatar: (c: number) => string): string {
  if (acerto > 0) return `Devolver ${formatar(acerto)} à loja`;
  if (acerto < 0) return `A loja paga ${formatar(-acerto)} ao motoboy`;
  return 'Acerto zerado';
}
