'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { formatarKm } from '@res/core';
import { rastreioAoVivo, type AoVivo, type MotoboyAoVivo } from '@/app/(painel)/entregas/actions';
import { clienteNavegador } from '@/lib/supabase/client';
import { carregarLeaflet, type L } from '@/lib/leaflet';

const CORES = ['#2a78d6', '#eb6834', '#1baf7a', '#c98500', '#d55181', '#6250d6', '#008300', '#e34948'];
const iniciais = (n: string | null) => (n ?? 'M').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join('');
const segundos = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
const haQuanto = (s: number) => (s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.round(s / 3600)} h`);

/** Mapa ao vivo dos motoboys em rota (D-026). */
export function MapaAoVivo({ inicial }: { inicial: AoVivo }) {
  const [dados, setDados] = useState<AoVivo>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [foco, setFoco] = useState<string | null>(null);
  const [, tique] = useState(0);
  const caixa = useRef<HTMLDivElement>(null);
  const mapa = useRef<{ L: L; m: L; camada: L; enquadrou: boolean } | null>(null);
  const cor = useCallback((id: string) => CORES[Math.abs([...id].reduce((s, c) => s + c.charCodeAt(0), 0)) % CORES.length]!, []);

  const atualizar = useCallback(async () => {
    const d = await rastreioAoVivo();
    if (d) setDados(d);
  }, []);

  // atualiza: tempo real (posição mudou) + a cada 15 s (caminho e entregas)
  useEffect(() => {
    const supabase = clienteNavegador();
    let espera: ReturnType<typeof setTimeout> | undefined;
    const canal = supabase
      .channel(`motoboys:${inicial.grupo}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'motoboy_local', filter: `grupo=eq.${inicial.grupo}` }, (p: { new?: Partial<MotoboyAoVivo> & { entregador_id?: string } }) => {
        const n = p.new;
        if (n?.entregador_id && typeof n.lat === 'number' && typeof n.lng === 'number') {
          setDados((d) => ({
            ...d,
            motoboys: d.motoboys.map((m) =>
              m.id === n.entregador_id ? { ...m, lat: n.lat!, lng: n.lng!, em: n.em ?? m.em, velocidade: n.velocidade ?? m.velocidade, rota: [...m.rota, [n.lat!, n.lng!]] } : m,
            ),
          }));
        }
        clearTimeout(espera);
        espera = setTimeout(() => void atualizar(), 2500);
      })
      .subscribe();
    const t = setInterval(() => document.visibilityState === 'visible' && void atualizar(), 15_000);
    const r = setInterval(() => tique((x) => x + 1), 5_000);
    return () => {
      clearInterval(t);
      clearInterval(r);
      clearTimeout(espera);
      void supabase.removeChannel(canal);
    };
  }, [inicial.grupo, atualizar]);

  // cria o mapa uma vez
  useEffect(() => {
    let vivo = true;
    carregarLeaflet()
      .then((L) => {
        if (!vivo || !caixa.current || mapa.current) return;
        const centro = inicial.lojas[0] ?? inicial.motoboys[0] ?? { lat: -27.1, lng: -48.6 };
        const m = L.map(caixa.current, { zoomControl: true }).setView([centro.lat, centro.lng], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(m);
        mapa.current = { L, m, camada: L.layerGroup().addTo(m), enquadrou: false };
        tique((x) => x + 1);
      })
      .catch((e: Error) => setErro(e.message));
    return () => {
      vivo = false;
      mapa.current?.m.remove();
      mapa.current = null;
    };
  }, [inicial.lojas, inicial.motoboys]);

  // desenha
  useEffect(() => {
    const ref = mapa.current;
    if (!ref) return;
    const { L, m, camada } = ref;
    camada.clearLayers();
    const pontos: [number, number][] = [];
    for (const l of dados.lojas) {
      L.marker([l.lat, l.lng], { icon: L.divIcon({ className: 'av-loja', html: `<span>LOJA</span>`, iconSize: [44, 22], iconAnchor: [22, 11] }), title: l.nome }).addTo(camada);
      pontos.push([l.lat, l.lng]);
    }
    for (const mo of dados.motoboys) {
      const c = cor(mo.id);
      if (mo.rota.length > 1) L.polyline(mo.rota, { color: c, weight: 5, opacity: 0.75 }).addTo(camada);
      for (const e of mo.entregas) {
        if (e.destino_lat == null || e.destino_lng == null) continue;
        L.marker([e.destino_lat, e.destino_lng], { icon: L.divIcon({ className: 'av-destino', html: `<span style="border-color:${c}">#${e.numero}</span>`, iconSize: [46, 22], iconAnchor: [23, 22] }), title: `${e.cliente} · ${e.endereco}` }).addTo(camada);
        pontos.push([e.destino_lat, e.destino_lng]);
      }
      const velho = segundos(mo.em) > 120;
      L.marker([mo.lat, mo.lng], {
        icon: L.divIcon({ className: 'av-moto', html: `<span style="background:${velho ? '#8a8f8c' : c}">${iniciais(mo.nome)}</span>`, iconSize: [36, 36], iconAnchor: [18, 18] }),
        title: mo.nome ?? 'Motoboy',
        zIndexOffset: 1000,
      })
        .addTo(camada)
        .bindPopup(`<strong>${(mo.nome ?? 'Motoboy').replace(/</g, '&lt;')}</strong><br>${mo.entregas.map((e) => `#${e.numero} · ${(e.bairro ?? '').replace(/</g, '&lt;')}`).join('<br>')}`);
      pontos.push([mo.lat, mo.lng]);
    }
    if (!ref.enquadrou && pontos.length > 1) {
      m.fitBounds(pontos, { padding: [40, 40], maxZoom: 16 });
      ref.enquadrou = true;
    }
  }, [dados, cor]);

  useEffect(() => {
    const ref = mapa.current;
    const mo = dados.motoboys.find((x) => x.id === foco);
    if (ref && mo) ref.m.setView([mo.lat, mo.lng], 16, { animate: true });
  }, [foco, dados.motoboys]);

  return (
    <div className="av">
      <aside className="av-lista" aria-label="Motoboys em rota">
        <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>{dados.motoboys.length} motoboy(s) em rota</strong>
          <button type="button" className="mini" onClick={() => void atualizar()}>Atualizar</button>
        </div>
        {dados.motoboys.length === 0 && (
          <p className="dica" style={{ margin: 0 }}>
            Ninguém em rota agora. O motoboy aparece aqui quando lê o QR da comanda e o celular dele libera a localização.
          </p>
        )}
        {dados.motoboys.map((mo) => {
          const s = segundos(mo.em);
          return (
            <button key={mo.id} type="button" className={`av-card ${foco === mo.id ? 'on' : ''}`} onClick={() => setFoco(mo.id)}>
              <span className="av-bola" style={{ background: s > 120 ? '#8a8f8c' : cor(mo.id) }} aria-hidden="true">{iniciais(mo.nome)}</span>
              <span className="grade" style={{ gap: '0.15rem' }}>
                <strong>{mo.nome ?? 'Motoboy'}</strong>
                <span className={s > 120 ? 'erro' : 'dica'}>
                  {s > 120 ? `sem sinal há ${haQuanto(s)}` : `atualizado há ${haQuanto(s)}`}
                  {mo.velocidade != null && s <= 120 ? ` · ${Math.round(mo.velocidade * 3.6)} km/h` : ''}
                </span>
                {mo.entregas.map((e) => (
                  <span key={e.id} className="av-entrega">
                    #{e.numero} · {e.bairro ?? '—'} · saiu há {haQuanto(segundos(e.saiu_em))}
                    {e.distancia_km != null ? ` · ${formatarKm(Number(e.distancia_km))}` : ''}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
        <p className="dica" style={{ margin: 0 }}>A rota só é enviada enquanto o motoboy tem entrega em rota. Cinza = o celular parou de mandar posição há mais de 2 minutos.</p>
      </aside>
      <div className="av-mapa-caixa">
        {erro && <p className="erro">{erro}</p>}
        <div ref={caixa} className="av-mapa" role="region" aria-label="Mapa dos motoboys" />
      </div>
    </div>
  );
}
