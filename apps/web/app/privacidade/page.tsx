import type { Metadata } from 'next';
import Link from 'next/link';
import { VERSAO_TERMOS } from '@res/core';

export const metadata: Metadata = { title: 'Política de Privacidade · RES' };

// Versão preliminar (D-076): revisar com advogado; encarregado (DPO) e dados da empresa entram quando o CNPJ sair.
export default function Privacidade() {
  return (
    <main className="conteudo legal" style={{ maxWidth: 760, marginTop: '4vh', marginBottom: '6vh' }}>
      <div className="marca-res" style={{ fontSize: '1.4rem' }}>RES</div>
      <h1>Política de Privacidade</h1>
      <p className="aviso">Versão preliminar de {VERSAO_TERMOS.split('-').reverse().join('/')}, em revisão jurídica, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).</p>

      <h2>1. Quem trata os dados</h2>
      <ul>
        <li><strong>Dados da conta do restaurante</strong> (nome, e-mail, WhatsApp de quem cadastra, equipe, dados da empresa): o RES é o <strong>controlador</strong>.</li>
        <li><strong>Dados dos consumidores</strong> do restaurante (nome, telefone, endereço, pedidos, fidelidade): o <strong>restaurante é o controlador</strong> e o RES é o <strong>operador</strong>, tratando esses dados só para prestar o serviço ao restaurante.</li>
      </ul>

      <h2>2. Quais dados e para quê</h2>
      <ul>
        <li><strong>Cadastro e acesso</strong>: criar e proteger a conta, falar com o restaurante sobre o serviço (base: execução de contrato).</li>
        <li><strong>Pedidos</strong>: receber, preparar, entregar e cobrar o pedido; histórico para o restaurante e o consumidor (execução de contrato).</li>
        <li><strong>Localização do motoboy</strong> (só durante a entrega, quando o app está em uso): rota e acompanhamento da entrega pelo consumidor.</li>
        <li><strong>Registros de acesso</strong> (data, hora, IP): segurança e cumprimento do Marco Civil da Internet (obrigação legal, pelo prazo que a lei pede).</li>
        <li><strong>Marketing do restaurante</strong> (segmentos, avisos pelo WhatsApp): decisão e responsabilidade do restaurante, que deve ter base legal para isso.</li>
      </ul>
      <p>Não vendemos dados. Não usamos os dados dos consumidores de um restaurante para outro restaurante.</p>

      <h2>3. Com quem compartilhamos</h2>
      <ul>
        <li>Hospedagem e banco de dados (Vercel e Supabase), com proteção contratual e servidores que podem estar fora do Brasil.</li>
        <li>Integrações que o próprio restaurante liga (por exemplo iFood, Mercado Pago, WhatsApp), só com os dados necessários.</li>
        <li>Autoridades, quando a lei ou ordem judicial obrigar.</li>
      </ul>

      <h2>4. Segurança</h2>
      <p>Conexão criptografada, acesso por permissão (cada pessoa da equipe vê só o que precisa), regras de acesso no próprio banco de dados, chaves de integração guardadas só no servidor e registro das ações importantes.</p>

      <h2>5. Por quanto tempo</h2>
      <p>Enquanto a conta do restaurante estiver ativa. Depois do cancelamento, 30 dias para exportação e então exclusão, exceto o que a lei obrigar a manter (por exemplo, registros fiscais e de acesso).</p>

      <h2>6. Seus direitos</h2>
      <p>Você pode pedir confirmação, acesso, correção, portabilidade, anonimização ou exclusão dos seus dados, e informação sobre compartilhamento (art. 18 da LGPD). Consumidores de um restaurante devem falar primeiro com o restaurante; nós ajudamos o restaurante a atender.</p>

      <h2>7. Contato</h2>
      <p>O canal do encarregado de dados (DPO) será publicado aqui junto com os dados da empresa.</p>

      <h2>8. Cookies</h2>
      <p>O painel do RES usa só cookies necessários (manter você conectado e lembrar a loja escolhida). No cardápio digital, o restaurante pode ligar pixels de anúncio (Meta, Google); eles só carregam depois que o consumidor aceita no aviso de cookies, e o uso desses dados é responsabilidade do restaurante.</p>

      <p className="dica"><Link href="/cadastro">Voltar ao cadastro</Link> · <Link href="/termos">Termos de Uso</Link></p>
    </main>
  );
}
