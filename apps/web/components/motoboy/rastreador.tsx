'use client';
import { useEffect, useState } from 'react';
import { clienteNavegador } from '@/lib/supabase/client';

// Plugins nativos do app Android (Capacitor), quando a página roda dentro dele.
type Watcher = (loc: { latitude: number; longitude: number; accuracy?: number; speed?: number | null; bearing?: number | null } | undefined, erro?: { code?: string }) => void;
type Capacitor = {
  Plugins?: {
    BackgroundGeolocation?: {
      addWatcher: (o: Record<string, unknown>, cb: Watcher) => Promise<string>;
      removeWatcher: (o: { id: string }) => Promise<void>;
      openSettings: () => Promise<void>;
    };
    CapacitorHttp?: { request: (o: Record<string, unknown>) => Promise<{ status: number; data: unknown }> };
  };
};
const cap = () => (typeof window === 'undefined' ? undefined : (window as unknown as { Capacitor?: Capacitor }).Capacitor);

export type EstadoRastreio = 'desligado' | 'ligando' | 'ativo' | 'negado' | 'sem-gps';

/**
 * Manda a posição do motoboy enquanto ele tem entrega em rota (D-026). No app Android usa o GPS em
 * segundo plano (aviso fixo na barra do celular) e envio nativo, que o Android não segura com a
 * tela desligada; no navegador, só enquanto a página está aberta.
 */
export function useRastreio(ativo: boolean): { estado: EstadoRastreio; ultimo: Date | null; nativo: boolean; abrirAjustes: () => void } {
  const [estado, setEstado] = useState<EstadoRastreio>('desligado');
  const [ultimo, setUltimo] = useState<Date | null>(null);
  const [nativo, setNativo] = useState(false);

  useEffect(() => {
    const bg = cap()?.Plugins?.BackgroundGeolocation;
    const http = cap()?.Plugins?.CapacitorHttp;
    setNativo(!!bg);
    if (!ativo) {
      setEstado('desligado');
      return;
    }
    const supabase = clienteNavegador();
    let fim = false;
    let token: string | null = null;
    let ultimoEnvio = 0;
    let watcherId: string | null = null;
    let webId: number | null = null;

    const pegarToken = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token ?? null;
      } catch {
        /* sem rede: tenta de novo depois */
      }
    };
    void pegarToken();
    const renovar = setInterval(pegarToken, 4 * 60 * 1000);

    const desligar = () => {
      fim = true;
      if (watcherId && bg) void bg.removeWatcher({ id: watcherId }).catch(() => {});
      if (webId != null) navigator.geolocation.clearWatch(webId);
    };

    const enviar = async (lat: number, lng: number, precisao?: number, velocidade?: number | null, rumo?: number | null) => {
      const agora = Date.now();
      if (fim || agora - ultimoEnvio < 10_000) return; // no máximo a cada 10 s
      ultimoEnvio = agora;
      const corpo = { p_lat: lat, p_lng: lng, p_precisao: precisao ?? null, p_velocidade: velocidade ?? null, p_rumo: rumo ?? null };
      try {
        let segue = true;
        if (http && token) {
          // envio nativo: continua funcionando com a tela desligada
          const r = await http.request({
            method: 'POST',
            url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/registrar_posicao`,
            headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: corpo,
          });
          if (r.status === 401) return void pegarToken();
          const d = (typeof r.data === 'string' ? JSON.parse(r.data || '{}') : r.data) as { ativo?: boolean } | null;
          segue = d?.ativo !== false;
        } else {
          const { data, error } = await supabase.rpc('registrar_posicao', corpo);
          if (error) return;
          segue = (data as { ativo?: boolean } | null)?.ativo !== false;
        }
        setUltimo(new Date());
        setEstado('ativo');
        if (!segue) {
          desligar();
          setEstado('desligado');
        }
      } catch {
        /* sem rede agora: o próximo ponto tenta de novo */
      }
    };

    setEstado('ligando');
    if (bg) {
      bg.addWatcher(
        {
          backgroundTitle: 'RES Motoboy',
          backgroundMessage: 'Compartilhando sua rota com a loja enquanto houver entrega.',
          requestPermissions: true,
          stale: false,
          distanceFilter: 15,
        },
        (loc, erro) => {
          if (erro) return setEstado(erro.code === 'NOT_AUTHORIZED' ? 'negado' : 'sem-gps');
          if (loc) void enviar(loc.latitude, loc.longitude, loc.accuracy, loc.speed, loc.bearing);
        },
      )
        .then((id) => {
          watcherId = id;
          if (fim) void bg.removeWatcher({ id }).catch(() => {});
        })
        .catch(() => setEstado('sem-gps'));
    } else if ('geolocation' in navigator) {
      webId = navigator.geolocation.watchPosition(
        (p) => void enviar(p.coords.latitude, p.coords.longitude, p.coords.accuracy, p.coords.speed, p.coords.heading),
        (e) => setEstado(e.code === e.PERMISSION_DENIED ? 'negado' : 'sem-gps'),
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
      );
    } else {
      setEstado('sem-gps');
    }

    return () => {
      clearInterval(renovar);
      desligar();
    };
  }, [ativo]);

  return { estado, ultimo, nativo, abrirAjustes: () => void cap()?.Plugins?.BackgroundGeolocation?.openSettings().catch(() => {}) };
}

/** Faixa no app do motoboy dizendo se a rota está sendo compartilhada. */
export function FaixaRastreio({ ativo }: { ativo: boolean }) {
  const { estado, ultimo, nativo, abrirAjustes } = useRastreio(ativo);
  const [, tique] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tique((x) => x + 1), 5000);
    return () => clearInterval(t);
  }, []);
  if (!ativo) return null;
  const ha = ultimo ? Math.round((Date.now() - ultimo.getTime()) / 1000) : null;
  return (
    <div className={`mb-rastreio ${estado}`} role="status">
      {estado === 'ativo' && <span>📍 Rota compartilhada com a loja{ha != null ? ` · enviada há ${ha < 60 ? `${ha}s` : `${Math.round(ha / 60)} min`}` : ''}</span>}
      {estado === 'ligando' && <span>📍 Ligando o GPS… aceite o pedido de localização.</span>}
      {estado === 'negado' && (
        <>
          <span>⚠ Localização bloqueada: a loja não vê sua rota.</span>
          {nativo ? <button type="button" className="mb-btn" onClick={abrirAjustes}>Abrir ajustes</button> : <span className="mb-dica">Libere a localização para este site nas configurações do navegador.</span>}
        </>
      )}
      {estado === 'sem-gps' && <span>⚠ GPS sem sinal. Confira se a localização do celular está ligada.</span>}
      {!nativo && estado !== 'negado' && <span className="mb-dica">No navegador a rota só é enviada com esta tela aberta. No app RES Motoboy ela segue mesmo com a tela desligada.</span>}
    </div>
  );
}
