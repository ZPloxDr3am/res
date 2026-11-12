'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { SEGMENTOS, reais } from '@res/core';
import { cancelarCampanha, contarPublico, criarCampanha, definirModelo, enviarTudo, marcarEnvio, salvarAutomacao } from '@/app/(painel)/turbo/actions';
import { AbaWhatsapp, type StatusWhatsapp } from '@/components/turbo/whatsapp';

type Tipo = 'boas_vindas' | 'sumido' | 'ciclo' | 'carrinho' | 'avaliacao';
export interface Automacao { id: string; tipo: Tipo; ativo: boolean; mensagem: string; cupom: string | null; config: Record<string, number>; enviados: number; conversoes: number; receita: number }
export interface Campanha { id: string; nome: string; status: string; publico: Record<string, unknown>; mensagem: string; cupom: string | null; janela_dias: number; agendada_para: string | null; gerada_em: string | null; gerados: number; enviados: number; conversoes: number; receita: number }
export interface DadosTurbo { fila: number; enviados: number; conversoes: number; receita: number; automacoes: Automacao[]; campanhas: Campanha[]; cupons: { codigo: string; descricao: string | null }[]; tem_avaliacao: boolean }
export interface EnvioFila { id: string; nome: string | null; telefone: string; mensagem: string; cupom: string | null; criado_em: string; origem: string; oficial?: boolean; modelo?: string | null; falhou?: boolean; erro?: string | null }
type NumCanal = { enviados: number; conversoes: number; receita: number; entregues?: number; lidas?: number; falhas?: number };
export interface Canais { manual: NumCanal; oficial: NumCanal; conectado: boolean }
export interface UsoModelos { automacoes: Record<string, string>; campanhas: Record<string, string>; fila_automatica: number }
export interface Safra { mes: string; clientes: number; ltv: number[] | null; ativos: number[] | null }

const MODELOS: { tipo: Tipo; titulo: string; quando: string; padrao: string; config?: { chave: string; rotulo: string; padrao: number } }[] = [
  { tipo: 'carrinho', titulo: '🛒 Carrinho abandonado', quando: 'Deu o telefone no cardápio e não pediu', padrao: 'Oi {nome}! Vi que você montou um pedido e não finalizou. Ficou alguma dúvida? Seu carrinho continua aqui: {link}', config: { chave: 'minutos', rotulo: 'Depois de quantos minutos', padrao: 20 } },
  { tipo: 'boas_vindas', titulo: '👋 Boas-vindas', quando: '1 h depois do 1º pedido concluído', padrao: 'Oi {nome}, obrigado pelo seu primeiro pedido na {loja}! Na próxima, use o cupom {cupom}: {link}' },
  { tipo: 'avaliacao', titulo: '⭐ Pedir avaliação no Google', quando: '1 a 6 h depois do pedido concluído (1 vez a cada 60 dias)', padrao: 'Oi {nome}! Gostou do pedido? Sua avaliação ajuda muito a {loja}: {avaliacao}' },
  { tipo: 'ciclo', titulo: '🔁 Passou do costume', quando: 'Cliente de 3+ pedidos que passou 1,5× do intervalo de sempre', padrao: 'Oi {nome}! Bateu a vontade de {favorito}? Hoje tem cupom {cupom} para você: {link}' },
  { tipo: 'sumido', titulo: '💤 Cliente sumido', quando: 'Sem pedir há X dias', padrao: 'Oi {nome}, que saudade! Volta pra gente com o cupom {cupom}: {link}', config: { chave: 'dias', rotulo: 'Sem pedir há quantos dias', padrao: 30 } },
];
const ABAS = [['resultados', 'Resultados'], ['fila', 'Fila de envio'], ['automacoes', 'Automações'], ['campanhas', 'Campanhas'], ['safras', 'Safras e LTV'], ['whatsapp', 'WhatsApp oficial']] as const;
type Aba = (typeof ABAS)[number][0];
const VARIAVEIS = ['{nome}', '{loja}', '{cupom}', '{link}', '{favorito}', '{avaliacao}'];
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '—');
const wa = (tel: string, msg: string) => `https://wa.me/${tel.length <= 11 ? '55' + tel : tel}?text=${encodeURIComponent(msg)}`;

