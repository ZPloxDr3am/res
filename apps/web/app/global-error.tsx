'use client';
import { useEffect } from 'react';
import { reportarErro } from '@/lib/erros';

/** Erro no próprio layout raiz (D-084): página mínima, sem depender do resto do app. */
export default function ErroGeral({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportarErro(error, { digest: error.digest }), [error]);
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <h1>O RES não carregou</h1>
        <p>O erro já foi registrado. Tente de novo em instantes.</p>
        <button onClick={() => reset()}>Tentar de novo</button>
      </body>
    </html>
  );
}
