import QRCode from 'qrcode';
import { headers } from 'next/headers';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { rotuloLocal, type MapaSalao } from '@/components/salao/tipos';
import { BotaoImprimir } from '@/components/salao/botao-imprimir';

export const metadata = { title: 'QR das mesas' };
export const dynamic = 'force-dynamic';

/** Folha para imprimir e colar nas mesas (D-099): cada QR abre o cardápio daquela mesa. */
export default async function QrMesas() {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('salao_mapa', { p_loja: ctx.lojaId });
  if (error) return <p className="cartao dica">{error.message}</p>;
  const h = await headers();
  const origem = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
  const locais = (data as MapaSalao).locais.filter((l) => l.tipo === 'mesa');
  const qrs = await Promise.all(locais.map(async (l) => ({ l, svg: await QRCode.toString(`${origem}/mesa/${l.qr}`, { type: 'svg', margin: 1, width: 180, errorCorrectionLevel: 'M' }) })));
  return (
    <div className="grade">
      <div className="linha nao-imprimir" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>QR code das mesas</h1>
          <p className="dica" style={{ margin: 0 }}>Imprima, recorte e cole em cada mesa. Trocou o QR de uma mesa em Configurar? Imprima ela de novo.</p>
        </div>
        <BotaoImprimir />
      </div>
      {qrs.length === 0 ? <p className="cartao dica">Cadastre as mesas em Salão → Configurar.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {qrs.map(({ l, svg }) => (
            <div key={l.id} className="cartao" style={{ textAlign: 'center', breakInside: 'avoid', display: 'grid', gap: '0.3rem', justifyItems: 'center' }}>
              <strong style={{ fontSize: '1.3rem' }}>{rotuloLocal(l)}</strong>
              <div dangerouslySetInnerHTML={{ __html: svg }} />
              <span>Aponte a câmera e peça por aqui</span>
              <span className="dica">{ctx.lojaNome}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
