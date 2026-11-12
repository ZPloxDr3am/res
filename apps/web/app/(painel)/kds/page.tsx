import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { Kds, type FilaKds } from '@/components/kds/kds';

export const metadata = { title: 'Cozinha (KDS)' };
export const dynamic = 'force-dynamic';

/** Tela da cozinha (D-099): pedidos em preparo por estação; toque no item = pronto. A impressora continua. */
export default async function PaginaKds() {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('kds_fila', { p_loja: ctx.lojaId, p_estacao: null });
  if (error) return <p className="cartao dica">{error.message}</p>;
  return <Kds inicial={data as FilaKds} gestor={ctx.papel === 'dono' || ctx.papel === 'gerente'} />;
}
