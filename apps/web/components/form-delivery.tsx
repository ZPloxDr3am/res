'use client';
import { useState, useTransition } from 'react';
import { formatarReais, PAGAMENTO_ROTULO, type FormaPagamento } from '@res/core';
import { definirStatus, replicarHorarios, salvarConfig, type ConfigDelivery } from '@/app/(painel)/delivery/actions';
import { salvando } from '@/components/tempo-real';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const FORMAS: FormaPagamento[] = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'vale_refeicao'];

const reais = (c: number) => (c / 100).toFixed(2).replace('.', ',');
const centavos = (t: string): number => {
  const s = t.trim().replace(/\s|R\$/g, '');
  if (!s) return 0;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};

export function FormDelivery({
  marcaId,
  nome,
  link,
  qr,
  abertaAgora,
  inicial,
  outrosCardapios = 0,
}: {
  outrosCardapios?: number;
  marcaId: string;
  nome: string;
  link: string;
  qr: string;
  abertaAgora: boolean;
  inicial: ConfigDelivery;
}) {
  const [c, setC] = useState(inicial);
  const [minimoTxt, setMinimoTxt] = useState(reais(inicial.pedidoMinimo));
  const [taxas, setTaxas] = useState(inicial.areas.map((a) => reais(a.taxa)));
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [confirmandoReplicar, setConfirmandoReplicar] = useState(false);
  const [pendente, iniciar] = useTransition();

  const mudarStatus = (status: ConfigDelivery['status']) =>
    iniciar(async () => {
      const r = await salvando(definirStatus(marcaId, status));
      if (r.ok) setC((x) => ({ ...x, status }));
      setMsg(r.ok ? { tipo: 'ok', texto: 'Status atualizado.' } : { tipo: 'erro', texto: r.erro });
    });

  const salvar = () =>
    iniciar(async () => {
      const pedidoMinimo = centavos(minimoTxt);
      const areas = c.areas.map((a, i) => ({ ...a, taxa: centavos(taxas[i] ?? '') }));
      if (Number.isNaN(pedidoMinimo) || areas.some((a) => Number.isNaN(a.taxa))) return setMsg({ tipo: 'erro', texto: 'Há um valor inválido. Use o formato 5,00.' });
      const r = await salvando(salvarConfig(marcaId, { ...c, pedidoMinimo, areas }));
      setMsg(r.ok ? { tipo: 'ok', texto: 'Configuração salva.' } : { tipo: 'erro', texto: r.erro });
    });

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* sem permissão de área de transferência: o link continua visível para copiar à mão */
    }
  };

  return (
    <section className="cartao grade" aria-label={`Delivery de ${nome}`}>
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{nome}</h2>
        <span className={`pub-status ${abertaAgora ? 'aberto' : 'fechado'}`}>{abertaAgora ? 'Aberto agora' : 'Fechado agora'}</span>
      </div>

      <div className="linha" style={{ alignItems: 'center' }}>
        <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR do cardápio" role="img" />
        <div className="grade" style={{ gap: '0.4rem', flex: '1 1 16rem' }}>
          <span className="dica">Link do cardápio</span>
          <a href={link} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{link}</a>
          <div className="linha" style={{ gap: '0.4rem' }}>
            <button type="button" onClick={copiar}>{copiado ? 'Copiado!' : 'Copiar link'}</button>
            <a className="botao" href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`} download={`qr-${nome}.svg`}>Baixar QR</a>
          </div>
        </div>
      </div>

      <fieldset className="linha" style={{ alignItems: 'center' }}>
        <legend>Funcionamento</legend>
        {(['auto', 'aberto', 'fechado'] as const).map((s) => (
          <button key={s} type="button" disabled={pendente} className={c.status === s ? 'botao-primario' : ''} aria-pressed={c.status === s} onClick={() => mudarStatus(s)}>
            {s === 'auto' ? 'Seguir horários' : s === 'aberto' ? 'Abrir agora' : 'Fechar agora'}
          </button>
        ))}
        <span className="dica">"Abrir/Fechar agora" vale até você voltar para "Seguir horários".</span>
      </fieldset>

      <fieldset className="grade" style={{ gap: '0.4rem' }}>
        <legend>Horários</legend>
        {c.horarios.map((h, i) => (
          <div key={i} className="linha" style={{ alignItems: 'center', gap: '0.5rem' }}>
            <select value={h.dia} onChange={(e) => setC({ ...c, horarios: c.horarios.map((x, j) => (j === i ? { ...x, dia: Number(e.target.value) } : x)) })} aria-label="Dia">
              {DIAS.map((d, k) => <option key={d} value={k}>{d}</option>)}
            </select>
            <input type="time" value={h.abre} aria-label="Abre" onChange={(e) => setC({ ...c, horarios: c.horarios.map((x, j) => (j === i ? { ...x, abre: e.target.value } : x)) })} />
            <span className="dica">até</span>
            <input type="time" value={h.fecha} aria-label="Fecha" onChange={(e) => setC({ ...c, horarios: c.horarios.map((x, j) => (j === i ? { ...x, fecha: e.target.value } : x)) })} />
            {h.fecha < h.abre && <span className="dica">(passa da meia-noite)</span>}
            <button type="button" className="dica" onClick={() => setC({ ...c, horarios: c.horarios.filter((_, j) => j !== i) })}>Remover</button>
          </div>
        ))}
        <div className="linha" style={{ gap: '0.4rem' }}>
          <button type="button" onClick={() => setC({ ...c, horarios: [...c.horarios, { dia: 5, abre: '18:00', fecha: '23:00' }] })}>+ Horário</button>
          <button
            type="button"
            onClick={() => {
              const base = c.horarios[0] ?? { dia: 0, abre: '18:00', fecha: '23:00' };
              setC({ ...c, horarios: [0, 1, 2, 3, 4, 5, 6].map((dia) => ({ dia, abre: base.abre, fecha: base.fecha })) });
            }}
          >
            Mesmo horário todos os dias
          </button>
          {outrosCardapios > 0 && !confirmandoReplicar && (
            <button type="button" className="botao-primario" disabled={pendente || c.horarios.length === 0} onClick={() => setConfirmandoReplicar(true)}>
              Replicar para todas as lojas do grupo
            </button>
          )}
        </div>
        {confirmandoReplicar && (
          <div className="aviso grade" style={{ gap: '0.5rem' }}>
            <span>
              Copiar estes {c.horarios.length} horário(s) para os outros <strong>{outrosCardapios} cardápio(s)</strong> das lojas do grupo?
              Os horários que eles têm hoje serão substituídos. Status (aberto/fechado), bairros e taxas não mudam.
            </span>
            <div className="linha" style={{ gap: '0.4rem' }}>
              <button
                type="button"
                className="botao-primario"
                disabled={pendente}
                onClick={() =>
                  iniciar(async () => {
                    const r = await salvando(replicarHorarios(marcaId, c.horarios));
                    setConfirmandoReplicar(false);
                    setMsg(r.ok ? { tipo: 'ok', texto: `Horários salvos aqui e replicados para ${r.n} cardápio(s) do grupo.` } : { tipo: 'erro', texto: r.erro });
                  })
                }
              >
                {pendente ? 'Replicando…' : 'Sim, replicar'}
              </button>
              <button type="button" onClick={() => setConfirmandoReplicar(false)}>Cancelar</button>
            </div>
          </div>
        )}
      </fieldset>

      <fieldset className="grade" style={{ gap: '0.4rem' }}>
        <legend>Bairros atendidos e taxa de entrega</legend>
        {c.areas.map((a, i) => (
          <div key={i} className="linha" style={{ alignItems: 'center', gap: '0.5rem' }}>
            <input type="text" value={a.bairro} placeholder="Bairro" aria-label="Bairro" style={{ flex: '2 1 10rem' }}
              onChange={(e) => setC({ ...c, areas: c.areas.map((x, j) => (j === i ? { ...x, bairro: e.target.value } : x)) })} />
            <input type="text" inputMode="decimal" value={taxas[i] ?? ''} aria-label="Taxa (R$)" style={{ width: '6rem' }}
              onChange={(e) => setTaxas(taxas.map((t, j) => (j === i ? e.target.value : t)))} />
            <label className="check dica">
              <input type="checkbox" checked={a.ativo} onChange={(e) => setC({ ...c, areas: c.areas.map((x, j) => (j === i ? { ...x, ativo: e.target.checked } : x)) })} /> Ativo
            </label>
            <button type="button" className="dica" onClick={() => { setC({ ...c, areas: c.areas.filter((_, j) => j !== i) }); setTaxas(taxas.filter((_, j) => j !== i)); }}>Remover</button>
          </div>
        ))}
        <button type="button" style={{ justifySelf: 'start' }} onClick={() => { setC({ ...c, areas: [...c.areas, { bairro: '', taxa: 0, ativo: true }] }); setTaxas([...taxas, '']); }}>+ Bairro</button>
        {c.aceitaEntrega && c.areas.filter((a) => a.ativo).length === 0 && <p className="aviso">Sem bairros ativos, o cliente só consegue pedir para retirar.</p>}
      </fieldset>

      <fieldset className="grade" style={{ gap: '0.5rem' }}>
        <legend>Regras do pedido</legend>
        <div className="linha">
          <label className="check"><input type="checkbox" checked={c.aceitaEntrega} onChange={(e) => setC({ ...c, aceitaEntrega: e.target.checked })} /> Aceita entrega</label>
          <label className="check"><input type="checkbox" checked={c.aceitaRetirada} onChange={(e) => setC({ ...c, aceitaRetirada: e.target.checked })} /> Aceita retirada</label>
          <label style={{ width: '9rem' }}>Pedido mínimo (R$)<input type="text" inputMode="decimal" value={minimoTxt} onChange={(e) => setMinimoTxt(e.target.value)} /></label>
        </div>
        <div className="linha">
          {FORMAS.map((f) => (
            <label key={f} className="check">
              <input type="checkbox" checked={c.formasPagamento.includes(f)}
                onChange={(e) => setC({ ...c, formasPagamento: e.target.checked ? [...c.formasPagamento, f] : c.formasPagamento.filter((x) => x !== f) })} />
              {PAGAMENTO_ROTULO[f]}
            </label>
          ))}
        </div>
        <label>
          Recado no topo do cardápio (opcional)
          <input type="text" maxLength={300} value={c.mensagem} placeholder={`Ex.: Pedido mínimo ${formatarReais(2000)} · Entregamos até 23h`} onChange={(e) => setC({ ...c, mensagem: e.target.value })} />
        </label>
      </fieldset>

      {msg && <p className={msg.tipo === 'erro' ? 'erro' : 'dica'} role={msg.tipo === 'erro' ? 'alert' : 'status'}>{msg.texto}</p>}
      <button type="button" className="botao-primario" disabled={pendente} onClick={salvar} style={{ justifySelf: 'start' }}>
        {pendente ? 'Salvando…' : 'Salvar configuração'}
      </button>
    </section>
  );
}
