'use client';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { calcularItem, ErroEscolha, formatarReais, type Escolhas } from '@res/core';
import { grupoCore, MARCA_CORE, produtoCore, type GrupoPublico, type ProdutoPublico, type VitrinePublica } from '@/lib/publico';

type Extras = VitrinePublica['opcoes'];
const SELO = { mais_pedido: '🔥 Mais pedido', recomendado: '⭐ Recomendado', novo: '✨ Novo' } as const;

/** Mínimo efetivo do grupo (obrigatório = pelo menos 1). */
const minimo = (g: GrupoPublico) => (g.obrigatorio ? Math.max(1, g.min) : g.min);
export const completo = (g: GrupoPublico, e: Escolhas) => {
  const t = Object.values(e[g.id] ?? {}).reduce((s, q) => s + q, 0);
  return t >= minimo(g) && t <= g.max;
};
/** Grupo "cheio": não cabe mais nada (passa para o próximo). */
const cheio = (g: GrupoPublico, e: Escolhas) => Object.values(e[g.id] ?? {}).reduce((s, q) => s + q, 0) >= g.max;

/** Quanto a opção acrescenta, quando faz sentido mostrar (soma: o preço; maior: a diferença para a mais barata). */
function acrescimo(g: GrupoPublico, preco: number): number {
  if (g.formacao === 'soma') return preco;
  if (g.formacao === 'maior') return Math.max(0, preco - Math.min(...g.opcoes.map((o) => o.preco)));
  return 0;
}

/**
 * Grupos de escolha no padrão da montagem (D-046): cabeçalho fixo com contador X/Y e "Obrigatório",
 * busca no grupo, +/− por opção (repetir sabor), ingredientes, selos e passagem sozinha para o próximo grupo.
 */
