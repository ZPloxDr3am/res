'use client';
import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { DIAS_CURTOS, formatarReais, percentualDesconto, resumoAgenda, type AgendaPromo } from '@res/core';
import {
  alternarCupom,
  excluirCupom,
  excluirPromoCategoria,
  salvarCupom,
  salvarLimiteDesconto,
  salvarPromoCategoria,
  type CupomForm,
  type PromoCategoriaForm,
} from '@/app/(painel)/promocoes/actions';
import { salvando } from '@/components/tempo-real';

export type PromoProdutoLinha = { id: string; nome: string; de: number | null; por: number; agenda: AgendaPromo; situacao: 'sem' | 'valendo' | 'fora' };
export type PromoCategoriaLinha = Omit<PromoCategoriaForm, 'id'> & { id: string };
export type CupomLinha = Omit<CupomForm, 'id'> & { id: string };
export type UsoCupom = { id: string; numero: number; cupomId: string; cliente: string; telefone: string | null; desconto: number; total: number; criadoEm: string; cancelado: boolean };
type Aba = 'produto' | 'categoria' | 'cupons' | 'balcao';
type Msg = { tipo: 'ok' | 'erro'; texto: string } | null;

const TODOS = [0, 1, 2, 3, 4, 5, 6];
const reais = (c: number | null) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','));
const lerCentavos = (t: string): number | null => {
  const s = t.trim().replace(/\s|R\$/g, '');
  if (!s) return 0;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};
const dataBr = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });

function Dias({ valor, mudar }: { valor: number[]; mudar: (d: number[]) => void }) {
  return (
    <div className="linha" style={{ gap: '0.35rem' }}>
      {DIAS_CURTOS.map((d, i) => (
        <label key={d} className={`cd-dia ${valor.includes(i) ? 'on' : ''}`}>
          <input type="checkbox" checked={valor.includes(i)} onChange={(e) => mudar(e.target.checked ? [...valor, i].sort() : valor.filter((x) => x !== i))} />
          {d}
        </label>
      ))}
      <button type="button" className="mini" onClick={() => mudar(TODOS)}>Todos</button>
    </div>
  );
}

export function PainelPromocoes(props: {
  aba: Aba;
  lojaNome: string;
  setores: { id: string; nome: string }[];
  produtosPromo: PromoProdutoLinha[];
  categorias: PromoCategoriaLinha[];
  cupons: CupomLinha[];
  usos: UsoCupom[];
  limiteDesconto: number | null;
  outrasLojas: { id: string; nome: string }[];
}) {
  const [aba, setAba] = useState<Aba>(props.aba);
  const valendoCat = props.categorias.filter((c) => c.ativo).length;
  const ativosCupom = props.cupons.filter((c) => c.ativo).length;
  const abas: { id: Aba; nome: string; resumo: string }[] = [
    { id: 'produto', nome: 'Promoção no produto', resumo: `${props.produtosPromo.length} produto(s) · De / Por` },
    { id: 'categoria', nome: '% numa categoria', resumo: valendoCat ? `${valendoCat} ativa(s)` : 'Ex.: terça, pizzas -20%' },
    { id: 'cupons', nome: 'Cupons', resumo: ativosCupom ? `${ativosCupom} ativo(s)` : 'Código no cardápio digital' },
    { id: 'balcao', nome: 'Desconto no balcão', resumo: props.limiteDesconto == null ? 'Sem limite' : `Limite ${props.limiteDesconto}% sem gerente` },
  ];
  return (
    <div className="grade">
      <div>
        <h1 style={{ marginBottom: 0 }}>Promoções e descontos</h1>
        <p className="dica" style={{ margin: 0 }}>Tudo o que baixa o preço, num lugar só · {props.lojaNome}</p>
      </div>
      <div className="pr-abas" role="tablist">
        {abas.map((a) => (
          <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} onClick={() => setAba(a.id)}>
            <strong>{a.nome}</strong>
            <span>{a.resumo}</span>
          </button>
        ))}
      </div>
      {aba === 'produto' && <AbaProduto linhas={props.produtosPromo} />}
      {aba === 'categoria' && <AbaCategoria setores={props.setores} linhas={props.categorias} />}
      {aba === 'cupons' && <AbaCupons cupons={props.cupons} usos={props.usos} outrasLojas={props.outrasLojas} />}
      {aba === 'balcao' && <AbaBalcao limite={props.limiteDesconto} />}
    </div>
  );
}

