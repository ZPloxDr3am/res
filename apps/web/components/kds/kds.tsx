'use client';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { salvarEstacao } from '@/app/(painel)/kds/actions';
import { clienteNavegador } from '@/lib/supabase/client';

/** Fala direto com o banco (D-101): sem passar pelo servidor do site a cada 5 s — mais rápido e sem gastar a cota da Vercel.
 *  Falha de rede vira exceção (a tela mostra "Sem conexão"); erro do banco volta como mensagem. */
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<{ ok: true; dados: T } | { ok: false; erro: string }> {
  const { data, error } = await clienteNavegador().rpc(fn, args);
  if (error) {
    if (!error.code || /fetch|network|Load failed/i.test(error.message)) throw new Error('sem conexão');
    return { ok: false, erro: error.message };
  }
  return { ok: true, dados: data as T };
}

type Opcao = { grupo: string; nome: string; quantidade: number; fracao: number | null };
type ItemKds = { id: string; nome: string; quantidade: number; observacao: string | null; pronto: boolean; opcoes: Opcao[] | null };
type PedidoKds = {
  id: string; numero: number; status: 'em_preparo' | 'pronto'; tipo: 'entrega' | 'retirada' | 'balcao'; origem: string; cliente: string; marca: string;
  aceito_em: string; pronto_em: string | null; observacao: string | null; externo: string | null; mesa: string | null; itens: ItemKds[];
};
export type FilaKds = {
  estacoes: { id: string; nome: string; setores: string[] }[];
  setores: { id: string; nome: string }[];
  agora: string;
  pedidos: PedidoKds[];
};

const CHAVE = 'res_kds_estacao';
const ALERTA = 'res_kds_alerta';
const TIPO = { entrega: '🛵 Entrega', retirada: '🏪 Retirada', balcao: '🧍 Balcão' } as const;

const ler = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravar = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };

function bip() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  } catch { /* sem som */ }
}

