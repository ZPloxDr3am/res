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
import { MetaMes } from '@/components/resumo/meta-mes';
import type { DadosMeta } from '@/lib/meta';
import { CartaoBomDia } from '@/components/resumo/bom-dia';
import { FiltroLojas } from '@/components/resumo/filtro-lojas';
import type { BomDia } from '@res/core';

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
  // meta do mês corrente (D-064), das mesmas lojas do filtro
  const [{ data: dm }, { data: eu }] = await Promise.all([
    supabase.rpc('meta_vendas', { p_lojas: ids, p_mes: hoje }),
    supabase.auth.getUser(),
  ]);
  const { data: ms } = await supabase.from('membros').select('loja_id, papel').eq('user_id', eu.user?.id ?? '').eq('ativo', true).in('loja_id', ids);
  const podeMeta = (ms ?? []).filter((m) => m.papel === 'dono' || m.papel === 'gerente').map((m) => m.loja_id as string);
  // ☀️ resumo da manhã (D-105): na tela de hoje, para quem gere a loja em uso
  const { data: bomDia } =
    preset === 'hoje' && (ctx.papel === 'dono' || ctx.papel === 'gerente') ? await supabase.rpc('resumo_manha', { p_loja: ctx.lojaId }) : { data: null };

  if (r.atual.length === 0) {
    return (
      <div className="s-pagina">
        <header className="s-cabecalho">
          <div className="s-cabecalho-texto">
            <p className="s-sobretitulo">Inteligência</p>
            <h1 className="s-titulo">Resumo</h1>
          </div>
        </header>
        <div className="s-vazio" role="status">
          <strong>Seu acesso não inclui os números de vendas.</strong>
          <span>Peça ao dono ou ao gerente da loja para liberar.</span>
        </div>
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

  // contexto explícito: a loja em uso (menu) pode ser outra; os números desta tela são das lojas do filtro
  const lojaUnica = lojaFiltro === 'todas' ? (ctx.lojas.length === 1 ? ctx.lojas[0] : null) : ctx.lojas.find((l) => l.id === lojaFiltro) ?? null;
  const consolidado = !lojaUnica;
  const atualizadoAs = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
  const rotuloPeriodo = preset === 'personalizado' ? 'Período escolhido' : PRESET_ROTULO[preset];
  const datas = periodo.de === periodo.ate ? dataBR(periodo.de) : `${dataBR(periodo.de)} a ${dataBR(periodo.ate)}`;
  const filtroLoja = lojaFiltro === 'todas' ? undefined : lojaFiltro;

  return (
    <div className="s-pagina">
      <header className="s-cabecalho">
        <div className="s-cabecalho-texto">
          <p className="s-sobretitulo">Inteligência</p>
          <h1 className="s-titulo">Resumo</h1>
          <p className="s-subtitulo">
            <strong>{rotuloPeriodo}</strong> · {datas}
            {periodo.emAndamento && ' · até agora'} · comparado com {quando}
          </p>
        </div>
        <span className="s-contexto" title={consolidado ? 'Os números somam todas as lojas que você acessa. A loja em uso, no menu, continua a mesma.' : undefined}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 10l9-6 9 6M5 10v10h14V10M9 20v-6h6v6" />
          </svg>
          {consolidado ? (
            <>
              <strong>Consolidado</strong> · {ctx.lojas.length} lojas
            </>
          ) : (
            <>
              <strong>{lojaUnica!.nome}</strong>
            </>
          )}
          <span aria-hidden="true">·</span> atualizado às {atualizadoAs}
        </span>
      </header>

      {/* filtros: período (atalhos ou datas) e lojas; o título acima sempre mostra o que está aplicado */}
      <div className="s-filtros" role="search" aria-label="Filtros do resumo">
        <nav className="s-segmentos" aria-label="Período">
          {PRESETS.filter((p) => p !== 'personalizado').map((p) => (
            <Link key={p} href={href({ p, de: undefined, ate: undefined })} aria-current={preset === p ? 'true' : undefined}>
              {PRESET_ROTULO[p]}
            </Link>
          ))}
        </nav>
        {ctx.lojas.length > 1 && (
          <FiltroLojas lojas={ctx.lojas.map((l) => ({ id: l.id, nome: l.nome }))} atual={lojaFiltro} base={href({ loja: undefined })} />
        )}
        <form action="/resumo" method="get" aria-label="Escolher datas">
          <input type="hidden" name="p" value="personalizado" />
          {filtroLoja && <input type="hidden" name="loja" value={filtroLoja} />}
          <label className="s-campo">
            De
            <input type="date" name="de" defaultValue={periodo.de} max={hoje} required />
          </label>
          <label className="s-campo">
            até
            <input type="date" name="ate" defaultValue={periodo.ate} max={hoje} required />
          </label>
          <button className="s-botao">Ver período</button>
        </form>
      </div>
      {erroPeriodo && (
        <div className="s-alerta" data-tom="erro" role="alert">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 8v5M12 16.5v.5M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
          <span>{erroPeriodo} Mostrando hoje.</span>
        </div>
      )}

      {/* o que o dono precisa ver em segundos: os quatro números, o faturamento em destaque */}
      <section className="s-kpis" aria-label="Indicadores do período">
        <Kpi
          principal
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
      </section>

      {/* atenção do dia (da loja em uso) ao lado da meta: alertas claros, sem tomar o lugar dos números */}
      {(bomDia || dm) && (
        <div className="s-dupla">
          {bomDia ? (
            <div className="grade" style={{ gap: 'var(--s-2)' }}>
              <p className="s-cartao-nota">
                Para hoje na loja em uso · <strong>{ctx.lojaNome}</strong>
                {consolidado ? ' (o resto da tela soma as lojas do filtro)' : ''}
              </p>
              <CartaoBomDia dados={bomDia as BomDia} loja={ctx.lojaNome} />
            </div>
          ) : null}
          {dm ? <MetaMes key={`${lojaFiltro}-${(dm as DadosMeta).mes}`} dados={dm as DadosMeta} podeEditar={podeMeta} /> : null}
        </div>
      )}

      {r.composicao && <ComposicaoVendas atual={r.composicao} anterior={r.composicao_anterior ?? []} lojas={lojasCor} porLoja={lojasCor.length > 1} quando={quando} />}

      <div className="s-dupla">
        <section className="s-cartao" aria-labelledby="t-desempenho">
          <h2 id="t-desempenho" className="s-cartao-titulo">Desempenho por loja</h2>
          <GraficoLojas lojas={desempenho} comparacao={periodo.comparacao} />
        </section>
        {n > 1 && (
          <section className="s-cartao" aria-labelledby="t-dias">
            <h2 id="t-dias" className="s-cartao-titulo">Faturamento por dia{lojasCor.length > 1 ? ', por loja' : ''}</h2>
            <GraficoDias serie={serie} lojas={lojasCor} />
          </section>
        )}
      </div>

      <section className="s-cartao" aria-labelledby="t-lojas">
        <div className="s-cartao-topo">
          <h2 id="t-lojas" className="s-cartao-titulo">Por loja</h2>
          <p className="s-cartao-nota">Faturamento = pedidos não cancelados (inclui taxa de entrega). Variação {periodo.comparacao}.</p>
        </div>
        <div className="s-tabela-rolagem">
          <table className="s-tabela">
            <thead>
              <tr>
                <th scope="col">Loja</th>
                <th scope="col" className="num">Faturamento</th>
                <th scope="col" className="num">Participação</th>
                <th scope="col" className="num">Variação</th>
                <th scope="col" className="num">Pedidos</th>
                <th scope="col" className="num">Ticket médio</th>
                <th scope="col" className="num">Entrega / Retirada / Balcão</th>
                <th scope="col" className="num">Online</th>
                <th scope="col" className="num">Cancelados</th>
              </tr>
            </thead>
            <tbody>
              {[...r.atual].sort((a, b) => b.faturamento - a.faturamento).map((m) => {
                const ant = r.anterior.find((x) => x.loja_id === m.loja_id);
                const v = variacao(Number(m.faturamento), Number(ant?.faturamento ?? 0));
                const part = fat ? (Number(m.faturamento) / fat) * 100 : 0;
                return (
                  <tr key={m.loja_id}>
                    <th scope="row">
                      <span className="s-loja"><i className="cor-loja" style={{ background: cor(m.loja_id) }} aria-hidden="true" />{m.loja}</span>
                    </th>
                    <td className="num">{formatarReais(Number(m.faturamento))}</td>
                    <td className="num">
                      <span className="s-barra-part" aria-hidden="true"><span style={{ width: `${part}%` }} /></span>
                      {Math.round(part)}%
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
      </section>
    </div>
  );
}

/** Variação contra o período de comparação: seta + sinal + texto (a cor só reforça). */
function Variacao({ v, inverso = false }: { v: number | null; inverso?: boolean }) {
  const t = formatarVariacao(v);
  if (v === null || Math.round(v * 100) === 0) {
    return (
      <span className="s-var" data-tom="neutro">
        <span aria-hidden="true">{v === null ? '—' : '='}</span> {t}
        <span className="s-so-leitor">{v === null ? ' sem base para comparar' : ' sem mudança'}</span>
      </span>
    );
  }
  const bom = inverso ? v < 0 : v > 0;
  return (
    <span className="s-var" data-tom={bom ? 'bom' : 'ruim'}>
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d={v > 0 ? 'M5 1.5 9 8H1z' : 'M5 8.5 1 2h8z'} fill="currentColor" />
      </svg>
      <span className="s-so-leitor">{v > 0 ? 'alta de ' : 'queda de '}</span>
      {t}
    </span>
  );
}

function Kpi({
  rotulo,
  valor,
  atual,
  antes,
  quando,
  dinheiro,
  inverso,
  principal,
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
  principal?: boolean;
  detalhe?: ReactNode;
  ajuda: ReactNode;
}) {
  const dif = atual - antes;
  const fmt = (x: number) => (dinheiro ? formatarReais(x) : String(x));
  return (
    <article className="s-kpi" data-principal={principal ? '' : undefined} aria-label={rotulo}>
      <div className="s-kpi-topo">
        <h2 className="s-kpi-rotulo">{rotulo}</h2>
        <Variacao v={variacao(atual, antes)} inverso={inverso} />
      </div>
      <p className="s-kpi-valor">{valor}</p>
      <p className="s-kpi-comparacao">
        {dif === 0 ? (
          <>Igual a {quando} ({fmt(antes)}).</>
        ) : (
          <>
            <b>{fmt(Math.abs(dif))}</b> {dif > 0 ? 'a mais' : 'a menos'} que {quando} ({fmt(antes)}).
          </>
        )}
      </p>
      {detalhe && <p className="s-kpi-detalhe">{detalhe}</p>}
      <p className="s-kpi-ajuda">{ajuda}</p>
    </article>
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
    <section className="s-cartao" aria-labelledby="t-composicao">
      <div className="s-cartao-topo">
        <h2 id="t-composicao" className="s-cartao-titulo">Composição das vendas</h2>
        <p className="s-kpi-comparacao">
          Produtos + frete + acréscimos − descontos = <b>{formatarReais(total)}</b> faturados
        </p>
      </div>
      <div className="s-composicao">
        {cartoes.map((c) => {
          const v = c.campo ? soma(atual, c.campo) : 0;
          const a = c.campo ? soma(anterior, c.campo) : 0;
          return (
            <div key={c.rotulo} className="s-composicao-item">
              <div className="s-kpi-topo">
                <h3 className="s-kpi-rotulo">{c.sinal && <span aria-hidden="true">{c.sinal} </span>}{c.rotulo}</h3>
                {c.campo && <Variacao v={variacao(v, a)} inverso={c.inverso} />}
              </div>
              <p className="s-kpi-valor s-kpi-valor-m">{formatarReais(v)}</p>
              <p className="s-kpi-detalhe">
                {c.campo ? <>antes {formatarReais(a)} ({quando}){total > 0 && c.campo !== 'produtos' ? <> · <b>{((v / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</b> do faturamento</> : null}</> : 'Ainda não lançado no RES.'}
              </p>
              {c.campo && grupos.length > 1 && (
                <ul className="s-composicao-lista">
                  {grupos.map((g) => {
                    const gv = soma(atual, c.campo!, g.f);
                    const ga = soma(anterior, c.campo!, g.f);
                    return (
                      <li key={g.id}>
                        <span className="s-composicao-nome">
                          {g.cor ? <i className="cor-loja" style={{ background: g.cor }} aria-hidden="true" /> : <span aria-hidden="true">• </span>}
                          {g.nome}
                        </span>
                        <span className="s-num">
                          {formatarReais(gv)} <Variacao v={variacao(gv, ga)} inverso={c.inverso} />
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="s-kpi-ajuda">{c.explica}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
