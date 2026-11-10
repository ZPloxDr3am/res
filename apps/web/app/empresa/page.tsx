import Link from 'next/link';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { ContaPlataforma } from '@/components/equipe-res/painel';

export const metadata = { title: 'Visão geral' };

type Numeros = Record<
  'convites_30d' | 'convites_usados_30d' | 'convites_abertos' | 'contas' | 'em_teste' | 'teste_vencendo_3d' | 'ativas' | 'pausadas' | 'lojas' | 'cardapio_aberto' | 'lojas_com_pedido_7d' | 'pedidos_7d' | 'cadastros' | 'cadastros_com_pedido' | 'cadastros_cardapio_aberto',
  number
>;

/** Visão geral da plataforma (D-083): quantos restaurantes, em que situação, e o caminho do convite ao primeiro pedido. */
export default async function VisaoGeral() {
  const supabase = await criarClienteServidor();
  const [{ data: n }, { data: contas }] = await Promise.all([supabase.rpc('numeros_plataforma'), supabase.rpc('contas_da_plataforma')]);
  const x = (n ?? {}) as Numeros;
  const lista = (contas ?? []) as ContaPlataforma[];
  const vencendo = lista.filter((c) => c.situacao === 'teste' && c.liberada && c.teste_ate && Date.parse(c.teste_ate) - Date.now() < 3 * 86_400_000);
  const pausadas = lista.filter((c) => !c.liberada);
  const funil = [
    { r: 'Convites usados', v: x.cadastros ?? 0 },
    { r: 'Abriram o cardápio', v: x.cadastros_cardapio_aberto ?? 0 },
    { r: 'Receberam pedido', v: x.cadastros_com_pedido ?? 0 },
  ];
  const topo = Math.max(1, ...funil.map((f) => f.v));
  return (
    <div className="grade">
      <div>
        <h1>Visão geral</h1>
        <p className="dica">A plataforma hoje: restaurantes, situação das contas e uso nos últimos 7 dias.</p>
      </div>

      <div className="kpis">
        <div className="cartao kpi"><span className="dica">Restaurantes</span><span className="kpi-valor">{x.contas ?? 0}</span><span className="kpi-frase">{x.lojas ?? 0} lojas · {x.cardapio_aberto ?? 0} com cardápio aberto</span></div>
        <div className="cartao kpi"><span className="dica">Em teste grátis</span><span className="kpi-valor">{x.em_teste ?? 0}</span><span className="kpi-frase">{x.teste_vencendo_3d ?? 0} vencem em até 3 dias</span></div>
        <div className="cartao kpi"><span className="dica">Ativas</span><span className="kpi-valor">{x.ativas ?? 0}</span><span className="kpi-frase">{x.pausadas ?? 0} pausada(s)</span></div>
        <div className="cartao kpi"><span className="dica">Pedidos em 7 dias</span><span className="kpi-valor">{x.pedidos_7d ?? 0}</span><span className="kpi-frase">em {x.lojas_com_pedido_7d ?? 0} loja(s)</span></div>
      </div>

      <section className="cartao grade">
        <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Do convite ao primeiro pedido</h2>
          <span className="dica">{x.convites_30d ?? 0} convites criados em 30 dias · {x.convites_abertos ?? 0} ainda sem uso</span>
        </div>
        <div className="emp-funil">
          {funil.map((f, i) => (
            <div key={f.r} className="emp-funil-linha">
              <span>{f.r}</span>
              <span className="emp-funil-trilho"><span style={{ width: `${Math.max(2, (f.v / topo) * 100)}%` }} /></span>
              <strong>{f.v}</strong>
              <span className="dica">{i > 0 && funil[i - 1]!.v > 0 ? `${Math.round((f.v / funil[i - 1]!.v) * 100)}%` : ''}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grade" style={{ gap: 'var(--e3)' }}>
        <h2 style={{ margin: 0 }}>Precisa de atenção</h2>
        {vencendo.length === 0 && pausadas.length === 0 && <p className="dica" style={{ margin: 0 }}>Nada urgente agora.</p>}
        {vencendo.map((c) => (
          <div key={c.id} className="cartao emp-alerta" data-tipo="fim">
            <strong>{c.nome}</strong>
            <span>Teste vence em {Math.max(0, Math.ceil((Date.parse(c.teste_ate!) - Date.now()) / 86_400_000))} dia(s). Ligue para combinar o plano.</span>
          </div>
        ))}
        {pausadas.map((c) => (
          <div key={c.id} className="cartao emp-alerta" data-tipo="pausada">
            <strong>{c.nome}</strong>
            <span>Pedidos novos pausados ({c.situacao === 'suspensa' ? 'suspensa' : c.situacao === 'teste' ? 'teste vencido' : 'assinatura vencida'}).</span>
          </div>
        ))}
        <Link href="/empresa/restaurantes" className="botao" style={{ justifySelf: 'start' }}>Ver todos os restaurantes</Link>
      </section>
    </div>
  );
}
