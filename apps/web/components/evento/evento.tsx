'use client';
import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { copiarParaEvento, criarEvento, removerProdutoEvento, salvarEvento, salvarPrevenda, salvarProdutoEvento, type AjusteProduto } from '@/app/(painel)/evento/actions';
import { salvando } from '@/components/tempo-real';

export type EventoInfo = {
  id: string;
  nome: string;
  slug: string;
  link: string;
  qr: string;
  ativa: boolean;
  inicio: string | null;
  fim: string | null;
  mensagem: string;
  base: string | null;
  prevenda: boolean;
  entrega: string | null;
  texto: string;
  aceitaEntrega: boolean;
  aceitaRetirada: boolean;
  pix: 'mercado_pago' | 'manual' | 'nenhum';
};
export type GrupoEvento = { id: string; nome: string; min: number; max: number; obrigatorio: boolean; permite_repetir: boolean; pizza: boolean; opcoes: { id: string; nome: string; preco: number; ativo: boolean }[] };
export type ProdutoEvento = { id: string; nome: string; descricao: string; preco: number; imagem: string | null; ativo: boolean; categoria: string; grupos: GrupoEvento[] };
export type ProdutoPrincipal = { id: string; nome: string; categoria: string; preco: number; imagem: string | null; grupos: number; noEvento: boolean };

