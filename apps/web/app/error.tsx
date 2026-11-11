'use client';
import { useEffect } from 'react';
import { reportarErro } from '@/lib/erros';

/** Tela de erro (D-084): registra para a equipe e oferece tentar de novo. */
export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportarErro(error, { digest: error.digest }), [error]);
  return (
    <main className="conteudo" style={{ maxWidth: 480, marginTop: '10vh' }}>
      <div className="cartao grade">
        <span className="marca-res">RES</span>
        <h1 style={{ margin: 0 }}>Esta tela não carregou</h1>
        <p style={{ margin: 0 }}>O erro já foi registrado para o time do RES. Tente de novo; se continuar, recarregue a página ou fale com o Suporte.</p>
        <div className="linha">
          <button className="botao-primario" onClick={() => reset()}>Tentar de novo</button>
          <button className="botao" onClick={() => location.reload()}>Recarregar</button>
        </div>
        {error.digest && <span className="dica">Código: {error.digest}</span>}
      </div>
    </main>
  );
}
