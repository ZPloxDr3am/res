'use client';
import { useEffect, useState } from 'react';
import { sugerirLotes, type SugestaoLoja } from '@/app/(painel)/pedidos/expedicao';

/** "Estes saem juntos": lotes sugeridos para os pedidos de entrega prontos (D-028). */
export function SugestaoLotes({ prontos }: { prontos: { id: string; loja_id: string }[] }) {
  const [sug, setSug] = useState<SugestaoLoja[] | null>(null);
  const [calculando, setCalculando] = useState(false);
  const chave = prontos.map((p) => p.id).sort().join(',');
  const lojas = [...new Set(prontos.map((p) => p.loja_id))].sort().join(',');
  const algumaLojaComDois = Object.values(prontos.reduce<Record<string, number>>((a, p) => ((a[p.loja_id] = (a[p.loja_id] ?? 0) + 1), a), {})).some((n) => n >= 2);

  useEffect(() => {
    if (!algumaLojaComDois) return setSug(null);
    let vivo = true;
    setCalculando(true);
    // espera um pouco: vários pedidos ficam prontos de uma vez
    const t = setTimeout(() => {
      sugerirLotes(lojas.split(','))
        .then((r) => vivo && setSug(r))
        .catch(() => vivo && setSug(null))
        .finally(() => vivo && setCalculando(false));
    }, 1200);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  if (!algumaLojaComDois) return null;
  const juntos = (sug ?? []).flatMap((l) => l.lotes.filter((x) => x.pedidos.length > 1).map((x) => ({ ...x, loja: l.loja })));
  const variasLojas = (sug ?? []).length > 1;

  return (
    <section className="lotes" aria-label="Sugestão de saída">
      <strong>🛵 Sugestão de saída</strong>
      {calculando && !sug && <span className="dica">Vendo quem fica no mesmo caminho…</span>}
      {sug && juntos.length === 0 && <span className="dica">Os pedidos prontos ficam em lados diferentes: melhor sair um por motoboy.</span>}
      {juntos.map((l, k) => (
        <div key={k} className="lote">
          <span className="lote-num">Juntos {k + 1}</span>
          <span>
            {l.pedidos.map((p) => `#${p.numero}${p.bairro ? ` ${p.bairro}` : ''}`).join(' → ')}
          </span>
          <span className="dica">
            {l.totalMin > 0 ? `~${l.totalMin} min de rota` : 'mesmo bairro'}
            {l.atrasoMin > 0 ? ` · ${l.atrasoMin} min de atraso no total` : ''}
            {variasLojas ? ` · ${l.loja}` : ''}
          </span>
        </div>
      ))}
      {juntos.length > 0 && <span className="dica">Entregue as comandas de cada grupo ao mesmo motoboy. Ele lê os QRs e o app monta a ordem.</span>}
    </section>
  );
}
