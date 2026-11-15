'use client';
import { useState, useTransition } from 'react';
import { excluirConexaoCliente, reprocessarEventoCliente, salvarConexaoCliente } from '@/app/(painel)/aplicativos/canais-actions';
import { SimuladorCanal } from '@/components/aplicativos/simulador-canal';
import { salvando } from '@/components/tempo-real';
import type { ConexaoClientePainel, PainelCanaisCliente as Dados } from '@/lib/aplicativos';

const NOME = { deliverymuch: 'Delivery Much', rappi: 'Rappi' } as const;
const ESTADO: Record<string, string> = { aguardando_autorizacao: '⏳ aguardando o primeiro contato', conectado: '🟢 conectado', erro: '⚠️ erro', desconectado: '⚪ desconectado' };

/** Delivery Much e Rappi (D-117): o RES busca os pedidos a cada 30 s e devolve aceitar, pronto e cancelar. */
export function PainelCanaisCliente({ d }: { d: Dados }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [nova, setNova] = useState({ canal: 'deliverymuch' as 'deliverymuch' | 'rappi', marcaId: d.marcas[0]?.id ?? '' });
  const fazer = <T extends object>(p: Promise<({ ok: true } & T) | { ok: false; erro: string }>, ok: string | ((r: T) => string)) =>
    iniciar(async () => {
      const r = await salvando(p);
      setMsg(r.ok ? { ok: true, t: typeof ok === 'function' ? ok(r) : ok } : { ok: false, t: r.erro });
    });
  const nomeMarca = (id: string) => d.marcas.find((m) => m.id === id)?.nome ?? '—';
  const livre = !d.conexoes.some((c) => c.canal === nova.canal && c.marca_id === nova.marcaId);
  return (
    <div className="grade" style={{ gap: '1rem' }}>
      <p className="dica" style={{ margin: 0 }}>
        O RES busca os pedidos do Delivery Much e da Rappi a cada 30 segundos e põe no quadro. Aceitar, pronto e cancelar voltam para o app.
        {' '}{d.configurado.deliverymuch ? '✅ Delivery Much configurado no servidor.' : '🧪 Delivery Much ainda sem credenciais de integrador: só modo teste.'}
        {' '}{d.configurado.rappi ? '✅ Rappi configurada no servidor.' : '🧪 Rappi ainda sem credenciais de aliado: só modo teste.'}
      </p>
      {d.conexoes.map((c) => (
        <Conexao key={c.id} c={c} nomeMarca={nomeMarca(c.marca_id)} configurado={d.configurado[c.canal]} pendente={pendente} pedidos={d.pedidosTeste}
          salvar={(v) => fazer(salvarConexaoCliente({ id: c.id, canal: c.canal, marcaId: c.marca_id, ...v }), 'Conexão salva.')}
          excluir={() => fazer(excluirConexaoCliente(c.id), 'Conexão excluída.')}
          reprocessar={(ev) => fazer(reprocessarEventoCliente(c.id, ev), 'Pedido reprocessado.')} />
      ))}
      {d.marcas.length > 0 && (
        <section className="grade" style={{ gap: '0.5rem' }}>
          <strong>Nova conexão</strong>
          <div className="linha" style={{ alignItems: 'flex-end', gap: '0.5rem' }}>
            <label>App<select value={nova.canal} onChange={(e) => setNova({ ...nova, canal: e.target.value as typeof nova.canal })}><option value="deliverymuch">Delivery Much</option><option value="rappi">Rappi</option></select></label>
            <label>Cardápio<select value={nova.marcaId} onChange={(e) => setNova({ ...nova, marcaId: e.target.value })}>{d.marcas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></label>
            <button type="button" className="botao-primario" disabled={pendente || !nova.marcaId || !livre}
              onClick={() => fazer(salvarConexaoCliente({ canal: nova.canal, marcaId: nova.marcaId, merchantId: '', usuario: '', senha: '', modo: 'teste' }), `Conexão com ${NOME[nova.canal]} criada em modo teste.`)}>Criar conexão</button>
          </div>
          {!livre && <span className="dica">Este cardápio já tem conexão com esse app.</span>}
        </section>
      )}
      {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}
    </div>
  );
}

type Valores = { merchantId: string; usuario: string; senha: string; modo: 'teste' | 'producao' };

function Conexao({ c, nomeMarca, configurado, pendente, pedidos, salvar, excluir, reprocessar }: { c: ConexaoClientePainel; nomeMarca: string; configurado: boolean; pendente: boolean; pedidos: Dados['pedidosTeste']; salvar: (v: Valores) => void; excluir: () => void; reprocessar: (eventoId: number) => void }) {
  const [v, setV] = useState<Valores>({ merchantId: c.merchant_id ?? '', usuario: '', senha: '', modo: c.modo });
  const dm = c.canal === 'deliverymuch';
  return (
    <section className="cartao grade" style={{ gap: '0.5rem' }}>
      <div className="linha" style={{ justifyContent: 'space-between' }}>
        <span className="grade" style={{ gap: 0 }}>
          <strong>{NOME[c.canal]} · {nomeMarca}</strong>
          <span className="dica">{ESTADO[c.estado] ?? c.estado} · {c.modo === 'teste' ? '🧪 modo teste' : '🟢 produção'}{c.ultimo_sinal ? ` · última busca ${new Date(c.ultimo_sinal).toLocaleString('pt-BR')}` : ''}</span>
        </span>
        <button type="button" className="mini" disabled={pendente} onClick={excluir}>Excluir</button>
      </div>
      <div className="linha" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        <label>{dm ? 'Id (uuid) da loja no Delivery Much' : 'storeId da loja na Rappi'}<input value={v.merchantId} placeholder={dm ? 'preenchido sozinho no 1º login' : ''} onChange={(e) => setV({ ...v, merchantId: e.target.value })} /></label>
        {dm && (
          <>
            <label>E-mail da loja no Delivery Much<input type="email" autoComplete="off" value={v.usuario} placeholder={c.tem_login ? 'salvo (preencha só para trocar)' : ''} onChange={(e) => setV({ ...v, usuario: e.target.value })} /></label>
            <label>Senha<input type="password" autoComplete="new-password" value={v.senha} placeholder={c.tem_login ? '•••••• salva' : ''} onChange={(e) => setV({ ...v, senha: e.target.value })} /></label>
          </>
        )}
        <label>Modo<select value={v.modo} onChange={(e) => setV({ ...v, modo: e.target.value as Valores['modo'] })}><option value="teste">Teste</option><option value="producao" disabled={!configurado}>Produção</option></select></label>
      </div>
      <div><button type="button" className="botao-primario" disabled={pendente} onClick={() => salvar(v)}>Salvar</button></div>
      {dm && <span className="dica">O Delivery Much só deixa cancelar antes do aceite. Pronto e saiu para entrega são o mesmo aviso. A loja recusada no login fica parada até você salvar o login de novo (eles bloqueiam por tentativa).</span>}
      {!dm && <span className="dica">Na Rappi, a entrega é deles: “saiu para entrega” não é enviado.</span>}
      {c.ultimo_erro && <p className="erro" style={{ margin: 0 }}>Último erro: {c.ultimo_erro}</p>}
      {c.eventos_com_erro.length > 0 && (
        <details>
          <summary>{c.eventos_com_erro.length} evento(s) com erro</summary>
          <ul className="qp-fila">
            {c.eventos_com_erro.map((e) => (
              <li key={e.id}>
                <span className="grade" style={{ gap: 0 }}><strong>{e.codigo} · {e.externo_id ?? '—'}</strong><span className="dica">{new Date(e.recebido_em).toLocaleString('pt-BR')} · {e.erro}</span></span>
                <button type="button" className="mini" disabled={pendente} onClick={() => reprocessar(e.id)}>Reprocessar</button>
              </li>
            ))}
          </ul>
        </details>
      )}
      {c.modo === 'teste' && <SimuladorCanal conexaoId={c.id} canal={c.canal} marcaId={c.marca_id} nome={NOME[c.canal]} pedidos={pedidos} />}
    </section>
  );
}
