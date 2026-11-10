'use client';
import { useEffect, useRef, useState } from 'react';

// Rodapé fixo do menu (D-081): Meus links, Suporte, Sair e a versão. Fica sempre visível, embaixo.
const SUPORTE_WHATSAPP = (process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP ?? '').replace(/\D/g, '');

const Icone = ({ d }: { d: string }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export function MenuRodape({ marcas, lojaNome, versao, equipeRes = false }: { marcas: { nome: string; slug: string }[]; lojaNome: string; versao: string | null; equipeRes?: boolean }) {
  const [aberto, setAberto] = useState<'links' | 'suporte' | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => !caixa.current?.contains(e.target as Node) && setAberto(null);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(null);
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);
  const origem = typeof window !== 'undefined' ? window.location.origin : '';
  const copiar = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(url);
      setTimeout(() => setCopiado(null), 1800);
    } catch {
      /* sem permissão */
    }
  };
  const alternar = (q: 'links' | 'suporte') => setAberto((a) => (a === q ? null : q));

  return (
    <div className="menu-rodape" ref={caixa}>
      {aberto === 'links' && (
        <div className="menu-pop" role="dialog" aria-label="Meus links">
          <strong>Links do cardápio</strong>
          {marcas.length === 0 && <span className="dica">Nenhum cardápio nesta loja.</span>}
          {marcas.map((m) => {
            const url = `${origem}/c/${m.slug}`;
            return (
              <div key={m.slug} className="menu-pop-linha">
                <span className="menu-pop-nome">{m.nome}<span className="dica">/c/{m.slug}</span></span>
                <button type="button" className="mini" onClick={() => copiar(url)}>{copiado === url ? 'Copiado ✓' : 'Copiar'}</button>
                <a className="botao mini" href={url} target="_blank" rel="noopener noreferrer">Abrir</a>
              </div>
            );
          })}
        </div>
      )}
      {aberto === 'suporte' && (
        <div className="menu-pop" role="dialog" aria-label="Suporte">
          <strong>Suporte do RES</strong>
          {SUPORTE_WHATSAPP ? (
            <>
              <span className="dica">Fale com o time pelo WhatsApp. Diga a loja e o que aconteceu; um print ajuda.</span>
              <a
                className="botao botao-primario"
                href={`https://wa.me/${SUPORTE_WHATSAPP}?text=${encodeURIComponent(`Olá! Sou da ${lojaNome} e preciso de ajuda com o RES: `)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Chamar no WhatsApp
              </a>
            </>
          ) : (
            <span className="dica">O canal de suporte está sendo configurado. Enquanto isso, fale direto com quem implantou o RES na sua loja.</span>
          )}
        </div>
      )}
      <button type="button" className="menu-item" aria-expanded={aberto === 'links'} onClick={() => alternar('links')}>
        <Icone d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
        <span>Meus links</span>
      </button>
      <button type="button" className="menu-item" aria-expanded={aberto === 'suporte'} onClick={() => alternar('suporte')}>
        <Icone d="M4 14v-2a8 8 0 0 1 16 0v2M4 14a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2zm16 0a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2zM17 16v1a3 3 0 0 1-3 3h-2" />
        <span>Suporte</span>
      </button>
      {equipeRes && (
        <a className="menu-item" href="/equipe-res">
          <Icone d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z" />
          <span>Equipe RES</span>
        </a>
      )}
      <form action="/auth/sair" method="post">
        <button className="menu-item">
          <Icone d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />
          <span>Sair</span>
        </button>
      </form>
      {versao && <span className="menu-versao">RES · versão {versao}</span>}
    </div>
  );
}
