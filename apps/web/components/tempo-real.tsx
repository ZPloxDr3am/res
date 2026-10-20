'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { clienteNavegador } from '@/lib/supabase/client';

const TABELAS = ['setores', 'setor_marcas', 'produtos', 'produto_marcas', 'grupos_opcoes', 'opcoes', 'produto_grupos'];

/** T-005: mudança feita em outro aparelho aparece aqui sem recarregar. A RLS filtra o que chega. */
export function TempoReal({ lojaId }: { lojaId: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = clienteNavegador();
    let espera: ReturnType<typeof setTimeout> | undefined;
    const atualizar = () => {
      clearTimeout(espera);
      espera = setTimeout(() => router.refresh(), 300);
    };
    let canal = supabase.channel(`cardapio:${lojaId}`);
    for (const t of TABELAS) canal = canal.on('postgres_changes', { event: '*', schema: 'public', table: t }, atualizar);
    canal.subscribe();
    return () => {
      clearTimeout(espera);
      void supabase.removeChannel(canal);
    };
  }, [lojaId, router]);
  return null;
}
