'use client';
import { useMemo, useState, useTransition } from 'react';
import { criarLancamento, editarLancamento, excluirLancamento, marcarPago, type NovoLancamento } from '@/app/(painel)/financeiro/actions';
import { salvando } from '@/components/tempo-real';
import { brl, dataBr, FORMAS_LANC, hojeSP, situacao, type Categoria, type ContaFin, type Fornecedor, type Lancamento, type Situacao, type TipoLanc } from '@/lib/financeiro';

const ROTULO_SIT: Record<Situacao, string> = { vencido: 'Vencido', hoje: 'Vence hoje', aberto: 'A vencer', pago: 'Pago' };
const ler = (s: string) => {
  const n = Number(s.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

type Cad = { categorias: Categoria[]; fornecedores: Fornecedor[]; contas: ContaFin[] };

/** Contas a pagar e a receber (D-060): filtros por situação, "✓ Paguei" em um clique, novo/editar. */
export function Lancamentos({ lancamentos, cad, titulo, compacto = false }: { lancamentos: Lancamento[]; cad: Cad; titulo?: string; compacto?: boolean }) {
  const hoje = hojeSP();
  const [tipo, setTipo] = useState<'todos' | TipoLanc>('todos');
  const [sit, setSit] = useState<Situacao | 'todas'>('todas');
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState<{ novo: TipoLanc } | { editar: Lancamento } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const cat = useMemo(() => new Map(cad.categorias.map((c) => [c.id, c])), [cad.categorias]);
  const forn = useMemo(() => new Map(cad.fornecedores.map((f) => [f.id, f.nome])), [cad.fornecedores]);

  const doTipo = lancamentos.filter((l) => tipo === 'todos' || l.tipo === tipo);
  const soma = (s: Situacao) => doTipo.filter((l) => situacao(l, hoje) === s).reduce((a, l) => a + l.valor * (tipo === 'todos' && l.tipo === 'receita' ? -1 : 1), 0);
  const lista = doTipo
    .filter((l) => sit === 'todas' || situacao(l, hoje) === sit)
    .filter((l) => !busca || `${l.descricao} ${forn.get(l.fornecedor_id ?? '') ?? ''} ${cat.get(l.categoria_id ?? '')?.nome ?? ''}`.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => (a.pago_em ? 1 : 0) - (b.pago_em ? 1 : 0) || a.vencimento.localeCompare(b.vencimento));

  const pagar = (l: Lancamento) =>
    iniciar(async () => {
      const r = await salvando(marcarPago(l.id, l.pago_em ? null : hoje));
      setErro(r.ok ? null : r.erro);
    });
  const excluir = (l: Lancamento) => {
    const serie = !!l.serie && !l.pago_em;
    const futuros = serie && window.confirm(`"${l.descricao}" faz parte de uma série (${l.recorrente ? 'todo mês' : `parcela ${l.parcela}/${l.parcelas}`}).\n\nOK = excluir esta e as próximas ainda não pagas\nCancelar = escolher só esta`);
    if (!futuros && !window.confirm(`Excluir "${l.descricao}" (${brl(l.valor)}, vence ${dataBr(l.vencimento)})?`)) return;
    iniciar(async () => {
      const r = await salvando(excluirLancamento(l.id, futuros));
      setErro(r.ok ? null : r.erro);
    });
  };

  return (
    <div className="grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        {titulo ? <h2 style={{ margin: 0 }}>{titulo}</h2> : <span />}
        <span className="linha" style={{ gap: '0.4rem' }}>
          <button type="button" className="fin-btn-despesa" onClick={() => setForm({ novo: 'despesa' })}>− Despesa</button>
          <button type="button" className="fin-btn-receita" onClick={() => setForm({ novo: 'receita' })}>+ Receita</button>
        </span>
      </div>
      {!compacto && (
        <div className="linha" style={{ gap: '0.5rem', alignItems: 'center' }}>
          <div className="abas-metrica" role="group" aria-label="Tipo">
            {(['todos', 'despesa', 'receita'] as const).map((t) => (
              <button key={t} type="button" aria-pressed={tipo === t} onClick={() => setTipo(t)}>{t === 'todos' ? 'Tudo' : t === 'despesa' ? 'A pagar' : 'A receber'}</button>
            ))}
          </div>
          <input type="search" placeholder="Buscar descrição, fornecedor, categoria" value={busca} onChange={(e) => setBusca(e.target.value)} style={{ maxWidth: '18rem' }} aria-label="Buscar" />
        </div>
      )}
      <div className="fin-situacoes" role="group" aria-label="Situação">
        {(['vencido', 'hoje', 'aberto', 'pago'] as const).map((s) => (
          <button key={s} type="button" className="fin-sit" data-sit={s} aria-pressed={sit === s} onClick={() => setSit(sit === s ? 'todas' : s)}>
            <span>{ROTULO_SIT[s]}</span>
            <strong>{brl(Math.abs(soma(s)))}</strong>
          </button>
        ))}
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}
      {lista.length === 0 ? (
        <p className="cartao dica" style={{ margin: 0 }}>Nenhum lançamento {sit !== 'todas' ? `"${ROTULO_SIT[sit].toLowerCase()}"` : ''} neste período.</p>
      ) : (
        <div className="tabela-rolagem cartao" style={{ padding: 0 }}>
          <table className="tabela fin-tabela">
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Descrição</th>
                <th>Categoria</th>
                <th className="num">Valor</th>
                <th>Situação</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {lista.map((l) => {
                const s = situacao(l, hoje);
                const c = cat.get(l.categoria_id ?? '');
                return (
                  <tr key={l.id} data-sit={s}>
                    <td>{dataBr(l.vencimento)}</td>
                    <td style={{ whiteSpace: 'normal', minWidth: '12rem' }}>
                      <strong>{l.descricao}</strong>
                      {l.parcelas && !l.recorrente ? <span className="selo" style={{ marginLeft: 6 }}>{l.parcela}/{l.parcelas}</span> : null}
                      {l.recorrente ? <span className="selo" style={{ marginLeft: 6 }} title="Repete todo mês">↻ mensal</span> : null}
                      {l.origem === 'nfe' && <span className="selo" style={{ marginLeft: 6 }}>NF-e</span>}
                      {(l.fornecedor_id || l.forma) && <span className="dica" style={{ display: 'block' }}>{[forn.get(l.fornecedor_id ?? ''), l.forma].filter(Boolean).join(' · ')}</span>}
                    </td>
                    <td>{c ? c.nome : <span className="dica">sem categoria</span>}</td>
                    <td className="num" style={{ color: l.tipo === 'receita' ? 'var(--fin-receita)' : undefined }}>{l.tipo === 'receita' ? '+' : '−'} {brl(l.valor)}</td>
                    <td><span className="fin-selo" data-sit={s}>{s === 'pago' ? `Pago ${dataBr(l.pago_em).slice(0, 5)}` : ROTULO_SIT[s]}</span></td>
                    <td>
                      <span className="linha" style={{ gap: '0.3rem', flexWrap: 'nowrap' }}>
                        <button type="button" className={l.pago_em ? 'mini' : 'mini botao-primario'} disabled={pendente} onClick={() => pagar(l)}>
                          {l.pago_em ? 'Desfazer' : l.tipo === 'receita' ? '✓ Recebi' : '✓ Paguei'}
                        </button>
                        <button type="button" className="mini" onClick={() => setForm({ editar: l })}>Editar</button>
                        <button type="button" className="mini" disabled={pendente} onClick={() => excluir(l)} aria-label={`Excluir ${l.descricao}`}>✕</button>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {form && <FormLancamento key={'novo' in form ? form.novo : form.editar.id} inicial={form} cad={cad} fechar={() => setForm(null)} />}
    </div>
  );
}

function FormLancamento({ inicial, cad, fechar }: { inicial: { novo: TipoLanc } | { editar: Lancamento }; cad: Cad; fechar: () => void }) {
  const ed = 'editar' in inicial ? inicial.editar : null;
  const tipo: TipoLanc = ed ? ed.tipo : (inicial as { novo: TipoLanc }).novo;
  const hoje = hojeSP();
  const [d, setD] = useState({
    descricao: ed?.descricao ?? '',
    valor: ed ? ed.valor.toFixed(2).replace('.', ',') : '',
    vencimento: ed?.vencimento ?? hoje,
    competencia: '', // AAAA-MM quando o usuário escolhe; vazio = mês do vencimento (ou o já salvo)
    categoria: ed?.categoria_id ?? '',
    fornecedor: ed?.fornecedor_id ?? '',
    conta: ed?.conta_id ?? cad.contas.find((c) => c.ativo)?.id ?? '',
    forma: ed?.forma ?? '',
    pago: false,
    modo: 'unico' as NovoLancamento['modo'],
    vezes: '2',
    observacao: ed?.observacao ?? '',
  });
  const [erro, setErro] = useState<string | null>(null);
  const [mais, setMais] = useState(false);
  const [pendente, iniciar] = useTransition();
  const m = (x: Partial<typeof d>) => setD((v) => ({ ...v, ...x }));
  const cats = cad.categorias.filter((c) => c.tipo === tipo && (c.ativo || c.id === d.categoria));
  const grupos = [...new Set(cats.map((c) => c.grupo))];
  const valor = ler(d.valor);
  const vezes = Math.max(1, Math.min(60, Number(d.vezes) || 1));

  const salvar = (deNovo: boolean) =>
    iniciar(async () => {
      const comp = d.competencia ? `${d.competencia}-01` : '';
      const r = ed
        ? await salvando(editarLancamento(ed.id, { ...d, valor, competencia: comp || ed.competencia }))
        : await salvando(criarLancamento({ ...d, tipo, valor, competencia: comp, vezes: d.modo === 'unico' ? 1 : vezes }));
      if (!r.ok) return setErro(r.erro);
      if (deNovo) {
        m({ descricao: '', valor: '', observacao: '' });
        setErro(null);
      } else fechar();
    });

  return (
    <div className="pub-folha-fundo" role="dialog" aria-modal="true" aria-label={ed ? 'Editar lançamento' : tipo === 'despesa' ? 'Nova despesa' : 'Nova receita'} onClick={(e) => e.target === e.currentTarget && fechar()}>
      <form
        className="pub-folha qp-folha"
        onSubmit={(e) => {
          e.preventDefault();
          salvar(false);
        }}
      >
        <div className="linha" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>{ed ? 'Editar' : tipo === 'despesa' ? '− Nova despesa (a pagar)' : '+ Nova receita (a receber)'}</h2>
          <button type="button" className="mini" onClick={fechar}>Fechar</button>
        </div>
        <div className="gc-campos">
          <label className="gc-largo">
            Descrição
            <input autoFocus required maxLength={120} value={d.descricao} onChange={(e) => m({ descricao: e.target.value })} placeholder={tipo === 'despesa' ? 'Ex.: Conta de luz, Boleto Atacadão' : 'Ex.: Encomenda de 50 pizzas'} />
          </label>
          <label>
            Valor{d.modo === 'parcelado' ? ' total' : ''} (R$)
            <input required inputMode="decimal" value={d.valor} onChange={(e) => m({ valor: e.target.value })} placeholder="0,00" />
          </label>
          <label>
            {d.modo === 'unico' ? 'Vencimento' : '1º vencimento'}
            <input type="date" required value={d.vencimento} onChange={(e) => m({ vencimento: e.target.value })} />
          </label>
          <label>
            Categoria
            <select value={d.categoria} onChange={(e) => m({ categoria: e.target.value })}>
              <option value="">— escolha —</option>
              {grupos.map((g) => (
                <optgroup key={g} label={g}>
                  {cats.filter((c) => c.grupo === g).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
          {tipo === 'despesa' && (
            <label>
              Fornecedor
              <select value={d.fornecedor} onChange={(e) => m({ fornecedor: e.target.value })}>
                <option value="">—</option>
                {cad.fornecedores.filter((f) => f.ativo || f.id === d.fornecedor).map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </label>
          )}
          {!ed && (
            <div className="gc-largo">
              <div className="abas-metrica" role="group" aria-label="Como se repete">
                {(['unico', 'parcelado', 'recorrente'] as const).map((k) => (
                  <button key={k} type="button" aria-pressed={d.modo === k} onClick={() => m({ modo: k, vezes: k === 'recorrente' ? '12' : d.vezes })}>
                    {k === 'unico' ? 'Uma vez' : k === 'parcelado' ? 'Parcelado' : '↻ Todo mês'}
                  </button>
                ))}
              </div>
              {d.modo !== 'unico' && (
                <p className="dica" style={{ margin: '0.4rem 0 0' }}>
                  <input type="number" min={2} max={60} value={d.vezes} onChange={(e) => m({ vezes: e.target.value })} style={{ width: '4.5rem' }} aria-label="Quantas vezes" />{' '}
                  {d.modo === 'parcelado'
                    ? `parcelas de ${Number.isFinite(valor) && valor > 0 ? brl(Math.round((valor / vezes) * 100) / 100) : 'R$ —'}, uma por mês`
                    : `meses com ${Number.isFinite(valor) && valor > 0 ? brl(valor) : 'o mesmo valor'} (dá para excluir os próximos depois)`}
                </p>
              )}
            </div>
          )}
          {!ed && (
            <label className="gc-check">
              <input type="checkbox" checked={d.pago} onChange={(e) => m({ pago: e.target.checked })} />
              {tipo === 'despesa' ? 'Já paguei' : 'Já recebi'}{d.modo !== 'unico' ? ' (a 1ª)' : ''}
            </label>
          )}
          {!mais && (
            <button type="button" className="mini gc-largo" style={{ justifySelf: 'start' }} onClick={() => setMais(true)}>
              + Forma de pagamento, conta, competência e observação
            </button>
          )}
          {mais && (
            <>
              <label>
                Forma de pagamento
                <input list="fin-formas" value={d.forma} onChange={(e) => m({ forma: e.target.value })} maxLength={40} />
                <datalist id="fin-formas">{FORMAS_LANC.map((f) => <option key={f} value={f} />)}</datalist>
              </label>
              <label>
                Conta
                <select value={d.conta} onChange={(e) => m({ conta: e.target.value })}>
                  <option value="">—</option>
                  {cad.contas.filter((c) => c.ativo || c.id === d.conta).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </label>
              <label title="O mês a que a despesa pertence no DRE (ex.: a luz de setembro paga em outubro)">
                Mês de competência
                <input type="month" value={d.competencia || (ed?.competencia ?? d.vencimento).slice(0, 7)} onChange={(e) => m({ competencia: e.target.value })} />
              </label>
              <label className="gc-largo">
                Observação
                <input maxLength={300} value={d.observacao} onChange={(e) => m({ observacao: e.target.value })} />
              </label>
            </>
          )}
        </div>
        {erro && <p className="erro" role="alert" style={{ margin: 0 }}>{erro}</p>}
        <div className="linha" style={{ justifyContent: 'flex-end' }}>
          {!ed && <button type="button" disabled={pendente} onClick={() => salvar(true)}>Salvar e lançar outra</button>}
          <button type="submit" className="botao-primario" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </div>
  );
}
