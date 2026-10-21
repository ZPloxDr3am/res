'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { formatarReais, PAGAMENTO_ROTULO, tempoDecorrido, totalContagem, type Contagem, type FormaPagamento } from '@res/core';
import { abrirCaixa, fecharCaixa, movimentar, salvarCaixa, vincularSemCaixa } from '@/app/(painel)/caixa/actions';
import { salvando } from '@/components/tempo-real';
import { Calculadora } from '@/components/caixa/calculadora';
import { ALERTA_HORAS, dataHora, horasAberto, r$, type CaixaLista, type MeusCaixas, type ResumoCaixa } from '@/lib/caixa';

type Msg = { ok: boolean; texto: string } | null;
const FORMAS_MAQUININHA: FormaPagamento[] = ['pix', 'cartao_credito', 'cartao_debito', 'vale_refeicao'];

const lerCentavos = (t: string): number => {
  const s = t.trim().replace(/\s|R\$/g, '');
  if (!s) return 0;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};

export type Historico = { id: string; numero: number; caixa: string; aberto_em: string; fechado_em: string; operador: string | null; diferenca: number; temObs: boolean };
export type CadastroCaixa = { id: string; nome: string; ativo: boolean; operadores: string[] };
export type Membro = { userId: string; nome: string; papel: string; usuario: string | null };

