import Link from 'next/link';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { Custo, Empresa, Funcionario, Registro } from '@/lib/gestao';
import { PlanilhaCustos } from '@/components/gestao/custos';
import { Funcionarios } from '@/components/gestao/funcionarios';
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

export default async function Gestao({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
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
    supabase.from('funcionarios').select('id, nome, cpf, rg, ctps, pis, cargo, admissao, nascimento, telefone, endereco, ativo').eq('loja_id', ctx.lojaId).order('ativo', { ascending: false }).order('nome'),
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
      {aba === 'custos' && (
        <PlanilhaCustos
          inicial={((custos.data ?? []) as Custo[]).map((c) => ({ ...c, valor: Number(c.valor) }))}
          faturamentoBase={empresa?.faturamento_base == null ? null : Number(empresa.faturamento_base)}
          faturamento30={faturamento30}
        />
      )}
      {aba === 'funcionarios' && <Funcionarios inicial={funcionarios} />}
      {(aba === 'faltas' || aba === 'advertencias') && (
        <Registros tipo={aba === 'faltas' ? 'falta' : 'advertencia'} funcionarios={funcionarios} registros={(regs.data ?? []) as Registro[]} empresaOk={!!(empresa?.razao_social && empresa?.cnpj)} />
      )}
      {aba === 'empresa' && <DadosEmpresa inicial={empresa} lojaNome={ctx.lojaNome} />}
    </div>
  );
}
