'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatarReais } from '@res/core';
import { pedirAConta } from '@/app/mesa/[token]/actions';

export interface MesaPublica {
  rotulo: string;
  loja: string;
  marcas: { slug: string; nome: string }[];
  conta: {
    status: 'aberta' | 'conta_pedida';
    rodadas: { numero: number; status: string; total: number; itens: string }[] | null;
    subtotal: number;
    taxa_servico_pct: number;
  } | null;
}

const SITUACAO: Record<string, string> = { novo: '⏳ recebido', em_preparo: '🔥 preparando', pronto: '🍽️ pronto', concluido: '✅' };

/** Faixa do topo no QR da mesa: a conta até agora e o botão de pedir a conta. */
export function ContaDaMesa({ token, mesa }: { token: string; mesa: MesaPublica }) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  // acompanha a cozinha enquanto a página estiver aberta
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === 'visible' && router.refresh(), 20000);
    return () => clearInterval(t);
  }, [router]);
  const c = mesa.conta;
  const sub = Math.round((c?.subtotal ?? 0) * 100);
  return (
    <div className="ev-faixa" role="region" aria-label="Sua mesa" style={{ display: 'grid', gap: '0.4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span>🍽️ <b>{mesa.rotulo}</b> · {mesa.loja}</span>
        {c && c.rodadas?.length ? <button type="button" className="mini" onClick={() => setAberta((a) => !a)}>{aberta ? 'Esconder conta' : `Minha conta · ${formatarReais(sub)}`}</button> : <span className="dica">Escolha e envie: vai direto para a mesa.</span>}
      </div>
      {aberta && c && (
        <div style={{ display: 'grid', gap: '0.3rem', textAlign: 'left' }}>
          {(c.rodadas ?? []).map((r) => (
            <div key={r.numero} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
              <span>{r.itens} <span className="dica">{SITUACAO[r.status] ?? ''}</span></span>
              <span>{formatarReais(Math.round(r.total * 100))}</span>
            </div>
          ))}
          {c.taxa_servico_pct > 0 && <span className="dica">+ serviço opcional de {c.taxa_servico_pct.toLocaleString('pt-BR')}% no fechamento</span>}
          {c.status === 'conta_pedida' ? (
            <b>🧾 Conta pedida — o garçom já vem.</b>
          ) : (
            <button type="button" className="botao-primario" disabled={pendente} onClick={() => iniciar(async () => {
              const r = await pedirAConta(token);
              setMsg(r.ok ? 'Pronto! Avisamos que você pediu a conta.' : r.erro);
              router.refresh();
            })}>🧾 Pedir a conta</button>
          )}
          {msg && <span role="status">{msg}</span>}
        </div>
      )}
    </div>
  );
}
