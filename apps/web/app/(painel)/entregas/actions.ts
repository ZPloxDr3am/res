'use server';
import { revalidatePath } from 'next/cache';
import { criarClienteServidor } from '@/lib/supabase/server';
import { contextoLoja } from '@/lib/loja';
import { localizar, localizarBairro, medir } from '@/lib/geo';

type R<T = object> = ({ ok: true } & T) | { ok: false; erro: string };

/** Procura o endereço da loja no mapa (não salva: a pessoa confere antes). */
export async function localizarLoja(lojaId: string, endereco: string): Promise<R<{ lat: number; lng: number; nome: string }>> {
  const t = endereco.trim();
  if (t.length < 3) return { ok: false, erro: 'Digite o endereço da loja (rua e número).' };
  const supabase = await criarClienteServidor();
  const { data: loja } = await supabase.from('lojas').select('cidade').eq('id', lojaId).single();
  if (!loja?.cidade) return { ok: false, erro: 'Preencha a cidade da loja em Lojas e equipe (ex.: Pomerode - SC).' };
  const a = await localizar(t, loja.cidade as string);
  if (!a) return { ok: false, erro: 'Não achei esse endereço no mapa. Cole as coordenadas do Google Maps (toque e segure no ponto da loja → copie os números).' };
  return { ok: true, lat: a.ponto.lat, lng: a.ponto.lng, nome: a.nome };
}

export async function salvarLocalLoja(lojaId: string, endereco: string, lat: number | null, lng: number | null): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_local_loja', { p_loja: lojaId, p_endereco: endereco, p_lat: lat, p_lng: lng });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/entregas');
  return { ok: true };
}

export async function salvarPrazoEntrega(lojaId: string, minutos: number): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_prazo_entrega', { p_loja: lojaId, p_minutos: minutos });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/entregas');
  revalidatePath('/pedidos');
  return { ok: true };
}

/** Km da loja até o centro do bairro (pela rua; senão em linha reta). */
export async function calcularKmBairro(lojaId: string, bairro: string): Promise<R<{ km: number; fonte: 'rota' | 'reta' }>> {
  const supabase = await criarClienteServidor();
  const { data: loja } = await supabase.from('lojas').select('cidade, lat, lng').eq('id', lojaId).single();
  if (loja?.lat == null || loja.lng == null) return { ok: false, erro: 'Salve primeiro a localização da loja.' };
  const a = await localizarBairro(bairro, loja.cidade as string | null, { lat: loja.lat as number, lng: loja.lng as number });
  if (!a) return { ok: false, erro: `Não achei o bairro "${bairro}" no mapa — digite o km.` };
  const m = await medir({ lat: loja.lat as number, lng: loja.lng as number }, a.ponto);
  return { ok: true, ...m };
}

export type AreaForm = { bairro: string; taxa: number; valorMotoboy: number | null; km: number | null; ativo: boolean }; // centavos

export async function salvarAreas(marcaId: string, areas: AreaForm[]): Promise<R> {
  const nomes = areas.map((a) => a.bairro.trim().toLowerCase());
  if (nomes.some((n) => !n)) return { ok: false, erro: 'Há um bairro sem nome.' };
  const rep = nomes.find((n, i) => nomes.indexOf(n) !== i);
  if (rep) return { ok: false, erro: `O bairro "${rep}" aparece duas vezes.` };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salvar_areas_entrega', {
    p_marca: marcaId,
    p_areas: areas.map((a) => ({
      bairro: a.bairro.trim(),
      taxa: a.taxa / 100,
      valor_motoboy: a.valorMotoboy == null ? null : a.valorMotoboy / 100,
      km: a.km,
      ativo: a.ativo,
    })),
  });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/entregas');
  revalidatePath('/delivery');
  return { ok: true };
}

/** Fechamento: corrige o valor do motoboy (centavos) e/ou o km de uma entrega. */
export async function ajustarEntrega(pedidoId: string, valorMotoboy: number | null, km: number | null): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('ajustar_entrega', { p_pedido: pedidoId, p_valor_motoboy: valorMotoboy == null ? null : valorMotoboy / 100, p_km: km });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/entregas');
  return { ok: true };
}

export type MotoboyAoVivo = {
  id: string;
  nome: string | null;
  lat: number;
  lng: number;
  precisao: number | null;
  velocidade: number | null;
  rumo: number | null;
  em: string;
  entregas: { id: string; numero: number; loja: string; cliente: string; bairro: string | null; endereco: string; saiu_em: string; distancia_km: number | null; destino_lat: number | null; destino_lng: number | null }[];
  rota: [number, number][];
};
export type AoVivo = { grupo: string; lojas: { nome: string; lat: number; lng: number }[]; motoboys: MotoboyAoVivo[] };

/** Motoboys em rota agora (lojas do grupo), com o caminho desde a saída. */
export async function rastreioAoVivo(): Promise<AoVivo | null> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('rastreio_ao_vivo', { p_loja: ctx.lojaId });
  return error ? null : (data as AoVivo);
}
