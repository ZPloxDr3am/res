'use client';
import { useState, useTransition } from 'react';
import { simularEventoCanal, simularPedidoCanal } from '@/app/(painel)/aplicativos/canais-actions';
import { salvando } from '@/components/tempo-real';
import type { PedidoTeste } from '@/lib/aplicativos';

const STATUS: Record<string, string> = { novo: 'Novo', em_preparo: 'Em preparo', pronto: 'Pronto', em_entrega: 'Saiu', concluido: 'Concluído', cancelado: 'Cancelado' };

/** Simulador do modo teste (D-117): pedido fictício no formato do app, pela mesma tradução do pedido real. */
export function SimuladorCanal({ conexaoId, canal, marcaId, nome, pedidos }: { conexaoId: string; canal: string; marcaId: string; nome: string; pedidos: PedidoTeste[] }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [sim, setSim] = useState({ tipo: 'entrega' as 'entrega' | 'retirada', pagamento: 'online' as 'online' | 'dinheiro' | 'cartao_na_entrega', cupom: true });
  const meus = pedidos.filter((p) => p.externo_canal === canal && p.marca_id === marcaId).slice(0, 5);
  const fazer = <T extends object>(p: Promise<({ ok: true } & T) | { ok: false; erro: string }>, ok: (r: T) => string) =>
    iniciar(async () => {
      const r = await salvando(p);
      setMsg(r.ok ? { ok: true, t: ok(r) } : { ok: false, t: r.erro });
    });
  return (
    <details>
      <summary>🧪 Simular pedido do {nome}</summary>
      <div className="grade" style={{ gap: '0.5rem', marginTop: '0.5rem' }}>
        <div className="linha" style={{ alignItems: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label>Tipo<select value={sim.tipo} onChange={(e) => setSim({ ...sim, tipo: e.target.value as 'entrega' | 'retirada' })}><option value="entrega">Entrega</option><option value="retirada">Retirada</option></select></label>
          <label>Pagamento<select value={sim.pagamento} onChange={(e) => setSim({ ...sim, pagamento: e.target.value as typeof sim.pagamento })}><option value="online">Pago no app</option><option value="dinheiro">Dinheiro (com troco)</option><option value="cartao_na_entrega">Cartão na entrega</option></select></label>
          <label className="linha" style={{ gap: '0.3rem' }}><input type="checkbox" checked={sim.cupom} onChange={(e) => setSim({ ...sim, cupom: e.target.checked })} /> Cupom</label>
          <button type="button" className="botao-primario" disabled={pendente} onClick={() => fazer(simularPedidoCanal(conexaoId, sim), (r: { numero: number }) => `Pedido #${r.numero} criado no quadro.`)}>Criar pedido fictício</button>
        </div>
        {meus.length > 0 && (
          <ul className="qp-fila">
            {meus.map((p) => (
              <li key={p.id}>
                <span>#{p.numero} · {STATUS[p.status] ?? p.status}</span>
                {p.status !== 'cancelado' && p.status !== 'concluido' && (
                  <span className="linha" style={{ gap: '0.3rem' }}>
                    <button type="button" className="mini" disabled={pendente} onClick={() => fazer(simularEventoCanal(p.id, 'CANCELLED'), () => 'Cancelado pelo cliente (simulado).')}>Cliente cancelou</button>
                    <button type="button" className="mini" disabled={pendente} onClick={() => fazer(simularEventoCanal(p.id, 'CONCLUDED'), () => 'Concluído pelo app (simulado).')}>Concluído no app</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <span className="dica">No modo teste, o que você faz no quadro aparece na fila como “simulado” e nada vai para o app.</span>
        {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}
      </div>
    </details>
  );
}
