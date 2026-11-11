import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import QRCode from 'qrcode';
import { DESCRICAO_EXEMPLO, type EstadoPrimeirosPassos } from '@res/core';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { PrimeirosPassos } from '@/components/cadastro/primeiros-passos';

export const dynamic = 'force-dynamic';

/** Primeiros passos da loja nova (D-076): o que falta para abrir o cardápio e vender. */
export default async function Comecar() {
  const ctx = await contextoLoja();
  if (ctx.papel !== 'dono' && ctx.papel !== 'gerente') redirect('/pedidos');
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('primeiros_passos', { p_loja: ctx.lojaId, p_descricao_exemplo: DESCRICAO_EXEMPLO });
  if (error) throw new Error(error.message);
  const e = data as EstadoPrimeirosPassos & { tipo: string | null; ocultos: boolean };
  const h = await headers();
  const origem = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
  const link = e.slug ? `${origem}/c/${e.slug}` : null;
  const qr = link ? await QRCode.toString(link, { type: 'svg', margin: 1, width: 180, errorCorrectionLevel: 'M' }) : null;
  return <PrimeirosPassos estado={e} tipo={e.tipo} ocultos={e.ocultos} link={link} qr={qr} lojaNome={ctx.lojaNome} />;
}
