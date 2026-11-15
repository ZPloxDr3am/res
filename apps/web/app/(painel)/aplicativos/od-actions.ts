'use server';
import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { eCanalOD } from '@res/core';
import { contextoLoja } from '@/lib/loja';
import { clienteAdmin } from '@/lib/supabase/admin';
import { criarClienteServidor } from '@/lib/supabase/server';

// Open Delivery (D-116): cada conexão = loja × cardápio × app. Os segredos ficam no cofre (private),
// gravados só pelo servidor depois de o banco confirmar (RLS de gestor) que a conexão é desta loja.
type R<T = object> = ({ ok: true } & T) | { ok: false; erro: string };
const httpsOuVazio = (u: string) => !u || /^https:\/\/[^\s/]+\.[^\s]+$/.test(u);

/** Cria a conexão e devolve a chave (X-API-KEY) uma única vez. */
export async function criarConexaoOD(d: { canal: string; marcaId: string }): Promise<R<{ id: string; apiKey: string }>> {
  if (!eCanalOD(d.canal)) return { ok: false, erro: 'App inválido.' };
  const admin = clienteAdmin();
  if (!admin) return { ok: false, erro: 'Servidor sem a chave de serviço do banco.' };
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from('marketplace_lojas')
    .insert({ loja_id: ctx.lojaId, marca_id: d.marcaId, canal: d.canal, merchant_id: null, modo: 'teste', ativo: true, estado: 'aguardando_autorizacao', config: {} })
    .select('id')
    .single();
  if (error) return { ok: false, erro: /duplicate|unique/i.test(error.message) ? 'Este cardápio já tem conexão com esse app.' : error.message };
  const apiKey = `res_od_${randomBytes(24).toString('base64url')}`;
  const { error: e2 } = await admin.rpc('marketplace_segredos_gravar', { p_marketplace_loja: data.id, p_segredos: { api_key: apiKey } });
  if (e2) return { ok: false, erro: e2.message };
  revalidatePath('/aplicativos');
  return { ok: true, id: data.id as string, apiKey };
}

/** Dados que o app entrega à loja: URL base, URL do token, client id/secret e o id da loja no app. */
export async function salvarConexaoOD(d: { id: string; baseUrl: string; tokenUrl: string; clientId: string; clientSecret: string; merchantId: string; modo: 'teste' | 'producao' }): Promise<R> {
  const baseUrl = d.baseUrl.trim().replace(/\/+$/, '');
  const tokenUrl = d.tokenUrl.trim();
  if (!httpsOuVazio(baseUrl) || !httpsOuVazio(tokenUrl)) return { ok: false, erro: 'As URLs do app precisam começar com https://.' };
  if (d.modo === 'producao' && (!baseUrl || !d.clientId.trim())) return { ok: false, erro: 'Para produção, preencha a URL do app e o client id.' };
  const admin = clienteAdmin();
  if (!admin) return { ok: false, erro: 'Servidor sem a chave de serviço do banco.' };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from('marketplace_lojas')
    .update({
      config: { base_url: baseUrl || null, token_url: tokenUrl || null, client_id: d.clientId.trim() || null },
      merchant_id: d.merchantId.trim() || null,
      modo: d.modo,
      estado: baseUrl && d.clientId.trim() ? 'conectado' : 'aguardando_autorizacao',
    })
    .eq('id', d.id)
    .in('canal', ['99food', 'keeta', 'aiqfome'])
    .select('id, canal')
    .maybeSingle();
  if (error) return { ok: false, erro: /marketplace_lojas_canal_merchant_id_key/.test(error.message) ? 'Esse id de loja já está ligado a outra conexão.' : error.message };
  if (!data || !eCanalOD(data.canal as string)) return { ok: false, erro: 'Conexão não encontrada.' };
  if (d.clientSecret.trim()) {
    // trocou o segredo: o token antigo deixa de valer
    const { error: e2 } = await admin.rpc('marketplace_segredos_gravar', { p_marketplace_loja: d.id, p_segredos: { client_secret: d.clientSecret.trim(), access_token: null } });
    if (e2) return { ok: false, erro: e2.message };
  }
  revalidatePath('/aplicativos');
  return { ok: true };
}

/** Nova chave X-API-KEY (a antiga para de funcionar na hora). */
export async function novaChaveOD(id: string): Promise<R<{ apiKey: string }>> {
  const admin = clienteAdmin();
  if (!admin) return { ok: false, erro: 'Servidor sem a chave de serviço do banco.' };
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from('marketplace_lojas').update({ estado: 'aguardando_autorizacao' }).eq('id', id).in('canal', ['99food', 'keeta', 'aiqfome']).select('id, canal').maybeSingle();
  if (!data || !eCanalOD(data.canal as string)) return { ok: false, erro: 'Conexão não encontrada.' };
  const apiKey = `res_od_${randomBytes(24).toString('base64url')}`;
  const { error } = await admin.rpc('marketplace_segredos_gravar', { p_marketplace_loja: id, p_segredos: { api_key: apiKey } });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/aplicativos');
  return { ok: true, apiKey };
}

export async function excluirConexaoOD(id: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from('marketplace_lojas').delete().eq('id', id).in('canal', ['99food', 'keeta', 'aiqfome']).select('id');
  if (error) return { ok: false, erro: error.message };
  if (!data?.length) return { ok: false, erro: 'Conexão não encontrada.' };
  revalidatePath('/aplicativos');
  return { ok: true };
}

/** Reprocessa um evento que deu erro (o corpo original ficou guardado). */
export async function reprocessarEventoOD(conexaoId: string, eventoId: number): Promise<R<{ resultado: string }>> {
  const ctx = await contextoLoja();
  if (ctx.papel !== 'dono' && ctx.papel !== 'gerente') return { ok: false, erro: 'Só o dono ou o gerente.' };
  const admin = clienteAdmin();
  if (!admin) return { ok: false, erro: 'Servidor sem a chave de serviço do banco.' };
  const supabase = await criarClienteServidor();
  const { data: dono } = await supabase.from('marketplace_lojas').select('id').eq('id', conexaoId).eq('loja_id', ctx.lojaId).maybeSingle();
  if (!dono) return { ok: false, erro: 'Conexão não encontrada.' };
  const { conexaoOD, tratarEventoOD } = await import('@/lib/marketplace/opendelivery');
  const c = await conexaoOD(conexaoId);
  const { data } = await admin.rpc('marketplace_evento_para_reprocessar', { p_id: eventoId });
  const ev = data as { canal: string; corpo: unknown; loja_id: string | null } | null;
  if (!c || !ev || ev.loja_id !== ctx.lojaId || ev.canal !== c.canal || !ev.corpo) return { ok: false, erro: 'Evento não encontrado.' };
  try {
    const resultado = await tratarEventoOD(c, ev.corpo as import('@res/core').OdEvento);
    revalidatePath('/aplicativos');
    return { ok: true, resultado };
  } catch (e) {
    revalidatePath('/aplicativos');
    return { ok: false, erro: (e as Error).message };
  }
}
