'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { formatarReais, paraCentavos } from '@res/core';
import type { Cardapio, ProdutoRow, SetorRow } from '@/lib/cardapio-dados';
import { organizarCardapio } from '@/app/(painel)/cardapio/actions';

// Organizar o cardápio: arrastar (mouse ou dedo) para mudar a ordem e trocar de categoria,
// botões para quem prefere clicar, seleção para mover vários de uma vez e prévia ao vivo
// de como o cliente vê. Nada vai para o banco até clicar em "Salvar".

const SEM = '__sem';
type Layout = { setores: string[]; itens: Record<string, string[]> };
type Arraste = { tipo: 'produto' | 'setor'; id: string; x: number; y: number; dx: number; dy: number; largura: number; alvoCat: string | null };
type Marca = { id: string; nome: string };

const porNome = (a: string, b: string) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base', numeric: true });

function montar(c: Cardapio): Layout {
  const porOrdem = (a: ProdutoRow, b: ProdutoRow) => a.ordem - b.ordem || porNome(a.nome, b.nome);
  const setores = [...c.setores].sort((a, b) => a.ordem - b.ordem || porNome(a.nome, b.nome)).map((s) => s.id);
  const itens: Record<string, string[]> = {};
  for (const s of setores) itens[s] = c.produtos.filter((p) => p.setor_id === s).sort(porOrdem).map((p) => p.id);
  itens[SEM] = c.produtos.filter((p) => !p.setor_id || !itens[p.setor_id]).sort(porOrdem).map((p) => p.id);
  return { setores, itens };
}
const chave = (l: Layout) => JSON.stringify(l);
const ondeEsta = (l: Layout, id: string) => Object.keys(l.itens).find((c) => l.itens[c]!.includes(id));

/** Tira o produto de onde está e põe na categoria `para`, na posição `pos` (fim se omitida). */
function colocar(l: Layout, id: string, para: string, pos?: number): Layout {
  const itens: Record<string, string[]> = {};
  for (const [c, lista] of Object.entries(l.itens)) itens[c] = lista.filter((x) => x !== id);
  const destino = itens[para] ?? [];
  destino.splice(pos == null ? destino.length : Math.max(0, Math.min(pos, destino.length)), 0, id);
  itens[para] = destino;
  return { setores: l.setores, itens };
}
function colocarSetor(l: Layout, id: string, pos: number): Layout {
  const setores = l.setores.filter((x) => x !== id);
  setores.splice(Math.max(0, Math.min(pos, setores.length)), 0, id);
  return { setores, itens: l.itens };
}

