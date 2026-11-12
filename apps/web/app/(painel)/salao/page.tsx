import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { carregarDadosNovoPedido } from '@/lib/novo-pedido';
import { Salao } from '@/components/salao/salao';
import type { MapaSalao } from '@/components/salao/tipos';
import { TempoReal } from '@/components/tempo-real';

export const metadata = { title: 'Salão' };
export const dynamic = 'force-dynamic';

/** Salão (D-099): mesas, comandas, app do garçom e fechamento da conta. */
export default async function PaginaSalao() {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const [mapa, dados] = await Promise.all([
    supabase.rpc('salao_mapa', { p_loja: ctx.lojaId }),
    carregarDadosNovoPedido(ctx.lojaId, ctx.marcas.filter((m) => !m.evento), ctx.papel),
  ]);
  return (
    <div className="grade">
      <TempoReal lojaId={ctx.lojaId} tabelas={['salao_contas', 'pedidos']} reservaMs={15000} />
      <div>
        <h1 style={{ marginBottom: 0 }}>🍽️ Salão · {ctx.lojaNome}</h1>
        <p className="dica" style={{ margin: 0 }}>Toque na mesa para abrir, lançar itens (vão direto para a cozinha) e fechar a conta.</p>
      </div>
      {mapa.error ? <p className="cartao dica">{mapa.error.message}</p> : <Salao mapa={mapa.data as MapaSalao} dados={dados} />}
    </div>
  );
}
