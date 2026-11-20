'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Relógio único do quadro (erro React #418).
 *
 * O servidor monta o HTML com a hora dele; o navegador hidrata com a sua. Qualquer texto que
 * dependa de `Date.now()` ("há 12 min", "atrasado", "até 21:30") podia sair diferente nos dois
 * lados e o React acusava divergência de hidratação.
 *
 * Aqui a primeira renderização usa SEMPRE `inicio` (a hora em que o servidor montou a página),
 * no servidor e no navegador. Só depois de montar o relógio passa a andar com a hora local.
 */
const RelogioCtx = createContext<number | null>(null);

export function Relogio({ inicio, intervaloMs = 15000, children }: { inicio: number; intervaloMs?: number; children: ReactNode }) {
  const [agora, setAgora] = useState(inicio);
  useEffect(() => {
    setAgora(Date.now());
    const t = setInterval(() => setAgora(Date.now()), intervaloMs);
    return () => clearInterval(t);
  }, [intervaloMs]);
  return <RelogioCtx.Provider value={agora}>{children}</RelogioCtx.Provider>;
}

/** Hora atual (ms) do relógio do quadro. Só dentro de <Relogio>. */
export function useAgora(): number {
  const agora = useContext(RelogioCtx);
  if (agora == null) throw new Error('useAgora() precisa estar dentro de <Relogio>.');
  return agora;
}