export function Organizador({ cardapio, marcas }: { cardapio: Cardapio; marcas: Marca[] }) {
  const router = useRouter();
  const prod = useMemo(() => new Map(cardapio.produtos.map((p) => [p.id, p])), [cardapio.produtos]);
  const cat = useMemo(() => new Map(cardapio.setores.map((s) => [s.id, s])), [cardapio.setores]);
  const nomeCat = (c: string) => (c === SEM ? 'Sem categoria' : cat.get(c)?.nome ?? '');

  const [layout, setLayoutEstado] = useState<Layout>(() => montar(cardapio));
  const atual = useRef(layout);
  const definir = (l: Layout) => {
    atual.current = l;
    setLayoutEstado(l);
  };
  const [base, setBase] = useState(() => chave(montar(cardapio)));
  const [historico, setHistorico] = useState<Layout[]>([]);
  const sujo = chave(layout) !== base;

  // chegou cardápio novo do servidor (outra pessoa mexeu, ou acabamos de salvar) e não há nada pendente aqui
  useEffect(() => {
    const novo = montar(cardapio);
    if (chave(atual.current) === base || chave(novo) === chave(atual.current)) {
      definir(novo);
      setBase(chave(novo));
      setHistorico([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardapio]);

  const aplicar = (novo: Layout, msg?: string) => {
    if (chave(novo) === chave(atual.current)) return;
    setHistorico((h) => [...h.slice(-49), atual.current]);
    definir(novo);
    if (msg) avisar(msg);
  };
  const desfazer = () => {
    const anterior = historico[historico.length - 1];
    if (!anterior) return;
    setHistorico((h) => h.slice(0, -1));
    definir(anterior);
    avisar('Desfeito.');
  };

  const [aviso, setAviso] = useState('');
  const tAviso = useRef<ReturnType<typeof setTimeout>>(undefined);
  const avisar = (m: string) => {
    setAviso(m);
    clearTimeout(tAviso.current);
    tAviso.current = setTimeout(() => setAviso(''), 3500);
  };

  const [busca, setBusca] = useState('');
  const termo = busca.trim().toLowerCase();
  const [fechadas, setFechadas] = useState<Set<string>>(new Set());
  const [selecao, setSelecao] = useState<Set<string>>(new Set());
  const [destinoLote, setDestinoLote] = useState('');
  const [marcaPrevia, setMarcaPrevia] = useState(marcas[0]?.id ?? '');
  const [erro, setErro] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);
  const [salvandoAgora, iniciar] = useTransition();

  const containers = [...layout.setores, ...(layout.itens[SEM]?.length ? [SEM] : [])];

  // ------------------------------------------------------------ ações por clique
  const passo = (id: string, d: -1 | 1) => {
    const c = ondeEsta(atual.current, id);
    if (!c) return;
    const i = atual.current.itens[c]!.indexOf(id);
    aplicar(colocar(atual.current, id, c, i + d));
  };
  const extremo = (id: string, fim: boolean) => {
    const c = ondeEsta(atual.current, id);
    if (c) aplicar(colocar(atual.current, id, c, fim ? undefined : 0), fim ? 'Foi para o fim da categoria.' : 'Foi para o topo da categoria.');
  };
  const moverPara = (ids: string[], para: string) => {
    let l = atual.current;
    for (const id of ids) l = colocar(l, id, para);
    aplicar(l, ids.length === 1 ? `"${prod.get(ids[0]!)?.nome}" foi para ${nomeCat(para)}.` : `${ids.length} produtos foram para ${nomeCat(para)}.`);
    setFechadas((f) => {
      const n = new Set(f);
      n.delete(para);
      return n;
    });
  };
  const passoSetor = (id: string, d: -1 | 1) => aplicar(colocarSetor(atual.current, id, atual.current.setores.indexOf(id) + d));
  const ordenar = (c: string, modo: string) => {
    const preco = (id: string) => (prod.get(id)?.preco == null ? Infinity : Number(prod.get(id)!.preco));
    const lista = [...(atual.current.itens[c] ?? [])];
    const nome = (id: string) => prod.get(id)?.nome ?? '';
    if (modo === 'az') lista.sort((a, b) => porNome(nome(a), nome(b)));
    if (modo === 'za') lista.sort((a, b) => porNome(nome(b), nome(a)));
    if (modo === 'preco') lista.sort((a, b) => preco(a) - preco(b) || porNome(nome(a), nome(b)));
    if (modo === 'preco-desc') lista.sort((a, b) => preco(b) - preco(a) || porNome(nome(a), nome(b)));
    aplicar({ setores: atual.current.setores, itens: { ...atual.current.itens, [c]: lista } }, `${nomeCat(c)} reorganizada.`);
  };
  const ordenarCategoriasAZ = () =>
    aplicar({ setores: [...atual.current.setores].sort((a, b) => porNome(nomeCat(a), nomeCat(b))), itens: atual.current.itens }, 'Categorias em ordem alfabética.');

  // ------------------------------------------------------------ arrastar e soltar
  const [arraste, setArraste] = useState<Arraste | null>(null);
  const arr = useRef<Arraste | null>(null);
  const inicio = useRef<Layout | null>(null);

  const comecar = (e: React.PointerEvent, tipo: 'produto' | 'setor', id: string) => {
    if (e.button !== 0 || (tipo === 'produto' && termo)) return;
    const el = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-arrastavel]');
    if (!el) return;
    e.preventDefault();
    const r = el.getBoundingClientRect();
    inicio.current = atual.current;
    const a: Arraste = { tipo, id, x: e.clientX, y: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, largura: r.width, alvoCat: null };
    arr.current = a;
    setArraste(a);
  };

  const ativo = arraste ? `${arraste.tipo}:${arraste.id}` : null;
  useEffect(() => {
    if (!arr.current) return;
    let quadro = 0;
    const ponteiro = { y: arr.current.y };
    const rolar = () => {
      const borda = 80;
      const y = ponteiro.y;
      if (y < borda) window.scrollBy(0, -Math.ceil((borda - y) / 4));
      else if (y > window.innerHeight - borda) window.scrollBy(0, Math.ceil((y - (window.innerHeight - borda)) / 4));
      quadro = requestAnimationFrame(rolar);
    };
    quadro = requestAnimationFrame(rolar);

    const mover = (e: PointerEvent) => {
      const a = arr.current;
      if (!a) return;
      ponteiro.y = e.clientY;
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      let alvoCat: string | null = null;
      const l = atual.current;
      if (a.tipo === 'produto') {
        const lateral = el?.closest<HTMLElement>('[data-cat-alvo]');
        if (lateral) alvoCat = lateral.dataset.catAlvo ?? null;
        else {
          const item = el?.closest<HTMLElement>('[data-produto]');
          const alvo = item?.dataset.produto;
          if (item && alvo && alvo !== a.id) {
            const c = ondeEsta(l, alvo)!;
            const r = item.getBoundingClientRect();
            const depois = e.clientY > r.top + r.height / 2;
            const sem = l.itens[c]!.filter((x) => x !== a.id);
            const novo = colocar(l, a.id, c, sem.indexOf(alvo) + (depois ? 1 : 0));
            if (chave(novo) !== chave(l)) definir(novo);
          } else if (!item) {
            const cont = el?.closest<HTMLElement>('[data-container]')?.dataset.container;
            if (cont && ondeEsta(l, a.id) !== cont) definir(colocar(l, a.id, cont));
          }
        }
      } else {
        const item = el?.closest<HTMLElement>('[data-setor]');
        const alvo = item?.dataset.setor;
        if (item && alvo && alvo !== a.id) {
          const r = item.getBoundingClientRect();
          const depois = e.clientY > r.top + r.height / 2;
          const sem = l.setores.filter((x) => x !== a.id);
          const novo = colocarSetor(l, a.id, sem.indexOf(alvo) + (depois ? 1 : 0));
          if (chave(novo) !== chave(l)) definir(novo);
        }
      }
      arr.current = { ...a, x: e.clientX, y: e.clientY, alvoCat };
      setArraste(arr.current);
    };
    const terminar = (cancelar: boolean) => {
      const a = arr.current;
      arr.current = null;
      setArraste(null);
      const antes = inicio.current;
      inicio.current = null;
      if (!a || !antes) return;
      if (cancelar) {
        definir(antes);
        return;
      }
      if (a.tipo === 'produto' && a.alvoCat) {
        const depois = colocar(atual.current, a.id, a.alvoCat);
        definir(depois);
        avisar(`"${prod.get(a.id)?.nome}" foi para ${nomeCat(a.alvoCat)}.`);
        setFechadas((f) => {
          const n = new Set(f);
          n.delete(a.alvoCat!);
          return n;
        });
      }
      if (chave(antes) !== chave(atual.current)) setHistorico((h) => [...h.slice(-49), antes]);
    };
    const soltar = () => terminar(false);
    const cancelar = () => terminar(true);
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && cancelar();
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', cancelar);
    window.addEventListener('keydown', tecla);
    document.body.classList.add('org-arrastando');
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', cancelar);
      window.removeEventListener('keydown', tecla);
      document.body.classList.remove('org-arrastando');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo]);

  // atalhos: Ctrl+Z desfaz, Ctrl+S salva
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === 'z' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        desfazer();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (sujo) salvar();
      }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  });

  // não deixa sair com alterações pendentes sem querer
  useEffect(() => {
    if (!sujo) return;
    const f = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, [sujo]);

  // ------------------------------------------------------------ salvar
  const salvar = (depois?: () => void) =>
    iniciar(async () => {
      const l = atual.current;
      const setores = l.setores.filter((s) => cat.has(s));
      const produtos = [...setores, SEM].flatMap((c) => (l.itens[c] ?? []).filter((id) => prod.has(id)).map((id) => ({ id, setor: c === SEM ? null : c })));
      const r = await organizarCardapio(setores, produtos);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setErro(null);
      setBase(chave(l));
      setHistorico([]);
      avisar(r.movidos ? `Salvo! ${r.movidos} produto(s) trocaram de categoria.` : 'Salvo! O cardápio já aparece nesta ordem para os clientes.');
      router.refresh();
      depois?.();
    });
  const descartar = () => {
    definir(montar(cardapio));
    setHistorico([]);
    setSaindo(false);
    avisar('Alterações descartadas.');
  };

  // ------------------------------------------------------------ desenho
  const totalProdutos = cardapio.produtos.length;
  const visivel = (id: string) => !termo || (prod.get(id)?.nome.toLowerCase().includes(termo) ?? false);
  const todosSelecionados = (c: string) => (layout.itens[c] ?? []).length > 0 && (layout.itens[c] ?? []).every((id) => selecao.has(id));
  const alternarSel = (ids: string[], marcar: boolean) =>
    setSelecao((s) => {
      const n = new Set(s);
      for (const id of ids) (marcar ? n.add(id) : n.delete(id));
      return n;
    });
  const precoDe = (p: ProdutoRow) => (p.preco == null ? '—' : formatarReais(paraCentavos(Number(p.preco))));
  const compacto = arraste?.tipo === 'setor';

  const cartaoProduto = (p: ProdutoRow, c: string, i: number, n: number, fantasma = false) => {
    const sel = selecao.has(p.id);
    return (
      <li
        key={p.id}
        data-produto={fantasma ? undefined : p.id}
        data-arrastavel
        className={`org-item ${sel ? 'selecionado' : ''} ${arraste?.tipo === 'produto' && arraste.id === p.id && !fantasma ? 'fantasma' : ''}`}
      >
        <button
          type="button"
          className="org-alca"
          aria-label={`Arrastar ${p.nome}. Setas para cima e para baixo mudam a posição.`}
          title={termo ? 'Limpe a busca para arrastar' : 'Arraste para mudar a ordem ou a categoria'}
          disabled={!!termo}
          onPointerDown={(e) => comecar(e, 'produto', p.id)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' && i > 0) {
              e.preventDefault();
              passo(p.id, -1);
            } else if (e.key === 'ArrowDown' && i < n - 1) {
              e.preventDefault();
              passo(p.id, 1);
            }
          }}
        >
          ⠿
        </button>
        <input type="checkbox" checked={sel} onChange={(e) => alternarSel([p.id], e.target.checked)} aria-label={`Selecionar ${p.nome}`} />
        <span className="org-pos" aria-hidden="true">{i + 1}</span>
        {p.imagem_url ? <img src={p.imagem_url} alt="" className="miniatura" draggable={false} /> : <span className="miniatura vazia" aria-hidden="true" />}
        <span className="org-nome">
          <strong>{p.nome}</strong>
          {termo && <span className="dica"> · {nomeCat(c)}</span>}
        </span>
        <span className="org-preco">{precoDe(p)}</span>
        {!fantasma && (
          <span className="org-acoes">
            <button type="button" className="mini" title="Mandar para o topo" aria-label={`${p.nome}: topo`} disabled={i === 0} onClick={() => extremo(p.id, false)}>⤒</button>
            <button type="button" className="mini" title="Subir" aria-label={`${p.nome}: subir`} disabled={i === 0} onClick={() => passo(p.id, -1)}>↑</button>
            <button type="button" className="mini" title="Descer" aria-label={`${p.nome}: descer`} disabled={i === n - 1} onClick={() => passo(p.id, 1)}>↓</button>
            <button type="button" className="mini" title="Mandar para o fim" aria-label={`${p.nome}: fim`} disabled={i === n - 1} onClick={() => extremo(p.id, true)}>⤓</button>
            <select
              className="org-mover"
              value=""
              aria-label={`Mover ${p.nome} para outra categoria`}
              onChange={(e) => e.target.value && moverPara([p.id], e.target.value)}
            >
              <option value="">Mover para…</option>
              {layout.setores.filter((s) => s !== c).map((s) => <option key={s} value={s}>{nomeCat(s)}</option>)}
              {c !== SEM && <option value={SEM}>Sem categoria</option>}
            </select>
          </span>
        )}
      </li>
    );
  };

  const fantasmaProduto = arraste?.tipo === 'produto' ? prod.get(arraste.id) : undefined;
  const fantasmaSetor = arraste?.tipo === 'setor' ? cat.get(arraste.id) : undefined;

  return (
    <div className="grade org">
      <div className="org-topo">
        <div>
          <h1 style={{ margin: 0 }}>Organizar cardápio</h1>
          <p className="dica" style={{ margin: 0 }}>
            Arraste pela alça <span className="org-alca-exemplo">⠿</span> para mudar a ordem ou levar a outra categoria (também dá para soltar em cima do nome da categoria, à esquerda). A ordem daqui é a que o cliente vê.
          </p>
        </div>
        <div className="linha" style={{ gap: '0.5rem', alignItems: 'center' }}>
          <button type="button" onClick={desfazer} disabled={!historico.length || salvandoAgora} title="Ctrl+Z">↶ Desfazer</button>
          <button type="button" onClick={() => (sujo ? setSaindo(true) : router.push('/cardapio'))}>Voltar</button>
          <button type="button" className="botao-primario" disabled={!sujo || salvandoAgora} onClick={() => salvar()} title="Ctrl+S">
            {salvandoAgora ? 'Salvando…' : sujo ? 'Salvar ordem' : 'Tudo salvo ✓'}
          </button>
        </div>
      </div>

      {saindo && (
        <div className="cartao org-sair" role="alert">
          <span>Você mudou a ordem e ainda não salvou.</span>
          <span className="linha" style={{ gap: '0.5rem' }}>
            <button type="button" className="botao-primario" disabled={salvandoAgora} onClick={() => salvar(() => router.push('/cardapio'))}>Salvar e sair</button>
            <Link href="/cardapio" className="botao" onClick={() => { definir(montar(cardapio)); setBase(chave(montar(cardapio))); }}>Sair sem salvar</Link>
            <button type="button" onClick={() => setSaindo(false)}>Continuar aqui</button>
          </span>
        </div>
      )}
      {erro && <p className="erro" role="alert">{erro}</p>}
      <p className="org-aviso" role="status" aria-live="polite">{aviso}</p>

      <div className={`org-corpo ${compacto ? 'compacto' : ''}`}>
        {/* ---------------------------------------------- categorias (ordem + alvo para soltar) */}
        <aside className="org-lateral" aria-label="Ordem das categorias">
          <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Categorias</h2>
            <button type="button" className="mini" onClick={ordenarCategoriasAZ} title="Ordenar categorias de A a Z">A→Z</button>
          </div>
          <ol className="org-cats">
            {layout.setores.map((s, i) => {
              const info = cat.get(s);
              const alvo = arraste?.tipo === 'produto' && arraste.alvoCat === s;
              return (
                <li
                  key={s}
                  data-setor={s}
                  data-cat-alvo={s}
                  data-arrastavel
                  className={`org-cat ${alvo ? 'alvo' : ''} ${arraste?.tipo === 'setor' && arraste.id === s ? 'fantasma' : ''}`}
                >
                  <button
                    type="button"
                    className="org-alca"
                    aria-label={`Arrastar categoria ${info?.nome}. Setas mudam a posição.`}
                    onPointerDown={(e) => comecar(e, 'setor', s)}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowUp' && i > 0) {
                        e.preventDefault();
                        passoSetor(s, -1);
                      } else if (e.key === 'ArrowDown' && i < layout.setores.length - 1) {
                        e.preventDefault();
                        passoSetor(s, 1);
                      }
                    }}
                  >
                    ⠿
                  </button>
                  <a href={`#cat-${s}`} className="org-cat-nome">
                    {info?.nome}
                    {info && !info.delivery && !info.presencial && <span className="dica"> · oculta</span>}
                  </a>
                  <span className="dica">{layout.itens[s]?.length ?? 0}</span>
                  <span className="org-cat-setas">
                    <button type="button" className="mini" aria-label={`Subir categoria ${info?.nome}`} disabled={i === 0} onClick={() => passoSetor(s, -1)}>↑</button>
                    <button type="button" className="mini" aria-label={`Descer categoria ${info?.nome}`} disabled={i === layout.setores.length - 1} onClick={() => passoSetor(s, 1)}>↓</button>
                  </span>
                </li>
              );
            })}
          </ol>
          {layout.setores.length === 0 && <p className="dica">Nenhuma categoria ainda. Crie no Cardápio.</p>}
        </aside>

        {/* ---------------------------------------------- produtos por categoria */}
        <section className="org-principal" aria-label="Produtos por categoria">
          <div className="linha org-ferramentas">
            <input type="search" placeholder={`Buscar entre ${totalProdutos} produtos…`} value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar produto" />
            <button type="button" className="mini" onClick={() => setFechadas(new Set())}>Abrir todas</button>
            <button type="button" className="mini" onClick={() => setFechadas(new Set(containers))}>Fechar todas</button>
          </div>

          {containers.map((c) => {
            const lista = layout.itens[c] ?? [];
            const fechada = (fechadas.has(c) || compacto) && !termo;
            const mostrados = lista.filter(visivel);
            if (termo && !mostrados.length) return null;
            const info: SetorRow | undefined = cat.get(c);
            return (
              <article key={c} id={`cat-${c}`} className={`org-bloco ${arraste?.tipo === 'setor' && arraste.id === c ? 'fantasma' : ''}`} data-container={c} data-setor={c === SEM ? undefined : c}>
                <header className="org-bloco-topo">
                  <button type="button" className="org-abrir" aria-expanded={!fechada} onClick={() => setFechadas((f) => { const n = new Set(f); if (n.has(c)) n.delete(c); else n.add(c); return n; })}>
                    <span aria-hidden="true">{fechada ? '▸' : '▾'}</span> {nomeCat(c)}
                  </button>
                  {info?.nome_publico && info.nome_publico !== info.nome && <span className="dica">no cardápio: “{info.nome_publico}”</span>}
                  <span className="dica">{lista.length} produto(s)</span>
                  <span style={{ flex: 1 }} />
                  {lista.length > 0 && (
                    <label className="dica org-marcar">
                      <input type="checkbox" checked={todosSelecionados(c)} onChange={(e) => alternarSel(lista, e.target.checked)} /> todos
                    </label>
                  )}
                  {lista.length > 1 && (
                    <select value="" aria-label={`Ordenar ${nomeCat(c)}`} onChange={(e) => e.target.value && ordenar(c, e.target.value)}>
                      <option value="">Ordenar…</option>
                      <option value="az">Nome A → Z</option>
                      <option value="za">Nome Z → A</option>
                      <option value="preco">Menor preço primeiro</option>
                      <option value="preco-desc">Maior preço primeiro</option>
                    </select>
                  )}
                </header>
                {!fechada && (
                  <ul className="org-lista">
                    {mostrados.map((id) => {
                      const p = prod.get(id);
                      return p ? cartaoProduto(p, c, lista.indexOf(id), lista.length) : null;
                    })}
                    {lista.length === 0 && <li className="org-vazio">Categoria vazia. Arraste produtos para cá ou use “Mover para…”.</li>}
                  </ul>
                )}
              </article>
            );
          })}
          {/* lugar para soltar em "Sem categoria" mesmo quando ela ainda não existe */}
          {arraste?.tipo === 'produto' && !layout.itens[SEM]?.length && (
            <article className="org-bloco org-bloco-sem" data-container={SEM}>
              <div className="org-vazio">Solte aqui para deixar sem categoria (não aparece no cardápio).</div>
            </article>
          )}
        </section>

        {/* ---------------------------------------------- prévia */}
        <Previa layout={layout} prod={prod} cat={cat} marcas={marcas} marca={marcaPrevia} setMarca={setMarcaPrevia} />
      </div>

      {selecao.size > 0 && (
        <div className="org-lote" role="region" aria-label="Produtos selecionados">
          <strong>{selecao.size} selecionado(s)</strong>
          <select value={destinoLote} onChange={(e) => setDestinoLote(e.target.value)} aria-label="Categoria de destino">
            <option value="">Mover para…</option>
            {layout.setores.map((s) => <option key={s} value={s}>{nomeCat(s)}</option>)}
            <option value={SEM}>Sem categoria</option>
          </select>
          <button
            type="button"
            className="botao-primario"
            disabled={!destinoLote}
            onClick={() => {
              // mantém a ordem em que aparecem na tela
              const ordem = containers.flatMap((c) => layout.itens[c] ?? []).filter((id) => selecao.has(id));
              moverPara(ordem, destinoLote);
              setSelecao(new Set());
              setDestinoLote('');
            }}
          >
            Mover
          </button>
          <button type="button" onClick={() => setSelecao(new Set())}>Limpar seleção</button>
        </div>
      )}

      {sujo && !saindo && (
        <div className="org-pendente" role="status">
          <span>Alterações não salvas</span>
          <button type="button" onClick={descartar} disabled={salvandoAgora}>Descartar</button>
          <button type="button" className="botao-primario" onClick={() => salvar()} disabled={salvandoAgora}>{salvandoAgora ? 'Salvando…' : 'Salvar ordem'}</button>
        </div>
      )}

      {/* item que acompanha o dedo/mouse */}
      {arraste && (fantasmaProduto || fantasmaSetor) && (
        <div className="org-voando" style={{ left: arraste.x - arraste.dx, top: arraste.y - arraste.dy, width: arraste.largura }} aria-hidden="true">
          {fantasmaProduto ? (
            <ul className="org-lista">{cartaoProduto(fantasmaProduto, ondeEsta(layout, fantasmaProduto.id) ?? SEM, 0, 1, true)}</ul>
          ) : (
            <div className="org-cat">⠿ <strong>{fantasmaSetor!.nome}</strong></div>
          )}
          {arraste.alvoCat && <div className="org-voando-dica">Soltar em {nomeCat(arraste.alvoCat)}</div>}
        </div>
      )}
    </div>
  );
}

