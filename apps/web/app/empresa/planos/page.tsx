import { criarClienteServidor } from '@/lib/supabase/server';
import type { ModuloRes, PlanoRes } from '@res/core';
import { PlanosRes } from '@/components/empresa/planos';

export const metadata = { title: 'Planos e preços' };
export const dynamic = 'force-dynamic';

export default async function Planos() {
  const supabase = await criarClienteServidor();
  const [planos, modulos, desconto] = await Promise.all([supabase.from('planos_res').select('*').order('ordem'), supabase.from('modulos_res').select('*').order('ordem'), supabase.rpc('desconto_anual')]);
  return (
    <div className="grade">
      <div>
        <h1>Planos e preços</h1>
        <p className="dica">Preço por conta (cobre 1 loja e 1 cardápio), o que entra em cada plano, aparelhos grátis e adicionais. Vale na hora para todos os clientes do plano (faturas já com Pix gerado não mudam).</p>
      </div>
      <PlanosRes planos={(planos.data ?? []) as PlanoRes[]} modulos={(modulos.data ?? []) as ModuloRes[]} descontoAnual={Number(desconto.data ?? 20)} />
    </div>
  );
}
