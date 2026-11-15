'use server';
import { revalidatePath } from 'next/cache';
import { eCanalCliente, eCanalOD, normalizarPedidoDM, normalizarPedidoOD, normalizarPedidoRappi, pedidoSimuladoDM, pedidoSimuladoOD, pedidoSimuladoRappi, type OpcoesSimulacao } from '@res/core';
import { contextoLoja } from '@/lib/loja';
import { clienteAdmin } from '@/lib/supabase/admin';
import { criarClienteServidor } from '@/lib/supabase/server';

// Delivery Much e Rappi (D-117) e o simulador de todos os apps que não são o iFood.
type R<T = object> = ({ ok: true } & T) | { ok: false; erro: string };
const fim = () => {
  revalidatePath('/aplicativos');
  revalidatePath('/pedidos');
};
const configurado = (canal: string) =>
  canal === 'deliverymuch' ? !!(process.env.DELIVERYMUCH_CLIENT_ID && process.env.DELIVERYMUCH_CLIENT_SECRET) : !!(process.env.RAPPI_CLIENT_ID && process.env.RAPPI_CLIENT_SECRET);

/** Cria ou atualiza a conexão. Delivery Much: e-mail e senha da loja (vão para o cofre) e o uuid da loja; Rappi: storeId. */
export async function salvarConexaoCliente(d: { id?: string; canal: string; marcaId: string; merchantId: string; usuario: string; senha: string; modo: 'teste' | 'producao' }): Promise<R<{ id: string }>> {
  if (!eCanalCliente(d.canal)) return { ok: false, erro: 'App inválido.' };
  if (d.modo === 'producao' && !configurado(d.canal)) return { ok: false, erro: 'O modo produção precisa das credenciais de integrador do app configuradas no servidor.' };
  const merchant = d.merchantId.trim() || null;
  if (d.canal === 'rappi' && d.modo === 'producao' && !merchant) return { ok: false, erro: 'Informe o storeId da loja na Rappi.' };
  const admin = clienteAdmin();
  if (!admin) return { ok: false, erro: 'Servidor sem a chave de serviço do banco.' };
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const novoLogin = d.canal === 'deliverymuch' && !!(d.usuario.trim() || d.senha);
  const campos = { merchant_id: merchant, modo: d.modo, ativo: true, ...(novoLogin || !d.id ? { estado: 'aguardando_autorizacao', ultimo_erro: null } : {}) };
  const q = d.id
    ? supabase.from('marketplace_lojas').update(campos).eq('id', d.id).eq('canal', d.canal)
    : supabase.from('marketplace_lojas').insert({ ...campos, loja_id: ctx.lojaId, marca_id: d.marcaId, canal: d.canal, config: {} });
  const { data, error } = await q.select('id').maybeSingle();
  if (error) return { ok: false, erro: /marketplace_lojas_canal_merchant_id_key/.test(error.message) ? 'Esse id de loja já está ligado a outra conexão.' : /duplicate|unique/i.test(error.message) ? 'Este cardápio já tem conexão com esse app.' : error.message };
  if (!data) return { ok: false, erro: 'Conexão não encontrada.' };
  if (novoLogin) {
    if (!d.usuario.trim() || !d.senha) return { ok: false, erro: 'Para trocar o login, preencha o e-mail e a senha.' };
    const { error: e2 } = await admin.rpc('marketplace_segredos_gravar', { p_marketplace_loja: data.id, p_segredos: { usuario: d.usuario.trim(), senha: d.senha, access_token: null } });
    if (e2) return { ok: false, erro: e2.message };
  }
  fim();
  return { ok: true, id: data.id as string };
}

export async function excluirConexaoCliente(id: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from('marketplace_lojas').delete().eq('id', id).in('canal', ['deliverymuch', 'rappi']).select('id');
  if (error) return { ok: false, erro: error.message };
  if (!data?.length) return { ok: false, erro: 'Conexão não encontrada.' };
  fim();
  return { ok: true };
}