type Msg = { ok: boolean; texto: string } | null;
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const reaisTxt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lerReais = (t: string) => {
  const s = t.trim().replace(/\s|R\$/g, '');
  if (!s) return 0;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
/** ISO → valor de <input type="datetime-local"> no horário de quem está usando */
const paraLocal = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const paraIso = (local: string) => (local ? new Date(local).toISOString() : null);
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const slugDe = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

function situacao(e: EventoInfo): { rotulo: string; cor: string } {
  if (!e.ativa) return { rotulo: 'Pausado', cor: 'var(--texto-suave)' };
  const agora = Date.now();
  if (e.inicio && agora < Date.parse(e.inicio)) return { rotulo: `Começa em ${quando(e.inicio)}`, cor: '#b45309' };
  if (e.fim && agora > Date.parse(e.fim)) return { rotulo: 'Encerrado', cor: 'var(--erro)' };
  return { rotulo: e.fim ? `Valendo até ${quando(e.fim)}` : 'Valendo agora', cor: '#15803d' };
}

export function PainelEvento({
  lojaNome,
  evento,
  bases,
  produtos,
  principais,
  origem,
  erro,
}: {
  lojaNome: string;
  evento: EventoInfo | null;
  bases: { id: string; nome: string; slug: string }[];
  produtos: ProdutoEvento[];
  principais: ProdutoPrincipal[];
  origem: string;
  erro: string | null;
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  return (
    <div className="grade">
      <h1>Evento / Aniversário</h1>
      {erro && <p className="erro">{erro}</p>}
      <Explicacao temEvento={!!evento} />
      {!evento ? (
        <CriarEvento lojaNome={lojaNome} bases={bases} origem={origem} />
      ) : (
        <>
          <ConfigEvento e={evento} />
          <PreVenda e={evento} />
          <section className="cartao grade" aria-label="Produtos do evento">
            <div>
              <h2 style={{ margin: 0 }}>2. Produtos do evento ({produtos.length})</h2>
              <p className="dica" style={{ margin: 0 }}>Só estes aparecem no link do evento. Mudanças aqui não mexem no seu cardápio principal.</p>
            </div>
            {produtos.length === 0 && <p className="dica" style={{ margin: 0 }}>Nenhum produto ainda. Escolha abaixo, no seu cardápio principal, o que vai entrar na promoção.</p>}
            <div className="grade" style={{ gap: '0.5rem' }}>
              {produtos.map((p) => (
                <EditorProdutoEvento key={p.id} p={p} aberto={aberto === p.id} abrir={() => setAberto(aberto === p.id ? null : p.id)} />
              ))}
            </div>
          </section>
          <EscolherProdutos evento={evento.id} principais={principais} aoAdicionar={(id) => setAberto(id)} />
          <p className="dica" style={{ margin: 0 }}>
            Horários, bairros, taxas e formas de pagamento do evento vieram do cardápio base e podem ser mudados em <Link href="/delivery">Delivery</Link> (no cartão &quot;{evento.nome}&quot;). Os pedidos do evento chegam no quadro de Pedidos normalmente, com o nome do evento.
          </p>
        </>
      )}
    </div>
  );
}

function Explicacao({ temEvento }: { temEvento: boolean }) {
  const [ver, setVer] = useState(!temEvento);
  return (
    <section className="cartao grade ev-explica" aria-label="Como funciona">
      <div className="linha" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>🎉 Um cardápio bônus para promoções e datas especiais</h2>
        {temEvento && <button type="button" className="mini" onClick={() => setVer(!ver)}>{ver ? 'Esconder explicação' : 'Como funciona?'}</button>}
      </div>
      {ver && (
        <>
          <p style={{ margin: 0 }}>
            É um <b>cardápio extra, de brinde</b>, com <b>link próprio</b>. Nele você deixa <b>só os itens da promoção</b>, com o <b>preço que quiser</b> e as <b>mudanças que quiser</b> no produto, sem desligar nada do seu cardápio principal.
          </p>
          <ol className="ev-passos">
            <li><b>Crie o evento</b>: nome (ex.: &quot;Aniversário 5 anos&quot;), link e o período em que vale.</li>
            <li><b>Escolha os produtos</b> do seu cardápio principal: o RES faz uma cópia de cada um, com fotos, sabores e adicionais.</li>
            <li><b>Ajuste a cópia</b>: preço, nome, quantos sabores, quais sabores ficam e o preço de cada opção.</li>
            <li><b>Divulgue o link</b> ou o QR. Fora do período, o link avisa que o evento não está valendo.</li>
          </ol>
          <div className="ev-exemplo">
            <b>Exemplo:</b> sua Pizza Média é de <b>2 sabores</b> por R$ 64,99. No evento, você cria a &quot;Pizza Média Aniversário&quot; de <b>sabor único</b> por <b>R$ 39,90</b> e deixa só 10 sabores. No seu cardápio de sempre, a Pizza Média continua igual.
          </div>
        </>
      )}
    </section>
  );
}

function CriarEvento({ lojaNome, bases, origem }: { lojaNome: string; bases: { id: string; nome: string; slug: string }[]; origem: string }) {
  const [nome, setNome] = useState('');
  const [slug, setSlug] = useState('');
  const [mexido, setMexido] = useState(false);
  const [base, setBase] = useState(bases[0]?.id ?? '');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();
  const baseSlug = bases.find((b) => b.id === base)?.slug ?? '';
  const sugerir = (n: string, b = baseSlug) => slugDe(`${b}-${n || 'evento'}`);

  return (
    <form
      className="cartao grade"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await salvando(criarEvento({ nome, slug, base, inicio: paraIso(inicio), fim: paraIso(fim) }));
          setMsg(r.ok ? { ok: true, texto: 'Cardápio de evento criado. Agora escolha os produtos.' } : { ok: false, texto: r.erro });
        });
      }}
    >
      <h2 style={{ margin: 0 }}>1. Criar o cardápio de evento de {lojaNome}</h2>
      <p className="dica" style={{ margin: 0 }}>É um bônus: não conta no limite de cardápios do seu pacote. Cada loja tem um, e você reaproveita para cada nova data (muda nome, período e produtos).</p>
      <div className="gc-campos">
        <label className="gc-largo">
          Nome do evento
          <input required maxLength={120} value={nome} placeholder="Ex.: Aniversário 5 anos da LA PIZZA" onChange={(e) => { setNome(e.target.value); if (!mexido) setSlug(sugerir(e.target.value)); }} />
        </label>
        <label className="gc-largo">
          Endereço do link
          <input required value={slug} onChange={(e) => { setSlug(e.target.value.toLowerCase()); setMexido(true); }} />
          <span className="dica">{origem.replace(/^https?:\/\//, '')}/c/{slug || 'endereco'}</span>
        </label>
        {bases.length > 1 && (
          <label>
            Copiar configurações de
            <select value={base} onChange={(e) => { setBase(e.target.value); if (!mexido) setSlug(sugerir(nome, bases.find((b) => b.id === e.target.value)?.slug)); }}>
              {bases.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
            </select>
          </label>
        )}
        <label>Começa em<input type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} /></label>
        <label>Termina em<input type="datetime-local" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} /></label>
      </div>
      <p className="dica" style={{ margin: 0 }}>Deixe as datas em branco para valer até você pausar. Horários, bairros, taxas, pagamento e visual vêm do cardápio escolhido.</p>
      <div className="linha">
        <button className="botao-primario" disabled={pendente || !base}>{pendente ? 'Criando…' : 'Criar cardápio de evento'}</button>
        {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.texto}</span>}
      </div>
    </form>
  );
}

