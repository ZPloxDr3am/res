import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  formatarReais,
  formatarVariacao,
  hojeNoFuso,
  intervalo,
  PRESET_ROTULO,
  somarDias,
  diasEntre,
  variacao,
  type Intervalo,
  type Preset,
} from '@res/core';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { GraficoDias, type DiaLojas } from '@/components/grafico-dias';
import { GraficoLojas } from '@/components/resumo/grafico-lojas';
import { corDaLoja } from '@/lib/cores';

export const dynamic = 'force-dynamic';

type Metricas = {
  loja_id: string;
  loja: string;
  pedidos: number;
  faturamento: number;
  cancelados: number;
  valor_cancelado: number;
  taxas_entrega: number;
  entrega: number;
  retirada: number;
  balcao: number;
  online: number;
};
type Composicao = { loja_id: string; marca_id: string; marca: string; pedidos: number; produtos: number; frete: number; descontos: number; total: number };
type Resumo = {
  atual: Metricas[];
  anterior: Metricas[];
  /** 0013; ausente se a migração ainda não rodou */
  composicao?: Composicao[];
  composicao_anterior?: Composicao[];
  dias: { dia: string; loja_id: string; faturamento: number; pedidos: number }[];
};

const PRESETS: Preset[] = ['hoje', 'ontem', '7d', '30d', 'mes', 'personalizado'];
const somar = (l: Metricas[], k: keyof Metricas) => l.reduce((s, m) => s + Number(m[k]), 0);
const dataBR = (d: string) => d.split('-').reverse().join('/');