/** Turbo-Vendas (D-096): automações, fila de WhatsApp, campanhas, resultados e safras. */
export function TurboVendas({ d, fila, safras, abaInicial, wa = null, uso = null, canais = null }: { d: DadosTurbo; fila: EnvioFila[]; safras: Safra[]; abaInicial?: string; wa?: StatusWhatsapp | null; uso?: UsoModelos | null; canais?: Canais | null }) {
  const aprovados = wa?.conectado ? wa.modelos.filter((m) => m.status === 'aprovado') : [];
  const [aba, setAba] = useState<Aba>((ABAS.find(([k]) => k === abaInicial)?.[0] as Aba) ?? (fila.length ? 'fila' : 'resultados'));
  return (
    <div className="grade">
      <div className="abas" role="tablist">
        {ABAS.map(([k, r]) => (
          <button key={k} type="button" role="tab" aria-selected={aba === k} onClick={() => setAba(k)}>
            {r}{k === 'fila' && fila.length > 0 ? ` (${fila.length})` : ''}
          </button>
        ))}
      </div>
      {aba === 'resultados' && <Resultados d={d} canais={canais} />}
      {aba === 'fila' && <Fila fila={fila} automatica={wa?.conectado ? uso?.fila_automatica ?? 0 : null} />}
      {aba === 'automacoes' && <Automacoes d={d} aprovados={aprovados} uso={uso} />}
      {aba === 'campanhas' && <Campanhas d={d} aprovados={aprovados} uso={uso} />}
      {aba === 'safras' && <Safras safras={safras} />}
      {aba === 'whatsapp' && <AbaWhatsapp wa={wa} />}
    </div>
  );
}