/** Pedido fictício no formato do app, pela mesma tradução do pedido real (só conexão em modo teste). */
export async function simularPedidoCanal(conexaoId: string, o: Omit<OpcoesSimulacao, 'itens' | 'agora'>): Promise<R<{ numero: number }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data: c } = await supabase.from('marketplace_lojas').select('id, canal, modo').eq('id', conexaoId).eq('loja_id', ctx.lojaId).maybeSingle();
  if (!c) return { ok: false, erro: 'Conexão não encontrada.' };
  if (c.modo !== 'teste') return { ok: false, erro: 'O simulador só funciona com a conexão em modo teste.' };
  const { data: prods } = await supabase.from('produtos').select('id, nome, preco').eq('loja_id', ctx.lojaId).gt('preco', 0).limit(40);
  const itens = [...(prods ?? [])].sort(() => Math.random() - 0.5).slice(0, 2).map((p, i) => ({ nome: p.nome as string, codigo: p.id as string, preco: Number(p.preco), quantidade: i === 0 ? 1 : 2, obs: i === 0 ? 'Sem cebola' : undefined }));
  const op = { ...o, itens };
  const canal = c.canal as string;
  const p = eCanalOD(canal)
    ? normalizarPedidoOD(pedidoSimuladoOD(op), canal, conexaoId)
    : canal === 'deliverymuch'
      ? normalizarPedidoDM(pedidoSimuladoDM(op), conexaoId)
      : canal === 'rappi'
        ? normalizarPedidoRappi(pedidoSimuladoRappi(op), conexaoId, true)
        : null;
  if (!p) return { ok: false, erro: 'O simulador deste app fica em Aplicativos → iFood.' };
  const { data: id, error } = await supabase.rpc('simular_pedido_marketplace', { p_loja: ctx.lojaId, p });
  if (error) return { ok: false, erro: error.message };
  const { data: ped } = await supabase.from('pedidos').select('numero').eq('id', id as string).single();
  fim();
  return { ok: true, numero: Number(ped?.numero ?? 0) };
}

/** Evento fictício do app num pedido simulado: cancelado pelo cliente, concluído. */
export async function simularEventoCanal(pedidoId: string, codigo: 'CANCELLED' | 'CONCLUDED'): Promise<R<{ resultado: string }>> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('simular_evento_marketplace', { p_pedido: pedidoId, p_codigo: codigo, p_motivo: codigo === 'CANCELLED' ? 'Cliente desistiu (simulado)' : null });
  if (error) return { ok: false, erro: error.message };
  fim();
  return { ok: true, resultado: String(data) };
}

/** Reprocessa um pedido novo que deu erro (o corpo original ficou guardado). */
export async function reprocessarEventoCliente(conexaoId: string, eventoId: number): Promise<R<{ resultado: string }>> {
  const ctx = await contextoLoja();
  if (ctx.papel !== 'dono' && ctx.papel !== 'gerente') return { ok: false, erro: 'Só o dono ou o gerente.' };
  const admin = clienteAdmin();
  if (!admin) return { ok: false, erro: 'Servidor sem a chave de serviço do banco.' };
  const supabase = await criarClienteServidor();
  const { data: c } = await supabase.from('marketplace_lojas').select('id, canal').eq('id', conexaoId).eq('loja_id', ctx.lojaId).maybeSingle();
  if (!c || !eCanalCliente(c.canal as string)) return { ok: false, erro: 'Conexão não encontrada.' };
  const { data } = await admin.rpc('marketplace_evento_para_reprocessar', { p_id: eventoId });
  const ev = data as { canal: string; corpo: unknown; loja_id: string | null; evento_id: string } | null;
  if (!ev || ev.loja_id !== ctx.lojaId || ev.canal !== c.canal || !ev.corpo || !/:novo$/.test(ev.evento_id)) return { ok: false, erro: 'Só dá para reprocessar pedidos novos.' };
  const { criarPedidoCliente } = await import('@/lib/marketplace/canais-cliente');
  try {
    await criarPedidoCliente(conexaoId, c.canal as 'deliverymuch' | 'rappi', ev.corpo);
    await admin.rpc('marketplace_evento_resultado', { p_canal: ev.canal, p_evento_id: ev.evento_id, p_erro: null });
    fim();
    return { ok: true, resultado: 'criado' };
  } catch (e) {
    fim();
    return { ok: false, erro: (e as Error).message };
  }
}
