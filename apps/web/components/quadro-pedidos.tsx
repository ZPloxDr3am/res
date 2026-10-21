'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  acaoAvancar,
  formatarReais,
  paraCentavos,
  PAGAMENTO_ROTULO,
  STATUS_ROTULO,
  tempoDecorrido,
  TIPO_ROTULO,
  type StatusPedido,
} from '@res/core';
import type { PedidoRow } from '@/lib/pedidos';
import { definirAceiteAutomatico, mudarStatus } from '@/app/(painel)/pedidos/actions';
import { salvando } from '@/components/tempo-real';

const COLUNAS: StatusPedido[] = ['novo', 'em_preparo', 'pronto', 'em_entrega'];
const r$ = (v: number) => formatarReais(paraCentavos(Number(v)));
const telefone = (t: string) => (t.length === 11 ? `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}` : t.length === 10 ? `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}` : t);

function fracao(f: number | null): string {
  if (f == null || f >= 1) return '';
  const mapa: Record<string, string> = { '0.5': '½', '0.3333': '⅓', '0.25': '¼', '0.6667': '⅔', '0.75': '¾' };
  return (mapa[String(Number(f))] ?? `${Math.round(f * 100)}%`) + ' ';
}

/** Bipe curto com Web Audio (sem arquivo de som). Só toca depois de o usuário ativar o som. */
function bipar() {
  try {
    const ctx = new AudioContext();
    for (const [i, freq] of [880, 1175, 880].entries()) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.22);
      g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + i * 0.22 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.22 + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + i * 0.22);
      o.stop(ctx.currentTime + i * 0.22 + 0.21);
    }
    setTimeout(() => void ctx.close(), 1200);
  } catch {
    /* navegador sem áudio */
  }
}

