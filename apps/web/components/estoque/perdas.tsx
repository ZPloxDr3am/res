'use client';
import { useState, useTransition } from 'react';
import { formatarReais, MOTIVOS_PERDA, resumoPerdas, type MovPerda } from '@res/core';
import { perdaProduto } from '@/app/(painel)/estoque/actions';
import { salvando } from '@/components/tempo-real';

export type DadosPerdas = { perdas: MovPerda[]; consumo_vendas: number };

/** Botões de motivo da perda (preenchem o campo; dá para escrever outro). */
export function MotivosPerda({ valor, mudar }: { valor: string; mudar: (m: string) => void }) {
  return (
    <span className="linha" style={{ gap: '0.3rem', flexWrap: 'wrap' }}>
      {MOTIVOS_PERDA.map((m) => (
        <button key={m} type="button" className="mini" aria-pressed={valor === m} onClick={() => mudar(m)}>{m}</button>
      ))}
    </span>
  );
}

/** 🗑️ Perdas do período (D-109): quanto se perdeu, por quê, em quê; e a perda de um produto pronto. */
export function Perdas({ dados, dias, produtos }: { dados: DadosPerdas; dias: number; produtos: { id: string; nome: string }[] }) {
  const movs = dados.perdas.map((m) => ({ ...m, quantidade: Number(m.quantidade), valor: Number(m.valor) }));
  const r = resumoPerdas(movs);
  const consumo = Number(dados.consumo_vendas);
  const [produto, setProduto] = useState(produtos[0]?.id ?? '');
  const [qtd, setQtd] = useState('1');
  const [motivo, setMotivo] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <section className="cartao grade" style={{ gap: '0.6rem' }} aria-label="Perdas">
      <h3 style={{ margin: 0 }}>🗑️ Perdas · últimos {dias} dias: {formatarReais(r.total)}{consumo > 0 && r.total > 0 ? <span className="dica"> ({(Math.round((r.total / consumo) * 1000) / 10).toLocaleString('pt-BR')}% do que as vendas consumiram)</span> : null}</h3>
      {r.total > 0 ? (
        <div className="matriz-cardapio">
          <div className="grade" style={{ gap: '0.25rem' }}>
            <strong>Por motivo</strong>
            {r.porMotivo.map((m) => (
              <span key={m.motivo} className="linha" style={{ justifyContent: 'space-between' }}><span>{m.motivo} <span className="dica">({m.n})</span></span><b>{formatarReais(m.valor)}</b></span>
            ))}
          </div>
          <div className="grade" style={{ gap: '0.25rem' }}>
            <strong>O que mais se perde</strong>
            {r.porInsumo.slice(0, 8).map((i) => (
              <span key={i.insumo} className="linha" style={{ justifyContent: 'space-between' }}><span>{i.insumo} <span className="dica">{i.quantidade.toLocaleString('pt-BR')} {i.unidade.toLowerCase()}</span></span><b>{formatarReais(i.valor)}</b></span>
            ))}
          </div>
        </div>
      ) : (
        <p className="dica" style={{ margin: 0 }}>Nenhuma perda registrada. Registrar o que se perde (o que venceu, a pizza que caiu) mostra onde o dinheiro está indo.</p>
      )}
      {produtos.length > 0 && (
        <div className="grade" style={{ gap: '0.4rem', borderTop: '1px solid var(--borda)', paddingTop: '0.6rem' }}>
          <strong>Perda de produto pronto</strong>
          <span className="dica">A pizza que caiu, o lanche devolvido: sai do estoque como perda tudo o que a ficha do produto usa.</span>
          <div className="linha" style={{ gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={produto} onChange={(e) => setProduto(e.target.value)} aria-label="Produto" style={{ maxWidth: '16rem' }}>
              {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
            <input type="number" min={1} max={99} value={qtd} onChange={(e) => setQtd(e.target.value)} aria-label="Quantidade" style={{ width: '4.5rem' }} />
            <input value={motivo} maxLength={150} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo" aria-label="Motivo" style={{ maxWidth: '14rem' }} />
            <button
              type="button"
              className="botao-primario"
              disabled={pendente || motivo.trim().length < 3 || !produto}
              onClick={() =>
                iniciar(async () => {
                  const r2 = await salvando(perdaProduto(produto, Math.max(1, Math.min(99, Number(qtd) || 1)), motivo));
                  setMsg(r2.ok ? { ok: true, t: 'Perda registrada.' } : { ok: false, t: r2.erro });
                  if (r2.ok) setMotivo('');
                })
              }
            >
              Registrar perda
            </button>
          </div>
          <MotivosPerda valor={motivo} mudar={setMotivo} />
          {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.t}</span>}
        </div>
      )}
    </section>
  );
}
