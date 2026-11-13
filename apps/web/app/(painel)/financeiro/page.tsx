import type { ReactNode } from 'react';
import Link from 'next/link';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import {
  brl,
  calcularDre,
  hojeSP,
  MESES_LONGOS,
  pctTxt,
  situacao,
  type Categoria,
  type ContaFin,
  type Fornecedor,
  type Lancamento,
  type MesDre,
  type NfePendente,
  type Taxa,
} from '@/lib/financeiro';
import { Lancamentos } from '@/components/financeiro/lancamentos';
import { CustosFixos, NotasPendentes } from '@/components/financeiro/automaticos';
import { TabelaDre, csvDre } from '@/components/financeiro/dre';
import { FluxoCaixa } from '@/components/financeiro/fluxo';
import { Categorias, Contas, Fornecedores, Taxas } from '@/components/financeiro/cadastros';
import { BaixarCsv } from '@/components/financeiro/baixar';
import { EscolhaModo } from '@/components/gestao/grupo';
import { ExtratoBanco, type ContaEmAberto, type LinhaExtrato } from '@/components/financeiro/extrato';
import { ConferenciaMaquininha, type DadosMaquininha } from '@/components/financeiro/maquininha';
import { escopoFinanceiro } from '@/lib/financeiro-escopo';

export const dynamic = 'force-dynamic';

const ABAS = [
  ['visao', 'Visão do mês'],
  ['contas', 'Contas a pagar e receber'],
  ['extrato', 'Extrato do banco'],
  ['fluxo', 'Fluxo de caixa'],
  ['dre', 'DRE'],
  ['cadastros', 'Cadastros e taxas'],
] as const;
type Aba = (typeof ABAS)[number][0];

