import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { cobrancaAutomatica } from '@/lib/cobranca';
import { Assinatura, type DadosAssinatura } from '@/components/assinatura/assinatura';

export const dynamic = 'force-dynamic';

export default async function PaginaAssinatura() {
  const ctx = await contextoLoja();
  const { data, error } = await (await criarClienteServidor()).rpc('minha_assinatura', { p_loja: ctx.lojaId });
  return (
    <div className="s-pagina s-gestao">
      <header className="s-cabecalho">
        <div className="s-cabecalho-texto">
          <p className="s-sobretitulo">Configurações</p>
          <h1 className="s-titulo">Assinatura</h1>
          <p className="s-subtitulo">Seu plano no SINO, adicionais, aparelhos e faturas. O plano é por conta e cobre 1 loja com 1 cardápio.</p>
        </div>
      </header>
      {error || !data ? <p className="cartao dica">{error?.message ?? 'Sem acesso.'}</p> : <Assinatura d={data as DadosAssinatura} pixAutomatico={cobrancaAutomatica()} />}
    </div>
  );
}
