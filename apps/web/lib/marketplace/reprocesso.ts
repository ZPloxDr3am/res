import { clienteAdmin } from '@/lib/supabase/admin';
import { tratarEvento, type EventoIfood } from '@/lib/marketplace/ifood';
import { conexaoOD, tratarEventoOD } from '@/lib/marketplace/opendelivery';
import type { OdEvento } from '@res/core';

type Parado = { id: number; canal: string; evento_id: string; marketplace_loja_id: string | null; corpo: unknown };

/**
 * Nova tentativa automática (auditoria de 19/11/2026, P1): eventos do iFood e do Open Delivery gravados e não
 * processados (o processamento depois do webhook caiu ou deu erro) são refeitos pelo agendador, até 5 vezes,
 * por até 6 horas. O resultado de cada tentativa fica no próprio evento, como no botão Reprocessar.
 */
export async function reprocessarParados(limite = 20): Promise<{ tentados: number; ok: number; erros: number }> {
  const db = clienteAdmin();
  if (!db) return { tentados: 0, ok: 0, erros: 0 };
  const { data, error } = await db.rpc('marketplace_eventos_parados', { p_limite: limite });
  if (error) throw new Error(error.message);
  const lista = (data ?? []) as Parado[];
  let ok = 0;
  let erros = 0;
  for (const ev of lista) {
    try {
      if (ev.canal === 'ifood') {
        await tratarEvento(ev.corpo as EventoIfood);
      } else if (ev.marketplace_loja_id) {
        const c = await conexaoOD(ev.marketplace_loja_id);
        if (!c) continue; // conexão desligada ou de outro tipo: fica como está
        await tratarEventoOD(c, ev.corpo as OdEvento);
      } else {
        continue;
      }
      ok++;
    } catch {
      erros++; // o erro já ficou gravado no evento
    }
  }
  return { tentados: lista.length, ok, erros };
}
