'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { planejarRota, type PlanoRota } from '@/app/m/actions';
import { linkRotaMaps, type Entrega } from '@/lib/motoboy';

const hora = (iso: string) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '');

/** Posição atual (rápida, sem travar a tela). null se não der em 6 s. */
function posicaoAtual(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((ok) => {
    if (!('geolocation' in navigator)) return ok(null);
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => ok(null),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 6_000 },
    );
  });
}

/** Rota sugerida quando o motoboy sai com mais de uma comanda (D-027). */
export function PlanoRotaMotoboy({ entregas }: { entregas: Entrega[] }) {
  const router = useRouter();
  const [plano, setPlano] = useState<PlanoRota | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const chave = entregas.map((e) => e.id).sort().join(',');

  const calcular = () =>
    iniciar(async () => {
      setErro(null);
      const r = await planejarRota(await posicaoAtual());
      if (!r.ok) return setErro(r.erro);
      setPlano(r.plano);
      router.refresh(); // as comandas abaixo ficam na ordem da rota
    });

  // nova comanda lida (ou entregue): calcula de novo. Com uma só, calcula também (sem mostrar):
  // a hora prevista vai para a página de acompanhamento do cliente.
  useEffect(() => {
    if (entregas.length >= 2) calcular();
    else setPlano(null);
    if (entregas.length !== 1) return;
    // uma entrega: o cartão procura o endereço primeiro (o mapa gratuito pede 1 busca por segundo)
    const t = setTimeout(calcular, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  // a cada 4 min refaz do ponto onde ele está: a previsão do cliente fica em dia
  useEffect(() => {
    if (entregas.length === 0) return;
    const t = setInterval(() => document.visibilityState === 'visible' && calcular(), 4 * 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  if (entregas.length < 2) return null;
  const ordenadas = plano ? plano.paradas.map((p) => entregas.find((e) => e.id === p.id)).filter((e): e is Entrega => !!e) : entregas;

  return (
    <section className="mb-rota" aria-label="Rota sugerida">
      <div className="mb-rota-topo">
        <strong>🧭 Rota sugerida · {entregas.length} entregas</strong>
        {plano && <span>~{plano.totalMin} min rodando{plano.fonte === 'estimada' ? ' (estimado)' : ''}</span>}
      </div>
      {pendente && !plano && <p className="mb-dica">Calculando a melhor ordem…</p>}
      {erro && <p className="mb-aviso erro">{erro}</p>}
      {plano && (
        <ol className="mb-rota-lista">
          {plano.paradas.map((p) => (
            <li key={p.id} className={p.atrasoMin > 0 ? 'atrasa' : undefined}>
              <span className="mb-rota-num">#{p.numero}</span>
              <span>{p.bairro ?? '—'}</span>
              <span className="mb-rota-hora">
                {p.semLocal ? 'endereço não achado no mapa' : `chega ~${hora(p.chegada)}`}
                {p.atrasoMin > 0 && ` · ${p.atrasoMin} min atrasado`}
                {p.aproximado && ' · aprox.'}
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="mb-botoes">
        <a className="mb-btn maps" href={linkRotaMaps(ordenadas)} target="_blank" rel="noreferrer">🗺️ Abrir rota completa no Maps</a>
        <button type="button" className="mb-btn" disabled={pendente} onClick={calcular}>{pendente ? 'Calculando…' : 'Recalcular daqui'}</button>
      </div>
      <p className="mb-dica">A ordem prioriza o pedido mais atrasado e depois o caminho mais curto. Leu outra comanda? A rota se ajusta sozinha.</p>
    </section>
  );
}
