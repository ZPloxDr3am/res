import type { Metadata } from 'next';
import { criarClienteServidor } from '@/lib/supabase/server';
import { FormMotoboy } from './form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Cadastro de motoboy' };

/** Página que a loja manda para o motoboy se cadastrar (D-104). */
export default async function SejaMotoboy({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc('motoboy_link_info', { p_token: token });
  const info = data as { loja: string; cidade: string | null } | null;
  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1rem' }} className="grade">
      {!info ? (
        <section className="cartao grade" style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '2.5rem', margin: 0 }} aria-hidden>🛵</p>
          <h1 style={{ margin: 0 }}>Link inválido</h1>
          <p>Este link de cadastro não está mais ativo. Peça o link novo para a loja.</p>
        </section>
      ) : (
        <>
          <div>
            <p style={{ fontSize: '2.5rem', margin: 0 }} aria-hidden>🛵</p>
            <h1 style={{ margin: 0 }}>Entregas para {info.loja}</h1>
            <p className="dica" style={{ margin: 0 }}>Faça seu cadastro. Quando o gerente aprovar, você entra no app do motoboy com o usuário e a senha que escolher aqui.</p>
          </div>
          <FormMotoboy token={token} loja={info.loja} />
        </>
      )}
    </main>
  );
}
