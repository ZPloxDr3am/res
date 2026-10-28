'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { criarChaveApi, excluirWebhook, revogarChaveApi, salvarWebhook, testarWebhook } from '@/app/(painel)/aplicativos/actions';
import { salvando } from '@/components/tempo-real';
import { ESCOPOS_API, EVENTOS_WEBHOOK, type PainelApi, type Webhook } from '@/lib/aplicativos';

const quando = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : 'nunca');
const copiar = (t: string) => navigator.clipboard?.writeText(t).catch(() => {});

/** Mostra um segredo uma vez só, com botão de copiar. */
function Segredo({ titulo, valor, nota }: { titulo: string; valor: string; nota: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="api-segredo" role="status">
      <strong>{titulo}</strong>
      <code>{valor}</code>
      <div className="linha" style={{ alignItems: 'center' }}>
        <button type="button" className="botao-primario" onClick={() => { copiar(valor); setCopiado(true); }}>{copiado ? 'Copiado ✓' : 'Copiar'}</button>
        <span className="dica">{nota}</span>
      </div>
    </div>
  );
}

function NovaChave({ padrao, aoCriar }: { padrao: { nome: string; escopos: string[] }; aoCriar: (chave: string) => void }) {
  const [nome, setNome] = useState(padrao.nome);
  const [escopos, setEscopos] = useState<string[]>(padrao.escopos);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <div className="cartao grade" style={{ gap: '0.5rem' }}>
      <label>Nome (para você lembrar onde usou)<input value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Planilha do contador" /></label>
      <fieldset className="api-escopos">
        <legend>O que essa chave pode ver</legend>
        {ESCOPOS_API.map((e) => (
          <label key={e.id} className="check">
            <input type="checkbox" checked={escopos.includes(e.id)} onChange={(x) => setEscopos(x.target.checked ? [...escopos, e.id] : escopos.filter((y) => y !== e.id))} />
            <span><strong>{e.rotulo}</strong> <span className="dica">{e.desc}</span></span>
          </label>
        ))}
      </fieldset>
      <div className="linha" style={{ alignItems: 'center' }}>
        <button
          type="button"
          className="botao-primario"
          disabled={pendente || !nome.trim() || !escopos.length}
          onClick={() =>
            iniciar(async () => {
              const r = await salvando(criarChaveApi(nome.trim(), escopos));
              if (!r.ok) return setMsg(r.erro);
              aoCriar(r.chave);
            })
          }
        >
          {pendente ? 'Criando…' : 'Criar chave'}
        </button>
        <span className="dica">Só leitura: nenhuma chave muda pedidos, preços ou estoque.</span>
        {msg && <span className="erro" role="alert">{msg}</span>}
      </div>
    </div>
  );
}

function ListaChaves({ api }: { api: PainelApi }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  if (!api.chaves.length) return <p className="dica" style={{ margin: 0 }}>Nenhuma chave ainda.</p>;
  return (
    <ul className="api-lista">
      {api.chaves.map((k) => (
        <li key={k.id}>
          <div className="grade" style={{ gap: '0.1rem', minWidth: 0 }}>
            <strong>{k.nome}</strong>
            <span className="dica"><code>{k.prefixo}…</code> · {k.escopos.map((e) => ESCOPOS_API.find((x) => x.id === e)?.rotulo ?? e).join(', ')}</span>
            <span className="dica">Último uso: {quando(k.ultimo_uso)}</span>
          </div>
          <button
            type="button"
            className="mini erro"
            disabled={pendente}
            onClick={() => window.confirm(`Revogar "${k.nome}"? O que usa essa chave para de funcionar na hora.`) && iniciar(async () => { await salvando(revogarChaveApi(k.id)); router.refresh(); })}
          >
            Revogar
          </button>
        </li>
      ))}
    </ul>
  );
}

const ENDPOINTS = [
  ['GET /api/v1/vendas?de=2026-10-01&ate=2026-10-31', 'resumo, por dia, por tipo/origem e mais vendidos'],
  ['GET /api/v1/pedidos?de=…&ate=…&status=concluido&limite=50&pagina=1', 'pedidos com itens'],
  ['GET /api/v1/pedidos/1532', 'um pedido (número ou id)'],
  ['GET /api/v1/cardapio', 'categorias, produtos e opções'],
  ['GET /api/v1/clientes?segmento=fieis&limite=100', 'clientes e segmentos'],
  ['GET /api/v1/estoque', 'insumos, saldo e custo'],
];

