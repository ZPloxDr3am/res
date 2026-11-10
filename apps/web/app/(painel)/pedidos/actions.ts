'use server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { DOMINIO_USUARIOS, MOTIVOS_CANCELAMENTO_PADRAO, normalizarUsuario, type RespostaNegociacao, type FormaPagamento, type StatusPedido, type TipoPedido } from '@res/core';
import { criarClienteServidor } from '@/lib/supabase/server';
import { contextoLoja } from '@/lib/loja';
import { carregarDadosNovoPedido, type DadosNovoPedido } from '@/lib/novo-pedido';
import { motivosCancelamento } from '@/lib/marketplace/ifood';

export type Resultado = { ok: true } | { ok: false; erro: string };

const mensagem = (e: { message: string; code?: string }) =>
  e.code === '42501' || /permission denied|row-level security/.test(e.message) ? 'Você não tem permissão para mexer nos pedidos.' : e.message;

export async function mudarStatus(pedidoId: string, status: StatusPedido, motivo?: string): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('mudar_status_pedido', { p_pedido: pedidoId, p_status: status, p_motivo: motivo ?? null });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/pedidos');
  return { ok: true };
}

/** Loja alvo: a pedida (modo "todas as lojas", D-087), se a pessoa trabalha nela; senão a loja atual. */
const lojaAlvo = (ctx: Awaited<ReturnType<typeof contextoLoja>>, lojaId?: string) => (lojaId && ctx.lojas.some((l) => l.id === lojaId) ? lojaId : ctx.lojaId);

export async function definirAceiteAutomatico(valor: boolean, lojaId?: string): Promise<Resultado> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from('lojas').update({ aceite_automatico: valor }).eq('id', lojaAlvo(ctx, lojaId)).select('id');
  if (error) return { ok: false, erro: mensagem(error) };
  if (!data?.length) return { ok: false, erro: 'Só quem cuida dos dados da empresa pode mudar o aceite automático.' };
  revalidatePath('/pedidos');
  return { ok: true };
}

export interface NovoPedido {
  marcaId: string;
  tipo: TipoPedido;
  cliente: { nome: string; telefone?: string };
  endereco?: { logradouro: string; numero?: string; complemento?: string; bairro: string; referencia?: string };
  itens: {
    produtoId: string;
    quantidade: number;
    observacao?: string;
    escolhas: Record<string, Record<string, number>>;
    /** combo: escolhas de cada passo */
    passos?: { passoId: string; produtoId: string; escolhas: Record<string, Record<string, number>> }[];
  }[];
  /** Valores em centavos. O banco recalcula os preços dos itens a partir do cardápio.
   *  taxaEntrega null = usar a taxa do bairro cadastrada na marca (o banco busca). */
  taxaEntrega: number | null;
  desconto: number;
  pagamento: FormaPagamento;
  trocoPara: number | null;
  observacao?: string;
  /** ISO; null = o quanto antes. */
  agendadoPara?: string | null;
  /** desconto do balcão (D-023): motivo obrigatório; acima do limite, autorização do gerente */
  descontoMotivo?: string;
  autorizacao?: string | null;
  cupom?: string | null;
  /** cashback (centavos) e/ou recompensa de pontos (D-031) */
  fidelidade?: { cashback: number; recompensa: string | null } | null;
}

export async function criarPedido(p: NovoPedido): Promise<{ ok: true; numero: number } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  if (!p.cliente.nome.trim()) return { ok: false, erro: 'Informe o nome do cliente.' };
  const supabase = await criarClienteServidor();
  const { data: id, error } = await supabase.rpc('criar_pedido', {
    p_loja: ctx.lojaId,
    p_marca: p.marcaId,
    p_dados: {
      tipo: p.tipo,
      cliente: { nome: p.cliente.nome.trim(), telefone: p.cliente.telefone || null },
      endereco: p.tipo === 'entrega' ? p.endereco : null,
      itens: p.itens.map((i) => ({
        produto_id: i.produtoId,
        quantidade: i.quantidade,
        observacao: i.observacao || null,
        escolhas: i.passos ? { passos: i.passos.map((x) => ({ passo_id: x.passoId, produto_id: x.produtoId, escolhas: x.escolhas })) } : i.escolhas,
      })),
      taxa_entrega: p.taxaEntrega == null ? null : p.taxaEntrega / 100,
      desconto: p.desconto / 100,
      pagamento: p.pagamento,
      troco_para: p.trocoPara == null ? null : p.trocoPara / 100,
      observacao: p.observacao || null,
      agendado_para: p.agendadoPara ?? null,
      desconto_motivo: p.descontoMotivo?.trim() || null,
      autorizacao: p.autorizacao || null,
      cupom: p.cupom?.trim() || null,
      fidelidade: p.fidelidade && (p.fidelidade.cashback > 0 || p.fidelidade.recompensa) ? p.fidelidade : null,
    },
  });
  if (error) return { ok: false, erro: mensagem(error) };
  const { data } = await supabase.from('pedidos').select('numero').eq('id', id as string).single();
  revalidatePath('/pedidos');
  return { ok: true, numero: data?.numero ?? 0 };
}

