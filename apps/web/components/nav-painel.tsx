'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Ícones simples em traço (sem biblioteca), 20×20, herdam a cor do texto.
const Icone = ({ d }: { d: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const LINKS = [
  { href: '/pedidos', rotulo: 'Pedidos', icone: 'M4 5h16M4 12h16M4 19h10' },
  { href: '/pedidos/novo', rotulo: 'Novo pedido', icone: 'M12 5v14M5 12h14' },
  { href: '/cardapio', rotulo: 'Cardápio', icone: 'M6 3h12v18l-6-4-6 4zM9 8h6M9 12h6' },
  { href: '/delivery', rotulo: 'Delivery', icone: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z' },
];

export function NavPainel() {
  const atual = usePathname();
  // o link mais específico que casa com a rota atual fica marcado
  const ativo = LINKS.filter((l) => atual === l.href || atual.startsWith(l.href + '/')).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <ul className="menu-lista">
      {LINKS.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className="menu-item" title={l.rotulo} aria-current={ativo === l.href ? 'page' : undefined}>
            <Icone d={l.icone} />
            <span>{l.rotulo}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
