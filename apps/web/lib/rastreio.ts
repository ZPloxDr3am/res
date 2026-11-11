// Eventos de anúncio do cardápio digital (D-042). Só chegam ao Meta/Google se o cliente aceitou os cookies.
export type EventoRastreio =
  | { tipo: 'add_to_cart'; id: string; nome: string }
  | { tipo: 'begin_checkout'; valor: number }
  | { tipo: 'purchase'; codigo: string; numero: number; valor: number };

export type ConfigRastreio = {
  meta_pixel?: { id: string };
  google_analytics?: { id: string };
  google_ads?: { id: string; rotulo?: string | null };
  google_tag_manager?: { id: string };
};

/** valores em centavos */
export function rastrear(e: EventoRastreio) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<EventoRastreio>('res:rastreio', { detail: e }));
}
