'use client';
import { Fragment, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatarReais } from '@res/core';
import { Editor } from '@/components/estoque/fichas';
import { n, type MeuEstoque, type ProdutoEstoque } from '@/lib/estoque';

type Filtro = 'todos' | 'sem' | 'com';

/** Meu estoque (D-038): todos os produtos do cardápio com a ficha técnica — desta loja ou de todas do grupo. */
export function MeuEstoqueProdutos({ dados, todas, temPizza }: { dados: MeuEstoque; todas: boolean; temPizza: boolean }) {
  const router = useRouter();
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [aberto, setAberto] = useState<string | null>(null);
  const todos = useMemo(() => dados.lojas.flatMap((l) => l.produtos), [dados]);
  const comFicha = todos.filter((p) => p.ficha.length > 0).length;
  const cmv = (() => {
    const v = todos.filter((p) => p.ficha.length && p.preco);
    const preco = v.reduce((s, p) => s + (p.preco ?? 0), 0);
    return preco ? Math.round((v.reduce((s, p) => s + n(p.custo), 0) / preco) * 100) : null;
  })();
  const passa = (p: ProdutoEstoque) =>
    (filtro === 'todos' || (filtro === 'com') === p.ficha.length > 0) && (!busca.trim() || `${p.nome} ${p.categoria ?? ''}`.toLowerCase().includes(busca.trim().toLowerCase()));

  return (
    <div className="grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="seg-chips" role="tablist" aria-label="Ficha técnica">
          {([['todos', 'Todos', todos.length], ['sem', 'Sem ficha', todos.length - comFicha], ['com', 'Com ficha', comFicha]] as const).map(([v, r, q]) => (
            <button key={v} type="button" role="tab" className="seg-chip" data-est={v === 'sem' && q > 0 ? 'baixo' : undefined} aria-selected={filtro === v} onClick={() => setFiltro(v)}>
              {r} <span className="seg-n">{q}</span>
            </button>
          ))}
        </div>
        <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar produto ou categoria…" aria-label="Buscar produto" />
      </div>
      <p className="dica" style={{ margin: 0 }}>
        {comFicha} de {todos.length} produtos com ficha técnica{cmv != null ? ` · custo médio dos insumos ${cmv}% do preço` : ''}. Quando o pedido é concluído, cada produto vendido baixa os insumos da ficha
        {' '}(e {temPizza ? 'os sabores, bordas e adicionais' : 'os adicionais e opções'} escolhidos baixam os deles, em{' '}
        <Link href="/estoque?aba=meu&ver=sabores">{temPizza ? 'Sabores, bordas e adicionais' : 'Adicionais e opções'}</Link>).
      </p>

      {dados.lojas.map((loja) => {
        const lista = loja.produtos.filter(passa);
        const insumos = dados.insumos[loja.estoque] ?? [];
        return (
          <section key={loja.id} className="grade" style={{ gap: '0.5rem' }}>
            {todas && <h2 style={{ margin: '0.4rem 0 0' }}>{loja.nome}</h2>}
            {lista.length === 0 ? (
              <p className="cartao dica" style={{ margin: 0 }}>{loja.produtos.length ? 'Nenhum produto com esse filtro.' : 'Esta loja ainda não tem produtos no cardápio.'}</p>
            ) : (
              <div className="cartao tabela-rolagem" style={{ padding: 0 }}>
                <table className="tabela me-tabela">
                  <thead><tr><th>Produto</th><th>Preço</th><th>Custo da ficha</th><th>Custo / preço</th><th /></tr></thead>
                  <tbody>
                    {lista.map((p) => {
                      const k = `${loja.id}:${p.id}`;
                      const pct = p.ficha.length && p.preco ? Math.round((n(p.custo) / p.preco) * 100) : null;
                      return (
                        <Fragment key={k}>
                          <tr>
                            <td>
                              <div className="me-produto">
                                {p.imagem_url ? <img src={p.imagem_url} alt="" loading="lazy" /> : <span className="me-sem-foto" aria-hidden>{p.nome.slice(0, 1)}</span>}
                                <div>
                                  <strong>{p.nome}</strong>
                                  <span className="dica">{p.categoria ?? 'Sem categoria'}{p.grupos ? ` · ${p.grupos} grupo(s) de opções` : ''}</span>
                                </div>
                              </div>
                            </td>
                            <td>{p.preco != null ? formatarReais(p.preco) : '—'}</td>
                            <td>{p.ficha.length ? <>{formatarReais(Math.round(n(p.custo)))} <span className="dica">· {p.ficha.length} insumo(s)</span></> : <span className="est-sit" data-est="baixo">Sem ficha</span>}</td>
                            <td>{pct != null ? <span className={pct > 35 ? 'erro' : undefined}>{pct}%</span> : '—'}</td>
                            <td>
                              <button type="button" className={p.ficha.length ? 'mini' : 'mini botao-primario'} aria-expanded={aberto === k} onClick={() => setAberto(aberto === k ? null : k)}>
                                {aberto === k ? 'Fechar' : p.ficha.length ? 'Editar ficha' : 'Montar ficha'}
                              </button>
                            </td>
                          </tr>
                          {aberto === k && (
                            <tr className="est-detalhe">
                              <td colSpan={5}>
                                {insumos.length === 0 ? (
                                  <p className="dica" style={{ margin: 0 }}>Cadastre os insumos {todas ? `do estoque de ${loja.nome} ` : ''}primeiro (aba Insumos, Contagem ou importando uma NF-e).</p>
                                ) : (
                                  <Editor
                                    alvo={{ tipo: 'produto', id: p.id, nome: p.nome, preco: p.preco }}
                                    insumos={insumos}
                                    atual={p.ficha.map((f) => ({ insumo_id: f.insumo_id, quantidade: n(f.quantidade) }))}
                                    lojaId={loja.id}
                                    outrasLojas={dados.outras_lojas > 0}
                                    aoSalvar={() => router.refresh()}
                                  />
                                )}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