function AbaProduto({ linhas }: { linhas: PromoProdutoLinha[] }) {
  return (
    <section className="cartao grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Produtos em promoção (De / Por)</h2>
        <Link href="/cardapio" className="botao-primario" style={{ padding: '0.5rem 0.9rem', borderRadius: 10, textDecoration: 'none' }}>Colocar produto em promoção</Link>
      </div>
      <p className="dica" style={{ margin: 0 }}>A promoção de cada produto é feita no Cardápio → Editar → &quot;Promoção (De / Por)&quot;, com dias, horário e data de fim.</p>
      {linhas.length === 0 ? (
        <p className="dica">Nenhum produto em promoção.</p>
      ) : (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead><tr><th>Produto</th><th>De</th><th>Por</th><th>Quando</th><th>Agora</th></tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id}>
                  <td><strong>{l.nome}</strong></td>
                  <td><s>{l.de == null ? '—' : formatarReais(l.de)}</s></td>
                  <td><strong className="pr-promo">{formatarReais(l.por)}</strong>{l.de != null && <span className="dica"> -{percentualDesconto(l.de, l.por)}%</span>}</td>
                  <td>{resumoAgenda(l.agenda)}</td>
                  <td>{l.situacao === 'valendo' ? <span className="pr-selo ok">Valendo agora</span> : <span className="pr-selo">Fora do horário</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

const vaziaCat = (): PromoCategoriaForm => ({ id: null, setorId: '', percentual: 20, dias: TODOS, inicio: null, fim: null, ate: null, ativo: true });

function AbaCategoria({ setores, linhas }: { setores: { id: string; nome: string }[]; linhas: PromoCategoriaLinha[] }) {
  const [f, setF] = useState<PromoCategoriaForm | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();
  const nome = (id: string) => setores.find((s) => s.id === id)?.nome ?? '—';
  const fazer = (p: Promise<{ ok: true } | { ok: false; erro: string }>, ok: string, depois?: () => void) =>
    iniciar(async () => {
      const r = await salvando(p);
      setMsg(r.ok ? { tipo: 'ok', texto: ok } : { tipo: 'erro', texto: r.erro });
      if (r.ok) depois?.();
    });
  return (
    <section className="cartao grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>% de desconto numa categoria</h2>
        {!f && <button type="button" className="botao-primario" onClick={() => setF(vaziaCat())}>+ Nova promoção de categoria</button>}
      </div>
      <p className="dica" style={{ margin: 0 }}>Todos os produtos da categoria aparecem com o desconto (riscado no cardápio digital). Se o produto já tem promoção própria, vale o menor preço.</p>
      {linhas.length > 0 && (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead><tr><th>Categoria</th><th>Desconto</th><th>Quando</th><th>Ativa</th><th /></tr></thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id}>
                  <td><strong>{nome(l.setorId)}</strong></td>
                  <td><strong className="pr-promo">-{l.percentual}%</strong></td>
                  <td>{resumoAgenda({ dias: l.dias, inicio: l.inicio, fim: l.fim, ate: l.ate })}</td>
                  <td>
                    <input type="checkbox" checked={l.ativo} aria-label="Ativa" disabled={pendente} onChange={(e) => fazer(salvarPromoCategoria({ ...l, ativo: e.target.checked }), e.target.checked ? 'Promoção ligada.' : 'Promoção desligada.')} />
                  </td>
                  <td className="linha" style={{ gap: '0.3rem' }}>
                    <button type="button" className="mini" onClick={() => setF({ ...l })}>Editar</button>
                    <button type="button" className="mini texto-perigo" disabled={pendente} onClick={() => fazer(excluirPromoCategoria(l.id), 'Promoção excluída.')}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {f && (
        <div className="cd-secao cd-promo ligada grade" style={{ gap: '0.6rem' }}>
          <h3>{f.id ? 'Editar promoção da categoria' : 'Nova promoção da categoria'}</h3>
          <div className="linha" style={{ alignItems: 'flex-end' }}>
            <label style={{ flex: '2 1 12rem' }}>
              Categoria
              <select value={f.setorId} onChange={(e) => setF({ ...f, setorId: e.target.value })}>
                <option value="">Escolha</option>
                {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </label>
            <label style={{ flex: '1 1 7rem' }}>
              Desconto (%)
              <input type="number" min={1} max={90} value={f.percentual} onChange={(e) => setF({ ...f, percentual: Number(e.target.value) })} className="cd-promo-preco" />
            </label>
          </div>
          <span className="dica">Dias da semana</span>
          <Dias valor={f.dias} mudar={(dias) => setF({ ...f, dias })} />
          <div className="linha" style={{ alignItems: 'center', gap: '0.5rem' }}>
            <label className="interruptor">
              <input type="checkbox" checked={!!f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.checked ? '18:00' : null, fim: e.target.checked ? '23:59' : null })} /> Só num horário
            </label>
            {f.inicio && (
              <>
                <input type="time" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} aria-label="Começa às" style={{ width: '7.5rem' }} />
                <span>às</span>
                <input type="time" value={f.fim ?? ''} onChange={(e) => setF({ ...f, fim: e.target.value })} aria-label="Termina às" style={{ width: '7.5rem' }} />
              </>
            )}
            <label className="linha" style={{ alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
              <span className="dica">Termina em</span>
              <input type="date" value={f.ate ?? ''} onChange={(e) => setF({ ...f, ate: e.target.value || null })} style={{ width: '10rem' }} />
            </label>
          </div>
          <p className="dica" style={{ margin: 0 }}>{resumoAgenda({ dias: f.dias.length === 7 ? null : f.dias, inicio: f.inicio, fim: f.fim, ate: f.ate })}</p>
          <div className="linha">
            <button type="button" className="botao-primario" disabled={pendente} onClick={() => fazer(salvarPromoCategoria(f), 'Promoção salva.', () => setF(null))}>{pendente ? 'Salvando…' : 'Salvar'}</button>
            <button type="button" onClick={() => setF(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {msg && <p className={msg.tipo === 'ok' ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.texto}</p>}
    </section>
  );
}

const vazioCupom = (): CupomForm => ({ id: null, codigo: '', descricao: '', tipo: 'percentual', valor: 10, pedidoMinimo: 0, primeiraCompra: false, limitePorCliente: 1, limiteTotal: null, dias: TODOS, validoAte: null, ativo: true });

function regraCupom(c: CupomLinha): string {
  const partes = [c.tipo === 'percentual' ? `${c.valor}% off` : c.tipo === 'valor' ? `${formatarReais(c.valor)} off` : 'Entrega grátis'];
  if (c.primeiraCompra) partes.push('só na primeira compra');
  if (c.pedidoMinimo > 0) partes.push(`pedido mínimo ${formatarReais(c.pedidoMinimo)}`);
  if (c.dias.length < 7) partes.push(c.dias.map((d) => DIAS_CURTOS[d]).join(', '));
  return partes.join(' · ');
}

function AbaCupons({ cupons, usos, outrasLojas }: { cupons: CupomLinha[]; usos: UsoCupom[]; outrasLojas: { id: string; nome: string }[] }) {
  const [f, setF] = useState<CupomForm | null>(null);
  const [valorTxt, setValorTxt] = useState('');
  const [minTxt, setMinTxt] = useState('');
  const [copiar, setCopiar] = useState<string[]>([]);
  const [vendo, setVendo] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();
  const stats = useMemo(() => {
    const m = new Map<string, { clientes: Set<string>; usos: number; desconto: number }>();
    for (const u of usos) {
      if (u.cancelado) continue;
      const s = m.get(u.cupomId) ?? { clientes: new Set<string>(), usos: 0, desconto: 0 };
      s.clientes.add(u.telefone ?? `sem-telefone-${u.id}`);
      s.usos++;
      s.desconto += u.desconto;
      m.set(u.cupomId, s);
    }
    return m;
  }, [usos]);
  const abrir = (c: CupomForm) => {
    setF(c);
    setValorTxt(c.tipo === 'valor' ? reais(c.valor) : String(c.valor));
    setMinTxt(c.pedidoMinimo ? reais(c.pedidoMinimo) : '');
    setCopiar([]);
  };
  const fazer = (p: Promise<{ ok: true } | { ok: false; erro: string }>, ok: string, depois?: () => void) =>
    iniciar(async () => {
      const r = await salvando(p);
      setMsg(r.ok ? { tipo: 'ok', texto: ok } : { tipo: 'erro', texto: r.erro });
      if (r.ok) depois?.();
    });
  const salvar = () => {
    if (!f) return;
    const valor = f.tipo === 'valor' ? lerCentavos(valorTxt) : Number(valorTxt.replace(',', '.'));
    const pedidoMinimo = lerCentavos(minTxt);
    if (valor == null || Number.isNaN(valor) || pedidoMinimo == null) return setMsg({ tipo: 'erro', texto: 'Há um valor inválido.' });
    fazer(salvarCupom({ ...f, valor: f.tipo === 'frete' ? 0 : valor, pedidoMinimo }, copiar), f.id ? 'Cupom salvo.' : copiar.length ? `Cupom criado nesta loja e em mais ${copiar.length}.` : 'Cupom criado.', () => setF(null));
  };

  return (
    <section className="cartao grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Cupons do cardápio digital</h2>
        {!f && <button type="button" className="botao-primario" onClick={() => abrir(vazioCupom())}>+ Novo cupom</button>}
      </div>
      <p className="dica" style={{ margin: 0 }}>O cliente digita o código no fim do pedido. Também dá para usar no pedido do balcão. O sistema confere as regras e conta quem usou.</p>
      {f && (
        <div className="cd-secao grade" style={{ gap: '0.6rem' }}>
          <h3>{f.id ? `Editar ${f.codigo}` : 'Novo cupom'}</h3>
          <div className="linha" style={{ alignItems: 'flex-end' }}>
            <label style={{ flex: '1 1 10rem' }}>
              Código
              <input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value.toUpperCase().replace(/\s+/g, '') })} maxLength={30} placeholder="PRIMEIRA10" style={{ fontWeight: 800, letterSpacing: '0.05em' }} />
            </label>
            <label style={{ flex: '2 1 14rem' }}>
              Descrição para o cliente <span className="dica">(opcional)</span>
              <input value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} maxLength={120} placeholder="10% off na primeira compra" />
            </label>
          </div>
          <div className="linha" style={{ alignItems: 'flex-end' }}>
            <fieldset className="linha" style={{ gap: '0.6rem' }}>
              <legend>Tipo</legend>
              <label className="check"><input type="radio" checked={f.tipo === 'percentual'} onChange={() => { setF({ ...f, tipo: 'percentual' }); setValorTxt('10'); }} /> % do pedido</label>
              <label className="check"><input type="radio" checked={f.tipo === 'valor'} onChange={() => { setF({ ...f, tipo: 'valor' }); setValorTxt('10,00'); }} /> R$ fixo</label>
              <label className="check"><input type="radio" checked={f.tipo === 'frete'} onChange={() => setF({ ...f, tipo: 'frete' })} /> Entrega grátis</label>
            </fieldset>
            {f.tipo !== 'frete' && (
              <label style={{ width: '8rem' }}>
                {f.tipo === 'percentual' ? 'Desconto (%)' : 'Desconto (R$)'}
                <input inputMode="decimal" value={valorTxt} onChange={(e) => setValorTxt(e.target.value)} className="cd-promo-preco" />
              </label>
            )}
            <label style={{ width: '9rem' }}>
              Pedido mínimo (R$)
              <input inputMode="decimal" value={minTxt} onChange={(e) => setMinTxt(e.target.value)} placeholder="0,00" />
            </label>
          </div>
          <div className="linha" style={{ alignItems: 'center', gap: '0.9rem' }}>
            <label className="check"><input type="checkbox" checked={f.primeiraCompra} onChange={(e) => setF({ ...f, primeiraCompra: e.target.checked })} /> Só na primeira compra do cliente</label>
            <label className="linha" style={{ alignItems: 'center', gap: '0.35rem' }}>
              <span>Vezes por cliente</span>
              <input type="number" min={1} value={f.limitePorCliente ?? ''} placeholder="∞" onChange={(e) => setF({ ...f, limitePorCliente: e.target.value ? Math.max(1, Number(e.target.value)) : null })} style={{ width: '5rem' }} />
            </label>
            <label className="linha" style={{ alignItems: 'center', gap: '0.35rem' }}>
              <span>Total de usos</span>
              <input type="number" min={1} value={f.limiteTotal ?? ''} placeholder="∞" onChange={(e) => setF({ ...f, limiteTotal: e.target.value ? Math.max(1, Number(e.target.value)) : null })} style={{ width: '5.5rem' }} />
            </label>
          </div>
          <span className="dica">Dias que vale</span>
          <Dias valor={f.dias} mudar={(dias) => setF({ ...f, dias })} />
          <div className="linha" style={{ alignItems: 'center', gap: '0.9rem' }}>
            <label className="linha" style={{ alignItems: 'center', gap: '0.35rem' }}>
              <span>Vale até</span>
              <input type="date" value={f.validoAte ?? ''} onChange={(e) => setF({ ...f, validoAte: e.target.value || null })} style={{ width: '10rem' }} />
              <span className="dica">(vazio = sem validade)</span>
            </label>
          </div>
          {!f.id && outrasLojas.length > 0 && (
            <fieldset className="linha" style={{ gap: '0.6rem' }}>
              <legend>Criar também nas lojas</legend>
              {outrasLojas.map((l) => (
                <label key={l.id} className="check">
                  <input type="checkbox" checked={copiar.includes(l.id)} onChange={(e) => setCopiar(e.target.checked ? [...copiar, l.id] : copiar.filter((x) => x !== l.id))} /> {l.nome}
                </label>
              ))}
            </fieldset>
          )}
          <div className="linha">
            <button type="button" className="botao-primario" disabled={pendente} onClick={salvar}>{pendente ? 'Salvando…' : f.id ? 'Salvar cupom' : 'Criar cupom'}</button>
            <button type="button" onClick={() => setF(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {msg && <p className={msg.tipo === 'ok' ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.texto}</p>}
      {cupons.length === 0 && !f && <p className="dica">Nenhum cupom ainda.</p>}
      <div className="pr-cupons">
        {cupons.map((c) => {
          const s = stats.get(c.id);
          const lista = usos.filter((u) => u.cupomId === c.id);
          return (
            <article key={c.id} className={`pr-cupom ${c.ativo ? '' : 'inativo'}`}>
              <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <strong className="pr-codigo">{c.codigo}</strong>
                <label className="interruptor"><input type="checkbox" checked={c.ativo} disabled={pendente} onChange={(e) => fazer(alternarCupom(c.id, e.target.checked), e.target.checked ? `${c.codigo} ativo.` : `${c.codigo} pausado.`)} /> {c.ativo ? 'Ativo' : 'Pausado'}</label>
              </div>
              <span>{c.descricao || regraCupom(c)}</span>
              {c.descricao && <span className="dica">{regraCupom(c)}</span>}
              <div className="pr-numeros">
                <div className="destaque"><strong>{s?.clientes.size ?? 0}</strong><span>clientes usaram</span></div>
                <div><strong>{s?.usos ?? 0}</strong><span>usos{c.limiteTotal ? ` de ${c.limiteTotal}` : ''}</span></div>
                <div><strong>{formatarReais(s?.desconto ?? 0)}</strong><span>de desconto dado</span></div>
              </div>
              <span className="dica">
                {c.limitePorCliente ? `Limite: ${c.limitePorCliente} por cliente (telefone)` : 'Sem limite por cliente'} · {c.validoAte ? `vale até ${c.validoAte.slice(8, 10)}/${c.validoAte.slice(5, 7)}` : 'sem validade'}
              </span>
              <div className="linha" style={{ gap: '0.35rem' }}>
                <button type="button" className="mini" onClick={() => setVendo(vendo === c.id ? null : c.id)} disabled={lista.length === 0}>{vendo === c.id ? 'Esconder' : 'Ver quem usou'}</button>
                <button type="button" className="mini" onClick={() => abrir({ ...c })}>Editar</button>
                {(s?.usos ?? 0) === 0 && <button type="button" className="mini texto-perigo" disabled={pendente} onClick={() => fazer(excluirCupom(c.id), `${c.codigo} excluído.`)}>Excluir</button>}
              </div>
              {vendo === c.id && (
                <div className="tabela-rolagem">
                  <table className="tabela">
                    <thead><tr><th>Pedido</th><th>Cliente</th><th>Telefone</th><th>Quando</th><th>Desconto</th><th>Total</th></tr></thead>
                    <tbody>
                      {lista.map((u) => (
                        <tr key={u.id} style={u.cancelado ? { opacity: 0.5 } : undefined}>
                          <td>#{u.numero}{u.cancelado ? ' (cancelado)' : ''}</td>
                          <td>{u.cliente}</td>
                          <td>{u.telefone ?? '—'}</td>
                          <td>{dataBr(u.criadoEm)}</td>
                          <td>{formatarReais(u.desconto)}</td>
                          <td>{formatarReais(u.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AbaBalcao({ limite }: { limite: number | null }) {
  const [txt, setTxt] = useState(limite == null ? '' : String(limite));
  const [msg, setMsg] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <section className="cartao grade">
      <h2>Desconto no pedido do balcão</h2>
      <p className="dica" style={{ margin: 0 }}>
        Quem lança o pedido pode dar desconto em R$, sempre com motivo. Dono e gerente não têm limite. Acima do limite, o caixa/atendente precisa que um gerente digite usuário e senha na hora (autoriza só aquele pedido).
      </p>
      <div className="tabela-rolagem">
        <table className="tabela">
          <thead><tr><th>Quem</th><th>Pode dar até</th><th>Acima disso</th></tr></thead>
          <tbody>
            <tr><td><strong>Dono e gerente</strong></td><td>Sem limite</td><td>—</td></tr>
            <tr>
              <td><strong>Caixa / atendente</strong></td>
              <td>
                <span className="linha" style={{ alignItems: 'center', gap: '0.3rem' }}>
                  <input inputMode="decimal" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder="sem limite" aria-label="Limite em %" style={{ width: '6rem' }} /> % do pedido
                </span>
              </td>
              <td>Pede senha do gerente</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="linha" style={{ alignItems: 'center' }}>
        <button
          type="button"
          className="botao-primario"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const v = txt.trim() ? Number(txt.replace(',', '.')) : null;
              if (v != null && Number.isNaN(v)) return setMsg({ tipo: 'erro', texto: 'Limite inválido.' });
              const r = await salvando(salvarLimiteDesconto(v));
              setMsg(r.ok ? { tipo: 'ok', texto: v == null ? 'Sem limite de desconto.' : `Limite de ${v}% salvo.` } : { tipo: 'erro', texto: r.erro });
            })
          }
        >
          Salvar limite
        </button>
        {msg && <span className={msg.tipo === 'ok' ? 'dica' : 'erro'} role="status">{msg.texto}</span>}
      </div>
      <p className="dica" style={{ margin: 0 }}>Todo desconto aparece no Resumo, em &quot;Descontos&quot;, e o motivo fica no histórico do pedido.</p>
    </section>
  );
}
