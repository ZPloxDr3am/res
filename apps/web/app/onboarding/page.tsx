import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';

async function criarLoja(form: FormData) {
  'use server';
  const supabase = await criarClienteServidor();
  const nome = String(form.get('nome') ?? '').trim();
  const marca = String(form.get('marca') ?? '').trim();
  const slug = String(form.get('slug') ?? '').trim().toLowerCase();
  const dono = String(form.get('dono') ?? '').trim();
  const { error } = await supabase.rpc('criar_loja', { p_nome: nome, p_marca: marca, p_slug: slug, p_nome_dono: dono });
  if (error) {
    const msg = error.message.includes('marcas_slug_key') ? 'Esse endereço já está em uso. Escolha outro.' : error.message;
    redirect(`/onboarding?erro=${encodeURIComponent(msg)}`);
  }
  redirect('/cardapio');
}

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="conteudo" style={{ maxWidth: 520, marginTop: '6vh' }}>
      <form action={criarLoja} className="cartao grade">
        <h1>Vamos cadastrar seu restaurante</h1>
        <p className="dica">Uma loja é a sua cozinha. Dentro dela você pode ter várias marcas, cada uma com seu cardápio.</p>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <label>
          Nome da loja
          <input type="text" name="nome" required maxLength={120} placeholder="Ex.: Cozinha Centro" />
        </label>
        <label>
          Primeira marca
          <input type="text" name="marca" required maxLength={120} placeholder="Ex.: Pizzaria do Bairro" />
        </label>
        <label>
          Endereço do cardápio
          <input type="text" name="slug" required pattern="[a-z0-9]([a-z0-9-]{1,58}[a-z0-9])?" placeholder="pizzaria-do-bairro" />
          <span className="dica">Letras minúsculas, números e hífen. Vira o link do seu cardápio digital.</span>
        </label>
        <label>
          Seu nome
          <input type="text" name="dono" required maxLength={120} />
        </label>
        <button className="botao-primario">Criar loja</button>
      </form>
    </main>
  );
}
