// Mapa no servidor: endereço → coordenadas (OpenStreetMap/Nominatim) e distância pela rua (OSRM).
// Serviços públicos e gratuitos, com limite de uso (Nominatim: ~1 pedido por segundo). Usados poucas
// vezes por entrega e no cadastro dos bairros; tudo tem tempo-limite e plano B (D-020).
import { distanciaReta, type Ponto } from '@res/core';

const UA = 'RES-Delivery/1.0 (+https://github.com/ZPloxDr3am/res)';
const espera = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

export type Achado = { ponto: Ponto; nome: string };

/** "Pomerode - SC" → { cidade: 'Pomerode', uf: 'SC' } */
function separarCidade(cidade: string | null | undefined): { cidade: string; uf: string | null } {
  const t = (cidade ?? '').trim();
  const m = t.match(/^(.*?)\s*[-/,]\s*([A-Za-z]{2})$/);
  return m ? { cidade: m[1]!.trim(), uf: m[2]!.toUpperCase() } : { cidade: t, uf: null };
}

async function nominatim(params: Record<string, string>, perto?: Ponto | null): Promise<Achado | null> {
  const u = new URL('https://nominatim.openstreetmap.org/search');
  u.searchParams.set('format', 'jsonv2');
  u.searchParams.set('limit', '1');
  u.searchParams.set('countrycodes', 'br');
  u.searchParams.set('accept-language', 'pt-BR');
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v);
  if (perto) {
    // só procura perto da loja (~35 km): evita achar uma rua com o mesmo nome em outra cidade
    const d = 0.35;
    u.searchParams.set('viewbox', `${perto.lng - d},${perto.lat + d},${perto.lng + d},${perto.lat - d}`);
    u.searchParams.set('bounded', '1');
  }
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA, Referer: 'https://res-iqzs.vercel.app' }, cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { lat: string; lon: string; display_name: string }[];
    const x = j[0];
    if (!x) return null;
    const ponto = { lat: Number(x.lat), lng: Number(x.lon) };
    return Number.isFinite(ponto.lat) && Number.isFinite(ponto.lng) ? { ponto, nome: x.display_name } : null;
  } catch {
    return null;
  }
}

/** Endereço livre (ex.: endereço da loja) dentro da cidade. */
export async function localizar(texto: string, cidade: string | null): Promise<Achado | null> {
  const c = separarCidade(cidade);
  return nominatim({ q: [texto, c.cidade, c.uf, 'Brasil'].filter(Boolean).join(', ') });
}

/** Centro do bairro, perto da loja. */
export async function localizarBairro(bairro: string, cidade: string | null, perto: Ponto): Promise<Achado | null> {
  const c = separarCidade(cidade);
  return nominatim({ q: [bairro, c.cidade, c.uf].filter(Boolean).join(', ') }, perto);
}

export type EnderecoEntrega = { logradouro: string; numero?: string; bairro: string };

/**
 * Endereço do cliente, perto da loja. Tenta rua+número, depois rua+bairro; devolve também a precisão
 * ('endereco' quando achou a rua, 'bairro' quando só achou o bairro).
 */
export async function localizarEntrega(e: EnderecoEntrega, cidade: string | null, perto: Ponto): Promise<(Achado & { precisao: 'endereco' | 'bairro' }) | null> {
  const c = separarCidade(cidade);
  const rua = e.logradouro.trim();
  if (rua) {
    const a = await nominatim({ street: [e.numero?.trim(), rua].filter(Boolean).join(' '), city: c.cidade, state: c.uf ?? '', country: 'Brasil' }, perto);
    if (a) return { ...a, precisao: 'endereco' };
    await espera(1100);
    const b = await nominatim({ q: [rua, e.bairro, c.cidade, c.uf].filter(Boolean).join(', ') }, perto);
    if (b) return { ...b, precisao: 'endereco' };
    await espera(1100);
  }
  const d = await localizarBairro(e.bairro, cidade, perto);
  return d ? { ...d, precisao: 'bairro' } : null;
}

/** Distância pela rua (km), de carro/moto. null se o serviço de rotas não responder. */
export async function distanciaRota(a: Ponto, b: Ponto): Promise<number | null> {
  const u = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false&alternatives=false&steps=false`;
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA }, cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { code: string; routes?: { distance: number }[] };
    const m = j.code === 'Ok' ? j.routes?.[0]?.distance : undefined;
    return m == null ? null : Math.round(m / 10) / 100;
  } catch {
    return null;
  }
}

/** Km da loja até um ponto: pela rua quando dá; senão em linha reta. */
export async function medir(loja: Ponto, destino: Ponto): Promise<{ km: number; fonte: 'rota' | 'reta' }> {
  const rota = await distanciaRota(loja, destino);
  if (rota != null) return { km: rota, fonte: 'rota' };
  return { km: Math.round(distanciaReta(loja, destino) * 100) / 100, fonte: 'reta' };
}
