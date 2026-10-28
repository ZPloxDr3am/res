'use client';
import { useMemo, useState, useTransition } from 'react';
import { formatarReais, situacaoEstoque, UNIDADES_ESTOQUE, type SituacaoEstoque, type UnidadeEstoque } from '@res/core';
import { ajustarEstoque, excluirInsumo, salvarInsumo } from '@/app/(painel)/estoque/actions';
import { salvando } from '@/components/tempo-real';
import { n, quantidadeTexto, type Insumo } from '@/lib/estoque';

const SIT: Record<SituacaoEstoque, string> = { regular: 'Regular', baixo: 'Baixo', critico: 'Acabou', sem_controle: 'Sem controle' };
const num = (t: string) => (t.trim() === '' ? NaN : Number(t.replace(/\./g, '').replace(',', '.')));

/** Lista de insumos com situação, valor em estoque, cadastro e ajustes (D-036). */
export function ListaInsumos({ insumos }: { insumos: Insumo[] }) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<SituacaoEstoque | 'todos'>('todos');
  const [aberto, setAberto] = useState<string | 'novo' | null>(null);
  const comSit = useMemo(() => insumos.map((i) => ({ ...i, sit: situacaoEstoque(n(i.saldo), i.minimo == null ? null : n(i.minimo), i.controla) })), [insumos]);
  const contagem = (s: SituacaoEstoque) => comSit.filter((i) => i.sit === s).length;
  const lista = comSit.filter((i) => (filtro === 'todos' || i.sit === filtro) && (!busca.trim() || i.nome.toLowerCase().includes(busca.trim().toLowerCase())));

  return (
    <div className="grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="seg-chips" role="tablist" aria-label="Situação">
          <button type="button" role="tab" className="seg-chip" aria-selected={filtro === 'todos'} onClick={() => setFiltro('todos')}>Todos <span className="seg-n">{insumos.length}</span></button>
          {(['critico', 'baixo', 'regular', 'sem_controle'] as const).map((s) => (
            <button key={s} type="button" role="tab" className="seg-chip" data-est={s} aria-selected={filtro === s} onClick={() => setFiltro(filtro === s ? 'todos' : s)}>
              {SIT[s]} <span className="seg-n">{contagem(s)}</span>
            </button>
          ))}
        </div>
        <div className="linha" style={{ alignItems: 'center' }}>
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar insumo…" aria-label="Buscar insumo" />
          <button type="button" className="botao-primario" onClick={() => setAberto('novo')}>+ Insumo</button>
        </div>
      </div>
      {aberto === 'novo' && <FormInsumo aoFechar={() => setAberto(null)} />}
      {insumos.length === 0 && aberto !== 'novo' && (
        <p className="cartao dica" style={{ margin: 0 }}>
          Nenhum insumo ainda. O jeito mais rápido é <strong>importar a NF-e</strong> de um fornecedor: cada item da nota vira um insumo com quantidade e custo.
        </p>
      )}
      {lista.length > 0 && (
        <div className="cartao tabela-rolagem" style={{ padding: 0 }}>
          <table className="tabela">
            <thead>
              <tr><th>Insumo</th><th>Saldo</th><th>Mínimo</th><th>Custo médio</th><th>Valor em estoque</th><th>Situação</th><th /></tr>
            </thead>
            <tbody>
              {lista.map((i) => (
                <LinhaInsumo key={i.id} i={i} sit={i.sit} aberto={aberto === i.id} alternar={() => setAberto(aberto === i.id ? null : i.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LinhaInsumo({ i, sit, aberto, alternar }: { i: Insumo; sit: SituacaoEstoque; aberto: boolean; alternar: () => void }) {
  return (
    <>
      <tr>
        <td><strong>{i.nome}</strong>{i.categoria ? <span className="dica"> · {i.categoria}</span> : null}</td>
        <td className={n(i.saldo) < 0 ? 'erro' : undefined}>{quantidadeTexto(n(i.saldo), i.unidade)}</td>
        <td className="dica">{i.minimo == null ? '—' : quantidadeTexto(n(i.minimo), i.unidade)}</td>
        <td>{formatarReais(Math.round(n(i.custo_medio)))} <span className="dica">/{i.unidade.toLowerCase()}</span></td>
        <td>{formatarReais(Math.round(Math.max(0, n(i.saldo)) * n(i.custo_medio)))}</td>
        <td><span className="est-sit" data-est={sit}>{SIT[sit]}</span></td>
        <td className="linha" style={{ gap: '0.3rem', flexWrap: 'nowrap' }}>
          <button type="button" className="mini" aria-expanded={aberto} onClick={alternar}>{aberto ? 'Fechar' : 'Ajustar'}</button>
          <a className="botao mini" href={`/estoque?aba=movimentos&insumo=${i.id}`}>Histórico</a>
        </td>
      </tr>
      {aberto && (
        <tr className="est-detalhe">
          <td colSpan={7}>
            <div className="grade" style={{ gap: '1rem' }}>
              <Ajuste i={i} />
              <FormInsumo i={i} aoFechar={alternar} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Ajuste({ i }: { i: Insumo }) {
  const [tipo, setTipo] = useState<'entrada' | 'perda' | 'contagem'>('contagem');
  const [qtd, setQtd] = useState('');
  const [custo, setCusto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const q = num(qtd);
  const valido = Number.isFinite(q) && q >= 0 && (tipo === 'contagem' || q > 0) && (tipo !== 'perda' || motivo.trim().length >= 3);
  return (
    <div className="grade" style={{ gap: '0.5rem' }}>
      <strong>Movimentar estoque</strong>
      <div className="abas" role="tablist" style={{ justifySelf: 'start' }}>
        {([['contagem', 'Contagem'], ['entrada', 'Entrada'], ['perda', 'Perda']] as const).map(([v, r]) => (
          <button key={v} type="button" role="tab" aria-selected={tipo === v} onClick={() => setTipo(v)}>{r}</button>
        ))}
      </div>
      <div className="linha">
        <label>{tipo === 'contagem' ? `Quanto tem agora (${i.unidade.toLowerCase()})` : `Quantidade (${i.unidade.toLowerCase()})`}
          <input inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} placeholder={tipo === 'contagem' ? String(n(i.saldo)).replace('.', ',') : '0'} style={{ width: '9rem' }} />
        </label>
        {tipo === 'entrada' && (
          <label>Custo por {i.unidade.toLowerCase()} (R$, opcional)<input inputMode="decimal" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0,00" style={{ width: '9rem' }} /></label>
        )}
        <label style={{ flex: '1 1 14rem' }}>{tipo === 'perda' ? 'Motivo (obrigatório)' : 'Observação'}
          <input value={motivo} maxLength={200} onChange={(e) => setMotivo(e.target.value)} placeholder={tipo === 'perda' ? 'Ex.: venceu, caiu, estragou' : tipo === 'contagem' ? 'Ex.: inventário de segunda' : 'Ex.: compra no mercado'} />
        </label>
        <button
          type="button"
          className="botao-primario"
          disabled={pendente || !valido}
          onClick={() =>
            iniciar(async () => {
              const c = num(custo);
              const r = await salvando(ajustarEstoque(i.id, tipo, q, tipo === 'entrada' && Number.isFinite(c) ? Math.round(c * 100) : null, motivo));
              setMsg(r.ok ? { ok: true, t: 'Estoque atualizado.' } : { ok: false, t: r.erro });
              if (r.ok) {
                setQtd('');
                setCusto('');
                setMotivo('');
              }
            })
          }
        >
          {tipo === 'contagem' ? 'Salvar contagem' : tipo === 'entrada' ? 'Dar entrada' : 'Registrar perda'}
        </button>
      </div>
      {tipo === 'contagem' && <span className="dica">O saldo passa a ser o que você contou; a diferença fica registrada nas movimentações.</span>}
      {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.t}</span>}
    </div>
  );
}

function FormInsumo({ i, aoFechar }: { i?: Insumo; aoFechar: () => void }) {
  const [nome, setNome] = useState(i?.nome ?? '');
  const [unidade, setUnidade] = useState<UnidadeEstoque>(i?.unidade ?? 'KG');
  const [categoria, setCategoria] = useState(i?.categoria ?? '');
  const [minimo, setMinimo] = useState(i?.minimo == null ? '' : String(n(i.minimo)).replace('.', ','));
  const [controla, setControla] = useState(i?.controla ?? true);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <div className={i ? 'grade' : 'cartao grade'} style={{ gap: '0.5rem' }}>
      <strong>{i ? 'Dados do insumo' : 'Novo insumo'}</strong>
      <div className="linha">
        <label style={{ flex: '2 1 14rem' }}>Nome<input value={nome} maxLength={100} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Mussarela" autoFocus={!i} /></label>
        <label>Unidade
          <select value={unidade} onChange={(e) => setUnidade(e.target.value as UnidadeEstoque)}>
            {UNIDADES_ESTOQUE.map((u) => <option key={u.id} value={u.id}>{u.rotulo} ({u.id.toLowerCase()})</option>)}
          </select>
        </label>
        <label>Avisar abaixo de<input inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} placeholder="—" style={{ width: '7rem' }} /></label>
        <label style={{ flex: '1 1 10rem' }}>Categoria<input value={categoria} maxLength={60} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex.: Frios" /></label>
      </div>
      <label className="check"><input type="checkbox" checked={controla} onChange={(e) => setControla(e.target.checked)} /> Controlar saldo (alerta de baixo e de acabou)</label>
      <div className="linha" style={{ alignItems: 'center' }}>
        <button
          type="button"
          className="botao-primario"
          disabled={pendente || !nome.trim()}
          onClick={() =>
            iniciar(async () => {
              const m = num(minimo);
              const r = await salvando(salvarInsumo(i?.id ?? null, { nome, unidade, categoria: categoria || null, minimo: Number.isFinite(m) ? m : null, controla }));
              if (!r.ok) return setMsg(r.erro);
              aoFechar();
            })
          }
        >
          {pendente ? 'Salvando…' : i ? 'Salvar' : 'Criar insumo'}
        </button>
        {!i && <button type="button" onClick={aoFechar}>Cancelar</button>}
        {i && (
          <button
            type="button"
            className="erro"
            disabled={pendente}
            onClick={() =>
              confirmarExclusao(i.nome) &&
              iniciar(async () => {
                const r = await salvando(excluirInsumo(i.id));
                if (!r.ok) setMsg(r.erro);
              })
            }
          >
            Excluir insumo
          </button>
        )}
        {msg && <span className="erro" role="alert">{msg}</span>}
      </div>
    </div>
  );
}

const confirmarExclusao = (nome: string) => window.confirm(`Excluir "${nome}"? Ele sai das fichas técnicas; o histórico de movimentações fica.`);
