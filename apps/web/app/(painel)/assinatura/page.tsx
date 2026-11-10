import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { cobrancaAutomatica } from '@/lib/cobranca';
import { Assinatura, type DadosAssinatura } from '@/components/assinatura/assinatura';

export const dynamic = 'force-dynamic';

export default async function PaginaAssinatura() {
  const ctx = await contextoLoja();
  const { data, error } = await (await criarClienteServidor()).rpc('minha_assinatura', { p_loja: ctx.lojaId });
  return (
    <div className="grade">
      <div>
        <h1 style={{ marginBottom: 0 }}>Assinatura</h1>
        <p className="dica" style={{ margin: 0 }}>Seu plano no RES, adicionais, aparelhos e faturas. O plano é por conta e cobre 1 loja com 1 cardápio.</p>
      </div>
      {error || !data ? <p className="cartao dica">{error?.message ?? 'Sem acesso.'}</p> : <Assinatura d={data as DadosAssinatura} pixAutomatico={cobrancaAutomatica()} />}
    </div>
  );
}
