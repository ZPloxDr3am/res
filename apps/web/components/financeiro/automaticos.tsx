'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { configCustos, gerarContasCustos, lancarNfe } from '@/app/(painel)/financeiro/actions';
import { salvando } from '@/components/tempo-real';
import { brl, dataBr, hojeSP, MESES_LONGOS, type NfePendente } from '@/lib/financeiro';

const nomeMes = (ym: string) => `${MESES_LONGOS[Number(ym.slice(5, 7)) - 1]}/${ym.slice(0, 4)}`;

/** Custos fixos da planilha (Gestão Empresarial) → contas a pagar mês a mês, sem digitar de novo. */
export function CustosFixos({ mes, fixos, totalFixos, lancadosNoMes, auto, dia, doGrupo }: {
  mes: string;
  fixos: number;
  totalFixos: number;
  lancadosNoMes: number;
  auto: boolean;
  dia: number;
  doGrupo: boolean;
}) {
  const [d, setD] = useState(dia);
  const [meses, setMeses] = useState(1);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const faltam = Math.max(0, fixos - lancadosNoMes);

  if (fixos === 0) {
    return (
      <div className="cartao fin-auto">
        <strong>↻ Custos fixos</strong>
        <span className="dica">
          Preencha os valores da planilha de <Link href="/gestao">Custos fixos</Link> (aluguel, luz, salários…) e eles viram contas a pagar aqui, todo mês, sem digitar de novo.
        </span>
      </div>
    );
  }
  return (
    <div className="cartao fin-auto grade" style={{ gap: '0.6rem' }}>
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="grade" style={{ gap: '0.1rem' }}>
          <strong>↻ Custos fixos da planilha{doGrupo ? ' do grupo' : ''}: {fixos} contas · {brl(totalFixos)}/mês</strong>
          <span className="dica">
            {faltam === 0 ? `✅ Todas já estão em ${nomeMes(mes)}.` : `${faltam} ainda não ${faltam === 1 ? 'está' : 'estão'} em ${nomeMes(mes)}.`} Mudou um valor na <Link href="/gestao">planilha</Link>? As contas ainda não pagas acompanham.
          </span>
        </span>
        <label className="check" title="Todo mês novo, as contas dos custos fixos aparecem sozinhas">
          <input
            type="checkbox"
            checked={auto}
            disabled={pendente}
            onChange={(e) => {
              const v = e.target.checked;
              iniciar(async () => {
                const r = await salvando(configCustos(v, d));
                setMsg(r.ok ? { ok: true, t: v ? `Automático ligado.${r.n ? ` ${r.n} contas criadas (este mês e o próximo).` : ''}` : 'Automático desligado.' } : { ok: false, t: r.erro });
              });
            }}
          />
          Automático todo mês
        </label>
      </div>
      <div className="linha" style={{ gap: '0.5rem', alignItems: 'center' }}>
        <label className="linha" style={{ gap: '0.35rem', alignItems: 'center' }}>
          Vencem todo dia
          <input type="number" min={1} max={31} value={d} onChange={(e) => setD(Math.max(1, Math.min(31, Number(e.target.value) || 1)))} style={{ width: '4.2rem' }} />
        </label>
        <select value={meses} onChange={(e) => setMeses(Number(e.target.value))} aria-label="Quantos meses">
          {[1, 3, 6, 12].map((n) => <option key={n} value={n}>{n === 1 ? `só ${nomeMes(mes)}` : `${n} meses a partir de ${nomeMes(mes)}`}</option>)}
        </select>
        <button
          type="button"
          className="botao-primario"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await salvando(gerarContasCustos(mes, d, meses));
              setMsg(r.ok ? { ok: true, t: r.n ? `${r.n} contas trazidas.` : 'Nada novo: já estava tudo lançado (valores conferidos).' } : { ok: false, t: r.erro });
            })
          }
        >
          ↻ Trazer custos fixos
        </button>
      </div>
      {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.t}</span>}
    </div>
  );
}

/** NF-e importadas no estoque que ainda não viraram conta a pagar. */
export function NotasPendentes({ notas }: { notas: NfePendente[] }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const [venc, setVenc] = useState(hojeSP());
  const [vezes, setVezes] = useState(1);
  const [pago, setPago] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  if (notas.length === 0) return null;
  return (
    <div className="cartao grade fin-auto" style={{ gap: '0.5rem' }}>
      <strong>🧾 {notas.length} nota{notas.length > 1 ? 's' : ''} do estoque sem conta a pagar</strong>
      <span className="dica">Notas que você importou no Estoque. Um clique e viram conta a pagar, com o fornecedor cadastrado.</span>
      <ul className="qp-fila">
        {notas.map((n) => (
          <li key={n.id}>
            <span className="grade" style={{ gap: 0, minWidth: 0 }}>
              <strong>{n.emitente ?? 'Fornecedor'} · {brl(n.valor)}</strong>
              <span className="dica">NF-e {n.numero ?? '—'} · emitida {dataBr(n.emissao?.slice(0, 10) ?? null)}</span>
            </span>
            {aberta === n.id ? (
              <span className="linha" style={{ gap: '0.35rem', alignItems: 'center' }}>
                <input type="date" value={venc} onChange={(e) => setVenc(e.target.value)} aria-label="Vencimento" />
                <select value={vezes} onChange={(e) => setVezes(Number(e.target.value))} aria-label="Parcelas">
                  {[1, 2, 3, 4, 5, 6].map((k) => <option key={k} value={k}>{k === 1 ? 'à vista' : `${k}x`}</option>)}
                </select>
                <label className="check"><input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} /> já paguei</label>
                <button
                  type="button"
                  className="mini botao-primario"
                  disabled={pendente}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await salvando(lancarNfe(n.id, venc, vezes, pago));
                      setErro(r.ok ? null : r.erro);
                      if (r.ok) setAberta(null);
                    })
                  }
                >
                  Lançar
                </button>
              </span>
            ) : (
              <button type="button" className="mini" onClick={() => { setAberta(n.id); setVezes(1); setPago(false); }}>Lançar conta</button>
            )}
          </li>
        ))}
      </ul>
      {erro && <p className="erro" role="alert" style={{ margin: 0 }}>{erro}</p>}
    </div>
  );
}
