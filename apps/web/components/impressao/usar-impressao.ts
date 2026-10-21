'use client';
import { useState, useTransition } from 'react';
import { imprimirNoNavegador, type CupomFila } from '@/lib/impressao';
import { marcarImpressao } from '@/app/(painel)/impressoras/actions';
import { salvando } from '@/components/tempo-real';

type RC = { ok: true; cupons: CupomFila[] } | { ok: false; erro: string };

/**
 * Pede os cupons ao servidor e imprime pelo navegador os que não têm agente ligado
 * (os de impressora com agente ficam na fila para o agente). Marca na fila o que saiu.
 */
export function useImprimir() {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);

  const imprimir = (acao: () => Promise<RC>) =>
    iniciar(async () => {
      const r = await salvando(acao());
      if (!r.ok) return setAviso({ ok: false, texto: r.erro });
      const aqui = r.cupons.filter((c) => !c.agente_online);
      const agente = r.cupons.filter((c) => c.agente_online);
      if (aqui.length) {
        await imprimirNoNavegador(aqui);
        await marcarImpressao(aqui.map((c) => c.id), 'impresso');
      }
      if (r.cupons.length === 0) setAviso({ ok: true, texto: 'Nada para imprimir.' });
      else
        setAviso({
          ok: true,
          texto: [
            aqui.length ? `${aqui.length} cupom(ns) pelo navegador` : '',
            agente.length ? `${agente.length} enviado(s) para ${[...new Set(agente.map((c) => c.impressora))].join(', ')}` : '',
          ]
            .filter(Boolean)
            .join(' · '),
        });
      setTimeout(() => setAviso(null), 5000);
    });

  return { imprimir, pendente, aviso };
}
