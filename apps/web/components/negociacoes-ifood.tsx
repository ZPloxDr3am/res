'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { descreverNegociacao, formatarReais, rotuloMotivo, seNaoResponder, type Alternativa, type Negociacao, type RespostaNegociacao } from '@res/core';
import { responderNegociacao } from '@/app/(painel)/pedidos/actions';
import { salvando } from '@/components/tempo-real';
import { bipar } from '@/components/quadro-pedidos';

export type NegociacaoAberta = {
  id: string;
  acao: string;
  tipo: string | null;
  mensagem: string | null;
  expira_em: string | null;
  acao_no_prazo: string | null;
  alternativas: Alternativa[];
  motivos_aceite: string[];
  itens: Negociacao['itens'];
  evidencias: number;
  situacao: 'aberta' | 'respondida';
  resposta: RespostaNegociacao | null;
  pedidos: { numero: number; externo_codigo: string | null; total: number; cliente_nome: string | null } | null;
};

const reais = (v: number) => formatarReais(Math.round(v * 100));

/** Faixa no topo do quadro com as negociações do iFood esperando resposta (D-075). */
export function NegociacoesIfood({ lista }: { lista: NegociacaoAberta[] }) {
  const vistas = useRef<Set<string> | null>(null);
  useEffect(() => {
    // bipe quando chega uma negociação nova (se o som do quadro estiver ligado)
    const ids = new Set(lista.filter((n) => n.situacao === 'aberta').map((n) => n.id));
    if (vistas.current && [...ids].some((id) => !vistas.current!.has(id))) {
      try {
        if (localStorage.getItem('res_som_pedidos') === '1') bipar();
      } catch {
        /* sem armazenamento */
      }
    }
    vistas.current = ids;
  }, [lista]);
  if (lista.length === 0) return null;
  return (
    <section className="qp-negociacoes" aria-label="Negociações do iFood">
      {lista.map((n) => <CartaoNegociacao key={n.id} n={n} />)}
    </section>
  );
}

function Prazo({ ate }: { ate: string }) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((Date.parse(ate) - agora) / 1000));
  const txt = s <= 0 ? 'prazo encerrado' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  return <strong className="qp-neg-prazo" data-urgente={s < 120 || undefined}>⏱ {txt}</strong>;
}

