'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { formatarReais } from '@res/core';
import { desligarLojaIfood, ligarItemIfood, salvarLojaIfood, simularEventoIfood, simularNegociacaoIfood, simularPedidoIfood } from '@/app/(painel)/aplicativos/ifood-actions';
import { salvando } from '@/components/tempo-real';
import type { PainelIfood } from '@/lib/aplicativos';

const ACAO: Record<string, string> = { confirm: 'Confirmar', readyToPickup: 'Pronto para retirar', dispatch: 'Saiu para entrega', requestCancellation: 'Cancelar', negociacao: 'Resposta da negociação' };
const SITUACAO: Record<string, string> = { simulado: '🧪 simulado', pendente: '⏳ na fila', enviado: '✅ enviado', erro: '⚠️ erro' };
const STATUS: Record<string, string> = { novo: 'Novo', em_preparo: 'Em preparo', pronto: 'Pronto', em_entrega: 'Saiu', concluido: 'Concluído', cancelado: 'Cancelado' };

/** iFood no RES (D-074): ligar cardápio ↔ loja do iFood, simulador do modo teste, itens e fila de volta. */
export function PainelIfoodApp({ d }: { d: PainelIfood }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [nova, setNova] = useState({ marcaId: d.marcas.find((m) => !d.lojas.some((l) => l.marca_id === m.id))?.id ?? '', merchantId: 'teste', modo: 'teste' as 'teste' | 'producao' });
  const [sim, setSim] = useState({ tipo: 'entrega' as 'entrega' | 'retirada', agendado: false, pagamento: 'online' as 'online' | 'dinheiro' | 'cartao_na_entrega', cupom: true });
  const teste = d.lojas.find((l) => l.modo === 'teste' && l.ativo);
  const fazer = <T extends object>(p: Promise<({ ok: true } & T) | { ok: false; erro: string }>, ok: string | ((r: T) => string)) =>
    iniciar(async () => {
      const r = await salvando(p);
      setMsg(r.ok ? { ok: true, t: typeof ok === 'function' ? ok(r) : ok } : { ok: false, t: r.erro });
    });
  const nomeMarca = (id: string) => d.marcas.find((m) => m.id === id)?.nome ?? '—';
  const semLigacao = d.itens.filter((i) => i.tipo === 'item' && !i.produto_id);

  return (
    <div className="grade" style={{ gap: '1rem' }}>
      <p className="dica" style={{ margin: 0 }}>
        {d.configurado
          ? '✅ Credenciais do aplicativo do iFood configuradas no servidor.'
          : '🧪 Ainda sem conta do iFood: tudo funciona em modo teste. Quando o aplicativo for aprovado, as credenciais entram no servidor e você troca a loja para produção.'}
      </p>

      <section className="grade" style={{ gap: '0.5rem' }}>
        <strong>1. Cardápio ↔ loja do iFood</strong>
        {d.lojas.length > 0 && (
          <ul className="qp-fila">
            {d.lojas.map((l) => (
              <li key={l.id}>
                <span className="grade" style={{ gap: 0 }}>
                  <strong>{nomeMarca(l.marca_id)} → {l.merchant_id}</strong>
                  <span className="dica">{l.modo === 'teste' ? '🧪 modo teste' : '🟢 produção'}{l.ultimo_evento_em ? ` · último pedido ${new Date(l.ultimo_evento_em).toLocaleString('pt-BR')}` : ''}</span>
                </span>
                <button type="button" className="mini" disabled={pendente} onClick={() => fazer(desligarLojaIfood(l.id), 'Desligado.')}>Desligar</button>
              </li>
            ))}
          </ul>
        )}
        {d.marcas.some((m) => !d.lojas.some((l) => l.marca_id === m.id)) && (
          <div className="linha" style={{ alignItems: 'flex-end', gap: '0.5rem' }}>
            <label>Cardápio<select value={nova.marcaId} onChange={(e) => setNova({ ...nova, marcaId: e.target.value })}>{d.marcas.filter((m) => !d.lojas.some((l) => l.marca_id === m.id)).map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></label>
            <label>Merchant ID do iFood<input value={nova.merchantId} onChange={(e) => setNova({ ...nova, merchantId: e.target.value })} style={{ width: '14rem' }} /></label>
            <label>Modo<select value={nova.modo} onChange={(e) => setNova({ ...nova, modo: e.target.value as 'teste' | 'producao' })}><option value="teste">Teste</option><option value="producao" disabled={!d.configurado}>Produção</option></select></label>
            <button type="button" className="botao-primario" disabled={pendente || !nova.marcaId} onClick={() => fazer(salvarLojaIfood(nova), 'Cardápio ligado ao iFood.')}>Ligar</button>
          </div>
        )}
      </section>

      {teste && (
        <section className="grade cartao" style={{ gap: '0.5rem' }}>
          <strong>2. 🧪 Simulador de pedido do iFood</strong>
          <span className="dica">Cria um pedido igual ao do iFood (com produtos desta loja) e ele cai no quadro. Use para treinar a equipe e testar impressão, cancelamento e estoque.</span>
          <div className="qp-filtros">
            {(['entrega', 'retirada'] as const).map((t) => <button key={t} type="button" className="qp-chip" aria-pressed={sim.tipo === t} onClick={() => setSim({ ...sim, tipo: t })}>{t === 'entrega' ? '🛵 Entrega' : '🏪 Retirada'}</button>)}
            <button type="button" className="qp-chip" aria-pressed={sim.agendado} onClick={() => setSim({ ...sim, agendado: !sim.agendado })}>📅 Agendado</button>
            {(['online', 'dinheiro', 'cartao_na_entrega'] as const).map((p) => <button key={p} type="button" className="qp-chip" aria-pressed={sim.pagamento === p} onClick={() => setSim({ ...sim, pagamento: p })}>{p === 'online' ? '💳 Pago no app' : p === 'dinheiro' ? '💵 Dinheiro (troco)' : '💳 Cartão na entrega'}</button>)}
            <button type="button" className="qp-chip" aria-pressed={sim.cupom} onClick={() => setSim({ ...sim, cupom: !sim.cupom })}>🎟️ Cupom (iFood + loja)</button>
          </div>
          <div className="linha">
            <button type="button" className="botao-primario" disabled={pendente} onClick={() => fazer(simularPedidoIfood({ merchantId: teste.merchant_id, ...sim }), (r) => `Pedido #${r.numero} do iFood criado. Veja no quadro de pedidos.`)}>
              🧪 Criar pedido de teste
            </button>
            <Link className="botao" href="/pedidos">Abrir o quadro</Link>
          </div>
          {d.pedidos.length > 0 && (
            <>
              <span className="dica">Simular o que o iFood manda depois:</span>
              <ul className="qp-fila">
                {d.pedidos.map((p) => (
                  <li key={p.id}>
                    <span className="grade" style={{ gap: 0 }}>
                      <strong>#{p.numero} · iFood {p.externo_codigo} · {formatarReais(Math.round(p.total * 100))}</strong>
                      <span className="dica">{STATUS[p.status] ?? p.status} · {p.tipo}</span>
                    </span>
                    {p.status !== 'cancelado' && (
                      <span className="linha" style={{ gap: '0.3rem', flexWrap: 'wrap' }}>
                        {p.status === 'concluido' ? (
                          <>
                            <button type="button" className="mini" disabled={pendente} onClick={() => fazer(simularNegociacaoIfood(p.id, 'apos_entrega'), 'Negociação aberta: veja no topo do quadro.')}>Reclamou depois da entrega</button>
                            <button type="button" className="mini" disabled={pendente} onClick={() => fazer(simularNegociacaoIfood(p.id, 'parcial'), 'Negociação aberta: veja no topo do quadro.')}>Faltou item</button>
                          </>
                        ) : (
                          <>
                            <button type="button" className="mini" disabled={pendente} onClick={() => fazer(simularNegociacaoIfood(p.id, 'preparo'), 'Negociação aberta: veja no topo do quadro.')}>Quer cancelar no preparo</button>
                            <button type="button" className="mini" disabled={pendente} onClick={() => fazer(simularNegociacaoIfood(p.id, 'atraso'), 'Negociação aberta: veja no topo do quadro.')}>Reclamou do atraso</button>
                          </>
                        )}
                      </span>
                    )}
                    {p.status !== 'cancelado' && p.status !== 'concluido' && (
                      <span className="linha" style={{ gap: '0.3rem' }}>
                        <button type="button" className="mini" disabled={pendente} onClick={() => fazer(simularEventoIfood(p.id, 'CAN', 'Cliente desistiu do pedido'), 'Cancelado pelo "cliente" no iFood.')}>Cliente cancelou</button>
                        {p.status === 'novo' && <button type="button" className="mini" disabled={pendente} onClick={() => fazer(simularEventoIfood(p.id, 'CFM'), 'Confirmado em outro aplicativo.')}>Confirmado no Gestor</button>}
                        <button type="button" className="mini" disabled={pendente} onClick={() => fazer(simularEventoIfood(p.id, 'CON'), 'Concluído pelo iFood.')}>Concluído</button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}

      <section className="grade" style={{ gap: '0.5rem' }}>
        <strong>3. Itens do iFood × produtos do RES {semLigacao.length > 0 && <span className="fin-selo" data-sit="hoje">{semLigacao.length} sem ligação</span>}</strong>
        <span className="dica">Cada item que chega do iFood é ligado a um produto daqui (pelo código ou pelo mesmo nome) para a ficha técnica baixar o estoque. Ligue os que ficaram sem.</span>
        {d.itens.filter((i) => i.tipo === 'item').length === 0 ? (
          <span className="dica">Nenhum item recebido ainda.</span>
        ) : (
          <ul className="qp-fila">
            {d.itens.filter((i) => i.tipo === 'item').map((i) => (
              <li key={i.chave}>
                <span className="grade" style={{ gap: 0 }}>
                  <strong>{i.nome}</strong>
                  <span className="dica">{i.vezes} pedido(s){i.produto_id ? '' : ' · sem ligação'}</span>
                </span>
                <select value={i.produto_id ?? ''} disabled={pendente} onChange={(e) => fazer(ligarItemIfood(i.chave, 'item', e.target.value || null), 'Item ligado.')} aria-label={`Produto para ${i.nome}`} style={{ maxWidth: '14rem' }}>
                  <option value="">— escolha o produto —</option>
                  {d.produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>

      {d.saida.length > 0 && (
        <section className="grade" style={{ gap: '0.4rem' }}>
          <strong>4. O que o RES avisou ao iFood</strong>
          <ul className="qp-fila">
            {d.saida.map((s) => (
              <li key={s.id}>
                <span>#{s.pedido_numero ?? '—'} · {ACAO[s.acao] ?? s.acao}</span>
                <span className="dica">{SITUACAO[s.situacao] ?? s.situacao}{s.erro ? ` · ${s.erro}` : ''}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <details>
        <summary><strong>Pronto para a homologação do iFood</strong></summary>
        <ul className="dica">
          <li>✅ Pedido entra uma vez só (eventos repetidos descartados) e cai no quadro com som</li>
          <li>✅ Entrega imediata, entrega agendada (data e hora no cartão) e retirada (aviso de pronto)</li>
          <li>✅ Confirmar, pronto, saiu e cancelar voltam para o iFood; cancelamento pede um motivo da lista do iFood</li>
          <li>✅ Cancelado pelo cliente/iFood ou mudado em outro app atualiza o RES</li>
          <li>✅ Código de retirada, bandeira do cartão, troco, cupom (quem paga), observações e CPF/CNPJ na tela e no cupom</li>
          <li>✅ Token renovado só perto de vencer; webhook com assinatura; busca a cada 30 s como reserva</li>
          <li>✅ Plataforma de Negociação: cancelamento após a entrega, no preparo, por atraso e reembolso parcial aparecem no topo do quadro com prazo, e a loja aceita, recusa ou faz contraproposta (reembolso ou mais tempo)</li>
          <li>✅ Motivos de cancelamento lidos ao vivo do iFood (lista padrão no modo teste)</li>
          <li>✅ Busca automática a cada 30 s assim que houver loja em produção (segredo guardado no Vault do Supabase)</li>
        </ul>
      </details>
    </div>
  );
}
