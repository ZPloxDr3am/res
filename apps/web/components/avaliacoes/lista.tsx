'use client';
import { useState, useTransition } from 'react';
import { formatarReais } from '@res/core';
import { resolverAvaliacao } from '@/app/(painel)/avaliacoes/actions';
import { salvando } from '@/components/tempo-real';

export type Avaliacao = {
  id: string; nota: number; problemas: string[]; comentario: string | null; em: string; resolvido_em: string | null;
  numero: number; cliente: string; telefone: string | null; total: number; tipo: string;
};
export type DadosAvaliacoes = { dias: number; media: number | null; total: number; pedidos: number; notas: Record<string, number>; problemas: Record<string, number>; lista: Avaliacao[] };

export const ROTULO_PROBLEMA: Record<string, string> = {
  atraso: 'Demorou', frio: 'Chegou frio', errado: 'Veio errado', faltou: 'Faltou item', embalagem: 'Embalagem', sabor: 'Sabor', atendimento: 'Atendimento', preco: 'Preço',
};
const estrelas = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function ListaAvaliacoes({ dados, loja }: { dados: DadosAvaliacoes; loja: string }) {
  const [filtro, setFiltro] = useState<'todas' | 'ruins'>('todas');
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const total = Number(dados.total);
  const lista = dados.lista.filter((a) => filtro === 'todas' || (a.nota <= 3 && !a.resolvido_em));
  const pendentes = dados.lista.filter((a) => a.nota <= 3 && !a.resolvido_em).length;
  const probs = Object.entries(dados.problemas).sort((a, b) => b[1] - a[1]);
  const zap = (a: Avaliacao) =>
    a.telefone
      ? `https://wa.me/55${a.telefone.replace(/^55/, '')}?text=${encodeURIComponent(`Olá, ${a.cliente.split(' ')[0]}! Aqui é da ${loja}. Vimos a sua avaliação do pedido #${a.numero} e queremos resolver. O que aconteceu?`)}`
      : null;

  return (
    <div className="grade">
      <div className="fin-cartoes">
        <div className="cartao fin-cartao">
          <span className="dica">Nota média</span>
          <strong>{dados.media != null ? `${Number(dados.media).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ★` : '—'}</strong>
          <span className="dica">{total} avaliação(ões) · {Number(dados.pedidos) ? `${Math.round((total / Number(dados.pedidos)) * 100)}% dos pedidos` : 'sem pedidos'}</span>
        </div>
        <div className="cartao fin-cartao">
          <span className="dica">Notas</span>
          <div className="aval-barras">
            {[5, 4, 3, 2, 1].map((n) => {
              const q = Number(dados.notas[String(n)] ?? 0);
              return (
                <span key={n} className="aval-barra"><span>{n}★</span><span className="aval-trilho"><span style={{ width: `${total ? (q / total) * 100 : 0}%` }} data-ruim={n <= 3 || undefined} /></span><span className="dica">{q}</span></span>
              );
            })}
          </div>
        </div>
        <div className="cartao fin-cartao">
          <span className="dica">O que mais reclamam</span>
          {probs.length ? probs.slice(0, 4).map(([k, v]) => <span key={k}>{ROTULO_PROBLEMA[k] ?? k} <b>{v}</b></span>) : <span className="dica">nada ainda</span>}
        </div>
      </div>
      <div className="abas-metrica" role="group" aria-label="Filtro" style={{ justifySelf: 'start' }}>
        <button type="button" aria-pressed={filtro === 'todas'} onClick={() => setFiltro('todas')}>Todas</button>
        <button type="button" aria-pressed={filtro === 'ruins'} onClick={() => setFiltro('ruins')}>Para resolver ({pendentes})</button>
      </div>
      {erro && <p className="erro">{erro}</p>}
      {lista.length === 0 ? (
        <p className="cartao dica" style={{ margin: 0 }}>{filtro === 'ruins' ? 'Nenhuma avaliação ruim para resolver. 🎉' : 'Nenhuma avaliação no período.'}</p>
      ) : (
        <div className="grade" style={{ gap: '0.5rem' }}>
          {lista.map((a) => (
            <div key={a.id} className="cartao aval-item" data-ruim={a.nota <= 3 || undefined} data-resolvido={!!a.resolvido_em || undefined}>
              <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                <span><span className="aval-estrelas">{estrelas(a.nota)}</span> <b>{a.cliente}</b> <span className="dica">· pedido #{a.numero} · {formatarReais(Number(a.total))} · {quando(a.em)}</span></span>
                {a.resolvido_em && <span className="selo">✓ resolvido</span>}
              </div>
              {a.problemas.length > 0 && <span className="linha" style={{ gap: '0.3rem', flexWrap: 'wrap' }}>{a.problemas.map((p) => <span key={p} className="selo">{ROTULO_PROBLEMA[p] ?? p}</span>)}</span>}
              {a.comentario && <p style={{ margin: 0 }}>“{a.comentario}”</p>}
              {a.nota <= 3 && (
                <div className="linha" style={{ gap: '0.35rem' }}>
                  {zap(a) && <a className="botao mini" href={zap(a)!} target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>}
                  <button
                    type="button"
                    className="mini"
                    disabled={pendente}
                    onClick={() =>
                      iniciar(async () => {
                        const r = await salvando(resolverAvaliacao(a.id, !a.resolvido_em));
                        setErro(r.ok ? null : r.erro);
                      })
                    }
                  >
                    {a.resolvido_em ? 'Reabrir' : 'Marcar como resolvido'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