export function PainelCaixa({
  meus,
  resumos,
  historico,
  cadastro,
  membros,
}: {
  meus: MeusCaixas;
  resumos: Record<string, ResumoCaixa>;
  historico: Historico[];
  cadastro: CadastroCaixa[] | null;
  membros: Membro[];
}) {
  const abertos = meus.caixas.filter((c) => c.sessao);
  return (
    <div className="grade">
      <div className="grade" style={{ gap: '0.15rem' }}>
        <h1 style={{ margin: 0 }}>Caixa</h1>
        <span className="dica">Abra no começo do expediente com o troco contado; os pedidos concluídos entram sozinhos; no fim, conte e feche.</span>
      </div>

      {meus.sem_caixa > 0 && (
        <div className="aviso grade" style={{ gap: '0.4rem' }}>
          <span>
            <strong>{meus.sem_caixa} pedido(s) concluído(s) nas últimas 24 h ficaram fora do caixa</strong> (foram concluídos sem nenhum caixa aberto).
            {abertos.length === 0 && ' Abra um caixa para trazê-los.'}
          </span>
          {abertos.filter((c) => c.pode_operar).map((c) => <TrazerSemCaixa key={c.id} caixa={c} />)}
        </div>
      )}

      {meus.caixas.length === 0 && <p className="cartao dica">Nenhum caixa ativo nesta loja.{meus.cadastra ? ' Cadastre um abaixo.' : ''}</p>}
      <div className="caixas-grade">
        {meus.caixas.map((c) => (
          <CartaoCaixa key={c.id} caixa={c} resumo={c.sessao ? resumos[c.sessao.id] ?? null : null} />
        ))}
      </div>

      <section className="cartao grade" style={{ gap: '0.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Fechamentos recentes</h2>
        {historico.length === 0 ? (
          <p className="dica" style={{ margin: 0 }}>Nenhum caixa fechado ainda.</p>
        ) : (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr><th>Nº</th><th>Caixa</th><th>Aberto</th><th>Fechado</th><th>Quem fechou</th><th className="num">Resultado</th><th></th></tr>
              </thead>
              <tbody>
                {historico.map((h) => (
                  <tr key={h.id}>
                    <td>#{h.numero}</td>
                    <td>{h.caixa}</td>
                    <td>{dataHora(h.aberto_em)}</td>
                    <td>{dataHora(h.fechado_em)}</td>
                    <td>{h.operador ?? '—'}</td>
                    <td className="num"><Diferenca valor={h.diferenca} />{h.temObs && <span className="dica" title="Tem observação"> ✎</span>}</td>
                    <td><Link href={`/caixa/${h.id}`}>Relatório</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {cadastro && <Cadastro caixas={cadastro} membros={membros} />}
    </div>
  );
}

function Diferenca({ valor }: { valor: number }) {
  const c = Math.round(valor * 100);
  if (c === 0) return <span className="var neutra">✓ conferiu</span>;
  return <span className={`var ${c > 0 ? 'boa' : 'ruim'}`}>{c > 0 ? 'sobrou' : 'faltou'} {formatarReais(Math.abs(c))}</span>;
}

function TrazerSemCaixa({ caixa }: { caixa: CaixaLista }) {
  const [pendente, iniciar] = useTransition();
  const [m, setM] = useState<Msg>(null);
  return (
    <div className="linha" style={{ alignItems: 'center', gap: '0.5rem' }}>
      <button
        type="button"
        className="mini botao-primario"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await salvando(vincularSemCaixa(caixa.sessao!.id));
            setM(r.ok ? { ok: true, texto: `${r.n} pedido(s) trazido(s) para o ${caixa.nome}.` } : { ok: false, texto: r.erro });
          })
        }
      >
        Trazer para o {caixa.nome}
      </button>
      {m && <span className={m.ok ? 'dica' : 'erro'}>{m.texto}</span>}
    </div>
  );
}

function CartaoCaixa({ caixa, resumo }: { caixa: CaixaLista; resumo: ResumoCaixa | null }) {
  const [modo, setModo] = useState<'nada' | 'abrir' | 'sangria' | 'suprimento' | 'fechar'>('nada');
  const [m, setM] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();
  const aberto = !!caixa.sessao;
  const velho = caixa.sessao && horasAberto(caixa.sessao.aberto_em) > ALERTA_HORAS;

  const fazer = (acao: () => Promise<{ ok: boolean; erro?: string }>, texto: string) =>
    iniciar(async () => {
      const r = await salvando(acao());
      setM(r.ok ? { ok: true, texto } : { ok: false, texto: r.erro ?? 'Erro.' });
      if (r.ok) setModo('nada');
    });

  return (
    <article className="cartao grade caixa-cartao" data-aberto={aberto ? 'sim' : undefined} style={{ gap: '0.6rem' }}>
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{caixa.nome}</h2>
        <span className={`pub-status ${aberto ? 'aberto' : 'fechado'}`}>{aberto ? `Aberto · #${caixa.sessao!.numero}` : 'Fechado'}</span>
      </div>
      <span className="dica">
        {caixa.operadores.length ? `Opera: ${caixa.operadores.join(', ')}` : 'Qualquer pessoa da equipe com acesso ao caixa pode operar.'}
      </span>

      {aberto && (
        <span className="dica">
          Aberto por <strong>{caixa.sessao!.aberto_por ?? '—'}</strong> {tempoDecorrido(new Date(caixa.sessao!.aberto_em))} ({dataHora(caixa.sessao!.aberto_em)})
        </span>
      )}
      {velho && <p className="aviso">Este caixa está aberto há mais de {ALERTA_HORAS} horas. Feche ao fim de cada expediente para o relatório bater com o dia.</p>}

      {aberto && resumo && <ResumoAberto r={resumo} />}

      {!caixa.pode_operar && <p className="dica" style={{ margin: 0 }}>Você não opera este caixa.</p>}

      {caixa.pode_operar && modo === 'nada' && (
        <div className="linha" style={{ gap: '0.4rem' }}>
          {!aberto && <button type="button" className="botao-primario" onClick={() => { setModo('abrir'); setM(null); }}>Abrir caixa</button>}
          {aberto && (
            <>
              <button type="button" onClick={() => { setModo('sangria'); setM(null); }}>Sangria (retirar)</button>
              <button type="button" onClick={() => { setModo('suprimento'); setM(null); }}>Suprimento (reforçar)</button>
              <button type="button" className="botao-primario" onClick={() => { setModo('fechar'); setM(null); }}>Fechar caixa</button>
            </>
          )}
        </div>
      )}

      {modo === 'abrir' && <Abrir pendente={pendente} cancelar={() => setModo('nada')} enviar={(c, v) => fazer(() => abrirCaixa(caixa.id, c, v), 'Caixa aberto. Bom expediente!')} />}
      {(modo === 'sangria' || modo === 'suprimento') && caixa.sessao && (
        <Movimento tipo={modo} pendente={pendente} cancelar={() => setModo('nada')}
          enviar={(v, d) => fazer(() => movimentar(caixa.sessao!.id, modo, v, d), modo === 'sangria' ? 'Sangria registrada.' : 'Suprimento registrado.')} />
      )}
      {modo === 'fechar' && caixa.sessao && (
        <Fechar
          pendente={pendente}
          cancelar={() => setModo('nada')}
          enviar={(c, inf, obs) =>
            iniciar(async () => {
              const r = await salvando(fecharCaixa(caixa.sessao!.id, c, inf, obs));
              if (!r.ok) return setM({ ok: false, texto: r.erro });
              window.location.href = `/caixa/${caixa.sessao!.id}?fechado=1`;
            })
          }
        />
      )}
      {m && <p className={m.ok ? 'dica' : 'erro'} role={m.ok ? 'status' : 'alert'} style={{ margin: 0 }}>{m.texto}</p>}
    </article>
  );
}

function ResumoAberto({ r }: { r: ResumoCaixa }) {
  const formas = r.formas.filter((f) => f.quantidade > 0 || f.forma === 'dinheiro');
  return (
    <div className="grade" style={{ gap: '0.35rem' }}>
      <table className="tabela">
        <thead>
          <tr><th>Forma</th><th className="num">Pedidos</th>{r.ve_valores && <><th className="num">Vendas</th><th className="num">Deve ter</th></>}</tr>
        </thead>
        <tbody>
          {formas.map((f) => (
            <tr key={f.forma}>
              <td>{PAGAMENTO_ROTULO[f.forma]}{f.forma === 'online' && <span className="dica"> (fora da gaveta)</span>}</td>
              <td className="num">{f.quantidade}</td>
              {r.ve_valores && <><td className="num">{r$(f.vendas)}</td><td className="num">{f.forma === 'online' ? '—' : <strong>{r$(f.esperado)}</strong>}</td></>}
            </tr>
          ))}
        </tbody>
      </table>
      <span className="dica">
        Troco inicial {r$(r.abertura)}
        {r.ve_valores && <> · sangrias {r$(r.sangrias)} · suprimentos {r$(r.suprimentos)}</>}
        {' · '}{r.pedidos} pedido(s) no caixa
      </span>
      {!r.ve_valores && <span className="dica">Os valores aparecem depois do fechamento (fechamento cego): conte o dinheiro sem saber quanto deveria ter.</span>}
      {r.movimentos.length > 0 && (
        <details className="dica">
          <summary>Sangrias e suprimentos ({r.movimentos.length})</summary>
          <ul className="lista">
            {r.movimentos.map((mv, i) => (
              <li key={i}>{dataHora(mv.em)} · {mv.tipo === 'sangria' ? 'Sangria' : 'Suprimento'} {r$(mv.valor)}{mv.descricao ? ` · ${mv.descricao}` : ''}{mv.por ? ` · ${mv.por}` : ''}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Abrir({ pendente, cancelar, enviar }: { pendente: boolean; cancelar: () => void; enviar: (c: Contagem | null, v: number | null) => void }) {
  const [contar, setContar] = useState(true);
  const [contagem, setContagem] = useState<Contagem>({});
  const [txt, setTxt] = useState('');
  const valor = lerCentavos(txt);
  return (
    <form className="grade" style={{ gap: '0.5rem' }} onSubmit={(e) => { e.preventDefault(); enviar(contar ? contagem : null, contar ? null : valor); }}>
      <div className="abas-metrica" role="group" aria-label="Como informar o troco">
        <button type="button" aria-pressed={contar} onClick={() => setContar(true)}>Contar por cédula</button>
        <button type="button" aria-pressed={!contar} onClick={() => setContar(false)}>Digitar o total</button>
      </div>
      {contar ? (
        <Calculadora titulo="Troco inicial na gaveta" valor={contagem} onChange={setContagem} />
      ) : (
        <label style={{ maxWidth: '14rem' }}>Troco inicial (R$)<input type="text" inputMode="decimal" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="100,00" /></label>
      )}
      <div className="linha">
        <button className="botao-primario" disabled={pendente || (!contar && Number.isNaN(valor))}>
          {pendente ? 'Abrindo…' : `Abrir com ${formatarReais(contar ? totalContagem(contagem) : Number.isNaN(valor) ? 0 : valor)}`}
        </button>
        <button type="button" onClick={cancelar}>Cancelar</button>
      </div>
    </form>
  );
}

function Movimento({ tipo, pendente, cancelar, enviar }: { tipo: 'sangria' | 'suprimento'; pendente: boolean; cancelar: () => void; enviar: (v: number, d: string) => void }) {
  const [txt, setTxt] = useState('');
  const [desc, setDesc] = useState('');
  const v = lerCentavos(txt);
  return (
    <form className="grade" style={{ gap: '0.4rem' }} onSubmit={(e) => { e.preventDefault(); enviar(v, desc); }}>
      <p className="dica" style={{ margin: 0 }}>
        {tipo === 'sangria' ? 'Dinheiro retirado da gaveta (ex.: levado ao cofre, pago a fornecedor).' : 'Dinheiro colocado na gaveta (ex.: mais troco).'}
      </p>
      <div className="linha">
        <label style={{ flex: '1 1 8rem' }}>Valor (R$)<input type="text" inputMode="decimal" required value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="50,00" autoFocus /></label>
        <label style={{ flex: '2 1 12rem' }}>Motivo<input type="text" maxLength={200} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={tipo === 'sangria' ? 'Ex.: cofre' : 'Ex.: troco'} /></label>
      </div>
      <div className="linha">
        <button className="botao-primario" disabled={pendente || !(v > 0)}>{pendente ? 'Salvando…' : tipo === 'sangria' ? 'Registrar sangria' : 'Registrar suprimento'}</button>
        <button type="button" onClick={cancelar}>Cancelar</button>
      </div>
    </form>
  );
}

function Fechar({ pendente, cancelar, enviar }: { pendente: boolean; cancelar: () => void; enviar: (c: Contagem, inf: Record<string, number>, obs: string) => void }) {
  const [contagem, setContagem] = useState<Contagem>({});
  const [txts, setTxts] = useState<Record<string, string>>({});
  const [obs, setObs] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const inf = Object.fromEntries(FORMAS_MAQUININHA.map((f) => [f, lerCentavos(txts[f] ?? '')]));
  const invalido = Object.values(inf).some((v) => Number.isNaN(v));
  return (
    <form className="grade" style={{ gap: '0.6rem' }} onSubmit={(e) => { e.preventDefault(); if (!confirmar) return setConfirmar(true); enviar(contagem, inf, obs); }}>
      <p className="dica" style={{ margin: 0 }}>
        <strong>Fechamento cego:</strong> conte o dinheiro da gaveta e some os comprovantes de cada maquininha e o Pix recebido. O sistema só mostra se sobrou ou faltou depois de fechar.
      </p>
      <Calculadora titulo="Dinheiro na gaveta" valor={contagem} onChange={(c) => { setContagem(c); setConfirmar(false); }} />
      <fieldset className="grade" style={{ gap: '0.4rem' }}>
        <legend>Outras formas (total dos comprovantes)</legend>
        <div className="linha">
          {FORMAS_MAQUININHA.map((f) => (
            <label key={f} style={{ flex: '1 1 9rem' }}>
              {PAGAMENTO_ROTULO[f]} (R$)
              <input type="text" inputMode="decimal" value={txts[f] ?? ''} placeholder="0,00" onChange={(e) => { setTxts({ ...txts, [f]: e.target.value }); setConfirmar(false); }} />
            </label>
          ))}
        </div>
      </fieldset>
      <label>Observação (opcional)<input type="text" maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: R$ 10 de troco emprestado para a cozinha" /></label>
      {confirmar && (
        <p className="aviso">
          Confere? Dinheiro <strong>{formatarReais(totalContagem(contagem))}</strong>
          {FORMAS_MAQUININHA.filter((f) => inf[f]! > 0).map((f) => <span key={f}> · {PAGAMENTO_ROTULO[f]} <strong>{formatarReais(inf[f]!)}</strong></span>)}.
          Depois de fechar não dá para mudar.
        </p>
      )}
      <div className="linha">
        <button className="botao-primario" disabled={pendente || invalido}>{pendente ? 'Fechando…' : confirmar ? 'Sim, fechar o caixa' : 'Conferir e fechar'}</button>
        <button type="button" onClick={cancelar}>Cancelar</button>
      </div>
      {invalido && <p className="erro" style={{ margin: 0 }}>Há um valor inválido. Use o formato 49,90.</p>}
    </form>
  );
}

function Cadastro({ caixas, membros }: { caixas: CadastroCaixa[]; membros: Membro[] }) {
  return (
    <section className="cartao grade" style={{ gap: '0.6rem' }}>
      <h2 style={{ margin: 0, fontSize: '1rem' }}>Caixas da loja e quem opera</h2>
      <p className="dica" style={{ margin: 0 }}>
        Marque quem pode abrir e fechar cada caixa. Sem ninguém marcado, qualquer pessoa da equipe com acesso ao caixa opera. Dono e gerente operam todos.
        Para criar o login de uma pessoa (usuário e senha), vá em <Link href="/lojas">Lojas e equipe</Link>.
      </p>
      {caixas.map((c) => <EditarCaixa key={c.id} caixa={c} membros={membros} />)}
      <EditarCaixa caixa={null} membros={membros} />
    </section>
  );
}

function EditarCaixa({ caixa, membros }: { caixa: CadastroCaixa | null; membros: Membro[] }) {
  const [nome, setNome] = useState(caixa?.nome ?? '');
  const [ativo, setAtivo] = useState(caixa?.ativo ?? true);
  const [ops, setOps] = useState<string[]>(caixa?.operadores ?? []);
  const [m, setM] = useState<Msg>(null);
  const [aberto, setAberto] = useState(!!caixa);
  const [pendente, iniciar] = useTransition();
  const operaveis = membros.filter((x) => x.papel !== 'dono' && x.papel !== 'gerente');
  if (!aberto) return <button type="button" className="mini" style={{ justifySelf: 'start' }} onClick={() => setAberto(true)}>+ Novo caixa</button>;
  return (
    <form
      className="grade caixa-cadastro"
      style={{ gap: '0.4rem' }}
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await salvando(salvarCaixa(caixa?.id ?? null, nome, ativo, ops));
          setM(r.ok ? { ok: true, texto: 'Salvo.' } : { ok: false, texto: r.erro });
          if (r.ok && !caixa) { setNome(''); setOps([]); setAberto(false); }
        });
      }}
    >
      <div className="linha" style={{ alignItems: 'end' }}>
        <label style={{ flex: '1 1 10rem' }}>Nome do caixa<input type="text" required maxLength={40} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Balcão" /></label>
        {caixa && <label className="check"><input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ativo</label>}
      </div>
      <div className="linha" style={{ gap: '0.3rem 0.9rem' }}>
        <span className="dica">Quem opera:</span>
        {operaveis.length === 0 && <span className="dica">ninguém além de dono e gerente ainda — crie usuários de caixa em Lojas e equipe.</span>}
        {operaveis.map((x) => (
          <label key={x.userId} className="check">
            <input type="checkbox" checked={ops.includes(x.userId)} onChange={(e) => setOps(e.target.checked ? [...ops, x.userId] : ops.filter((y) => y !== x.userId))} />
            {x.nome}{x.usuario && <span className="dica"> ({x.usuario})</span>}
          </label>
        ))}
      </div>
      <div className="linha" style={{ alignItems: 'center' }}>
        <button className="mini botao-primario" disabled={pendente}>{caixa ? 'Salvar' : 'Criar caixa'}</button>
        {!caixa && <button type="button" className="mini" onClick={() => setAberto(false)}>Cancelar</button>}
        {m && <span className={m.ok ? 'dica' : 'erro'}>{m.texto}</span>}
      </div>
    </form>
  );
}
