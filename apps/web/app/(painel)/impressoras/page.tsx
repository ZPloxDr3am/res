import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { TempoReal } from '@/components/tempo-real';
import { PainelImpressoras, type Aba, type DadosPainelImpressoras } from '@/components/impressao/painel-impressoras';
import type { ConfigImpressao } from './actions';

export const dynamic = 'force-dynamic';

const ABAS: Aba[] = ['impressoras', 'regras', 'layout', 'historico'];

export default async function Impressoras({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const ctx = await contextoLoja();
  const aba = (ABAS.includes((await searchParams).aba as Aba) ? (await searchParams).aba : 'impressoras') as Aba;
  const supabase = await criarClienteServidor();
  const [pode, imps, cfg, destinos, layouts, setores, produtos, hist, agentes] = await Promise.all([
    supabase.rpc('posso', { p_loja: ctx.lojaId, p_recurso: 'impressoras' }),
    supabase.from('impressoras').select('*').eq('loja_id', ctx.lojaId).order('nome'),
    supabase.from('impressao_config').select('*').eq('loja_id', ctx.lojaId).maybeSingle(),
    supabase.from('impressao_destinos').select('tipo, alvo_id, impressora_id').eq('loja_id', ctx.lojaId),
    supabase.from('impressao_layouts').select('marca_id, tipo, opcoes').eq('loja_id', ctx.lojaId),
    supabase.from('setores').select('id, nome').eq('loja_id', ctx.lojaId).order('ordem'),
    supabase.from('produtos').select('id, nome, setor_id').eq('loja_id', ctx.lojaId).order('nome'),
    supabase
      .from('impressoes')
      .select('id, tipo, motivo, titulo, status, erro, impresso_por, criado_em, impresso_em, impressora_id, tentativas')
      .eq('loja_id', ctx.lojaId)
      .order('criado_em', { ascending: false })
      .limit(100),
    supabase.from('agentes_loja').select('id, nome, versao, impressoras_windows, ultimo_sinal, criado_em').eq('loja_id', ctx.lojaId).order('criado_em'),
  ]);

  const c = cfg.data;
  const config: ConfigImpressao = {
    modo_destino: (c?.modo_destino as ConfigImpressao['modo_destino']) ?? 'unica',
    impressora_padrao: (c?.impressora_padrao as string | null) ?? '',
    agrupamento: (c?.agrupamento as ConfigImpressao['agrupamento']) ?? 'completo',
    canais: { painel: 'automatico', cardapio_digital: 'automatico', marketplace: 'automatico', ...((c?.canais as object) ?? {}) },
    via_pedido_impressora: (c?.via_pedido_impressora as string | null) ?? '',
    via_pedido_auto: (c?.via_pedido_auto as boolean) ?? false,
    marketplace_impressora: (c?.marketplace_impressora as string | null) ?? '',
    marketplace_modo: (c?.marketplace_modo as ConfigImpressao['marketplace_modo']) ?? 'sem_vinculo',
    destinos: (destinos.data ?? []) as ConfigImpressao['destinos'],
  };

  const dados: DadosPainelImpressoras = {
    podeEditar: !!pode.data,
    configurado: !!c,
    impressoras: (imps.data ?? []) as DadosPainelImpressoras['impressoras'],
    config,
    layouts: (layouts.data ?? []) as DadosPainelImpressoras['layouts'],
    marcas: ctx.marcas.map((m) => ({ id: m.id, nome: m.nome })),
    setores: (setores.data ?? []) as DadosPainelImpressoras['setores'],
    produtos: (produtos.data ?? []) as DadosPainelImpressoras['produtos'],
    historico: (hist.data ?? []) as DadosPainelImpressoras['historico'],
    agentes: (agentes.data ?? []) as DadosPainelImpressoras['agentes'],
  };

  return (
    <>
      <TempoReal lojaId={ctx.lojaId} tabelas={['impressoes', 'impressoras']} />
      <PainelImpressoras aba={aba} dados={dados} />
    </>
  );
}
