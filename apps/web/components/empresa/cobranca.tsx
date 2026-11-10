'use client';
import { useState, useTransition } from 'react';
import { reais } from '@res/core';
import { acaoFatura } from '@/app/empresa/actions';

export interface DadosCobranca {
  mrr: number;
  previsto: number;
  contas_pagantes: number;
  lojas_pagantes: number;
  faturas: { id: string; conta: string; conta_id: string; inicio: string; lojas: number; valor: number; vence_em: string; status: 'aberta' | 'paga' | 'cancelada'; forma: string | null; pago_em: string | null; nota: string | null; telefone: string | null }[];
}
const data = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');
const hoje = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

/** Cobrança no painel da empresa (D-085): números do mês e faturas com "marcar como paga". */
export function CobrancaRes({ d }: { d: DadosCobranca }) {
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [filtro, setFiltro] = useState<'abertas' | 'todas'>('abertas');
  const lista = d.faturas.filter((f) => filtro === 'todas' || f.status === 'aberta');
  const vencidas = d.faturas.filter((f) => f.status === 'aberta' && f.vence_em < hoje());
  const fazer = (p: () => Promise<{ ok: boolean; erro?: string }>, ok: string) =>
    iniciar(async () => {
      const r = await p();
      setMsg(r.ok ? { ok: true, t: ok } : { ok: false, t: r.erro ?? 'Não deu certo.' });
    });
  return (
    <div className="grade">
      <div className="kpis">
        <div className="cartao kpi"><span className="dica">Recebido (30 dias)</span><span className="kpi-valor">{reais(Number(d.mrr))}</span></div>
        <div className="cartao kpi"><span className="dica">Previsto por mês</span><span className="kpi-valor">{reais(Number(d.previsto))}</span></div>
        <div className="cartao kpi"><span className="dica">Contas pagantes</span><span className="kpi-valor">{d.contas_pagantes}</span><span className="kpi-frase">{d.lojas_pagantes} loja(s)</span></div>
        <div className="cartao kpi"><span className="dica">Faturas vencidas</span><span className="kpi-valor">{vencidas.length}</span><span className="kpi-frase">{reais(vencidas.reduce((t, f) => t + Number(f.valor), 0))}</span></div>
      </div>
      {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}
      <section className="cartao grade">
        <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Faturas</h2>
          <div className="abas" role="tablist">
            {([['abertas', 'Em aberto'], ['todas', 'Últimos 6 meses']] as const).map(([k, r]) => (
              <button key={k} type="button" role="tab" aria-selected={filtro === k} onClick={() => setFiltro(k)}>{r}</button>
            ))}
          </div>
        </div>
        {lista.length === 0 ? <p className="dica" style={{ margin: 0 }}>Nenhuma fatura aqui.</p> : (
          <table className="mod-matriz">
            <thead><tr><th>Cliente</th><th>Vence</th><th>Valor</th><th>Situação</th><th /></tr></thead>
            <tbody>
              {lista.map((f) => {
                const zap = (f.telefone ?? '').replace(/\D/g, '');
                return (
                  <tr key={f.id}>
                    <td><strong>{f.conta}</strong><br /><span className="dica">{f.lojas} loja(s){zap ? <> · <a href={`https://wa.me/${zap.length <= 11 ? '55' + zap : zap}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></> : null}</span></td>
                    <td>{data(f.vence_em)}{f.status === 'aberta' && f.vence_em < hoje() ? <><br /><span className="erro">vencida</span></> : null}</td>
                    <td>{reais(Number(f.valor))}</td>
                    <td>{f.status === 'paga' ? `Paga ${data(f.pago_em)} (${f.forma === 'pix' ? 'Pix MP' : 'manual'})` : f.status === 'cancelada' ? 'Cancelada' : 'Em aberto'}{f.nota ? <><br /><span className="dica">{f.nota}</span></> : null}</td>
                    <td>
                      {f.status === 'aberta' && (
                        <div className="linha" style={{ gap: '0.3rem', justifyContent: 'flex-end' }}>
                          <button type="button" className="mini botao-primario" disabled={pendente} onClick={() => { const n = prompt('Marcar como paga. Anotação (opcional), ex.: Pix recebido 10/11', ''); if (n === null) return; fazer(() => acaoFatura(f.id, 'pagar', n || null), `${f.conta}: paga, conta ativa por mais 1 mês.`); }}>Marcar paga</button>
                          <button type="button" className="mini" disabled={pendente} onClick={() => fazer(() => acaoFatura(f.id, 'cancelar', null), `${f.conta}: fatura cancelada.`)}>Cancelar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
