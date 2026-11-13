'use client';
import { useEffect, useRef, useState } from 'react';

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
type JanelaComDetector = Window & { BarcodeDetector?: new (o: { formats: string[] }) => Detector };

/**
 * Bipar código de barras (D-103): leitor USB/Bluetooth (funciona como teclado: digita e dá Enter) ou a câmera do
 * celular, onde o navegador tem leitor de código de barras (Chrome no Android). Chama aoLer com os números.
 */
export function Bipar({ aoLer, rotulo = 'Bipe ou digite o código de barras' }: { aoLer: (codigo: string) => void; rotulo?: string }) {
  const [texto, setTexto] = useState('');
  const [camera, setCamera] = useState(false);
  const [temCamera, setTemCamera] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => setTemCamera(typeof (window as JanelaComDetector).BarcodeDetector === 'function' && !!navigator.mediaDevices?.getUserMedia), []);

  useEffect(() => {
    if (!camera) return;
    let parar = false;
    let fluxo: MediaStream | null = null;
    let ultimo = '';
    let ultimoEm = 0;
    (async () => {
      try {
        const Det = (window as JanelaComDetector).BarcodeDetector!;
        const det = new Det({ formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'itf'] });
        fluxo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (parar || !video.current) return fluxo.getTracks().forEach((t) => t.stop());
        video.current.srcObject = fluxo;
        await video.current.play();
        while (!parar) {
          const achados = await det.detect(video.current).catch(() => []);
          const cod = achados[0]?.rawValue?.replace(/\D/g, '') ?? '';
          // o mesmo código só conta de novo depois de 2 s (não lê duas vezes o mesmo produto parado na frente)
          if (cod.length >= 8 && (cod !== ultimo || Date.now() - ultimoEm > 2000)) {
            ultimo = cod;
            ultimoEm = Date.now();
            navigator.vibrate?.(60);
            aoLer(cod);
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        setErro('Não consegui abrir a câmera. Libere a câmera para este site ou use o leitor/teclado.');
        setCamera(false);
      }
    })();
    return () => {
      parar = true;
      fluxo?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera]);

  return (
    <div className="grade nao-imprimir" style={{ gap: '0.4rem' }}>
      <div className="linha" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
        <input
          inputMode="numeric"
          value={texto}
          placeholder={rotulo}
          aria-label={rotulo}
          style={{ maxWidth: '20rem' }}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const cod = texto.replace(/\D/g, '');
            if (cod.length >= 8) aoLer(cod);
            setTexto('');
          }}
        />
        {temCamera && <button type="button" onClick={() => { setErro(null); setCamera((c) => !c); }} aria-pressed={camera}>{camera ? 'Fechar câmera' : '📷 Usar a câmera'}</button>}
      </div>
      {camera && <video ref={video} muted playsInline style={{ width: '100%', maxWidth: 420, borderRadius: 12, background: '#000' }} />}
      {erro && <span className="erro">{erro}</span>}
    </div>
  );
}