function ConfigEvento({ e }: { e: EventoInfo }) {
  const [nome, setNome] = useState(e.nome);
  const [inicio, setInicio] = useState(paraLocal(e.inicio));
  const [fim, setFim] = useState(paraLocal(e.fim));
  const [mensagem, setMensagem] = useState(e.mensagem);
  const [ativa, setAtiva] = useState(e.ativa);
  const [msg, setMsg] = useState<Msg>(null);
  const [copiado, setCopiado] = useState(false);
  const [pendente, iniciar] = useTransition();
  const s = situacao(e);
  const salvar = (extra?: Partial<{ ativa: boolean }>) =>
    iniciar(async () => {
      const r = await salvando(salvarEvento(e.id, { nome, inicio: paraIso(inicio), fim: paraIso(fim), mensagem, ativa: extra?.ativa ?? ativa }));
      setMsg(r.ok ? { ok: true, texto: 'Evento salvo.' } : { ok: false, texto: r.erro });
    });

  return (
    <section className="cartao grade" aria-label="Evento">
      <div className="ev-topo">
        <div className="grade" style={{ gap: '0.35rem', flex: '1 1 18rem' }}>
          <h2 style={{ margin: 0 }}>1. {e.nome}</h2>
          <span className="selo" style={{ color: s.cor, justifySelf: 'start' }}>● {s.rotulo}</span>
          <span className="linha" style={{ gap: '0.4rem' }}>
            <a href={e.link} target="_blank" rel="noreferrer" style={{ wordBreak: 'break-all' }}>{e.link.replace(/^https?:\/\//, '')}</a>
            <button type="button" className="mini" onClick={() => navigator.clipboard?.writeText(e.link).then(() => setCopiado(true)).catch(() => {})}>{copiado ? 'Copiado ✓' : 'Copiar link'}</button>
            <a className="botao mini" href={`https://wa.me/?text=${encodeURIComponent(`🎉 ${e.nome}! Peça pelo link: ${e.link}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
          </span>
        </div>
        <span className="ev-qr" aria-label="QR do link do evento" dangerouslySetInnerHTML={{ __html: e.qr }} />
      </div>
      <div className="gc-campos">
        <label className="gc-largo">Nome do evento<input value={nome} maxLength={120} onChange={(x) => setNome(x.target.value)} /></label>
        <label>Começa em<input type="datetime-local" value={inicio} onChange={(x) => setInicio(x.target.value)} /></label>
        <label>Termina em<input type="datetime-local" value={fim} min={inicio || undefined} onChange={(x) => setFim(x.target.value)} /></label>
        <label className="gc-largo">Recado no topo do cardápio (opcional)<input value={mensagem} maxLength={300} placeholder="Ex.: Promoção válida só neste fim de semana!" onChange={(x) => setMensagem(x.target.value)} /></label>
      </div>
      <div className="linha">
        <button type="button" className="botao-primario" disabled={pendente} onClick={() => salvar()}>{pendente ? 'Salvando…' : 'Salvar'}</button>
        <button
          type="button"
          disabled={pendente}
          onClick={() => {
            setAtiva(!ativa);
            salvar({ ativa: !ativa });
          }}
        >
          {ativa ? 'Pausar o link do evento' : 'Reativar o link do evento'}
        </button>
        {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.texto}</span>}
      </div>
    </section>
  );
}

type GrupoForm = GrupoEvento & { remover?: boolean; minTxt: string; maxTxt: string; precos: Record<string, string> };

function EditorProdutoEvento({ p, aberto, abrir }: { p: ProdutoEvento; aberto: boolean; abrir: () => void }) {
  const [nome, setNome] = useState(p.nome);
  const [descricao, setDescricao] = useState(p.descricao);
  const [preco, setPreco] = useState(reaisTxt(p.preco));
  const [ativo, setAtivo] = useState(p.ativo);
  const [grupos, setGrupos] = useState<GrupoForm[]>(() =>
    p.grupos.map((g) => ({ ...g, minTxt: String(g.min), maxTxt: String(g.max), precos: Object.fromEntries(g.opcoes.map((o) => [o.id, reaisTxt(o.preco)])) })),
  );
  const [msg, setMsg] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();
  const mudarG = (id: string, x: Partial<GrupoForm>) => setGrupos((gs) => gs.map((g) => (g.id === id ? { ...g, ...x } : g)));
  const ligadas = (g: GrupoForm) => g.opcoes.filter((o) => o.ativo).length;

  const salvar = () => {
    const pr = lerReais(preco);
    if (Number.isNaN(pr)) return setMsg({ ok: false, texto: 'Confira o preço.' });
    const gs: AjusteProduto['grupos'] = [];
    for (const g of grupos) {
      const min = Number(g.minTxt);
      const max = Number(g.maxTxt);
      if (!g.remover) {
        if (!Number.isInteger(min) || !Number.isInteger(max) || max < 1 || min < 0 || min > max) return setMsg({ ok: false, texto: `Confira mínimo e máximo em "${g.nome}".` });
        if (g.obrigatorio && min < 1) return setMsg({ ok: false, texto: `"${g.nome}" é obrigatório: o mínimo é 1.` });
        if (g.obrigatorio && ligadas(g) === 0) return setMsg({ ok: false, texto: `Deixe pelo menos uma opção ligada em "${g.nome}".` });
      }
      const opcoes: AjusteProduto['grupos'][number]['opcoes'] = [];
      for (const o of g.opcoes) {
        const v = lerReais(g.precos[o.id] ?? '');
        if (Number.isNaN(v)) return setMsg({ ok: false, texto: `Confira o preço de "${o.nome}".` });
        opcoes.push({ id: o.id, ativo: o.ativo, preco: v });
      }
      gs.push({ id: g.id, nome: g.nome, min, max, obrigatorio: g.obrigatorio, permite_repetir: g.permite_repetir, remover: g.remover, opcoes });
    }
    iniciar(async () => {
      const r = await salvando(salvarProdutoEvento(p.id, { nome, descricao, preco: pr, ativo, grupos: gs }));
      setMsg(r.ok ? { ok: true, texto: 'Salvo. Já vale no link do evento.' } : { ok: false, texto: r.erro });
      if (r.ok) setGrupos((x) => x.filter((g) => !g.remover));
    });
  };

  return (
    <article className="ev-produto" data-aberto={aberto || undefined} data-desligado={!p.ativo || undefined}>
      <button type="button" className="ev-produto-cab" onClick={abrir} aria-expanded={aberto}>
        {p.imagem ? <img src={p.imagem} alt="" /> : <span className="ev-sem-foto" aria-hidden>🍽️</span>}
        <span className="grade" style={{ gap: '0.1rem', textAlign: 'left' }}>
          <strong>{p.nome}</strong>
          <span className="dica">
            {p.categoria} · {brl(p.preco)}
            {p.grupos.map((g) => ` · ${g.nome}: ${g.min === g.max ? g.max : `${g.min} a ${g.max}`} (${g.opcoes.filter((o) => o.ativo).length} opções)`).join('')}
            {!p.ativo && ' · desligado'}
          </span>
        </span>
        <span aria-hidden>{aberto ? '▲' : '✏️ Ajustar'}</span>
      </button>

      {aberto && (
        <div className="grade ev-produto-corpo">
          <div className="gc-campos">
            <label className="gc-largo">Nome no evento<input value={nome} maxLength={150} onChange={(e) => setNome(e.target.value)} /></label>
            <label>Preço no evento (R$)<input inputMode="decimal" value={preco} onChange={(e) => setPreco(e.target.value)} /></label>
            <label className="gc-check"><input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Aparece no evento</label>
            <label className="gc-largo">Descrição<textarea rows={2} maxLength={1000} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></label>
          </div>

          {grupos.filter((g) => !g.remover).map((g) => (
            <fieldset key={g.id} className="ev-grupo">
              <legend>
                {g.pizza ? '🍕 ' : ''}
                <input aria-label="Nome do grupo" value={g.nome} maxLength={100} onChange={(e) => mudarG(g.id, { nome: e.target.value })} />
              </legend>
              <div className="linha" style={{ gap: '0.6rem' }}>
                <label>Mínimo<input inputMode="numeric" style={{ width: '4.5rem' }} value={g.minTxt} onChange={(e) => mudarG(g.id, { minTxt: e.target.value })} /></label>
                <label>Máximo<input inputMode="numeric" style={{ width: '4.5rem' }} value={g.maxTxt} onChange={(e) => mudarG(g.id, { maxTxt: e.target.value })} /></label>
                {g.pizza && (
                  <span className="linha" style={{ gap: '0.3rem' }}>
                    <button type="button" className="mini" onClick={() => mudarG(g.id, { minTxt: '1', maxTxt: '1', obrigatorio: true })}>Sabor único</button>
                    <button type="button" className="mini" onClick={() => mudarG(g.id, { minTxt: '1', maxTxt: '2', obrigatorio: true })}>Até 2 sabores</button>
                  </span>
                )}
                <label className="gc-check" style={{ display: 'flex' }}><input type="checkbox" checked={g.obrigatorio} onChange={(e) => mudarG(g.id, { obrigatorio: e.target.checked })} /> Obrigatório</label>
                <label className="gc-check" style={{ display: 'flex' }}><input type="checkbox" checked={g.permite_repetir} onChange={(e) => mudarG(g.id, { permite_repetir: e.target.checked })} /> Pode repetir a mesma opção</label>
                <button type="button" className="mini" onClick={() => { if (window.confirm(`Tirar o grupo "${g.nome}" deste produto do evento?`)) mudarG(g.id, { remover: true }); }}>Tirar grupo</button>
              </div>
              <div className="linha" style={{ gap: '0.4rem' }}>
                <span className="dica">{ligadas(g)} de {g.opcoes.length} ligadas</span>
                <button type="button" className="mini" onClick={() => mudarG(g.id, { opcoes: g.opcoes.map((o) => ({ ...o, ativo: true })) })}>Ligar todas</button>
                <button type="button" className="mini" onClick={() => mudarG(g.id, { opcoes: g.opcoes.map((o) => ({ ...o, ativo: false })) })}>Desligar todas</button>
              </div>
              <ul className="ev-opcoes">
                {g.opcoes.map((o) => (
                  <li key={o.id} data-ligada={o.ativo || undefined}>
                    <label className="gc-check" style={{ display: 'flex', flex: '1 1 auto' }}>
                      <input type="checkbox" checked={o.ativo} onChange={(e) => mudarG(g.id, { opcoes: g.opcoes.map((x) => (x.id === o.id ? { ...x, ativo: e.target.checked } : x)) })} />
                      {o.nome}
                    </label>
                    <span className="gc-valor">
                      + R$
                      <input aria-label={`Preço de ${o.nome}`} inputMode="decimal" value={g.precos[o.id] ?? ''} onChange={(e) => mudarG(g.id, { precos: { ...g.precos, [o.id]: e.target.value } })} />
                    </span>
                  </li>
                ))}
              </ul>
            </fieldset>
          ))}

          <div className="linha">
            <button type="button" className="botao-primario" disabled={pendente} onClick={salvar}>{pendente ? 'Salvando…' : 'Salvar produto'}</button>
            <button
              type="button"
              disabled={pendente}
              onClick={() => {
                if (!window.confirm(`Tirar "${p.nome}" do evento? O produto do cardápio principal não muda.`)) return;
                iniciar(async () => {
                  const r = await salvando(removerProdutoEvento(p.id));
                  if (!r.ok) setMsg({ ok: false, texto: r.erro });
                });
              }}
            >
              Tirar do evento
            </button>
            {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.texto}</span>}
          </div>
        </div>
      )}
    </article>
  );
}

function EscolherProdutos({ evento, principais, aoAdicionar }: { evento: string; principais: ProdutoPrincipal[]; aoAdicionar: (id: string) => void }) {
  const [busca, setBusca] = useState('');
  const [msg, setMsg] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();
  const [indo, setIndo] = useState<string | null>(null);
  const porCategoria = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const m = new Map<string, ProdutoPrincipal[]>();
    for (const p of principais) if (!t || p.nome.toLowerCase().includes(t) || p.categoria.toLowerCase().includes(t)) (m.get(p.categoria) ?? m.set(p.categoria, []).get(p.categoria)!).push(p);
    return [...m.entries()];
  }, [principais, busca]);

  return (
    <section className="cartao grade" aria-label="Escolher produtos">
      <div>
        <h2 style={{ margin: 0 }}>3. Escolher produtos do cardápio principal</h2>
        <p className="dica" style={{ margin: 0 }}>Clique em &quot;Adicionar&quot;: entra uma cópia no evento, com fotos, sabores e adicionais, pronta para você ajustar acima.</p>
      </div>
      <input type="search" placeholder="Buscar produto ou categoria" value={busca} onChange={(e) => setBusca(e.target.value)} />
      {msg && <p className={msg.ok ? 'dica' : 'erro'} style={{ margin: 0 }}>{msg.texto}</p>}
      {porCategoria.length === 0 && <p className="dica" style={{ margin: 0 }}>Nada encontrado.</p>}
      {porCategoria.map(([cat, ps]) => (
        <div key={cat} className="grade" style={{ gap: '0.35rem' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem' }}>{cat}</h3>
          <ul className="ev-escolher">
            {ps.map((p) => (
              <li key={p.id}>
                {p.imagem ? <img src={p.imagem} alt="" /> : <span className="ev-sem-foto" aria-hidden>🍽️</span>}
                <span className="grade" style={{ gap: 0, flex: '1 1 auto', minWidth: 0 }}>
                  <strong>{p.nome}</strong>
                  <span className="dica">{brl(p.preco)}{p.grupos ? ` · ${p.grupos} grupo(s) de opções` : ''}{p.noEvento ? ' · já está no evento' : ''}</span>
                </span>
                <button
                  type="button"
                  className="mini"
                  disabled={pendente}
                  onClick={() => {
                    setIndo(p.id);
                    iniciar(async () => {
                      const r = await salvando(copiarParaEvento(evento, p.id));
                      setIndo(null);
                      if (!r.ok) return setMsg({ ok: false, texto: r.erro });
                      setMsg({ ok: true, texto: `"${p.nome}" entrou no evento. Ajuste o preço e as opções na lista acima.` });
                      aoAdicionar(r.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    });
                  }}
                >
                  {indo === p.id ? 'Copiando…' : p.noEvento ? '+ Outra cópia' : '+ Adicionar'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

type Modo = 'ambos' | 'retirada' | 'entrega';

/** Pré-venda (D-056): o cliente compra antes, paga por Pix e recebe/retira no dia marcado. */
function PreVenda({ e }: { e: EventoInfo }) {
  const [ativa, setAtiva] = useState(e.prevenda);
  const [entrega, setEntrega] = useState(paraLocal(e.entrega));
  const [texto, setTexto] = useState(e.texto);
  const [modo, setModo] = useState<Modo>(e.aceitaEntrega && e.aceitaRetirada ? 'ambos' : e.aceitaEntrega ? 'entrega' : 'retirada');
  const [msg, setMsg] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();
  const salvar = (liga: boolean) =>
    iniciar(async () => {
      const r = await salvando(
        salvarPrevenda(e.id, { ativa: liga, entrega: paraIso(entrega), texto, aceitaEntrega: modo !== 'retirada', aceitaRetirada: modo !== 'entrega' }),
      );
      if (r.ok) setAtiva(liga);
      setMsg(r.ok ? { ok: true, texto: liga ? 'Pré-venda ligada. Os pedidos chegam como agendados para o dia marcado.' : 'Pré-venda desligada.' } : { ok: false, texto: r.erro });
    });

  return (
    <section className="cartao grade" aria-label="Pré-venda">
      <div className="linha" style={{ justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0 }}>🎟️ Pré-venda {ativa ? <span className="selo" style={{ color: '#15803d' }}>ligada</span> : <span className="selo">desligada</span>}</h2>
          <p className="dica" style={{ margin: 0 }}>
            O cliente compra <b>antes</b>, paga <b>só por Pix</b> na hora do pedido e recebe ou retira <b>no dia que você marcar</b>. Ótimo para encomendas de aniversário, datas especiais e lotes limitados.
          </p>
        </div>
      </div>

      {e.pix === 'mercado_pago' && <p className="dica" style={{ margin: 0 }}>✅ Pix pelo Mercado Pago: o pagamento é confirmado sozinho, e pedido não pago é cancelado em 40 minutos.</p>}
      {e.pix === 'manual' && <p className="aviso" style={{ margin: 0 }}>⚠️ Pix manual (chave Pix): confira cada pagamento antes de preparar. Para confirmar sozinho, conecte o Mercado Pago em <Link href="/aplicativos">Aplicativos</Link>.</p>}
      {e.pix === 'nenhum' && <p className="erro" style={{ margin: 0 }}>Para a pré-venda, ligue o Pix em <Link href="/aplicativos">Aplicativos</Link> (de preferência o Mercado Pago, que confirma sozinho).</p>}

      <div className="gc-campos">
        <label>
          Dia e hora da entrega / retirada
          <input type="datetime-local" value={entrega} onChange={(x) => setEntrega(x.target.value)} />
        </label>
        <label className="gc-largo">
          Recado sobre a entrega/retirada (opcional)
          <input value={texto} maxLength={200} placeholder="Ex.: Retirada das 18h às 22h no balcão" onChange={(x) => setTexto(x.target.value)} />
        </label>
      </div>

      <fieldset className="eq-modos gc-modos">
        <legend>Como o cliente recebe</legend>
        {([
          ['ambos', 'Entrega e retirada', 'O cliente escolhe na hora do pedido.'],
          ['retirada', 'Só retirada', 'O cliente busca na loja no dia marcado.'],
          ['entrega', 'Só entrega', 'Vale a taxa dos bairros/km do evento (em Delivery).'],
        ] as [Modo, string, string][]).map(([v, t, d]) => (
          <label key={v} className="eq-modo" data-escolhido={modo === v || undefined}>
            <input type="radio" name="prevenda-modo" checked={modo === v} onChange={() => setModo(v)} />
            <span><b>{t}</b><span className="dica">{d}</span></span>
          </label>
        ))}
      </fieldset>

      <p className="dica" style={{ margin: 0 }}>
        As vendas valem dentro do período do evento (acima). Cada pedido entra em Pedidos na faixa <b>Agendados</b> e vai para a cozinha na hora de preparar para o dia marcado.
      </p>
      <div className="linha">
        <button type="button" className="botao-primario" disabled={pendente || e.pix === 'nenhum'} onClick={() => salvar(true)}>
          {pendente ? 'Salvando…' : ativa ? 'Salvar pré-venda' : 'Ligar a pré-venda'}
        </button>
        {ativa && <button type="button" disabled={pendente} onClick={() => salvar(false)}>Desligar a pré-venda</button>}
        {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.texto}</span>}
      </div>
    </section>
  );
}
