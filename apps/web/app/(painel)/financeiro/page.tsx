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

export const dynamic = 'force-dynamic';

const ABAS = [
  ['visao', 'Visão do mês'],
  ['contas', 'Contas a pagar e receber'],
  ['fluxo', 'Fluxo de caixa'],
  ['dre', 'DRE'],
  ['cadastros', 'Cadastros e taxas'],
] as const;
type Aba = (typeof ABAS)[number][0];

const LANC = 'id, tipo, descricao, valor, vencimento, competencia, categoria_id, fornecedor_id, conta_id, forma, pago_em, serie, parcela, parcelas, recorrente, origem, observacao';
const normalizar = (l: Record<string, unknown>) => ({ ...l, valor: Number(l.valor) }) as Lancamento;
const somarMes = (ym: string, n: number) => {
  const d = new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
const nomeMes = (ym: string) => `${MESES_LONGOS[Number(ym.slice(5, 7)) - 1]} de ${ym.slice(0, 4)}`;

/** Financeiro (D-060): contas a pagar/receber, fluxo de caixa, DRE e cadastros. Só dono e gerente. */
export default async function Financeiro({ searchParams }: { searchParams: Promise<{ aba?: string; mes?: string; ano?: string; ver?: string }> }) {
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
  const { error: erroPrep } = await supabase.rpc('preparar_financeiro', { p_loja: ctx.lojaId });
  const { data: cfg } = await supabase.from('fin_config').select('custos_auto, dia_custos').eq('loja_id', ctx.lojaId).maybeSingle();
  // automático: o mês corrente e o próximo já entram sozinhos (não duplica)
  if (cfg?.custos_auto && (aba === 'visao' || aba === 'contas' || aba === 'fluxo')) {
    await supabase.rpc('gerar_contas_custos', { p_loja: ctx.lojaId, p_mes: `${mesAtual}-01`, p_dia: cfg.dia_custos, p_meses: 2 });
  }

  const [cats, forns, contas, taxas] = await Promise.all([
    supabase.from('fin_categorias').select('id, tipo, linha, grupo, nome, ativo, ordem').eq('loja_id', ctx.lojaId).order('tipo').order('ordem').order('nome'),
    supabase.from('fin_fornecedores').select('id, nome, documento, telefone, observacao, ativo').eq('loja_id', ctx.lojaId).order('ativo', { ascending: false }).order('nome'),
    supabase.from('fin_contas').select('id, nome, tipo, ativo').eq('loja_id', ctx.lojaId).order('ordem').order('nome'),
    supabase.from('fin_taxas').select('forma, percentual, fixa, dias').eq('loja_id', ctx.lojaId),
  ]);
  const cad = {
    categorias: (cats.data ?? []) as Categoria[],
    fornecedores: (forns.data ?? []) as Fornecedor[],
    contas: (contas.data ?? []) as ContaFin[],
  };
  const erro = erroPrep?.message ?? cats.error?.message;

  // lojas do mesmo grupo em que a pessoa é dono/gerente (para o DRE somado)
  const contaId = ctx.lojas.find((l) => l.id === ctx.lojaId)?.contaId ?? null;
  const doGrupo = contaId ? ctx.lojas.filter((l) => l.contaId === contaId) : [];
  let gestorDoGrupo: string[] = [];
  if (doGrupo.length > 1) {
    const { data: eu } = await supabase.auth.getUser();
    const { data: ms } = await supabase.from('membros').select('loja_id, papel').eq('user_id', eu.user?.id ?? '').eq('ativo', true).in('loja_id', doGrupo.map((l) => l.id));
    gestorDoGrupo = (ms ?? []).filter((m) => m.papel === 'dono' || m.papel === 'gerente').map((m) => m.loja_id as string);
  }

  const navMes = (alvo: Aba) => (
    <div className="linha fin-mes" style={{ alignItems: 'center', gap: '0.4rem' }}>
      <Link className="botao mini" href={`/financeiro?aba=${alvo}&mes=${somarMes(mes, -1)}`} aria-label="Mês anterior">‹</Link>
      <strong style={{ minWidth: '10rem', textAlign: 'center', textTransform: 'capitalize' }}>{nomeMes(mes)}</strong>
      <Link className="botao mini" href={`/financeiro?aba=${alvo}&mes=${somarMes(mes, 1)}`} aria-label="Próximo mês">›</Link>
      {mes !== mesAtual && <Link className="mini" href={`/financeiro?aba=${alvo}`}>voltar para hoje</Link>}
    </div>
  );

  let corpo: ReactNode = null;

  if (aba === 'visao' || aba === 'contas') {
    const [doMes, atrasadas, dre, custos, notas] = await Promise.all([
      supabase.from('fin_lancamentos').select(LANC).eq('loja_id', ctx.lojaId).gte('vencimento', ini).lt('vencimento', fim).order('vencimento').limit(2000),
      // contas vencidas de meses anteriores ainda não pagas aparecem no mês corrente
      mes === mesAtual
        ? supabase.from('fin_lancamentos').select(LANC).eq('loja_id', ctx.lojaId).lt('vencimento', ini).is('pago_em', null).order('vencimento').limit(500)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      aba === 'visao' ? supabase.rpc('dre_financeiro', { p_lojas: [ctx.lojaId], p_ano: Number(mes.slice(0, 4)) }) : Promise.resolve({ data: null }),
      aba === 'visao' ? custosFixos(supabase, ctx.lojaId, contaId) : Promise.resolve(null),
      aba === 'visao' ? supabase.rpc('nfe_sem_conta', { p_loja: ctx.lojaId }) : Promise.resolve({ data: [] }),
    ]);
    const lancs = [...((atrasadas.data ?? []) as Record<string, unknown>[]), ...((doMes.data ?? []) as Record<string, unknown>[])].map(normalizar);

    if (aba === 'contas') {
      corpo = (
        <>
          {navMes('contas')}
          <Lancamentos lancamentos={lancs} cad={cad} />
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
          <Lancamentos lancamentos={lancs.filter((l) => !l.pago_em)} cad={cad} titulo="Em aberto neste mês" compacto />
          <p className="dica" style={{ margin: 0 }}>
            Tudo do mês (inclusive o que já foi pago) em <Link href={`/financeiro?aba=contas&mes=${mes}`}>Contas a pagar e receber</Link>.
          </p>
        </>
      );
    }
  } else if (aba === 'fluxo') {
    const ate = new Date(Date.parse(`${hoje}T12:00:00Z`) + 30 * 86400_000).toISOString().slice(0, 10);
    const [abertos, vendas] = await Promise.all([
      supabase.from('fin_lancamentos').select(LANC).eq('loja_id', ctx.lojaId).is('pago_em', null).lte('vencimento', ate).order('vencimento').limit(3000),
      supabase.rpc('vendas_recentes_financeiro', { p_loja: ctx.lojaId }),
    ]);
    const liquido28 = ((vendas.data ?? []) as { liquido: number }[]).reduce((a, v) => a + Number(v.liquido), 0);
    corpo = (
      <>
        <p className="dica" style={{ margin: 0 }}>Os próximos 30 dias: o que você tem hoje, mais o que entra, menos o que vence. Contas atrasadas entram como hoje.</p>
        <FluxoCaixa abertos={((abertos.data ?? []) as Record<string, unknown>[]).map(normalizar)} vendaDiaLiquida={Math.round((liquido28 / 28) * 100) / 100} />
      </>
    );
  } else if (aba === 'dre') {
    const grupo = sp.ver === 'grupo' && gestorDoGrupo.length > 1;
    const ids = grupo ? gestorDoGrupo : [ctx.lojaId];
    const { data, error } = await supabase.rpc('dre_financeiro', { p_lojas: ids, p_ano: ano });
    const meses = ((data as { meses?: MesDre[] } | null)?.meses ?? []).map((m) => ({ ...m, vendas: Number(m.vendas), taxas: Number(m.taxas), cmv_estoque: m.cmv_estoque == null ? null : Number(m.cmv_estoque) }));
    const ate = ano < Number(hoje.slice(0, 4)) ? 12 : ano > Number(hoje.slice(0, 4)) ? 0 : Number(hoje.slice(5, 7));
    corpo = (
      <>
        <div className="linha" style={{ alignItems: 'center', gap: '0.5rem' }}>
          <Link className="botao mini" href={`/financeiro?aba=dre&ano=${ano - 1}${grupo ? '&ver=grupo' : ''}`}>‹ {ano - 1}</Link>
          <strong>{ano}</strong>
          <Link className="botao mini" href={`/financeiro?aba=dre&ano=${ano + 1}${grupo ? '&ver=grupo' : ''}`}>{ano + 1} ›</Link>
          {gestorDoGrupo.length > 1 && (
            <div className="abas-metrica" role="group" aria-label="Lojas">
              <Link href={`/financeiro?aba=dre&ano=${ano}`} className="botao mini" aria-current={!grupo || undefined}>{ctx.lojaNome}</Link>
              <Link href={`/financeiro?aba=dre&ano=${ano}&ver=grupo`} className="botao mini" aria-current={grupo || undefined}>Grupo ({gestorDoGrupo.length} lojas somadas)</Link>
            </div>
          )}
          {meses.length > 0 && <BaixarCsv nome={`dre-${ano}${grupo ? '-grupo' : ''}.csv`} conteudo={csvDre(meses.filter((m) => m.mes <= Math.max(ate, 1)))} />}
        </div>
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
          <Link key={k} href={k === 'visao' ? '/financeiro' : `/financeiro?aba=${k}`} role="tab" aria-selected={aba === k} className="aba-link">
            {r}
          </Link>
        ))}
      </nav>
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
async function custosFixos(supabase: Awaited<ReturnType<typeof criarClienteServidor>>, lojaId: string, contaId: string | null) {
  let grupo = false;
  if (contaId) {
    const { data } = await supabase.from('gestao_conta').select('modo').eq('conta_id', contaId).maybeSingle();
    grupo = data?.modo === 'grupo';
  }
  const q = supabase.from('custos').select('valor').eq('tipo', 'fixo').gt('valor', 0);
  const { data } = grupo && contaId ? await q.eq('conta_id', contaId) : await q.eq('loja_id', lojaId);
  return { n: (data ?? []).length, total: (data ?? []).reduce((a, c) => a + Number(c.valor), 0), grupo };
}
