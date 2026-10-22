import { painelMotoboy } from './actions';
import { AppMotoboy } from '@/components/motoboy/app-motoboy';

export const dynamic = 'force-dynamic';

export default async function Motoboy() {
  const painel = await painelMotoboy();
  if (!painel) {
    return (
      <main className="mb-vazio">
        <h1>RES Motoboy</h1>
        <p>Seu usuário não está cadastrado como motoboy em nenhuma loja.</p>
        <p className="dica">Peça ao gerente para criar seu usuário com a função "Entregador" em Lojas e equipe.</p>
        <form action="/auth/sair" method="post"><button>Sair</button></form>
      </main>
    );
  }
  return <AppMotoboy painel={painel} />;
}
