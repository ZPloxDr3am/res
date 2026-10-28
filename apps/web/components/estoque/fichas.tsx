'use client';
import { useMemo, useState, useTransition } from 'react';
import { formatarReais, paraCentavos } from '@res/core';
import { salvarFicha } from '@/app/(painel)/estoque/actions';
import { salvando } from '@/components/tempo-real';
import { nomeOpcao, type GrupoRow, type ProdutoRow } from '@/lib/cardapio-dados';
import { n, type Insumo, type ItemFicha } from '@/lib/estoque';

type Alvo = { tipo: 'produto'; id: string; nome: string; preco: number | null } | { tipo: 'opcao'; id: string; nome: string; grupo: string; pizza: boolean };
const chave = (a: Alvo) => `${a.tipo}:${a.id}`;
const num = (t: string) => (t.trim() === '' ? NaN : Number(t.replace(',', '.')));

/** Ficha técnica (D-036): quanto cada produto e cada opção gastam de cada insumo — dá a baixa nas vendas. */
export function Fichas({ produtos, grupos, insumos, fichas }: { produtos: ProdutoRow[]; grupos: GrupoRow[]; insumos: Insumo[]; fichas: ItemFicha[] }) {
  const [busca, setBusca] = useState('');
  const [alvo, setAlvo] = useState<Alvo | null>(null);
  const porAlvo = useMemo(() => {
    const m = new Map<string, ItemFicha[]>();
    for (const f of fichas) {
      const k = f.produto_id ? `produto:${f.produto_id}` : `opcao:${f.opcao_id}`;
      (m.get(k) ?? m.set(k, []).get(k)!).push(f);
    }
    return m;
  }, [fichas]);
  const custo = (k: string) => (porAlvo.get(k) ?? []).reduce((s, f) => s + n(f.custo), 0);
  const filtra = (t: string) => !busca.trim() || t.toLowerCase().includes(busca.trim().toLowerCase());
  const prods = produtos.filter((p) => !p.combo && filtra(p.nome));
  const gs = grupos.filter((g) => g.ativo && g.opcoes.some((o) => o.ativo)).map((g) => ({ g, ops: g.opcoes.filter((o) => o.ativo && (filtra(nomeOpcao(o)) || filtra(g.nome))) })).filter((x) => x.ops.length);

  if (insumos.length === 0) return <p className="cartao dica" style={{ margin: 0 }}>Cadastre os insumos primeiro (ou importe uma NF-e) para montar as fichas técnicas.</p>;

  return (
    <div className="fichas">
      <aside className="cartao fichas-lista" aria-label="Produtos e opções">
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" aria-label="Buscar produto ou opção" />
        <span className="fichas-titulo">Produtos</span>
        {prods.map((p) => {
          const a: Alvo = { tipo: 'produto', id: p.id, nome: p.nome, preco: p.preco == null ? null : paraCentavos(Number(p.preco)) };
          const k = chave(a);
          return (
            <button key={k} type="button" className="fichas-item" aria-current={alvo && chave(alvo) === k ? 'true' : undefined} onClick={() => setAlvo(a)}>
              <span>{p.nome}</span>
              {porAlvo.has(k) ? <span className="fichas-custo">{formatarReais(Math.round(custo(k)))}</span> : <span className="dica">sem ficha</span>}
            </button>
          );
        })}
        {gs.map(({ g, ops }) => (
          <div key={g.id} className="grade" style={{ gap: '0.1rem' }}>
            <span className="fichas-titulo">{g.nome}{g.pizza ? ' · por pizza inteira' : ''}</span>
            {ops.map((o) => {
              const a: Alvo = { tipo: 'opcao', id: o.id, nome: nomeOpcao(o), grupo: g.nome, pizza: g.pizza };
              const k = chave(a);
              return (
                <button key={k} type="button" className="fichas-item" aria-current={alvo && chave(alvo) === k ? 'true' : undefined} onClick={() => setAlvo(a)}>
                  <span>{nomeOpcao(o)}</span>
                  {porAlvo.has(k) ? <span className="fichas-custo">{formatarReais(Math.round(custo(k)))}</span> : <span className="dica">sem ficha</span>}
                </button>
              );
            })}
          </div>
        ))}
      </aside>
      <section className="cartao grade fichas-editor" aria-live="polite">
        {!alvo ? (
          <div className="grade" style={{ gap: '0.4rem' }}>
            <h2 style={{ margin: 0 }}>Como funciona</h2>
            <p className="dica" style={{ margin: 0 }}>Escolha um produto ou uma opção à esquerda e diga quanto ele gasta de cada insumo. Quando o pedido é concluído, o estoque baixa sozinho.</p>
            <ul className="dica" style={{ margin: 0, paddingLeft: '1.1rem' }}>
              <li><strong>Produto</strong>: o que vai em toda unidade (ex.: Pizza Grande → massa, molho, mussarela, caixa).</li>
              <li><strong>Sabor de pizza</strong>: quanto vai numa pizza <em>inteira</em> daquele sabor. No meio a meio, baixa a metade de cada.</li>
              <li><strong>Adicional / borda</strong>: quanto vai em cada um escolhido.</li>
              <li>Combos baixam pelos produtos escolhidos dentro deles.</li>
            </ul>
          </div>
        ) : (
          <Editor key={chave(alvo)} alvo={alvo} insumos={insumos} atual={porAlvo.get(chave(alvo)) ?? []} />
        )}
      </section>
    </div>
  );
}

