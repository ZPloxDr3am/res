'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { formatarReais, PAGAMENTO_ROTULO, STATUS_ROTULO, type FormaPagamento } from '@res/core';
import { NovoPedido } from '@/components/novo-pedido';
import { salvando } from '@/components/tempo-real';
import type { DadosNovoPedido } from '@/lib/novo-pedido';
import { abrirConta, acaoConta, cancelarRodada, confirmarRodada, criarLocais, editarLocal, fecharConta, lancarRodada, salvarTaxaServico, verConta } from '@/app/(painel)/salao/actions';
import { rotuloLocal, type ContaSalao, type LocalSalao, type MapaSalao } from './tipos';
import { clienteNavegador } from '@/lib/supabase/client';

/** Leituras que se repetem vão direto ao banco (D-101): não recarregam a página nem o cardápio inteiro. */
async function ler<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  try {
    const { data, error } = await clienteNavegador().rpc(fn, args);
    return error ? null : (data as T);
  } catch {
    return null;
  }
}

const reais = (v: number) => formatarReais(Math.round(v * 100));
const minutos = (iso: string) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
const tempo = (iso: string) => {
  const m = minutos(iso);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
};
const lerCentavos = (t: string) => {
  const s = t.trim().replace(/\s|R\$/g, '');
  if (!s) return 0;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};
const FORMAS: FormaPagamento[] = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'vale_refeicao'];

