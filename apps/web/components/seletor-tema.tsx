'use client';
import { useEffect, useState } from 'react';

type Tema = 'sistema' | 'claro' | 'escuro';
const OPCOES: [Tema, string][] = [['sistema', 'Auto'], ['claro', 'Claro'], ['escuro', 'Escuro']];

/**
 * Tema da interface SINO (D-120): segue o sistema ou fica fixo em claro/escuro, por aparelho.
 * Guardado no navegador; o script do layout raiz aplica antes de pintar. Vale para todas as telas:
 * os blocos de tema escuro do CSS antigo também obedecem à escolha (globals.css, D-120).
 */
export function SeletorTema() {
  const [tema, setTema] = useState<Tema>('sistema');
  useEffect(() => {
    const t = document.documentElement.dataset.tema;
    setTema(t === 'claro' || t === 'escuro' ? t : 'sistema');
  }, []);
  const escolher = (t: Tema) => {
    setTema(t);
    if (t === 'sistema') delete document.documentElement.dataset.tema;
    else document.documentElement.dataset.tema = t;
    try {
      if (t === 'sistema') localStorage.removeItem('sino-tema');
      else localStorage.setItem('sino-tema', t);
    } catch {
      /* navegador sem armazenamento: vale só nesta aba */
    }
  };
  return (
    <div className="s-tema" role="group" aria-label="Tema da tela">
      {OPCOES.map(([t, rotulo]) => (
        <button key={t} type="button" aria-pressed={tema === t} onClick={() => escolher(t)} title={t === 'sistema' ? 'Seguir o tema do aparelho' : `Sempre ${rotulo.toLowerCase()}`}>
          {rotulo}
        </button>
      ))}
    </div>
  );
}