function Editor({ alvo, insumos, atual }: { alvo: Alvo; insumos: Insumo[]; atual: ItemFicha[] }) {
  const [linhas, setLinhas] = useState(() => (atual.length ? atual.map((f) => ({ insumo: f.insumo_id, qtd: String(n(f.quantidade)).replace('.', ',') })) : [{ insumo: '', qtd: '' }]));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const ins = (id: string) => insumos.find((i) => i.id === id);
  const custoLinha = (l: { insumo: string; qtd: string }) => {
    const i = ins(l.insumo);
    const q = num(l.qtd);
    return i && q > 0 ? q * n(i.custo_medio) : 0;
  };
  const total = linhas.reduce((s, l) => s + custoLinha(l), 0);
  const validas = linhas.filter((l) => l.insumo && num(l.qtd) > 0);
  const invalida = linhas.some((l) => (l.insumo || l.qtd) && !(l.insumo && num(l.qtd) > 0));

  return (
    <div className="grade" style={{ gap: '0.75rem' }}>
      <div className="grade" style={{ gap: '0.15rem' }}>
        <h2 style={{ margin: 0 }}>{alvo.nome}</h2>
        <span className="dica">{alvo.tipo === 'produto' ? 'Produto · gasto por unidade vendida' : `${alvo.grupo} · ${alvo.pizza ? 'gasto numa pizza inteira deste sabor (meio a meio baixa a metade)' : 'gasto em cada um escolhido'}`}</span>
      </div>
      {linhas.map((l, k) => {
        const i = ins(l.insumo);
        return (
          <div key={k} className="linha" style={{ alignItems: 'center', flexWrap: 'nowrap' }}>
            <select value={l.insumo} onChange={(e) => setLinhas(linhas.map((x, j) => (j === k ? { ...x, insumo: e.target.value } : x)))} aria-label="Insumo" style={{ flex: '1 1 auto', minWidth: 0 }}>
              <option value="">Escolha o insumo…</option>
              {insumos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
            </select>
            <input inputMode="decimal" value={l.qtd} onChange={(e) => setLinhas(linhas.map((x, j) => (j === k ? { ...x, qtd: e.target.value } : x)))} placeholder="0,000" aria-label="Quantidade" style={{ width: '6.5rem' }} />
            <span className="dica" style={{ width: '2rem' }}>{i?.unidade.toLowerCase() ?? ''}</span>
            <span style={{ width: '5.5rem', textAlign: 'right' }} className="dica">{custoLinha(l) > 0 ? formatarReais(Math.round(custoLinha(l))) : ''}</span>
            <button type="button" className="mini" aria-label="Tirar linha" onClick={() => setLinhas(linhas.length > 1 ? linhas.filter((_, j) => j !== k) : [{ insumo: '', qtd: '' }])}>×</button>
          </div>
        );
      })}
      <button type="button" style={{ justifySelf: 'start' }} onClick={() => setLinhas([...linhas, { insumo: '', qtd: '' }])}>+ Insumo</button>
      <div className="fichas-total">
        <span>Custo da ficha <strong>{formatarReais(Math.round(total))}</strong></span>
        {alvo.tipo === 'produto' && alvo.preco != null && alvo.preco > 0 && total > 0 && (
          <span className="dica">preço {formatarReais(alvo.preco)} · custo é {Math.round((total / alvo.preco) * 100)}% do preço (sem os sabores)</span>
        )}
      </div>
      <div className="linha" style={{ alignItems: 'center' }}>
        <button
          type="button"
          className="botao-primario"
          disabled={pendente || invalida}
          onClick={() =>
            iniciar(async () => {
              const r = await salvando(salvarFicha(alvo.tipo === 'produto' ? alvo.id : null, alvo.tipo === 'opcao' ? alvo.id : null, validas.map((l) => ({ insumo_id: l.insumo, quantidade: num(l.qtd) }))));
              setMsg(r.ok ? { ok: true, t: validas.length ? 'Ficha salva. As próximas vendas já baixam o estoque.' : 'Ficha removida.' } : { ok: false, t: r.erro });
            })
          }
        >
          {pendente ? 'Salvando…' : 'Salvar ficha'}
        </button>
        {invalida && <span className="dica">Complete o insumo e a quantidade de cada linha.</span>}
        {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.t}</span>}
      </div>
    </div>
  );
}
