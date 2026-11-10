'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { cancelarConvite, criarConvite, definirModo, mudarSituacao } from '@/app/equipe-res/actions';
import { salvando } from '@/components/tempo-real';

export type Convite = { codigo: string; nota: string | null; dias_teste: number; criado_em: string; expira_em: string; usado_em: string | null; conta_id: string | null };
export type ContaPlataforma = {
  id: string; nome: string; origem: string; situacao: 'teste' | 'ativa' | 'suspensa'; teste_ate: string | null; pago_ate: string | null; liberada: boolean;
  criado_em: string; responsavel: string | null; telefone: string | null; email: string | null; nota: string | null;
  comercial: { lojas?: string; sistema?: string; pedidos_dia?: string; como_conheceu?: string } | null;
  lojas: { nome: string; cidade: string | null; uf: string | null; pedidos_7d: number; cardapio_aberto: boolean }[] | null;
};

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
const dias = (iso: string | null) => (iso ? Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000) : null);
const fone = (t: string | null) => {
  const d = (t ?? '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : t ?? '';
};

function situacaoTexto(c: ContaPlataforma) {
  if (c.situacao === 'suspensa') return { t: 'Suspensa', tipo: 'pausada' };
  if (!c.liberada) return { t: c.situacao === 'teste' ? 'Teste vencido' : 'Assinatura vencida', tipo: 'pausada' };
  if (c.situacao === 'teste') {
    const d = dias(c.teste_ate);
    return { t: `Teste · ${d != null && d <= 0 ? 'último dia' : `${d} dia(s)`}`, tipo: d != null && d <= 3 ? 'fim' : 'teste' };
  }
  return { t: c.pago_ate ? `Ativa até ${data(c.pago_ate)}` : 'Ativa (sem prazo)', tipo: 'ativa' };
}

export function PainelEquipeRes({ contas, convites, modo, origem }: { contas: ContaPlataforma[]; convites: Convite[]; modo: 'convite' | 'aberto'; origem: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [nota, setNota] = useState('');
  const [diasTeste, setDiasTeste] = useState(14);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'todas' | 'teste' | 'pausadas' | 'ativas'>('todas');
  const fazer = (p: Promise<{ ok: boolean; erro?: string }>, ok: string) =>
    iniciar(async () => {
      const r = await salvando(p as Promise<{ ok: true } | { ok: false; erro: string }>);
      setMsg(r.ok ? { ok: true, t: ok } : { ok: false, t: r.erro });
    });
  const copiar = async (t: string) => {
    try {
      await navigator.clipboard.writeText(t);
      setCopiado(t);
      setTimeout(() => setCopiado(null), 1800);
    } catch {
      /* sem permissão */
    }
  };
  const linkConvite = (c: string) => `${origem}/cadastro?convite=${c}`;
  const lista = contas.filter((c) =>
    filtro === 'todas' ? true : filtro === 'teste' ? c.situacao === 'teste' && c.liberada : filtro === 'pausadas' ? !c.liberada : c.situacao === 'ativa' && c.liberada,
  );
  const n = { teste: contas.filter((c) => c.situacao === 'teste' && c.liberada).length, pausadas: contas.filter((c) => !c.liberada).length, ativas: contas.filter((c) => c.situacao === 'ativa' && c.liberada).length };

  return (
    <div className="grade" style={{ gap: 'var(--e6)' }}>
      <header className="linha" style={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <div className="marca-res" style={{ fontSize: '1.3rem' }}>RES</div>
          <h1 style={{ margin: 'var(--e2) 0 0' }}>Equipe RES</h1>
          <p className="dica" style={{ margin: 0 }}>Convites de cadastro e a situação de cada restaurante.</p>
        </div>
        <Link className="botao" href="/pedidos">Voltar ao painel</Link>
      </header>

      {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}

      <section className="cartao grade">
        <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Convites</h2>
          <div className="qp-visao" role="radiogroup" aria-label="Quem pode se cadastrar">
            <button type="button" role="radio" aria-checked={modo === 'convite'} disabled={pendente} onClick={() => fazer(definirModo('convite'), 'Cadastro só com convite.')}>Só com convite</button>
            <button type="button" role="radio" aria-checked={modo === 'aberto'} disabled={pendente} onClick={() => fazer(definirModo('aberto'), 'Cadastro aberto para todos.')}>Aberto para todos</button>
          </div>
        </div>
        {modo === 'aberto' && <p className="aviso" style={{ margin: 0 }}>Qualquer pessoa com o link cria conta e ganha 14 dias de teste. Deixe aberto só quando a cobrança estiver funcionando.</p>}
        <div className="linha" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <label style={{ flex: '1 1 240px' }}>Para quem (anotação)<input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={200} placeholder="Ex.: Burger do Zé, Blumenau — indicação da LA PIZZA" /></label>
          <label>Dias de teste<select value={diasTeste} onChange={(e) => setDiasTeste(Number(e.target.value))}>{[7, 14, 21, 30].map((d) => <option key={d} value={d}>{d} dias</option>)}</select></label>
          <button
            type="button"
            className="botao-primario"
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                const r = await salvando(criarConvite(nota, diasTeste));
                if (r.ok) {
                  setNota('');
                  await copiar(linkConvite(r.codigo));
                  setMsg({ ok: true, t: `Convite ${r.codigo} criado e link copiado. Vale por 30 dias, uma vez só.` });
                } else setMsg({ ok: false, t: r.erro });
              })
            }
          >
            Criar convite
          </button>
        </div>
        {convites.length > 0 && (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead><tr><th>Código</th><th>Para quem</th><th>Teste</th><th>Situação</th><th /></tr></thead>
              <tbody>
                {convites.map((c) => {
                  const vencido = !c.usado_em && Date.parse(c.expira_em) < Date.now();
                  return (
                    <tr key={c.codigo}>
                      <td><strong style={{ letterSpacing: '0.06em' }}>{c.codigo}</strong></td>
                      <td style={{ whiteSpace: 'normal' }}>{c.nota ?? <span className="dica">—</span>}</td>
                      <td>{c.dias_teste} dias</td>
                      <td>{c.usado_em ? <span className="fin-selo" data-sit="pago">Usado em {data(c.usado_em)}</span> : vencido ? <span className="fin-selo" data-sit="vencido">Vencido</span> : <span className="fin-selo" data-sit="hoje">Vale até {data(c.expira_em)}</span>}</td>
                      <td className="num">
                        {!c.usado_em && !vencido && (
                          <span className="linha" style={{ gap: 'var(--e2)', justifyContent: 'flex-end' }}>
                            <button type="button" className="mini" onClick={() => copiar(linkConvite(c.codigo))}>{copiado === linkConvite(c.codigo) ? 'Copiado ✓' : 'Copiar link'}</button>
                            <a className="botao mini" href={`https://wa.me/?text=${encodeURIComponent(`Seu convite para o RES: ${linkConvite(c.codigo)} (código ${c.codigo})`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                            <button type="button" className="mini dica" disabled={pendente} onClick={() => fazer(cancelarConvite(c.codigo), `Convite ${c.codigo} cancelado.`)}>Cancelar</button>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grade">
        <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Restaurantes ({contas.length})</h2>
          <div className="abas" role="tablist">
            {([['todas', `Todas`], ['teste', `Em teste (${n.teste})`], ['pausadas', `Pausadas (${n.pausadas})`], ['ativas', `Ativas (${n.ativas})`]] as const).map(([k, r]) => (
              <button key={k} type="button" role="tab" aria-selected={filtro === k} onClick={() => setFiltro(k)}>{r}</button>
            ))}
          </div>
        </div>
        {lista.length === 0 && <p className="dica">Nenhum restaurante aqui.</p>}
        {lista.map((c) => {
          const s = situacaoTexto(c);
          const lojas = c.lojas ?? [];
          const zap = (c.telefone ?? '').replace(/\D/g, '');
          return (
            <article key={c.id} className="cartao eq-conta">
              <div className="eq-conta-topo">
                <div className="grade" style={{ gap: 2 }}>
                  <strong style={{ fontSize: 'var(--t-lg)' }}>{c.nome}</strong>
                  <span className="dica">
                    {lojas.map((l) => `${l.nome}${l.cidade ? ` (${l.cidade}${l.uf ? `/${l.uf}` : ''})` : ''}`).join(', ') || 'sem loja'} · desde {data(c.criado_em)}{c.origem === 'cadastro' ? ' · pelo cadastro' : ''}
                  </span>
                </div>
                <span className="faixa-conta eq-situacao" data-tipo={s.tipo}>{s.t}</span>
              </div>
              <div className="eq-conta-dados">
                <span><b>Responsável</b>{c.responsavel ?? '—'}</span>
                <span><b>Contato</b>{zap ? <a href={`https://wa.me/${zap}`} target="_blank" rel="noopener noreferrer">{fone(c.telefone)}</a> : '—'}{c.email ? <span className="dica"> · {c.email}</span> : null}</span>
                <span><b>Uso</b>{lojas.reduce((t, l) => t + Number(l.pedidos_7d), 0)} pedidos em 7 dias · cardápio {lojas.some((l) => l.cardapio_aberto) ? 'aberto' : 'fechado'}</span>
                {c.comercial && Object.keys(c.comercial).length > 0 && (
                  <span><b>Perfil</b>{[c.comercial.lojas && `${c.comercial.lojas} loja(s)`, c.comercial.pedidos_dia && `${c.comercial.pedidos_dia} pedidos/dia`, c.comercial.sistema && `usa ${c.comercial.sistema}`, c.comercial.como_conheceu && `veio por ${c.comercial.como_conheceu}`].filter(Boolean).join(' · ')}</span>
                )}
                {c.nota && <span><b>Anotação</b>{c.nota}</span>}
              </div>
              <div className="linha" style={{ gap: 'var(--e2)', flexWrap: 'wrap' }}>
                <button type="button" className="mini botao-primario" disabled={pendente} onClick={() => { const n = prompt('Ativar por 30 dias. Anotação do pagamento (opcional), ex.: Pix de novembro', ''); if (n === null) return; fazer(mudarSituacao(c.id, 'ativar', 30, n || null), `${c.nome}: ativa por 30 dias.`); }}>Ativar 30 dias</button>
                <button type="button" className="mini" disabled={pendente} onClick={() => fazer(mudarSituacao(c.id, 'ativar', null, null), `${c.nome}: ativa sem prazo.`)}>Ativar sem prazo</button>
                <button type="button" className="mini" disabled={pendente} onClick={() => fazer(mudarSituacao(c.id, 'estender_teste', 7, null), `${c.nome}: +7 dias de teste.`)}>+7 dias de teste</button>
                {c.situacao !== 'suspensa' && <button type="button" className="mini dica" disabled={pendente} onClick={() => fazer(mudarSituacao(c.id, 'suspender', null, null), `${c.nome}: suspensa (novos pedidos pausados).`)}>Suspender</button>}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
