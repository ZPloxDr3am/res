'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePedidoFlutuante } from '@/components/pedido-flutuante';
import { SeletorLoja } from '@/components/seletor-loja';
import { rotaLiberada } from '@res/core';

// Ícones simples em traço (sem biblioteca), 20×20, herdam a cor do texto.
const Icone = ({ d }: { d: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

type Link_ = { href: string; rotulo: string; icone: string };
// Agrupado pelo que a pessoa vai fazer: operar a noite, vender, cuidar dos clientes, configurar.
const SECOES: { titulo: string; links: Link_[] }[] = [
  {
    titulo: 'Operação',
    links: [
      { href: '/resumo', rotulo: 'Resumo', icone: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
      { href: '/pedidos', rotulo: 'Pedidos', icone: 'M4 5h16M4 12h16M4 19h10' },
      { href: '/pedidos/novo', rotulo: 'Novo pedido', icone: 'M12 5v14M5 12h14' },
      { href: '/caixa', rotulo: 'Caixa', icone: 'M3 8h18v12H3zM7 8V4h10v4M7 13h4M15 13h2M7 16h10' },
      { href: '/estoque', rotulo: 'Estoque / CMV', icone: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8' },
      { href: '/entregas', rotulo: 'Entregas', icone: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z' },
    ],
  },
  {
    titulo: 'Vendas',
    links: [
      { href: '/relatorios', rotulo: 'Relatórios', icone: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
      { href: '/cardapio', rotulo: 'Cardápio', icone: 'M6 3h12v18l-6-4-6 4zM9 8h6M9 12h6' },
      { href: '/delivery', rotulo: 'Delivery', icone: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
      { href: '/promocoes', rotulo: 'Promoções', icone: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01' },
      { href: '/evento', rotulo: 'Evento / Aniversário', icone: 'M20 12v9H4v-9M2 7h20v5H2zM12 21V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7z' },
    ],
  },
  {
    titulo: 'Clientes',
    links: [
      { href: '/clientes', rotulo: 'Clientes', icone: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
      { href: '/fidelidade', rotulo: 'Fidelidade', icone: 'M12 21l-8-8a5 5 0 0 1 7-7l1 1 1-1a5 5 0 0 1 7 7z' },
    ],
  },
  {
    titulo: 'Gestão',
    links: [
      { href: '/financeiro', rotulo: 'Financeiro', icone: 'M3 6h18v12H3zM3 10h18M7 15h3M15 15h2' },
      { href: '/gestao', rotulo: 'Gestão Empresarial', icone: 'M3 7h18v13H3zM8 7V4h8v3M3 12h18M11 12v2h2v-2' },
    ],
  },
  {
    titulo: 'Ajustes',
    links: [
      { href: '/aplicativos', rotulo: 'Aplicativos', icone: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z' },
      { href: '/impressoras', rotulo: 'Impressoras', icone: 'M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z' },
      { href: '/lojas', rotulo: 'Lojas e equipe', icone: 'M3 10l9-6 9 6M5 10v10h14V10M9 20v-6h6v6' },
      { href: '/assinatura', rotulo: 'Assinatura', icone: 'M3 6h18v12H3zM3 10h18M7 15h4' },
    ],
  },
];
// loja nova (D-076): "Primeiros passos" no topo até o dono concluir
const COMECO = { titulo: 'Começo', links: [{ href: '/comecar', rotulo: 'Primeiros passos', icone: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' }] };
const LINKS = [...COMECO.links, ...SECOES.flatMap((s) => s.links)];

// celular (D-070): barra de baixo com os 4 mais usados + "Mais" (todas as telas, por seção e com cor)
const BARRA = ['/pedidos', '/pedidos/novo', '/estoque', '/resumo'];
const COR_SECAO: Record<string, string> = { Começo: '#ea580c', Operação: '#2563eb', Vendas: '#16a34a', Clientes: '#9333ea', Gestão: '#d97706', Ajustes: '#64748b' };

export function NavPainel({ lojas = [], lojaAtual = '', lojaNome = '', primeirosPassos = false, modulos = null, dono = false, marcas = [], versao = null }: { lojas?: { id: string; nome: string }[]; lojaAtual?: string; lojaNome?: string; primeirosPassos?: boolean; modulos?: string[] | null; dono?: boolean; marcas?: { nome: string; slug: string }[]; versao?: string | null }) {
  // Assinatura só para o dono; telas fora do plano aparecem com cadeado (D-085)
  const secoes = (primeirosPassos ? [COMECO, ...SECOES] : SECOES).map((s) => ({ ...s, links: s.links.filter((l) => l.href !== '/assinatura' || dono) }));
  const travado = (href: string) => (modulos && !rotaLiberada(href, modulos) ? true : undefined);
  const atual = usePathname();
  const [mais, setMais] = useState(false);
  useEffect(() => setMais(false), [atual]);
  const { abrir, estado } = usePedidoFlutuante();
  // o link mais específico que casa com a rota atual fica marcado
  const ativo = LINKS.filter((l) => atual === l.href || atual.startsWith(l.href + '/')).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const item = (l: Link_) => (
    <li key={l.href}>
      {l.href === '/pedidos/novo' ? (
        // abre a janela flutuante por cima da tela atual (a página /pedidos/novo continua existindo)
        <button type="button" className="menu-item" title={estado === 'minimizado' ? 'Retomar pedido' : l.rotulo} onClick={abrir} data-pendente={estado === 'minimizado' ? 'sim' : undefined}>
          <Icone d={l.icone} />
          <span>{estado === 'minimizado' ? 'Retomar pedido' : l.rotulo}</span>
        </button>
      ) : (
        <Link href={l.href} className="menu-item" title={travado(l.href) ? `${l.rotulo} (fora do plano)` : l.rotulo} data-travado={travado(l.href)} aria-current={ativo === l.href ? 'page' : undefined}>
          <Icone d={l.icone} />
          <span>{l.rotulo}</span>
        </Link>
      )}
    </li>
  );
  const naBarra = BARRA.map((h) => LINKS.find((l) => l.href === h)).filter((l): l is Link_ => !!l);
  const ativoForaDaBarra = !!ativo && !BARRA.includes(ativo);
  return (
    <>
      <div className="menu-secoes">
        {secoes.map((s) => (
          <section key={s.titulo} className="menu-secao" aria-label={s.titulo}>
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
              <span className="marca-res">RES</span>
              {lojas.length > 1 ? <SeletorLoja lojas={lojas} atual={lojaAtual} /> : <strong>{lojaNome}</strong>}
              <button type="button" className="mini" onClick={() => setMais(false)} aria-label="Fechar">✕</button>
            </div>
            {secoes.map((s) => (
              <section key={s.titulo} className="menu-folha-secao" style={{ ['--cor' as string]: COR_SECAO[s.titulo] ?? '#64748b' }}>
                <h2>{s.titulo}</h2>
                <div className="menu-folha-grade">
                  {s.links.map((l) =>
                    l.href === '/pedidos/novo' ? (
                      <button key={l.href} type="button" className="menu-bloco" onClick={() => { setMais(false); abrir(); }}>
                        <Icone d={l.icone} />
                        <span>{l.rotulo}</span>
                      </button>
                    ) : (
                      <Link key={l.href} href={l.href} className="menu-bloco" aria-current={ativo === l.href ? 'page' : undefined}>
                        <Icone d={l.icone} />
                        <span>{l.rotulo}</span>
                      </Link>
                    ),
                  )}
                </div>
              </section>
            ))}
            <LinksESuporte marcas={marcas} lojaNome={lojaNome} />
            <form action="/auth/sair" method="post">
              <button className="menu-bloco menu-sair">Sair</button>
            </form>
            {versao && <p className="dica" style={{ margin: 0, textAlign: 'center' }}>RES · versão {versao}</p>}
          </div>
        </div>
      )}
    </>
  );
}

// Celular (D-091): Meus links e Suporte também na folha "Mais" (no computador ficam no rodapé do menu)
const SUPORTE_WHATSAPP = (process.env.NEXT_PUBLIC_SUPORTE_WHATSAPP ?? '').replace(/\D/g, '');
function LinksESuporte({ marcas, lojaNome }: { marcas: { nome: string; slug: string }[]; lojaNome: string }) {
  const [copiado, setCopiado] = useState<string | null>(null);
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
  const msg = encodeURIComponent(`Olá! Sou da ${lojaNome} e preciso de ajuda com o RES.`);
  return (
    <section className="menu-folha-secao menu-folha-links" style={{ ['--cor' as string]: '#0891b2' }}>
      <h2>Meus links</h2>
      {marcas.length === 0 && <p className="dica" style={{ margin: 0 }}>Nenhum cardápio ainda.</p>}
      {marcas.map((m) => {
        const url = `${origem}/c/${m.slug}`;
        return (
          <div key={m.slug} className="menu-link-linha">
            <span><strong>{m.nome}</strong><br /><span className="dica">/c/{m.slug}</span></span>
            <button type="button" className="mini" onClick={() => void copiar(url)}>{copiado === url ? 'Copiado ✓' : 'Copiar'}</button>
            <a className="mini botao" href={url} target="_blank" rel="noopener noreferrer">Abrir</a>
          </div>
        );
      })}
      <h2 style={{ marginTop: 'var(--e3)' }}>Suporte</h2>
      {SUPORTE_WHATSAPP ? (
        <a className="menu-bloco" href={`https://wa.me/${SUPORTE_WHATSAPP}?text=${msg}`} target="_blank" rel="noopener noreferrer">💬 Falar com o suporte no WhatsApp</a>
      ) : (
        <p className="dica" style={{ margin: 0 }}>O WhatsApp do suporte será informado em breve.</p>
      )}
    </section>
  );
}
