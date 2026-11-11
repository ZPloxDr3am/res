// Leaflet vem do cdnjs só nas telas com mapa (OpenStreetMap, sem chave).
/* eslint-disable @typescript-eslint/no-explicit-any */
export type L = any;
let carregando: Promise<L> | null = null;
export function carregarLeaflet(): Promise<L> {
  const w = window as unknown as { L?: L };
  if (w.L) return Promise.resolve(w.L);
  carregando ??= new Promise((ok, falha) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    document.head.appendChild(css);
    const js = document.createElement('script');
    js.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    js.onload = () => ok((window as unknown as { L: L }).L);
    js.onerror = () => {
      carregando = null;
      falha(new Error('Não consegui carregar o mapa.'));
    };
    document.head.appendChild(js);
  });
  return carregando;
}
