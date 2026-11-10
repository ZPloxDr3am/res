import Link from 'next/link';
import { NOME_MODULO, type ModuloId } from '@res/core';

/** Tela ou recurso fora do plano da conta (D-085): explica e leva para Assinatura. */
export function ModuloTravado({ modulo, dono = true }: { modulo: string; dono?: boolean }) {
  const nome = NOME_MODULO[modulo as ModuloId] ?? 'Este recurso';
  return (
    <div className="cartao modulo-travado" role="status">
      <span className="modulo-travado-icone" aria-hidden="true">🔒</span>
      <h2>{nome} não está no seu plano</h2>
      <p className="dica">
        {dono
          ? 'Mude de plano ou contrate só este módulo como adicional. Vale na hora, e a diferença entra na próxima fatura.'
          : 'Peça para o dono da conta liberar em Assinatura.'}
      </p>
      {dono && <Link href="/assinatura" className="botao-primario">Ver planos</Link>}
    </div>
  );
}