export default async function Resumo({ searchParams }: { searchParams: Promise<{ p?: string; de?: string; ate?: string; loja?: string }> }) {
  const ctx = await contextoLoja();
  const sp = await searchParams;
  const preset = (PRESETS.includes(sp.p as Preset) ? sp.p : 'hoje') as Preset;
  const hoje = hojeNoFuso();
  let periodo: Intervalo;
  let erroPeriodo: string | null = null;
  try {
    periodo = intervalo(preset, hoje, '-03:00', sp.de, sp.ate);
  } catch (e) {
    erroPeriodo = (e as Error).message;
    periodo = intervalo('hoje', hoje);
  }
  const lojaFiltro = ctx.lojas.some((l) => l.id === sp.loja) ? sp.loja! : 'todas';
  const ids = lojaFiltro === 'todas' ? ctx.lojas.map((l) => l.id) : [lojaFiltro];
  // período em andamento termina agora: a comparação usa o mesmo trecho do período anterior
  const fim = periodo.emAndamento ? new Date().toISOString() : periodo.fim;

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('resumo_vendas', { p_lojas: ids, p_inicio: periodo.inicio, p_fim: fim });
  if (error) throw new Error(error.message);
  const r = data as Resumo;

  if (r.atual.length === 0) {
    return (
      <div className="grade">
        <h1>Resumo</h1>
        <p className="cartao dica">Seu acesso não inclui relatórios de vendas. Peça ao dono ou gerente da loja.</p>
      </div>
    );
  }

  const fat = somar(r.atual, 'faturamento');
  const fatAnt = somar(r.anterior, 'faturamento');
  const ped = somar(r.atual, 'pedidos');
  const pedAnt = somar(r.anterior, 'pedidos');
  const ticket = ped ? Math.round(fat / ped) : 0;
  const ticketAnt = pedAnt ? Math.round(fatAnt / pedAnt) : 0;
  const canc = somar(r.atual, 'cancelados');
  const cancAnt = somar(r.anterior, 'cancelados');
  const valCanc = somar(r.atual, 'valor_cancelado');

  // cor fixa por loja: posição no seletor de lojas (não muda com filtro nem ranking)
  const cor = (lojaId: string) => corDaLoja(ctx.lojas.findIndex((l) => l.id === lojaId));
  const lojasCor = ctx.lojas.filter((l) => r.atual.some((m) => m.loja_id === l.id)).map((l) => ({ id: l.id, nome: l.nome, cor: cor(l.id) }));

  // série diária por loja, com zero nos dias sem venda
  const n = diasEntre(periodo.de, periodo.ate) + 1;
  const serie: DiaLojas[] = Array.from({ length: n }, (_, i) => {
    const dia = somarDias(periodo.de, i);
    const porLoja: DiaLojas['porLoja'] = {};
    for (const d of r.dias.filter((x) => x.dia === dia)) porLoja[d.loja_id] = { faturamento: Number(d.faturamento), pedidos: Number(d.pedidos) };
    return { dia, porLoja };
  });

  const desempenho = lojasCor.map((l) => {
    const a = r.atual.find((m) => m.loja_id === l.id)!;
    const b = r.anterior.find((m) => m.loja_id === l.id);
    return { ...l, faturamento: Number(a.faturamento), faturamentoAnt: Number(b?.faturamento ?? 0), pedidos: Number(a.pedidos), pedidosAnt: Number(b?.pedidos ?? 0) };
  });

  const taxas = somar(r.atual, 'taxas_entrega');
  const online = somar(r.atual, 'online');
  const quando = periodo.comparacao.replace(/^vs /, '');

  const href = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const base = { p: preset, de: sp.de, ate: sp.ate, loja: lojaFiltro, ...extra };
    for (const [k, v] of Object.entries(base)) if (v && !(k === 'loja' && v === 'todas')) q.set(k, v);
    return `/resumo?${q.toString()}`;
  };

  return (
    <div className="grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="grade" style={{ gap: '0.1rem' }}>
          <h1 style={{ margin: 0 }}>Resumo</h1>
          <span className="dica">
            {periodo.de === periodo.ate ? dataBR(periodo.de) : `${dataBR(periodo.de)} a ${dataBR(periodo.ate)}`}
            {periodo.emAndamento && ' · até agora'} · {lojaFiltro === 'todas' ? (ctx.lojas.length > 1 ? `todas as ${ctx.lojas.length} lojas` : ctx.lojas[0]?.nome) : ctx.lojas.find((l) => l.id === lojaFiltro)?.nome}
          </span>
        </div>
      </div>

      {/* filtros: uma linha acima de tudo */}
      <form className="filtros" action="/resumo" method="get">
        <div className="segmentos" role="group" aria-label="Período">
          {PRESETS.filter((p) => p !== 'personalizado').map((p) => (
            <Link key={p} href={href({ p, de: undefined, ate: undefined })} aria-current={preset === p ? 'true' : undefined}>
              {PRESET_ROTULO[p]}
            </Link>
          ))}
        </div>
        <input type="hidden" name="p" value="personalizado" />
        <label className="linha" style={{ gap: '0.35rem', alignItems: 'center' }}>
          <span className="dica">De</span>
          <input type="date" name="de" defaultValue={preset === 'personalizado' ? sp.de : periodo.de} max={hoje} />
        </label>
        <label className="linha" style={{ gap: '0.35rem', alignItems: 'center' }}>
          <span className="dica">até</span>
          <input type="date" name="ate" defaultValue={preset === 'personalizado' ? sp.ate : periodo.ate} max={hoje} />
        </label>
        {ctx.lojas.length > 1 && (
          <select name="loja" defaultValue={lojaFiltro} aria-label="Loja">
            <option value="todas">Todas as lojas</option>
            {ctx.lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        )}
        <button className="mini">Aplicar</button>
      </form>
      {erroPeriodo && <p className="erro">{erroPeriodo}</p>}

      <div className="kpis">
        <Kpi
          rotulo="Faturamento"
          valor={formatarReais(fat)}
          atual={fat}
          antes={fatAnt}
          dinheiro
          quando={quando}
          detalhe={n > 1 ? <>Média de <b>{formatarReais(Math.round(fat / n))}</b> por dia.</> : null}
          ajuda={<>Soma dos pedidos não cancelados, já com {formatarReais(taxas)} de frete.</>}
        />
        <Kpi
          rotulo="Pedidos"
          valor={String(ped)}
          atual={ped}
          antes={pedAnt}
          quando={quando}
          detalhe={
            ped > 0 ? (
              <>
                <b>{somar(r.atual, 'entrega')}</b> entrega · <b>{somar(r.atual, 'retirada')}</b> retirada · <b>{somar(r.atual, 'balcao')}</b> balcão
                <br />
                <b>{online}</b> pelo cardápio digital ({Math.round((online / ped) * 100)}%){n > 1 ? <> · média de <b>{(ped / n).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</b>/dia</> : null}
              </>
            ) : null
          }
          ajuda="Pedidos recebidos no período, sem contar os cancelados."
        />
        <Kpi
          rotulo="Ticket médio"
          valor={formatarReais(ticket)}
          atual={ticket}
          antes={ticketAnt}
          dinheiro
          quando={quando}
          ajuda="Quanto cada pedido vale em média: faturamento ÷ pedidos."
        />
        <Kpi
          rotulo="Cancelados"
          valor={String(canc)}
          atual={canc}
          antes={cancAnt}
          inverso
          quando={quando}
          detalhe={canc > 0 ? <><b>{formatarReais(valCanc)}</b> que deixaram de entrar · <b>{Math.round((canc / (canc + ped)) * 100)}%</b> dos pedidos</> : null}
          ajuda="Cancelados não entram no faturamento. Menos é melhor."
        />
      </div>

      {r.composicao && <ComposicaoVendas atual={r.composicao} anterior={r.composicao_anterior ?? []} lojas={lojasCor} porLoja={lojasCor.length > 1} quando={quando} />}

      <section className="cartao grade" style={{ gap: '0.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Desempenho por loja</h2>
        <GraficoLojas lojas={desempenho} comparacao={periodo.comparacao} />
      </section>

      {n > 1 && (
        <section className="cartao grade" style={{ gap: '0.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>Faturamento por dia{lojasCor.length > 1 ? ', por loja' : ''}</h2>
          <GraficoDias serie={serie} lojas={lojasCor} />
        </section>
      )}

      <section className="cartao grade" style={{ gap: '0.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Por loja</h2>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>Loja</th>
                <th className="num">Faturamento</th>
                <th className="num">Participação</th>
                <th className="num">Variação</th>
                <th className="num">Pedidos</th>
                <th className="num">Ticket médio</th>
                <th className="num">Entrega / Retirada / Balcão</th>
                <th className="num">Online</th>
                <th className="num">Cancelados</th>
              </tr>
            </thead>
            <tbody>
              {[...r.atual].sort((a, b) => b.faturamento - a.faturamento).map((m) => {
                const ant = r.anterior.find((x) => x.loja_id === m.loja_id);
                const v = variacao(Number(m.faturamento), Number(ant?.faturamento ?? 0));
                return (
                  <tr key={m.loja_id}>
                    <td><i className="cor-loja" style={{ background: cor(m.loja_id) }} />{m.loja}</td>
                    <td className="num">{formatarReais(Number(m.faturamento))}</td>
                    <td className="num">
                      <span className="barra-part"><span style={{ width: `${fat ? (Number(m.faturamento) / fat) * 100 : 0}%` }} /></span>
                      {fat ? Math.round((Number(m.faturamento) / fat) * 100) : 0}%
                    </td>
                    <td className="num"><Variacao v={v} /></td>
                    <td className="num">{m.pedidos}</td>
                    <td className="num">{m.pedidos ? formatarReais(Math.round(Number(m.faturamento) / m.pedidos)) : '—'}</td>
                    <td className="num">{m.entrega} / {m.retirada} / {m.balcao}</td>
                    <td className="num">{m.online}</td>
                    <td className="num">{m.cancelados}{m.valor_cancelado ? ` (${formatarReais(Number(m.valor_cancelado))})` : ''}</td>
                  </tr>
                );
              })}
            </tbody>
            {r.atual.length > 1 && (
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="num">{formatarReais(fat)}</td>
                  <td className="num">100%</td>
                  <td className="num"><Variacao v={variacao(fat, fatAnt)} /></td>
                  <td className="num">{ped}</td>
                  <td className="num">{formatarReais(ticket)}</td>
                  <td className="num">{somar(r.atual, 'entrega')} / {somar(r.atual, 'retirada')} / {somar(r.atual, 'balcao')}</td>
                  <td className="num">{somar(r.atual, 'online')}</td>
                  <td className="num">{canc}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <p className="dica" style={{ margin: 0 }}>
          Faturamento = pedidos não cancelados (inclui taxa de entrega). Variação {periodo.comparacao}.
        </p>
      </section>
    </div>
  );
}

function Variacao({ v, inverso = false }: { v: number | null; inverso?: boolean }) {
  const t = formatarVariacao(v);
  if (v === null || Math.round(v * 100) === 0) return <span className="var neutra">{v === null ? '— ' : '= '}{t}</span>;
  const bom = inverso ? v < 0 : v > 0;
  return <span className={`var ${bom ? 'boa' : 'ruim'}`}>{v > 0 ? '▲' : '▼'} {t}</span>;
}

function Kpi({
  rotulo,
  valor,
  atual,
  antes,
  quando,
  dinheiro,
  inverso,
  detalhe,
  ajuda,
}: {
  rotulo: string;
  valor: string;
  atual: number;
  antes: number;
  quando: string;
  dinheiro?: boolean;
  inverso?: boolean;
  detalhe?: ReactNode;
  ajuda: ReactNode;
}) {
  const dif = atual - antes;
  const fmt = (x: number) => (dinheiro ? formatarReais(x) : String(x));
  return (
    <div className="cartao kpi">
      <div className="kpi-titulo">
        <strong>{rotulo}</strong>
        <Variacao v={variacao(atual, antes)} inverso={inverso} />
      </div>
      <span className="kpi-valor">{valor}</span>
      <p className="kpi-frase">
        {dif === 0 ? (
          <>Igual a {quando} ({fmt(antes)}).</>
        ) : (
          <>
            <b>{fmt(Math.abs(dif))}</b> {dif > 0 ? 'a mais' : 'a menos'} que {quando} ({fmt(antes)}).
          </>
        )}
      </p>
      {detalhe && <p className="kpi-frase">{detalhe}</p>}
      <p className="kpi-ajuda">{ajuda}</p>
    </div>
  );
}

/** Composição das vendas: de onde vem o faturamento (produtos + frete + acréscimos − descontos). */
function ComposicaoVendas({
  atual,
  anterior,
  lojas,
  porLoja,
  quando,
}: {
  atual: Composicao[];
  anterior: Composicao[];
  lojas: { id: string; nome: string; cor: string }[];
  porLoja: boolean;
  quando: string;
}) {
  type Campo = 'produtos' | 'frete' | 'descontos';
  const soma = (l: Composicao[], c: Campo, f?: (x: Composicao) => boolean) => l.filter((x) => !f || f(x)).reduce((s, x) => s + Number(x[c]), 0);
  // quebra: por loja (com a cor da loja) ou, numa loja só, por cardápio/marca
  const grupos = porLoja
    ? lojas.map((l) => ({ id: l.id, nome: l.nome, cor: l.cor as string | null, f: (x: Composicao) => x.loja_id === l.id }))
    : atual.map((c) => ({ id: c.marca_id, nome: c.marca, cor: null, f: (x: Composicao) => x.marca_id === c.marca_id }));
  const total = soma(atual, 'produtos') + soma(atual, 'frete') - soma(atual, 'descontos');
  const cartoes: { campo: Campo | null; rotulo: string; sinal: string; inverso?: boolean; explica: string }[] = [
    { campo: 'produtos', rotulo: 'Produtos', sinal: '', explica: 'Valor dos itens vendidos, sem frete e antes dos descontos.' },
    { campo: 'frete', rotulo: 'Frete', sinal: '+', explica: 'Taxas de entrega cobradas dos clientes.' },
    { campo: null, rotulo: 'Acréscimos', sinal: '+', explica: 'Taxa de serviço e acréscimos manuais. Entram com o caixa e o salão.' },
    { campo: 'descontos', rotulo: 'Descontos', sinal: '−', inverso: true, explica: 'Descontos dados nos pedidos. Menos é melhor.' },
  ];

  return (
    <section className="cartao grade" style={{ gap: '0.6rem' }}>
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0, fontSize: '1rem' }}>Composição das vendas</h2>
        <span className="kpi-frase">
          Produtos + frete + acréscimos − descontos = <b>{formatarReais(total)}</b> faturados
        </span>
      </div>
      <div className="kpis">
        {cartoes.map((c) => {
          const v = c.campo ? soma(atual, c.campo) : 0;
          const a = c.campo ? soma(anterior, c.campo) : 0;
          return (
            <div key={c.rotulo} className="kpi" style={{ border: '1px solid var(--borda)', borderRadius: 'var(--raio)', padding: '0.75rem' }}>
              <div className="kpi-titulo">
                <strong>{c.sinal && <span className="dica">{c.sinal} </span>}{c.rotulo}</strong>
                {c.campo && <Variacao v={variacao(v, a)} inverso={c.inverso} />}
              </div>
              <span className="kpi-valor" style={{ fontSize: '1.5rem' }}>{formatarReais(v)}</span>
              <p className="kpi-frase">
                {c.campo ? <>antes {formatarReais(a)} ({quando}){total > 0 && c.campo !== 'produtos' ? <> · <b>{((v / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</b> do faturamento</> : null}</> : 'Ainda não lançado no RES.'}
              </p>
              {c.campo && grupos.length > 1 && (
                <ul className="lista" style={{ margin: 0, fontSize: '0.85rem', borderTop: '1px solid var(--borda)', paddingTop: '0.4rem' }}>
                  {grupos.map((g) => {
                    const gv = soma(atual, c.campo!, g.f);
                    const ga = soma(anterior, c.campo!, g.f);
                    return (
                      <li key={g.id} className="linha" style={{ justifyContent: 'space-between', gap: '0.4rem', flexWrap: 'nowrap' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {g.cor ? <i className="cor-loja" style={{ background: g.cor }} /> : <span className="dica">• </span>}
                          {g.nome}
                        </span>
                        <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {formatarReais(gv)} <Variacao v={variacao(gv, ga)} inverso={c.inverso} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="kpi-ajuda">{c.explica}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
