'use client';
import { useEffect, useState } from 'react';
import type { ConfigRastreio, EventoRastreio } from '@/lib/rastreio';

type Janela = Window & {
  fbq?: ((...a: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
  _fbq?: unknown;
  dataLayer?: unknown[];
  gtag?: (...a: unknown[]) => void;
  __resRastreio?: string;
};
const CHAVE = 'res_cookies';

function script(src: string) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/** Carrega os pixels uma vez por página (Meta, gtag do Analytics/Ads e Tag Manager). */
function carregar(c: ConfigRastreio) {
  const w = window as Janela;
  const chave = JSON.stringify(c);
  if (w.__resRastreio === chave) return;
  w.__resRastreio = chave;
  if (c.meta_pixel && !w.fbq) {
    const f = function (...a: unknown[]) {
      if (f.callMethod) f.callMethod(...a);
      else f.queue!.push(a);
    } as NonNullable<Janela['fbq']>;
    f.push = f;
    f.loaded = true;
    f.version = '2.0';
    f.queue = [];
    w.fbq = f;
    w._fbq = f;
    script('https://connect.facebook.net/en_US/fbevents.js');
    w.fbq('init', c.meta_pixel.id);
    w.fbq('track', 'PageView');
  }
  const gtagId = c.google_analytics?.id ?? c.google_ads?.id;
  if (gtagId && !w.gtag) {
    w.dataLayer = w.dataLayer || [];
    w.gtag = function () {
      // gtag precisa do objeto arguments
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer!.push(arguments);
    };
    script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtagId)}`);
    w.gtag('js', new Date());
    if (c.google_analytics) w.gtag('config', c.google_analytics.id);
    if (c.google_ads) w.gtag('config', c.google_ads.id);
  }
  if (c.google_tag_manager) {
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
    script(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(c.google_tag_manager.id)}`);
  }
}

function enviar(c: ConfigRastreio, e: EventoRastreio) {
  const w = window as Janela;
  const reais = (v: number) => Math.round(v) / 100;
  if (e.tipo === 'add_to_cart') {
    w.fbq?.('track', 'AddToCart', { content_ids: [e.id], content_name: e.nome, content_type: 'product' });
    w.gtag?.('event', 'add_to_cart', { items: [{ item_id: e.id, item_name: e.nome }] });
    w.dataLayer?.push({ event: 'add_to_cart', item_id: e.id, item_name: e.nome });
  } else if (e.tipo === 'begin_checkout') {
    w.fbq?.('track', 'InitiateCheckout', { value: reais(e.valor), currency: 'BRL' });
    w.gtag?.('event', 'begin_checkout', { value: reais(e.valor), currency: 'BRL' });
    w.dataLayer?.push({ event: 'begin_checkout', value: reais(e.valor), currency: 'BRL' });
  } else {
    w.fbq?.('track', 'Purchase', { value: reais(e.valor), currency: 'BRL' }, { eventID: e.codigo });
    w.gtag?.('event', 'purchase', { transaction_id: e.codigo, value: reais(e.valor), currency: 'BRL' });
    if (c.google_ads?.rotulo) w.gtag?.('event', 'conversion', { send_to: `${c.google_ads.id}/${c.google_ads.rotulo}`, value: reais(e.valor), currency: 'BRL', transaction_id: e.codigo });
    w.dataLayer?.push({ event: 'purchase', transaction_id: e.codigo, value: reais(e.valor), currency: 'BRL' });
  }
}

/**
 * Pixels de anúncio do cardápio (D-042). Só carrega depois que o cliente aceita (LGPD).
 * compra: na página do pedido, conta a venda uma vez por pedido.
 */
export function Rastreamento({ config, compra }: { config: ConfigRastreio; compra?: { codigo: string; numero: number; valor: number } }) {
  const tem = Object.keys(config).length > 0;
  const [aceite, setAceite] = useState<'sim' | 'nao' | null | 'lendo'>('lendo');

  useEffect(() => {
    if (!tem) return;
    try {
      const v = localStorage.getItem(CHAVE);
      setAceite(v === 'sim' || v === 'nao' ? v : null);
    } catch {
      setAceite(null);
    }
  }, [tem]);

  useEffect(() => {
    if (!tem || aceite !== 'sim') return;
    carregar(config);
    const ouvir = (ev: Event) => enviar(config, (ev as CustomEvent<EventoRastreio>).detail);
    window.addEventListener('res:rastreio', ouvir);
    if (compra) {
      const k = `res_compra_${compra.codigo}`;
      let ja = false;
      try {
        ja = localStorage.getItem(k) === '1';
        if (!ja) localStorage.setItem(k, '1');
      } catch {}
      if (!ja) enviar(config, { tipo: 'purchase', ...compra });
    }
    return () => window.removeEventListener('res:rastreio', ouvir);
  }, [tem, aceite, config, compra]);

  const escolher = (v: 'sim' | 'nao') => {
    try {
      localStorage.setItem(CHAVE, v);
    } catch {}
    setAceite(v);
  };

  if (!tem || aceite !== null) return null;
  return (
    <div className="pub-cookies" role="dialog" aria-label="Cookies">
      <span>Esta loja usa cookies do Meta e do Google para medir os anúncios. Você escolhe.</span>
      <div className="linha" style={{ gap: '0.4rem' }}>
        <button type="button" onClick={() => escolher('nao')}>Recusar</button>
        <button type="button" className="botao-primario" onClick={() => escolher('sim')}>Aceitar</button>
      </div>
    </div>
  );
}
