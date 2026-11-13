import Link from 'next/link';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { ListaAvaliacoes, type DadosAvaliacoes } from '@/components/avaliacoes/lista';

export const dynamic = 'force-dynamic';

/** ⭐ Avaliações dos clientes (D-111). */
export default async function Avaliacoes({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const ctx = await contextoLoja();
  if (ctx.papel !== 'dono' && ctx.papel !== 'gerente') {
    return (
      <div className="grade">
        <h1>Avaliações</h1>
        <p className="cartao dica">Só o dono ou o gerente veem as avaliações.</p>
      </div>
    );
  }
  const sp = await searchParams;
  const dias = [7, 30, 90].includes(Number(sp.dias)) ? Number(sp.dias) : 30;
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('avaliacoes_painel', { p_loja: ctx.lojaId, p_dias: dias });
  return (
    <div className="grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="grade" style={{ gap: '0.1rem' }}>
          <h1 style={{ margin: 0 }}>Avaliações</h1>
          <span className="dica">O cliente avalia na página do pedido, depois de entregue. Nota 4 ou 5 recebe o convite para o Google; nota baixa avisa aqui na hora.</span>
        </div>
        <div className="linha" style={{ gap: '0.35rem' }}>
          {[7, 30, 90].map((d) => (
            <Link key={d} href={`/avaliacoes?dias=${d}`} className="botao mini" aria-current={dias === d || undefined}>{d} dias</Link>
          ))}
        </div>
      </div>
      {error ? <p className="erro">{/avaliacoes/.test(error.message) ? 'A atualização do banco desta tela ainda não foi aplicada (D-111).' : error.message}</p> : <ListaAvaliacoes dados={data as DadosAvaliacoes} loja={ctx.lojaNome} />}
    </div>
  );
}
