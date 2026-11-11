'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { formatarReais, UNIDADES_ESTOQUE, type UnidadeEstoque } from '@res/core';
import { ajustarEstoque, salvarContagem, salvarInsumo } from '@/app/(painel)/estoque/actions';
import { salvando } from '@/components/tempo-real';
import { n, quantidadeTexto, type ContagemPainel, type Insumo } from '@/lib/estoque';

const num = (t: string) => (t.trim() === '' ? NaN : Number(t.replace(/\./g, '').replace(',', '.')));
const CHAVE = 'res_contagem_rascunho';
type Origem = 'todos' | 'nfe' | 'manual';

/** Contagem de estoque (D-038): conta tudo numa folha só, inclui itens à mão e salva de uma vez. */
export function Contagem({ lojaId, insumos, painel }: { lojaId: string; insumos: Insumo[]; painel: ContagemPainel }) {
  const [contado, setContado] = useState<Record<string, string>>({});
  const [origem, setOrigem] = useState<Origem>('todos');
  const [categoria, setCategoria] = useState('');
  const [busca, setBusca] = useState('');
  const [obs, setObs] = useState('');
  const [novo, setNovo] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const deNfe = useMemo(() => new Set(painel.de_nfe), [painel]);
  const categorias = useMemo(() => [...new Set(insumos.map((i) => i.categoria).filter(Boolean) as string[])].sort(), [insumos]);

  // rascunho: a contagem pode levar tempo; não perde se fechar a página
  useEffect(() => {
    try {
      const r = JSON.parse(localStorage.getItem(`${CHAVE}:${lojaId}`) ?? 'null');
      if (r && typeof r === 'object') setContado(r);
    } catch {}
  }, [lojaId]);
  useEffect(() => {
    try {
      if (Object.keys(contado).length) localStorage.setItem(`${CHAVE}:${lojaId}`, JSON.stringify(contado));
      else localStorage.removeItem(`${CHAVE}:${lojaId}`);
    } catch {}
  }, [contado, lojaId]);

  const lista = insumos.filter(
    (i) =>
      (origem === 'todos' || (origem === 'nfe') === deNfe.has(i.id)) &&
      (!categoria || i.categoria === categoria) &&
      (!busca.trim() || i.nome.toLowerCase().includes(busca.trim().toLowerCase())),
  );
  const preenchidos = insumos.filter((i) => Number.isFinite(num(contado[i.id] ?? '')) && num(contado[i.id]) >= 0);
  const dif = (i: Insumo) => num(contado[i.id] ?? '') - n(i.saldo);
  const difValor = preenchidos.reduce((s, i) => s + dif(i) * n(i.custo_medio), 0);
  const mudam = preenchidos.filter((i) => Math.abs(dif(i)) > 0.0005).length;
  const ultima = (id: string) => (painel.ultima[id] ? new Date(painel.ultima[id]).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null);

  return (
    <div className="grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="seg-chips" role="tablist" aria-label="Origem">
          {([['todos', 'Todos', insumos.length], ['nfe', 'Importados de NF-e', insumos.filter((i) => deNfe.has(i.id)).length], ['manual', 'Cadastrados à mão', insumos.filter((i) => !deNfe.has(i.id)).length]] as const).map(([v, r, q]) => (
            <button key={v} type="button" role="tab" className="seg-chip" aria-selected={origem === v} onClick={() => setOrigem(v)}>{r} <span className="seg-n">{q}</span></button>
          ))}
        </div>
        <div className="linha" style={{ alignItems: 'center' }}>
          {categorias.length > 0 && (
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoria">
              <option value="">Todas as categorias</option>
              {categorias.map((c) => <option key={c}>{c}</option>)}
            </select>
          )}
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar item…" aria-label="Buscar item" />
          <button type="button" onClick={() => window.print()} className="nao-imprimir">🖨 Folha de contagem</button>
          <button type="button" className="botao-primario nao-imprimir" onClick={() => setNovo(!novo)} aria-expanded={novo}>+ Item à mão</button>
        </div>
      </div>
      {novo && <NovoItem aoFechar={() => setNovo(false)} />}

      {insumos.length === 0 && !novo ? (
        <p className="cartao dica" style={{ margin: 0 }}>Nenhum item ainda. Adicione à mão (<strong>+ Item à mão</strong>) ou importe uma NF-e: os itens importados aparecem aqui para contar.</p>
      ) : (
        <div className="cartao tabela-rolagem ct-folha" style={{ padding: 0 }}>
          <table className="tabela">
            <thead><tr><th>Item</th><th>No sistema</th><th>Contado</th><th>Diferença</th><th>Última contagem</th></tr></thead>
            <tbody>
              {lista.map((i) => {
                const d = dif(i);
                const tem = Number.isFinite(d);
                return (
                  <tr key={i.id} className={tem ? 'ct-feito' : undefined}>
                    <td><strong>{i.nome}</strong> <span className="dica">{i.categoria ? `· ${i.categoria} ` : ''}{deNfe.has(i.id) ? '· NF-e' : '· à mão'}</span></td>
                    <td className={n(i.saldo) < 0 ? 'erro' : undefined}>{quantidadeTexto(n(i.saldo), i.unidade)}</td>
                    <td>
                      <span className="ct-campo">
                        <input inputMode="decimal" value={contado[i.id] ?? ''} aria-label={`Contado de ${i.nome}`}
                          onChange={(e) => setContado((c) => { const x = { ...c }; if (e.target.value === '') delete x[i.id]; else x[i.id] = e.target.value; return x; })}
                          onKeyDown={(e) => { if (e.key === 'Enter') { const ins = [...document.querySelectorAll<HTMLInputElement>('.ct-campo input')]; ins[ins.indexOf(e.currentTarget) + 1]?.focus(); } }}
                        />
                        <span className="dica">{i.unidade.toLowerCase()}</span>
                      </span>
                    </td>
                    <td>
                      {tem ? (
                        Math.abs(d) < 0.0005 ? <span className="dica">confere</span> : (
                          <span className={d < 0 ? 'erro' : 'ct-sobra'}>{d > 0 ? '+' : ''}{quantidadeTexto(d, i.unidade)} <span className="dica">({d > 0 ? '+' : '−'}{formatarReais(Math.round(Math.abs(d) * n(i.custo_medio)))})</span></span>
                        )
                      ) : '—'}
                    </td>
                    <td className="dica">{ultima(i.id) ?? 'nunca'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {preenchidos.length > 0 && (
        <section className="cartao ct-barra nao-imprimir">
          <div className="grade" style={{ gap: '0.1rem' }}>
            <strong>{preenchidos.length} item(ns) contado(s) · {mudam} com diferença</strong>
            <span className={difValor < 0 ? 'erro' : 'dica'}>{difValor < 0 ? 'Faltou' : difValor > 0 ? 'Sobrou' : 'Diferença'} {formatarReais(Math.round(Math.abs(difValor)))} em custo</span>
          </div>
          <input value={obs} maxLength={200} onChange={(e) => setObs(e.target.value)} placeholder="Observação (ex.: inventário do mês)" aria-label="Observação" style={{ flex: '1 1 14rem' }} />
          <button type="button" onClick={() => confirm('Limpar o que foi digitado nesta contagem?') && setContado({})}>Limpar</button>
          <button
            type="button"
            className="botao-primario"
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                const r = await salvando(salvarContagem(preenchidos.map((i) => ({ insumo_id: i.id, quantidade: num(contado[i.id]) })), obs));
                if (!r.ok) return setMsg({ ok: false, t: r.erro });
                setContado({});
                setObs('');
                setMsg({ ok: true, t: `Contagem salva: ${r.mudaram} item(ns) ajustado(s)${r.diferenca ? `, diferença de ${r.diferenca < 0 ? '−' : '+'}${formatarReais(Math.abs(r.diferenca))}` : ''}. Está nas Movimentações.` });
              })
            }
          >
            {pendente ? 'Salvando…' : 'Salvar contagem'}
          </button>
        </section>
      )}
      {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}
    </div>
  );
}

/** Cadastra um item sem NF-e, já com a quantidade que tem e o custo (opcional). */
function NovoItem({ aoFechar }: { aoFechar: () => void }) {
  const [nome, setNome] = useState('');
  const [unidade, setUnidade] = useState<UnidadeEstoque>('UN');
  const [categoria, setCategoria] = useState('');
  const [qtd, setQtd] = useState('');
  const [custo, setCusto] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const q = num(qtd);
  return (
    <section className="cartao grade nao-imprimir" style={{ gap: '0.5rem' }}>
      <strong>Novo item no estoque</strong>
      <div className="linha">
        <label style={{ flex: '2 1 14rem' }}>Nome<input value={nome} maxLength={100} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Caixa de pizza 40 cm" autoFocus /></label>
        <label>Unidade
          <select value={unidade} onChange={(e) => setUnidade(e.target.value as UnidadeEstoque)}>
            {UNIDADES_ESTOQUE.map((u) => <option key={u.id} value={u.id}>{u.rotulo} ({u.id.toLowerCase()})</option>)}
          </select>
        </label>
        <label>Quanto tem<input inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder="0" style={{ width: '7rem' }} /></label>
        <label>Custo por {unidade.toLowerCase()} (R$)<input inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="opcional" style={{ width: '8rem' }} /></label>
        <label style={{ flex: '1 1 9rem' }}>Categoria<input value={categoria} maxLength={60} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex.: Embalagens" /></label>
      </div>
      <div className="linha" style={{ alignItems: 'center' }}>
        <button
          type="button"
          className="botao-primario"
          disabled={pendente || !nome.trim() || (qtd.trim() !== '' && !(q >= 0))}
          onClick={() =>
            iniciar(async () => {
              const r = await salvando(salvarInsumo(null, { nome, unidade, categoria: categoria || null }));
              if (!r.ok) return setMsg(r.erro);
              if (q > 0) {
                const c = num(custo);
                const a = await ajustarEstoque(r.id, 'entrada', q, Number.isFinite(c) ? Math.round(c * 100) : null, 'Cadastro na contagem');
                if (!a.ok) return setMsg(a.erro);
              }
              aoFechar();
            })
          }
        >
          {pendente ? 'Salvando…' : 'Adicionar'}
        </button>
        <button type="button" onClick={aoFechar}>Cancelar</button>
        {msg && <span className="erro" role="alert">{msg}</span>}
      </div>
    </section>
  );
}
