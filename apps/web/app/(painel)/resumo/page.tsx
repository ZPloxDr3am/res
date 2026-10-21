import Link from 'next/link';
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
import { GraficoDias } from '@/components/grafico-dias';

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
type Resumo = { atual: Metricas[]; anterior: Metricas[]; dias: { dia: string; loja_id: string; faturamento: number; pedidos: number }[] };

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

  // série diária (todas as lojas filtradas somadas), com zero nos dias sem venda
  const n = diasEntre(periodo.de, periodo.ate) + 1;
  const serie = Array.from({ length: n }, (_, i) => {
    const dia = somarDias(periodo.de, i);
    const doDia = r.dias.filter((d) => d.dia === dia);
    return { dia, faturamento: doDia.reduce((s, d) => s + Number(d.faturamento), 0), pedidos: doDia.reduce((s, d) => s + Number(d.pedidos), 0) };
  });

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
        <Kpi rotulo="Faturamento" valor={formatarReais(fat)} v={variacao(fat, fatAnt)} comparacao={periodo.comparacao} antes={formatarReais(fatAnt)} />
        <Kpi rotulo="Pedidos" valor={String(ped)} v={variacao(ped, pedAnt)} comparacao={periodo.comparacao} antes={String(pedAnt)} />
        <Kpi rotulo="Ticket médio" valor={formatarReais(ticket)} v={variacao(ticket, ticketAnt)} comparacao={periodo.comparacao} antes={formatarReais(ticketAnt)} />
        <Kpi rotulo="Cancelados" valor={String(canc)} v={variacao(canc, cancAnt)} comparacao={periodo.comparacao} antes={String(cancAnt)} inverso extra={valCanc ? formatarReais(valCanc) : undefined} />
      </div>

      {n > 1 && (
        <section className="cartao grade" style={{ gap: '0.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem' }}>Faturamento por dia</h2>
          <GraficoDias serie={serie} />
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
                    <td>{m.loja}</td>
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

function Kpi({ rotulo, valor, v, comparacao, antes, inverso, extra }: { rotulo: string; valor: string; v: number | null; comparacao: string; antes: string; inverso?: boolean; extra?: string }) {
  return (
    <div className="cartao kpi">
      <span className="dica">{rotulo}</span>
      <strong className="kpi-valor">{valor}</strong>
      {extra && <span className="dica">{extra}</span>}
      <span className="kpi-var">
        <Variacao v={v} inverso={inverso} /> <span className="dica">{comparacao} ({antes})</span>
      </span>
    </div>
  );
}
