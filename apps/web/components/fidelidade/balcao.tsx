'use client';
import { useEffect, useState } from 'react';
import { cashbackUsavel, formatarReais, ganhoFidelidade, type CanalFidelidade } from '@res/core';
import { saldoDoCliente } from '@/app/(painel)/fidelidade/actions';
import type { SaldoCliente } from '@/lib/fidelidade';

export type UsoFidelidade = { cashback: number; recompensa: string | null };

/**
 * Novo pedido no balcão (D-031): saldo do cliente escolhido, usar cashback e trocar pontos.
 * A conta aqui é prévia; o banco confere tudo ao lançar.
 */
export function FidelidadeBalcao({ clienteId, aPagar, entrega, uso, aoMudar }: { clienteId: string; aPagar: number; entrega: boolean; uso: UsoFidelidade; aoMudar: (u: UsoFidelidade) => void }) {
  const [s, setS] = useState<SaldoCliente | null | undefined>(undefined);
  useEffect(() => {
    let vivo = true;
    setS(undefined);
    saldoDoCliente(clienteId).then((r) => vivo && setS(r)).catch(() => vivo && setS(null));
    return () => {
      vivo = false;
    };
  }, [clienteId]);
  // trocou de cliente: não leva o uso do anterior
  useEffect(() => aoMudar({ cashback: 0, recompensa: null }), [clienteId]); // eslint-disable-line react-hooks/exhaustive-deps

  const canal: CanalFidelidade = entrega ? 'balcao_entrega' : 'balcao';
  const usavelAgora = s ? cashbackUsavel(s.config, s.cashback, aPagar, new Date().getDay(), canal) : 0;
  // o pedido mudou: o cashback marcado acompanha o quanto dá para usar
  useEffect(() => {
    if (uso.cashback > 0 && usavelAgora !== uso.cashback) aoMudar({ ...uso, cashback: usavelAgora });
  }, [usavelAgora]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s) return null;
  if (!s.config.canais.includes(canal)) return null;
  const dia = new Date().getDay();
  const usavel = cashbackUsavel(s.config, s.cashback, aPagar, dia, canal);
  const trocaveis = s.config.pontosAtivo ? s.recompensas.filter((r) => r.pontos <= s.pontos) : [];
  const ganho = ganhoFidelidade(s.config, { total: Math.max(0, aPagar - uso.cashback), taxaEntrega: 0, dia, canal, primeiro: false });

  return (
    <div className="fid-balcao">
      <div className="linha" style={{ gap: '0.8rem', alignItems: 'center' }}>
        {s.config.cashbackAtivo && <span>💰 Cashback: <strong>{formatarReais(s.cashback)}</strong></span>}
        {s.config.pontosAtivo && <span>⭐ <strong>{s.pontos}</strong> pontos</span>}
      </div>
      {s.config.cashbackAtivo && s.cashback > 0 && (
        usavel > 0 ? (
          <label className="check">
            <input type="checkbox" checked={uso.cashback > 0} onChange={(e) => aoMudar({ ...uso, cashback: e.target.checked ? usavel : 0 })} />
            Usar {formatarReais(usavel)} de cashback neste pedido
          </label>
        ) : (
          <span className="dica">
            {s.cashback < s.config.cashbackMinimo ? `Saldo mínimo para usar: ${formatarReais(s.config.cashbackMinimo)}.` : !s.config.cashbackDias.includes(dia) ? 'Hoje o cashback não vale.' : 'Monte o pedido para usar o cashback.'}
          </span>
        )
      )}
      {trocaveis.length > 0 && (
        <label>
          Trocar pontos
          <select value={uso.recompensa ?? ''} onChange={(e) => aoMudar({ ...uso, recompensa: e.target.value || null })}>
            <option value="">Não trocar agora</option>
            {trocaveis.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nome} — {r.pontos} pts{r.tipo === 'produto' ? ' (o produto precisa estar no pedido)' : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      {(ganho.cashback > 0 || ganho.pontos > 0) && (
        <span className="dica">
          Este pedido gera ~{[ganho.cashback > 0 && formatarReais(ganho.cashback), ganho.pontos > 0 && `${ganho.pontos} pontos`].filter(Boolean).join(' e ')} quando for concluído.
        </span>
      )}
    </div>
  );
}
