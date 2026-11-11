import type { Metadata } from 'next';
import Link from 'next/link';
import { VERSAO_TERMOS } from '@res/core';

export const metadata: Metadata = { title: 'Termos de Uso · RES' };

// Versão preliminar (D-076): revisar com advogado antes de vender; dados da empresa entram quando o CNPJ sair.
export default function Termos() {
  return (
    <main className="conteudo legal" style={{ maxWidth: 760, marginTop: '4vh', marginBottom: '6vh' }}>
      <div className="marca-res" style={{ fontSize: '1.4rem' }}>RES</div>
      <h1>Termos de Uso</h1>
      <p className="aviso">Versão preliminar de {VERSAO_TERMOS.split('-').reverse().join('/')}, em revisão jurídica. Os dados da empresa responsável pelo RES serão publicados aqui.</p>

      <h2>1. O que é o RES</h2>
      <p>O RES é um sistema on-line para restaurantes: cardápio digital, recebimento e organização de pedidos (delivery, retirada e balcão), entregas, impressão, estoque, financeiro, relatórios e integrações com outros aplicativos. Quem cria a conta é o <strong>restaurante</strong> (pessoa física ou jurídica), aqui chamado de “cliente do RES”.</p>

      <h2>2. Conta e acesso</h2>
      <ul>
        <li>Os dados do cadastro devem ser verdadeiros e mantidos atualizados.</li>
        <li>Login e senha são pessoais. O cliente do RES responde pelo que for feito com os acessos que ele cria para a equipe (caixa, gerente, motoboy).</li>
        <li>Podemos suspender contas usadas para fraude, conteúdo ilegal ou que coloquem o sistema ou outros usuários em risco.</li>
      </ul>

      <h2>3. Responsabilidades do restaurante</h2>
      <ul>
        <li>Cardápio, preços, fotos, promoções, horários, taxas, produtos entregues e o atendimento ao consumidor são de responsabilidade do restaurante, inclusive as obrigações do Código de Defesa do Consumidor e fiscais (emissão de nota).</li>
        <li>O restaurante só deve cadastrar fotos e textos que tem direito de usar.</li>
        <li>Os dados dos consumidores que o restaurante recebe pelo RES são dele e devem ser usados conforme a LGPD (veja a <Link href="/privacidade">Política de Privacidade</Link>).</li>
      </ul>

      <h2>4. Integrações de terceiros</h2>
      <p>Integrações (iFood, Mercado Pago, WhatsApp, entregadores e outras) são ligadas pelo próprio restaurante e seguem também os termos de cada empresa. O RES não responde por indisponibilidade, cobranças ou regras desses serviços.</p>

      <h2>5. Disponibilidade e suporte</h2>
      <p>Trabalhamos para manter o RES no ar o tempo todo, mas pode haver interrupções para manutenção ou por falhas de fornecedores (hospedagem, internet). Recomendamos manter um meio alternativo de receber pedidos.</p>

      <h2>6. Planos e pagamento</h2>
      <p>Os planos, valores, período de teste e forma de cobrança são informados no painel antes de qualquer cobrança. Sem pagamento, a conta pode ser limitada ou suspensa depois de aviso; os dados ficam disponíveis para exportação por 30 dias.</p>

      <h2>7. Cancelamento</h2>
      <p>O restaurante pode cancelar a qualquer momento. Depois do cancelamento, os dados ficam disponíveis para exportação por 30 dias e então são apagados, exceto o que a lei obrigar a guardar.</p>

      <h2>8. Limitação de responsabilidade</h2>
      <p>O RES é uma ferramenta: não participa da venda entre restaurante e consumidor. Na medida permitida em lei, não respondemos por lucros cessantes ou prejuízos indiretos decorrentes do uso ou da indisponibilidade do sistema.</p>

      <h2>9. Mudanças nestes termos</h2>
      <p>Quando os termos mudarem, avisaremos no painel com antecedência. Continuar usando o RES depois do aviso significa aceitar a nova versão.</p>

      <h2>10. Foro</h2>
      <p>Aplica-se a lei brasileira. Fica eleito o foro da comarca da sede da empresa responsável pelo RES, salvo regra legal em contrário.</p>

      <p className="dica"><Link href="/cadastro">Voltar ao cadastro</Link></p>
    </main>
  );
}
