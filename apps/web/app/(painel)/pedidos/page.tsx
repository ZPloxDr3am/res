import { contextoLoja } from '@/lib/loja';
import { carregarQuadro } from '@/lib/pedidos';
import { criarClienteServidor } from '@/lib/supabase/server';
import { QuadroPedidos } from '@/components/quadro-pedidos';
import { TempoReal } from '@/components/tempo-real';
import { NegociacoesIfood, type NegociacaoAberta } from '@/components/negociacoes-ifood';

export const dynamic = 'force-dynamic';

export default async function Pedidos({ searchParams }: { searchParams: Promise<{ todas?: string }> }) {
  const ctx = await contextoLoja();
  const todas = ctx.lojas.length > 1 && (await searchParams).todas === '1';
  const ids = todas ? ctx.lojas.map((l) => l.id) : [ctx.lojaId];
  const { pedidos, aceiteAutomatico, prontoAutoRetirada, tempoPreparo, fuso, filaImpressao, prazoEntrega, movimento } = await carregarQuadro(ids, ctx.lojaId);
  // histórico de cada cliente no grupo, para o selo do cartão (D-057)
  const telefones = [...new Set(pedidos.map((p) => p.cliente_telefone).filter((t): t is string => !!t))];
  const supabase = await criarClienteServidor();
  const [{ data: hist }, { data: lj }, { data: negs }] = await Promise.all([
    telefones.length ? supabase.rpc('historico_clientes', { p_lojas: ids, p_telefones: telefones }) : Promise.resolve({ data: {} }),
    supabase.from('lojas').select('pausa_ate, pausa_recado').eq('id', ctx.lojaId).maybeSingle(),
    // negociações do iFood esperando resposta (D-075); sem a migração a consulta falha e a faixa some
    supabase
      .from('marketplace_negociacoes')
      .select('id, acao, tipo, mensagem, expira_em, acao_no_prazo, alternativas, motivos_aceite, itens, evidencias, situacao, resposta, pedidos(numero, externo_codigo, total, cliente_nome)')
      .in('loja_id', ids)
      .in('situacao', ['aberta', 'respondida'])
      .order('expira_em', { ascending: true }),
  ]);
  // pausa temporária (D-059); sem a migração 0060 a consulta falha e fica sem pausa
  const pausaAte = (lj as { pausa_ate?: string | null } | null)?.pausa_ate ?? null;
  const pausa = pausaAte && new Date(pausaAte).getTime() > Date.now() ? { ate: pausaAte, recado: (lj as { pausa_recado?: string | null }).pausa_recado ?? null } : null;
  return (
    <>
      <TempoReal lojaId={ctx.lojaId} tabelas={['pedidos', 'impressoes', 'marketplace_negociacoes']} reservaMs={20000} todasAsLojas={todas} />
      <NegociacoesIfood lista={(negs ?? []) as unknown as NegociacaoAberta[]} />
      <QuadroPedidos
        pedidos={pedidos}
        aceiteAutomatico={aceiteAutomatico}
        prontoAutoRetirada={prontoAutoRetirada}
        tempoPreparo={tempoPreparo}
        fuso={fuso}
        filaImpressao={filaImpressao}
        prazoEntrega={prazoEntrega}
        marcas={ctx.marcas}
        lojas={ctx.lojas}
        lojaAtual={ctx.lojaNome}
        todas={todas}
        historico={(hist as Record<string, string[]> | null) ?? {}}
        pausa={pausa}
        movimento={movimento}
      />
    </>
  );
}
