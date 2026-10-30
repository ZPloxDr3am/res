'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  blocosCombo,
  acaoAvancar,
  faseAgendamento,
  FOLGA_AGENDADO_MIN,
  formatarReais,
  paraCentavos,
  PAGAMENTO_ROTULO,
  prazoEntrega as calcularPrazo,
  situacaoPrazo,
  rotuloHorario,
  segmentoCliente,
  SEGMENTOS,
  STATUS_ROTULO,
  tempoDecorrido,
  TIPO_ROTULO,
  type StatusPedido,
} from '@res/core';
import type { PedidoRow } from '@/lib/pedidos';
import { definirAceiteAutomatico, marcarPago, mudarStatus } from '@/app/(painel)/pedidos/actions';
import { salvando } from '@/components/tempo-real';
import { BotaoNovoPedido } from '@/components/pedido-flutuante';
import { useImprimir } from '@/components/impressao/usar-impressao';
import { cuponsPendentes, imprimirPedido } from '@/app/(painel)/impressoras/actions';
import { SugestaoLotes } from '@/components/pedidos/sugestao-lotes';

const COLUNAS: StatusPedido[] = ['novo', 'em_preparo', 'pronto', 'em_entrega'];

// ---- filtros rápidos (D-057): por loja/marca, tipo, canal e situação; lembrados neste aparelho
type Filtros = { local: string[]; tipo: string[]; canal: string[]; situacao: string[] };
const SEM_FILTRO: Filtros = { local: [], tipo: [], canal: [], situacao: [] };
const CHAVE_FILTROS = 'res_filtros_pedidos';

/** Selo do cliente no cartão: 1º pedido, quantos já fez e se estava sumido. */
function seloCliente(p: PedidoRow, historico: Record<string, string[]>): { texto: string; titulo: string; tipo: 'novo' | 'volta' | 'fiel' | 'normal' } | null {
  if (!p.cliente_telefone) return null;
  const criado = Date.parse(p.criado_em);
  const antes = (historico[p.cliente_telefone] ?? []).map((d) => Date.parse(d)).filter((t) => t < criado - 1000);
  if (antes.length === 0) return { texto: '🌱 1º pedido', titulo: 'Primeira vez que este telefone pede: capriche!', tipo: 'novo' };
  const dias = Math.floor((criado - Math.max(...antes)) / 86400000);
  const seg = segmentoCliente(dias, antes.length);
  const s = SEGMENTOS.find((x) => x.id === seg);
  const n = `${antes.length + 1}º pedido`;
  if (dias > 30) return { texto: `${n} · voltou após ${dias} dias`, titulo: `${s ? `${s.emoji} ${s.rotulo}: ` : ''}o último pedido foi há ${dias} dias. Vale um agrado!`, tipo: 'volta' };
  return { texto: `${n}${s ? ` · ${s.emoji} ${s.rotulo}` : ''}`, titulo: s?.regra ?? '', tipo: seg === 'fieis' ? 'fiel' : 'normal' };
}

