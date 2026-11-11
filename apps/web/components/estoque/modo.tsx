'use client';
import { useState, useTransition } from 'react';
import { definirModoEstoque } from '@/app/(painel)/estoque/actions';
import { salvando } from '@/components/tempo-real';

/** Plano de várias lojas: estoque de cada loja ou um só do grupo (escolhido antes do primeiro insumo). */
export function ModoEstoque({ compartilhado, podeMudar, lojas }: { compartilhado: boolean; podeMudar: boolean; lojas: string[] }) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const escolher = (v: boolean) =>
    iniciar(async () => {
      const r = await salvando(definirModoEstoque(v));
      setErro(r.ok ? null : r.erro);
    });
  return (
    <section className="cartao grade est-modo" aria-label="Como o estoque funciona">
      <strong>Estoque das lojas</strong>
      <div className="est-modo-opcoes">
        <button type="button" aria-pressed={!compartilhado} disabled={pendente || !podeMudar} onClick={() => escolher(false)}>
          <strong>Separado por loja</strong>
          <span className="dica">Cada loja tem os seus insumos, notas e saldo.</span>
        </button>
        <button type="button" aria-pressed={compartilhado} disabled={pendente || !podeMudar} onClick={() => escolher(true)}>
          <strong>Um estoque do grupo</strong>
          <span className="dica">{lojas.join(', ')} usam o mesmo estoque (cozinha central, compra única).</span>
        </button>
      </div>
      <span className="dica">{podeMudar ? 'Escolha antes de cadastrar o primeiro insumo.' : 'Já há insumos cadastrados: o modo fica como está.'}</span>
      {erro && <span className="erro" role="alert">{erro}</span>}
    </section>
  );
}
