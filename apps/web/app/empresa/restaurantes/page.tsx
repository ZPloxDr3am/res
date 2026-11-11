import { criarClienteServidor } from '@/lib/supabase/server';
import { RestaurantesRes, type ContaPlataforma } from '@/components/equipe-res/painel';
import type { ModuloRes, PlanoRes } from '@res/core';

export const metadata = { title: 'Restaurantes' };

export default async function Restaurantes() {
  const supabase = await criarClienteServidor();
  const [{ data }, planos, catalogo] = await Promise.all([
    supabase.rpc('contas_da_plataforma'),
    supabase.from('planos_res').select('*').order('ordem'),
    supabase.from('modulos_res').select('*').order('ordem'),
  ]);
  return (
    <div className="grade">
      <div>
        <h1>Restaurantes</h1>
        <p className="dica">Situação de cada conta, contato do responsável e uso. Plano e módulos de cada cliente ficam em “Plano”, no cartão dele.</p>
      </div>
      <RestaurantesRes contas={(data ?? []) as ContaPlataforma[]} planos={(planos.data ?? []) as PlanoRes[]} catalogo={(catalogo.data ?? []) as ModuloRes[]} />
    </div>
  );
}