function CartaoNegociacao({ n }: { n: NegociacaoAberta }) {
  const d = descreverNegociacao(n.acao, n.tipo);
  const [modo, setModo] = useState<'nada' | 'aceitar' | 'recusar' | string>('nada');
  const [motivo, setMotivo] = useState(n.motivos_aceite[0] ?? '');
  const [texto, setTexto] = useState('');
  const [valor, setValor] = useState('');
  const [minutos, setMinutos] = useState(0);
  const [motivoTempo, setMotivoTempo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const enviar = (r: RespostaNegociacao) =>
    iniciar(async () => {
      setErro(null);
      const res = await salvando(responderNegociacao(n.id, r));
      if (!res.ok) setErro(res.erro);
    });
  const ped = n.pedidos;

  if (n.situacao === 'respondida') {
    return (
      <article className="qp-negociacao" data-situacao="respondida">
        <strong>iFood · pedido #{ped?.numero}{ped?.externo_codigo ? ` (iFood ${ped.externo_codigo})` : ''}</strong>
        <span className="dica">Resposta enviada. Aguardando o iFood confirmar…</span>
      </article>
    );
  }

  return (
    <article className="qp-negociacao" role="alert">
      <div className="linha" style={{ justifyContent: 'space-between', gap: '0.5rem' }}>
        <strong>⚠️ {d.titulo}</strong>
        {n.expira_em && <Prazo ate={n.expira_em} />}
      </div>
      <span>
        Pedido <strong>#{ped?.numero}</strong>{ped?.externo_codigo ? ` · iFood ${ped.externo_codigo}` : ''}{ped?.cliente_nome ? ` · ${ped.cliente_nome}` : ''}{ped ? ` · ${reais(Number(ped.total))}` : ''}
      </span>
      {n.mensagem && <em>“{n.mensagem}”</em>}
      {n.itens.length > 0 && (
        <ul className="dica" style={{ margin: 0 }}>
          {n.itens.map((i, k) => <li key={k}>{i.quantidade}× {i.adicional ? 'adicional' : 'item'} · {reais(i.valor)}{i.motivo ? ` · ${rotuloMotivo(i.motivo)}` : ''}</li>)}
        </ul>
      )}
      {n.evidencias > 0 && <span className="dica">📷 O cliente mandou {n.evidencias} foto(s): veja no Gestor de Pedidos do iFood.</span>}
      <span className="dica">Se ninguém responder, {seNaoResponder(n.acao_no_prazo)}.</span>

      <div className="linha" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
        <button type="button" className="botao-primario" aria-pressed={modo === 'aceitar'} disabled={pendente} onClick={() => (n.motivos_aceite.length ? setModo('aceitar') : enviar({ tipo: 'aceitar' }))}>
          ✅ {d.aceitarRotulo}
        </button>
        {d.podeRecusar && <button type="button" className="botao" aria-pressed={modo === 'recusar'} disabled={pendente} onClick={() => setModo('recusar')}>✋ Recusar</button>}
        {n.alternativas.map((a) => (
          <button key={a.id} type="button" className="botao" aria-pressed={modo === a.id} disabled={pendente} onClick={() => setModo(a.id)}>
            {a.tipo === 'mais_tempo' ? '⏳ Pedir mais tempo' : a.tipo === 'beneficio' ? '🎁 Oferecer cupom' : '💸 Oferecer reembolso'}
          </button>
        ))}
      </div>

      {modo === 'aceitar' && (
        <div className="linha" style={{ gap: '0.4rem', alignItems: 'flex-end' }}>
          <label>Motivo<select value={motivo} onChange={(e) => setMotivo(e.target.value)}>{n.motivos_aceite.map((m) => <option key={m} value={m}>{rotuloMotivo(m)}</option>)}</select></label>
          <button type="button" className="botao-primario" disabled={pendente || !motivo} onClick={() => enviar({ tipo: 'aceitar', motivo })}>Confirmar</button>
        </div>
      )}
      {modo === 'recusar' && (
        <div className="grade" style={{ gap: '0.4rem' }}>
          <label>Motivo da recusa (o cliente vai ler)<input value={texto} maxLength={250} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: o pedido saiu no horário e foi entregue quente" /></label>
          <button type="button" className="erro" disabled={pendente || !texto.trim()} onClick={() => enviar({ tipo: 'recusar', motivo: texto.trim() })}>Recusar</button>
        </div>
      )}
      {n.alternativas.filter((a) => a.id === modo).map((a) =>
        a.tipo === 'mais_tempo' ? (
          <div key={a.id} className="linha" style={{ gap: '0.4rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label>Minutos a mais<select value={minutos} onChange={(e) => setMinutos(Number(e.target.value))}><option value={0}>—</option>{a.minutos.map((m) => <option key={m} value={m}>{m} min</option>)}</select></label>
            {a.motivos_tempo.length > 0 && (
              <label>Motivo<select value={motivoTempo} onChange={(e) => setMotivoTempo(e.target.value)}><option value="">—</option>{a.motivos_tempo.map((m) => <option key={m} value={m}>{rotuloMotivo(m)}</option>)}</select></label>
            )}
            <button type="button" className="botao-primario" disabled={pendente || !minutos || (a.motivos_tempo.length > 0 && !motivoTempo)}
              onClick={() => enviar({ tipo: 'alternativa', alternativaId: a.id, alternativa: 'mais_tempo', minutos, motivoTempo: motivoTempo || undefined })}>Enviar</button>
          </div>
        ) : (
          <div key={a.id} className="linha" style={{ gap: '0.4rem', alignItems: 'flex-end' }}>
            <label>Valor (R$){a.valor_max != null ? ` · até ${reais(a.valor_max)}` : ''}<input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" style={{ width: '8rem' }} /></label>
            <button type="button" className="botao-primario" disabled={pendente || !(Number(valor.replace(',', '.')) > 0)}
              onClick={() => enviar({ tipo: 'alternativa', alternativaId: a.id, alternativa: a.tipo, valor: Number(valor.replace(',', '.')) })}>Enviar</button>
          </div>
        ),
      )}
      {erro && <p className="erro" role="alert" style={{ margin: 0 }}>{erro}</p>}
    </article>
  );
}
