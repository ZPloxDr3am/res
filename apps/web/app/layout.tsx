import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RES — Pedidos e gestão para restaurantes',
  description: 'Cardápio, pedidos de delivery e salão, cozinha, entregas e gestão num só lugar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
