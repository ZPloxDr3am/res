import type { ReactNode } from 'react';
import Link from 'next/link';
import { formatarReais, hojeNoFuso, intervalo, PRESET_ROTULO, somarDias, type Intervalo, type Preset } from '@res/core';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { curvaAbc, ETAPA, ORIGEM, type LinhaAbc } from '@/lib/relatorios';
import { BaixarCsv } from '@/components/financeiro/baixar';

export const dynamic = 'force-dynamic';

type Produto = { nome: string; qtd: number; valor: number };
type Opcao = { grupo: string; nome: string; qtd: number; valor: number; sabor: boolean };
type Cancelado = { id: string; numero: number; loja_id: string; criado_em: string; cancelado_em: string; valor: number; motivo: string; origem: string; tipo: string; pagamento: string; cliente: string; etapa: string | null; por: string | null };
type Rel = { produtos: Produto[]; opcoes: Opcao[]; pedidos: number; faturamento: number; cancelados: Cancelado[]; dias: Record<string, { valor: number; pedidos: number; cancelados: number }> };

const ABAS = [
  ['operacao', 'Operação'],
  ['abc', 'Curva ABC'],
  ['cancelamentos', 'Cancelamentos'],
  ['calendario', 'Calendário do mês'],
] as const;
type Aba = (typeof ABAS)[number][0];
const PRESETS: Preset[] = ['hoje', 'ontem', '7d', '30d', 'mes', 'personalizado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
type Operacao = {
  valores: { pedidos: number; faturamento: number; produtos: number; frete: number; frete_gratis: number; frete_gratis_pedidos: number; descontos: number; pedidos_com_desconto: number; cupons: number; cupons_pedidos: number; acrescimos: number };
  tempos: { aceite: number | null; preparo: number | null; espera_motoboy: number | null; rota: number | null; total_entrega: number | null; entregas: number; no_prazo: number };
  pico: { dow: number; hora: number; pedidos: number; valor: number }[];
  canais: { origem: string; tipo: string; pedidos: number; valor: number; cancelados: number }[];
  pagamentos: { forma: string; pedidos: number; valor: number }[];
  clientes: { com_telefone: number; novos: number; pedidos_sem_telefone: number };
  bairros: { bairro: string; pedidos: number; valor: number }[];
  pessoas: { nome: string; pedidos: number; valor: number; descontos: number; cancelados: number }[];
  motoboys: { nome: string; entregas: number; rota: number | null; total: number | null; km: number; no_prazo: number }[];
};
const PAGAMENTO: Record<string, string> = { dinheiro: 'Dinheiro', pix: 'Pix', cartao_credito: 'Crédito', cartao_debito: 'Débito', vale_refeicao: 'Vale-refeição', online: 'Online' };
const TIPO: Record<string, string> = { entrega: 'entrega', retirada: 'retirada', balcao: 'balcão', local: 'salão', mesa: 'mesa' };
const min = (v: number | null) => (v == null ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} min`);

function Kpi({ rotulo, valor, sub }: { rotulo: string; valor: ReactNode; sub?: ReactNode }) {
  return (
    <div className="cartao kpi">
      <span className="dica">{rotulo}</span>
      <strong style={{ fontSize: '1.35rem' }}>{valor}</strong>
      {sub && <span className="dica">{sub}</span>}
    </div>
  );
}

function PainelOperacao({ op, varias }: { op: Operacao; varias: boolean }) {
  const v = op.valores;
  const t = op.tempos;
  const ticket = v.pedidos ? Math.round(v.faturamento / v.pedidos) : 0;
  const recorrentes = Math.max(0, op.clientes.com_telefone - op.clientes.novos);
  // pico: só as horas que tiveram pedido
  const horas = [...new Set(op.pico.map((p) => p.hora))].sort((a, b) => a - b);
  const maxPico = Math.max(1, ...op.pico.map((p) => p.pedidos));
  const celula = (d: number, h: number) => op.pico.find((p) => p.dow === d && p.hora === h);
  const totalPorHora = horas.map((h) => ({ h, n: op.pico.filter((p) => p.hora === h).reduce((a, p) => a + p.pedidos, 0) })).sort((a, b) => b.n - a.n);
  return (
    <>
      <h2 style={{ margin: 0 }}>Valores</h2>
      <div className="kpis">
        <Kpi rotulo="Faturamento" valor={formatarReais(v.faturamento)} sub={`${v.pedidos} pedidos · ticket médio ${formatarReais(ticket)}`} />
        <Kpi rotulo="Frete cobrado" valor={formatarReais(v.frete - v.frete_gratis)} sub={`taxas de entrega pagas pelos clientes`} />
        <Kpi rotulo="Frete grátis concedido" valor={formatarReais(v.frete_gratis)} sub={`${v.frete_gratis_pedidos} pedido(s)`} />
        <Kpi rotulo="Cupons concedidos" valor={formatarReais(v.cupons)} sub={`${v.cupons_pedidos} pedido(s) com cupom`} />
        <Kpi rotulo="Descontos (total)" valor={formatarReais(v.descontos)} sub={`${v.pedidos_com_desconto} pedido(s) · cupons, balcão, fidelidade e frete grátis`} />
        <Kpi rotulo="Acréscimos" valor={formatarReais(v.acrescimos)} sub="taxa de serviço e outros: entram com o atendimento por tablet" />
      </div>

      <h2 style={{ margin: 0 }}>Tempos médios</h2>
      <div className="kpis">
        <Kpi rotulo="Para aceitar" valor={min(t.aceite)} sub="do pedido chegar até ir para a cozinha" />
        <Kpi rotulo="Em preparo" valor={min(t.preparo)} sub="de aceito até pronto" />
        <Kpi rotulo="Pronto esperando motoboy" valor={min(t.espera_motoboy)} sub="de pronto até sair" />
        <Kpi rotulo="Em rota" valor={min(t.rota)} sub="de sair até entregar" />
        <Kpi rotulo="Entrega completa" valor={min(t.total_entrega)} sub="do pedido até o cliente" />
        <Kpi rotulo="Entregas no prazo" valor={t.entregas ? pct((t.no_prazo / t.entregas) * 100) : '—'} sub={`${t.no_prazo} de ${t.entregas} entregas`} />
      </div>

      <h2 style={{ margin: 0 }}>Horário de pico</h2>
      {horas.length === 0 ? (
        <p className="cartao dica" style={{ margin: 0 }}>Sem pedidos no período.</p>
      ) : (
        <div className="cartao grade" style={{ gap: '0.5rem' }}>
          <div className="tabela-rolagem">
            <table className="rel-pico">
              <thead><tr><th />{horas.map((h) => <th key={h}>{h}h</th>)}</tr></thead>
              <tbody>
                {SEMANA.map((d, i) => (
                  <tr key={d}>
                    <th>{d}</th>
                    {horas.map((h) => {
                      const c = celula(i, h);
                      return <td key={h} style={{ ['--int' as string]: c ? c.pedidos / maxPico : 0 }} title={c ? `${d} ${h}h: ${c.pedidos} pedidos · ${formatarReais(c.valor)}` : undefined}>{c?.pedidos ?? ''}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <span className="dica">Horas mais fortes: {totalPorHora.slice(0, 3).map((x) => `${x.h}h (${x.n})`).join(' · ')}. Use para escalar cozinha e motoboys.</span>
        </div>
      )}

      <div className="rel-grupos">
        <div className="cartao grade" style={{ gap: '0.35rem' }}>
          <strong>Canais</strong>
          {op.canais.map((c) => (
            <div key={`${c.origem}-${c.tipo}`} className="rel-barra-linha">
              <span>{ORIGEM[c.origem] ?? c.origem} · {TIPO[c.tipo] ?? c.tipo}</span>
              <span className="dica">{c.pedidos} ped.</span>
              <span className="dica">{formatarReais(c.valor)} · ticket {formatarReais(c.pedidos ? Math.round(c.valor / c.pedidos) : 0)}{c.cancelados ? ` · ${c.cancelados}✕` : ''}</span>
            </div>
          ))}
        </div>
        <div className="cartao grade" style={{ gap: '0.35rem' }}>
          <strong>Formas de pagamento</strong>
          {op.pagamentos.map((p) => (
            <div key={p.forma} className="rel-barra-linha">
              <span>{PAGAMENTO[p.forma] ?? p.forma}</span>
              <span className="rel-acc"><span style={{ width: `${(p.valor / Math.max(1, v.faturamento)) * 100}%` }} /></span>
              <span className="dica">{formatarReais(p.valor)} · {p.pedidos}</span>
            </div>
          ))}
        </div>
        <div className="cartao grade" style={{ gap: '0.35rem' }}>
          <strong>Clientes</strong>
          <span><b>{op.clientes.novos}</b> novos · <b>{recorrentes}</b> que já tinham pedido antes</span>
          <span className="dica">{op.clientes.com_telefone ? `${pct((recorrentes / op.clientes.com_telefone) * 100)} voltaram` : ''}{op.clientes.pedidos_sem_telefone ? ` · ${op.clientes.pedidos_sem_telefone} pedido(s) sem telefone` : ''}</span>
          {op.bairros.length > 0 && <strong style={{ marginTop: '0.4rem' }}>Bairros que mais pedem</strong>}
          {op.bairros.slice(0, 8).map((b) => (
            <div key={b.bairro} className="rel-barra-linha">
              <span>{b.bairro}</span>
              <span className="rel-acc"><span style={{ width: `${(b.pedidos / op.bairros[0]!.pedidos) * 100}%` }} /></span>
              <span className="dica">{b.pedidos} · {formatarReais(b.valor)}</span>
            </div>
          ))}
        </div>
      </div>

      <h2 style={{ margin: 0 }}>Por pessoa (pedidos lançados no balcão)</h2>
      {op.pessoas.length === 0 ? (
        <p className="cartao dica" style={{ margin: 0 }}>Nenhum pedido lançado no balcão no período.</p>
      ) : (
        <div className="tabela-rolagem cartao" style={{ padding: 0 }}>
          <table className="tabela">
            <thead><tr><th>Quem lançou</th><th className="num">Pedidos</th><th className="num">Valor</th><th className="num">Ticket médio</th><th className="num">Descontos dados</th><th className="num">Cancelados</th></tr></thead>
            <tbody>
              {op.pessoas.map((p) => (
                <tr key={p.nome}>
                  <td>{p.nome}</td>
                  <td className="num">{p.pedidos}</td>
                  <td className="num">{formatarReais(p.valor)}</td>
                  <td className="num">{formatarReais(p.pedidos ? Math.round(p.valor / p.pedidos) : 0)}</td>
                  <td className="num">{p.descontos ? formatarReais(p.descontos) : '—'}</td>
                  <td className="num">{p.cancelados || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="dica" style={{ margin: 0 }}>Com o atendimento por tablet, os garçons entram aqui também (pedidos, taxa de serviço e up-sell por garçom).</p>

      <h2 style={{ margin: 0 }}>Motoboys</h2>
      {op.motoboys.length === 0 ? (
        <p className="cartao dica" style={{ margin: 0 }}>Nenhuma entrega concluída no período.</p>
      ) : (
        <div className="tabela-rolagem cartao" style={{ padding: 0 }}>
          <table className="tabela">
            <thead><tr><th>Motoboy</th><th className="num">Entregas</th><th className="num">Tempo médio em rota</th><th className="num">Pedido → entregue</th><th className="num">No prazo</th><th className="num">km (linha reta)</th></tr></thead>
            <tbody>
              {op.motoboys.map((m) => (
                <tr key={m.nome}>
                  <td>{m.nome}</td>
                  <td className="num">{m.entregas}</td>
                  <td className="num">{min(m.rota)}</td>
                  <td className="num">{min(m.total)}</td>
                  <td className="num">{m.entregas ? pct((m.no_prazo / m.entregas) * 100) : '—'}</td>
                  <td className="num">{Number(m.km).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {varias && <p className="dica" style={{ margin: 0 }}>Somando as lojas do filtro. Escolha uma loja no topo para ver só ela.</p>}
    </>
  );
}

const pct = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const num = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const dataBR = (d: string) => d.split('-').reverse().join('/');
const hora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Relatórios (D-065): curva ABC (produtos, sabores, adicionais), cancelamentos e calendário do mês. */
export default async function Relatorios({ searchParams }: { searchParams: Promise<{ aba?: string; p?: string; de?: string; ate?: string; loja?: string; mes?: string; ver?: string }> }) {
  const sp = await searchParams;
  const aba: Aba = (ABAS.find(([k]) => k === sp.aba)?.[0] ?? 'operacao') as Aba;
  const ctx = await contextoLoja();
  const hoje = hojeNoFuso();
  const preset = (PRESETS.includes(sp.p as Preset) ? sp.p : '30d') as Preset;
  let periodo: Intervalo;
  let erroPeriodo: string | null = null;
  try {
    periodo = intervalo(preset, hoje, '-03:00', sp.de, sp.ate);
  } catch (e) {
    erroPeriodo = (e as Error).message;
    periodo = intervalo('30d', hoje);
  }
  // calendário: um mês inteiro
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? '') ? sp.mes! : hoje.slice(0, 7);
  const mesIni = `${mes}-01`;
  const prox = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 1)).toISOString().slice(0, 7);
  const lojaFiltro = ctx.lojas.some((l) => l.id === sp.loja) ? sp.loja! : 'todas';
  const ids = lojaFiltro === 'todas' ? ctx.lojas.map((l) => l.id) : [lojaFiltro];
  const inicio = aba === 'calendario' ? `${mesIni}T00:00:00-03:00` : periodo.inicio;
  const fim = aba === 'calendario' ? `${prox}-01T00:00:00-03:00` : periodo.emAndamento ? new Date().toISOString() : periodo.fim;

  const supabase = await criarClienteServidor();
  const { data, error } = aba === 'operacao'
    ? await supabase.rpc('relatorio_operacao', { p_lojas: ids, p_inicio: inicio, p_fim: fim })
    : await supabase.rpc('relatorio_vendas', { p_lojas: ids, p_inicio: inicio, p_fim: fim });
  const r = (aba === 'operacao' ? null : data) as Rel | null;
  const op = (aba === 'operacao' ? data : null) as Operacao | null;

  const href = (extra: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const base = { aba, p: preset, de: sp.de, ate: sp.ate, loja: lojaFiltro, mes: sp.mes, ver: sp.ver, ...extra };
    for (const [k, v] of Object.entries(base)) if (v && !(k === 'loja' && v === 'todas') && !(k === 'aba' && v === 'operacao')) q.set(k, v);
    return `/relatorios?${q.toString()}`;
  };
  const nomeLoja = (id: string) => ctx.lojas.find((l) => l.id === id)?.nome ?? '';

  let corpo: ReactNode = null;
  if (aba === 'operacao') {
    corpo = op ? <PainelOperacao op={op} varias={ids.length > 1} /> : <p className="cartao dica">{error ? (/relatorio_operacao/.test(error.message) ? 'A atualização do banco desta tela ainda não foi aplicada (migração 0068).' : error.message) : 'Seu acesso não inclui relatórios de vendas.'}</p>;
  } else if (!r) {
    corpo = <p className="cartao dica">{error ? (/relatorio_vendas/.test(error.message) ? 'A atualização do banco desta tela ainda não foi aplicada (migração 0066).' : error.message) : 'Seu acesso não inclui relatórios de vendas. Peça ao dono ou gerente da loja.'}</p>;
  } else if (aba === 'abc') {
    const ver = sp.ver === 'sabores' || sp.ver === 'adicionais' ? sp.ver : 'produtos';
    const sabores = r.opcoes.filter((o) => o.sabor);
    const adicionais = r.opcoes.filter((o) => !o.sabor && Number(o.valor) > 0);
    type Linha = { nome: string; sub?: string; qtd: number; valor: number };
    const itens: Linha[] =
      ver === 'produtos' ? r.produtos.map((p) => ({ nome: p.nome, qtd: Number(p.qtd), valor: Number(p.valor) }))
      : ver === 'sabores' ? sabores.map((o) => ({ nome: o.nome, sub: o.grupo, qtd: Number(o.qtd), valor: Number(o.valor) }))
      : adicionais.map((o) => ({ nome: o.nome, sub: o.grupo, qtd: Number(o.qtd), valor: Number(o.valor) }));
    // sabores: pelo número de pizzas (o preço do sabor costuma estar no tamanho); o resto pelo valor
    const porQtd = ver === 'sabores';
    const abc = curvaAbc(itens, (x) => (porQtd ? x.qtd : x.valor));
    const resumo = (c: 'A' | 'B' | 'C') => {
      const xs = abc.filter((x) => x.classe === c);
      return { n: xs.length, pct: xs.reduce((a, x) => a + x.pct, 0) };
    };
    const csv = ['Classe;Item;Grupo;Quantidade;Valor;%;% acumulado', ...abc.map((x) => [x.classe, x.item.nome, x.item.sub ?? '', num(x.item.qtd), (x.item.valor / 100).toFixed(2).replace('.', ','), x.pct.toFixed(1).replace('.', ','), x.acumulado.toFixed(1).replace('.', ',')].join(';'))].join('\n');
    corpo = (
      <>
        <div className="linha" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="segmentos" role="group" aria-label="O quê">
            <Link href={href({ ver: undefined })} aria-current={ver === 'produtos' ? 'true' : undefined}>Produtos ({r.produtos.length})</Link>
            <Link href={href({ ver: 'sabores' })} aria-current={ver === 'sabores' ? 'true' : undefined}>Sabores ({sabores.length})</Link>
            <Link href={href({ ver: 'adicionais' })} aria-current={ver === 'adicionais' ? 'true' : undefined}>Bordas e adicionais ({adicionais.length})</Link>
          </div>
          {abc.length > 0 && <BaixarCsv nome={`curva-abc-${ver}-${periodo.de}.csv`} conteudo={csv} />}
        </div>
        {abc.length === 0 ? (
          <p className="cartao dica" style={{ margin: 0 }}>Nada vendido neste período.</p>
        ) : (
          <>
            <div className="rel-abc-resumo">
              {(['A', 'B', 'C'] as const).map((c) => {
                const x = resumo(c);
                return (
                  <div key={c} className="cartao" data-classe={c}>
                    <strong>Classe {c}</strong>
                    <span><b>{x.n}</b> {x.n === 1 ? 'item' : 'itens'} · {pct(x.pct)} {porQtd ? 'das pizzas' : 'do valor'}</span>
                    <span className="dica">{c === 'A' ? 'Os campeões: nunca deixe faltar, destaque no cardápio.' : c === 'B' ? 'Vendem bem: bons para combos e promoções.' : 'Vendem pouco: reveja preço, foto ou se vale manter.'}</span>
                  </div>
                );
              })}
            </div>
            <div className="tabela-rolagem cartao" style={{ padding: 0 }}>
              <table className="tabela rel-abc">
                <thead>
                  <tr><th>#</th><th>Classe</th><th>{ver === 'produtos' ? 'Produto' : ver === 'sabores' ? 'Sabor' : 'Item'}</th><th className="num">{ver === 'sabores' ? 'Pizzas' : 'Qtd'}</th><th className="num">Valor</th><th className="num">%</th><th>Acumulado</th></tr>
                </thead>
                <tbody>
                  {abc.map((x: LinhaAbc<Linha>, i) => (
                    <tr key={`${x.item.nome}-${i}`} data-classe={x.classe}>
                      <td>{i + 1}</td>
                      <td><span className="rel-classe" data-classe={x.classe}>{x.classe}</span></td>
                      <td style={{ whiteSpace: 'normal' }}>{x.item.nome}{x.item.sub && <span className="dica"> · {x.item.sub}</span>}</td>
                      <td className="num">{num(x.item.qtd)}</td>
                      <td className="num">{x.item.valor ? formatarReais(x.item.valor) : '—'}</td>
                      <td className="num">{pct(x.pct)}</td>
                      <td><span className="rel-acc"><span style={{ width: `${Math.min(100, x.acumulado)}%` }} /></span> {pct(x.acumulado)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="dica" style={{ margin: 0 }}>
              {porQtd ? 'Sabores contados em pizzas inteiras: meia pizza conta 0,5.' : 'Valor cobrado pelos itens (com os adicionais escolhidos).'} Pedidos cancelados não entram. A = itens que somam os primeiros 80%, B = até 95%, C = o resto.
            </p>
          </>
        )}
      </>
    );
  } else if (aba === 'cancelamentos') {
    const cs = r.cancelados.map((c) => ({ ...c, valor: Number(c.valor) }));
    const total = cs.reduce((a, c) => a + c.valor, 0);
    const taxa = r.pedidos > 0 ? (cs.length / r.pedidos) * 100 : 0;
    const agrupar = (k: (c: Cancelado) => string) => {
      const m = new Map<string, { n: number; v: number }>();
      for (const c of cs) {
        const x = m.get(k(c)) ?? { n: 0, v: 0 };
        m.set(k(c), { n: x.n + 1, v: x.v + c.valor });
      }
      return [...m.entries()].sort((a, b) => b[1].n - a[1].n);
    };
    const bloco = (titulo: string, linhas: [string, { n: number; v: number }][]) => (
      <div className="cartao grade" style={{ gap: '0.35rem' }}>
        <strong>{titulo}</strong>
        {linhas.map(([k, x]) => (
          <div key={k} className="rel-barra-linha">
            <span>{k}</span>
            <span className="rel-acc"><span style={{ width: `${(x.n / cs.length) * 100}%` }} /></span>
            <span className="dica">{x.n} · {formatarReais(x.v)}</span>
          </div>
        ))}
      </div>
    );
    corpo =
      cs.length === 0 ? (
        <p className="cartao dica" style={{ margin: 0 }}>✅ Nenhum pedido cancelado neste período.</p>
      ) : (
        <>
          <div className="kpis">
            <div className="cartao kpi"><span className="dica">Cancelados</span><strong style={{ fontSize: '1.5rem' }}>{cs.length}</strong><span className="dica">{pct(taxa)} dos {r.pedidos} pedidos</span></div>
            <div className="cartao kpi"><span className="dica">Valor perdido</span><strong style={{ fontSize: '1.5rem' }}>{formatarReais(total)}</strong><span className="dica">{r.faturamento > 0 ? `${pct((total / (r.faturamento + total)) * 100)} do que entrou` : ''}</span></div>
            <div className="cartao kpi"><span className="dica">Depois de aceitos</span><strong style={{ fontSize: '1.5rem' }}>{cs.filter((c) => c.etapa && c.etapa !== 'novo').length}</strong><span className="dica">já tinham ido para a cozinha (custo de insumo)</span></div>
          </div>
          <div className="rel-grupos">
            {bloco('Por motivo', agrupar((c) => c.motivo))}
            {bloco('Em que etapa', agrupar((c) => (c.etapa ? ETAPA[c.etapa] ?? c.etapa : 'Sem registro')))}
            {bloco('Por canal', agrupar((c) => ORIGEM[c.origem] ?? c.origem))}
            {bloco('Quem cancelou', agrupar((c) => c.por ?? 'Sem registro'))}
          </div>
          <div className="tabela-rolagem cartao" style={{ padding: 0 }}>
            <table className="tabela">
              <thead><tr><th>Pedido</th>{ids.length > 1 && <th>Loja</th>}<th>Feito</th><th>Cancelado</th><th>Cliente</th><th>Motivo</th><th>Etapa</th><th>Por</th><th className="num">Valor</th></tr></thead>
              <tbody>
                {cs.map((c) => (
                  <tr key={c.id}>
                    <td>#{c.numero}</td>
                    {ids.length > 1 && <td>{nomeLoja(c.loja_id)}</td>}
                    <td>{hora(c.criado_em)}</td>
                    <td>{c.cancelado_em ? hora(c.cancelado_em) : '—'}</td>
                    <td>{c.cliente}</td>
                    <td style={{ whiteSpace: 'normal', minWidth: '10rem' }}>{c.motivo}</td>
                    <td>{c.etapa ? ETAPA[c.etapa] ?? c.etapa : '—'}</td>
                    <td>{c.por ?? '—'}</td>
                    <td className="num">{formatarReais(c.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
  } else {
    const ini = new Date(`${mesIni}T12:00:00Z`);
    const diasNoMes = new Date(Date.UTC(ini.getUTCFullYear(), ini.getUTCMonth() + 1, 0)).getUTCDate();
    const valores = Object.values(r.dias).map((d) => Number(d.valor));
    const max = Math.max(1, ...valores);
    const total = valores.reduce((a, b) => a + b, 0);
    const melhor = Object.entries(r.dias).sort((a, b) => Number(b[1].valor) - Number(a[1].valor))[0];
    const vazios = ini.getUTCDay();
    const ant = new Date(Date.UTC(ini.getUTCFullYear(), ini.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
    corpo = (
      <>
        <div className="linha" style={{ alignItems: 'center', gap: '0.5rem' }}>
          <Link className="botao mini" href={href({ mes: ant })}>‹</Link>
          <strong style={{ minWidth: '9rem', textAlign: 'center' }}>{MESES[Number(mes.slice(5, 7)) - 1]} de {mes.slice(0, 4)}</strong>
          <Link className="botao mini" href={href({ mes: prox })}>›</Link>
          <span className="dica">Total {formatarReais(total)}{melhor ? ` · melhor dia: ${dataBR(melhor[0]).slice(0, 5)} (${formatarReais(Number(melhor[1].valor))})` : ''}</span>
        </div>
        <div className="rel-cal" role="table" aria-label="Vendas por dia">
          {SEMANA.map((d) => <span key={d} className="rel-cal-cab" role="columnheader">{d}</span>)}
          {Array.from({ length: vazios }, (_, i) => <span key={`v${i}`} />)}
          {Array.from({ length: diasNoMes }, (_, i) => {
            const dia = somarDias(mesIni, i);
            const d = r.dias[dia];
            const v = Number(d?.valor ?? 0);
            const futuro = dia > hoje;
            return (
              <span key={dia} className="rel-cal-dia" role="cell" data-futuro={futuro || undefined} style={{ ['--int' as string]: v / max }} title={d ? `${d.pedidos} pedidos${d.cancelados ? ` · ${d.cancelados} cancelados` : ''}` : undefined}>
                <b>{i + 1}</b>
                {!futuro && <span>{v ? formatarReais(v) : '—'}</span>}
                {d && <span className="dica">{d.pedidos} ped.{d.cancelados ? ` · ${d.cancelados}✕` : ''}</span>}
              </span>
            );
          })}
        </div>
        <p className="dica" style={{ margin: 0 }}>Cor mais forte = dia que vendeu mais. Passe o mouse (ou toque) para ver os pedidos e cancelados.</p>
      </>
    );
  }

  return (
    <div className="grade">
      <div className="grade" style={{ gap: '0.1rem' }}>
        <h1 style={{ margin: 0 }}>Relatórios</h1>
        <span className="dica">
          {aba === 'calendario' ? `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}` : periodo.de === periodo.ate ? dataBR(periodo.de) : `${dataBR(periodo.de)} a ${dataBR(periodo.ate)}`} ·{' '}
          {lojaFiltro === 'todas' ? (ctx.lojas.length > 1 ? `todas as ${ctx.lojas.length} lojas` : ctx.lojas[0]?.nome) : nomeLoja(lojaFiltro)}
        </span>
      </div>
      <nav className="abas" aria-label="Relatórios">
        {ABAS.map(([k, rot]) => (
          <Link key={k} href={href({ aba: k, ver: undefined })} role="tab" aria-selected={aba === k} className="aba-link">{rot}</Link>
        ))}
      </nav>
      <form className="filtros" action="/relatorios" method="get">
        {aba !== 'operacao' && <input type="hidden" name="aba" value={aba} />}
        {aba !== 'calendario' && (
          <>
            <div className="segmentos" role="group" aria-label="Período">
              {PRESETS.filter((p) => p !== 'personalizado').map((p) => (
                <Link key={p} href={href({ p, de: undefined, ate: undefined })} aria-current={preset === p ? 'true' : undefined}>{PRESET_ROTULO[p]}</Link>
              ))}
            </div>
            <input type="hidden" name="p" value="personalizado" />
            <label className="linha" style={{ gap: '0.35rem', alignItems: 'center' }}><span className="dica">De</span><input type="date" name="de" defaultValue={preset === 'personalizado' ? sp.de : periodo.de} max={hoje} /></label>
            <label className="linha" style={{ gap: '0.35rem', alignItems: 'center' }}><span className="dica">até</span><input type="date" name="ate" defaultValue={preset === 'personalizado' ? sp.ate : periodo.ate} max={hoje} /></label>
          </>
        )}
        {aba === 'calendario' && <input type="hidden" name="mes" value={mes} />}
        {ctx.lojas.length > 1 && (
          <select name="loja" defaultValue={lojaFiltro} aria-label="Loja">
            <option value="todas">Todas as lojas</option>
            {ctx.lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        )}
        <button className="mini">Aplicar</button>
      </form>
      {erroPeriodo && <p className="erro">{erroPeriodo}</p>}
      {corpo}
    </div>
  );
}
