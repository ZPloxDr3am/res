import type { Metadata, Viewport } from 'next';
import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'RES Motoboy',
  manifest: '/m/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'RES Motoboy', statusBarStyle: 'black-translucent' },
};
export const viewport: Viewport = { themeColor: '#1f6f5c', width: 'device-width', initialScale: 1, maximumScale: 1 };

/** App do motoboy: tela de celular, sem o menu do painel. */
export default async function LayoutMotoboy({ children }: { children: React.ReactNode }) {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?voltar=/m');
  return <div className="mb">{children}</div>;
}
