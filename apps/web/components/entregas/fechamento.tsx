'use client';
import { useState, useTransition } from 'react';
import { formatarKm, formatarReais, fraseAcerto, PAGAMENTO_ROTULO, type EntregaFechamento, type FechamentoMotoboy } from '@res/core';
import { ajustarEntrega } from '@/app/(painel)/entregas/actions';
import { salvando } from '@/components/tempo-real';

type Total = Omit<FechamentoMotoboy, 'id' | 'nome' | 'lista'>;

const hora = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '—');
const FONTE: Record<string, string> = { rota: 'pela rua', reta: 'linha reta', bairro: 'km do bairro', manual: 'ajustado' };

/** Fechamento da noite: soma por motoboy (taxas, km, dinheiro em mãos e acerto). */
export function FechamentoMotoboys({ dia, motoboys, total, erro }: { dia: string; motoboys: FechamentoMotoboy[]; total: Total; erro?: string | null }) {
  const mudarDia = (n: number) => {
    const d = new Date(`${dia}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return `?aba=fechamento&dia=${d.toISOString().slice(0, 10)}`;
  };
  const rotuloDia = new Date(`${dia}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'UTC' });

  return (
    <div className="grade fechamento">
      <div className="linha nao-imprimir" style={{ gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <a className="mini" href={mudarDia(-1)}>← Dia anterior</a>
        <form method="get" className="linha" style={{ gap: '0.35rem' }}>
          <input type="hidden" name="aba" value="fechamento" />
          <input type="date" name="dia" defaultValue={dia} aria-label="Dia" />
          <button className="mini">Ver</button>
        </form>
        <a className="mini" href={mudarDia(1)}>Próximo dia →</a>
        <button type="button" className="mini" onClick={() => { document.querySelectorAll<HTMLDetailsElement>('.fech-motoboy details').forEach((d) => (d.open = true)); window.print(); }}>🖨 Imprimir</button>
      </div>
      <p className="dica" style={{ margin: 0 }}>
        Noite de <strong>{rotuloDia}</strong> (das 05:00 até as 05:00 do dia seguinte) · todas as lojas do grupo. Conta cada pedido que saiu pelo QR da comanda.
      </p>
      {erro && <p className="aviso">{erro}</p>}

      {!erro && motoboys.length === 0 && <p className="cartao dica">Nenhuma entrega saiu com motoboy nesse dia.</p>}

      {motoboys.length > 0 && (
        <section className="cartao grade" aria-label="Total da noite">
          <h2 style={{ margin: 0 }}>Total da noite</h2>
          <div className="fech-numeros">
            <Numero rotulo="Entregas" valor={String(total.entregas)} extra={total.emRota ? `+ ${total.emRota} em rota` : undefined} />
            <Numero rotulo="Km rodados" valor={formatarKm(total.km)} />
            <Numero rotulo="Taxas cobradas dos clientes" valor={formatarReais(total.taxasClientes)} />
            <Numero rotulo="A pagar aos motoboys" valor={formatarReais(total.aReceber)} destaque />
            <Numero rotulo="Dinheiro com os motoboys" valor={formatarReais(total.dinheiro)} />
            <Numero rotulo="Cartão/Pix na porta" valor={formatarReais(total.outros)} />
          </div>
          <p className="dica" style={{ margin: 0 }}>
            Saldo das taxas: {formatarReais(total.taxasClientes - total.aReceber)} ({total.taxasClientes >= total.aReceber ? 'a loja fica com a diferença' : 'a loja completa a diferença'}).
          </p>
        </section>
      )}

      {motoboys.map((m) => (
        <CartaoMotoboy key={m.id} m={m} />
      ))}
    </div>
  );
}

function Numero({ rotulo, valor, extra, destaque }: { rotulo: string; valor: string; extra?: string; destaque?: boolean }) {
  return (
    <div className={destaque ? 'destaque' : undefined}>
      <span>{rotulo}</span>
      <strong>{valor}</strong>
      {extra && <small>{extra}</small>}
    </div>
  );
}

function CartaoMotoboy({ m }: { m: FechamentoMotoboy }) {
  return (
    <section className="cartao grade fech-motoboy" aria-label={`Fechamento de ${m.nome}`}>
      <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>🛵 {m.nome}</h2>
        <strong className={`fech-acerto ${m.acerto > 0 ? 'devolve' : m.acerto < 0 ? 'recebe' : ''}`}>{fraseAcerto(m.acerto, formatarReais)}</strong>
      </div>
      <div className="fech-numeros">
        <Numero rotulo="Entregas" valor={String(m.entregas)} extra={m.emRota ? `+ ${m.emRota} em rota` : undefined} />
        <Numero rotulo="Km" valor={formatarKm(m.km)} />
        <Numero rotulo="Recebe pelas entregas" valor={formatarReais(m.aReceber)} destaque />
        <Numero rotulo="Dinheiro em mãos" valor={formatarReais(m.dinheiro)} />
        <Numero rotulo="Cartão/Pix na porta" valor={formatarReais(m.outros)} />
      </div>
      <p className="dica" style={{ margin: 0 }}>
        Acerto = dinheiro em mãos ({formatarReais(m.dinheiro)}) − valor das entregas ({formatarReais(m.aReceber)}). Se a loja paga o motoboy à parte, ele devolve todo o dinheiro e recebe {formatarReais(m.aReceber)}.
      </p>
      <details>
        <summary>Ver as {m.lista.length} entregas</summary>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Loja</th>
                <th>Bairro</th>
                <th>Saiu</th>
                <th>Entregue</th>
                <th>Pagamento</th>
                <th>Total</th>
                <th>Taxa cliente</th>
                <th>Motoboy</th>
                <th>Km</th>
                <th className="nao-imprimir" />
              </tr>
            </thead>
            <tbody>
              {m.lista.map((e) => (
                <LinhaEntrega key={e.id} e={e} />
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function LinhaEntrega({ e }: { e: EntregaFechamento }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState((e.valor_motoboy / 100).toFixed(2).replace('.', ','));
  const [km, setKm] = useState(e.distancia_km == null ? '' : String(e.distancia_km).replace('.', ','));
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const salvar = () =>
    iniciar(async () => {
      const v = Number(valor.replace(/\s|R\$/g, '').replace(/\./g, '').replace(',', '.'));
      const k = km.trim() ? Number(km.replace(',', '.')) : null;
      if (!Number.isFinite(v) || v < 0 || (k != null && (!Number.isFinite(k) || k < 0))) return setErro('Valor inválido');
      const novoValor = Math.round(v * 100);
      const r = await salvando(ajustarEntrega(e.id, novoValor !== e.valor_motoboy ? novoValor : null, k != null && k !== e.distancia_km ? k : null));
      if (!r.ok) return setErro(r.erro);
      setErro(null);
      setEditando(false);
    });

  return (
    <tr>
      <td>#{e.numero}{e.status !== 'concluido' && <span className="dica"> (em rota)</span>}</td>
      <td>{e.loja}</td>
      <td>{e.bairro ?? '—'}</td>
      <td>{hora(e.saiu_em)}</td>
      <td>{hora(e.concluido_em)}</td>
      <td>{e.pago ? 'Pago antes' : PAGAMENTO_ROTULO[e.pagamento]}</td>
      <td className="num">{formatarReais(e.total)}</td>
      <td className="num">{formatarReais(e.taxa_entrega)}</td>
      <td className="num">
        {editando ? <input value={valor} onChange={(x) => setValor(x.target.value)} inputMode="decimal" style={{ width: '5.5rem' }} aria-label="Valor do motoboy" /> : formatarReais(e.valor_motoboy)}
      </td>
      <td className="num">
        {editando ? (
          <input value={km} onChange={(x) => setKm(x.target.value)} inputMode="decimal" style={{ width: '4.5rem' }} aria-label="Km" />
        ) : (
          <span title={e.distancia_fonte ? FONTE[e.distancia_fonte] : undefined}>
            {formatarKm(e.distancia_km)}
            {e.distancia_fonte && e.distancia_fonte !== 'rota' && <small className="dica"> {FONTE[e.distancia_fonte]}</small>}
          </span>
        )}
      </td>
      <td className="nao-imprimir">
        {editando ? (
          <span className="linha" style={{ gap: '0.25rem' }}>
            <button type="button" className="mini botao-primario" disabled={pendente} onClick={salvar}>OK</button>
            <button type="button" className="mini" onClick={() => setEditando(false)}>×</button>
          </span>
        ) : (
          <button type="button" className="mini" onClick={() => setEditando(true)}>Ajustar</button>
        )}
        {erro && <span className="erro"> {erro}</span>}
      </td>
    </tr>
  );
}
