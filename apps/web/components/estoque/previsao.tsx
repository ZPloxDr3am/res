'use client';
import { useMemo, useState } from 'react';
import { DIAS_SEMANA, formatarReais, preverInsumo, proximosDias } from '@res/core';
import { n, quantidadeTexto } from '@/lib/estoque';

export type DadosPrevisao = {
  hoje: string;
  insumos: { id: string; nome: string; unidade: string; saldo: number; minimo: number | null; custo: number; fornecedor: string | null; dow: number[] }[];
  produtos: { id: string; nome: string; dow: number[] }[];
};

const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

/** 🔮 Previsão de compra e produção (D-110): pelas vendas de cada dia da semana nas últimas 4 semanas. */
export function Previsao({ dados, loja }: { dados: DadosPrevisao; loja: string }) {
  const [dias, setDias] = useState(7);
  const opcoes = useMemo(() => proximosDias(dados.hoje, 7), [dados.hoje]);
  const [dia, setDia] = useState(opcoes[0]?.data ?? dados.hoje);
  const [copiado, setCopiado] = useState(false);
  const linhas = useMemo(
    () =>
      dados.insumos
        .map((i) => ({ ...i, saldo: n(i.saldo), minimo: i.minimo == null ? null : n(i.minimo), p: preverInsumo(i.dow.map(Number), n(i.saldo), i.minimo == null ? null : n(i.minimo), dados.hoje, dias) }))
        .sort((a, b) => (a.p.acabaEm ?? '9999').localeCompare(b.p.acabaEm ?? '9999') || b.p.comprar - a.p.comprar),
    [dados, dias],
  );
  const comprar = linhas.filter((l) => l.p.comprar > 0);
  const d = new Date(`${dia}T12:00:00Z`).getUTCDay();
  const producao = dados.produtos.map((p) => ({ nome: p.nome, q: Number(p.dow[d] ?? 0) })).filter((p) => p.q >= 0.5).sort((a, b) => b.q - a.q);
  const preparo = dados.insumos.map((i) => ({ nome: i.nome, unidade: i.unidade, q: Number(i.dow[d] ?? 0) })).filter((i) => i.q > 0).sort((a, b) => a.nome.localeCompare(b.nome));
  const texto = [`Pedido da ${loja} (previsão para ${dias} dias):`, ...comprar.map((l) => `• ${quantidadeTexto(l.p.comprar, l.unidade)} — ${l.nome}`)].join('\n');

  if (!dados.insumos.length) {
    return (
      <section className="cartao dica" style={{ margin: 0 }}>
        🔮 A previsão aparece depois de algumas semanas de vendas com ficha técnica: ela usa a média de cada dia da semana nas últimas 4 semanas.
      </section>
    );
  }

  return (
    <section className="cartao grade" style={{ gap: '0.6rem' }} aria-label="Previsão">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>🔮 Previsão de compra</h2>
        <div className="abas-metrica" role="group" aria-label="Período">
          {[3, 7, 14].map((x) => (
            <button key={x} type="button" aria-pressed={dias === x} onClick={() => setDias(x)}>{x} dias</button>
          ))}
        </div>
      </div>
      <p className="dica" style={{ margin: 0 }}>
        Pelas vendas de cada dia da semana nas últimas 4 semanas (a sexta pesa como as últimas sextas). Mostra o que acaba antes de {dias} dias e quanto comprar para chegar ao fim do período ainda com o mínimo.
      </p>
      {comprar.length === 0 ? (
        <p style={{ margin: 0 }}>✅ O estoque atual cobre os próximos {dias} dias.</p>
      ) : (
        <>
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr><th>Insumo</th><th className="num">Gasta por dia</th><th className="num">Tem</th><th>Acaba</th><th className="num">Comprar</th><th className="num">Custo</th></tr>
              </thead>
              <tbody>
                {comprar.map((l) => (
                  <tr key={l.id}>
                    <td>{l.nome}{l.fornecedor && <span className="dica" style={{ display: 'block' }}>{l.fornecedor}</span>}</td>
                    <td className="num">{quantidadeTexto(l.p.porDia, l.unidade)}</td>
                    <td className="num">{quantidadeTexto(l.saldo, l.unidade)}</td>
                    <td className={l.p.acabaEm && l.p.acabaEm <= opcoes[1]!.data ? 'erro' : undefined}>
                      {l.p.acabaEm ? (l.p.acabaEm <= dados.hoje ? 'hoje' : `${DIAS_SEMANA[new Date(`${l.p.acabaEm}T12:00:00Z`).getUTCDay()]} ${dataBr(l.p.acabaEm)}`) : 'só o mínimo'}
                    </td>
                    <td className="num"><b>{quantidadeTexto(l.p.comprar, l.unidade)}</b></td>
                    <td className="num">{formatarReais(Math.round(l.p.comprar * n(l.custo)))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="linha" style={{ gap: '0.4rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(texto).then(() => setCopiado(true));
              }}
            >
              {copiado ? 'Copiado ✓' : 'Copiar lista'}
            </button>
            <span className="dica">Total estimado: {formatarReais(Math.round(comprar.reduce((s, l) => s + l.p.comprar * n(l.custo), 0)))}</span>
          </div>
        </>
      )}

      <div className="grade" style={{ gap: '0.4rem', borderTop: '1px solid var(--borda)', paddingTop: '0.6rem' }}>
        <div className="linha" style={{ gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>👩‍🍳 Produção prevista para</h3>
          <select value={dia} onChange={(e) => setDia(e.target.value)} aria-label="Dia">
            {opcoes.map((o) => <option key={o.data} value={o.data}>{o.rotulo}</option>)}
          </select>
        </div>
        {producao.length === 0 && preparo.length === 0 ? (
          <p className="dica" style={{ margin: 0 }}>Sem vendas nesse dia da semana nas últimas 4 semanas.</p>
        ) : (
          <div className="matriz-cardapio">
            <div className="grade" style={{ gap: '0.2rem' }}>
              <strong>Deve vender (média de {DIAS_SEMANA[d]})</strong>
              {producao.slice(0, 15).map((p) => (
                <span key={p.nome} className="linha" style={{ justifyContent: 'space-between' }}><span>{p.nome}</span><b>~{Math.round(p.q)}</b></span>
              ))}
            </div>
            <div className="grade" style={{ gap: '0.2rem' }}>
              <strong>Separe / prepare</strong>
              {preparo.slice(0, 15).map((i) => (
                <span key={i.nome} className="linha" style={{ justifyContent: 'space-between' }}><span>{i.nome}</span><b>{quantidadeTexto(Math.round(i.q * 1000) / 1000, i.unidade)}</b></span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