export function GruposMontagem({
  produto,
  escolhas,
  setEscolhas,
  extras,
  erroGrupo,
  rolagem,
}: {
  produto: ProdutoPublico;
  escolhas: Escolhas;
  setEscolhas: (f: (e: Escolhas) => Escolhas) => void;
  extras?: Extras;
  erroGrupo?: string | null;
  rolagem?: RefObject<HTMLElement | null>;
}) {
  const [busca, setBusca] = useState<Record<string, string>>({});
  const [buscando, setBuscando] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const ultimo = useRef<string | null>(null);

  const tot = (g: string) => Object.values(escolhas[g] ?? {}).reduce((s, q) => s + q, 0);
  const qtd = (g: string, o: string) => escolhas[g]?.[o] ?? 0;

  const ir = (id: string) => {
    const el = refs.current[id];
    if (!el) return;
    const box = rolagem?.current;
    if (box) box.scrollTo({ top: el.offsetTop - box.offsetTop - 4, behavior: 'smooth' });
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // completou o grupo que acabou de mexer → vai para o próximo que falta
  useEffect(() => {
    const g = produto.grupos.find((x) => x.id === ultimo.current);
    if (!g || !cheio(g, escolhas)) return;
    ultimo.current = null;
    const i = produto.grupos.indexOf(g);
    const prox = produto.grupos.slice(i + 1).find((x) => !completo(x, escolhas)) ?? produto.grupos.slice(i + 1)[0];
    if (prox) setTimeout(() => ir(prox.id), 180);
  });
  useEffect(() => {
    if (erroGrupo) ir(erroGrupo);
  }, [erroGrupo]);

  const alterar = (g: GrupoPublico, o: string, delta: number) => {
    ultimo.current = g.id;
    setEscolhas((e) => {
      const atual = { ...(e[g.id] ?? {}) };
      const total = Object.values(atual).reduce((s, q) => s + q, 0);
      const ja = atual[o] ?? 0;
      if (delta > 0) {
        if (g.max === 1) return { ...e, [g.id]: { [o]: 1 } };
        const lim = g.opcoes.find((x) => x.id === o)?.max ?? 1;
        if (total >= g.max || ja >= lim || (!g.permite_repetir && ja >= 1)) return e;
      }
      const novo = Math.max(0, ja + delta);
      if (novo === 0) delete atual[o];
      else atual[o] = novo;
      return { ...e, [g.id]: atual };
    });
  };

  return (
    <>
      {produto.grupos.map((g) => {
        const t = tot(g.id);
        const ok = completo(g, escolhas) && t > 0;
        const termo = (busca[g.id] ?? '').trim().toLowerCase();
        const lista = termo ? g.opcoes.filter((o) => `${o.nome} ${extras?.[o.id]?.descricao ?? ''}`.toLowerCase().includes(termo)) : g.opcoes;
        const min = minimo(g);
        const regra = g.max === 1 ? 'Escolha 1 opção' : min === g.max ? `Escolha ${g.max} opções` : min > 0 ? `Escolha de ${min} a ${g.max}` : `Escolha até ${g.max}`;
        return (
          <section key={g.id} ref={(el) => { refs.current[g.id] = el; }} className="mg-grupo" data-erro={erroGrupo === g.id ? 'sim' : undefined}>
            <header className="mg-cab">
              <div className="grade" style={{ gap: 0, minWidth: 0 }}>
                <strong>{g.nome}</strong>
                <span className="mg-regra">{regra}{g.pizza && g.max > 1 ? ' · os sabores dividem a pizza' : ''}</span>
              </div>
              <span className="mg-cont" data-ok={ok ? 'sim' : undefined}>{t}/{g.max}{ok ? ' ✓' : ''}</span>
              {min > 0 && !ok && <span className="mg-obrig">OBRIGATÓRIO</span>}
              {g.opcoes.length > 8 && (
                <button type="button" className="mg-lupa" aria-label={`Buscar em ${g.nome}`} aria-pressed={buscando === g.id} onClick={() => setBuscando(buscando === g.id ? null : g.id)}>🔍</button>
              )}
            </header>
            {buscando === g.id && (
              <input className="mg-busca" type="search" autoFocus value={busca[g.id] ?? ''} onChange={(e) => setBusca({ ...busca, [g.id]: e.target.value })} placeholder={`Buscar em ${g.nome.toLowerCase()}…`} />
            )}
            <ul className="mg-opcoes">
              {lista.map((o) => {
                const q = qtd(g.id, o.id);
                const ex = extras?.[o.id];
                const mais = acrescimo(g, o.preco);
                const lotado = q === 0 && g.max > 1 && t >= g.max;
                const conteudo = (
                  <>
                    {o.imagem_url ? <img className="mg-foto" src={o.imagem_url} alt="" loading="lazy" /> : null}
                    <span className="mg-texto">
                      {ex?.selo && <span className="mg-selo" data-selo={ex.selo}>{SELO[ex.selo]}</span>}
                      <strong>{o.nome}</strong>
                      {ex?.descricao && <span className="mg-desc">{ex.descricao}</span>}
                      {mais > 0 && <span className="mg-preco">+ {formatarReais(mais)}</span>}
                    </span>
                  </>
                );
                return (
                  <li key={o.id} data-on={q > 0 ? 'sim' : undefined} data-lotado={lotado ? 'sim' : undefined}>
                    {g.max === 1 ? (
                      <button type="button" className="mg-linha" role="radio" aria-checked={q > 0} onClick={() => alterar(g, o.id, q > 0 && !g.obrigatorio ? -1 : 1)}>
                        {conteudo}
                        <span className="mg-radio" aria-hidden />
                      </button>
                    ) : (
                      <div className="mg-linha">
                        {conteudo}
                        <span className="mg-passo">
                          {q > 0 && <button type="button" aria-label={`Menos ${o.nome}`} onClick={() => alterar(g, o.id, -1)}>−</button>}
                          {q > 0 && <span aria-live="polite">{q}</span>}
                          <button type="button" aria-label={`Mais ${o.nome}`} disabled={lotado || (!g.permite_repetir && q >= 1)} onClick={() => alterar(g, o.id, 1)}>+</button>
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
              {lista.length === 0 && <li className="dica" style={{ padding: '0.6rem' }}>Nada encontrado.</li>}
            </ul>
          </section>
        );
      })}
    </>
  );
}

/** Montagem de um produto (D-046): foto ao lado no computador, grupos, observação, quantidade e Adicionar. */
export function Montador({
  produto,
  extras,
  inicial,
  aoAdicionar,
  aoFechar,
}: {
  produto: ProdutoPublico;
  extras?: Extras;
  inicial?: { escolhas: Escolhas; observacao: string; quantidade: number };
  aoAdicionar: (p: ProdutoPublico, e: Escolhas, obs: string, quantidade: number) => void;
  aoFechar: () => void;
}) {
  const [escolhas, setEscolhas] = useState<Escolhas>(inicial?.escolhas ?? {});
  const [obs, setObs] = useState(inicial?.observacao ?? '');
  const [quantidade, setQuantidade] = useState(inicial?.quantidade ?? 1);
  const [erro, setErro] = useState<{ grupo: string; msg: string } | null>(null);
  const rolagem = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const f = (ev: KeyboardEvent) => ev.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [aoFechar]);
  useEffect(() => {
    if (!erro) return;
    const t = setTimeout(() => setErro(null), 3500);
    return () => clearTimeout(t);
  }, [erro]);

  const calc = useMemo(() => {
    try {
      return { r: calcularItem(produtoCore(produto), produto.grupos.map(grupoCore), escolhas, MARCA_CORE, 'delivery') };
    } catch (e) {
      return { e: e instanceof ErroEscolha ? e : null };
    }
  }, [produto, escolhas]);
  // preço parcial enquanto monta: base + o que já foi escolhido (sem validar o que falta)
  const parcial = useMemo(() => {
    if (calc.r) return calc.r.unitario;
    try {
      const soEscolhidos = produto.grupos.map((g) => ({ ...grupoCore(g), obrigatorio: false, minQtd: 0 }));
      return calcularItem(produtoCore(produto), soEscolhidos, escolhas, MARCA_CORE, 'delivery').unitario;
    } catch {
      return produto.preco;
    }
  }, [calc, produto, escolhas]);

  const adicionar = () => {
    if (calc.r) return aoAdicionar(produto, escolhas, obs.trim(), quantidade);
    const g = produto.grupos.find((x) => !completo(x, escolhas));
    setErro({ grupo: calc.e?.grupoId || g?.id || '', msg: g ? `Verifique a quantidade do grupo "${g.nome}".` : calc.e?.message ?? 'Escolha incompleta.' });
  };

  return (
    <div className="pub-folha-fundo mg-fundo" onClick={aoFechar}>
      <div className="mg-folha" role="dialog" aria-modal="true" aria-label={produto.nome} onClick={(e) => e.stopPropagation()}>
        <div className="mg-imagem">{produto.imagem_url ? <img src={produto.imagem_url} alt="" /> : <span aria-hidden>🍕</span>}</div>
        <div className="mg-lado">
          <div className="mg-topo">
            <strong>{produto.nome}</strong>
            <button type="button" className="mini" onClick={aoFechar} aria-label="Fechar">✕</button>
          </div>
          <div className="mg-rolagem" ref={rolagem}>
            <div className="mg-intro">
              {produto.imagem_url && <img className="mg-imagem-celular" src={produto.imagem_url} alt="" />}
              <h2>{produto.nome}</h2>
              {produto.descricao && <p className="dica">{produto.descricao}</p>}
              <strong className="mg-base">{produto.grupos.length && produto.preco === 0 ? 'Monte o seu' : formatarReais(produto.preco)}</strong>
            </div>
            <GruposMontagem produto={produto} escolhas={escolhas} setEscolhas={setEscolhas} extras={extras} erroGrupo={erro?.grupo ?? null} rolagem={rolagem} />
            <label className="mg-obs">
              <span className="pub-linha" style={{ justifyContent: 'space-between' }}><strong>Alguma observação?</strong><span className="dica">{obs.length}/100</span></span>
              <textarea rows={2} maxLength={100} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: tirar a cebola, bem passada…" />
            </label>
          </div>
          {erro && <div className="mg-aviso" role="alert">{erro.msg}</div>}
          <div className="mg-rodape">
            <span className="mg-qtd">
              <button type="button" aria-label="Menos" disabled={quantidade <= 1} onClick={() => setQuantidade((q) => Math.max(1, q - 1))}>−</button>
              <span aria-live="polite">{quantidade}</span>
              <button type="button" aria-label="Mais" onClick={() => setQuantidade((q) => Math.min(20, q + 1))}>+</button>
            </span>
            <button type="button" className="botao-primario mg-adicionar" data-incompleto={calc.r ? undefined : 'sim'} onClick={adicionar}>
              <span>{inicial ? 'Salvar' : 'Adicionar'}</span>
              <span>{formatarReais(parcial * quantidade)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
