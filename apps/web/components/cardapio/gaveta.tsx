'use client';
import { useEffect, useRef } from 'react';

/** Painel lateral (desliza da direita). Esc ou clique fora fecha. */
export function Gaveta({ titulo, aoFechar, children, largura = 560 }: { titulo: string; aoFechar: () => void; children: React.ReactNode; largura?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', f);
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    return () => window.removeEventListener('keydown', f);
  }, [aoFechar]);
  return (
    <div className="gaveta-fundo" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div ref={ref} className="gaveta" role="dialog" aria-modal="true" aria-label={titulo} style={{ maxWidth: largura }}>
        <div className="gaveta-topo">
          <h2>{titulo}</h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar">✕</button>
        </div>
        <div className="gaveta-corpo">{children}</div>
      </div>
    </div>
  );
}
