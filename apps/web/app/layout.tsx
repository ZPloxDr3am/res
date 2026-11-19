import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import './sino.css';
import { CapturaErros } from '@/components/captura-erros';

// Uma família só: Onest tem números largos e legíveis (preços, pedidos, horários).
// Fontes guardadas no projeto (D-089): o build não depende mais do Google Fonts (o CI falhava ao baixar).
const fonte = localFont({ src: './fontes/Onest.woff', weight: '100 900', display: 'swap', variable: '--fonte' });
// Números e títulos (D-080): Bricolage Grotesque dá voz de comanda a preços, totais, nº do pedido e indicadores.
const display = localFont({ src: './fontes/BricolageGrotesque.woff', weight: '200 800', display: 'swap', variable: '--fonte-display' });
// SINO (D-120): Inter em toda a interface nova; Outfit só em telas de marca. Sem pré-carregar: o cardápio do cliente não usa. Licença SIL OFL.
const inter = localFont({ src: './fontes/Inter.woff2', weight: '100 900', display: 'swap', variable: '--fonte-inter', preload: false });
const outfit = localFont({ src: './fontes/Outfit.woff2', weight: '100 900', display: 'swap', variable: '--fonte-outfit', preload: false });

// Tema escolhido (D-120): aplicado antes de pintar, para não piscar. Sem escolha = segue o sistema.
const TEMA = `try{var t=localStorage.getItem('sino-tema');if(t==='claro'||t==='escuro')document.documentElement.dataset.tema=t}catch(e){}`;

export const metadata: Metadata = {
  title: 'RES — Pedidos e gestão para restaurantes',
  description: 'Cardápio, pedidos de delivery e salão, cozinha, entregas e gestão num só lugar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fonte.variable} ${display.variable} ${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA }} />
      </head>
      <body>
        <CapturaErros />
        {children}
      </body>
    </html>
  );
}