/** Como o cliente vê o delivery desta marca, na ordem atual (antes mesmo de salvar). */
function Previa({
  layout,
  prod,
  cat,
  marcas,
  marca,
  setMarca,
}: {
  layout: Layout;
  prod: Map<string, ProdutoRow>;
  cat: Map<string, SetorRow>;
  marcas: Marca[];
  marca: string;
  setMarca: (m: string) => void;
}) {
  const [aberta, setAberta] = useState(true);
  let ocultos = 0;
  const blocos = layout.setores
    .map((s) => {
      const info = cat.get(s);
      if (!info || !info.delivery || !info.setor_marcas.some((m) => m.marca_id === marca)) return null;
      const itens = (layout.itens[s] ?? [])
        .map((id) => prod.get(id))
        .filter((p): p is ProdutoRow => {
          if (!p) return false;
          const pm = p.produto_marcas.find((m) => m.marca_id === marca);
          const ok = !!pm && pm.ativo && pm.delivery;
          if (!ok) ocultos++;
          return ok;
        });
      return itens.length ? { s, nome: info.nome_publico || info.nome, itens } : null;
    })
    .filter(Boolean) as { s: string; nome: string; itens: ProdutoRow[] }[];

  const preco = (p: ProdutoRow) => {
    const pm = p.produto_marcas.find((m) => m.marca_id === marca);
    const v = pm?.preco_promocional ?? pm?.preco_delivery ?? p.preco;
    return v == null ? '' : formatarReais(paraCentavos(Number(v)));
  };

  return (
    <aside className="org-previa" aria-label="Prévia do cardápio">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
        <h2>Como o cliente vê</h2>
        <button type="button" className="mini org-previa-alternar" onClick={() => setAberta(!aberta)}>{aberta ? 'Esconder' : 'Mostrar'}</button>
      </div>
      {aberta && (
        <>
          {marcas.length > 1 && (
            <select value={marca} onChange={(e) => setMarca(e.target.value)} aria-label="Marca da prévia">
              {marcas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          )}
          <div className="org-celular">
            <div className="org-celular-abas">
              {blocos.map((b) => <span key={b.s}>{b.nome}</span>)}
            </div>
            <div className="org-celular-corpo">
              {blocos.length === 0 && <p className="dica">Nada visível no delivery desta marca ainda.</p>}
              {blocos.map((b) => (
                <section key={b.s}>
                  <h3>{b.nome}</h3>
                  {b.itens.map((p) => (
                    <div key={p.id} className="org-celular-item">
                      <span>
                        <strong>{p.nome}</strong>
                        {p.descricao && <span className="dica">{p.descricao}</span>}
                      </span>
                      {p.imagem_url ? <img src={p.imagem_url} alt="" draggable={false} /> : null}
                      <span className="org-celular-preco">{preco(p)}</span>
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </div>
          <p className="dica" style={{ margin: 0 }}>
            Prévia do delivery{marcas.length > 1 ? ' da marca escolhida' : ''}, já com as mudanças ainda não salvas.
            {ocultos > 0 && ` ${ocultos} produto(s) desativado(s) ou fora do delivery não aparecem.`}
          </p>
        </>
      )}
    </aside>
  );
}
