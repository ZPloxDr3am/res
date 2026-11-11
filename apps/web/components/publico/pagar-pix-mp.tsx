'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { formatarReais } from '@res/core';
import { conferirPixMercadoPago, pixMercadoPago } from '@/app/c/[slug]/actions';
import type { PixMp } from '@/lib/mercadopago';

/** Pix com confirmação automática (Mercado Pago, D-044): o pedido vira "pago" sozinho. */
export function PagarPixMp({ codigo, pago: pagoInicial }: { codigo: string; pago: boolean }) {
  const router = useRouter();
  const [pix, setPix] = useState<PixMp | null>(pagoInicial ? { estado: 'pago' } : null);
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [tentar, setTentar] = useState(0);

  useEffect(() => {
    if (pagoInicial) return;
    let vivo = true;
    pixMercadoPago(codigo).then((r) => vivo && setPix(r ?? { estado: 'erro', mensagem: 'Pix indisponível agora.' }));
    return () => {
      vivo = false;
    };
  }, [codigo, pagoInicial, tentar]);

  useEffect(() => {
    if (pix?.estado !== 'aguardando') return;
    if (pix.qr_base64) setQr(`data:image/png;base64,${pix.qr_base64}`);
    else QRCode.toDataURL(pix.qr, { margin: 1, width: 240 }).then(setQr).catch(() => setQr(null));
    // confere a cada 5 s enquanto a página está aberta
    const t = setInterval(async () => {
      if (document.hidden) return;
      if ((await conferirPixMercadoPago(codigo)) === 'pago') {
        setPix({ estado: 'pago' });
        router.refresh();
      }
    }, 5000);
    return () => clearInterval(t);
  }, [pix, codigo, router]);

  if (pix?.estado === 'pago') return <p className="aviso pub-pix-ok">✅ Pagamento por Pix confirmado.</p>;
  if (!pix) return <section className="cartao pub-pix"><span className="dica">Gerando o Pix…</span></section>;
  if (pix.estado === 'erro')
    return (
      <section className="cartao grade pub-pix">
        <span className="erro">{pix.mensagem}</span>
        <button type="button" onClick={() => { setPix(null); setTentar((n) => n + 1); }} style={{ justifySelf: 'start' }}>Tentar de novo</button>
      </section>
    );
  const ate = pix.expira_em ? new Date(pix.expira_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null;
  return (
    <section className="cartao grade pub-pix" aria-label="Pagar com Pix">
      <strong>Pague com Pix: {formatarReais(pix.valor)}</strong>
      <span className="dica">Abra o app do seu banco e leia o QR ou use o copia e cola. A confirmação aparece aqui sozinha.</span>
      {qr && <img src={qr} alt="QR Code do Pix" width={220} height={220} />}
      <div className="pub-pix-codigo">
        <code>{pix.qr}</code>
        <button
          type="button"
          className="botao-primario"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(pix.qr);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2500);
            } catch {}
          }}
        >
          {copiado ? 'Copiado ✓' : 'Copiar código Pix'}
        </button>
      </div>
      <span className="dica">⏳ Aguardando o pagamento{ate ? ` (vale até ${ate})` : ''}.</span>
    </section>
  );
}
