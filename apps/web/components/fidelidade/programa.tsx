'use client';
import { useState, useTransition } from 'react';
import { CANAIS_FIDELIDADE, CONFIG_FIDELIDADE_PADRAO, formatarReais, ganhoFidelidade, type ConfigFidelidade } from '@res/core';
import { copiarPrograma, excluirRecompensa, salvarConfigFidelidade, salvarRecompensa } from '@/app/(painel)/fidelidade/actions';
import { salvando } from '@/components/tempo-real';
import type { PainelFidelidade } from '@/lib/fidelidade';

const PRAZOS = [30, 60, 90, 180, 365];
const TODOS_OS_DIAS = [0, 1, 2, 3, 4, 5, 6];
const reais = (c: number) => (c / 100).toFixed(2).replace('.', ',');
const lerReais = (t: string) => Math.round(Number(t.replace(/\./g, '').replace(',', '.')) * 100);
const num = (t: string) => (t.trim() === '' ? NaN : Number(t.replace(',', '.')));

/** Cashback vale todos os dias, com um % só (D-033): liga ou desliga. */
const semDias = (c: ConfigFidelidade): ConfigFidelidade => ({ ...c, cashbackDias: TODOS_OS_DIAS, cashbackPctDia: {} });

/** Prazo de validade escolhido pelo dono: atalhos ou qualquer número de dias; 0 = não vence. */
function Validade({ rotulo, dias, aoMudar }: { rotulo: string; dias: number; aoMudar: (d: number) => void }) {
  return (
    <div className="grade" style={{ gap: '0.3rem' }}>
      <span><strong>{rotulo}</strong> <span className="dica">(contado a partir do último pedido do cliente nesta loja)</span></span>
      <div className="linha" style={{ gap: '0.4rem', alignItems: 'center' }}>
        <label className="linha" style={{ gap: '0.35rem', alignItems: 'center' }}>
          <input type="number" min={1} max={3650} value={dias || ''} placeholder="—" aria-label={`${rotulo} em dias`} onChange={(e) => aoMudar(Math.min(3650, Math.max(0, Math.round(Number(e.target.value) || 0))))} style={{ width: '6rem' }} />
          dias
        </label>
        {PRAZOS.map((d) => (
          <button key={d} type="button" className="mini" aria-pressed={dias === d} onClick={() => aoMudar(d)}>{d} dias</button>
        ))}
        <button type="button" className="mini" aria-pressed={dias === 0} onClick={() => aoMudar(0)}>Não vence</button>
      </div>
    </div>
  );
}

