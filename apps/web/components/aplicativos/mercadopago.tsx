'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatarReais } from '@res/core';
import { conectarMercadoPago, desconectarMercadoPago, mpAceitarAoPagar } from '@/app/(painel)/aplicativos/actions';
import { salvando } from '@/components/tempo-real';
import type { StatusMp } from '@/lib/aplicativos';

/** Mercado Pago (D-044): a loja cola o Access Token de produção; o Pix do cardápio passa a confirmar sozinho. */
export function PainelMercadoPago({ mp }: { mp: StatusMp | null }) {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  if (!mp) return <p className="dica">Só gestores da loja ligam o Mercado Pago.</p>;

  return (
    <div className="grade">
      <p style={{ margin: 0 }}>
        O cliente que escolher <strong>Pix</strong> no cardápio digital recebe um QR com o valor exato. Quando ele paga, o pedido fica <strong>Pago</strong> sozinho e pode já ser <strong>aceito</strong>, sem conferir extrato.
        O dinheiro cai direto na sua conta Mercado Pago, com a taxa do Mercado Pago para Pix. O RES não cobra nada a mais.
      </p>
      {mp.conectado ? (
        <section className="cartao grade" style={{ gap: '0.4rem' }}>
          <strong>✅ Conectado{mp.apelido ? ` a ${mp.apelido}` : ''}</strong>
          <span className="dica">{mp.email ?? ''} · token …{mp.final}{mp.conectado_em ? ` · desde ${new Date(mp.conectado_em).toLocaleDateString('pt-BR')}` : ''}</span>
          <span className="dica">Últimos 30 dias: {mp.recebidos_30d.quantidade} Pix recebidos · {formatarReais(Math.round(Number(mp.recebidos_30d.valor) * 100))}</span>
          <label className="check">
            <input
              type="checkbox"
              checked={mp.aceitar_ao_pagar !== false}
              disabled={pendente}
              onChange={(e) => {
                const v = e.target.checked;
                iniciar(async () => { await salvando(mpAceitarAoPagar(v)); router.refresh(); });
              }}
            />
            <span><strong>Aceitar o pedido sozinho quando o Pix for confirmado</strong> <span className="dica">vai para "Em preparo" e imprime na cozinha, como no aceite do quadro. Pedido agendado espera a hora de preparar.</span></span>
          </label>
          {!mp.pix_pela_loja && (
            <p className="cmv-aviso" data-tom="alerta">O Pix não está nas formas de pagamento do cardápio. Ligue em <Link href="/delivery">Delivery</Link>.</p>
          )}
          <button
            type="button"
            className="erro"
            style={{ justifySelf: 'start' }}
            disabled={pendente}
            onClick={() => window.confirm('Desconectar o Mercado Pago? O Pix volta a ser conferido à mão.') && iniciar(async () => { await salvando(desconectarMercadoPago()); router.refresh(); })}
          >
            Desconectar
          </button>
        </section>
      ) : (
        <section className="cartao grade" style={{ gap: '0.5rem' }}>
          <ol className="dica" style={{ margin: 0, paddingLeft: '1.1rem', display: 'grid', gap: '0.25rem' }}>
            <li>Entre em <strong>mercadopago.com.br/developers</strong> com a conta da loja → <strong>Suas integrações</strong> → <strong>Criar aplicação</strong> (pagamentos online, Checkout Transparente).</li>
            <li>Na aplicação, abra <strong>Credenciais de produção</strong> e copie o <strong>Access Token</strong> (começa com APP_USR-).</li>
            <li>Confira se a conta tem uma <strong>chave Pix</strong> cadastrada no Mercado Pago.</li>
            <li>Cole o token aqui. Ele fica guardado só no servidor e não aparece de novo.</li>
          </ol>
          <label>
            Access Token de produção
            <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="APP_USR-…" />
          </label>
          <div className="linha" style={{ alignItems: 'center' }}>
            <button
              type="button"
              className="botao-primario"
              disabled={pendente || token.trim().length < 30}
              onClick={() =>
                iniciar(async () => {
                  const r = await salvando(conectarMercadoPago(token));
                  if (!r.ok) return setMsg({ ok: false, t: r.erro });
                  setToken('');
                  setMsg({ ok: true, t: `Conectado${r.apelido ? ` a ${r.apelido}` : ''}.` });
                  router.refresh();
                })
              }
            >
              {pendente ? 'Conferindo…' : 'Conectar'}
            </button>
            {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.t}</span>}
          </div>
        </section>
      )}
      <p className="dica" style={{ margin: 0 }}>Cartão online pelo Mercado Pago vem numa próxima etapa.</p>
    </div>
  );
}
