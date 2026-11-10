import { redirect } from 'next/navigation';
import { criarClienteServidor } from '@/lib/supabase/server';
import { montarLojaDoCadastro, type PedidoDeLoja } from '@/app/cadastro/actions';

async function criarLoja(form: FormData) {
  'use server';
  const supabase = await criarClienteServidor();
  const nome = String(form.get('nome') ?? '').trim();
  const marca = String(form.get('marca') ?? '').trim();
  const slug = String(form.get('slug') ?? '').trim().toLowerCase();
  const dono = String(form.get('dono') ?? '').trim();
  // conta do cadastro: mesma criação (aceite dos termos, cardápio fechado, exemplo), só troca o que a pessoa corrigiu
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const cad = (user?.user_metadata as { cadastro?: PedidoDeLoja | null } | undefined)?.cadastro;
  if (cad) {
    const r = await montarLojaDoCadastro({ ...cad, restaurante: marca || cad.restaurante, slug, nome: dono || cad.nome });
    redirect(r.ok ? '/comecar' : `/onboarding?erro=${encodeURIComponent(r.erro)}`);
  }
  const { error } = await supabase.rpc('criar_loja', { p_nome: nome, p_marca: marca, p_slug: slug, p_nome_dono: dono });
  if (error) {
    const msg = error.message.includes('marcas_slug_key') ? 'Esse endereço já está em uso. Escolha outro.' : error.message;
    redirect(`/onboarding?erro=${encodeURIComponent(msg)}`);
  }
  redirect('/comecar');
}

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  let { erro } = await searchParams;
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { count } = await supabase.from('membros').select('loja_id', { count: 'exact', head: true }).eq('user_id', user.id).eq('ativo', true);
  if ((count ?? 0) > 0) redirect('/pedidos');
  // equipe RES sem restaurante próprio vai direto para o painel da empresa (D-083)
  const { data: equipe } = await supabase.rpc('sou_equipe_res');
  if (equipe === true) redirect('/empresa');

  // veio do cadastro com e-mail a confirmar (D-076): cria a loja com os dados guardados na conta
  const cadastro = (user.user_metadata as { cadastro?: PedidoDeLoja | null } | undefined)?.cadastro;
  if (cadastro && !erro) {
    const r = await montarLojaDoCadastro(cadastro);
    if (r.ok) redirect('/comecar');
    erro = r.erro;
  }
  // sem dados do cadastro: conta nova só pelo cadastro com convite (D-082)
  if (!cadastro) {
    return (
      <main className="conteudo" style={{ maxWidth: 480, marginTop: '8vh' }}>
        <div className="cartao grade">
          <div className="marca-res" style={{ fontSize: '1.6rem' }}>RES</div>
          <h1 style={{ margin: 0 }}>Sua conta ainda não tem restaurante</h1>
          <p style={{ margin: 0 }}>Se você foi convidado para a equipe de uma loja, peça para o dono ou gerente reenviar o convite para este e-mail. Para cadastrar um restaurante novo, use o código de convite do time do RES.</p>
          <a className="botao botao-primario" href="/cadastro">Cadastrar com convite</a>
          <form action="/auth/sair" method="post"><button className="botao" style={{ width: '100%' }}>Sair</button></form>
        </div>
      </main>
    );
  }
  return (
    <main className="conteudo" style={{ maxWidth: 520, marginTop: '6vh' }}>
      <form action={criarLoja} className="cartao grade">
        <h1>Vamos cadastrar seu restaurante</h1>
        <p className="dica">Uma loja é a sua cozinha. Dentro dela você pode ter várias marcas, cada uma com seu cardápio.</p>
        {erro && <p className="erro" role="alert">{erro}</p>}
        <label>
          Nome da loja
          <input type="text" name="nome" required maxLength={120} placeholder="Ex.: Cozinha Centro" defaultValue={cadastro?.restaurante} />
        </label>
        <label>
          Primeira marca
          <input type="text" name="marca" required maxLength={120} placeholder="Ex.: Pizzaria do Bairro" defaultValue={cadastro?.restaurante} />
        </label>
        <label>
          Endereço do cardápio
          <input type="text" name="slug" required pattern="[a-z0-9]([a-z0-9\-]{1,58}[a-z0-9])?" placeholder="pizzaria-do-bairro" />
          <span className="dica">Letras minúsculas, números e hífen. Vira o link do seu cardápio digital.</span>
        </label>
        <label>
          Seu nome
          <input type="text" name="dono" required maxLength={120} defaultValue={cadastro?.nome} />
        </label>
        <button className="botao-primario">Criar loja</button>
      </form>
    </main>
  );
}
