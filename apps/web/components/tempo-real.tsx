'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clienteNavegador } from '@/lib/supabase/client';

const CARDAPIO = ['setores', 'setor_marcas', 'produtos', 'produto_marcas', 'grupos_opcoes', 'opcoes', 'produto_grupos'];

// Ações salvando nesta aba. Enquanto houver alguma, não recarregamos: um refresh no meio
// de uma server action aborta a resposta e o botão fica preso em "Salvando…".
let pendentes = 0;
let aoTerminar: (() => void) | null = null;

/** Envolve uma server action: o tempo real espera ela terminar antes de atualizar a tela. */
export async function salvando<T>(acao: Promise<T>): Promise<T> {
  pendentes++;
  try {
    return await acao;
  } finally {
    pendentes--;
    if (pendentes === 0 && aoTerminar) aoTerminar();
  }
}

/** T-005: mudança feita em outro aparelho aparece aqui sem recarregar. A RLS filtra o que chega. */
export function TempoReal({ lojaId, tabelas = CARDAPIO, todasAsLojas = false }: { lojaId: string; tabelas?: string[]; todasAsLojas?: boolean }) {
  const chave = tabelas.join(',');
  const router = useRouter();
  useEffect(() => {
    const supabase = clienteNavegador();
    let espera: ReturnType<typeof setTimeout> | undefined;
    const atualizar = () => router.refresh();
    const agendar = () => {
      if (pendentes > 0) return; // a própria ação já revalida a tela
      clearTimeout(espera);
      espera = setTimeout(() => (pendentes > 0 ? undefined : atualizar()), 600);
    };
    aoTerminar = () => {
      // a ação local já trouxe a tela nova (revalidatePath); descarta os avisos dela
      clearTimeout(espera);
    };
    let canal = supabase.channel(`${chave}:${todasAsLojas ? 'todas' : lojaId}`);
    for (const t of chave.split(',')) canal = canal.on('postgres_changes', todasAsLojas ? { event: '*', schema: 'public', table: t } : { event: '*', schema: 'public', table: t, filter: `loja_id=eq.${lojaId}` }, agendar);
    canal.subscribe();
    return () => {
      clearTimeout(espera);
      aoTerminar = null;
      void supabase.removeChannel(canal);
    };
  }, [lojaId, chave, todasAsLojas, router]);
  return null;
}
