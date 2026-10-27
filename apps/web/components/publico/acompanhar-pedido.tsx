'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatarReais, PAGAMENTO_ROTULO, rotuloHorario, type StatusPedido } from '@res/core';
import type { Acompanhamento } from '@/lib/publico';
import { MapaCliente } from './mapa-cliente';

const hora = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : null);

export function AcompanharPedido({ pedido: p }: { pedido: Acompanhamento }) {
  const router = useRouter();
  const final = p.status === 'concluido' || p.status === 'cancelado';

  // atualiza sozinho a cada 15 s enquanto o pedido está andando
  useEffect(() => {
    if (final) return;
    // motoboy a caminho no mapa: a cada 10 s
    const t = setInterval(() => router.refresh(), p.motoboy ? 10000 : 15000);
    return () => clearInterval(t);
  }, [final, router, p.motoboy]);

  const etapas: { status: StatusPedido; rotulo: string; quando: string | null }[] = [
    { status: 'novo', rotulo: 'Pedido enviado', quando: p.criado_em },
    { status: 'em_preparo', rotulo: 'Em preparo', quando: p.aceito_em },
    { status: 'pronto', rotulo: p.tipo === 'entrega' ? 'Pronto' : 'Pronto para retirar', quando: p.pronto_em },
    ...(p.tipo === 'entrega' ? [{ status: 'em_entrega' as StatusPedido, rotulo: 'Saiu para entrega', quando: p.saiu_em }] : []),
    { status: 'concluido', rotulo: p.tipo === 'entrega' ? 'Entregue' : 'Retirado', quando: p.concluido_em },
  ];
  const atual = etapas.findIndex((e) => e.status === p.status);

  const previsao = (() => {
    if (final || !p.aceito_em || p.tipo === 'entrega') return null;
    const fim = new Date(new Date(p.aceito_em).getTime() + p.tempo_preparo_min * 60000);
    return fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  })();

  return (
    <div className="pub">
      <header className="pub-topo">
        <h1>Pedido #{p.numero}</h1>
        <p className="dica" style={{ margin: 0 }}>{p.marca}</p>
      </header>
      <main className="pub-lista grade">
        {p.status === 'cancelado' ? (
          <div className="aviso">
            <strong>Pedido cancelado.</strong> {p.motivo_cancelamento && `Motivo: ${p.motivo_cancelamento}.`} Qualquer dúvida, fale com a loja.
          </div>
        ) : (
          <ol className="pub-etapas">
            {etapas.map((e, i) => (
              <li key={e.status} data-feito={i <= atual ? 'sim' : undefined} aria-current={i === atual ? 'step' : undefined}>
                <span>{e.rotulo}</span>
                <span className="dica">{hora(e.quando)}</span>
              </li>
            ))}
          </ol>
        )}
        {p.agendado_para && p.status !== 'cancelado' && (
          <p className="aviso">
            Pedido agendado para <strong>{rotuloHorario(new Date(p.agendado_para), p.fuso)}</strong>
            {p.tipo === 'entrega' ? ' (entrega)' : ' (retirada)'}.
          </p>
        )}
        {p.status === 'novo' && (
          <p className="dica">
            {p.agendado_para ? 'A loja começa a preparar perto do horário marcado.' : 'Aguardando a loja confirmar.'} Esta página atualiza sozinha.
          </p>
        )}
        {previsao && !p.agendado_para && <p>Previsão de ficar pronto: <strong>{previsao}</strong></p>}
        {p.tipo === 'entrega' && !final && p.status !== 'em_entrega' && !p.agendado_para && (
          <p>Previsão de entrega: até <strong>{hora(p.prazo)}</strong></p>
        )}
        {p.tipo === 'entrega' && p.status === 'em_entrega' && (
          <section className="cartao grade pub-a-caminho" aria-live="polite">
            <strong>🛵 {p.motoboy_nome || 'O motoboy'} saiu com o seu pedido</strong>
            <span>
              {p.previsao_chegada && new Date(p.previsao_chegada).getTime() > Date.now() - 5 * 60_000 ? (
                <>Chega por volta das <strong>{hora(p.previsao_chegada)}</strong></>
              ) : (
                <>Previsão de entrega: até <strong>{hora(p.prazo)}</strong></>
              )}
            </span>
            {p.paradas_antes != null && p.paradas_antes > 0 && (
              <span className="dica">Ele tem {p.paradas_antes === 1 ? '1 entrega' : `${p.paradas_antes} entregas`} antes da sua. O mapa aparece quando ele estiver vindo até você.</span>
            )}
            {p.motoboy && (
              <>
                <span className="dica">Ele está vindo até você — o mapa atualiza sozinho.</span>
                <MapaCliente motoboy={p.motoboy} destino={p.destino} />
              </>
            )}
          </section>
        )}

        <section className="cartao grade" style={{ gap: '0.35rem' }}>
          <h2>Itens</h2>
          <ul className="lista">
            {p.itens.map((i, k) => (
              <li key={k}>
                <div className="pub-linha" style={{ justifyContent: 'space-between' }}>
                  <span>{i.quantidade}× {i.nome}</span>
                  <span>{formatarReais(i.total)}</span>
                </div>
                {i.opcoes.length > 0 && <span className="dica">{i.opcoes.map((o) => o.nome).join(', ')}</span>}
              </li>
            ))}
          </ul>
          {p.taxa_entrega > 0 && <div className="pub-linha" style={{ justifyContent: 'space-between' }}><span className="dica">Entrega</span><span>{formatarReais(p.taxa_entrega)}</span></div>}
          <div className="pub-linha" style={{ justifyContent: 'space-between' }}><strong>Total</strong><strong>{formatarReais(p.total)}</strong></div>
          <span className="dica">
            Pagamento: {PAGAMENTO_ROTULO[p.pagamento]}
            {p.troco_para ? ` · troco para ${formatarReais(p.troco_para)}` : ''}
          </span>
        </section>
        <p className="dica">Guarde este endereço para acompanhar o pedido.</p>
        <Link href={`/c/${p.slug}`} className="botao">Fazer outro pedido</Link>
      </main>
    </div>
  );
}