/** API aberta e webhooks. */
export function PainelApiAberta({ api, origem }: { api: PainelApi; origem: string }) {
  const router = useRouter();
  const [nova, setNova] = useState(false);
  const [criada, setCriada] = useState<string | null>(null);
  return (
    <div className="grade">
      <section className="grade" style={{ gap: '0.5rem' }}>
        <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Chaves de API</h3>
          {!nova && <button type="button" className="mini" onClick={() => { setNova(true); setCriada(null); }}>+ Nova chave</button>}
        </div>
        {criada && <Segredo titulo="Sua chave (aparece só agora)" valor={criada} nota="Guarde num lugar seguro. Se perder, revogue e crie outra." />}
        {nova && <NovaChave padrao={{ nome: '', escopos: ['vendas', 'pedidos'] }} aoCriar={(c) => { setCriada(c); setNova(false); router.refresh(); }} />}
        <ListaChaves api={api} />
      </section>

      <details className="api-docs">
        <summary>Como usar a API</summary>
        <p className="dica">Envie a chave no cabeçalho <code>Authorization: Bearer res_…</code>. Respostas em JSON: <code>{'{ "dados": … }'}</code> ou <code>{'{ "erro": "…" }'}</code>. Valores em reais; o dia vai das 05:00 às 05:00; período de até 92 dias (padrão: últimos 7).</p>
        <ul className="api-endpoints">
          {ENDPOINTS.map(([e, d]) => <li key={e}><code>{e}</code><span className="dica">{d}</span></li>)}
        </ul>
        <pre className="api-exemplo">{`curl ${origem}/api/v1/vendas \\\n  -H "Authorization: Bearer res_SUA_CHAVE"`}</pre>
      </details>

      <Webhooks api={api} />
    </div>
  );
}

function Webhooks({ api }: { api: PainelApi }) {
  const router = useRouter();
  const [editando, setEditando] = useState<Webhook | 'novo' | null>(null);
  const [segredo, setSegredo] = useState<string | null>(null);
  return (
    <section className="grade" style={{ gap: '0.5rem' }}>
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="grade" style={{ gap: 0 }}>
          <h3 style={{ margin: 0 }}>Webhooks</h3>
          <span className="dica">Avisamos outro sistema na hora em que um pedido chega ou muda.</span>
        </div>
        {!editando && api.webhooks.length < 5 && <button type="button" className="mini" onClick={() => { setEditando('novo'); setSegredo(null); }}>+ Webhook</button>}
      </div>
      {!api.envio_automatico && <p className="cmv-aviso" data-tom="alerta">O envio automático ainda não está ligado no banco (pg_net). Os avisos ficam guardados na fila.</p>}
      {segredo && <Segredo titulo="Segredo da assinatura (aparece só agora)" valor={segredo} nota="Use para conferir o cabeçalho X-RES-Assinatura." />}
      {editando && <FormWebhook w={editando === 'novo' ? null : editando} aoFechar={(s) => { setEditando(null); if (s) setSegredo(s); router.refresh(); }} />}
      {api.webhooks.map((w) => <LinhaWebhook key={w.id} w={w} aoEditar={() => { setEditando(w); setSegredo(null); }} />)}
      {!api.webhooks.length && !editando && <p className="dica" style={{ margin: 0 }}>Nenhum webhook.</p>}
      <details className="api-docs">
        <summary>Como conferir a assinatura</summary>
        <p className="dica">Cada aviso é um POST em JSON com os cabeçalhos <code>X-RES-Evento</code> (pedido.criado, pedido.status, pedido.cancelado ou teste), <code>X-RES-Envio</code> e <code>X-RES-Assinatura: sha256=…</code>: o HMAC-SHA256 do corpo exatamente como chegou, com o segredo do webhook. Responda 2xx em até 8 s; se falhar, tentamos de novo em 1, 2, 4, 8 e 16 minutos.</p>
      </details>
    </section>
  );
}

function FormWebhook({ w, aoFechar }: { w: Webhook | null; aoFechar: (segredo?: string) => void }) {
  const [url, setUrl] = useState(w?.url ?? 'https://');
  const [eventos, setEventos] = useState<string[]>(w?.eventos ?? ['pedido.criado', 'pedido.status', 'pedido.cancelado']);
  const [ativo, setAtivo] = useState(w?.ativo ?? true);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <div className="cartao grade" style={{ gap: '0.5rem' }}>
      <label>Endereço (https)<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://seu-sistema.com/res" inputMode="url" /></label>
      <div className="linha">
        {EVENTOS_WEBHOOK.map((e) => (
          <label key={e.id} className="check">
            <input type="checkbox" checked={eventos.includes(e.id)} onChange={(x) => setEventos(x.target.checked ? [...eventos, e.id] : eventos.filter((y) => y !== e.id))} /> {e.rotulo}
          </label>
        ))}
      </div>
      {w && <label className="check"><input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ligado</label>}
      <div className="linha" style={{ alignItems: 'center' }}>
        <button
          type="button"
          className="botao-primario"
          disabled={pendente || !/^https:\/\/\S+\.\S+/.test(url) || !eventos.length}
          onClick={() =>
            iniciar(async () => {
              const r = await salvando(salvarWebhook(w?.id ?? null, url.trim(), eventos, ativo));
              if (!r.ok) return setMsg(r.erro);
              aoFechar(r.segredo);
            })
          }
        >
          {pendente ? 'Salvando…' : 'Salvar'}
        </button>
        <button type="button" onClick={() => aoFechar()}>Cancelar</button>
        {w && (
          <button type="button" className="erro" disabled={pendente} onClick={() => window.confirm('Excluir este webhook?') && iniciar(async () => { await salvando(excluirWebhook(w.id)); aoFechar(); })}>
            Excluir
          </button>
        )}
        {msg && <span className="erro" role="alert">{msg}</span>}
      </div>
    </div>
  );
}

