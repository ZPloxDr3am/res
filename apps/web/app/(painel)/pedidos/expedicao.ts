'use server';
import { agruparEntregas, prazoEntrega, type PedidoExpedicao, type Ponto } from '@res/core';
import { criarClienteServidor } from '@/lib/supabase/server';
import { localizarEntrega } from '@/lib/geo';

export type LoteSugerido = { pedidos: { id: string; numero: number; bairro: string | null }[]; totalMin: number; atrasoMin: number };
export type SugestaoLoja = { lojaId: string; loja: string; lotes: LoteSugerido[] };

const espera = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/**
 * Lotes sugeridos para os pedidos de entrega prontos (D-028): quem sai junto com quem.
 * Acha no mapa o endereço de quem ainda não foi achado (no máximo 6 por vez) e guarda.
 */
export async function sugerirLotes(lojaIds: string[]): Promise<SugestaoLoja[]> {
  const supabase = await criarClienteServidor();
  const [ped, lojas] = await Promise.all([
    supabase
      .from('pedidos')
      .select('id, loja_id, numero, endereco, criado_em, agendado_para, destino_lat, destino_lng')
      .in('loja_id', lojaIds)
      .eq('status', 'pronto')
      .eq('tipo', 'entrega')
      .limit(60),
    supabase.from('lojas').select('id, nome, cidade, lat, lng, prazo_entrega_min').in('id', lojaIds),
  ]);
  if (ped.error || lojas.error) return [];
  const saida: SugestaoLoja[] = [];
  let buscas = 0;
  for (const l of lojas.data ?? []) {
    const lista = (ped.data ?? []).filter((p) => p.loja_id === l.id);
    if (lista.length < 2 || l.lat == null || l.lng == null) continue;
    const loja: Ponto = { lat: l.lat as number, lng: l.lng as number };
    const itens: PedidoExpedicao[] = [];
    for (const p of lista) {
      const end = p.endereco as { logradouro: string; numero?: string; bairro: string } | null;
      let ponto: Ponto | null = p.destino_lat != null ? { lat: p.destino_lat as number, lng: p.destino_lng as number } : null;
      if (!ponto && end && buscas < 6) {
        if (buscas > 0) await espera(1100);
        buscas++;
        const a = await localizarEntrega(end, l.cidade as string | null, loja).catch(() => null);
        if (a) {
          ponto = a.ponto;
          if (a.precisao === 'endereco') await supabase.rpc('registrar_destino', { p_pedido: p.id, p_lat: a.ponto.lat, p_lng: a.ponto.lng });
        }
      }
      itens.push({
        id: p.id as string,
        ponto,
        bairro: end?.bairro ?? null,
        prazo: prazoEntrega(Date.parse(p.criado_em as string), p.agendado_para ? Date.parse(p.agendado_para as string) : null, (l.prazo_entrega_min as number) ?? 35),
      });
    }
    const porId = new Map(lista.map((p) => [p.id as string, p]));
    saida.push({
      lojaId: l.id as string,
      loja: l.nome as string,
      lotes: agruparEntregas(itens, loja, Date.now()).map((x) => ({
        pedidos: x.ids.map((id) => ({ id, numero: porId.get(id)!.numero as number, bairro: (porId.get(id)!.endereco as { bairro?: string } | null)?.bairro ?? null })),
        totalMin: x.totalMin,
        atrasoMin: x.atrasoMin,
      })),
    });
  }
  return saida;
}
