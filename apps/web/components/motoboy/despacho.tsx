'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { despachar } from '@/app/m/actions';
import { cobranca, linkMaps, type Entrega } from '@/lib/motoboy';

/** Aberto pelo QR da comanda (câmera do celular): registra a saída e mostra o essencial. */
export function Despacho({ token }: { token: string }) {
  const [r, setR] = useState<{ ok: true; entrega: Entrega } | { ok: false; erro: string } | null>(null);
  const feito = useRef(false);

  useEffect(() => {
    if (feito.current) return; // uma vez só (o React chama duas vezes em desenvolvimento)
    feito.current = true;
    void despachar(token).then((x) => {
      setR(x);
      try {
        navigator.vibrate?.(x.ok ? [60] : [80, 60, 80]);
      } catch {
        /* sem vibração */
      }
    });
  }, [token]);

  if (!r) return <main className="mb-vazio"><p className="mb-titulo">Registrando a saída do pedido…</p></main>;
  if (!r.ok) {
    return (
      <main className="mb-vazio">
        <p className="mb-aviso erro">✕ {r.erro}</p>
        <Link href="/m" className="mb-btn">Abrir minhas entregas</Link>
      </main>
    );
  }
  const e = r.entrega;
  const c = cobranca(e);
  return (
    <main className="mb-vazio">
      <p className="mb-aviso ok">✓ Pedido #{e.numero} saiu com você.</p>
      <div className={`mb-cobrar ${c.cobrar ? 'sim' : 'nao'}`}>
        <strong>{c.titulo}</strong>
        <span>{c.detalhe}</span>
      </div>
      {e.endereco && (
        <div className="mb-endereco">
          <span className="mb-rotulo">{e.cliente}</span>
          <strong>{e.endereco.logradouro}{e.endereco.numero ? `, ${e.endereco.numero}` : ''}</strong>
          <span className="mb-bairro">{e.endereco.bairro}</span>
        </div>
      )}
      <div className="mb-botoes">
        {e.endereco && <a className="mb-btn maps" href={linkMaps(e)} target="_blank" rel="noreferrer">🗺️ Abrir no Google Maps</a>}
        <Link href="/m" className="mb-btn">Minhas entregas</Link>
      </div>
    </main>
  );
}
