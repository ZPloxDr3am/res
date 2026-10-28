'use client';
import { useState, useTransition } from 'react';
import { salvarCustos } from '@/app/(painel)/gestao/actions';
import { salvando } from '@/components/tempo-real';
import { resumirCustos, type Custo } from '@/lib/gestao';

type Linha = Omit<Custo, 'valor'> & { chave: string; texto: string };

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
/** "1.234,56" / "1234.56" / "" → número (vazio = 0); NaN se inválido */
const ler = (t: string) => {
  const s = t.trim().replace(/\s|R\$|%/g, '');
  if (!s) return 0;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const texto = (n: number) => (n ? n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
let seq = 0;

/** Planilha de custos (D-050): modelo pronto, o dono preenche e acrescenta linhas. */
export function PlanilhaCustos({ inicial, faturamentoBase, faturamento30 }: { inicial: Custo[]; faturamentoBase: number | null; faturamento30: number }) {
  const [linhas, setLinhas] = useState<Linha[]>(() => inicial.map((c) => ({ ...c, chave: c.id ?? `n${seq++}`, texto: texto(c.valor) })));
  const [removidos, setRemovidos] = useState<string[]>([]);
  const [fatTxt, setFatTxt] = useState(texto(faturamentoBase ?? faturamento30));
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [alterado, setAlterado] = useState(false);
  const [pendente, iniciar] = useTransition();

  const faturamento = ler(fatTxt);
  const valores = linhas.map((l) => ({ ...l, valor: ler(l.texto) }));
  const r = resumirCustos(valores.map((v) => ({ ...v, valor: Number.isNaN(v.valor) ? 0 : v.valor })), Number.isNaN(faturamento) ? 0 : faturamento);

  const mudar = (chave: string, x: Partial<Linha>) => {
    setLinhas((ls) => ls.map((l) => (l.chave === chave ? { ...l, ...x } : l)));
    setAlterado(true);
    setMsg(null);
  };
  const remover = (l: Linha) => {
    if (l.id) setRemovidos((x) => [...x, l.id!]);
    setLinhas((ls) => ls.filter((y) => y.chave !== l.chave));
    setAlterado(true);
  };
  const adicionar = (tipo: 'fixo' | 'variavel') => {
    setLinhas((ls) => [...ls, { chave: `n${seq++}`, tipo, nome: '', forma: 'valor', observacao: null, ordem: 999, texto: '' }]);
    setAlterado(true);
  };
  const salvar = () => {
    if (Number.isNaN(faturamento)) return setMsg({ tipo: 'erro', texto: 'Confira o faturamento do mês.' });
    const ruim = valores.find((v) => Number.isNaN(v.valor) || !v.nome.trim() || (v.forma === 'percentual' && v.valor > 100));
    if (ruim) return setMsg({ tipo: 'erro', texto: !ruim.nome.trim() ? 'Dê um nome a cada custo (ou remova a linha vazia).' : `Confira o valor de "${ruim.nome}".` });
    iniciar(async () => {
      const ordenadas = [...valores.filter((v) => v.tipo === 'fixo'), ...valores.filter((v) => v.tipo === 'variavel')];
      const res = await salvando(
        salvarCustos(
          ordenadas.map(({ id, tipo, nome, forma, valor, observacao, ordem }) => ({ id, tipo, nome, forma, valor, observacao, ordem })),
          removidos,
          faturamento || null,
        ),
      );
      if (res.ok) {
        setRemovidos([]);
        setAlterado(false);
      }
      setMsg(res.ok ? { tipo: 'ok', texto: 'Planilha salva.' } : { tipo: 'erro', texto: res.erro });
    });
  };

  const secao = (tipo: 'fixo' | 'variavel') => {
    const ls = valores.filter((l) => l.tipo === tipo);
    const total = tipo === 'fixo' ? r.fixos : r.variaveis;
    return (
      <section className="cartao grade" aria-label={tipo === 'fixo' ? 'Custos fixos' : 'Custos variáveis'}>
        <div>
          <h2 style={{ margin: 0 }}>{tipo === 'fixo' ? 'Custos fixos' : 'Custos variáveis'}</h2>
          <p className="dica" style={{ margin: 0 }}>
            {tipo === 'fixo'
              ? 'Pagos todo mês, vendendo muito ou pouco. Valores por mês.'
              : 'Sobem e descem com as vendas. Use % do faturamento (ex.: imposto 6%) ou R$ no mês.'}
          </p>
        </div>
        <div className="tabela-rolagem">
          <table className="tabela gc-tabela">
            <thead>
              <tr>
                <th>Custo</th>
                {tipo === 'variavel' && <th>Como</th>}
                <th className="num">Valor</th>
                <th className="num">No mês</th>
                <th className="num">% do faturamento</th>
                <th className="nao-imprimir">Observação</th>
                <th className="nao-imprimir" />
              </tr>
            </thead>
            <tbody>
              {ls.map((l) => {
                const mes = l.forma === 'percentual' ? ((Number.isNaN(l.valor) ? 0 : l.valor) * (r.faturamento || 0)) / 100 : Number.isNaN(l.valor) ? 0 : l.valor;
                return (
                  <tr key={l.chave}>
                    <td><input aria-label="Nome do custo" value={l.nome} maxLength={80} placeholder="Ex.: Aluguel do depósito" onChange={(e) => mudar(l.chave, { nome: e.target.value })} /></td>
                    {tipo === 'variavel' && (
                      <td>
                        <select aria-label="Como calcular" value={l.forma} onChange={(e) => mudar(l.chave, { forma: e.target.value as Linha['forma'] })}>
                          <option value="percentual">% das vendas</option>
                          <option value="valor">R$ no mês</option>
                        </select>
                      </td>
                    )}
                    <td className="num">
                      <span className="gc-valor">
                        {l.forma === 'valor' && <span aria-hidden>R$</span>}
                        <input aria-label={`Valor de ${l.nome || 'custo'}`} inputMode="decimal" value={l.texto} placeholder="0,00" onChange={(e) => mudar(l.chave, { texto: e.target.value })} aria-invalid={Number.isNaN(l.valor) || undefined} />
                        {l.forma === 'percentual' && <span aria-hidden>%</span>}
                      </span>
                    </td>
                    <td className="num">{brl(mes)}</td>
                    <td className="num">{r.faturamento > 0 ? pct((mes / r.faturamento) * 100) : '—'}</td>
                    <td className="nao-imprimir"><input aria-label="Observação" value={l.observacao ?? ''} maxLength={200} onChange={(e) => mudar(l.chave, { observacao: e.target.value })} /></td>
                    <td className="nao-imprimir"><button type="button" aria-label={`Remover ${l.nome || 'linha'}`} onClick={() => remover(l)}>✕</button></td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={tipo === 'variavel' ? 3 : 2}>Total</td>
                <td className="num">{brl(total)}</td>
                <td className="num">{r.faturamento > 0 ? pct((total / r.faturamento) * 100) : '—'}</td>
                <td className="nao-imprimir" colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="nao-imprimir">
          <button type="button" onClick={() => adicionar(tipo)}>+ Adicionar custo {tipo === 'fixo' ? 'fixo' : 'variável'}</button>
        </div>
      </section>
    );
  };

  return (
    <div className="grade">
      <section className="cartao grade" aria-label="Faturamento do mês">
        <div className="linha">
          <label>
            Faturamento do mês (R$)
            <input inputMode="decimal" value={fatTxt} onChange={(e) => { setFatTxt(e.target.value); setAlterado(true); }} aria-invalid={Number.isNaN(faturamento) || undefined} style={{ width: '12rem' }} />
          </label>
          {faturamento30 > 0 && (
            <button type="button" className="nao-imprimir" onClick={() => { setFatTxt(texto(faturamento30)); setAlterado(true); }}>
              Usar últimos 30 dias no RES: {brl(faturamento30)}
            </button>
          )}
        </div>
        <p className="dica" style={{ margin: 0 }}>Base para os custos em % e para o ponto de equilíbrio. Pode ser a média dos últimos meses ou a meta.</p>
      </section>

      <section className="kpis" aria-label="Resumo">
        <div className="cartao kpi">
          <span className="dica">Custos fixos</span>
          <strong className="kpi-valor">{brl(r.fixos)}</strong>
          <span className="dica">{r.faturamento > 0 ? `${pct((r.fixos / r.faturamento) * 100)} do faturamento` : 'por mês'}</span>
        </div>
        <div className="cartao kpi">
          <span className="dica">Custos variáveis</span>
          <strong className="kpi-valor">{brl(r.variaveis)}</strong>
          <span className="dica">{r.faturamento > 0 ? `${pct((r.variaveis / r.faturamento) * 100)} do faturamento` : `${pct(r.variaveisPct)} das vendas + ${brl(r.variaveisValor)}`}</span>
        </div>
        <div className="cartao kpi">
          <span className="dica">{r.lucro >= 0 ? 'Sobra no mês (lucro estimado)' : 'Prejuízo estimado no mês'}</span>
          <strong className="kpi-valor" style={{ color: r.lucro >= 0 ? 'var(--sucesso, #15803d)' : 'var(--erro)' }}>{brl(r.lucro)}</strong>
          <span className="dica">{r.faturamento > 0 ? `margem de ${pct(r.margemPct)}` : 'informe o faturamento'}</span>
        </div>
        <div className="cartao kpi">
          <span className="dica">Ponto de equilíbrio</span>
          <strong className="kpi-valor">{r.equilibrio == null ? '—' : brl(r.equilibrio)}</strong>
          <span className="dica">{r.equilibrio == null ? 'os custos variáveis passam de 100%' : `vender isso no mês para empatar (${brl(r.equilibrio / 30)} por dia)`}</span>
        </div>
      </section>

      {secao('fixo')}
      {secao('variavel')}

      <div className="linha nao-imprimir gc-salvar">
        <button type="button" className="botao-primario" disabled={pendente} onClick={salvar}>{pendente ? 'Salvando…' : 'Salvar planilha'}</button>
        <button type="button" onClick={() => window.print()}>Imprimir</button>
        {alterado && !msg && <span className="dica">Há alterações não salvas.</span>}
        {msg && <span className={msg.tipo === 'erro' ? 'erro' : 'dica'} role="status">{msg.texto}</span>}
      </div>
    </div>
  );
}
