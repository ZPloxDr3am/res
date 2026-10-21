'use client';
import { salvando } from '@/components/tempo-real';
import { useOptimistic, useState, useTransition } from 'react';
import { alterarDisponibilidade } from '@/app/(painel)/cardapio/actions';

type Campo = 'ativo' | 'delivery' | 'presencial' | 'totem';
type Estado = { marca_id: string } & Record<Campo, boolean>;

const CAMPOS: { campo: Campo; rotulo: string }[] = [
  { campo: 'ativo', rotulo: 'Ativo' },
  { campo: 'delivery', rotulo: 'Delivery' },
  { campo: 'presencial', rotulo: 'Presencial' },
  { campo: 'totem', rotulo: 'Totem' },
];

/** Disponibilidade por marca e canal. Cada clique é uma ação explícita salva na hora (D-006). */
export function Disponibilidade({ produtoId, marcas, estado }: { produtoId: string; marcas: { id: string; nome: string }[]; estado: Estado[] }) {
  const [otimista, aplicar] = useOptimistic(estado, (atual, m: { marca: string; campo: Campo; valor: boolean }) =>
    atual.map((e) => (e.marca_id === m.marca ? { ...e, [m.campo]: m.valor } : e)),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  return (
    <div className="grade" style={{ gap: '0.25rem' }}>
      {marcas.map((m) => {
        const e = otimista.find((x) => x.marca_id === m.id);
        if (!e) return null;
        return (
          <div key={m.id} className="linha" style={{ alignItems: 'center', gap: '0.5rem' }}>
            {marcas.length > 1 && <span className="dica" style={{ minWidth: '8rem' }}>{m.nome}</span>}
            {CAMPOS.map(({ campo, rotulo }) => (
              <label key={campo} className="check dica">
                <input
                  type="checkbox"
                  checked={e[campo]}
                  disabled={campo !== 'ativo' && !e.ativo}
                  onChange={(ev) => {
                    const valor = ev.target.checked;
                    iniciar(async () => {
                      aplicar({ marca: m.id, campo, valor });
                      const r = await salvando(alterarDisponibilidade(produtoId, m.id, campo, valor));
                      setErro(r.ok ? null : r.erro);
                    });
                  }}
                />
                {rotulo}
              </label>
            ))}
          </div>
        );
      })}
      {erro && <p className="erro" role="alert">{erro}</p>}
    </div>
  );
}
