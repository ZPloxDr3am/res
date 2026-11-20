'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SeletorTema } from '@/components/seletor-tema';

// Ícones simples em traço (sem biblioteca), herdam a cor do texto — mesmo desenho do painel do restaurante.
const Icone = ({ d, t = 20 }: { d: string; t?: number }) => (
  <svg width={t} height={t} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

type Link_ = { href: string; rotulo: string; icone: string };
type Familia = 'gestao' | 'inteligencia' | 'config';

// D-127: o painel da empresa usa as famílias da marca SINO, como o painel do restaurante (D-120).
// Mesmas rotas e ícones de antes; só o agrupamento é novo.
const SECOES: { titulo: string; familia: Familia; links: Link_[] }[] = [
  {
    titulo: 'Inteligência',
    familia: 'inteligencia',
    links: [
      { href: '/empresa', rotulo: 'Visão geral', icone: 'M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z' },
      { href: '/empresa/erros', rotulo: 'Erros', icone: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z' },
    ],
  },
  {
    titulo: 'Gestão',
    familia: 'gestao',
    links: [
      { href: '/empresa/restaurantes', rotulo: 'Restaurantes', icone: 'M3 10l9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM9 21v-6h6v6' },
      { href: '/empresa/cobranca', rotulo: 'Cobrança', icone: 'M3 6h18v12H3zM3 10h18M7 15h4' },
      { href: '/empresa/planos', rotulo: 'Planos e preços', icone: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01' },
      { href: '/empresa/convites', rotulo: 'Convites', icone: 'M4 6h16v12H4zM4 7l8 6 8-6' },
    ],
  },
  {
    titulo: 'Configurações',
    familia: 'config',
    links: [
      { href: '/empresa/configuracoes', rotulo: 'Configurações', icone: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z' },
    ],
  },
];
const LINKS = SECOES.flatMap((s) => s.links);
// mesmas cores da folha "Mais" do restaurante: famílias em tomate, Configurações em carvão médio
const COR_SECAO: Record<string, string> = { Gestão: '#F0532B', Inteligência: '#F0532B', Configurações: '#6A6170' };
// barra de baixo do celular: as quatro telas mais usadas + "Mais" (mesmo padrão do restaurante)
const BARRA = ['/empresa', '/empresa/restaurantes', '/empresa/cobranca', '/empresa/convites'];
const SAIR = 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10';

/** tela ativa = rota mais específica que bate com o endereço (/empresa só quando é exatamente /empresa) */
function rotaAtiva(caminho: string): string | null {
  const achados = LINKS.filter((l) => (l.href === '/empresa' ? caminho === '/empresa' : caminho === l.href || caminho.startsWith(l.href + '/')));
  return achados.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

export function NavEmpresa() {
  const ativo = rotaAtiva(usePathname() ?? '');
  const [mais, setMais] = useState(false);
  useEffect(() => setMais(false), [ativo]);
  useEffect(() => {
    if (!mais) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMais(false);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [mais]);

  const item = (l: Link_) => (
    <li key={l.href}>
      <Link href={l.href} className="menu-item" aria-current={ativo === l.href ? 'page' : undefined}>
        <Icone d={l.icone} />
        <span>{l.rotulo}</span>
      </Link>
    </li>
  );
  const naBarra = BARRA.map((h) => LINKS.find((l) => l.href === h)).filter((l): l is Link_ => !!l);
  const ativoForaDaBarra = !!ativo && !BARRA.includes(ativo);

  return (
    <>
      <div className="menu-secoes">
        {SECOES.map((s) => (
          <section key={s.titulo} className="menu-secao" aria-label={s.titulo} data-familia={s.familia} data-ativa={s.links.some((l) => l.href === ativo) ? '' : undefined}>
            <h2 className="menu-secao-titulo">{s.titulo}</h2>
            <ul className="menu-lista">{s.links.map(item)}</ul>
          </section>
        ))}
      </div>
      <ul className="menu-barra">
        {naBarra.map(item)}
        <li>
          <button type="button" className="menu-item" aria-expanded={mais} aria-current={ativoForaDaBarra ? 'page' : undefined} onClick={() => setMais(true)}>
            <Icone d="M4 6h16M4 12h16M4 18h16" />
            <span>{ativoForaDaBarra ? LINKS.find((l) => l.href === ativo)?.rotulo : 'Mais'}</span>
          </button>
        </li>
      </ul>
      {mais && (
        <div className="menu-folha-fundo" role="dialog" aria-modal="true" aria-label="Todas as telas" onClick={(e) => e.target === e.currentTarget && setMais(false)}>
          <div className="menu-folha">
            <div className="menu-folha-topo">
              <picture>
                <source srcSet="/marca/sino-logotipo-horizontal-negativo.svg" media="(prefers-color-scheme: dark)" />
                <img className="s-logo-folha" src="/marca/sino-logotipo-horizontal-cor.svg" alt="SINO" width={96} height={32} />
              </picture>
              <span className="empresa-selo">Empresa</span>
              <button type="button" className="mini" onClick={() => setMais(false)} aria-label="Fechar">✕</button>
            </div>
            {SECOES.map((s) => (
              <section key={s.titulo} className="menu-folha-secao" style={{ ['--cor' as string]: COR_SECAO[s.titulo] ?? '#64748b' }}>
                <h2>{s.titulo}</h2>
                <div className="menu-folha-grade">
                  {s.links.map((l) => (
                    <Link key={l.href} href={l.href} className="menu-bloco" aria-current={ativo === l.href ? 'page' : undefined}>
                      <Icone d={l.icone} />
                      <span>{l.rotulo}</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
            <SeletorTema />
            <form action="/auth/sair" method="post">
              <button className="menu-bloco menu-sair">Sair</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

/** Rodapé do menu no computador e no tablet: tema, Sair e a versão (o celular usa a folha "Mais"). */
export function RodapeEmpresa({ versao }: { versao: string | null }) {
  return (
    <div className="menu-rodape">
      <SeletorTema />
      <form action="/auth/sair" method="post">
        <button className="menu-item">
          <Icone d={SAIR} t={17} />
          <span>Sair</span>
        </button>
      </form>
      {versao && <span className="menu-versao">SINO Empresa · versão {versao}</span>}
    </div>
  );
}