function Resultados({ d, canais }: { d: DadosTurbo; canais: Canais | null }) {
  const linhas = [
    ...d.automacoes.map((a) => ({ k: a.id, nome: MODELOS.find((m) => m.tipo === a.tipo)?.titulo ?? a.tipo, enviados: a.enviados, conv: a.conversoes, receita: Number(a.receita), extra: a.ativo ? 'ligada' : 'desligada' })),
    ...d.campanhas.map((c) => ({ k: c.id, nome: `📣 ${c.nome}`, enviados: c.enviados, conv: c.conversoes, receita: Number(c.receita), extra: c.status })),
  ];
  return (
    <div className="grade">
      <div className="kpis">
        <div className="cartao kpi"><span className="dica">Mensagens enviadas (30 dias)</span><span className="kpi-valor">{d.enviados}</span><span className="kpi-frase">{d.fila} esperando na fila</span></div>
        <div className="cartao kpi"><span className="dica">Voltaram e compraram</span><span className="kpi-valor">{d.conversoes}</span><span className="kpi-frase">{pct(d.conversoes, d.enviados)} das mensagens</span></div>
        <div className="cartao kpi"><span className="dica">Vendas pelas mensagens</span><span className="kpi-valor">{reais(Number(d.receita))}</span><span className="kpi-frase">pedido concluído até 5 dias depois (ajustável)</span></div>
      </div>
      {canais && (
        <section className="cartao grade">
          <h2 style={{ margin: 0 }}>Por canal</h2>
          <table className="mod-matriz">
            <thead><tr><th>Canal</th><th>Enviadas</th><th>Entregues</th><th>Lidas</th><th>Falhas</th><th>Compraram</th><th>Vendas</th></tr></thead>
            <tbody>
              <tr><td>📱 Manual (toque e envia)</td><td>{canais.manual.enviados}</td><td>—</td><td>—</td><td>—</td><td>{canais.manual.conversoes}</td><td>{reais(Number(canais.manual.receita))}</td></tr>
              <tr><td>⚡ WhatsApp oficial{canais.conectado ? '' : ' (não conectado)'}</td><td>{canais.oficial.enviados}</td><td>{canais.oficial.entregues ?? 0}</td><td>{canais.oficial.lidas ?? 0}</td><td>{canais.oficial.falhas ?? 0}</td><td>{canais.oficial.conversoes}</td><td>{reais(Number(canais.oficial.receita))}</td></tr>
            </tbody>
          </table>
          <p className="dica" style={{ margin: 0 }}>Entregue e lida só existem no oficial (a Meta avisa). O que falha no oficial volta para a fila para enviar à mão.</p>
        </section>
      )}
      <section className="cartao grade">
        <h2 style={{ margin: 0 }}>Por automação e campanha</h2>
        {linhas.length === 0 ? <p className="dica" style={{ margin: 0 }}>Ligue uma automação ou crie uma campanha para começar.</p> : (
          <table className="mod-matriz">
            <thead><tr><th>Ação</th><th>Enviadas</th><th>Compraram</th><th>Conversão</th><th>Vendas</th></tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.k}><td>{l.nome}<br /><span className="dica">{l.extra}</span></td><td>{l.enviados}</td><td>{l.conv}</td><td>{pct(l.conv, l.enviados)}</td><td>{reais(l.receita)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="dica" style={{ margin: 0 }}>Uma compra conta para a última mensagem que o cliente recebeu antes de pedir, se o pedido foi concluído dentro da janela.</p>
      </section>
    </div>
  );
}

function Fila({ fila, automatica }: { fila: EnvioFila[]; automatica: number | null }) {
  const [resEnvio, setResEnvio] = useState<string | null>(null);
  const router = useRouter();
  const [feitos, setFeitos] = useState<Record<string, string>>({});
  const [pendente, iniciar] = useTransition();
  const marcar = (id: string, acao: 'enviado' | 'pular' | 'sair') =>
    iniciar(async () => {
      const r = await marcarEnvio(id, acao);
      setFeitos((f) => ({ ...f, [id]: r.ok ? acao : `erro: ${r.erro}` }));
    });
  const restantes = fila.filter((e) => !feitos[e.id] || feitos[e.id]!.startsWith('erro'));
  return (
    <section className="grade">
      <p className="dica" style={{ margin: 0 }}>
        Toque em <b>Enviar no WhatsApp</b>: a conversa abre com a mensagem pronta, é só apertar enviar. No máximo 1 mensagem por cliente a cada 2 dias. Quando o WhatsApp oficial for ligado, esta fila sai sozinha.
      </p>
      {automatica != null && (
        <div className="cartao linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span><b>{automatica}</b> mensagem(ns) com modelo aprovado podem sair pelo WhatsApp oficial agora. As sem modelo continuam aqui embaixo para envio manual.</span>
          <button type="button" className="botao-primario" disabled={pendente || automatica === 0} onClick={() => iniciar(async () => {
            const r = await enviarTudo();
            setResEnvio(r.ok ? `${r.enviados} enviada(s)${r.falhas ? `, ${r.falhas} falha(s)` : ''}.` : r.erro);
            router.refresh();
          })}>⚡ Enviar tudo</button>
          {resEnvio && <span className="dica" role="status">{resEnvio}</span>}
        </div>
      )}
      {restantes.length === 0 ? (
        <p className="cartao dica" style={{ margin: 0 }}>Fila vazia. As automações colocam clientes aqui a cada 10 minutos. <button type="button" className="mini" onClick={() => router.refresh()}>Atualizar</button></p>
      ) : (
        restantes.map((e) => (
          <article key={e.id} className="cartao turbo-envio">
            <div className="linha" style={{ justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span><strong>{e.nome ?? 'Cliente'}</strong> <span className="dica">· {e.telefone} · {MODELOS.find((m) => m.tipo === e.origem)?.titulo ?? `📣 ${e.origem}`}</span></span>
              {e.falhou ? <span className="turbo-selo" data-tipo="erro" title={e.erro ?? ''}>Falhou no oficial: envie à mão{e.erro ? ` (${e.erro})` : ''}</span>
                : e.oficial ? <span className="turbo-selo" data-tipo="oficial">⚡ Sai pelo oficial ({e.modelo})</span> : null}
              {feitos[e.id]?.startsWith('erro') && <span className="erro">{feitos[e.id]}</span>}
            </div>
            <p className="turbo-msg">{e.mensagem}</p>
            <div className="linha" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>
              <a className="botao-primario" href={wa(e.telefone, e.mensagem)} target="_blank" rel="noopener noreferrer" onClick={() => marcar(e.id, 'enviado')}>💬 Enviar no WhatsApp</a>
              <button type="button" className="botao" disabled={pendente} onClick={() => marcar(e.id, 'pular')}>Pular</button>
              <button type="button" className="mini dica" disabled={pendente} onClick={() => marcar(e.id, 'sair')} title="O cliente pediu para não receber mais (vale para o grupo todo)">Pediu para sair</button>
            </div>
          </article>
        ))
      )}
    </section>
  );
}

function Automacoes({ d, aprovados, uso }: { d: DadosTurbo; aprovados: StatusWhatsapp['modelos']; uso: UsoModelos | null }) {
  return (
    <div className="grade">
      <p className="dica" style={{ margin: 0 }}>
        Variáveis: {VARIAVEIS.map((v) => <code key={v} style={{ marginRight: '0.4rem' }}>{v}</code>)}. O cupom precisa existir em <a href="/promocoes">Promoções → Cupons</a>.
      </p>
      <div className="turbo-grade">
        {MODELOS.map((m) => <CartaoAutomacao key={m.tipo} m={m} a={d.automacoes.find((x) => x.tipo === m.tipo)} cupons={d.cupons} semAvaliacao={m.tipo === 'avaliacao' && !d.tem_avaliacao} aprovados={aprovados} modeloAtual={uso?.automacoes?.[m.tipo] ?? ''} />)}
      </div>
    </div>
  );
}

function CartaoAutomacao({ m, a, cupons, semAvaliacao, aprovados, modeloAtual }: { m: (typeof MODELOS)[number]; a?: Automacao; cupons: DadosTurbo['cupons']; semAvaliacao: boolean; aprovados: StatusWhatsapp['modelos']; modeloAtual: string }) {
  const [modelo, setModelo] = useState(modeloAtual);
  const [ativo, setAtivo] = useState(a?.ativo ?? false);
  const [mensagem, setMensagem] = useState(a?.mensagem ?? m.padrao);
  const [cupom, setCupom] = useState(a?.cupom ?? '');
  const [valor, setValor] = useState<number>(m.config ? Number(a?.config?.[m.config.chave] ?? m.config.padrao) : 0);
  const [janela, setJanela] = useState<number>(Number(a?.config?.janela_dias ?? 5));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const salvar = (novoAtivo: boolean) =>
    iniciar(async () => {
      const config: Record<string, number> = { janela_dias: janela };
      if (m.config) config[m.config.chave] = valor;
      const r = await salvarAutomacao({ tipo: m.tipo, ativo: novoAtivo, mensagem, cupom, config });
      if (r.ok) setAtivo(novoAtivo);
      setMsg(r.ok ? { ok: true, t: novoAtivo ? 'Ligada ✓' : 'Salva (desligada)' } : { ok: false, t: r.erro });
    });
  return (
    <article className="cartao grade turbo-auto" data-ativo={ativo || undefined}>
      <div className="linha" style={{ justifyContent: 'space-between', gap: '0.5rem' }}>
        <div><h3 style={{ margin: 0 }}>{m.titulo}</h3><span className="dica">{m.quando}</span></div>
        <label className="check"><input type="checkbox" checked={ativo} disabled={pendente} onChange={(e) => salvar(e.target.checked)} /> {ativo ? 'Ligada' : 'Desligada'}</label>
      </div>
      {semAvaliacao && <p className="erro" style={{ margin: 0 }}>Cadastre o link de avaliação do Google em Ajustes → Aplicativos.</p>}
      <textarea rows={3} maxLength={700} value={mensagem} onChange={(e) => setMensagem(e.target.value)} aria-label={`Mensagem de ${m.titulo}`} />
      <div className="cad-2">
        <label>Cupom <span className="dica">(opcional)</span>
          <select value={cupom} onChange={(e) => setCupom(e.target.value)}>
            <option value="">Sem cupom</option>
            {cupons.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo}{c.descricao ? ` · ${c.descricao}` : ''}</option>)}
          </select>
        </label>
        {m.config ? (
          <label>{m.config.rotulo}<input type="number" min={1} max={365} value={valor} onChange={(e) => setValor(Number(e.target.value) || m.config!.padrao)} /></label>
        ) : (
          <label>Conta venda até (dias)<input type="number" min={1} max={30} value={janela} onChange={(e) => setJanela(Number(e.target.value) || 5)} /></label>
        )}
      </div>
      {a && aprovados.length > 0 && (
        <label>Como enviar <span className="dica">(com modelo, sai pelo oficial com o texto do modelo; sem, fica na fila manual)</span>
          <select value={modelo} disabled={pendente} onChange={(e) => { const v = e.target.value; setModelo(v); iniciar(async () => { const r = await definirModelo('automacao', a.id, v || null); setMsg(r.ok ? { ok: true, t: v ? 'Modelo escolhido ✓' : 'Sem modelo: fila manual' } : { ok: false, t: r.erro }); }); }}>
            <option value="">📱 Fila manual (toque e envia)</option>
            {aprovados.map((x) => <option key={x.id} value={x.id}>⚡ WhatsApp oficial · modelo {x.nome}</option>)}
          </select>
        </label>
      )}
      <div className="linha" style={{ gap: '0.5rem', alignItems: 'center' }}>
        <button type="button" className="botao" disabled={pendente} onClick={() => salvar(ativo)}>Salvar</button>
        {a && <span className="dica">30 dias: {a.enviados} enviadas · {a.conversoes} compraram · {reais(Number(a.receita))}</span>}
        {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.t}</span>}
      </div>
    </article>
  );
}

function Campanhas({ d, aprovados, uso }: { d: DadosTurbo; aprovados: StatusWhatsapp['modelos']; uso: UsoModelos | null }) {
  const [nome, setNome] = useState('');
  const [segs, setSegs] = useState<string[]>([]);
  const [diasMin, setDiasMin] = useState('');
  const [gastoMin, setGastoMin] = useState('');
  const [mensagem, setMensagem] = useState('Oi {nome}! Hoje na {loja} tem cupom {cupom} só para você: {link}');
  const [cupom, setCupom] = useState('');
  const [janela, setJanela] = useState(5);
  const [quando, setQuando] = useState('');
  const [modeloNovo, setModeloNovo] = useState('');
  const [publico, setPublico] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const filtro = () => ({ segmentos: segs, ...(diasMin ? { dias_min: Number(diasMin) } : {}), ...(gastoMin ? { gasto_min: Number(gastoMin.replace(',', '.')) } : {}) });
  return (
    <div className="grade">
      <section className="cartao grade">
        <h2 style={{ margin: 0 }}>Nova campanha</h2>
        <label>Nome<input value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Sexta da pizza" /></label>
        <div className="grade" style={{ gap: '0.3rem' }}>
          <span>Para quem <span className="dica">(nenhum marcado = todos com pedido)</span></span>
          <div className="qp-filtros">
            {SEGMENTOS.map((s) => (
              <button key={s.id} type="button" className="qp-chip" aria-pressed={segs.includes(s.id)} title={s.regra}
                onClick={() => { setPublico(null); setSegs((x) => (x.includes(s.id) ? x.filter((y) => y !== s.id) : [...x, s.id])); }}>{s.emoji} {s.rotulo}</button>
            ))}
          </div>
        </div>
        <div className="cad-2">
          <label>Sem pedir há pelo menos (dias)<input type="number" min={0} value={diasMin} onChange={(e) => { setPublico(null); setDiasMin(e.target.value); }} /></label>
          <label>Gastou ao menos (R$)<input inputMode="decimal" value={gastoMin} onChange={(e) => { setPublico(null); setGastoMin(e.target.value); }} /></label>
        </div>
        <div className="linha" style={{ gap: '0.5rem', alignItems: 'center' }}>
          <button type="button" className="mini" disabled={pendente} onClick={() => iniciar(async () => setPublico(await contarPublico(filtro())))}>Contar clientes</button>
          {publico != null && <span className="dica">{publico} cliente(s) (quem pediu para sair fica de fora)</span>}
        </div>
        <label>Mensagem<textarea rows={3} maxLength={700} value={mensagem} onChange={(e) => setMensagem(e.target.value)} /></label>
        <div className="cad-2">
          <label>Cupom
            <select value={cupom} onChange={(e) => setCupom(e.target.value)}>
              <option value="">Sem cupom</option>
              {d.cupons.map((c) => <option key={c.codigo} value={c.codigo}>{c.codigo}</option>)}
            </select>
          </label>
          <label>Conta venda até (dias)<input type="number" min={1} max={30} value={janela} onChange={(e) => setJanela(Number(e.target.value) || 5)} /></label>
        </div>
        <label>Quando <span className="dica">(vazio = agora)</span><input type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} /></label>
        {aprovados.length > 0 && (
          <label>Como enviar
            <select value={modeloNovo} onChange={(e) => setModeloNovo(e.target.value)}>
              <option value="">📱 Fila manual (toque e envia)</option>
              {aprovados.map((x) => <option key={x.id} value={x.id}>⚡ WhatsApp oficial · modelo {x.nome}</option>)}
            </select>
            <span className="dica">Com modelo, o texto enviado é o do modelo aprovado (a Meta exige). Quem falhar no oficial volta para a fila manual.</span>
          </label>
        )}
        {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}
        <div>
          <button type="button" className="botao-primario" disabled={pendente || nome.trim().length < 2} onClick={() => iniciar(async () => {
            const r = await criarCampanha({ nome, publico: filtro(), mensagem, cupom, janela, quando: quando ? new Date(quando).toISOString() : null, modelo: modeloNovo || null });
            setMsg(r.ok ? { ok: true, t: quando ? 'Campanha agendada ✓' : `${r.gerados} mensagem(ns) na fila ✓` } : { ok: false, t: r.erro });
            if (r.ok) setNome('');
          })}>{quando ? 'Agendar campanha' : 'Gerar fila agora'}</button>
        </div>
      </section>
      {d.campanhas.length > 0 && (
        <section className="cartao grade">
          <h2 style={{ margin: 0 }}>Campanhas</h2>
          <table className="mod-matriz">
            <thead><tr><th>Campanha</th><th>Fila</th><th>Enviadas</th><th>Compraram</th><th>Vendas</th><th>WhatsApp</th><th /></tr></thead>
            <tbody>
              {d.campanhas.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.nome}</strong><br /><span className="dica">{c.status === 'agendada' && c.agendada_para ? `agendada ${new Date(c.agendada_para).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}` : c.status}{c.cupom ? ` · ${c.cupom}` : ''}</span></td>
                  <td>{c.gerados}</td><td>{c.enviados}</td><td>{c.conversoes}</td><td>{reais(Number(c.receita))}</td>
                  <td>
                    {aprovados.length > 0 && c.status !== 'cancelada' && (
                      <select className="mini" value={uso?.campanhas?.[c.id] ?? ''} disabled={pendente} aria-label={`Modelo da campanha ${c.nome}`}
                        onChange={(e) => { const v = e.target.value; iniciar(async () => { await definirModelo('campanha', c.id, v || null); }); }}>
                        <option value="">Fila manual</option>
                        {aprovados.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                      </select>
                    )}
                  </td>
                  <td>{(c.status === 'agendada' || c.gerados > c.enviados) && c.status !== 'cancelada' && (
                    <button type="button" className="mini" disabled={pendente} onClick={() => iniciar(async () => { await cancelarCampanha(c.id); })}>Cancelar</button>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function Safras({ safras }: { safras: Safra[] }) {
  const meses = Math.max(1, ...safras.map((s) => s.ltv?.length ?? 0));
  return (
    <section className="cartao grade" style={{ overflowX: 'auto' }}>
      <div>
        <h2 style={{ margin: 0 }}>Safras de clientes e LTV</h2>
        <p className="dica" style={{ margin: 0 }}>Cada linha é o mês do 1º pedido. Em cada coluna, quanto cada cliente daquela safra já gastou em média (LTV) e quantos % ainda pediram naquele mês.</p>
      </div>
      {safras.length === 0 ? <p className="dica" style={{ margin: 0 }}>Ainda sem pedidos com cliente identificado.</p> : (
        <table className="mod-matriz turbo-safras">
          <thead><tr><th>Safra</th><th>Clientes</th>{Array.from({ length: meses }, (_, k) => <th key={k}>Mês {k}</th>)}</tr></thead>
          <tbody>
            {safras.map((s) => (
              <tr key={s.mes}>
                <td>{s.mes.split('-').reverse().join('/')}</td>
                <td>{s.clientes}</td>
                {Array.from({ length: meses }, (_, k) => {
                  const v = s.ltv?.[k];
                  const at = s.ativos?.[k];
                  const p = at != null && s.clientes ? Math.round((at / s.clientes) * 100) : null;
                  return <td key={k} style={p != null ? { background: `color-mix(in srgb, var(--primaria) ${Math.min(p, 100) * 0.6}%, transparent)` } : undefined}>{v != null ? <>{reais(Number(v))}<br /><span className="dica">{p}%</span></> : ''}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
