'use client';
import { useState, useTransition } from 'react';
import { formatarReais } from '@res/core';
import { salvarMeta } from '@/app/(painel)/resumo/actions';
import { salvando } from '@/components/tempo-real';
import { calcularMeta, type DadosMeta } from '@/lib/meta';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const pct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
const ler = (s: string) => Number(s.replace(/\./g, '').replace(',', '.'));

/** 🎯 Meta do mês com projeção pela média de cada dia da semana (D-064). */
export function MetaMes({ dados, podeEditar }: { dados: DadosMeta; podeEditar: string[] }) {
  const m = calcularMeta(dados);
  const [editando, setEditando] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(dados.lojas.map((l) => [l.loja_id, l.meta ? String(Math.round(l.meta / 100)) : ''])),
  );
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const nomeMes = MESES[Number(dados.mes.slice(5, 7)) - 1];
  const sugestao = m.anteriorTotal > 0 ? Math.ceil((m.anteriorTotal * 1.1) / 100 / 100) * 100 : null; // mês anterior +10%, em reais redondos
  const editaveis = dados.lojas.filter((l) => podeEditar.includes(l.loja_id));

  const salvar = () =>
    iniciar(async () => {
      for (const l of editaveis) {
        const v = valores[l.loja_id]?.trim() ? ler(valores[l.loja_id]!) : 0;
        if ((l.meta ?? 0) / 100 === v && l.meta_do_mes) continue;
        const r = await salvando(salvarMeta(l.loja_id, dados.mes, v));
        if (!r.ok) return setErro(r.erro);
      }
      setErro(null);
      setEditando(false);
    });

  const editor = editando && (
    <div className="grade" style={{ gap: '0.5rem' }}>
      {editaveis.map((l) => (
        <label key={l.loja_id} className="linha" style={{ gap: '0.5rem', alignItems: 'center' }}>
          {dados.lojas.length > 1 && <span style={{ minWidth: '12rem' }}>{l.loja}</span>}
          <span className="dica">R$</span>
          <input inputMode="decimal" value={valores[l.loja_id] ?? ''} placeholder={sugestao && dados.lojas.length === 1 ? String(sugestao) : '0'} onChange={(e) => setValores((v) => ({ ...v, [l.loja_id]: e.target.value }))} style={{ width: '9rem' }} aria-label={`Meta de ${l.loja}`} />
        </label>
      ))}
      {sugestao && <span className="dica">Mês anterior: {formatarReais(m.anteriorTotal)}{dados.lojas.length === 1 ? ` · +10% seria R$ ${sugestao.toLocaleString('pt-BR')}` : ''}. A meta vale para os próximos meses até você trocar.</span>}
      <div className="linha">
        <button type="button" className="botao-primario" disabled={pendente} onClick={salvar}>Salvar meta</button>
        <button type="button" onClick={() => setEditando(false)}>Cancelar</button>
      </div>
      {erro && <p className="erro" style={{ margin: 0 }}>{erro}</p>}
    </div>
  );

  if (m.meta == null) {
    return (
      <section className="cartao grade meta-mes" style={{ gap: '0.5rem' }}>
        <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>🎯 Meta de {nomeMes}</strong>
          {editaveis.length > 0 && !editando && <button type="button" className="mini botao-primario" onClick={() => setEditando(true)}>Definir meta</button>}
        </div>
        {!editando && (
          <span className="dica">
            Vendido até agora: <b>{formatarReais(m.vendido)}</b>
            {m.mesAtual && m.projecao > 0 ? <> · no ritmo atual o mês fecha em <b>{formatarReais(m.projecao)}</b></> : null}. Defina uma meta para ver quanto falta por dia.
          </span>
        )}
        {editor}
      </section>
    );
  }

  const ok = (m.pctProjecao ?? 0) >= 100;
  const largura = Math.min(100, m.pctVendido ?? 0);
  const marca = m.esperadoAteHoje != null && m.meta ? Math.min(100, (m.esperadoAteHoje / m.meta) * 100) : null;
  const varAnt = m.anteriorAteHoje > 0 ? ((m.vendido - m.anteriorAteHoje) / m.anteriorAteHoje) * 100 : null;

  return (
    <section className="cartao grade meta-mes" data-ok={ok || undefined} style={{ gap: '0.6rem' }}>
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>
          <strong>🎯 Meta de {nomeMes}: {formatarReais(m.meta)}</strong>
          {m.semMeta.length > 0 && <span className="dica"> · sem meta: {m.semMeta.join(', ')}</span>}
        </span>
        {editaveis.length > 0 && !editando && <button type="button" className="mini" onClick={() => setEditando(true)}>Mudar meta</button>}
      </div>
      <div className="meta-barra" role="img" aria-label={`Vendido ${pct(m.pctVendido ?? 0)} da meta`}>
        <span className="meta-feito" style={{ width: `${largura}%` }} />
        {marca != null && m.mesAtual && <span className="meta-hoje" style={{ left: `${marca}%` }} title="Onde deveria estar hoje" />}
      </div>
      <div className="meta-numeros">
        <span><span className="dica">Vendido</span><b>{formatarReais(m.vendido)}</b><span className="dica">{pct(m.pctVendido ?? 0)} da meta</span></span>
        {m.mesAtual && (
          <span>
            <span className="dica">Projeção do mês</span>
            <b className={ok ? 'meta-bom' : 'meta-ruim'}>{formatarReais(m.projecao)}</b>
            <span className="dica">{pct(m.pctProjecao ?? 0)} da meta{m.temHistorico ? '' : ' (ritmo do mês)'}</span>
          </span>
        )}
        {m.mesAtual && m.adiantado != null && (
          <span>
            <span className="dica">{m.adiantado >= 0 ? 'Adiantado' : 'Atrasado'} em relação a hoje</span>
            <b className={m.adiantado >= 0 ? 'meta-bom' : 'meta-ruim'}>{formatarReais(Math.abs(m.adiantado))}</b>
            <span className="dica">o ideal até hoje: {formatarReais(m.esperadoAteHoje ?? 0)}</span>
          </span>
        )}
        {m.falta != null && m.falta > 0 && m.porDia != null && (
          <span>
            <span className="dica">Para bater</span>
            <b>{formatarReais(m.porDia)}/dia</b>
            <span className="dica">nos {m.diasRestantes} dias que faltam (com hoje)</span>
          </span>
        )}
        {m.falta === 0 && <span><span className="dica">Meta</span><b className="meta-bom">✅ batida!</b><span className="dica">+{formatarReais(m.vendido - m.meta)} acima</span></span>}
        {varAnt != null && m.mesAtual && (
          <span>
            <span className="dica">vs mês anterior até o dia {m.diaHoje}</span>
            <b className={varAnt >= 0 ? 'meta-bom' : 'meta-ruim'}>{varAnt >= 0 ? '+' : ''}{pct(varAnt)}</b>
            <span className="dica">{formatarReais(m.anteriorAteHoje)}</span>
          </span>
        )}
      </div>
      {!m.temHistorico && m.mesAtual && <span className="dica">A projeção fica mais precisa depois de 2 semanas de vendas no RES (passa a usar a média de cada dia da semana).</span>}
      {editor}
    </section>
  );
}
