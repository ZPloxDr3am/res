import { criarClienteServidor } from '@/lib/supabase/server';
import { RestaurantesRes, type ContaPlataforma } from '@/components/equipe-res/painel';

export const metadata = { title: 'Restaurantes' };

export default async function Restaurantes() {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc('contas_da_plataforma');
  return (
    <div className="grade">
      <div>
        <h1>Restaurantes</h1>
        <p className="dica">Situação de cada conta, contato do responsável e uso. Enquanto a cobrança não é automática, registre aqui o pagamento.</p>
      </div>
      <RestaurantesRes contas={(data ?? []) as ContaPlataforma[]} />
    </div>
  );
}
