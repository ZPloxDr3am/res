import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { CapturaErros } from '@/components/captura-erros';
import { SCRIPT_TEMA } from '@/components/tema';

// Uma família só: Onest tem números largos e legíveis (preços, pedidos, horários).
// Fontes guardadas no projeto (D-089): o build não depende mais do Google Fonts (o CI falhava ao baixar).
const fonte = localFont({ src: './fontes/Onest.woff', weight: '100 900', display: 'swap', variable: '--fonte' });
// Números e títulos (D-080): Bricolage Grotesque dá voz de comanda a preços, totais, nº do pedido e indicadores.
const display = localFont({ src: './fontes/BricolageGrotesque.woff', weight: '200 800', display: 'swap', variable: '--fonte-display' });

export const metadata: Metadata = {
  title: 'RES — Pedidos e gestão para restaurantes',
  description: 'Cardápio, pedidos de delivery e salão, cozinha, entregas e gestão num só lugar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: o script do tema põe data-tema no <html> antes do React (D-112)
    <html lang="pt-BR" className={`${fonte.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        <CapturaErros />
        {children}
      </body>
    </html>
  );
}