const SIT = { pendente: 'na fila', enviando: 'enviando', ok: 'entregue', erro: 'falhou, vai tentar de novo', desistiu: 'desistimos' } as const;

function LinhaWebhook({ w, aoEditar }: { w: Webhook; aoEditar: () => void }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <div className="cartao grade" style={{ gap: '0.4rem' }}>
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'nowrap' }}>
        <div className="grade" style={{ gap: 0, minWidth: 0 }}>
          <strong className="api-url">{w.url}</strong>
          <span className="dica">{w.ativo ? '' : 'Desligado · '}{w.eventos.map((e) => EVENTOS_WEBHOOK.find((x) => x.id === e)?.rotulo ?? e).join(', ')} · segredo …{w.segredo_fim}</span>
        </div>
        <div className="linha" style={{ gap: '0.3rem', flexWrap: 'nowrap' }}>
          <button type="button" className="mini" disabled={pendente} onClick={() => iniciar(async () => { await salvando(testarWebhook(w.id)); router.refresh(); })}>Testar</button>
          <button type="button" className="mini" onClick={aoEditar}>Editar</button>
        </div>
      </div>
      {w.envios.length > 0 && (
        <details>
          <summary className="dica">Últimos envios</summary>
          <ul className="api-envios">
            {w.envios.map((e) => (
              <li key={e.id} data-st={e.status}>
                <span>{quando(e.em)}</span>
                <span>{e.evento}{e.numero && e.numero !== '0' ? ` #${e.numero}` : ''}</span>
                <span>{SIT[e.status]}{e.resposta ? ` (${e.resposta})` : ''}{e.erro && e.status !== 'ok' ? ` · ${e.erro}` : ''}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** Conectar com IA (MCP): uma chave de leitura e o link pronto. */
export function PainelMcp({ api, origem }: { api: PainelApi; origem: string }) {
  const router = useRouter();
  const [criada, setCriada] = useState<string | null>(null);
  const [nova, setNova] = useState(false);
  const link = criada ? `${origem}/api/mcp/${criada}` : null;
  return (
    <div className="grade">
      <p style={{ margin: 0 }}>
        Pergunte ao ChatGPT ou ao Claude coisas como <em>“quanto vendi ontem?”</em>, <em>“quais pizzas mais saem no sábado?”</em> ou <em>“quem são meus clientes fiéis que sumiram?”</em>. A IA só lê: não muda nada no RES.
      </p>
      {link ? (
        <Segredo titulo="Seu link do MCP (aparece só agora)" valor={link} nota="Quem tiver este link vê os dados escolhidos. Não compartilhe; se vazar, revogue a chave." />
      ) : nova ? (
        <NovaChave padrao={{ nome: 'IA (MCP)', escopos: ['vendas', 'pedidos', 'cardapio', 'estoque'] }} aoCriar={(c) => { setCriada(c); setNova(false); router.refresh(); }} />
      ) : (
        <button type="button" className="botao-primario" style={{ justifySelf: 'start' }} onClick={() => setNova(true)}>Gerar link para a IA</button>
      )}
      <details className="api-docs" open={!!link}>
        <summary>Como conectar</summary>
        <ol className="dica" style={{ paddingLeft: '1.1rem', margin: '0.4rem 0' }}>
          <li><strong>Claude</strong> (claude.ai ou app): Configurações → Conectores → Adicionar conector personalizado → cole o link.</li>
          <li><strong>ChatGPT</strong>: Configurações → Aplicativos e conectores → Modo desenvolvedor → Criar conector → cole o link (sem autenticação).</li>
          <li>Outras ferramentas com MCP: servidor HTTP com o link, ou <code>{origem}/api/mcp</code> com o cabeçalho <code>Authorization: Bearer res_…</code>.</li>
        </ol>
      </details>
      <h3 style={{ margin: '0.4rem 0 0' }}>Chaves ativas</h3>
      <ListaChaves api={api} />
    </div>
  );
}
