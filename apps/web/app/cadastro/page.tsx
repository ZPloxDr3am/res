import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { criarClienteServidor } from '@/lib/supabase/server';
import { FormCadastro } from '@/components/cadastro/form-cadastro';

export const metadata: Metadata = { title: 'Criar conta · RES', description: 'Cadastre seu restaurante no RES: cardápio digital, pedidos, entregas e gestão.' };
export const dynamic = 'force-dynamic';

/** Cadastro sozinho do restaurante (D-076). Quem já entrou vai para o painel. */
export default async function Cadastro({ searchParams }: { searchParams: Promise<{ convite?: string }> }) {
  const convite = ((await searchParams).convite ?? '').trim().toUpperCase().slice(0, 12);
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/pedidos');
  // D-082: enquanto a cobrança não abre o cadastro para todos, só entra quem tem convite
  const [{ data: modo }, { data: valido }] = await Promise.all([
    supabase.rpc('cadastro_modo'),
    convite ? supabase.rpc('convite_valido', { p_codigo: convite }) : Promise.resolve({ data: false }),
  ]);
  if (modo !== 'aberto' && valido !== true) {
    return (
      <main className="conteudo" style={{ maxWidth: 480, marginTop: '8vh' }}>
        <form className="cartao grade" action="/cadastro" method="get">
          <div className="marca-res" style={{ fontSize: '1.6rem' }}>RES</div>
          <h1 style={{ margin: 0 }}>Cadastro por convite</h1>
          <p style={{ margin: 0 }}>Estamos abrindo o RES aos poucos, com acompanhamento do time em cada restaurante. Digite o código que você recebeu.</p>
          {convite && <p className="erro" role="alert" style={{ margin: 0 }}>Esse convite não vale mais (já foi usado ou venceu). Peça um novo ao time do RES.</p>}
          <label>Código do convite<input name="convite" defaultValue={convite} required maxLength={12} autoCapitalize="characters" spellCheck={false} placeholder="Ex.: K7M2Q9XA" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }} /></label>
          <button className="botao-primario">Continuar</button>
          <p className="dica" style={{ margin: 0 }}>Não tem convite? Fale com quem te apresentou o RES. Já tem conta? <a href="/login">Entrar</a></p>
        </form>
      </main>
    );
  }
  const h = await headers();
  const dominio = h.get('x-forwarded-host') ?? h.get('host') ?? 'res';
  return (
    <main className="conteudo" style={{ maxWidth: 560, marginTop: '4vh', marginBottom: '6vh' }}>
      <FormCadastro dominio={dominio} convite={convite} />
    </main>
  );
}
