import { CabecalhoEmpresa } from '@/components/empresa/cabecalho';
import { criarClienteServidor } from '@/lib/supabase/server';
import { cobrancaAutomatica } from '@/lib/cobranca';
import { CobrancaRes, type DadosCobranca } from '@/components/empresa/cobranca';

export const metadata = { title: 'Cobrança' };
export const dynamic = 'force-dynamic';

export default async function Cobranca() {
  const { data, error } = await (await criarClienteServidor()).rpc('cobranca_plataforma');
  return (
    <div className="s-pagina s-gestao">
      <CabecalhoEmpresa
        familia="Gestão"
        titulo="Cobrança"
        subtitulo={<>Faturas geradas sozinhas 5 dias antes de vencer (teste ou mês pago).{' '}
          {cobrancaAutomatica() ? 'O Pix do Mercado Pago quita sozinho.' : 'Pix automático desligado (falta MP_RES_ACCESS_TOKEN): marque como paga quando o Pix cair.'}</>}
      />
      {error || !data ? <p className="cartao dica">{error?.message ?? 'Sem acesso.'}</p> : <CobrancaRes d={data as DadosCobranca} />}
    </div>
  );
}
