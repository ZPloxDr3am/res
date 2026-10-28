'use client';
import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { formatarReais, pixCopiaECola } from '@res/core';

/** Pix do pedido (D-042): QR com o valor e "copia e cola". A loja confirma o pagamento no painel. */
export function PagarPix({ pix }: { pix: { chave: string; nome: string; cidade: string; valor: number; numero: number; pago: boolean } }) {
  const codigo = useMemo(() => pixCopiaECola({ chave: pix.chave, nome: pix.nome, cidade: pix.cidade, valor: pix.valor, txid: `RES${pix.numero}` }), [pix]);
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    QRCode.toDataURL(codigo, { margin: 1, width: 240 }).then(setQr).catch(() => setQr(null));
  }, [codigo]);

  if (pix.pago) return <p className="aviso pub-pix-ok">✅ Pagamento por Pix confirmado pela loja.</p>;
  return (
    <section className="cartao grade pub-pix" aria-label="Pagar com Pix">
      <strong>Pague com Pix: {formatarReais(pix.valor)}</strong>
      <span className="dica">Abra o app do seu banco e leia o QR ou use o Pix copia e cola. Recebedor: {pix.nome}.</span>
      {qr && <img src={qr} alt="QR Code do Pix" width={220} height={220} />}
      <div className="pub-pix-codigo">
        <code>{codigo}</code>
        <button
          type="button"
          className="botao-primario"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(codigo);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2500);
            } catch {}
          }}
        >
          {copiado ? 'Copiado ✓' : 'Copiar código Pix'}
        </button>
      </div>
      <span className="dica">Depois de pagar, a loja confere e confirma. Se puder, mande o comprovante para a loja.</span>
    </section>
  );
}
