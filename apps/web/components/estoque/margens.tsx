'use client';
import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { alertasMargem, CLASSES, engenhariaCardapio, formatarReais, type Classe, type ProdutoMargem } from '@res/core';
import { definirCmvAlvo } from '@/app/(painel)/estoque/actions';
import { salvando } from '@/components/tempo-real';
import { Perdas, type DadosPerdas } from '@/components/estoque/perdas';

export type DadosMargem = {
  alvo: number;
  dias: number;
  produtos: ProdutoMargem[];
  insumos_subiram: { id: string; nome: string; unidade: string; antes: number; agora: number; em: string; variacao: number; usado_em: string[] }[];
};

const pct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const ORDEM: Classe[] = ['estrela', 'burro_de_carga', 'quebra_cabeca', 'cao'];

/** Margem e engenharia de cardápio (D-108): o que subiu, o que ficou caro demais e o que fazer com cada prato. */
export function Margens({ dados, gestor, perdas }: { dados: DadosMargem; gestor: boolean; perdas?: DadosPerdas | null }) {
  const [alvo, setAlvo] = useState(String(Number(dados.alvo)).replace('.', ','));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const alvoN = Number(dados.alvo);
  const produtos = useMemo(() => dados.produtos.map((p) => ({ ...p, preco: p.preco == null ? null : Number(p.preco), receita: Number(p.receita), custo: Number(p.custo), vendidos: Number(p.vendidos), custo_ficha: p.custo_ficha == null ? null : Number(p.custo_ficha) })), [dados.produtos]);
  const alertas = useMemo(() => alertasMargem(produtos, alvoN), [produtos, alvoN]);
  const matriz = useMemo(() => engenhariaCardapio(produtos), [produtos]);
  const semCusto = produtos.filter((p) => p.vendidos > 0 && !p.custo_conhecido);
  const receita = matriz.itens.reduce((s, i) => s + i.receita, 0);
  const custo = matriz.itens.reduce((s, i) => s + i.custo, 0);

  return (
    <div className="grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'end', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div className="grade" style={{ gap: '0.15rem' }}>
          <h2 style={{ margin: 0 }}>Margem e cardápio · últimos {dados.dias} dias</h2>
          <span className="dica">
            Custos pelas fichas técnicas com o custo <b>de hoje</b> dos insumos (a última nota já conta).{' '}
            {receita > 0 && <>CMV dos itens com ficha: <b>{pct((custo / receita) * 100)}</b> de {formatarReais(receita)} vendidos.</>}
          </span>
        </div>
        <div className="linha" style={{ gap: '0.35rem', alignItems: 'end' }}>
          {[30, 60, 90].map((d) => (
            <Link key={d} href={`/estoque?aba=margens&dias=${d}`} className="botao mini" aria-current={dados.dias === d || undefined}>{d} dias</Link>
          ))}
          {gestor && (
            <label style={{ width: '9rem' }}>
              CMV alvo (%)
              <span className="linha" style={{ gap: '0.3rem', flexWrap: 'nowrap' }}>
                <input inputMode="decimal" value={alvo} onChange={(e) => setAlvo(e.target.value)} style={{ width: '4.5rem' }} />
                <button
                  type="button"
                  className="mini"
                  disabled={pendente}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await salvando(definirCmvAlvo(Number(alvo.replace(',', '.'))));
                      setMsg(r.ok ? { ok: true, t: 'CMV alvo salvo.' } : { ok: false, t: r.erro });
                    })
                  }
                >
                  OK
                </button>
              </span>
            </label>
          )}
        </div>
      </div>
      {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}

      {dados.insumos_subiram.length > 0 && (
        <section className="cartao grade margem-alerta" style={{ gap: '0.5rem' }}>
          <h3 style={{ margin: 0 }}>📈 Insumos que subiram</h3>
          <ul className="margem-lista">
            {dados.insumos_subiram.map((i) => (
              <li key={i.id}>
                <span>
                  <b>{i.nome}</b> subiu <b className="margem-ruim">{pct(Number(i.variacao))}</b> ({formatarReais(Math.round(Number(i.antes) * 100))} → {formatarReais(Math.round(Number(i.agora) * 100))} por {i.unidade.toLowerCase()}, em {new Date(i.em).toLocaleDateString('pt-BR')})
                </span>
                {i.usado_em.length > 0 && <span className="dica">Usado em: {i.usado_em.join(', ')}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="cartao grade" style={{ gap: '0.5rem' }}>
        <h3 style={{ margin: 0 }}>{alertas.length ? `⚠️ ${alertas.length} ${alertas.length === 1 ? 'item acima' : 'itens acima'} do CMV alvo (${pct(alvoN)})` : `✅ Nenhum item acima do CMV alvo (${pct(alvoN)})`}</h3>
        {alertas.length > 0 && (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr><th>Produto</th><th className="num">CMV</th><th className="num">Preço hoje</th><th className="num">Preço para voltar ao alvo</th><th /></tr>
              </thead>
              <tbody>
                {alertas.map((a) => (
                  <tr key={a.id}>
                    <td>{a.nome}{a.base === 'ficha' && <span className="dica"> · sem vendas no período (pela ficha)</span>}</td>
                    <td className="num margem-ruim">{pct(a.cmvPct)}</td>
                    <td className="num">{formatarReais(a.precoAtual)}{a.base === 'vendas' && <span className="dica"> média</span>}</td>
                    <td className="num"><b>{formatarReais(a.precoSugerido)}</b> <span className="dica">(+{formatarReais(a.precoSugerido - a.precoAtual)})</span></td>
                    <td><Link className="mini" href="/cardapio">Ajustar no cardápio</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="dica" style={{ margin: 0 }}>Também dá para baixar o custo: trocar fornecedor, ajustar a porção na ficha ou tirar um ingrediente caro.</p>
      </section>

      {perdas && <Perdas dados={perdas} dias={dados.dias} produtos={produtos.filter((p) => p.custo_ficha != null).map((p) => ({ id: p.id, nome: p.nome })).sort((a, b) => a.nome.localeCompare(b.nome))} />}

      <section className="grade" style={{ gap: '0.5rem' }}>
        <h3 style={{ margin: 0 }}>Engenharia de cardápio</h3>
        {matriz.itens.length === 0 ? (
          <p className="cartao dica" style={{ margin: 0 }}>Monte as fichas técnicas dos produtos (e dos sabores) para ver a matriz. Ela usa as vendas do período.</p>
        ) : (
          <>
            <p className="dica" style={{ margin: 0 }}>
              Popular = vendeu pelo menos {pct(matriz.corteParticipacao * 100)} das unidades. Lucra bem = margem por unidade de {formatarReais(matriz.corteMargem)} ou mais (a média do cardápio).
            </p>
            <div className="matriz-cardapio">
              {ORDEM.map((c) => {
                const itens = matriz.itens.filter((i) => i.classe === c).sort((a, b) => b.vendidos - a.vendidos);
                return (
                  <div key={c} className="cartao matriz-quadro" data-classe={c}>
                    <strong>{CLASSES[c].icone} {CLASSES[c].titulo} <span className="dica">({itens.length})</span></strong>
                    <span className="dica">{CLASSES[c].acao}</span>
                    <ul>
                      {itens.slice(0, 12).map((i) => (
                        <li key={i.id}>
                          <span>{i.nome}</span>
                          <span className="dica">{i.vendidos} un · margem {formatarReais(i.margemUnit)} · CMV {pct(i.cmvPct)}</span>
                        </li>
                      ))}
                      {itens.length > 12 && <li className="dica">e mais {itens.length - 12}</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          </>
        )}
        {semCusto.length > 0 && (
          <p className="dica" style={{ margin: 0 }}>
            Sem ficha técnica (fora da matriz): {semCusto.slice(0, 10).map((p) => p.nome).join(', ')}{semCusto.length > 10 ? ` e mais ${semCusto.length - 10}` : ''}. <Link href="/estoque">Montar fichas</Link>
          </p>
        )}
      </section>
    </div>
  );
}
