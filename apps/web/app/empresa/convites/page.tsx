import { headers } from 'next/headers';
import { criarClienteServidor } from '@/lib/supabase/server';
import { ConvitesRes, type Convite } from '@/components/equipe-res/painel';

export const metadata = { title: 'Convites' };

export default async function Convites() {
  const supabase = await criarClienteServidor();
  const [{ data: convites }, { data: modo }] = await Promise.all([
    supabase.from('convites_cadastro').select('codigo, nota, dias_teste, criado_em, expira_em, usado_em, conta_id').order('criado_em', { ascending: false }).limit(200),
    supabase.rpc('cadastro_modo'),
  ]);
  const h = await headers();
  const origem = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
  return (
    <div className="grade">
      <div>
        <h1>Convites</h1>
        <p className="dica">Cada convite libera um cadastro, uma vez, por 30 dias. Mande o link pelo WhatsApp depois de conversar com o restaurante.</p>
      </div>
      <ConvitesRes convites={(convites ?? []) as Convite[]} modo={modo === 'aberto' ? 'aberto' : 'convite'} origem={origem} />
    </div>
  );
}
