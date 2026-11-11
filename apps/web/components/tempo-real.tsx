'use client';
import { useEffect, useRef, useState } from 'react';
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
/**
 * `reservaMs`: confere de novo de tempos em tempos (e ao voltar para a aba), caso a conexão em
 * tempo real caia sem avisar — internet oscilando, computador que dormiu, aba parada muito tempo.
 */
export function TempoReal({ lojaId, tabelas = CARDAPIO, todasAsLojas = false, reservaMs }: { lojaId: string; tabelas?: string[]; todasAsLojas?: boolean; reservaMs?: number }) {
  const chave = tabelas.join(',');
  const router = useRouter();
  // D-084: quem vigia a tela (quadro de pedidos, reservaMs) vê quando a conexão cai e quando volta
  const [caiuEm, setCaiuEm] = useState<number | null>(null);
  const [voltou, setVoltou] = useState(false);
  const caiuRef = useRef<number | null>(null);
  useEffect(() => {
    if (!reservaMs) return;
    let canalOk = true;
    let foraDoAr = typeof navigator !== 'undefined' && !navigator.onLine;
    let aviso: ReturnType<typeof setTimeout> | undefined;
    const avaliar = () => {
      const caiu = foraDoAr || !canalOk;
      clearTimeout(aviso);
      if (caiu) {
        // espera um pouco: oscilação de segundos não vira alarme
        const espera = foraDoAr ? 1500 : 8000;
        aviso = setTimeout(() => {
          caiuRef.current ??= Date.now() - espera;
          setCaiuEm(caiuRef.current);
        }, espera);
      } else if (caiuRef.current != null) {
        caiuRef.current = null;
        setCaiuEm(null);
        setVoltou(true);
        setTimeout(() => setVoltou(false), 4000);
        router.refresh();
      }
    };
    const on = () => { foraDoAr = false; avaliar(); };
    const off = () => { foraDoAr = true; avaliar(); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    const ouvir = (e: Event) => { canalOk = (e as CustomEvent<boolean>).detail; avaliar(); };
    window.addEventListener('res-canal', ouvir);
    avaliar();
    return () => {
      clearTimeout(aviso);
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('res-canal', ouvir);
    };
  }, [reservaMs, router]);
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
    canal.subscribe((status: string) => {
      if (reservaMs) window.dispatchEvent(new CustomEvent('res-canal', { detail: status === 'SUBSCRIBED' }));
    });
    const visivel = () => document.visibilityState === 'visible';
    const reserva = reservaMs ? setInterval(() => visivel() && agendar(), reservaMs) : undefined;
    const aoVoltar = () => visivel() && agendar();
    if (reservaMs) {
      document.addEventListener('visibilitychange', aoVoltar);
      window.addEventListener('online', aoVoltar);
    }
    return () => {
      clearInterval(reserva);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('online', aoVoltar);
      clearTimeout(espera);
      aoTerminar = null;
      void supabase.removeChannel(canal);
    };
  }, [lojaId, chave, todasAsLojas, router, reservaMs]);
  if (!reservaMs) return null;
  if (caiuEm != null) {
    const hora = new Date(caiuEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return (
      <div className="faixa-conexao" role="alert">
        <strong>Sem conexão desde {hora}.</strong> Pedidos novos podem não estar aparecendo. Confira a internet; a tela volta a atualizar sozinha quando a conexão voltar.
      </div>
    );
  }
  if (voltou) return <div className="faixa-conexao" data-ok role="status"><strong>Conexão de volta.</strong> Quadro atualizado.</div>;
  return null;
}
