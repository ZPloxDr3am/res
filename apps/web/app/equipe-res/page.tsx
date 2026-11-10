import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { criarClienteServidor } from '@/lib/supabase/server';
import { PainelEquipeRes, type ContaPlataforma, type Convite } from '@/components/equipe-res/painel';

export const metadata: Metadata = { title: 'Equipe RES' };
export const dynamic = 'force-dynamic';

/** Painel do time RES (D-082): convites de cadastro e contas dos restaurantes (teste, ativa, suspensa). */
export default async function EquipeRes() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: equipe } = await supabase.rpc('sou_equipe_res');
  if (equipe !== true) redirect('/pedidos');
  const [{ data: contas }, { data: convites }, { data: modo }] = await Promise.all([
    supabase.rpc('contas_da_plataforma'),
    supabase.from('convites_cadastro').select('codigo, nota, dias_teste, criado_em, expira_em, usado_em, conta_id').order('criado_em', { ascending: false }).limit(100),
    supabase.rpc('cadastro_modo'),
  ]);
  const h = await headers();
  const origem = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
  return (
    <main className="conteudo" style={{ maxWidth: 1240, marginTop: '3vh', marginBottom: '6vh' }}>
      <PainelEquipeRes contas={(contas ?? []) as ContaPlataforma[]} convites={(convites ?? []) as Convite[]} modo={modo === 'aberto' ? 'aberto' : 'convite'} origem={origem} />
    </main>
  );
}
