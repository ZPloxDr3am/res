'use server';
import { revalidatePath } from 'next/cache';
import { normalizarPedidoIfood, pedidoIfoodExemplo } from '@res/core';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';

type R<T = object> = ({ ok: true } & T) | { ok: false; erro: string };
const fim = () => {
  revalidatePath('/aplicativos');
  revalidatePath('/pedidos');
};

/** Liga um cardápio (marca) da loja a uma loja do iFood (merchant). No modo teste, o Merchant ID pode ser qualquer um. */
export async function salvarLojaIfood(d: { marcaId: string; merchantId: string; modo: 'teste' | 'producao' }): Promise<R> {
  const merchant = d.merchantId.trim();
  if (!merchant) return { ok: false, erro: 'Informe o Merchant ID (no modo teste pode ser "teste").' };
  if (d.modo === 'producao' && !(process.env.IFOOD_CLIENT_ID && process.env.IFOOD_CLIENT_SECRET)) {
    return { ok: false, erro: 'O modo produção precisa das credenciais do aplicativo do iFood configuradas no servidor.' };
  }
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase
    .from('marketplace_lojas')
    .upsert({ loja_id: ctx.lojaId, marca_id: d.marcaId, canal: 'ifood', merchant_id: merchant, modo: d.modo, ativo: true }, { onConflict: 'loja_id,canal,marca_id' });
  if (error) return { ok: false, erro: /marketplace_lojas_canal_merchant_id_key/.test(error.message) ? 'Esse Merchant ID já está ligado a outra loja.' : error.message };
  fim();
  return { ok: true };
}

export async function desligarLojaIfood(id: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from('marketplace_lojas').delete().eq('id', id);
  if (error) return { ok: false, erro: error.message };
  fim();
  return { ok: true };
}

/** Cria um pedido igual ao do iFood (mesma tradução do pedido real), com produtos da loja. */
export async function simularPedidoIfood(o: { merchantId: string; tipo: 'entrega' | 'retirada'; agendado: boolean; pagamento: 'online' | 'dinheiro' | 'cartao_na_entrega'; cupom: boolean }): Promise<R<{ numero: number }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data: prods } = await supabase.from('produtos').select('id, nome, preco').eq('loja_id', ctx.lojaId).gt('preco', 0).limit(40);
  const escolhidos = [...(prods ?? [])].sort(() => Math.random() - 0.5).slice(0, 2);
  const bruto = pedidoIfoodExemplo({
    merchantId: o.merchantId,
    tipo: o.tipo,
    agendado: o.agendado,
    pagamento: o.pagamento,
    cupom: o.cupom,
    itens: escolhidos.length
      ? escolhidos.map((p, i) => ({ nome: p.nome as string, externalCode: p.id as string, preco: Number(p.preco), quantidade: i === 0 ? 1 : 2, obs: i === 0 ? 'Sem cebola' : undefined }))
      : undefined,
  });
  const { data: id, error } = await supabase.rpc('simular_pedido_marketplace', { p_loja: ctx.lojaId, p: normalizarPedidoIfood(bruto) });
  if (error) return { ok: false, erro: error.message };
  const { data: ped } = await supabase.from('pedidos').select('numero').eq('id', id as string).single();
  fim();
  return { ok: true, numero: Number(ped?.numero ?? 0) };
}

/** Evento como se viesse do iFood (cliente cancelou, confirmado em outro app, concluído). */
export async function simularEventoIfood(pedidoId: string, codigo: 'CAN' | 'CFM' | 'DSP' | 'CON', motivo?: string): Promise<R<{ resultado: string }>> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('simular_evento_marketplace', { p_pedido: pedidoId, p_codigo: codigo, p_motivo: motivo ?? null });
  if (error) return { ok: false, erro: error.message };
  fim();
  return { ok: true, resultado: String(data) };
}

/** Liga um item do iFood a um produto do RES (para a ficha técnica baixar o estoque). */
export async function ligarItemIfood(chave: string, tipo: 'item' | 'opcao', produtoId: string | null): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from('marketplace_itens').update({ produto_id: tipo === 'item' ? produtoId : null }).eq('loja_id', ctx.lojaId).eq('canal', 'ifood').eq('tipo', tipo).eq('chave', chave);
  if (error) return { ok: false, erro: error.message };
  fim();
  return { ok: true };
}
