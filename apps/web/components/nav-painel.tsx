'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePedidoFlutuante } from '@/components/pedido-flutuante';

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
      { href: '/cardapio', rotulo: 'Cardápio', icone: 'M6 3h12v18l-6-4-6 4zM9 8h6M9 12h6' },
      { href: '/delivery', rotulo: 'Delivery', icone: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
      { href: '/promocoes', rotulo: 'Promoções', icone: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01' },
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
    titulo: 'Ajustes',
    links: [
      { href: '/impressoras', rotulo: 'Impressoras', icone: 'M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z' },
      { href: '/lojas', rotulo: 'Lojas e equipe', icone: 'M3 10l9-6 9 6M5 10v10h14V10M9 20v-6h6v6' },
    ],
  },
];
const LINKS = SECOES.flatMap((s) => s.links);

export function NavPainel() {
  const atual = usePathname();
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
        <Link href={l.href} className="menu-item" title={l.rotulo} aria-current={ativo === l.href ? 'page' : undefined}>
          <Icone d={l.icone} />
          <span>{l.rotulo}</span>
        </Link>
      )}
    </li>
  );
  return (
    <div className="menu-secoes">
      {SECOES.map((s) => (
        <section key={s.titulo} className="menu-secao" aria-label={s.titulo}>
          <h2 className="menu-secao-titulo">{s.titulo}</h2>
          <ul className="menu-lista">{s.links.map(item)}</ul>
        </section>
      ))}
    </div>
  );
}
