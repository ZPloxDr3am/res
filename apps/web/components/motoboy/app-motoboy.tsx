'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatarReais, tempoDecorrido } from '@res/core';
import { despachar, entregar } from '@/app/m/actions';
import { cobranca, linkLigar, linkMaps, linkWaze, linkWhats, type Entrega, type PainelMotoboy } from '@/lib/motoboy';

type Aviso = { ok: boolean; texto: string } | null;

export function AppMotoboy({ painel }: { painel: PainelMotoboy }) {
  const router = useRouter();
  const [lendo, setLendo] = useState(false);
  const [aviso, setAviso] = useState<Aviso>(null);
  const [pendente, iniciar] = useTransition();

  // atualiza sozinho (pedidos prontos, entregas novas)
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(t);
  }, [router]);

  const lido = (texto: string) => {
    setLendo(false);
    iniciar(async () => {
      const r = await despachar(texto);
      if (!r.ok) {
        vibrar([80, 60, 80]);
        return setAviso({ ok: false, texto: r.erro });
      }
      vibrar([60]);
      setAviso({ ok: true, texto: `Pedido #${r.entrega.numero} saiu com você. Boa entrega!` });
      router.refresh();
    });
  };

  return (
    <main className="mb-tela">
      <header className="mb-topo">
        <div>
          <span className="mb-marca">RES Motoboy</span>
          <strong>Olá, {painel.nome.split(' ')[0]}</strong>
        </div>
        <form action="/auth/sair" method="post"><button className="mb-sair">Sair</button></form>
      </header>

      {!lendo && (
        <button type="button" className="mb-ler" disabled={pendente} onClick={() => { setAviso(null); setLendo(true); }}>
          <span aria-hidden="true">📷</span> {pendente ? 'Registrando…' : 'Ler QR da comanda'}
        </button>
      )}
      {lendo && <Leitor aoLer={lido} aoFechar={() => setLendo(false)} />}
      {aviso && <p className={`mb-aviso ${aviso.ok ? 'ok' : 'erro'}`} role="status">{aviso.ok ? '✓ ' : '✕ '}{aviso.texto}</p>}

      <section className="grade" style={{ gap: '0.75rem' }}>
        <h2 className="mb-titulo">Com você agora <span>{painel.em_rota.length}</span></h2>
        {painel.em_rota.length === 0 && <p className="mb-dica">Nenhuma entrega com você. Leia o QR da comanda para sair com um pedido.</p>}
        {painel.em_rota.map((e) => (
          <CartaoEntrega key={e.id} e={e} aoEntregar={(n) => { setAviso({ ok: true, texto: `Pedido #${n} entregue.` }); router.refresh(); }} />
        ))}
      </section>

      {painel.prontos.length > 0 && (
        <section className="grade" style={{ gap: '0.4rem' }}>
          <h2 className="mb-titulo">Na loja <span>{painel.prontos.length}</span></h2>
          <ul className="mb-prontos">
            {painel.prontos.map((p) => (
              <li key={`${p.loja}-${p.numero}`}>
                <strong>#{p.numero}</strong>
                <span>{p.bairro ?? '—'}</span>
                <span className={`mb-etq ${p.status === 'pronto' ? 'pronto' : ''}`}>{p.status === 'pronto' ? 'Pronto para sair' : 'Em preparo'}</span>
                <span className="mb-dica">{p.loja}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-hoje">
        <h2 className="mb-titulo">Hoje</h2>
        <div className="mb-hoje-grade">
          <div><span>Entregas</span><strong>{painel.hoje.entregas}</strong></div>
          <div><span>Dinheiro recebido</span><strong>{formatarReais(painel.hoje.cobrado_dinheiro)}</strong></div>
          <div><span>Cartão/Pix na porta</span><strong>{formatarReais(painel.hoje.cobrado_outros)}</strong></div>
          <div><span>Taxas de entrega</span><strong>{formatarReais(painel.hoje.taxas)}</strong></div>
        </div>
        <p className="mb-dica">"Dinheiro recebido" é o que você deve entregar no caixa ao fim do turno.</p>
      </section>
      <p className="mb-dica" style={{ textAlign: 'center' }}>Dica: no Chrome, toque em ⋮ → "Adicionar à tela inicial" para abrir como aplicativo.</p>
    </main>
  );
}

function vibrar(p: number[]) {
  try {
    navigator.vibrate?.(p);
  } catch {
    /* sem vibração */
  }
}

function CartaoEntrega({ e, aoEntregar }: { e: Entrega; aoEntregar: (numero: number) => void }) {
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const c = cobranca(e);
  const a = e.endereco;

  return (
    <article className="mb-entrega">
      <div className="mb-entrega-topo">
        <span className="mb-numero">#{e.numero}</span>
        <span className="mb-dica">{e.marca}{e.saiu_em ? ` · saiu ${tempoDecorrido(new Date(e.saiu_em))}` : ''}</span>
      </div>

      <div className={`mb-cobrar ${c.cobrar ? 'sim' : 'nao'}`}>
        <strong>{c.titulo}</strong>
        <span>{c.detalhe}</span>
      </div>

      <div className="mb-cliente">
        <span className="mb-rotulo">Cliente</span>
        <strong>{e.cliente}</strong>
      </div>
      {a && (
        <div className="mb-endereco">
          <span className="mb-rotulo">Endereço</span>
          <strong>{a.logradouro}{a.numero ? `, ${a.numero}` : ''}</strong>
          {a.complemento && <span>{a.complemento}</span>}
          <span className="mb-bairro">{a.bairro}{e.cidade ? ` · ${e.cidade}` : ''}</span>
          {a.referencia && <span className="mb-ref">Referência: {a.referencia}</span>}
        </div>
      )}
      {e.observacao && <p className="mb-obs">Obs.: {e.observacao}</p>}

      <div className="mb-botoes">
        {a && <a className="mb-btn maps" href={linkMaps(e)} target="_blank" rel="noreferrer">🗺️ Google Maps</a>}
        {a && <a className="mb-btn" href={linkWaze(e)} target="_blank" rel="noreferrer">Waze</a>}
        {e.telefone && <a className="mb-btn" href={linkLigar(e.telefone)}>📞 Ligar</a>}
        {e.telefone && (
          <a className="mb-btn" href={linkWhats(e.telefone, `Olá ${e.cliente.split(' ')[0]}, sou o motoboy do pedido #${e.numero} (${e.marca}). Estou a caminho!`)} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        )}
      </div>

      <details className="mb-itens">
        <summary>{e.itens.reduce((s, i) => s + i.quantidade, 0)} item(ns) no pedido</summary>
        <ul>{e.itens.map((i, k) => <li key={k}>{i.quantidade}× {i.nome}</li>)}</ul>
      </details>

      {!confirmar ? (
        <button type="button" className="mb-entregue" onClick={() => setConfirmar(true)}>✓ Entregue</button>
      ) : (
        <div className="grade" style={{ gap: '0.5rem' }}>
          <p className="mb-confirma">{c.cobrar ? `Recebeu ${c.titulo.replace('COBRAR ', '')}?` : 'Confirmar a entrega?'}</p>
          <div className="mb-botoes">
            <button
              type="button"
              className="mb-entregue"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  const r = await entregar(e.id);
                  if (!r.ok) return setErro(r.erro);
                  vibrar([40]);
                  aoEntregar(e.numero);
                })
              }
            >
              {pendente ? 'Salvando…' : c.cobrar ? 'Sim, recebi e entreguei' : 'Sim, entreguei'}
            </button>
            <button type="button" className="mb-btn" onClick={() => setConfirmar(false)}>Voltar</button>
          </div>
        </div>
      )}
      {erro && <p className="mb-aviso erro">{erro}</p>}
    </article>
  );
}

/** Leitor de QR pela câmera (BarcodeDetector do Chrome/Android). Sem suporte: orienta usar a câmera do celular. */
function Leitor({ aoLer, aoFechar }: { aoLer: (t: string) => void; aoFechar: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [problema, setProblema] = useState<string | null>(null);
  const [manual, setManual] = useState('');
  const cb = useRef(aoLer);
  cb.current = aoLer;

  useEffect(() => {
    let parar = false;
    let stream: MediaStream | null = null;
    const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
    if (!Detector) {
      setProblema('Este navegador não lê QR pela página. Abra a câmera do celular e aponte para o QR da comanda: o link abre aqui e o pedido sai com você.');
      return;
    }
    const detector = new Detector({ formats: ['qr_code'] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        while (!parar) {
          try {
            const r = await detector.detect(video.current);
            if (r[0]?.rawValue) {
              parar = true;
              cb.current(r[0].rawValue);
              break;
            }
          } catch {
            /* quadro ainda sem imagem */
          }
          await new Promise((ok) => setTimeout(ok, 250));
        }
      } catch {
        setProblema('Não consegui abrir a câmera. Permita o acesso à câmera para este site, ou use a câmera do celular apontando para o QR.');
      }
    })();
    return () => {
      parar = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <section className="mb-leitor">
      {!problema && <video ref={video} playsInline muted className="mb-video" />}
      {!problema && <p className="mb-dica" style={{ textAlign: 'center' }}>Aponte para o QR no fim da comanda.</p>}
      {problema && <p className="mb-aviso erro">{problema}</p>}
      <form
        className="mb-manual"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (manual.trim()) aoLer(manual.trim());
        }}
      >
        <input value={manual} onChange={(ev) => setManual(ev.target.value)} placeholder="ou cole o código/link" aria-label="Código da comanda" />
        <button className="mb-btn">OK</button>
      </form>
      <button type="button" className="mb-btn" onClick={aoFechar}>Fechar câmera</button>
    </section>
  );
}
