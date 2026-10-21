'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/pedidos', rotulo: 'Pedidos' },
  { href: '/pedidos/novo', rotulo: 'Novo pedido' },
  { href: '/cardapio', rotulo: 'Cardápio' },
  { href: '/delivery', rotulo: 'Delivery' },
];

export function NavPainel() {
  const atual = usePathname();
  // o link mais específico que casa com a rota atual fica marcado
  const ativo = LINKS.filter((l) => atual === l.href || atual.startsWith(l.href + '/')).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={ativo === l.href ? 'page' : undefined}>
          {l.rotulo}
        </Link>
      ))}
    </>
  );
}
