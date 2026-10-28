import { headers } from 'next/headers';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { PainelApi, PainelAplicativos } from '@/lib/aplicativos';
import { Aplicativos } from '@/components/aplicativos/aplicativos';

export const dynamic = 'force-dynamic';

export default async function PaginaAplicativos() {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const [{ data, error }, api] = await Promise.all([supabase.rpc('aplicativos_painel', { p_loja: ctx.lojaId }), supabase.rpc('api_painel', { p_loja: ctx.lojaId })]);
  const h = await headers();
  const origem = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host') ?? 'res-iqzs.vercel.app'}`;
  return (
    <div className="grade">
      <div>
        <h1 style={{ marginBottom: 0 }}>Aplicativos</h1>
        <p className="dica" style={{ margin: 0 }}>Integrações de {ctx.lojaNome}: ligue o que fizer sentido para a sua operação.</p>
      </div>
      {error || !data ? <p className="cartao dica">{error?.message ?? 'Sem acesso.'}</p> : <Aplicativos dados={data as PainelAplicativos} origem={origem} api={(api.data as PainelApi | null) ?? null} />}
    </div>
  );
}
