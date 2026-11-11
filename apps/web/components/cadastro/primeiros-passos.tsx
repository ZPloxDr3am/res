'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { TIPOS_RESTAURANTE, faltaParaAbrir, primeirosPassos, type EstadoPrimeirosPassos } from '@res/core';
import { abrirCardapio, concluirPrimeirosPassos, usarCardapioExemplo } from '@/app/(painel)/comecar/actions';
import { salvando } from '@/components/tempo-real';

export function PrimeirosPassos({ estado, tipo, ocultos, link, qr, lojaNome }: { estado: EstadoPrimeirosPassos; tipo: string | null; ocultos: boolean; link: string | null; qr: string | null; lojaNome: string }) {
  const { passos, obrigatorios, obrigatoriosFeitos, pronto } = primeirosPassos(estado);
  const falta = faltaParaAbrir(estado);
  const [tipoEx, setTipoEx] = useState(tipo ?? '');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pendente, iniciar] = useTransition();
  const fazer = (p: Promise<{ ok: true } | { ok: false; erro: string }>, ok: string) =>
    iniciar(async () => {
      const r = await salvando(p);
      setMsg(r.ok ? { ok: true, t: ok } : { ok: false, t: r.erro });
    });
  const pct = Math.round((obrigatoriosFeitos / obrigatorios) * 100);
  const copiar = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* navegador sem permissão */
    }
  };

  return (
    <div className="grade" style={{ gap: '1rem', maxWidth: 760 }}>
      <header className="grade" style={{ gap: '0.4rem' }}>
        <h1 style={{ margin: 0 }}>Primeiros passos{pronto ? ' 🎉' : ''}</h1>
        <p className="dica" style={{ margin: 0 }}>
          {pronto ? `${lojaNome} está pronta para vender. Divulgue o link e acompanhe os pedidos no quadro.` : `Faltam ${obrigatorios - obrigatoriosFeitos} passo(s) para ${lojaNome} começar a vender.`}
        </p>
        <div className="pp-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Progresso"><span style={{ width: `${pct}%` }} /></div>
      </header>

      {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}

      <ol className="pp-lista">
        {passos.map((p, i) => (
          <li key={p.id} id={p.id} className="pp-passo" data-feito={p.feito || undefined}>
            <span className="pp-num" aria-hidden="true">{p.feito ? '✓' : i + 1}</span>
            <div className="grade" style={{ gap: '0.35rem' }}>
              <strong>{p.titulo}{p.opcional && <span className="dica"> · opcional</span>}</strong>
              <span className="dica">{p.explicacao}</span>
              {p.aviso && <span className="aviso" style={{ margin: 0 }}>{p.aviso}</span>}

              {p.id === 'cardapio' && estado.produtos === 0 && (
                <div className="linha" style={{ gap: '0.4rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <label>Começar com o exemplo de
                    <select value={tipoEx} onChange={(e) => setTipoEx(e.target.value)}>
                      <option value="">— tipo —</option>
                      {TIPOS_RESTAURANTE.map((t) => <option key={t.id} value={t.id}>{t.emoji} {t.rotulo}</option>)}
                    </select>
                  </label>
                  <button type="button" className="botao" disabled={pendente || !tipoEx} onClick={() => fazer(usarCardapioExemplo(tipoEx), 'Cardápio de exemplo criado. Agora troque nomes, preços e fotos.')}>Usar exemplo</button>
                </div>
              )}

              {p.id === 'abrir' ? (
                p.feito ? (
                  <div className="grade" style={{ gap: '0.5rem' }}>
                    <span>✅ Cardápio aberto: ele abre e fecha sozinho nos seus horários.</span>
                    {link && (
                      <div className="pp-link">
                        {qr && <span className="pp-qr" dangerouslySetInnerHTML={{ __html: qr }} />}
                        <div className="grade" style={{ gap: '0.4rem' }}>
                          <code style={{ wordBreak: 'break-all' }}>{link}</code>
                          <div className="linha" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button type="button" className="botao" onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar link'}</button>
                            <a className="botao" href={`https://wa.me/?text=${encodeURIComponent(`Peça pelo nosso cardápio digital: ${link}`)}`} target="_blank" rel="noopener noreferrer">Mandar no WhatsApp</a>
                            <a className="botao" href={link} target="_blank" rel="noopener noreferrer">Ver como o cliente vê</a>
                          </div>
                          <span className="dica">Coloque o link na bio do Instagram e no status do WhatsApp; o QR vai bem no balcão e na embalagem.</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grade" style={{ gap: '0.4rem' }}>
                    {falta.length > 0 && <span className="dica">Antes de abrir, falta: {falta.join(', ')}.</span>}
                    <div className="linha" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button type="button" className="botao-primario" disabled={pendente || falta.length > 0} onClick={() => fazer(abrirCardapio(), 'Cardápio aberto! Agora é divulgar o link.')}>Abrir meu cardápio</button>
                      {link && <a className="botao" href={link} target="_blank" rel="noopener noreferrer">Ver antes</a>}
                    </div>
                  </div>
                )
              ) : (
                !p.feito && <Link className="botao" href={p.href} style={{ justifySelf: 'start' }}>{p.botao}</Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      {!ocultos && (
        <div className="linha" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" className={pronto ? 'botao-primario' : 'botao'} disabled={pendente} onClick={() => fazer(concluirPrimeirosPassos(), 'Pronto! "Primeiros passos" saiu do menu (o endereço /comecar continua valendo).')}>
            {pronto ? 'Concluir e tirar do menu' : 'Tirar do menu'}
          </button>
          <Link className="botao" href="/pedidos">Ir para o quadro de pedidos</Link>
        </div>
      )}
    </div>
  );
}
