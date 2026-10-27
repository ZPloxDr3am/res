import type { Metadata } from 'next';
import { Onest } from 'next/font/google';
import './globals.css';

// Uma família só: Onest tem números largos e legíveis (preços, pedidos, horários).
const fonte = Onest({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--fonte' });

export const metadata: Metadata = {
  title: 'RES — Pedidos e gestão para restaurantes',
  description: 'Cardápio, pedidos de delivery e salão, cozinha, entregas e gestão num só lugar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={fonte.variable}>
      <body>{children}</body>
    </html>
  );
}