/** Mensagem pronta para o WhatsApp do cliente, conforme a etapa do pedido. */
function mensagemCliente(p: PedidoRow, marca: string | null | undefined, fuso: string): string {
  const nome = p.cliente_nome.split(' ')[0];
  const de = marca ? ` da ${marca}` : '';
  const link = p.codigo ? `\nAcompanhe aqui: ${window.location.origin}/c/pedido/pedido/${p.codigo}` : '';
  const hora = (t: string) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: fuso });
  switch (p.status) {
    case 'novo':
    case 'em_preparo':
      return `Olá, ${nome}! Recebemos seu pedido #${p.numero}${de} e ele já está sendo preparado. 😋${link}`;
    case 'pronto':
      return p.tipo === 'entrega'
        ? `Olá, ${nome}! Seu pedido #${p.numero}${de} está pronto e logo sai para entrega. 🛵${link}`
        : `Olá, ${nome}! Seu pedido #${p.numero}${de} está pronto para retirada. Estamos te esperando! 🏪${link}`;
    case 'em_entrega':
      return `Olá, ${nome}! Seu pedido #${p.numero}${de} saiu para entrega${p.entregador_nome ? ` com ${p.entregador_nome.split(' ')[0]}` : ''}.${p.previsao_chegada ? ` Chega por volta das ${hora(p.previsao_chegada)}.` : ''} 🛵${link}`;
    case 'concluido':
      return `Olá, ${nome}! Obrigado pelo pedido #${p.numero}${de}. Esperamos que tenha gostado! ❤️`;
    case 'cancelado':
      return `Olá, ${nome}. Seu pedido #${p.numero}${de} foi cancelado${p.motivo_cancelamento ? `: ${p.motivo_cancelamento}` : ''}. Qualquer dúvida, é só responder esta mensagem.`;
    default:
      return `Olá, ${nome}!`;
  }
}
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
  fuso,
  filaImpressao = 0,
  prazoEntrega = {},
  marcas,
  lojas,
  lojaAtual,
  todas,
  historico = {},
}: {
  pedidos: PedidoRow[];
  aceiteAutomatico: boolean;
  tempoPreparo: number;
  fuso: string;
  filaImpressao?: number;
  prazoEntrega?: Record<string, number>;
  marcas: { id: string; nome: string }[];
  lojas: { id: string; nome: string }[];
  lojaAtual: string;
  todas: boolean;
  historico?: Record<string, string[]>;
}) {
  const [filtros, setFiltros] = useState<Filtros>(SEM_FILTRO);
  useEffect(() => {
    try {
      const f = JSON.parse(localStorage.getItem(CHAVE_FILTROS) ?? 'null') as Filtros | null;
      if (f && Array.isArray(f.tipo)) setFiltros({ ...SEM_FILTRO, ...f });
    } catch {
      /* sem armazenamento */
    }
  }, []);
  const mudarFiltro = (grupo: keyof Filtros, valor: string) =>
    setFiltros((f) => {
      const atual = f[grupo];
      const novo = { ...f, [grupo]: atual.includes(valor) ? atual.filter((x) => x !== valor) : [...atual, valor] };
      try {
        localStorage.setItem(CHAVE_FILTROS, JSON.stringify(novo));
      } catch {
        /* ignora */
      }
      return novo;
    });
  const limparFiltros = () => {
    setFiltros(SEM_FILTRO);
    try {
      localStorage.removeItem(CHAVE_FILTROS);
    } catch {
      /* ignora */
    }
  };
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

  const agora = new Date();
  const fase = (p: PedidoRow) => faseAgendamento(p.agendado_para ? new Date(p.agendado_para) : null, tempoPreparo, agora);
  // agendado que ainda não chegou a hora fica fora das colunas
  // Pix do Mercado Pago ainda não pago (D-044): fica fora das colunas, sem bipe, até o pagamento
  const aguardandoPix = (p: PedidoRow) => p.status === 'novo' && !!p.aguarda_pagamento && !p.pago_em;
  const emEspera = (p: PedidoRow) => p.status === 'novo' && (fase(p) === 'agendado' || aguardandoPix(p));
  const chaves = pedidos.filter((p) => COLUNAS.includes(p.status)).map((p) => `${p.id}:${emEspera(p) ? 'a' : 'n'}`).join(',');

  // pedido que chegou depois de abrir a tela, ou agendado que chegou a hora de preparar → bipe
  useEffect(() => {
    const atuais = chaves ? chaves.split(',') : [];
    if (conhecidos.current === null) {
      conhecidos.current = new Set(atuais);
      return;
    }
    const chegaram = atuais.filter((k) => !conhecidos.current!.has(k));
    for (const k of atuais) conhecidos.current.add(k);
    if (chegaram.length && som) bipar();
  }, [chaves, som]);

  // enquanto houver pedido novo esperando aceite, bipa de novo a cada 20 s
  const esperandoAceite = pedidos.some((p) => p.status === 'novo' && !emEspera(p));
  useEffect(() => {
    if (!som || !esperandoAceite) return;
    const t = setInterval(bipar, 20000);
    return () => clearInterval(t);
  }, [esperandoAceite, som]);

  // atualiza "há X min"
  useEffect(() => {
    const t = setInterval(() => setTique((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // em "todas as lojas" o cartão mostra a loja; numa loja só, a marca (se houver mais de uma)
  const etiqueta = (p: PedidoRow) => (todas ? lojas.find((l) => l.id === p.loja_id)?.nome : marcas.length > 1 ? marcas.find((m) => m.id === p.marca_id)?.nome : null);
  const nomeMarca = (p: PedidoRow) => marcas.find((m) => m.id === p.marca_id)?.nome ?? null;

  // situação de cada pedido para os filtros
  const atrasadoPedido = (p: PedidoRow) => {
    if (!COLUNAS.includes(p.status)) return false;
    const ag = p.agendado_para ? Date.parse(p.agendado_para) : null;
    const preparo = (p.status === 'em_preparo' || p.status === 'novo') && (ag ? Date.now() > ag : (Date.now() - Date.parse(p.aceito_em ?? p.criado_em)) / 60000 > tempoPreparo);
    const entrega = p.tipo === 'entrega' && situacaoPrazo(calcularPrazo(Date.parse(p.criado_em), ag, prazoEntrega[p.loja_id] ?? 35), Date.now()).estado === 'atrasado';
    return preparo || entrega;
  };
  const situacoes = (p: PedidoRow): string[] => {
    const s: string[] = [];
    if (atrasadoPedido(p)) s.push('atrasado');
    if (p.tipo === 'entrega' && p.status === 'pronto' && !p.entregador_nome) s.push('sem_motoboy');
    if (p.pagamento !== 'online' && !p.pago_em && COLUNAS.includes(p.status) && !aguardandoPix(p)) s.push('cobrar');
    if (aguardandoPix(p)) s.push('pix');
    if (seloCliente(p, historico)?.tipo === 'novo') s.push('primeiro');
    return s;
  };
  const localDe = (p: PedidoRow) => (todas ? p.loja_id : p.marca_id);
  const canalDe = (p: PedidoRow) => (p.origem === 'cardapio_digital' ? 'online' : 'balcao');
  const passa = (p: PedidoRow) =>
    (!filtros.local.length || filtros.local.includes(localDe(p))) &&
    (!filtros.tipo.length || filtros.tipo.includes(p.tipo)) &&
    (!filtros.canal.length || filtros.canal.includes(canalDe(p))) &&
    (!filtros.situacao.length || situacoes(p).some((x) => filtros.situacao.includes(x)));
  const ativos = pedidos.filter((p) => COLUNAS.includes(p.status));
  const conta = (f: (p: PedidoRow) => boolean) => ativos.filter(f).length;
  const filtrando = Object.values(filtros).some((v) => v.length > 0);

  const abertos = pedidos.filter((p) => COLUNAS.includes(p.status) && !emEspera(p) && passa(p));
  const agendados = pedidos.filter((p) => emEspera(p) && !aguardandoPix(p) && passa(p)).sort((a, b) => a.agendado_para!.localeCompare(b.agendado_para!));
  const pixPendentes = pedidos.filter((p) => aguardandoPix(p) && passa(p));
  const encerrados = pedidos.filter((p) => !COLUNAS.includes(p.status) && passa(p)).reverse();
  const locais = todas ? lojas.map((l) => ({ id: l.id, nome: l.nome })) : marcas.length > 1 ? marcas.map((m) => ({ id: m.id, nome: m.nome })) : [];
  const chip = (grupo: keyof Filtros, valor: string, rotulo: string, n: number, cor?: string) => (
    <button key={`${grupo}-${valor}`} type="button" className="qp-chip" aria-pressed={filtros[grupo].includes(valor)} data-cor={cor} onClick={() => mudarFiltro(grupo, valor)} disabled={n === 0 && !filtros[grupo].includes(valor)}>
      {rotulo} <span className="qp-chip-n">{n}</span>
    </button>
  );

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
          <BotaoNovoPedido />
        </div>
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}
      {!todas && <FilaImpressao n={filaImpressao} />}

      <div className="qp-filtros" role="toolbar" aria-label="Filtrar pedidos">
        {locais.map((l) => chip('local', l.id, l.nome, conta((p) => localDe(p) === l.id)))}
        {locais.length > 0 && <span className="qp-sep" aria-hidden />}
        {chip('tipo', 'entrega', '🛵 Entrega', conta((p) => p.tipo === 'entrega'))}
        {chip('tipo', 'retirada', '🏪 Retirada', conta((p) => p.tipo === 'retirada'))}
        {conta((p) => p.tipo === 'balcao') > 0 && chip('tipo', 'balcao', '🍽️ Balcão', conta((p) => p.tipo === 'balcao'))}
        <span className="qp-sep" aria-hidden />
        {chip('canal', 'online', '📱 Cardápio digital', conta((p) => canalDe(p) === 'online'))}
        {chip('canal', 'balcao', '☎️ Lançado na loja', conta((p) => canalDe(p) === 'balcao'))}
        <span className="qp-sep" aria-hidden />
        {chip('situacao', 'atrasado', '⚠️ Atrasados', conta((p) => situacoes(p).includes('atrasado')), 'erro')}
        {chip('situacao', 'sem_motoboy', '🛵 Prontos sem motoboy', conta((p) => situacoes(p).includes('sem_motoboy')), 'aviso')}
        {chip('situacao', 'cobrar', '💰 A cobrar', conta((p) => situacoes(p).includes('cobrar')))}
        {chip('situacao', 'pix', '⏳ Aguardando Pix', conta((p) => situacoes(p).includes('pix')))}
        {chip('situacao', 'primeiro', '🌱 1º pedido', conta((p) => situacoes(p).includes('primeiro')))}
        {filtrando && (
          <button type="button" className="mini" onClick={limparFiltros}>
            ✕ Limpar filtros
          </button>
        )}
      </div>
      {filtrando && <p className="dica" style={{ margin: 0 }}>Mostrando só os pedidos dos filtros marcados. Pedido novo continua tocando o alerta mesmo fora do filtro.</p>}

      {pixPendentes.length > 0 && (
        <details open className="agendados">
          <summary>
            <strong>⏳ Aguardando Pix</strong> <span className="dica">{pixPendentes.length} · entram sozinhos quando o Mercado Pago confirmar; sem pagamento em 40 min, são cancelados</span>
          </summary>
          <div className="quadro" style={{ paddingTop: '0.5rem' }}>
            {pixPendentes.map((p) => (
              <CartaoPedido key={p.id} pedido={p} tempoPreparo={tempoPreparo} fuso={fuso} marca={etiqueta(p)} nomeMarca={nomeMarca(p)} selo={seloCliente(p, historico)} prazoMin={prazoEntrega[p.loja_id] ?? 35} />
            ))}
          </div>
        </details>
      )}

      {agendados.length > 0 && (
        <details open className="agendados">
          <summary>
            <strong>Agendados</strong> <span className="dica">{agendados.length} · entram em "Novo", com alerta, {tempoPreparo + FOLGA_AGENDADO_MIN} min antes do horário</span>
          </summary>
          <div className="quadro" style={{ paddingTop: '0.5rem' }}>
            {agendados.map((p) => (
              <CartaoPedido key={p.id} pedido={p} tempoPreparo={tempoPreparo} fuso={fuso} marca={etiqueta(p)} nomeMarca={nomeMarca(p)} selo={seloCliente(p, historico)} prazoMin={prazoEntrega[p.loja_id] ?? 35} />
            ))}
          </div>
        </details>
      )}

      <SugestaoLotes prontos={abertos.filter((p) => p.status === 'pronto' && p.tipo === 'entrega').map((p) => ({ id: p.id, loja_id: p.loja_id }))} />

      <div className="quadro">
        {COLUNAS.map((status) => {
          const lista = abertos.filter((p) => p.status === status);
          return (
            <section key={status} className="coluna" aria-label={STATUS_ROTULO[status]}>
              <h2>
                {STATUS_ROTULO[status]} <span className="dica">{lista.length}</span>
              </h2>
              {lista.map((p) => (
                <CartaoPedido key={p.id} pedido={p} tempoPreparo={tempoPreparo} fuso={fuso} marca={etiqueta(p)} nomeMarca={nomeMarca(p)} selo={seloCliente(p, historico)} prazoMin={prazoEntrega[p.loja_id] ?? 35} />
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
            <CartaoPedido key={p.id} pedido={p} tempoPreparo={tempoPreparo} fuso={fuso} marca={etiqueta(p)} nomeMarca={nomeMarca(p)} selo={seloCliente(p, historico)} prazoMin={prazoEntrega[p.loja_id] ?? 35} />
          ))}
        </div>
      </details>
    </div>
  );
}

/** Cupons esperando impressão (aceite automático sem agente, impressora desligada…). */
function FilaImpressao({ n }: { n: number }) {
  const { imprimir, pendente, aviso } = useImprimir();
  if (n === 0 && !aviso) return null;
  return (
    <div className="aviso linha" style={{ alignItems: 'center', gap: '0.6rem' }}>
      {n > 0 && (
        <>
          <span>🖨 <strong>{n} cupom(ns)</strong> esperando impressão.</span>
          <button type="button" className="mini botao-primario" disabled={pendente} onClick={() => imprimir(cuponsPendentes)}>
            {pendente ? 'Imprimindo…' : 'Imprimir aqui'}
          </button>
          <Link href="/impressoras?aba=historico" className="dica">ver fila</Link>
        </>
      )}
      {aviso && <span className={aviso.ok ? 'dica' : 'erro'}>{aviso.texto}</span>}
    </div>
  );
}

function CartaoPedido({
  pedido: p,
  tempoPreparo,
  fuso,
  marca,
  nomeMarca,
  selo,
  prazoMin = 35,
}: {
  pedido: PedidoRow;
  tempoPreparo: number;
  fuso: string;
  marca: string | null | undefined;
  nomeMarca?: string | null;
  selo?: ReturnType<typeof seloCliente>;
  prazoMin?: number;
}) {
  const chaveAviso = `res_avisado_${p.id}_${p.status}`;
  const [avisado, setAvisado] = useState(false);
  useEffect(() => {
    try {
      setAvisado(localStorage.getItem(chaveAviso) === '1');
    } catch {
      /* ignora */
    }
  }, [chaveAviso]);
  const avisarCliente = () => {
    const tel = (p.cliente_telefone ?? '').replace(/\D/g, '');
    if (!tel) return;
    window.open(`https://wa.me/${tel.length >= 12 ? tel : '55' + tel}?text=${encodeURIComponent(mensagemCliente(p, nomeMarca, fuso))}`, '_blank', 'noopener');
    try {
      localStorage.setItem(chaveAviso, '1');
    } catch {
      /* ignora */
    }
    setAvisado(true);
  };
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const impressao = useImprimir();
  const avancar = acaoAvancar(p.status, p.tipo);
  const aberto = !['concluido', 'cancelado'].includes(p.status);
  const agendado = p.agendado_para ? new Date(p.agendado_para) : null;
  // agendado: atrasa se passou do horário combinado; imediato: se passou do tempo de preparo
  const atrasado = (p.status === 'em_preparo' || p.status === 'novo') &&
    (agendado ? Date.now() > agendado.getTime() : (Date.now() - new Date(p.aceito_em ?? p.criado_em).getTime()) / 60000 > tempoPreparo);

  // prazo prometido ao cliente (D-028): laranja faltando 10 min, vermelho quando estoura
  const prazo = p.tipo === 'entrega' && aberto ? calcularPrazo(Date.parse(p.criado_em), agendado ? agendado.getTime() : null, prazoMin) : null;
  const sit = prazo != null ? situacaoPrazo(prazo, Date.now()) : null;
  const horaCurta = (t: number | string) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: fuso });

  const mudar = (status: StatusPedido, m?: string) =>
    iniciar(async () => {
      const r = await salvando(mudarStatus(p.id, status, m));
      setErro(r.ok ? null : r.erro);
      if (r.ok) setCancelando(false);
    });

  const aguardaPix = p.status === 'novo' && !!p.aguarda_pagamento && !p.pago_em && !!p.codigo;
  const linkPix = () => `${window.location.origin}/c/pedido/pedido/${p.codigo}`;
  return (
    <article className="pedido" data-status={p.status} data-prazo={sit && sit.estado !== 'ok' ? sit.estado : undefined}>
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
        <span className="pedido-numero">#{p.numero}</span>
        <span className={`selo ${p.tipo === 'entrega' ? 'selo-delivery' : 'selo-presencial'}`}>{TIPO_ROTULO[p.tipo]}</span>
        {p.origem === 'cardapio_digital' && <span className="selo selo-pizza" title="Feito pelo cliente no cardápio digital">Online</span>}
        <span className={atrasado ? 'atrasado' : 'dica'} title={atrasado ? (agendado ? 'Passou do horário agendado' : `Passou de ${tempoPreparo} min`) : undefined}>
          {aberto ? tempoDecorrido(new Date(p.criado_em)) : STATUS_ROTULO[p.status]}
        </span>
      </div>
      {aguardaPix && (
        <div className="pix-espera">
          <strong>⏳ Aguardando Pix do cliente</strong>
          <span className="dica">Entra na cozinha sozinho quando o Mercado Pago confirmar.</span>
          <div className="linha" style={{ gap: '0.3rem' }}>
            <button type="button" className="mini" onClick={() => window.open(linkPix(), '_blank', 'noopener')}>Mostrar QR</button>
            <button type="button" className="mini" onClick={() => navigator.clipboard?.writeText(linkPix()).catch(() => {})}>Copiar link</button>
            <button
              type="button"
              className="mini"
              onClick={() => {
                const tel = (p.cliente_telefone ?? '').replace(/\D/g, '');
                const msg = `Olá, ${p.cliente_nome.split(' ')[0]}! Para confirmar seu pedido #${p.numero}, pague o Pix por este link: ${linkPix()}`;
                window.open(`https://wa.me/${tel.length >= 12 ? tel : '55' + tel}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
              }}
            >
              Enviar no WhatsApp
            </button>
          </div>
        </div>
      )}
      {sit && prazo != null && (
        <div className={`selo-prazo ${sit.estado}`} title={`Prometido para ${horaCurta(prazo)}${agendado ? ' (agendado)' : ` (pedido + ${prazoMin} min)`}`}>
          {sit.estado === 'atrasado' ? `⚠ Atrasado ${sit.minutos} min` : sit.estado === 'perto' ? `⏱ Faltam ${sit.minutos} min` : `⏱ Entregar até ${horaCurta(prazo)}`}
          {p.status === 'em_entrega' && p.previsao_chegada ? ` · chega ~${horaCurta(p.previsao_chegada)}` : ''}
        </div>
      )}
      {agendado && (
        <div className="selo-agendado" title={`Pedido feito ${tempoDecorrido(new Date(p.criado_em))}`}>
          ⏰ {p.tipo === 'entrega' ? 'Entregar' : 'Para'} {rotuloHorario(agendado, fuso)}
        </div>
      )}
      <div>
        <strong>{p.cliente_nome}</strong>
        {p.cliente_telefone && <span className="dica"> · {telefone(p.cliente_telefone)}</span>}
        {marca && <span className="dica"> · {marca}</span>}
        {selo && <div className={`qp-selo-cliente`} data-tipo={selo.tipo} title={selo.titulo}>{selo.texto}</div>}
      </div>
      {p.entregador_nome && (p.status === 'em_entrega' || p.status === 'concluido') && (
        <div className="selo-motoboy">🛵 {p.status === 'em_entrega' ? 'Saiu com' : 'Entregue por'} <strong>{p.entregador_nome}</strong>{p.saiu_em ? ` · ${new Date(p.saiu_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}</div>
      )}
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
            {(() => {
              // combo: um bloco por escolha (D-024)
              const blocos = blocosCombo(i.pedido_item_opcoes.map((o) => ({ grupo: o.grupo_nome, nome: o.nome, quantidade: o.quantidade, fracao: o.fracao, passo: o.grupo_id == null && o.opcao_id == null })));
              return blocos ? (
                <ul className="qp-combo">
                  {blocos.map((b, k) => (
                    <li key={k}><strong>{b.titulo}</strong>: {b.itens.join(', ')}</li>
                  ))}
                </ul>
              ) : null;
            })()}
            {i.pedido_item_opcoes.length > 0 && !i.pedido_item_opcoes.some((o) => o.grupo_id == null && o.opcao_id == null) && (
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
      {p.pagamento !== 'online' && (
        <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
          <span className={`selo ${p.pago_em ? 'selo-presencial' : 'selo-cobrar'}`}>{p.pago_em ? '✓ Pago — não cobrar' : '💰 Cobrar na entrega'}</span>
          {aberto && (
            <button
              type="button"
              className="mini"
              disabled={pendente}
              title={p.pago_em ? 'Voltar a cobrar na entrega' : 'O cliente já pagou (ex.: Pix antes). O motoboy vai ver NÃO COBRAR.'}
              onClick={() =>
                iniciar(async () => {
                  const r = await salvando(marcarPago(p.id, !p.pago_em));
                  setErro(r.ok ? null : r.erro);
                })
              }
            >
              {p.pago_em ? 'Desfazer pago' : 'Marcar como pago'}
            </button>
          )}
        </div>
      )}
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
      <div className="linha" style={{ gap: '0.3rem' }}>
        {p.cliente_telefone && (
          <button type="button" className="mini" data-avisado={avisado || undefined} title={`Abre o WhatsApp de ${p.cliente_nome.split(' ')[0]} com a mensagem pronta desta etapa (dá para editar antes de enviar)`} onClick={avisarCliente}>
            {avisado ? '✓ Avisado' : '💬 Avisar cliente'}
          </button>
        )}
        <button type="button" className="mini" title="Imprimir a via da cozinha" disabled={impressao.pendente} onClick={() => impressao.imprimir(() => imprimirPedido(p.id, 'cozinha'))}>
          🖨 Cozinha
        </button>
        <button type="button" className="mini" title="Imprimir a via completa (caixa/entregador)" disabled={impressao.pendente} onClick={() => impressao.imprimir(() => imprimirPedido(p.id, 'pedido'))}>
          🖨 Via do pedido
        </button>
      </div>
      {impressao.aviso && <span className={impressao.aviso.ok ? 'dica' : 'erro'} role="status">{impressao.aviso.texto}</span>}
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
