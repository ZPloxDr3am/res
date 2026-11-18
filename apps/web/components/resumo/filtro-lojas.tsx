'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/**
 * Filtro de lojas do Resumo (D-120): troca na hora, mantendo o período escolhido.
 * Não muda a loja em uso do menu: só de quais lojas são os números desta tela.
 */
export function FiltroLojas({ lojas, atual, base }: { lojas: { id: string; nome: string }[]; atual: string; base: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const ir = (loja: string) => {
    const url = new URL(base, 'http://x');
    if (loja === 'todas') url.searchParams.delete('loja');
    else url.searchParams.set('loja', loja);
    iniciar(() => router.push(`${url.pathname}${url.search}`));
  };
  return (
    <label className="s-campo">
      Lojas
      <select className="s-select" value={atual} onChange={(e) => ir(e.target.value)} disabled={pendente} aria-busy={pendente || undefined}>
        <option value="todas">Todas ({lojas.length}) · consolidado</option>
        {lojas.map((l) => (
          <option key={l.id} value={l.id}>{l.nome}</option>
        ))}
      </select>
    </label>
  );
}
