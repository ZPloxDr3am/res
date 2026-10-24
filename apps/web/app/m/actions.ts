'use server';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { PainelMotoboy, Entrega } from '@/lib/motoboy';
import { localizarEntrega, medir } from '@/lib/geo';

export async function painelMotoboy(): Promise<PainelMotoboy | null> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('motoboy_painel');
  if (error) throw new Error(error.message);
  return data as PainelMotoboy | null;
}

/** Leu o QR da comanda: o pedido sai com este motoboy. Aceita o link inteiro ou só o código. */
export async function despachar(lido: string): Promise<{ ok: true; entrega: Entrega } | { ok: false; erro: string }> {
  const token = (lido.trim().match(/\/m\/d\/([A-Za-z0-9]+)/)?.[1] ?? lido.trim()).slice(0, 64);
  if (!/^[A-Za-z0-9]{16,64}$/.test(token)) return { ok: false, erro: 'Esse QR não é de uma comanda do RES.' };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('motoboy_despachar', { p_token: token });
  if (error) return { ok: false, erro: error.message };
  return { ok: true, entrega: data as Entrega };
}

export async function entregar(pedidoId: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('motoboy_entregar', { p_pedido: pedidoId });
  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}

/**
 * Mede o km da loja até o endereço do cliente (pela rua) e grava no pedido. Lê o pedido do próprio
 * painel do motoboy (não confia no endereço vindo do celular). null = não deu para medir agora.
 */
export async function medirEntrega(pedidoId: string): Promise<{ km: number; fonte: 'rota' | 'reta' } | null> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc('motoboy_painel');
  const e = (data as PainelMotoboy | null)?.em_rota.find((x) => x.id === pedidoId);
  if (!e?.endereco || e.loja_lat == null || e.loja_lng == null) return null;
  if (e.distancia_fonte === 'rota' || e.distancia_fonte === 'manual') return null;
  const loja = { lat: e.loja_lat, lng: e.loja_lng };
  const achado = await localizarEntrega(e.endereco, e.cidade, loja);
  if (!achado) return null;
  // só achou o bairro e o bairro já tem km cadastrado: fica o do cadastro
  if (achado.precisao === 'bairro' && e.distancia_fonte === 'bairro') return null;
  const m = await medir(loja, achado.ponto);
  const { error } = await supabase.rpc('registrar_distancia', { p_pedido: pedidoId, p_km: m.km, p_fonte: m.fonte });
  return error ? null : m;
}
