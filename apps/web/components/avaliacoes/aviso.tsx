'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clienteNavegador } from '@/lib/supabase/client';

type Nova = { id: string; nota: number; comentario: string | null };

/** Nota baixa chegando: aviso na hora, em qualquer tela do painel (D-111). Só para dono e gerente (a RLS filtra). */
export function AvisoAvaliacao({ lojaId }: { lojaId: string }) {
  const [nova, setNova] = useState<Nova | null>(null);
  useEffect(() => {
    const sb = clienteNavegador();
    const canal = sb
      .channel(`avaliacoes:${lojaId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'avaliacoes_pedido', filter: `loja_id=eq.${lojaId}` }, (p: { new?: Partial<Nova> }) => {
        const n = p.new;
        if (n?.id && typeof n.nota === 'number' && n.nota <= 3) setNova({ id: n.id, nota: n.nota, comentario: n.comentario ?? null });
      })
      .subscribe();
    return () => {
      void sb.removeChannel(canal);
    };
  }, [lojaId]);
  if (!nova) return null;
  return (
    <div className="aviso-avaliacao" role="alert">
      <span>😟 Um cliente deu <b>{nova.nota} estrela{nova.nota > 1 ? 's' : ''}</b>{nova.comentario ? `: “${nova.comentario.slice(0, 80)}”` : ''}</span>
      <span className="linha" style={{ gap: '0.35rem' }}>
        <Link className="botao mini botao-primario" href="/avaliacoes?dias=7" onClick={() => setNova(null)}>Ver e resolver</Link>
        <button type="button" className="mini" onClick={() => setNova(null)} aria-label="Fechar">✕</button>
      </span>
    </div>
  );
}