const LANC = 'id, loja_id, loja_ref, tipo, descricao, valor, vencimento, competencia, categoria_id, fornecedor_id, conta_id, forma, pago_em, serie, parcela, parcelas, recorrente, origem, observacao';
const normalizar = (l: Record<string, unknown>) => ({ ...l, valor: Number(l.valor) }) as Lancamento;
const somarMes = (ym: string, n: number) => {
  const d = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
const nomeMes = (ym: string) => { const n = MESES_LONGOS[Number(ym.slice(5, 7)) - 1]!; return `${n[0]!.toUpperCase()}${n.slice(1)} de ${ym.slice(0, 4)}`; };

/** Financeiro (D-060): contas a pagar/receber, fluxo de caixa, DRE e cadastros. Só dono e gerente. */
export default async function Financeiro({ searchParams }: { searchParams: Promise<{ aba?: string; mes?: string; ano?: string; ver?: string; loja?: string }> }) {
  const sp = await searchParams;
  const aba: Aba = (ABAS.find(([k]) => k === sp.aba)?.[0] ?? 'visao') as Aba;
  const ctx = await contextoLoja();
  if (ctx.papel !== 'dono' && ctx.papel !== 'gerente') {
    return (
      <div className="grade">
        <h1>Financeiro</h1>
        <p className="cartao dica">Só o dono ou o gerente da loja acessam o Financeiro.</p>
      </div>
    );
  }
  const hoje = hojeSP();
  const mesAtual = hoje.slice(0, 7);
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? '') ? sp.mes! : mesAtual;
  const ano = /^\d{4}$/.test(sp.ano ?? '') ? Number(sp.ano) : Number(hoje.slice(0, 4));
  const ini = `${mes}-01`;
  const fim = `${somarMes(mes, 1)}-01`;

  const supabase = await criarClienteServidor();
  // por loja ou do grupo todo, como na Gestão Empresarial (D-061)
  const esc = await escopoFinanceiro(supabase, ctx);
  const grupo = esc.modo === 'grupo';
  const varias = esc.lojasGrupo.length > 1;
  const escolha = varias && esc.contaId ? (
    <EscolhaModo
      contaId={esc.contaId}
      modo={grupo ? 'grupo' : 'separado'}
      titular={esc.titular}
      lojas={esc.lojasGrupo.map((l) => l.nome)}
      ver={sp.ver === 'grupo' ? 'grupo' : 'loja'}
      destino={`/financeiro?aba=${aba}`}
      rotulos={['Financeiro desta loja', 'Soma do grupo']}
    />
  ) : null;
  if (grupo && !esc.titular) {
    return (
      <div className="grade">
        <h1>Financeiro</h1>
        <p className="cartao dica">O financeiro deste grupo é controlado junto, para as {esc.lojasGrupo.length} lojas, pelo titular da conta.</p>
        {escolha}
      </div>
    );
  }
  // soma do grupo (modo separado): só leitura das lojas que a pessoa gere
  const soma = !grupo && sp.ver === 'grupo' && esc.gestorDoGrupo.length > 1 && aba !== 'cadastros';
  const lojasDre = grupo ? esc.lojasGrupo.map((l) => l.id) : soma ? esc.gestorDoGrupo : [ctx.lojaId];
  // filtro de "de quem é" para as tabelas do financeiro
  type Filtravel = { eq: (c: string, v: string) => unknown; in: (c: string, v: string[]) => unknown };
  const doDono = <Q,>(q: Q): Q => {
    const f = q as unknown as Filtravel;
    return (grupo ? f.eq('grupo_id', esc.contaId!) : soma ? f.in('loja_id', esc.gestorDoGrupo) : f.eq('loja_id', ctx.lojaId)) as Q;
  };

  const { error: erroPrep } = await supabase.rpc('preparar_financeiro', { p_loja: ctx.lojaId });
  const { data: cfg } = grupo
    ? await supabase.from('gestao_conta').select('custos_auto, dia_custos').eq('conta_id', esc.contaId!).maybeSingle()
    : await supabase.from('fin_config').select('custos_auto, dia_custos').eq('loja_id', ctx.lojaId).maybeSingle();
  // automático: o mês corrente e o próximo já entram sozinhos (não duplica)
  if (!soma && cfg?.custos_auto && (aba === 'visao' || aba === 'contas' || aba === 'fluxo')) {
    await supabase.rpc('gerar_contas_custos', { p_loja: ctx.lojaId, p_mes: `${mesAtual}-01`, p_dia: cfg.dia_custos, p_meses: 2 });
  }

  const [cats, forns, contas, taxas] = await Promise.all([
    doDono(supabase.from('fin_categorias').select('id, loja_id, tipo, linha, grupo, nome, ativo, ordem')).order('tipo').order('ordem').order('nome'),
    doDono(supabase.from('fin_fornecedores').select('id, loja_id, nome, documento, telefone, observacao, ativo')).order('ativo', { ascending: false }).order('nome'),
    doDono(supabase.from('fin_contas').select('id, loja_id, nome, tipo, ativo')).order('ordem').order('nome'),
    supabase.from('fin_taxas').select('forma, percentual, fixa, dias').eq('loja_id', ctx.lojaId),
  ]);
  const donos: Record<string, string | null> = {};
  for (const x of [...(cats.data ?? []), ...(forns.data ?? []), ...(contas.data ?? [])]) donos[x.id as string] = (x.loja_id as string | null) ?? null;
  const cad = {
    categorias: (cats.data ?? []) as Categoria[],
    fornecedores: (forns.data ?? []) as Fornecedor[],
    contas: (contas.data ?? []) as ContaFin[],
    ...(soma ? { donos } : {}),
  };
  const lojasProp = grupo && varias ? { lista: esc.lojasGrupo, modo: 'grupo' as const } : soma ? { lista: esc.lojasGrupo.filter((l) => esc.gestorDoGrupo.includes(l.id)), modo: 'soma' as const } : null;
  const erro = erroPrep?.message ?? cats.error?.message;

  const qs = (x: Record<string, string | number | undefined>) =>
    '/financeiro?' + Object.entries({ ...x, ver: soma ? 'grupo' : undefined }).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${v}`).join('&');
  const navMes = (alvo: Aba) => (
    <div className="linha fin-mes" style={{ alignItems: 'center', gap: '0.4rem' }}>
      <Link className="botao mini" href={qs({ aba: alvo, mes: somarMes(mes, -1) })} aria-label="Mês anterior">‹</Link>
      <strong style={{ minWidth: '10rem', textAlign: 'center' }}>{nomeMes(mes)}</strong>
      <Link className="botao mini" href={qs({ aba: alvo, mes: somarMes(mes, 1) })} aria-label="Próximo mês">›</Link>
      {mes !== mesAtual && <Link className="mini" href={qs({ aba: alvo })}>voltar para hoje</Link>}
    </div>
  );

  let corpo: ReactNode = null;

  if (aba === 'visao' || aba === 'contas') {
    const [doMes, atrasadas, dre, custos, notas] = await Promise.all([
      doDono(supabase.from('fin_lancamentos').select(LANC)).gte('vencimento', ini).lt('vencimento', fim).order('vencimento').limit(2000),
      // contas vencidas de meses anteriores ainda não pagas aparecem no mês corrente
      mes === mesAtual
        ? doDono(supabase.from('fin_lancamentos').select(LANC)).lt('vencimento', ini).is('pago_em', null).order('vencimento').limit(500)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      aba === 'visao' ? supabase.rpc('dre_financeiro', { p_lojas: lojasDre, p_ano: Number(mes.slice(0, 4)) }) : Promise.resolve({ data: null }),
      aba === 'visao' && !soma ? custosFixos(supabase, ctx.lojaId, esc.contaId, grupo) : Promise.resolve(null),
      aba === 'visao' && !soma ? supabase.rpc('nfe_sem_conta', { p_loja: ctx.lojaId }) : Promise.resolve({ data: [] }),
    ]);
    const lancs = [...((atrasadas.data ?? []) as Record<string, unknown>[]), ...((doMes.data ?? []) as Record<string, unknown>[])].map(normalizar);

    if (aba === 'contas') {
      corpo = (
        <>
          {navMes('contas')}
          <Lancamentos lancamentos={lancs} cad={cad} lojas={lojasProp} />
        </>
      );
    } else {
      const m = ((dre.data as { meses?: MesDre[] } | null)?.meses ?? []).find((x) => x.mes === Number(mes.slice(5, 7)));
      const d = m ? calcularDre({ ...m, vendas: Number(m.vendas), taxas: Number(m.taxas) }) : null;
      const desp = lancs.filter((l) => l.tipo === 'despesa');
      const pagar = desp.filter((l) => !l.pago_em).reduce((a, l) => a + l.valor, 0);
      const pago = desp.filter((l) => l.pago_em).reduce((a, l) => a + l.valor, 0);
      const vencidas = lancs.filter((l) => situacao(l, hoje) === 'vencido');
      const vHoje = lancs.filter((l) => situacao(l, hoje) === 'hoje');
      const lancadosNoMes = new Set(doMes.data?.filter((l) => l.origem === 'custo').map((l) => l.descricao as string)).size;
      corpo = (
        <>
          {navMes('visao')}
          {(vencidas.length > 0 || vHoje.length > 0) && mes === mesAtual && (
            <div className="fin-alertas">
              {vencidas.length > 0 && <span className="fin-selo" data-sit="vencido">⚠️ {vencidas.length} vencida{vencidas.length > 1 ? 's' : ''} · {brl(vencidas.reduce((a, l) => a + l.valor, 0))}</span>}
              {vHoje.length > 0 && <span className="fin-selo" data-sit="hoje">📅 {vHoje.length} vence{vHoje.length > 1 ? 'm' : ''} hoje · {brl(vHoje.reduce((a, l) => a + l.valor, 0))}</span>}
            </div>
          )}
          <div className="fin-cartoes">
            <Cartao rotulo="Vendas do mês" valor={brl(d?.vendas ?? 0)} sub={`${m?.pedidos ?? 0} pedidos concluídos`} />
            <Cartao rotulo="Taxas das vendas" valor={brl(d?.taxas ?? 0)} sub={(d?.vendas ?? 0) > 0 ? `${pctTxt(((d?.taxas ?? 0) / (d?.vendas ?? 1)) * 100)} das vendas` : 'configure em Cadastros'} />
            <Cartao rotulo="Já paguei" valor={brl(pago)} sub={`contas vencendo em ${MESES_LONGOS[Number(mes.slice(5, 7)) - 1]}`} />
            <Cartao rotulo="Falta pagar" valor={brl(pagar)} sub={vencidas.length ? `inclui ${brl(vencidas.filter((l) => l.tipo === 'despesa').reduce((a, l) => a + l.valor, 0))} vencidas` : 'até o fim do mês'} destaque={pagar > 0} />
            <Cartao rotulo="Resultado do mês" valor={brl(d?.liquido ?? 0)} sub={d?.margem != null ? `margem ${pctTxt(d.margem)}${d.cmvPct != null ? ` · CMV ${pctTxt(d.cmvPct)}` : ''}` : 'vendas − custos − despesas'} negativo={(d?.liquido ?? 0) < 0} />
          </div>
          {custos && <CustosFixos mes={mes} fixos={custos.n} totalFixos={custos.total} lancadosNoMes={lancadosNoMes} auto={!!cfg?.custos_auto} dia={Number(cfg?.dia_custos ?? 10)} doGrupo={custos.grupo} />}
          <NotasPendentes notas={((notas.data ?? []) as NfePendente[]).map((n) => ({ ...n, valor: Number(n.valor) }))} />
          <Lancamentos lancamentos={lancs.filter((l) => !l.pago_em)} cad={cad} lojas={lojasProp} titulo="Em aberto neste mês" compacto />
          <p className="dica" style={{ margin: 0 }}>
            Tudo do mês (inclusive o que já foi pago) em <Link href={qs({ aba: 'contas', mes })}>Contas a pagar e receber</Link>.
          </p>
        </>
      );
    }
  } else if (aba === 'extrato') {
    if (soma) {
      corpo = <p className="cartao dica" style={{ margin: 0 }}>O extrato é de cada loja: abra o financeiro de uma loja para importar e conferir.</p>;
    } else {
      // extrato dos últimos 6 meses; contas em aberto de 4 meses atrás até 2 meses à frente
      const dia = (n: number) => new Date(Date.parse(`${hoje}T12:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);
      const [ext, abertas, maq] = await Promise.all([
        doDono(supabase.from('fin_extrato').select('id, conta_id, data, valor, descricao, lancamento_id, criou, ignorado, lanc:fin_lancamentos(descricao, valor, vencimento)'))
          .gte('data', dia(-183))
          .order('data', { ascending: false })
          .limit(3000),
        doDono(supabase.from('fin_lancamentos').select('id, tipo, descricao, valor, vencimento')).is('pago_em', null).gte('vencimento', dia(-120)).lte('vencimento', dia(60)).order('vencimento').limit(2000),
        supabase.rpc('conferencia_maquininha', { p_loja: ctx.lojaId, p_meses: 4 }),
      ]);
      const linhas = ((ext.data ?? []) as Record<string, unknown>[]).map((x) => {
        const lanc = (Array.isArray(x.lanc) ? x.lanc[0] : x.lanc) as { descricao: string; valor: number; vencimento: string } | null;
        return { ...x, valor: Number(x.valor), lanc: lanc ? { ...lanc, valor: Number(lanc.valor) } : null } as LinhaExtrato;
      });
      corpo = (
        <>
          {ext.error && <p className="erro">{/fin_extrato/.test(ext.error.message) ? 'A atualização do banco desta tela ainda não foi aplicada (financeiro automático, D-105).' : ext.error.message}</p>}
          <ExtratoBanco
            linhas={linhas}
            abertas={((abertas.data ?? []) as Record<string, unknown>[]).map((l) => ({ ...l, valor: Number(l.valor) }) as ContaEmAberto)}
            categorias={cad.categorias}
            contas={cad.contas}
          />
          {maq.data ? <ConferenciaMaquininha dados={maq.data as DadosMaquininha} /> : null}
        </>
      );
    }
  } else if (aba === 'fluxo') {
    const ate = new Date(Date.parse(`${hoje}T12:00:00Z`) + 30 * 86400_000).toISOString().slice(0, 10);
    const [abertos, vendas] = await Promise.all([
      doDono(supabase.from('fin_lancamentos').select(LANC)).is('pago_em', null).lte('vencimento', ate).order('vencimento').limit(3000),
      Promise.all((soma ? esc.gestorDoGrupo : [ctx.lojaId]).map((id) => supabase.rpc('vendas_recentes_financeiro', { p_loja: id }))),
    ]);
    const liquido28 = vendas.flatMap((v) => (v.data ?? []) as { liquido: number }[]).reduce((a, v) => a + Number(v.liquido), 0);
    corpo = (
      <>
        <p className="dica" style={{ margin: 0 }}>Os próximos 30 dias: o que você tem hoje, mais o que entra, menos o que vence. Contas atrasadas entram como hoje.</p>
        <FluxoCaixa abertos={((abertos.data ?? []) as Record<string, unknown>[]).map(normalizar)} vendaDiaLiquida={Math.round((liquido28 / 28) * 100) / 100} />
      </>
    );
  } else if (aba === 'dre') {
    // grupo: o grupo todo ou uma loja (vendas dela + contas marcadas com ela); separado: esta loja ou a soma
    const lojaSel = grupo ? esc.lojasGrupo.find((l) => l.id === sp.loja)?.id ?? null : null;
    const ids = lojaSel ? [lojaSel] : lojasDre;
    const { data, error } = await supabase.rpc('dre_financeiro', { p_lojas: ids, p_ano: ano });
    const meses = ((data as { meses?: MesDre[] } | null)?.meses ?? []).map((m) => ({ ...m, vendas: Number(m.vendas), taxas: Number(m.taxas), cmv_estoque: m.cmv_estoque == null ? null : Number(m.cmv_estoque) }));
    const ate = ano < Number(hoje.slice(0, 4)) ? 12 : ano > Number(hoje.slice(0, 4)) ? 0 : Number(hoje.slice(5, 7));
    const ext = lojaSel ? { loja: lojaSel } : {};
    corpo = (
      <>
        <div className="linha" style={{ alignItems: 'center', gap: '0.5rem' }}>
          <Link className="botao mini" href={qs({ aba: 'dre', ano: ano - 1, ...ext })}>‹ {ano - 1}</Link>
          <strong>{ano}</strong>
          <Link className="botao mini" href={qs({ aba: 'dre', ano: ano + 1, ...ext })}>{ano + 1} ›</Link>
          {grupo && varias && (
            <div className="abas-metrica" role="group" aria-label="Lojas">
              <Link href={qs({ aba: 'dre', ano })} className="botao mini" aria-current={!lojaSel || undefined}>Grupo todo</Link>
              {esc.lojasGrupo.map((l) => (
                <Link key={l.id} href={qs({ aba: 'dre', ano, loja: l.id })} className="botao mini" aria-current={lojaSel === l.id || undefined}>{l.nome}</Link>
              ))}
            </div>
          )}
          {meses.length > 0 && <BaixarCsv nome={`dre-${ano}${grupo && !lojaSel ? '-grupo' : soma ? '-soma' : ''}.csv`} conteudo={csvDre(meses.filter((m) => m.mes <= Math.max(ate, 1)))} />}
        </div>
        {grupo && lojaSel && <p className="dica" style={{ margin: 0 }}>Vendas desta loja + as contas marcadas como dela. As contas &quot;do grupo todo&quot; aparecem só no Grupo todo.</p>}
        {error && <p className="erro">{error.message}</p>}
        {meses.length > 0 && <TabelaDre meses={meses} ate={ate || 12} />}
        <p className="dica" style={{ margin: 0 }}>
          Por competência (o mês a que a conta pertence). Vendas = pedidos concluídos no RES. Taxas calculadas pelas suas taxas em <Link href="/financeiro?aba=cadastros">Cadastros</Link>.
          Custo das vendas vem do <Link href="/estoque">estoque</Link> (CMV real, ⓔ) quando houver movimento no mês; senão, das contas lançadas em &quot;Custo das vendas&quot;. Contas sem categoria entram em despesas operacionais.
        </p>
      </>
    );
  } else {
    corpo = (
      <>
        {grupo && <p className="cartao dica" style={{ margin: 0 }}>Categorias, fornecedores e contas valem para o grupo todo. As taxas abaixo são de <b>{ctx.lojaNome}</b> (cada loja tem a sua maquininha): troque de loja no topo para ajustar as outras.</p>}
        <Taxas inicial={((taxas.data ?? []) as Taxa[]).map((t) => ({ ...t, percentual: Number(t.percentual), fixa: Number(t.fixa), dias: Number(t.dias) }))} />
        <Categorias inicial={cad.categorias} />
        <Fornecedores inicial={cad.fornecedores} />
        <Contas inicial={cad.contas} />
      </>
    );
  }

  return (
    <div className="grade">
      <h1>Financeiro</h1>
      <nav className="abas" aria-label="Financeiro">
        {ABAS.map(([k, r]) => (
          <Link key={k} href={qs({ aba: k === 'visao' ? undefined : k })} role="tab" aria-selected={aba === k} className="aba-link">
            {r}
          </Link>
        ))}
      </nav>
      {varias && aba === 'cadastros' && escolha}
      {varias && aba !== 'cadastros' && (
        grupo ? (
          <p className="selo fin-escopo" style={{ justifySelf: 'start' }}>
            Financeiro do grupo · {esc.lojasGrupo.length} lojas juntas · <Link href="/financeiro?aba=cadastros">mudar</Link>
          </p>
        ) : esc.gestorDoGrupo.length > 1 ? (
          <nav className="abas" aria-label="Ver">
            <Link href={`/financeiro?aba=${aba}`} role="tab" aria-selected={!soma} className="aba-link">{ctx.lojaNome}</Link>
            <Link href={`/financeiro?aba=${aba}&ver=grupo`} role="tab" aria-selected={soma} className="aba-link">Soma do grupo ({esc.gestorDoGrupo.length} lojas)</Link>
          </nav>
        ) : null
      )}
      {erro && <p className="erro">{/fin_|financeiro/.test(erro) ? 'A atualização do banco desta tela ainda não foi aplicada (migração 0061).' : erro}</p>}
      {corpo}
    </div>
  );
}

function Cartao({ rotulo, valor, sub, destaque, negativo }: { rotulo: string; valor: string; sub?: string; destaque?: boolean; negativo?: boolean }) {
  return (
    <div className="cartao fin-cartao" data-destaque={destaque || undefined} data-neg={negativo || undefined}>
      <span className="dica">{rotulo}</span>
      <strong>{valor}</strong>
      {sub && <span className="dica">{sub}</span>}
    </div>
  );
}

/** Quantos custos fixos com valor a planilha tem (da loja, ou do grupo no modo grupo). */
async function custosFixos(supabase: Awaited<ReturnType<typeof criarClienteServidor>>, lojaId: string, contaId: string | null, grupo: boolean) {
  const q = supabase.from('custos').select('valor').eq('tipo', 'fixo').gt('valor', 0);
  const { data } = grupo && contaId ? await q.eq('conta_id', contaId) : await q.eq('loja_id', lojaId);
  return { n: (data ?? []).length, total: (data ?? []).reduce((a, c) => a + Number(c.valor), 0), grupo };
}