/** Salão (D-099): mapa de mesas e comandas, conta da mesa, rodadas para a cozinha e fechamento no caixa. */
export function Salao({ mapa: mapaServidor, dados, lojaId }: { mapa: MapaSalao; dados: DadosNovoPedido; lojaId: string }) {
  const [mapa, setMapa] = useState(mapaServidor);
  useEffect(() => setMapa(mapaServidor), [mapaServidor]);
  // mapa ao vivo: muda quando qualquer conta muda (tempo real) e confere a cada 10 s
  useEffect(() => {
    const atualizar = async () => {
      if (document.visibilityState !== 'visible') return;
      const m = await ler<MapaSalao>('salao_mapa', { p_loja: lojaId });
      if (m) setMapa(m);
    };
    const sb = clienteNavegador();
    const canal = sb.channel(`salao:${lojaId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'salao_contas', filter: `loja_id=eq.${lojaId}` }, () => void atualizar()).subscribe();
    const t = setInterval(() => void atualizar(), 10000);
    document.addEventListener('visibilitychange', atualizar);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', atualizar); void sb.removeChannel(canal); };
  }, [lojaId]);
  const [aba, setAba] = useState<'mesa' | 'comanda' | 'config'>(mapa.locais.some((l) => l.tipo === 'mesa') || !mapa.locais.length ? 'mesa' : 'comanda');
  const [busca, setBusca] = useState('');
  const [abrindo, setAbrindo] = useState<LocalSalao | null>(null);
  const [contaId, setContaId] = useState<string | null>(null);
  const [, forcar] = useState(0);
  // o relógio das mesas anda sozinho
  useEffect(() => {
    const t = setInterval(() => forcar((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const lista = mapa.locais.filter((l) => l.tipo === aba && (!busca || String(l.numero) === busca.trim() || (l.nome ?? '').toLowerCase().includes(busca.toLowerCase()) || (l.conta?.cliente ?? '').toLowerCase().includes(busca.toLowerCase())));
  const ocupadas = mapa.locais.filter((l) => l.conta);
  const aConfirmar = ocupadas.reduce((s, l) => s + (l.conta?.a_confirmar ?? 0), 0);
  const prontos = ocupadas.reduce((s, l) => s + (l.conta?.prontos ?? 0), 0);
  const pediram = ocupadas.filter((l) => l.conta?.status === 'conta_pedida').length;

  const clicar = (l: LocalSalao) => (l.conta ? setContaId(l.conta.id) : setAbrindo(l));

  return (
    <div className="grade">
      <div className="salao-resumo">
        <span><b>{ocupadas.length}</b> ocupadas</span>
        <span><b>{reais(ocupadas.reduce((s, l) => s + (l.conta?.parcial ?? 0), 0))}</b> em aberto</span>
        {aConfirmar > 0 && <span className="salao-alerta">📲 {aConfirmar} pedido(s) do QR para confirmar</span>}
        {prontos > 0 && <span className="salao-pronto">🍽️ {prontos} rodada(s) pronta(s) para servir</span>}
        {pediram > 0 && <span className="salao-conta">🧾 {pediram} pediram a conta</span>}
      </div>
      <div className="linha" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
        <button type="button" className={aba === 'mesa' ? 'botao-primario' : ''} onClick={() => setAba('mesa')}>Mesas</button>
        {(mapa.locais.some((l) => l.tipo === 'comanda') || mapa.gestor) && <button type="button" className={aba === 'comanda' ? 'botao-primario' : ''} onClick={() => setAba('comanda')}>Comandas</button>}
        {mapa.gestor && <button type="button" className={aba === 'config' ? 'botao-primario' : ''} onClick={() => setAba('config')}>⚙️ Configurar</button>}
        {aba !== 'config' && <input type="search" placeholder="Nº ou nome" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ maxWidth: '10rem' }} aria-label="Procurar mesa ou comanda" />}
      </div>

      {aba === 'config' ? (
        <Configurar mapa={mapa} />
      ) : lista.length === 0 ? (
        <p className="cartao dica">{mapa.locais.some((l) => l.tipo === aba) ? 'Nada encontrado.' : mapa.gestor ? `Nenhuma ${aba} cadastrada. Cadastre em ⚙️ Configurar.` : `Nenhuma ${aba} cadastrada. Peça ao gerente.`}</p>
      ) : (
        <div className="salao-mapa">
          {lista.map((l) => {
            const c = l.conta;
            const estado = !c ? 'livre' : c.a_confirmar ? 'confirmar' : c.status === 'conta_pedida' ? 'conta' : c.prontos ? 'pronto' : 'ocupada';
            return (
              <button key={l.id} type="button" className="salao-mesa" data-estado={estado} onClick={() => clicar(l)}>
                <span className="salao-num">{l.tipo === 'comanda' ? '#' : ''}{l.numero}</span>
                {l.nome && <span className="salao-nome">{l.nome}</span>}
                {c ? (
                  <>
                    <span className="salao-valor">{reais(c.parcial)}</span>
                    <span className="salao-info">{c.pessoas}p · {tempo(c.aberta_em)}{c.cliente ? ` · ${c.cliente}` : ''}</span>
                    {c.a_confirmar > 0 && <span className="salao-selo">QR</span>}
                    {c.status === 'conta_pedida' && <span className="salao-selo">CONTA</span>}
                    {!c.a_confirmar && c.status !== 'conta_pedida' && c.prontos > 0 && <span className="salao-selo">PRONTO</span>}
                  </>
                ) : (
                  <span className="salao-info">livre{l.lugares ? ` · ${l.lugares} lug.` : ''}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {abrindo && <AbrirMesa local={abrindo} fechar={() => setAbrindo(null)} aberta={(id) => { setAbrindo(null); setContaId(id); }} />}
      {contaId && <Conta id={contaId} lojaId={lojaId} mapa={mapa} dados={dados} fechar={() => setContaId(null)} />}
    </div>
  );
}

function AbrirMesa({ local, fechar, aberta }: { local: LocalSalao; fechar: () => void; aberta: (id: string) => void }) {
  const [pessoas, setPessoas] = useState(local.lugares && local.tipo === 'mesa' ? Math.min(local.lugares, 2) : 1);
  const [cliente, setCliente] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <div className="pub-folha-fundo" onClick={fechar}>
      <div className="pub-folha" role="dialog" aria-modal="true" aria-label={`Abrir ${rotuloLocal(local)}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <h2>Abrir {rotuloLocal(local)}</h2>
        <label>Pessoas
          <div className="linha" style={{ gap: '0.4rem' }}>
            <button type="button" onClick={() => setPessoas((p) => Math.max(1, p - 1))} aria-label="Menos">−</button>
            <strong style={{ minWidth: '2rem', textAlign: 'center', fontSize: '1.3rem' }}>{pessoas}</strong>
            <button type="button" onClick={() => setPessoas((p) => Math.min(99, p + 1))} aria-label="Mais">+</button>
          </div>
        </label>
        <label>Nome do cliente <span className="dica">(opcional)</span><input value={cliente} maxLength={80} onChange={(e) => setCliente(e.target.value)} /></label>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <div className="linha" style={{ gap: '0.5rem' }}>
          <button type="button" className="botao-primario" disabled={pendente} onClick={() => iniciar(async () => {
            const r = await salvando(abrirConta(local.id, pessoas, cliente));
            if (!r.ok) return setErro(r.erro);
            aberta(r.dados);
          })}>{pendente ? 'Abrindo…' : 'Abrir e lançar'}</button>
          <button type="button" onClick={fechar}>Voltar</button>
        </div>
      </div>
    </div>
  );
}

function Conta({ id, lojaId, mapa, dados, fechar }: { id: string; lojaId: string; mapa: MapaSalao; dados: DadosNovoPedido; fechar: () => void }) {
  const [conta, setConta] = useState<ContaSalao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [modo, setModo] = useState<'ver' | 'lancar' | 'fechar' | 'transferir'>('ver');
  const [aviso, setAviso] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [pendente, iniciar] = useTransition();
  const recarregar = async () => {
    const c = await ler<ContaSalao>('salao_conta', { p_loja: lojaId, p_conta: id });
    if (c) setConta(c);
    else if (!conta) {
      const r = await verConta(id); // mostra a mensagem de erro do servidor
      if (!r.ok) setErro(r.erro);
      else setConta(r.dados);
    }
  };
  // atualiza junto com o mapa (tempo real) e a cada 10 s, para ver a cozinha marcando pronto
  const versao = useMemo(() => JSON.stringify(mapa.locais.find((l) => l.conta?.id === id)?.conta ?? null), [mapa, id]);
  useEffect(() => {
    void recarregar();
    const t = setInterval(() => void recarregar(), 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, versao]);
  const rodar = (f: () => Promise<{ ok: boolean; erro?: string }>, msg?: string, depois?: () => void) =>
    iniciar(async () => {
      const r = await salvando(f());
      if (!r.ok) return setErro(r.erro ?? 'Não deu certo.');
      setErro(null);
      if (msg) setAviso(msg);
      depois?.();
      await recarregar();
    });

  if (!conta) {
    return (
      <div className="pub-folha-fundo" onClick={fechar}>
        <div className="pub-folha" onClick={(e) => e.stopPropagation()}>{erro ? <p className="erro">{erro}</p> : <p className="dica">Carregando…</p>}</div>
      </div>
    );
  }
  const aberta = conta.status === 'aberta' || conta.status === 'conta_pedida';
  const livres = mapa.locais.filter((l) => !l.conta && l.tipo === conta.local.tipo);

  if (modo === 'lancar') {
    return (
      <div className="pub-folha-fundo">
        <div className="pub-folha" role="dialog" aria-modal="true" aria-label={`Lançar em ${conta.local.rotulo}`} style={{ maxWidth: 1180 }}>
          <div className="linha" style={{ justifyContent: 'space-between' }}>
            <h2>{conta.local.rotulo} · lançar itens</h2>
            <button type="button" onClick={() => setModo('ver')}>✕ Voltar à conta</button>
          </div>
          <NovoPedido {...dados} embutido salao={{ rotulo: conta.local.rotulo, enviar: (marcaId, itens, obs) => lancarRodada(conta.id, marcaId, itens, obs) }}
            aoConcluir={(n) => { setAviso(`Rodada nº ${n} enviada para a cozinha.`); setModo('ver'); void recarregar(); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="pub-folha-fundo" onClick={fechar}>
      <div className="pub-folha salao-conta-folha" role="dialog" aria-modal="true" aria-label={conta.local.rotulo} onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2>{conta.local.rotulo}</h2>
            <span className="dica">
              {conta.pessoas} pessoa(s){conta.cliente ? ` · ${conta.cliente}` : ''}{conta.garcom ? ` · ${conta.garcom}` : ''} · aberta há {tempo(conta.aberta_em)}
              {conta.status === 'conta_pedida' && <> · <b>pediu a conta</b></>}
            </span>
          </div>
          <button type="button" onClick={fechar} aria-label="Fechar">✕</button>
        </div>
        {aviso && <p className="dica" role="status" style={{ margin: 0 }}>✅ {aviso}</p>}
        {erro && <p className="erro" role="alert" style={{ margin: 0 }}>{erro}</p>}

        {aberta && modo === 'ver' && (
          <div className="linha" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
            <button type="button" className="botao-primario" onClick={() => { setAviso(null); setModo('lancar'); }}>+ Lançar itens</button>
            <button type="button" disabled={pendente || conta.subtotal <= 0} onClick={() => setModo('fechar')}>💳 Fechar conta</button>
            <button type="button" onClick={() => window.print()} disabled={conta.subtotal <= 0}>🖨️ Imprimir conta</button>
            {conta.status === 'aberta'
              ? <button type="button" disabled={pendente} onClick={() => rodar(() => acaoConta(conta.id, 'pedir_conta'), 'Marcada como "pediu a conta".')}>🧾 Pediu a conta</button>
              : <button type="button" disabled={pendente} onClick={() => rodar(() => acaoConta(conta.id, 'reabrir'))}>↩ Voltou a pedir</button>}
            <button type="button" disabled={pendente} onClick={() => setModo('transferir')}>⇄ Transferir</button>
            <label className="linha" style={{ gap: '0.3rem', alignItems: 'center' }}>Pessoas
              <input type="number" min={1} max={99} defaultValue={conta.pessoas} style={{ width: '4rem' }} onBlur={(e) => Number(e.target.value) !== conta.pessoas && rodar(() => acaoConta(conta.id, 'pessoas', { pessoas: Number(e.target.value) }))} />
            </label>
          </div>
        )}

        {modo === 'transferir' && (
          <div className="cartao grade">
            <strong>Transferir para</strong>
            {livres.length === 0 ? <p className="dica" style={{ margin: 0 }}>Nenhuma {conta.local.tipo} livre.</p> : (
              <div className="linha" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
                {livres.map((l) => <button key={l.id} type="button" className="mini" disabled={pendente} onClick={() => rodar(() => acaoConta(conta.id, 'transferir', { localId: l.id }), `Transferida para ${rotuloLocal(l)}.`, fechar)}>{rotuloLocal(l)}</button>)}
              </div>
            )}
            <button type="button" onClick={() => setModo('ver')} style={{ justifySelf: 'start' }}>Voltar</button>
          </div>
        )}

        <section className="grade salao-pre-conta" style={{ gap: '0.5rem' }}>
          <div className="so-impressao" style={{ textAlign: 'center' }}><b>{conta.local.rotulo}</b><br />Conferência — não é documento fiscal</div>
          {conta.rodadas.length === 0 && <p className="dica" style={{ margin: 0 }}>Nada lançado ainda.</p>}
          {conta.rodadas.map((r) => (
            <div key={r.id} className="salao-rodada" data-status={r.status}>
              <div className="linha" style={{ justifyContent: 'space-between', gap: '0.4rem' }}>
                <span><b>Rodada nº {r.numero}</b>{r.qr ? ' · 📲 pelo QR' : ''} <span className="dica">· {new Date(r.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span></span>
                <span className="salao-st nao-imprimir" data-status={r.status}>{r.status === 'em_preparo' ? '🔥 Na cozinha' : r.status === 'pronto' ? '🍽️ Pronto — servir' : r.status === 'novo' ? '⏳ Confirmar' : STATUS_ROTULO[r.status]}</span>
              </div>
              <ul className="salao-itens">
                {r.itens.map((i, k) => (
                  <li key={k} style={r.status === 'cancelado' ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>
                    <span>{i.quantidade}× {i.nome}{i.opcoes ? <span className="dica"> — {i.opcoes}</span> : null}{i.observacao ? <span className="dica"> ({i.observacao})</span> : null}{i.pronto && r.status === 'em_preparo' ? <span className="nao-imprimir"> ✓</span> : null}</span>
                    <span>{reais(i.total)}</span>
                  </li>
                ))}
              </ul>
              {r.observacao && <span className="dica">Obs.: {r.observacao}</span>}
              {aberta && r.status !== 'cancelado' && r.status !== 'concluido' && (
                <div className="linha nao-imprimir" style={{ gap: '0.35rem' }}>
                  {r.status === 'novo' && <button type="button" className="mini botao-primario" disabled={pendente} onClick={() => rodar(() => confirmarRodada(r.id), `Rodada nº ${r.numero} enviada para a cozinha.`)}>Confirmar e mandar para a cozinha</button>}
                  {cancelando === r.id ? (
                    <>
                      <input autoFocus placeholder="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} style={{ maxWidth: '12rem' }} />
                      <button type="button" className="mini" disabled={pendente || motivo.trim().length < 3} onClick={() => rodar(() => cancelarRodada(r.id, motivo), 'Rodada cancelada.', () => { setCancelando(null); setMotivo(''); })}>Cancelar rodada</button>
                      <button type="button" className="mini dica" onClick={() => setCancelando(null)}>Voltar</button>
                    </>
                  ) : (
                    <button type="button" className="mini dica" onClick={() => setCancelando(r.id)}>Cancelar</button>
                  )}
                </div>
              )}
            </div>
          ))}
          <Totais conta={conta} />
        </section>

        {aberta && modo === 'fechar' && <Fechar conta={conta} voltar={() => setModo('ver')} fechou={(msg) => { setAviso(msg); setModo('ver'); void recarregar(); }} />}
        {aberta && conta.rodadas.every((r) => r.status === 'cancelado') && (
          <button type="button" className="dica" style={{ justifySelf: 'start' }} disabled={pendente} onClick={() => rodar(() => acaoConta(conta.id, 'cancelar'), 'Mesa liberada.', fechar)}>Liberar sem consumo</button>
        )}
        {!aberta && (
          <div className="cartao grade">
            <strong>{conta.status === 'fechada' ? '✅ Conta fechada' : 'Conta cancelada'}</strong>
            {conta.pagamentos.map((p, k) => <span key={k} className="dica">{PAGAMENTO_ROTULO[p.forma]}: {reais(p.valor)}</span>)}
            <div className="linha" style={{ gap: '0.4rem' }}>
              <button type="button" onClick={() => window.print()}>🖨️ Imprimir</button>
              <button type="button" className="botao-primario" onClick={fechar}>Voltar ao salão</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Totais({ conta }: { conta: ContaSalao }) {
  const fechada = conta.status === 'fechada';
  const taxa = fechada ? conta.taxa_servico ?? 0 : Math.round(conta.base_taxa * conta.taxa_servico_pct) / 100;
  const total = fechada ? conta.total ?? 0 : conta.subtotal + taxa;
  return (
    <div className="grade salao-totais" style={{ gap: '0.15rem' }}>
      <div className="linha" style={{ justifyContent: 'space-between' }}><span>Consumo</span><span>{reais(conta.subtotal)}</span></div>
      {taxa > 0 && <div className="linha" style={{ justifyContent: 'space-between' }}><span>Serviço ({conta.taxa_servico_pct.toLocaleString('pt-BR')}%){fechada ? '' : ' — opcional'}</span><span>{reais(taxa)}</span></div>}
      {fechada && (conta.desconto ?? 0) > 0 && <div className="linha" style={{ justifyContent: 'space-between' }}><span>Desconto</span><span>−{reais(conta.desconto ?? 0)}</span></div>}
      <div className="linha" style={{ justifyContent: 'space-between' }}><strong>Total</strong><strong className="total">{reais(total)}</strong></div>
      {conta.pessoas > 1 && <div className="linha dica" style={{ justifyContent: 'space-between' }}><span>Por pessoa ({conta.pessoas})</span><span>{reais(total / conta.pessoas)}</span></div>}
    </div>
  );
}

function Fechar({ conta, voltar, fechou }: { conta: ContaSalao; voltar: () => void; fechou: (msg: string) => void }) {
  const [comTaxa, setComTaxa] = useState(conta.taxa_servico_pct > 0);
  const [descTxt, setDescTxt] = useState('');
  const [pags, setPags] = useState<{ forma: FormaPagamento; txt: string }[]>([{ forma: 'pix', txt: '' }]);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const sub = Math.round(conta.subtotal * 100);
  const taxa = comTaxa ? Math.round(conta.base_taxa * conta.taxa_servico_pct) : 0;
  const desconto = lerCentavos(descTxt);
  const total = sub + taxa - (Number.isNaN(desconto) ? 0 : desconto);
  const valores = pags.map((p) => lerCentavos(p.txt));
  const pago = valores.reduce((s, v) => s + (Number.isNaN(v) ? 0 : v), 0);
  const falta = total - pago;
  const troco = -falta;
  const dividir = (n: number) => {
    const parte = Math.floor(total / n);
    setPags(Array.from({ length: n }, (_, i) => ({ forma: pags[i]?.forma ?? 'pix', txt: ((i === n - 1 ? total - parte * (n - 1) : parte) / 100).toFixed(2).replace('.', ',') })));
  };
  const invalido = Number.isNaN(desconto) || valores.some(Number.isNaN);
  return (
    <div className="cartao grade nao-imprimir">
      <strong>Fechar conta</strong>
      {conta.taxa_servico_pct > 0 && (
        <label className="check"><input type="checkbox" checked={comTaxa} onChange={(e) => setComTaxa(e.target.checked)} /> Cobrar serviço ({conta.taxa_servico_pct.toLocaleString('pt-BR')}%: {formatarReais(Math.round(conta.base_taxa * conta.taxa_servico_pct))})</label>
      )}
      <label>Desconto (R$) <input inputMode="decimal" value={descTxt} onChange={(e) => setDescTxt(e.target.value)} placeholder="0,00" style={{ maxWidth: '8rem' }} /></label>
      <div className="linha" style={{ justifyContent: 'space-between' }}><strong>Total a pagar</strong><strong className="total">{formatarReais(Math.max(0, total))}</strong></div>
      <div className="linha" style={{ gap: '0.3rem', flexWrap: 'wrap' }}>
        <span className="dica">Dividir em</span>
        {[1, 2, 3, 4, conta.pessoas].filter((n, i, a) => n >= 1 && a.indexOf(n) === i).map((n) => <button key={n} type="button" className="mini" onClick={() => dividir(n)}>{n === 1 ? 'Valor cheio' : `${n} partes`}</button>)}
      </div>
      {pags.map((p, i) => (
        <div key={i} className="linha" style={{ gap: '0.4rem' }}>
          <select value={p.forma} onChange={(e) => setPags((x) => x.map((y, j) => (j === i ? { ...y, forma: e.target.value as FormaPagamento } : y)))} aria-label="Forma de pagamento">
            {FORMAS.map((f) => <option key={f} value={f}>{PAGAMENTO_ROTULO[f]}</option>)}
          </select>
          <input inputMode="decimal" placeholder="0,00" value={p.txt} onChange={(e) => setPags((x) => x.map((y, j) => (j === i ? { ...y, txt: e.target.value } : y)))} style={{ maxWidth: '8rem' }} aria-label="Valor" />
          {pags.length > 1 && <button type="button" className="mini dica" onClick={() => setPags((x) => x.filter((_, j) => j !== i))} aria-label="Remover">✕</button>}
        </div>
      ))}
      <button type="button" className="mini" style={{ justifySelf: 'start' }} onClick={() => setPags((x) => [...x, { forma: 'dinheiro', txt: falta > 0 ? (falta / 100).toFixed(2).replace('.', ',') : '' }])}>+ Outra forma</button>
      {falta > 0 ? <span className="dica">Falta {formatarReais(falta)}</span> : troco > 0 ? <span><b>Troco: {formatarReais(troco)}</b></span> : null}
      {erro && <p className="erro" role="alert" style={{ margin: 0 }}>{erro}</p>}
      <div className="linha" style={{ gap: '0.4rem' }}>
        <button type="button" className="botao-primario" disabled={pendente || invalido || falta > 0} onClick={() => iniciar(async () => {
          const r = await salvando(fecharConta(conta.id, comTaxa, Number.isNaN(desconto) ? 0 : desconto, pags.map((p, i) => ({ forma: p.forma, valor: valores[i] ?? 0 }))));
          if (!r.ok) return setErro(r.erro);
          fechou(`Conta fechada: ${reais(r.dados.total)}${r.dados.troco > 0 ? ` · troco ${reais(r.dados.troco)}` : ''}${r.dados.caixa ? ' · lançada no caixa' : ' · sem caixa aberto (entra quando abrir)'}.`);
        })}>{pendente ? 'Fechando…' : 'Confirmar pagamento'}</button>
        <button type="button" onClick={voltar}>Voltar</button>
      </div>
    </div>
  );
}

function Configurar({ mapa }: { mapa: MapaSalao }) {
  const [tipo, setTipo] = useState<'mesa' | 'comanda'>('mesa');
  const [de, setDe] = useState('1');
  const [ate, setAte] = useState('10');
  const [lugares, setLugares] = useState('4');
  const [taxa, setTaxa] = useState(String(mapa.taxa_servico_pct).replace('.', ','));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const rodar = (f: () => Promise<{ ok: boolean; erro?: string }>, t: string) =>
    iniciar(async () => {
      const r = await salvando(f());
      setMsg(r.ok ? { ok: true, t } : { ok: false, t: r.erro ?? 'Não deu certo.' });
    });
  return (
    <div className="grade">
      {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}
      <section className="cartao grade">
        <h2 style={{ margin: 0 }}>Cadastrar mesas ou comandas</h2>
        <p className="dica" style={{ margin: 0 }}>Comanda = cartão numerado que o cliente leva (bar, balada, self-service). Cadastrar de novo um número que já existe só o reativa.</p>
        <div className="linha" style={{ gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label>Tipo<select value={tipo} onChange={(e) => setTipo(e.target.value as 'mesa' | 'comanda')}><option value="mesa">Mesas</option><option value="comanda">Comandas</option></select></label>
          <label>Do nº<input type="number" min={1} value={de} onChange={(e) => setDe(e.target.value)} style={{ width: '5rem' }} /></label>
          <label>até o nº<input type="number" min={1} value={ate} onChange={(e) => setAte(e.target.value)} style={{ width: '5rem' }} /></label>
          {tipo === 'mesa' && <label>Lugares<input type="number" min={1} max={99} value={lugares} onChange={(e) => setLugares(e.target.value)} style={{ width: '4.5rem' }} /></label>}
          <button type="button" className="botao-primario" disabled={pendente} onClick={() => rodar(async () => {
            const r = await criarLocais(tipo, Number(de), Number(ate), tipo === 'mesa' && lugares ? Number(lugares) : null);
            return r;
          }, 'Pronto! Já aparecem no mapa.')}>Cadastrar</button>
        </div>
      </section>
      <section className="cartao grade">
        <h2 style={{ margin: 0 }}>Taxa de serviço</h2>
        <div className="linha" style={{ gap: '0.5rem', alignItems: 'flex-end' }}>
          <label>Percentual<input inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value)} style={{ width: '5rem' }} /></label>
          <button type="button" disabled={pendente} onClick={() => rodar(() => salvarTaxaServico(Number(taxa.replace(',', '.')) || 0), 'Taxa salva.')}>Salvar</button>
        </div>
        <span className="dica">Sugerida no fechamento (o caixa pode tirar). Produtos marcados sem taxa de serviço no cardápio ficam fora da conta. 0 = não cobra.</span>
      </section>
      <section className="cartao grade">
        <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ margin: 0 }}>QR code nas mesas</h2>
          <Link href="/salao/qr" className="botao" target="_blank">🖨️ Imprimir QR codes</Link>
        </div>
        <p className="dica" style={{ margin: 0 }}>O cliente lê o QR da mesa, pede pelo celular e acompanha a conta. O pedido cai aqui como &quot;📲 QR&quot; para alguém confirmar (ou direto na cozinha, se o aceite automático estiver ligado). Vale o preço do cardápio digital.</p>
      </section>
      <section className="cartao grade">
        <h2 style={{ margin: 0 }}>Mesas e comandas cadastradas</h2>
        {mapa.locais.length === 0 ? <p className="dica" style={{ margin: 0 }}>Nenhuma ainda.</p> : (
          <table className="mod-matriz">
            <thead><tr><th>Nº</th><th>Apelido</th><th>Lugares</th><th /></tr></thead>
            <tbody>
              {mapa.locais.map((l) => <LinhaLocal key={l.id} l={l} pendente={pendente} rodar={rodar} />)}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function LinhaLocal({ l, pendente, rodar }: { l: LocalSalao; pendente: boolean; rodar: (f: () => Promise<{ ok: boolean; erro?: string }>, t: string) => void }) {
  const [nome, setNome] = useState(l.nome ?? '');
  const [lug, setLug] = useState(l.lugares ? String(l.lugares) : '');
  const mudou = nome !== (l.nome ?? '') || lug !== (l.lugares ? String(l.lugares) : '');
  return (
    <tr>
      <td>{l.tipo === 'mesa' ? 'Mesa' : 'Comanda'} {l.numero}</td>
      <td><input value={nome} maxLength={40} placeholder="Varanda, VIP…" onChange={(e) => setNome(e.target.value)} style={{ maxWidth: '9rem' }} /></td>
      <td><input type="number" min={1} max={99} value={lug} onChange={(e) => setLug(e.target.value)} style={{ width: '4rem' }} /></td>
      <td>
        <div className="linha" style={{ gap: '0.3rem', justifyContent: 'flex-end' }}>
          {mudou && <button type="button" className="mini botao-primario" disabled={pendente} onClick={() => rodar(() => editarLocal(l.id, nome, lug ? Number(lug) : null, true), 'Salvo.')}>Salvar</button>}
          <button type="button" className="mini" disabled={pendente} title="Gera um QR novo (o antigo para de funcionar)" onClick={() => rodar(() => editarLocal(l.id, nome, lug ? Number(lug) : null, true, true), 'QR trocado. Imprima de novo esta mesa.')}>Novo QR</button>
          <button type="button" className="mini dica" disabled={pendente || !!l.conta} title={l.conta ? 'Ocupada' : undefined} onClick={() => rodar(() => editarLocal(l.id, nome, lug ? Number(lug) : null, false), 'Removida do mapa.')}>Remover</button>
        </div>
      </td>
    </tr>
  );
}
