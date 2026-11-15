'use client';
import { useState, useTransition } from 'react';
import { criarConexaoOD, excluirConexaoOD, novaChaveOD, reprocessarEventoOD, salvarConexaoOD } from '@/app/(painel)/aplicativos/od-actions';
import { SimuladorCanal } from '@/components/aplicativos/simulador-canal';
import { salvando } from '@/components/tempo-real';
import type { ConexaoODPainel, PainelOD } from '@/lib/aplicativos';

const NOME: Record<string, string> = { '99food': '99Food', keeta: 'Keeta', aiqfome: 'aiqfome' };
const ESTADO: Record<string, string> = { aguardando_autorizacao: '⏳ aguardando os dados do app', conectado: '🟢 conectado', erro: '⚠️ erro', desconectado: '⚪ desconectado' };

/** Open Delivery (D-116): o RES é o servidor do padrão; o app lê o cardápio e manda os pedidos para cá. */
export function PainelOpenDelivery({ d, origem }: { d: PainelOD; origem: string }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [chave, setChave] = useState<{ id: string; apiKey: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [nova, setNova] = useState({ canal: '99food', marcaId: d.marcas[0]?.id ?? '' });
  const fazer = <T extends object>(p: Promise<({ ok: true } & T) | { ok: false; erro: string }>, ok: string | ((r: T) => string)) =>
    iniciar(async () => {
      const r = await salvando(p);
      setMsg(r.ok ? { ok: true, t: typeof ok === 'function' ? ok(r) : ok } : { ok: false, t: r.erro });
    });
  const nomeMarca = (id: string) => d.marcas.find((m) => m.id === id)?.nome ?? '—';
  const livre = (canal: string, marca: string) => !d.conexoes.some((c) => c.canal === canal && c.marca_id === marca);

  return (
    <div className="grade" style={{ gap: '1rem' }}>
      <p className="dica" style={{ margin: 0 }}>
        99Food, Keeta e aiqfome usam o padrão aberto <strong>Open Delivery</strong> (Abrasel). O RES publica o seu cardápio no formato do padrão e recebe os pedidos direto no quadro. Cada app entrega à loja, no portal de parceiros, uma URL, um <em>client id</em> e um <em>client secret</em>; você cola aqui.
      </p>

      {chave && (
        <div className="cartao" style={{ borderColor: 'var(--sucesso, #2e7d32)' }}>
          <strong>Chave de acesso (X-API-KEY) — copie agora, ela não aparece de novo:</strong>
          <code style={{ display: 'block', wordBreak: 'break-all', margin: '0.4rem 0' }}>{chave.apiKey}</code>
          <span className="dica">Informe ao app junto com a URL do RES abaixo. Se perder, gere outra.</span>
          <div><button type="button" className="mini" onClick={() => setChave(null)}>Já copiei</button></div>
        </div>
      )}

      {d.conexoes.map((c) => (
        <Conexao key={c.id} c={c} origem={origem} pedidos={d.pedidosTeste} nomeMarca={nomeMarca(c.marca_id)} pendente={pendente}
          salvar={(v) => fazer(salvarConexaoOD({ id: c.id, ...v }), 'Conexão salva.')}
          novaChave={() => iniciar(async () => { const r = await salvando(novaChaveOD(c.id)); if (r.ok) setChave({ id: c.id, apiKey: r.apiKey }); setMsg(r.ok ? { ok: true, t: 'Nova chave gerada: a antiga parou de valer.' } : { ok: false, t: r.erro }); })}
          excluir={() => fazer(excluirConexaoOD(c.id), 'Conexão excluída.')}
          reprocessar={(ev) => fazer(reprocessarEventoOD(c.id, ev), (r: { resultado: string }) => `Reprocessado: ${r.resultado}.`)} />
      ))}

      {d.marcas.length > 0 && (
        <section className="grade" style={{ gap: '0.5rem' }}>
          <strong>Nova conexão</strong>
          <div className="linha" style={{ alignItems: 'flex-end', gap: '0.5rem' }}>
            <label>App<select value={nova.canal} onChange={(e) => setNova({ ...nova, canal: e.target.value })}>{Object.entries(NOME).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>Cardápio<select value={nova.marcaId} onChange={(e) => setNova({ ...nova, marcaId: e.target.value })}>{d.marcas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select></label>
            <button type="button" className="botao-primario" disabled={pendente || !nova.marcaId || !livre(nova.canal, nova.marcaId)}
              onClick={() => iniciar(async () => { const r = await salvando(criarConexaoOD(nova)); if (r.ok) setChave({ id: r.id, apiKey: r.apiKey }); setMsg(r.ok ? { ok: true, t: `Conexão com ${NOME[nova.canal]} criada.` } : { ok: false, t: r.erro }); })}>
              Criar conexão
            </button>
          </div>
          {!livre(nova.canal, nova.marcaId) && <span className="dica">Este cardápio já tem conexão com esse app.</span>}
        </section>
      )}
      {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}
    </div>
  );
}

type Valores = { baseUrl: string; tokenUrl: string; clientId: string; clientSecret: string; merchantId: string; modo: 'teste' | 'producao' };

function Conexao({ c, origem, pedidos, nomeMarca, pendente, salvar, novaChave, excluir, reprocessar }: { c: ConexaoODPainel; origem: string; pedidos: PainelOD['pedidosTeste']; nomeMarca: string; pendente: boolean; salvar: (v: Valores) => void; novaChave: () => void; excluir: () => void; reprocessar: (eventoId: number) => void }) {
  const [v, setV] = useState<Valores>({ baseUrl: c.config.base_url ?? '', tokenUrl: c.config.token_url ?? '', clientId: c.config.client_id ?? '', clientSecret: '', merchantId: c.merchant_id ?? '', modo: c.modo });
  const url = `${origem}/api/od/${c.id}/v1`;
  return (
    <section className="cartao grade" style={{ gap: '0.5rem' }}>
      <div className="linha" style={{ justifyContent: 'space-between' }}>
        <span className="grade" style={{ gap: 0 }}>
          <strong>{NOME[c.canal]} · {nomeMarca}</strong>
          <span className="dica">{ESTADO[c.estado] ?? c.estado} · {c.modo === 'teste' ? '🧪 modo teste (nada volta para o app)' : '🟢 produção'}{c.ultimo_evento_em ? ` · último evento ${new Date(c.ultimo_evento_em).toLocaleString('pt-BR')}` : ''}</span>
        </span>
        <button type="button" className="mini" disabled={pendente} onClick={excluir}>Excluir</button>
      </div>
      <label>URL do RES para o app (merchant e eventos)
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
      </label>
      <div className="linha" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        <label>URL do app (base)<input value={v.baseUrl} placeholder="https://…" onChange={(e) => setV({ ...v, baseUrl: e.target.value })} /></label>
        <label>URL do token (se diferente)<input value={v.tokenUrl} placeholder="https://…/oauth/token" onChange={(e) => setV({ ...v, tokenUrl: e.target.value })} /></label>
        <label>Client id<input value={v.clientId} onChange={(e) => setV({ ...v, clientId: e.target.value })} /></label>
        <label>Client secret<input type="password" autoComplete="off" value={v.clientSecret} placeholder={c.tem_segredo ? '•••••• salvo (deixe vazio para manter)' : ''} onChange={(e) => setV({ ...v, clientSecret: e.target.value })} /></label>
        <label>Id da loja no app<input value={v.merchantId} onChange={(e) => setV({ ...v, merchantId: e.target.value })} /></label>
        <label>Modo<select value={v.modo} onChange={(e) => setV({ ...v, modo: e.target.value as Valores['modo'] })}><option value="teste">Teste</option><option value="producao">Produção</option></select></label>
      </div>
      <div className="linha" style={{ gap: '0.5rem' }}>
        <button type="button" className="botao-primario" disabled={pendente} onClick={() => salvar(v)}>Salvar</button>
        <button type="button" className="mini" disabled={pendente} onClick={novaChave}>Gerar nova chave de acesso</button>
      </div>
      {c.avisos.length > 0 && (
        <div className="canal-aviso"><strong>Antes de ligar em produção:</strong><ul style={{ margin: '0.25rem 0 0' }}>{c.avisos.map((a) => <li key={a}>{a}</li>)}</ul></div>
      )}
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
      {c.modo === 'teste' && <SimuladorCanal conexaoId={c.id} canal={c.canal} marcaId={c.marca_id} nome={NOME[c.canal] ?? c.canal} pedidos={pedidos} />}
    </section>
  );
}
