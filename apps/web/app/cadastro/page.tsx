import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { criarClienteServidor } from '@/lib/supabase/server';
import { FormCadastro } from '@/components/cadastro/form-cadastro';

export const metadata: Metadata = { title: 'Criar conta · RES', description: 'Cadastre seu restaurante no RES: cardápio digital, pedidos, entregas e gestão.' };
export const dynamic = 'force-dynamic';

/** Cadastro sozinho do restaurante (D-076). Quem já entrou vai para o painel. */
export default async function Cadastro() {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/pedidos');
  const h = await headers();
  const dominio = h.get('x-forwarded-host') ?? h.get('host') ?? 'res';
  return (
    <main className="conteudo" style={{ maxWidth: 560, marginTop: '4vh', marginBottom: '6vh' }}>
      <FormCadastro dominio={dominio} />
    </main>
  );
}
