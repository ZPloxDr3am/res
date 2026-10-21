'use server';
import { revalidatePath } from 'next/cache';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { CupomFila } from '@/lib/impressao';

type R = { ok: true } | { ok: false; erro: string };
type RC = { ok: true; cupons: CupomFila[] } | { ok: false; erro: string };
const msg = (e: { message: string }) =>
  /impressoras_nome_idx/.test(e.message) ? 'Já existe uma impressora com esse nome.' : /permission denied|permissão/i.test(e.message) ? 'Você não tem permissão para configurar impressoras.' : e.message;

export interface DadosImpressora {
  nome: string;
  modelo: string;
  protocolo: string;
  conexao: 'usb' | 'rede';
  endereco: string;
  colunas: number;
  pagina_codigo: string;
  espaco_linhas: number;
  pular_linhas: number;
  corte: boolean;
  gaveta: boolean;
  ativo: boolean;
}

export async function salvarImpressora(id: string | null, d: DadosImpressora): Promise<R> {
  if (!d.nome.trim()) return { ok: false, erro: 'Dê um nome à impressora (ex.: Cozinha, Bar, Caixa).' };
  if (d.conexao === 'rede' && d.endereco && !/^[\w.-]+(:\d{2,5})?$/.test(d.endereco.trim())) return { ok: false, erro: 'Endereço de rede no formato 192.168.0.50:9100.' };
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_impressora', { p_loja: ctx.lojaId, p_id: id, p_dados: d });
  if (error) return { ok: false, erro: msg(error) };
  revalidatePath('/impressoras');
  return { ok: true };
}

export async function excluirImpressora(id: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('excluir_impressora', { p_impressora: id });
  if (error) return { ok: false, erro: msg(error) };
  revalidatePath('/impressoras');
  return { ok: true };
}

export interface ConfigImpressao {
  modo_destino: 'unica' | 'setor' | 'produto';
  impressora_padrao: string;
  agrupamento: 'completo' | 'por_setor';
  canais: Record<'painel' | 'cardapio_digital' | 'marketplace', 'automatico' | 'manual'>;
  via_pedido_impressora: string;
  via_pedido_auto: boolean;
  marketplace_impressora: string;
  marketplace_modo: 'tudo' | 'sem_vinculo';
  destinos: { tipo: 'setor' | 'produto'; alvo_id: string; impressora_id: string }[];
}

export async function salvarConfigImpressao(c: ConfigImpressao): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_config_impressao', { p_loja: ctx.lojaId, p_config: c });
  if (error) return { ok: false, erro: msg(error) };
  revalidatePath('/impressoras');
  return { ok: true };
}

export async function salvarLayout(marcaId: string, tipo: 'pedido' | 'cozinha', opcoes: Record<string, unknown>): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_layout_impressao', { p_marca: marcaId, p_tipo: tipo, p_opcoes: opcoes });
  if (error) return { ok: false, erro: msg(error) };
  revalidatePath('/impressoras');
  return { ok: true };
}

export async function imprimirTeste(impressoraId: string): Promise<RC> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('imprimir_teste', { p_impressora: impressoraId });
  if (error) return { ok: false, erro: msg(error) };
  return { ok: true, cupons: data as CupomFila[] };
}

export async function imprimirPedido(pedidoId: string, tipo: 'cozinha' | 'pedido'): Promise<RC> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('imprimir_pedido', { p_pedido: pedidoId, p_tipo: tipo });
  if (error) return { ok: false, erro: msg(error) };
  return { ok: true, cupons: data as CupomFila[] };
}

export async function reimprimir(impressaoId: string): Promise<RC> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('reimprimir', { p_impressao: impressaoId });
  if (error) return { ok: false, erro: msg(error) };
  revalidatePath('/impressoras');
  return { ok: true, cupons: data as CupomFila[] };
}

/** Cupons da fila (pendentes ou com erro) para imprimir neste navegador. */
export async function cuponsPendentes(): Promise<RC> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from('impressoes')
    .select('id, tipo, motivo, titulo, conteudo, layout, impressora_id, status, impressoras(nome, colunas, ultimo_sinal)')
    .eq('loja_id', ctx.lojaId)
    .in('status', ['pendente', 'erro'])
    .gte('criado_em', new Date(Date.now() - 24 * 3600_000).toISOString())
    .order('criado_em')
    .limit(50);
  if (error) return { ok: false, erro: error.message };
  return {
    ok: true,
    cupons: (data ?? []).map((x) => {
      const imp = x.impressoras as unknown as { nome: string; colunas: number; ultimo_sinal: string | null } | null;
      return {
        ...(x as unknown as CupomFila),
        impressora: imp?.nome ?? null,
        colunas: imp?.colunas ?? 48,
        agente_online: !!imp?.ultimo_sinal && Date.now() - new Date(imp.ultimo_sinal).getTime() < 120_000,
      };
    }),
  };
}

export async function marcarImpressao(ids: string[], status: 'impresso' | 'erro' | 'cancelado', erro?: string): Promise<R> {
  if (ids.length === 0) return { ok: true };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('marcar_impressao', { p_ids: ids, p_status: status, p_por: 'navegador', p_erro: erro ?? null });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/impressoras');
  return { ok: true };
}
