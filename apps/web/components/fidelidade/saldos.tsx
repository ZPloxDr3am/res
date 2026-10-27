'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { formatarReais } from '@res/core';
import { ajustarSaldo, buscarSaldos, extratoCliente } from '@/app/(painel)/fidelidade/actions';
import { formatarTelefone } from '@/lib/clientes';
import type { Movimento, SaldoLinha, Saldos } from '@/lib/fidelidade';

const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');
const NATUREZA: Record<Movimento['natureza'], string> = { ganho: 'Ganhou', uso: 'Usou', expirado: 'Venceu', ajuste: 'Ajuste', estorno: 'Estorno (cancelado)' };

/** Saldo de cada cliente, extrato e ajuste manual (D-031). */
export function SaldosFidelidade({ inicial, podeAjustar }: { inicial: Saldos; podeAjustar: boolean }) {
  const [termo, setTermo] = useState('');
  const [dados, setDados] = useState(inicial);
  const [lista, setLista] = useState(inicial.clientes);
  const [aberto, setAberto] = useState<string | null>(null);
  const primeira = useRef(true);

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    let vivo = true;
    const t = setTimeout(() => buscarSaldos(termo.trim()).then((r) => vivo && r && (setDados(r), setLista(r.clientes))), 250);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [termo]);

  const recarregar = () => buscarSaldos(termo.trim()).then((r) => r && (setDados(r), setLista(r.clientes)));

  return (
    <div className="grade">
      <div className="tp-kpis cartao">
        <div><span className="dica">Clientes com saldo</span><strong>{dados.total_clientes}</strong></div>
        <div><span className="dica">Cashback a usar</span><strong>{formatarReais(dados.total_cashback)}</strong><span className="dica">é desconto que pode sair</span></div>
        <div><span className="dica">Pontos acumulados</span><strong>{dados.total_pontos.toLocaleString('pt-BR')}</strong></div>
      </div>
      <input type="search" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar por telefone ou nome…" aria-label="Buscar cliente" style={{ maxWidth: 420 }} />
      {lista.length === 0 && <p className="cartao dica">{termo ? 'Nenhum cliente com saldo encontrado.' : 'Ninguém tem saldo ainda. O saldo aparece quando um pedido é concluído com o programa ligado.'}</p>}
      <div className="grade" style={{ gap: '0.5rem' }}>
        {lista.map((c) => (
          <LinhaSaldo key={c.id} c={c} aberto={aberto === c.id} alternar={() => setAberto(aberto === c.id ? null : c.id)} podeAjustar={podeAjustar} aoAjustar={recarregar} />
        ))}
      </div>
      {lista.length < dados.total_clientes && (
        <button type="button" style={{ justifySelf: 'start' }} onClick={() => buscarSaldos(termo.trim(), lista.length).then((r) => r && setLista((l) => [...l, ...r.clientes]))}>
          Ver mais ({lista.length} de {dados.total_clientes})
        </button>
      )}
    </div>
  );
}

function LinhaSaldo({ c, aberto, alternar, podeAjustar, aoAjustar }: { c: SaldoLinha; aberto: boolean; alternar: () => void; podeAjustar: boolean; aoAjustar: () => void }) {
  const [extrato, setExtrato] = useState<Movimento[] | null>(null);
  const [tipo, setTipo] = useState<'cashback' | 'pontos'>('cashback');
  const [valor, setValor] = useState('');
  const [motivo, setMotivo] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    if (aberto && !extrato) void extratoCliente(c.id).then(setExtrato);
  }, [aberto, extrato, c.id]);

  const ajustar = () =>
    iniciar(async () => {
      const n = Number(valor.replace(',', '.'));
      const v = tipo === 'cashback' ? Math.round(n * 100) : Math.round(n);
      const r = await ajustarSaldo(c.id, tipo, v, motivo);
      setMsg(r.ok ? { ok: true, t: 'Saldo ajustado.' } : { ok: false, t: r.erro });
      if (r.ok) {
        setValor('');
        setMotivo('');
        setExtrato(await extratoCliente(c.id));
        aoAjustar();
      }
    });

  return (
    <article className="cartao grade" style={{ gap: '0.4rem' }}>
      <button type="button" className="cl-topo" onClick={alternar} aria-expanded={aberto}>
        <strong>{c.nome}</strong>
        <span>{formatarTelefone(c.telefone)}</span>
        {c.cashback > 0 && <span className="fid-saldo">💰 {formatarReais(c.cashback)}</span>}
        {c.pontos > 0 && <span className="fid-saldo">⭐ {c.pontos} pts</span>}
        <span className="dica">
          último pedido {data(c.ultimo_pedido_em)}
          {c.cashback_vence_em ? ` · cashback vence ${data(c.cashback_vence_em)}` : ''}
          {c.pontos_vence_em ? ` · pontos vencem ${data(c.pontos_vence_em)}` : ''}
        </span>
      </button>
      {aberto && (
        <div className="grade" style={{ gap: '0.5rem' }}>
          {!extrato && <span className="dica">Carregando extrato…</span>}
          {extrato && (
            <table className="tabela">
              <thead><tr><th>Quando</th><th>O quê</th><th>Valor</th><th>Pedido</th></tr></thead>
              <tbody>
                {extrato.map((m, k) => (
                  <tr key={k}>
                    <td>{new Date(m.em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td>{NATUREZA[m.natureza]}{m.motivo && m.natureza === 'ajuste' ? ` — ${m.motivo}` : ''}</td>
                    <td className={m.valor < 0 ? 'erro' : undefined}>
                      {m.tipo === 'cashback' ? `${m.valor > 0 ? '+' : '−'}${formatarReais(Math.abs(m.valor))}` : `${m.valor > 0 ? '+' : '−'}${Math.abs(Number(m.valor))} pts`}
                    </td>
                    <td>{m.pedido ? `#${m.pedido}${m.loja ? ` · ${m.loja}` : ''}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {podeAjustar && (
            <div className="linha">
              <label>Ajustar
                <select value={tipo} onChange={(e) => setTipo(e.target.value as 'cashback' | 'pontos')}>
                  <option value="cashback">Cashback (R$)</option>
                  <option value="pontos">Pontos</option>
                </select>
              </label>
              <label>Valor (negativo tira)<input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder={tipo === 'cashback' ? '10,00' : '50'} style={{ width: '7rem' }} /></label>
              <label style={{ flex: '1 1 14rem' }}>Motivo<input value={motivo} maxLength={200} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: presente de aniversário; pedido com problema" /></label>
              <button type="button" disabled={pendente || !valor || motivo.trim().length < 3} onClick={ajustar}>{pendente ? 'Salvando…' : 'Ajustar saldo'}</button>
            </div>
          )}
          {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.t}</span>}
        </div>
      )}
    </article>
  );
}
