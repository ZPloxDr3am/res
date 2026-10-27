'use server';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { PainelMotoboy, Entrega } from '@/lib/motoboy';
import { distanciaRota, localizarEntrega, matrizTempos, medir } from '@/lib/geo';
import { minutosEstimados, otimizarRota, type Ponto } from '@res/core';

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
  // a rota sugerida já achou o cliente no mapa: só mede
  if (e.destino_lat != null && e.destino_lng != null) {
    const m = await medir(loja, { lat: e.destino_lat, lng: e.destino_lng });
    const { error } = await supabase.rpc('registrar_distancia', { p_pedido: pedidoId, p_km: m.km, p_fonte: m.fonte });
    return error ? null : m;
  }
  const achado = await localizarEntrega(e.endereco, e.cidade, loja);
  if (!achado) return null;
  // ponto do cliente no mapa ao vivo do painel (D-026)
  if (achado.precisao === 'endereco') await supabase.rpc('registrar_destino', { p_pedido: pedidoId, p_lat: achado.ponto.lat, p_lng: achado.ponto.lng });
  // só achou o bairro e o bairro já tem km cadastrado: fica o do cadastro
  if (achado.precisao === 'bairro' && e.distancia_fonte === 'bairro') return null;
  const m = await medir(loja, achado.ponto);
  const { error } = await supabase.rpc('registrar_distancia', { p_pedido: pedidoId, p_km: m.km, p_fonte: m.fonte });
  return error ? null : m;
}

export type PlanoRota = {
  paradas: { id: string; numero: number; bairro: string | null; chegada: string; atrasoMin: number; aproximado: boolean; semLocal: boolean }[];
  totalMin: number;
  atrasoTotalMin: number;
  fonte: 'rota' | 'estimada';
};

const espera = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/**
 * Ordem sugerida das entregas que estão com o motoboy (D-027): acha cada cliente no mapa (uma vez),
 * pega os tempos pela rua e escolhe a ordem que menos atrasa e menos roda. Grava a ordem no pedido.
 */
export async function planejarRota(origem: Ponto | null): Promise<{ ok: true; plano: PlanoRota } | { ok: false; erro: string }> {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc('motoboy_painel');
  const em = (data as PainelMotoboy | null)?.em_rota ?? [];
  if (em.length === 0) return { ok: false, erro: 'Nenhuma entrega com você.' };
  const loja = em.find((e) => e.loja_lat != null && e.loja_lng != null);
  const partida: Ponto | null = origem ?? (loja ? { lat: loja.loja_lat!, lng: loja.loja_lng! } : null);
  if (!partida) return { ok: false, erro: 'A loja ainda não tem localização (Entregas → Bairros e preços).' };

  // ponto de cada cliente: o que já foi achado, senão procura (um por vez: o mapa gratuito pede calma)
  const pontos = new Map<string, { p: Ponto; aproximado: boolean }>();
  let procurou = false;
  for (const e of em) {
    if (e.destino_lat != null && e.destino_lng != null) {
      pontos.set(e.id, { p: { lat: e.destino_lat, lng: e.destino_lng }, aproximado: false });
      continue;
    }
    if (!e.endereco) continue;
    if (procurou) await espera(1100);
    procurou = true;
    const perto = e.loja_lat != null && e.loja_lng != null ? { lat: e.loja_lat, lng: e.loja_lng } : partida;
    const a = await localizarEntrega(e.endereco, e.cidade, perto);
    if (!a) continue;
    pontos.set(e.id, { p: a.ponto, aproximado: a.precisao === 'bairro' });
    if (a.precisao === 'endereco') await supabase.rpc('registrar_destino', { p_pedido: e.id, p_lat: a.ponto.lat, p_lng: a.ponto.lng });
  }

  const comLocal = em.filter((e) => pontos.has(e.id));
  const semLocal = em.filter((e) => !pontos.has(e.id));
  const todos = [partida, ...comLocal.map((e) => pontos.get(e.id)!.p)];
  const matriz = comLocal.length > 1 ? await matrizTempos(todos) : null;
  const tempo = (i: number, j: number) => matriz?.[i]?.[j] ?? minutosEstimados(todos[i]!, todos[j]!);
  // uma entrega só: ainda vale a previsão de chegada (rota pela rua quando dá)
  if (comLocal.length === 1 && !matriz) {
    const km = await distanciaRota(partida, todos[1]!);
    if (km != null) {
      const minutos = (km * 60) / 25;
      const r0 = otimizarRota([{ id: comLocal[0]!.id, ponto: todos[1]!, prazo: comLocal[0]!.prazo ? Date.parse(comLocal[0]!.prazo) : Date.now() + 3_600_000 }], () => minutos, Date.now());
      await supabase.rpc('registrar_rota', { p_pedidos: [...r0.ordem, ...semLocal.map((e) => e.id)], p_chegadas: chegadas(r0, semLocal.length) });
      return { ok: true, plano: montar(r0, comLocal, semLocal, pontos, 'rota') };
    }
  }
  const agora = Date.now();
  const r = otimizarRota(
    comLocal.map((e) => ({ id: e.id, ponto: pontos.get(e.id)!.p, prazo: e.prazo ? Date.parse(e.prazo) : agora + 3_600_000 })),
    tempo,
    agora,
  );
  await supabase.rpc('registrar_rota', { p_pedidos: [...r.ordem, ...semLocal.map((e) => e.id)], p_chegadas: chegadas(r, semLocal.length) });
  return { ok: true, plano: montar(r, comLocal, semLocal, pontos, matriz ? 'rota' : 'estimada') };
}

/** Hora prevista de cada parada (vai para a página do cliente); sem local, sem previsão. */
const chegadas = (r: ReturnType<typeof otimizarRota>, semLocal: number) => [...r.paradas.map((x) => new Date(x.chegada).toISOString()), ...Array<null>(semLocal).fill(null)];

function montar(
  r: ReturnType<typeof otimizarRota>,
  comLocal: Entrega[],
  semLocal: Entrega[],
  pontos: Map<string, { p: Ponto; aproximado: boolean }>,
  fonte: 'rota' | 'estimada',
): PlanoRota {
  const porId = new Map(comLocal.map((e) => [e.id, e]));
  return {
    paradas: [
      ...r.paradas.map((x) => {
        const e = porId.get(x.id)!;
        return { id: x.id, numero: e.numero, bairro: e.endereco?.bairro ?? null, chegada: new Date(x.chegada).toISOString(), atrasoMin: x.atrasoMin, aproximado: pontos.get(x.id)?.aproximado ?? false, semLocal: false };
      }),
      ...semLocal.map((e) => ({ id: e.id, numero: e.numero, bairro: e.endereco?.bairro ?? null, chegada: '', atrasoMin: 0, aproximado: false, semLocal: true })),
    ],
    totalMin: r.totalMin,
    atrasoTotalMin: r.atrasoTotalMin,
    fonte,
  };
}
