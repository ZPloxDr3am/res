'use client';
import { createContext, Suspense, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatarReais } from '@res/core';
import { NovoPedido, type RascunhoPedido } from '@/components/novo-pedido';
import { dadosNovoPedido } from '@/app/(painel)/pedidos/actions';
import type { DadosNovoPedido } from '@/lib/novo-pedido';

type Estado = 'fechado' | 'aberto' | 'minimizado';
type Ctx = { abrir: () => void; estado: Estado };
const Contexto = createContext<Ctx>({ abrir: () => {}, estado: 'fechado' });

/** Abre a janela de novo pedido (ou traz de volta a minimizada). */
export const usePedidoFlutuante = () => useContext(Contexto);

/**
 * Janela flutuante de novo pedido, por cima de qualquer tela do painel. Fica no layout,
 * então o rascunho sobrevive a trocas de página: minimizar → ir ao Cardápio → "Retomar pedido".
 * Trocar de loja descarta o rascunho (o cardápio é outro).
 */
export function PedidoFlutuanteProvider({ lojaId, children }: { lojaId: string; children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>('fechado');
  const [dados, setDados] = useState<{ lojaId: string; dados: DadosNovoPedido } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [rascunho, setRascunho] = useState<RascunhoPedido>({ itens: 0, total: 0, cliente: '' });
  const [versao, setVersao] = useState(0); // muda → formulário novo, vazio
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const janela = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    const r = await dadosNovoPedido();
    setCarregando(false);
    if (!r.ok) return setErro(r.erro);
    setDados({ lojaId: r.lojaId, dados: r.dados });
  }, []);

  const abrir = useCallback(() => {
    setEstado('aberto');
    setConfirmarDescarte(false);
    setAviso(null);
    if (!dados || dados.lojaId !== lojaId) void carregar();
  }, [dados, lojaId, carregar]);

  const descartar = () => {
    setEstado('fechado');
    setConfirmarDescarte(false);
    setRascunho({ itens: 0, total: 0, cliente: '' });
    setVersao((v) => v + 1);
  };
  const fechar = () => (rascunho.itens > 0 || rascunho.cliente ? setConfirmarDescarte(true) : descartar());

  // trocou de loja: o rascunho era de outro cardápio
  useEffect(() => {
    if (dados && dados.lojaId !== lojaId) {
      setDados(null);
      descartar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lojaId]);

  // Esc minimiza (não perde nada)
  useEffect(() => {
    if (estado !== 'aberto') return;
    const f = (e: KeyboardEvent) => e.key === 'Escape' && !e.defaultPrevented && setEstado('minimizado');
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [estado]);

  // foco na janela ao abrir
  useEffect(() => {
    if (estado === 'aberto') janela.current?.focus();
  }, [estado]);

  // aviso "Pedido #N lançado" some sozinho
  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  return (
    <Contexto.Provider value={{ abrir, estado }}>
      {children}
      <Suspense fallback={null}>
        <AbrirPorLink abrir={abrir} />
      </Suspense>

      {estado !== 'fechado' && (
        <div className={`flutuante ${estado === 'minimizado' ? 'minimizado' : ''}`} aria-hidden={estado === 'minimizado'}>
          <div className="flutuante-fundo" onClick={() => setEstado('minimizado')} />
          <div ref={janela} className="flutuante-janela" role="dialog" aria-modal="true" aria-label="Novo pedido" tabIndex={-1}>
            <div className="flutuante-barra">
              <strong>Novo pedido</strong>
              {rascunho.itens > 0 && (
                <span className="dica">
                  {rascunho.itens} {rascunho.itens === 1 ? 'item' : 'itens'} · {formatarReais(rascunho.total)}
                </span>
              )}
              <span style={{ flex: 1 }} />
              <button type="button" className="mini" onClick={() => setEstado('minimizado')} title="Minimizar (Esc)">
                — Minimizar
              </button>
              <button type="button" className="mini" onClick={fechar} title="Fechar e descartar" aria-label="Fechar">
                ✕
              </button>
            </div>
            {confirmarDescarte && (
              <div className="aviso linha" style={{ alignItems: 'center', gap: '0.5rem', margin: '0.5rem 1rem 0' }}>
                <span>Descartar este pedido? O que foi digitado se perde.</span>
                <button type="button" className="mini erro" onClick={descartar}>Descartar</button>
                <button type="button" className="mini" onClick={() => setConfirmarDescarte(false)}>Continuar o pedido</button>
                <button type="button" className="mini" onClick={() => { setConfirmarDescarte(false); setEstado('minimizado'); }}>Minimizar</button>
              </div>
            )}
            <div className="flutuante-corpo">
              {carregando && <p className="dica">Carregando o cardápio…</p>}
              {erro && (
                <p className="erro" role="alert">
                  {erro} <button type="button" className="mini" onClick={() => void carregar()}>Tentar de novo</button>
                </p>
              )}
              {dados && (
                <NovoPedido
                  key={versao}
                  {...dados.dados}
                  embutido
                  aoMudar={setRascunho}
                  aoConcluir={(numero) => {
                    setAviso(`Pedido #${numero} lançado.`);
                    descartar();
                    router.refresh();
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {estado === 'minimizado' && (
        <div className="flutuante-retomar" role="region" aria-label="Pedido em andamento">
          <div className="grade" style={{ gap: 0 }}>
            <strong>Pedido em andamento</strong>
            <span className="dica">
              {rascunho.cliente || 'Sem nome'} · {rascunho.itens} {rascunho.itens === 1 ? 'item' : 'itens'}
              {rascunho.itens > 0 ? ` · ${formatarReais(rascunho.total)}` : ''}
            </span>
          </div>
          <button type="button" className="botao-primario" onClick={() => setEstado('aberto')}>Retomar pedido</button>
          <button type="button" className="mini" onClick={() => { setEstado('aberto'); setConfirmarDescarte(true); }} title="Descartar" aria-label="Descartar pedido">✕</button>
        </div>
      )}

      {aviso && (
        <div className="flutuante-aviso" role="status">
          ✓ {aviso}
          <button type="button" className="mini" onClick={abrir}>+ Outro pedido</button>
        </div>
      )}
    </Contexto.Provider>
  );
}

/** /pedidos?novo=1 (link do menu ou de fora) abre a janela e limpa o parâmetro. */
function AbrirPorLink({ abrir }: { abrir: () => void }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pedido = sp.get('novo') === '1';
  useEffect(() => {
    if (!pedido) return;
    abrir();
    const url = new URL(window.location.href);
    url.searchParams.delete('novo');
    router.replace(url.pathname + (url.search || ''), { scroll: false });
  }, [pedido, abrir, router]);
  return null;
}

/** Botão "+ Novo pedido" que abre a janela flutuante (ou retoma a minimizada). */
export function BotaoNovoPedido({ className = 'botao botao-primario' }: { className?: string }) {
  const { abrir, estado } = usePedidoFlutuante();
  return (
    <button type="button" className={className} onClick={abrir}>
      {estado === 'minimizado' ? 'Retomar pedido' : '+ Novo pedido'}
    </button>
  );
}
