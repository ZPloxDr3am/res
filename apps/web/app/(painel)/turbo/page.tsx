import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { TurboVendas, type DadosTurbo, type EnvioFila, type Safra } from '@/components/turbo/turbo-vendas';

export const metadata = { title: 'Turbo-Vendas' };
export const dynamic = 'force-dynamic';

export default async function Turbo({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const [painel, fila, safras] = await Promise.all([
    supabase.rpc('turbo_painel', { p_loja: ctx.lojaId, p_dias: 30 }),
    supabase.rpc('turbo_fila', { p_loja: ctx.lojaId }),
    supabase.rpc('turbo_safras', { p_loja: ctx.lojaId }),
  ]);
  const { aba } = await searchParams;
  return (
    <div className="grade">
      <div>
        <h1 style={{ marginBottom: 0 }}>⚡ Turbo-Vendas · {ctx.lojaNome}</h1>
        <p className="dica" style={{ margin: 0 }}>Traga o cliente de volta no momento certo: automações, campanhas com cupom e quanto cada mensagem vendeu.</p>
      </div>
      {painel.error ? (
        <p className="cartao dica">{painel.error.message}</p>
      ) : (
        <TurboVendas d={painel.data as DadosTurbo} fila={(fila.data ?? []) as EnvioFila[]} safras={(safras.data ?? []) as Safra[]} abaInicial={aba} />
      )}
    </div>
  );
}