/** KDS (D-099): uma tela por estação (Cozinha, Pizzaria, Bar…), com tempo e cor de atraso. */
export function Kds({ inicial, gestor, lojaId }: { inicial: FilaKds; gestor: boolean; lojaId: string }) {
  const filaKds = useCallback(async (estacao: string | null) => {
    const r = await rpc<FilaKds>('kds_fila', { p_loja: lojaId, p_estacao: estacao });
    return r.ok ? { ok: true as const, fila: r.dados } : r;
  }, [lojaId]);
  const marcarKds = useCallback((pedido: string, itens: string[], pronto: boolean) => rpc<string>('kds_marcar', { p_loja: lojaId, p_pedido: pedido, p_itens: itens, p_pronto: pronto }), [lojaId]);
  const [fila, setFila] = useState(inicial);
  const [estacao, setEstacao] = useState<string | null>(null);
  const [alerta, setAlerta] = useState(15);
  const [cheia, setCheia] = useState(false);
  const [som, setSom] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [config, setConfig] = useState(false);
  const [desvio, setDesvio] = useState(0); // relógio do servidor − relógio daqui
  const [, tique] = useState(0);
  const [, iniciar] = useTransition();
  const vistos = useRef<Set<string> | null>(null);
  // conexão: última resposta boa do servidor, se o aparelho diz estar sem rede, e toques feitos sem internet
  const [ultimaOk, setUltimaOk] = useState(() => Date.now());
  const [semRede, setSemRede] = useState(false);
  const [voltou, setVoltou] = useState(false);
  const pendentes = useRef<{ pedido: string; itens: string[]; pronto: boolean }[]>([]);
  const caiuEm = useRef<number | null>(null);

  useEffect(() => {
    const e = ler(CHAVE);
    if (e && inicial.estacoes.some((x) => x.id === e)) setEstacao(e);
    const a = Number(ler(ALERTA));
    if (a > 0) setAlerta(a);
  }, [inicial.estacoes]);

  const atualizar = useCallback(async () => {
    let r: Awaited<ReturnType<typeof filaKds>>;
    try {
      // primeiro manda o que foi tocado sem internet, na ordem
      while (pendentes.current.length) {
        const x = pendentes.current[0]!;
        await marcarKds(x.pedido, x.itens, x.pronto);
        pendentes.current.shift();
      }
      r = await filaKds(estacao);
    } catch {
      return; // sem conexão: a tela fica como está e o aviso aparece
    }
    setUltimaOk(Date.now());
    if (caiuEm.current != null) {
      caiuEm.current = null;
      setVoltou(true);
      setTimeout(() => setVoltou(false), 6000);
    }
    if (!r.ok) return setErro(r.erro);
    setErro(null);
    setDesvio(Date.parse(r.fila.agora) - Date.now());
    // pedido novo na tela → bip
    const ids = new Set(r.fila.pedidos.filter((p) => p.status === 'em_preparo').map((p) => p.id));
    if (vistos.current && som && [...ids].some((id) => !vistos.current!.has(id))) bip();
    vistos.current = ids;
    setFila(r.fila);
  }, [estacao, som, filaKds, marcarKds]);

  useEffect(() => {
    vistos.current = null;
    void atualizar();
    const t = setInterval(() => document.visibilityState === 'visible' && void atualizar(), 5000);
    const r = setInterval(() => tique((n) => n + 1), 1000);
    const on = () => { setSemRede(false); void atualizar(); };
    const off = () => setSemRede(true);
    setSemRede(!navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { clearInterval(t); clearInterval(r); window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [atualizar]);

  // situação da conexão: sem resposta há 12 s = instável; há 20 s (ou aparelho sem rede) = caiu
  const semResposta = Math.floor((Date.now() - ultimaOk) / 1000);
  const conexao: 'ok' | 'instavel' | 'caiu' = semRede || semResposta >= 20 ? 'caiu' : semResposta >= 12 ? 'instavel' : 'ok';
  useEffect(() => {
    if (conexao !== 'caiu') return;
    caiuEm.current ??= ultimaOk;
    // alerta sonoro na queda e a cada 2 min enquanto estiver fora
    if (som) bip();
    const t = setInterval(() => som && bip(), 120000);
    return () => clearInterval(t);
  }, [conexao, som, ultimaOk]);

  const marcar = (p: PedidoKds, itens: string[], pronto: boolean) => {
    // otimista: a tela responde na hora
    setFila((f) => ({ ...f, pedidos: f.pedidos.map((x) => (x.id !== p.id ? x : { ...x, itens: x.itens.map((i) => (itens.includes(i.id) ? { ...i, pronto } : i)) })) }));
    if (conexao === 'caiu' || pendentes.current.length) {
      // sem internet: guarda o toque e manda quando a conexão voltar
      pendentes.current.push({ pedido: p.id, itens, pronto });
      return;
    }
    iniciar(async () => {
      try {
        const r = await marcarKds(p.id, itens, pronto);
        if (!r.ok) setErro(r.erro);
      } catch {
        pendentes.current.push({ pedido: p.id, itens, pronto });
        return;
      }
      await atualizar();
    });
  };

  const telaCheia = async () => {
    const vai = !cheia;
    setCheia(vai);
    try {
      if (vai) await document.documentElement.requestFullscreen?.();
      else if (document.fullscreenElement) await document.exitFullscreen();
    } catch { /* navegador não deixou */ }
  };

  const agora = Date.now() + desvio;
  const pedidos = [...fila.pedidos].sort((a, b) => (a.status === b.status ? Date.parse(a.aceito_em) - Date.parse(b.aceito_em) : a.status === 'em_preparo' ? -1 : 1));
  const nomeEstacao = fila.estacoes.find((e) => e.id === estacao)?.nome ?? 'Todas as estações';

  return (
    <div className={`kds${cheia ? ' kds-tela-cheia' : ''}`}>
      <div className="kds-topo">
        <div>
          <h1 style={{ margin: 0 }}>👨‍🍳 {nomeEstacao}</h1>
          <span className="dica">{pedidos.filter((p) => p.status === 'em_preparo').length} em preparo · toque no item quando ficar pronto</span>
        </div>
        <span className="kds-conexao" data-estado={conexao} role="status" aria-live="polite" title={`Última atualização há ${semResposta} s`}>
          {conexao === 'ok' ? '🟢 Conexão estável' : conexao === 'instavel' ? '🟠 Conexão instável…' : '🔴 Sem conexão'}
        </span>
        <div className="linha" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
          <select value={estacao ?? ''} aria-label="Estação" onChange={(e) => { const v = e.target.value || null; setEstacao(v); gravar(CHAVE, v ?? ''); }}>
            <option value="">Todas as estações</option>
            {fila.estacoes.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
          <label className="linha" style={{ gap: '0.25rem', alignItems: 'center' }} title="Minutos até o cartão ficar vermelho">⏱
            <input type="number" min={3} max={120} value={alerta} style={{ width: '4rem' }} onChange={(e) => { const n = Math.max(3, Number(e.target.value) || 15); setAlerta(n); gravar(ALERTA, String(n)); }} aria-label="Minutos para alerta" />
          </label>
          <button type="button" onClick={() => setSom((s) => !s)} aria-pressed={som}>{som ? '🔔' : '🔕'}</button>
          {gestor && <button type="button" onClick={() => setConfig(true)}>⚙️ Estações</button>}
          <button type="button" onClick={telaCheia}>{cheia ? 'Sair da tela cheia' : '⛶ Tela cheia'}</button>
        </div>
      </div>
      {conexao === 'caiu' && (
        <div className="kds-queda" role="alert">
          <strong>⚠️ SEM INTERNET desde {new Date(caiuEm.current ?? ultimaOk).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
          <span>Pedidos novos NÃO aparecem nesta tela. Confira a internet da loja e use as comandas impressas.{pendentes.current.length ? ` ${pendentes.current.length} toque(s) guardado(s): vão sozinhos quando voltar.` : ''}</span>
        </div>
      )}
      {voltou && <div className="kds-voltou" role="status">✅ Conexão voltou — tela atualizada.</div>}
      {erro && <p className="erro" role="alert" style={{ margin: 0 }}>{erro}</p>}
      {pedidos.length === 0 ? (
        <p className="cartao dica" style={{ textAlign: 'center', padding: '2rem' }}>Nada para preparar agora. Os pedidos aceitos aparecem aqui sozinhos.</p>
      ) : (
        <div className="kds-grade">
          {pedidos.map((p) => {
            const min = Math.max(0, Math.floor((agora - Date.parse(p.aceito_em)) / 60000));
            const seg = Math.max(0, Math.floor((agora - Date.parse(p.aceito_em)) / 1000)) % 60;
            const atraso = min >= alerta ? 'alto' : min >= alerta / 2 ? 'medio' : 'ok';
            const pronto = p.status === 'pronto';
            const abertos = p.itens.filter((i) => !i.pronto).map((i) => i.id);
            return (
              <article key={p.id} className="kds-cartao" data-atraso={atraso} data-pronto={pronto ? '1' : undefined}>
                <header className="kds-cab">
                  <span><b>#{p.numero}</b> {p.mesa ?? TIPO[p.tipo]}</span>
                  <span className="kds-tempo">{pronto ? 'PRONTO' : `${min}:${String(seg).padStart(2, '0')}`}</span>
                </header>
                <div style={{ padding: '0.3rem 0.7rem', fontSize: '0.85rem' }} className="dica">
                  {p.mesa ? p.cliente.replace(p.mesa, '').replace(/^ · /, '') || p.marca : p.cliente}{p.externo ? ` · ${p.externo}` : ''}
                </div>
                <ul className="kds-itens">
                  {p.itens.map((i) => (
                    <li key={i.id}>
                      <button type="button" className="kds-item" data-pronto={i.pronto ? '1' : undefined} onClick={() => marcar(p, [i.id], !i.pronto)} aria-pressed={i.pronto}>
                        <b>{i.quantidade}×</b> {i.nome}
                        {(i.opcoes ?? []).map((o, k) => <small key={k}>{o.fracao && o.fracao < 1 ? '½ ' : ''}{o.quantidade > 1 ? `${o.quantidade}× ` : ''}{o.nome}</small>)}
                        {i.observacao && <small className="kds-obs">⚠ {i.observacao}</small>}
                      </button>
                    </li>
                  ))}
                </ul>
                {p.observacao && <div style={{ padding: '0.4rem 0.7rem' }} className="kds-item kds-obs">⚠ {p.observacao}</div>}
                <div className="kds-rodape">
                  {pronto
                    ? <button type="button" onClick={() => marcar(p, p.itens.map((i) => i.id), false)}>↩ Desfazer</button>
                    : <button type="button" className="botao-primario" disabled={!abertos.length} onClick={() => marcar(p, abertos, true)}>✓ Tudo pronto</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {config && <Estacoes fila={fila} fechar={() => { setConfig(false); void atualizar(); }} />}
    </div>
  );
}

function Estacoes({ fila, fechar }: { fila: FilaKds; fechar: () => void }) {
  const [lista, setLista] = useState(fila.estacoes.map((e) => ({ ...e })));
  const [novo, setNovo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const salvar = (e: { id: string | null; nome: string; setores: string[] }, apagar = false) =>
    iniciar(async () => {
      const r = await salvarEstacao(e.id, e.nome, e.setores, apagar);
      if (!r.ok) return setErro(r.erro);
      setErro(null);
      if (apagar) setLista((l) => l.filter((x) => x.id !== e.id));
      if (!e.id && r.id) { setNovo(''); setLista((l) => [...l, { id: r.id!, nome: e.nome.trim(), setores: [] }]); }
    });
  return (
    <div className="pub-folha-fundo" onClick={fechar}>
      <div className="pub-folha" role="dialog" aria-modal="true" aria-label="Estações da cozinha" onClick={(ev) => ev.stopPropagation()} style={{ maxWidth: 620 }}>
        <div className="linha" style={{ justifyContent: 'space-between' }}><h2>Estações da cozinha</h2><button type="button" onClick={fechar} aria-label="Fechar">✕</button></div>
        <p className="dica" style={{ margin: 0 }}>Cada estação mostra só as categorias marcadas (ex.: Bar = Bebidas). Sem nenhuma marcada, mostra tudo. Em cada tela (tablet, TV), escolha a estação no topo.</p>
        {erro && <p className="erro" role="alert" style={{ margin: 0 }}>{erro}</p>}
        {lista.map((e, i) => (
          <div key={e.id} className="cartao grade" style={{ gap: '0.4rem' }}>
            <div className="linha" style={{ gap: '0.4rem' }}>
              <input value={e.nome} maxLength={40} onChange={(ev) => setLista((l) => l.map((x, j) => (j === i ? { ...x, nome: ev.target.value } : x)))} aria-label="Nome da estação" />
              <button type="button" className="mini botao-primario" disabled={pendente || !e.nome.trim()} onClick={() => salvar(e)}>Salvar</button>
              <button type="button" className="mini dica" disabled={pendente} onClick={() => salvar(e, true)}>Apagar</button>
            </div>
            <div className="linha" style={{ gap: '0.3rem 0.8rem', flexWrap: 'wrap' }}>
              {fila.setores.map((s) => (
                <label key={s.id} className="check">
                  <input type="checkbox" checked={e.setores.includes(s.id)} onChange={(ev) => setLista((l) => l.map((x, j) => (j === i ? { ...x, setores: ev.target.checked ? [...x.setores, s.id] : x.setores.filter((y) => y !== s.id) } : x)))} /> {s.nome}
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="linha" style={{ gap: '0.4rem' }}>
          <input placeholder="Nova estação (ex.: Pizzaria, Chapa, Bar)" value={novo} maxLength={40} onChange={(e) => setNovo(e.target.value)} />
          <button type="button" disabled={pendente || !novo.trim()} onClick={() => salvar({ id: null, nome: novo, setores: [] })}>+ Criar</button>
        </div>
      </div>
    </div>
  );
}
