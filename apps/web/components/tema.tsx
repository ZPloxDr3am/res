'use client';
import { useEffect, useState } from 'react';

// Tema claro, escuro ou automático (D-112). A escolha fica no aparelho (localStorage):
// a cozinha pode ficar no escuro e o escritório no claro. "Automático" segue o celular/computador.
// O <html> recebe data-tema="claro" | "escuro" (o tema que vale agora); o CSS escuro usa :root[data-tema='escuro'].
export type EscolhaTema = 'auto' | 'claro' | 'escuro';
export const CHAVE_TEMA = 'res_tema';
const EVENTO = 'res-tema';

// Roda no <head>, antes de pintar a tela (sem piscar o claro ao abrir no escuro).
// Também acompanha a troca do sistema (automático), outras abas e o seletor abaixo.
export const SCRIPT_TEMA = `(function(){try{var d=document.documentElement,m=window.matchMedia('(prefers-color-scheme: dark)');function a(){var e=null;try{e=localStorage.getItem('${CHAVE_TEMA}')}catch(_){}d.dataset.tema=e==='claro'||e==='escuro'?e:(m.matches?'escuro':'claro')}a();m.addEventListener&&m.addEventListener('change',a);window.addEventListener('storage',function(e){if(e.key==='${CHAVE_TEMA}')a()});window.addEventListener('${EVENTO}',a)}catch(_){}})();`;

function lerEscolha(): EscolhaTema {
  try {
    const v = localStorage.getItem(CHAVE_TEMA);
    return v === 'claro' || v === 'escuro' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function useTema() {
  const [escolha, setEscolha] = useState<EscolhaTema>('auto');
  useEffect(() => setEscolha(lerEscolha()), []);
  const escolher = (t: EscolhaTema) => {
    try {
      if (t === 'auto') localStorage.removeItem(CHAVE_TEMA);
      else localStorage.setItem(CHAVE_TEMA, t);
    } catch {
      /* sem armazenamento: vale só nesta página */
      document.documentElement.dataset.tema = t === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro') : t;
    }
    window.dispatchEvent(new Event(EVENTO));
    setEscolha(t);
  };
  return { escolha, escolher };
}

export const OPCOES_TEMA: { valor: EscolhaTema; rotulo: string; icone: string }[] = [
  { valor: 'claro', rotulo: 'Claro', icone: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' },
  { valor: 'escuro', rotulo: 'Escuro', icone: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z' },
  { valor: 'auto', rotulo: 'Automático', icone: 'M3 5h18v11H3zM8 20h8M12 16v4' },
];
export const iconeTema = (t: EscolhaTema) => OPCOES_TEMA.find((o) => o.valor === t)!.icone;

const Icone = ({ d, tam = 16 }: { d: string; tam?: number }) => (
  <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

// Três botões lado a lado (Claro · Escuro · Automático)
export function SeletorTema({ escolha, escolher }: ReturnType<typeof useTema>) {
  return (
    <div className="tema-opcoes" role="radiogroup" aria-label="Aparência">
      {OPCOES_TEMA.map((o) => (
        <button key={o.valor} type="button" role="radio" aria-checked={escolha === o.valor} className="tema-opcao" onClick={() => escolher(o.valor)}>
          <Icone d={o.icone} />
          <span>{o.rotulo}</span>
        </button>
      ))}
    </div>
  );
}