/** Dados da janela flutuante de novo pedido (carregados na primeira vez que ela abre). */
export async function dadosNovoPedido(): Promise<{ ok: true; lojaId: string; dados: DadosNovoPedido } | { ok: false; erro: string }> {
  try {
    const ctx = await contextoLoja();
    return { ok: true, lojaId: ctx.lojaId, dados: await carregarDadosNovoPedido(ctx.lojaId, ctx.marcas, ctx.papel) };
  } catch (e) {
    return { ok: false, erro: (e as Error).message };
  }
}

/** Marca (ou desmarca) o pedido como já pago — ex.: Pix recebido antes. O motoboy vê "NÃO COBRAR". */
export async function marcarPago(pedidoId: string, pago: boolean): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('marcar_pago', { p_pedido: pedidoId, p_pago: pago });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/pedidos');
  return { ok: true };
}

/**
 * Gerente autoriza um desconto acima do limite: confere usuário e senha DELE numa sessão à parte
 * (não troca quem está logado) e devolve uma autorização de uso único, válida por 10 minutos.
 */
export async function autorizarDesconto(usuario: string, senha: string): Promise<{ ok: true; id: string; nome: string } | { ok: false; erro: string }> {
  const ctx = await contextoLoja();
  const u = usuario.trim();
  if (!u || !senha) return { ok: false, erro: 'Digite o usuário e a senha do gerente.' };
  const email = u.includes('@') ? u.toLowerCase() : `${normalizarUsuario(u)}@${DOMINIO_USUARIOS}`;
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const login = await sb.auth.signInWithPassword({ email, password: senha });
  if (login.error || !login.data.user) return { ok: false, erro: 'Usuário ou senha do gerente incorretos.' };
  try {
    const { data, error } = await sb.rpc('autorizar_desconto', { p_loja: ctx.lojaId });
    if (error) return { ok: false, erro: error.message };
    const { data: m } = await sb.from('membros').select('nome').eq('loja_id', ctx.lojaId).eq('user_id', login.data.user.id).maybeSingle();
    return { ok: true, id: data as string, nome: (m?.nome as string | undefined) ?? 'gerente' };
  } finally {
    await sb.auth.signOut();
  }
}

/** Marca que o cliente foi avisado no WhatsApp nesta etapa do pedido (D-058). */
export async function marcarAviso(pedidoId: string, etapa: StatusPedido, avisado = true): Promise<Resultado> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('marcar_aviso', { p_pedido: pedidoId, p_etapa: etapa, p_avisado: avisado });
  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}

/** Pausa temporária da loja com recado (D-059). minutos = 0 retoma. */
export async function pausarLoja(minutos: number, recado?: string, lojaId?: string): Promise<Resultado> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('pausar_loja', { p_loja: lojaAlvo(ctx, lojaId), p_minutos: Math.round(minutos), p_recado: recado ?? null });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/pedidos');
  revalidatePath('/delivery');
  return { ok: true };
}

/** Modo movimento (D-062): +minutos no preparo e na entrega por algumas horas. minutos = 0 desliga. */
export async function definirMovimento(minutos: number, horas: number | null, lojaId?: string): Promise<Resultado> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('definir_movimento', { p_loja: lojaAlvo(ctx, lojaId), p_minutos: Math.round(minutos), p_horas: horas });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/pedidos');
  return { ok: true };
}

/** Retirada vira "Pronto" sozinha no fim do tempo de preparo (D-063). */
export async function definirProntoAuto(ligado: boolean): Promise<Resultado> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('definir_pronto_auto', { p_loja: ctx.lojaId, p_ligado: ligado });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/pedidos');
  return { ok: true };
}

/** Resposta da loja numa negociação do iFood (D-075). O banco confere o que o iFood permite. */
export async function responderNegociacao(id: string, resposta: RespostaNegociacao): Promise<{ ok: true; situacao: string } | { ok: false; erro: string }> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('responder_negociacao', { p_negociacao: id, p_resposta: resposta });
  if (error) return { ok: false, erro: mensagem(error) };
  revalidatePath('/pedidos');
  return { ok: true, situacao: String(data) };
}

/** Motivos de cancelamento do iFood para este pedido: ao vivo com o iFood ligado; senão a lista padrão. */
export async function motivosCancelamentoPedido(pedidoId: string): Promise<{ codigo: string; descricao: string }[]> {
  const supabase = await criarClienteServidor();
  const { data: p } = await supabase.from('pedidos').select('externo_id, loja_id, marca_id').eq('id', pedidoId).maybeSingle();
  if (!p?.externo_id) return MOTIVOS_CANCELAMENTO_PADRAO;
  const { data: ml } = await supabase.from('marketplace_lojas').select('modo').eq('loja_id', p.loja_id as string).eq('marca_id', p.marca_id as string).eq('canal', 'ifood').maybeSingle();
  if (ml?.modo !== 'producao') return MOTIVOS_CANCELAMENTO_PADRAO;
  try {
    const vivos = await motivosCancelamento(p.externo_id as string);
    return vivos?.length ? vivos : MOTIVOS_CANCELAMENTO_PADRAO;
  } catch {
    return MOTIVOS_CANCELAMENTO_PADRAO;
  }
}

/** Quadro de pedidos com todas as lojas do grupo (D-078): preferência de cada usuário, salva na conta dele. */
export async function definirQuadroTodas(todas: boolean): Promise<{ ok: boolean }> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.updateUser({ data: { quadro_todas: todas } });
  return { ok: !error };
}