/** Configuração do cashback, dos pontos e das recompensas (D-031). */
export function ProgramaFidelidade({ painel }: { painel: PainelFidelidade }) {
  const [c, setC] = useState<ConfigFidelidade>(painel.config ?? CONFIG_FIDELIDADE_PADRAO);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const ed = painel.pode_editar;
  const muda = <K extends keyof ConfigFidelidade>(k: K, v: ConfigFidelidade[K]) => setC((x) => ({ ...x, [k]: v }));

  const exemploCash = ganhoFidelidade({ ...c, cashbackAtivo: true, pontosAtivo: false }, { total: 10000, taxaEntrega: 0, dia: 5, canal: c.canais[0] ?? 'balcao', primeiro: false }).cashback;
  const exemploPontos = ganhoFidelidade({ ...c, pontosAtivo: true, cashbackAtivo: false }, { total: 10000, taxaEntrega: 0, dia: 5, canal: c.canais[0] ?? 'balcao', primeiro: false }).pontos;

  const salvar = () =>
    iniciar(async () => {
      setMsg(null);
      const r = await salvando(salvarConfigFidelidade(semDias(c)));
      setMsg(r.ok ? { ok: true, t: `Programa salvo para ${painel.loja}. Vale a partir dos próximos pedidos concluídos nesta loja.` } : { ok: false, t: r.erro });
    });

  return (
    <div className="grade">
      {!ed && <p className="aviso">Só o gestor (ou quem tem a permissão Marketing) muda o programa.</p>}
      <fieldset className="cartao grade fid-bloco" disabled={!ed}>
        <legend>Onde vale</legend>
        <p className="dica" style={{ margin: 0 }}>Cada loja tem o seu programa e o seu saldo: o que o cliente ganha aqui só vale em {painel.loja}.</p>
        <div className="linha" style={{ gap: '1rem' }}>
          {CANAIS_FIDELIDADE.map((k) => (
            <label key={k.id} className="check">
              <input type="checkbox" checked={c.canais.includes(k.id)} onChange={(e) => muda('canais', e.target.checked ? [...c.canais, k.id] : c.canais.filter((x) => x !== k.id))} />
              {k.rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="cartao grade fid-bloco" disabled={!ed} data-ativo={c.cashbackAtivo || undefined}>
        <legend>
          <label className="check fid-chave">
            <input type="checkbox" checked={c.cashbackAtivo} onChange={(e) => muda('cashbackAtivo', e.target.checked)} />
            💰 Cashback {c.cashbackAtivo ? 'ligado' : 'desligado'}
          </label>
        </legend>
        <p className="dica" style={{ margin: 0 }}>O cliente ganha uma % do pedido (sem a taxa de entrega) como saldo e usa como desconto nos próximos pedidos.</p>
        <div className="linha">
          <label>% de volta<input type="number" min={0} max={50} step={0.5} value={c.cashbackPct} onChange={(e) => muda('cashbackPct', num(e.target.value) || 0)} style={{ width: '6rem' }} /></label>
          <label>Saldo mínimo para usar (R$)<input inputMode="decimal" defaultValue={reais(c.cashbackMinimo)} onBlur={(e) => muda('cashbackMinimo', Math.max(0, lerReais(e.target.value) || 0))} style={{ width: '7rem' }} /></label>
          <label>Usar no máximo (% do pedido)<input type="number" min={1} max={100} placeholder="sem limite" value={c.cashbackMaxPct ?? ''} onChange={(e) => muda('cashbackMaxPct', e.target.value === '' ? null : Math.min(100, Math.max(1, num(e.target.value) || 1)))} style={{ width: '7rem' }} /></label>
        </div>
        <Validade rotulo="Prazo para o cliente usar o cashback" dias={c.cashbackValidadeDias} aoMudar={(d) => muda('cashbackValidadeDias', d)} />
        <p className="fid-exemplo">
          Exemplo: pedido de {formatarReais(10000)} → o cliente ganha <strong>{formatarReais(exemploCash)}</strong>.
          {c.cashbackValidadeDias > 0 ? ` Ele tem ${c.cashbackValidadeDias} dias para usar; cada novo pedido aqui renova o prazo.` : ' O saldo não vence.'}
        </p>
      </fieldset>

      <fieldset className="cartao grade fid-bloco" disabled={!ed} data-ativo={c.pontosAtivo || undefined}>
        <legend>
          <label className="check fid-chave">
            <input type="checkbox" checked={c.pontosAtivo} onChange={(e) => muda('pontosAtivo', e.target.checked)} />
            ⭐ Pontos {c.pontosAtivo ? 'ligado' : 'desligado'}
          </label>
        </legend>
        <p className="dica" style={{ margin: 0 }}>O cliente junta pontos e troca por desconto ou por um produto grátis (recompensas abaixo).</p>
        <div className="linha">
          <label>Pontos por R$ 1<input type="number" min={0} max={100} step={0.5} value={c.pontosPorReal} onChange={(e) => muda('pontosPorReal', num(e.target.value) || 0)} style={{ width: '6rem' }} /></label>
          <label>Pontos por R$ 1 de taxa de entrega<input type="number" min={0} max={100} step={0.5} value={c.pontosPorRealTaxa} onChange={(e) => muda('pontosPorRealTaxa', num(e.target.value) || 0)} style={{ width: '6rem' }} /></label>
          <label>Bônus no 1º pedido<input type="number" min={0} max={100000} value={c.pontosBoasVindas} onChange={(e) => muda('pontosBoasVindas', Math.max(0, Math.round(num(e.target.value) || 0)))} style={{ width: '6rem' }} /></label>
        </div>
        <Validade rotulo="Prazo para o cliente resgatar os pontos" dias={c.pontosValidadeDias} aoMudar={(d) => muda('pontosValidadeDias', d)} />
        <p className="fid-exemplo">
          Exemplo: pedido de {formatarReais(10000)} → <strong>{exemploPontos} pontos</strong>
          {c.pontosBoasVindas > 0 ? ` (+${c.pontosBoasVindas} no primeiro pedido)` : ''}. {c.pontosValidadeDias > 0 ? `Ele tem ${c.pontosValidadeDias} dias para resgatar; cada novo pedido aqui renova o prazo.` : 'Os pontos não vencem.'}
        </p>
      </fieldset>

      {ed && (
        <div className="linha" style={{ alignItems: 'center' }}>
          <button type="button" className="botao-primario" disabled={pendente || c.canais.length === 0} onClick={salvar}>{pendente ? 'Salvando…' : `Salvar programa de ${painel.loja}`}</button>
          {painel.outrasLojas.length > 0 && (
            <button
              type="button"
              disabled={pendente || c.canais.length === 0}
              title="Copia as regras de cashback e pontos (não as recompensas nem os saldos)"
              onClick={() =>
                iniciar(async () => {
                  setMsg(null);
                  const r = await salvando(copiarPrograma(semDias(c), painel.outrasLojas.map((l) => l.id)));
                  setMsg(r.ok ? { ok: true, t: `Regras copiadas para ${painel.outrasLojas.map((l) => l.nome).join(', ')}. Cada uma continua com o saldo separado.` } : { ok: false, t: r.erro });
                })
              }
            >
              Copiar estas regras para {painel.outrasLojas.map((l) => l.nome).join(' e ')}
            </button>
          )}
          {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.t}</span>}
        </div>
      )}

      <Recompensas painel={painel} pontosAtivo={c.pontosAtivo} />
    </div>
  );
}

function Recompensas({ painel, pontosAtivo }: { painel: PainelFidelidade; pontosAtivo: boolean }) {
  const [tipo, setTipo] = useState<'desconto' | 'produto'>('desconto');
  const [nome, setNome] = useState('');
  const [pontos, setPontos] = useState('');
  const [valor, setValor] = useState('');
  const [produto, setProduto] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const ed = painel.pode_editar;

  const adicionar = () =>
    iniciar(async () => {
      setMsg(null);
      const p = Math.round(Number(pontos));
      const prod = painel.produtos.find((x) => x.id === produto);
      const n = nome.trim() || (tipo === 'produto' ? `${prod?.nome ?? 'Produto'} grátis` : `R$ ${valor} de desconto`);
      const r = await salvando(salvarRecompensa(null, { tipo, nome: n, pontos: p, valor: tipo === 'desconto' ? lerReais(valor) : null, produto_id: tipo === 'produto' ? produto : null }));
      setMsg(r.ok ? { ok: true, t: 'Recompensa criada.' } : { ok: false, t: r.erro });
      if (r.ok) {
        setNome('');
        setPontos('');
        setValor('');
      }
    });

  const valido = Number(pontos) > 0 && (tipo === 'desconto' ? lerReais(valor) > 0 : !!produto);

  return (
    <section className="cartao grade fid-bloco" aria-label="Recompensas">
      <h2 style={{ margin: 0 }}>🎁 Recompensas de pontos</h2>
      {!pontosAtivo && <p className="dica" style={{ margin: 0 }}>Ligue os pontos acima para os clientes poderem trocar.</p>}
      {painel.recompensas.length === 0 && <p className="dica" style={{ margin: 0 }}>Nenhuma recompensa ainda. Ex.: 100 pontos = R$ 10 de desconto; 300 pontos = uma pizza broto.</p>}
      <ul className="fid-recompensas">
        {painel.recompensas.map((r) => (
          <li key={r.id}>
            <strong>{r.pontos} pts</strong>
            <span>{r.nome}</span>
            <span className="dica">{r.tipo === 'desconto' ? `${formatarReais(r.valor ?? 0)} de desconto` : `produto: ${r.produto ?? '—'} (precisa estar no pedido)`}</span>
            {ed && (
              <button type="button" className="mini" disabled={pendente} onClick={() => iniciar(async () => { const x = await salvando(excluirRecompensa(r.id)); if (!x.ok) setMsg({ ok: false, t: x.erro }); })}>
                Tirar
              </button>
            )}
          </li>
        ))}
      </ul>
      {ed && (
        <div className="linha">
          <label>Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value as 'desconto' | 'produto')}>
              <option value="desconto">Desconto em R$</option>
              <option value="produto">Produto grátis</option>
            </select>
          </label>
          {tipo === 'desconto' ? (
            <label>Desconto (R$)<input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="10,00" style={{ width: '7rem' }} /></label>
          ) : (
            <label>Produto
              <select value={produto} onChange={(e) => setProduto(e.target.value)}>
                <option value="">Escolha…</option>
                {painel.produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </label>
          )}
          <label>Pontos necessários<input type="number" min={1} value={pontos} onChange={(e) => setPontos(e.target.value)} style={{ width: '7rem' }} /></label>
          <label>Nome (opcional)<input value={nome} maxLength={80} onChange={(e) => setNome(e.target.value)} placeholder={tipo === 'produto' ? 'Broto grátis' : 'R$ 10 off'} /></label>
          <button type="button" disabled={pendente || !valido} onClick={adicionar}>Adicionar</button>
        </div>
      )}
      {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}
    </section>
  );
}
