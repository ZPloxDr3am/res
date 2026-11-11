'use client';
import { useEffect, useRef, useState } from 'react';
import { carregarLeaflet, type L } from '@/lib/leaflet';

type Ponto = { lat: number; lng: number };

/** Mapa do cliente: o motoboy a caminho e a casa dele (D-028). */
export function MapaCliente({ motoboy, destino }: { motoboy: Ponto; destino: Ponto | null }) {
  const caixa = useRef<HTMLDivElement>(null);
  const ref = useRef<{ L: L; m: L; moto: L; casa: L | null } | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    carregarLeaflet()
      .then((L) => {
        if (!vivo || !caixa.current || ref.current) return;
        const m = L.map(caixa.current, { zoomControl: false, attributionControl: true }).setView([motoboy.lat, motoboy.lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(m);
        const moto = L.marker([motoboy.lat, motoboy.lng], { icon: L.divIcon({ className: 'mc-moto', html: '<span>🛵</span>', iconSize: [40, 40], iconAnchor: [20, 20] }), zIndexOffset: 1000 }).addTo(m);
        const casa = destino ? L.marker([destino.lat, destino.lng], { icon: L.divIcon({ className: 'mc-casa', html: '<span>🏠</span>', iconSize: [36, 36], iconAnchor: [18, 34] }) }).addTo(m) : null;
        ref.current = { L, m, moto, casa };
        if (destino) m.fitBounds([[motoboy.lat, motoboy.lng], [destino.lat, destino.lng]], { padding: [40, 40], maxZoom: 16 });
      })
      .catch(() => setErro(true));
    return () => {
      vivo = false;
      ref.current?.m.remove();
      ref.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // posição nova a cada atualização da página
  useEffect(() => {
    const r = ref.current;
    if (!r) return;
    r.moto.setLatLng([motoboy.lat, motoboy.lng]);
    if (destino) r.m.fitBounds([[motoboy.lat, motoboy.lng], [destino.lat, destino.lng]], { padding: [40, 40], maxZoom: 16 });
    else r.m.panTo([motoboy.lat, motoboy.lng]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motoboy.lat, motoboy.lng, destino?.lat, destino?.lng]);

  if (erro) return null;
  return <div ref={caixa} className="mc-mapa" role="img" aria-label="Mapa com o motoboy a caminho" />;
}
