import type { ReactNode } from 'react';
import Link from 'next/link';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { resumirCustos, type Custo, type Empresa, type Funcionario, type Registro } from '@/lib/gestao';
import { EscolhaModo, SomaGrupo, type LinhaGrupo } from '@/components/gestao/grupo';
import { PlanilhaCustos } from '@/components/gestao/custos';
import { Funcionarios, type Acesso } from '@/components/gestao/funcionarios';
import { Registros } from '@/components/gestao/registros';
import { DadosEmpresa } from '@/components/gestao/empresa';

export const dynamic = 'force-dynamic';

const ABAS = [
  ['custos', 'Custos fixos e variáveis'],
  ['funcionarios', 'Funcionários'],
  ['faltas', 'Faltas'],
  ['advertencias', 'Advertências'],
  ['empresa', 'Dados da empresa'],
] as const;
type Aba = (typeof ABAS)[number][0];

export default async function Gestao({ searchParams }: { searchParams: Promise<{ aba?: string; ver?: string }> }) {
  const sp = await searchParams;
  const aba: Aba = (ABAS.find(([k]) => k === sp.aba)?.[0] ?? 'custos') as Aba;
  const ctx = await contextoLoja();
  if (ctx.papel !== 'dono' && ctx.papel !== 'gerente') {
    return (
      <div className="grade">
        <h1>Gestão Empresarial</h1>
        <p className="cartao dica">Só o dono ou o gerente da loja acessam esta área (custos e dados dos funcionários).</p>
      </div>
    );
  }
  const supabase = await criarClienteServidor();
  const { error: erroPrep } = await supabase.rpc('preparar_gestao', { p_loja: ctx.lojaId });

  const [emp, custos, funcs, regs, fat] = await Promise.all([
    supabase.from('gestao_empresa').select('razao_social, cnpj, endereco, cidade, uf, cep, responsavel, cargo_responsavel, faturamento_base').eq('loja_id', ctx.lojaId).maybeSingle(),
    supabase.from('custos').select('id, tipo, nome, forma, valor, observacao, ordem').eq('loja_id', ctx.lojaId).order('tipo').order('ordem'),
    supabase.from('funcionarios').select('id, nome, cpf, rg, ctps, pis, cargo, admissao, nascimento, telefone, endereco, ativo, membro_id').eq('loja_id', ctx.lojaId).order('ativo', { ascending: false }).order('nome'),
    aba === 'faltas' || aba === 'advertencias'
      ? supabase
          .from('funcionario_registros')
          .select('id, funcionario_id, tipo, numero, data, data_fim, justificada, motivo, descricao, testemunha1, testemunha2, criado_em')
          .eq('loja_id', ctx.lojaId)
          .eq('tipo', aba === 'faltas' ? 'falta' : 'advertencia')
          .order('data', { ascending: false })
          .order('numero', { ascending: false })
          .limit(500)
      : Promise.resolve({ data: [] as Registro[], error: null }),
    // faturamento dos últimos 30 dias no RES (pedidos concluídos), sugestão para a planilha
    supabase
      .from('pedidos')
      .select('total')
      .eq('loja_id', ctx.lojaId)
      .eq('status', 'concluido')
      .gte('concluido_em', new Date(Date.now() - 30 * 86400_000).toISOString())
      .limit(20000),
  ]);
  const erro = erroPrep?.message ?? emp.error?.message ?? custos.error?.message ?? funcs.error?.message ?? regs.error?.message;
  const empresa = (emp.data as Empresa | null) ?? null;
  const faturamento30 = Math.round((fat.data ?? []).reduce((s, p) => s + Number(p.total), 0) * 100) / 100;
  const funcionarios = (funcs.data ?? []) as Funcionario[];

  // várias lojas na mesma conta: custos de cada loja separada ou do grupo todo junto (D-053)
  const contaId = ctx.lojas.find((l) => l.id === ctx.lojaId)?.contaId ?? null;
  const doGrupo = contaId ? ctx.lojas.filter((l) => l.contaId === contaId) : [];
  let custosGrupo: ReactNode = null;
  let planilhaDaLoja = true;
  if (aba === 'custos' && contaId && doGrupo.length > 1) {
    const ids = doGrupo.map((l) => l.id);
    const [{ data: eu }, { data: gc }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('gestao_conta').select('modo, faturamento_base').eq('conta_id', contaId).maybeSingle(),
    ]);
    const { data: tit } = await supabase.from('contas_titulares').select('conta_id').eq('conta_id', contaId).eq('user_id', eu.user?.id ?? '');
    const titular = (tit ?? []).length > 0;
    const modo = (gc?.modo as 'separado' | 'grupo' | undefined) ?? 'separado';
    const ver = sp.ver === 'grupo' && modo === 'separado' ? 'grupo' : 'loja';
    const escolha = <EscolhaModo contaId={contaId} modo={modo} titular={titular} lojas={doGrupo.map((l) => l.nome)} ver={ver} />;
    const fatGrupo = async () => {
      const { data } = await supabase.from('pedidos').select('loja_id, total').in('loja_id', ids).eq('status', 'concluido').gte('concluido_em', new Date(Date.now() - 30 * 86400_000).toISOString()).limit(50000);
      const por = new Map<string, number>();
      for (const p of data ?? []) por.set(p.loja_id as string, (por.get(p.loja_id as string) ?? 0) + Number(p.total));
      return por;
    };
    if (modo === 'grupo') {
      planilhaDaLoja = false;
      if (titular) {
        const prep = await supabase.rpc('preparar_gestao_grupo', { p_conta: contaId });
        const { data: cg } = await supabase.from('custos').select('id, tipo, nome, forma, valor, observacao, ordem').eq('conta_id', contaId).order('tipo').order('ordem');
        const por = await fatGrupo();
        const soma = Math.round([...por.values()].reduce((a, b) => a + b, 0) * 100) / 100;
        custosGrupo = (
          <>
            {escolha}
            {prep.error && <p className="erro">{prep.error.message}</p>}
            <h2 style={{ margin: 0 }}>Planilha do grupo · {doGrupo.length} lojas juntas</h2>
            <PlanilhaCustos
              key={`grupo-${contaId}`}
              inicial={((cg ?? []) as Custo[]).map((c) => ({ ...c, valor: Number(c.valor) }))}
              faturamentoBase={gc?.faturamento_base == null ? null : Number(gc.faturamento_base)}
              faturamento30={soma}
              escopo={{ tipo: 'grupo', contaId }}
              rotulo30="Usar últimos 30 dias das lojas somadas"
            />
          </>
        );
      } else {
        custosGrupo = (
          <>
            {escolha}
            <p className="cartao dica">Os custos deste grupo são controlados juntos, numa planilha só, pelo titular da conta.</p>
          </>
        );
      }
    } else if (ver === 'grupo') {
      planilhaDaLoja = false;
      const [{ data: cs }, { data: emps }, por] = await Promise.all([
        supabase.from('custos').select('loja_id, tipo, forma, valor').in('loja_id', ids),
        supabase.from('gestao_empresa').select('loja_id, faturamento_base').in('loja_id', ids),
        fatGrupo(),
      ]);
      const linhas: LinhaGrupo[] = doGrupo.map((l) => {
        const meus = (cs ?? []).filter((c) => c.loja_id === l.id).map((c) => ({ tipo: c.tipo as Custo['tipo'], forma: c.forma as Custo['forma'], valor: Number(c.valor) }));
        const base = (emps ?? []).find((e) => e.loja_id === l.id)?.faturamento_base;
        const fat = base == null ? Math.round((por.get(l.id) ?? 0) * 100) / 100 : Number(base);
        return { loja: l.nome, resumo: resumirCustos(meus, fat), preenchida: meus.some((c) => c.valor > 0) };
      });
      custosGrupo = (
        <>
          {escolha}
          <SomaGrupo linhas={linhas} />
        </>
      );
    } else {
      custosGrupo = escolha;
    }
  }
  // acessos ao RES desta loja, para ligar à ficha (D-052)
  let acessos: Acesso[] = [];
  if (aba === 'funcionarios') {
    const { data: ms } = await supabase.from('membros').select('id, user_id, nome, papel, ativo').eq('loja_id', ctx.lojaId).order('nome');
    const { data: us } = await supabase.from('usuarios_login').select('user_id, usuario').in('user_id', (ms ?? []).map((m) => m.user_id));
    acessos = (ms ?? []).map((m) => ({ id: m.id as string, nome: m.nome as string, papel: m.papel as string, ativo: m.ativo as boolean, usuario: ((us ?? []).find((u) => u.user_id === m.user_id)?.usuario as string | undefined) ?? null }));
  }

  return (
    <div className="grade">
      <h1>Gestão Empresarial</h1>
      <nav className="abas nao-imprimir" aria-label="Gestão Empresarial">
        {ABAS.map(([k, r]) => (
          <Link key={k} href={k === 'custos' ? '/gestao' : `/gestao?aba=${k}`} role="tab" aria-selected={aba === k} className="aba-link">
            {r}
          </Link>
        ))}
      </nav>
      {erro && <p className="erro">{erro.includes('gestao_empresa') || erro.includes('preparar_gestao') ? 'A atualização do banco desta tela ainda não foi aplicada (migração 0052).' : erro}</p>}
      {custosGrupo}
      {aba === 'custos' && planilhaDaLoja && doGrupo.length > 1 && <h2 style={{ margin: 0 }}>Planilha de {ctx.lojaNome}</h2>}
      {aba === 'custos' && planilhaDaLoja && (
        <PlanilhaCustos
          key={`loja-${ctx.lojaId}`}
          inicial={((custos.data ?? []) as Custo[]).map((c) => ({ ...c, valor: Number(c.valor) }))}
          faturamentoBase={empresa?.faturamento_base == null ? null : Number(empresa.faturamento_base)}
          faturamento30={faturamento30}
        />
      )}
      {aba === 'funcionarios' && <Funcionarios inicial={funcionarios} acessos={acessos} lojaId={ctx.lojaId} lojaNome={ctx.lojaNome} meuPapel={ctx.papel} />}
      {(aba === 'faltas' || aba === 'advertencias') && (
        <Registros tipo={aba === 'faltas' ? 'falta' : 'advertencia'} funcionarios={funcionarios} registros={(regs.data ?? []) as Registro[]} empresaOk={!!(empresa?.razao_social && empresa?.cnpj)} />
      )}
      {aba === 'empresa' && <DadosEmpresa inicial={empresa} lojaNome={ctx.lojaNome} />}
    </div>
  );
}
