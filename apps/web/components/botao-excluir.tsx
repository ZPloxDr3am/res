'use client';
import { salvando } from '@/components/tempo-real';
import { useState, useTransition } from 'react';

/** Exclusão com confirmação em duas etapas, sem diálogo do navegador. */
export function BotaoExcluir({ rotulo, confirmacao, acao }: { rotulo: string; confirmacao: string; acao: () => Promise<{ ok: boolean; erro?: string }> }) {
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  if (!confirmando)
    return (
      <button type="button" className="dica" onClick={() => setConfirmando(true)}>
        {rotulo}
      </button>
    );

  return (
    <span className="linha" style={{ alignItems: 'center', gap: '0.5rem' }}>
      <span className="dica">{confirmacao}</span>
      <button
        type="button"
        className="erro"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await salvando(acao());
            if (!r.ok) setErro(r.erro ?? 'Não foi possível excluir.');
            setConfirmando(false);
          })
        }
      >
        {pendente ? 'Excluindo…' : 'Confirmar'}
      </button>
      <button type="button" onClick={() => setConfirmando(false)}>
        Cancelar
      </button>
      {erro && <span className="erro" role="alert">{erro}</span>}
    </span>
  );
}
