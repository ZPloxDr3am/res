import Link from 'next/link';
import { formatarReais, pendenciasBomDia, textoBomDia, variacaoBomDia, type BomDia, type PendenciaBomDia } from '@res/core';

const DESTINO: Record<PendenciaBomDia['chave'], string> = {
  vencidas: '/financeiro?aba=contas',
  hoje: '/financeiro?aba=contas',
  pausados: '/estoque?aba=compras',
  compras: '/estoque?aba=compras',
  nfe: '/estoque?aba=nfe',
  extrato: '/financeiro?aba=extrato',
  motoboys: '/lojas',
  agendados: '/pedidos',
};
const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** ☀️ Resumo da manhã (D-105): como foi ontem e o que pede atenção hoje, com um botão para mandar no WhatsApp. */
export function CartaoBomDia({ dados, loja }: { dados: BomDia; loja: string }) {
  const hora = Number(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
  const saudacao = hora < 12 ? '☀️ Bom dia' : hora < 18 ? '🌤️ Boa tarde' : '🌙 Boa noite';
  const ontem = SEMANA[new Date(Date.parse(`${dados.dia}T12:00:00Z`) - 86_400_000).getUTCDay()];
  const v = variacaoBomDia(dados);
  const itens = pendenciasBomDia(dados).map((p) => ({ texto: p.texto, href: DESTINO[p.chave] }));
  const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);
  const zap = `https://wa.me/?text=${encodeURIComponent(textoBomDia(dados, loja))}`;

  return (
    <section className="cartao bom-dia" aria-label="Resumo da manhã">
      <div className="bom-dia-topo">
        <strong>{saudacao}! Ontem ({ontem}): {formatarReais(dados.ontem.vendas)} em {dados.ontem.pedidos} {plural(dados.ontem.pedidos, 'pedido', 'pedidos')}</strong>
        <a className="botao mini" href={zap} target="_blank" rel="noopener noreferrer">Mandar no meu WhatsApp</a>
      </div>
      {v != null && (
        <span className="dica">
          {v >= 0 ? '📈' : '📉'} {v >= 0 ? '+' : ''}{v}% contra {ontem} passada ({formatarReais(dados.semana_passada.vendas)})
          {dados.ontem.cancelados ? ` · ${dados.ontem.cancelados} ${plural(dados.ontem.cancelados, 'cancelado', 'cancelados')}` : ''}
        </span>
      )}
      {itens.length ? (
        <ul>
          {itens.map((i) => (
            <li key={i.texto}>
              <Link href={i.href}>{i.texto} →</Link>
            </li>
          ))}
        </ul>
      ) : (
        <span>✅ Nada pendente para hoje.</span>
      )}
    </section>
  );
}