export function QuadroPedidos({
  pedidos,
  aceiteAutomatico,
  tempoPreparo,
  marcas,
  lojas,
  lojaAtual,
  todas,
}: {
  pedidos: PedidoRow[];
  aceiteAutomatico: boolean;
  tempoPreparo: number;
  marcas: { id: string; nome: string }[];
  lojas: { id: string; nome: string }[];
  lojaAtual: string;
  todas: boolean;
}) {
  const [som, setSom] = useState(false);
  const [, setTique] = useState(0);
  const conhecidos = useRef<Set<string> | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  // preferência de som por aparelho
  useEffect(() => {
    try {
      setSom(localStorage.getItem('res_som_pedidos') === '1');
    } catch {
      /* armazenamento indisponível */
    }
  }, []);
  const alternarSom = () => {
    const novo = !som;
    setSom(novo);
    try {
      localStorage.setItem('res_som_pedidos', novo ? '1' : '0');
    } catch {
      /* ignora */
    }
    if (novo) bipar();
  };

  // novo pedido que chegou depois de abrir a tela → bipe
  useEffect(() => {
    const novos = pedidos.filter((p) => p.status === 'novo').map((p) => p.id);
    if (conhecidos.current === null) {
      conhecidos.current = new Set(pedidos.map((p) => p.id));
      return;
    }
    const chegaram = novos.filter((id) => !conhecidos.current!.has(id));
    for (const p of pedidos) conhecidos.current.add(p.id);
    if (chegaram.length && som) bipar();
  }, [pedidos, som]);

  // enquanto houver pedido novo esperando, bipa de novo a cada 20 s
  useEffect(() => {
    if (!som || !pedidos.some((p) => p.status === 'novo')) return;
    const t = setInterval(bipar, 20000);
    return () => clearInterval(t);
  }, [pedidos, som]);

  // atualiza "há X min"
  useEffect(() => {
    const t = setInterval(() => setTique((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const abertos = pedidos.filter((p) => COLUNAS.includes(p.status));
  const encerrados = pedidos.filter((p) => !COLUNAS.includes(p.status)).reverse();
  // em "todas as lojas" o cartão mostra a loja; numa loja só, a marca (se houver mais de uma)
  const etiqueta = (p: PedidoRow) => (todas ? lojas.find((l) => l.id === p.loja_id)?.nome : marcas.length > 1 ? marcas.find((m) => m.id === p.marca_id)?.nome : null);

  return (
    <div className="grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="grade" style={{ gap: '0.1rem' }}>
          <h1 style={{ margin: 0 }}>Pedidos</h1>
          {lojas.length > 1 && (
            <span className="dica">
              {todas ? `Todas as lojas (${lojas.length})` : lojaAtual} ·{' '}
              <Link href={todas ? '/pedidos' : '/pedidos?todas=1'}>{todas ? `só ${lojaAtual}` : 'ver todas as lojas'}</Link>
            </span>
          )}
        </div>
        <div className="linha" style={{ alignItems: 'center' }}>
          <button type="button" onClick={alternarSom} aria-pressed={som}>
            {som ? '🔔 Som ligado' : '🔕 Ligar som'}
          </button>
          {!todas && <label className="check" title="Pedidos novos já entram em preparo">
            <input
              type="checkbox"
              checked={aceiteAutomatico}
              disabled={pendente}
              onChange={(e) => {
                const v = e.target.checked;
                iniciar(async () => {
                  const r = await salvando(definirAceiteAutomatico(v));
                  setErro(r.ok ? null : r.erro);
                });
              }}
            />
            Aceite automático
          </label>}
          <Link href="/pedidos/novo" className="botao botao-primario">
            + Novo pedido
          </Link>
        </div>
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}

      <div className="quadro">
        {COLUNAS.map((status) => {
          const lista = abertos.filter((p) => p.status === status);
          return (
            <section key={status} className="coluna" aria-label={STATUS_ROTULO[status]}>
              <h2>
                {STATUS_ROTULO[status]} <span className="dica">{lista.length}</span>
              </h2>
              {lista.map((p) => (
                <CartaoPedido key={p.id} pedido={p} tempoPreparo={tempoPreparo} marca={etiqueta(p)} />
              ))}
              {lista.length === 0 && <p className="dica" style={{ margin: 0 }}>Nenhum.</p>}
            </section>
          );
        })}
      </div>

      <details>
        <summary className="dica">Concluídos e cancelados nas últimas 12 horas ({encerrados.length})</summary>
        <div className="quadro" style={{ paddingTop: '0.5rem' }}>
          {encerrados.map((p) => (
            <CartaoPedido key={p.id} pedido={p} tempoPreparo={tempoPreparo} marca={etiqueta(p)} />
          ))}
        </div>
      </details>
    </div>
  );
}

function CartaoPedido({ pedido: p, tempoPreparo, marca }: { pedido: PedidoRow; tempoPreparo: number; marca: string | null | undefined }) {
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const avancar = acaoAvancar(p.status, p.tipo);
  const aberto = !['concluido', 'cancelado'].includes(p.status);
  const referencia = new Date(p.aceito_em ?? p.criado_em);
  const minutos = (Date.now() - referencia.getTime()) / 60000;
  const atrasado = (p.status === 'em_preparo' || p.status === 'novo') && minutos > tempoPreparo;

  const mudar = (status: StatusPedido, m?: string) =>
    iniciar(async () => {
      const r = await salvando(mudarStatus(p.id, status, m));
      setErro(r.ok ? null : r.erro);
      if (r.ok) setCancelando(false);
    });

  return (
    <article className="pedido" data-status={p.status}>
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
        <span className="pedido-numero">#{p.numero}</span>
        <span className={`selo ${p.tipo === 'entrega' ? 'selo-delivery' : 'selo-presencial'}`}>{TIPO_ROTULO[p.tipo]}</span>
        {p.origem === 'cardapio_digital' && <span className="selo selo-pizza" title="Feito pelo cliente no cardápio digital">Online</span>}
        <span className={atrasado ? 'atrasado' : 'dica'} title={atrasado ? `Passou de ${tempoPreparo} min` : undefined}>
          {aberto ? tempoDecorrido(new Date(p.criado_em)) : STATUS_ROTULO[p.status]}
        </span>
      </div>
      <div>
        <strong>{p.cliente_nome}</strong>
        {p.cliente_telefone && <span className="dica"> · {telefone(p.cliente_telefone)}</span>}
        {marca && <span className="dica"> · {marca}</span>}
      </div>
      {p.endereco && (
        <div className="dica">
          {p.endereco.logradouro}
          {p.endereco.numero ? `, ${p.endereco.numero}` : ''}
          {p.endereco.complemento ? ` – ${p.endereco.complemento}` : ''} · {p.endereco.bairro}
          {p.endereco.referencia ? ` (${p.endereco.referencia})` : ''}
        </div>
      )}
      <ul>
        {p.pedido_itens.map((i) => (
          <li key={i.id}>
            {i.quantidade}× {i.nome}
            {i.pedido_item_opcoes.length > 0 && (
              <span className="dica">
                {' '}
                — {i.pedido_item_opcoes.map((o) => `${fracao(o.fracao)}${o.quantidade > 1 && o.fracao == null ? `${o.quantidade}× ` : ''}${o.nome}`).join(', ')}
              </span>
            )}
            {i.observacao && <div className="dica">Obs.: {i.observacao}</div>}
          </li>
        ))}
      </ul>
      {p.observacao && <div className="dica">Obs. do pedido: {p.observacao}</div>}
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
        <span className="dica">
          {PAGAMENTO_ROTULO[p.pagamento]}
          {p.troco_para != null && ` · troco p/ ${r$(p.troco_para)} (${r$(Number(p.troco_para) - Number(p.total))})`}
        </span>
        <strong>{r$(p.total)}</strong>
      </div>
      {p.status === 'cancelado' && p.motivo_cancelamento && <div className="dica">Motivo: {p.motivo_cancelamento}</div>}

      {aberto && !cancelando && (
        <div className="linha" style={{ gap: '0.4rem' }}>
          {avancar && (
            <button type="button" className="botao-primario" disabled={pendente} onClick={() => mudar(avancar.para)}>
              {pendente ? '…' : avancar.rotulo}
            </button>
          )}
          <button type="button" className="dica" disabled={pendente} onClick={() => setCancelando(true)}>
            Cancelar
          </button>
        </div>
      )}
      {cancelando && (
        <form
          className="grade"
          style={{ gap: '0.4rem' }}
          onSubmit={(e) => {
            e.preventDefault();
            mudar('cancelado', motivo);
          }}
        >
          <label>
            Motivo do cancelamento
            <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} required maxLength={200} autoFocus />
          </label>
          <div className="linha" style={{ gap: '0.4rem' }}>
            <button className="erro" disabled={pendente || !motivo.trim()}>Confirmar cancelamento</button>
            <button type="button" onClick={() => setCancelando(false)}>Voltar</button>
          </div>
        </form>
      )}
      {erro && <p className="erro" role="alert">{erro}</p>}
    </article>
  );
}
