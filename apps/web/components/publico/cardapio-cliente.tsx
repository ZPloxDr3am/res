'use client';
import { useEffect, useMemo, useState, useTransition, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  calcularCombo,
  calcularItem,
  dataNoFuso,
  precoSeparado,
  ErroEscolha,
  ErroPedido,
  formatarReais,
  horaNoFuso,
  PAGAMENTO_ROTULO,
  rotuloHorario,
  taxaDoBairro,
  totalizar,
  troco,
  type EscolhaPasso,
  type Escolhas,
  type FormaPagamento,
  normalizarTelefone,
} from '@res/core';
import { FidelidadeCliente, lembrarPedidoFidelidade, provaFidelidade } from '@/components/fidelidade/cliente';
import type { UsoFidelidade } from '@/components/fidelidade/balcao';
import {
  DIAS,
  diaNoFuso,
  grupoCore,
  MARCA_CORE,
  passosPublicosCore,
  produtoCore,
  type AgendamentoPublico,
  type CardapioPublico,
  type GrupoPublico,
  type ProdutoPublico,
  situacaoHorario,
  type VitrinePublica,
} from '@/lib/publico';
import { calcularEntregaKm, conferirCupom, enviarPedido, type EntregaKm, type FaixaKm } from '@/app/c/[slug]/actions';
import { rastrear } from '@/lib/rastreio';
import { GruposMontagem, Montador } from '@/components/publico/montagem';
import { guardarPedido, MeusPedidos, NavCliente, PerfilCliente } from '@/components/publico/conta-cliente';

type Item = { chave: number; produtoId: string; quantidade: number; escolhas: Escolhas; observacao: string; passos?: EscolhaPasso[] };
type ItemCalculado = Item & { produto: ProdutoPublico; unitario: number; resumo: string };

const ler = <T,>(chave: string, padrao: T): T => {
  try {
    const v = localStorage.getItem(chave);
    return v ? (JSON.parse(v) as T) : padrao;
  } catch {
    return padrao;
  }
};
const gravar = (chave: string, valor: unknown) => {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* sem armazenamento: o carrinho só vive nesta aba */
  }
};

const lerCentavos = (t: string): number | null => {
  const s = t.trim().replace(/\s|R\$/g, '');
  if (!s) return null;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};

const ETIQUETA: Record<string, string> = { novo: 'Novo', recomendado: 'Recomendado', mais_vendido: 'Mais vendido', edicao_limitada: 'Edição limitada', esgotado: 'Esgotado' };

function resumoEscolhas(p: ProdutoPublico, e: Escolhas): string {
  return p.grupos
    .flatMap((g) => {
      const esc = e[g.id] ?? {};
      const tot = Object.values(esc).reduce((s, q) => s + q, 0);
      return g.opcoes
        .filter((o) => (esc[o.id] ?? 0) > 0)
        .map((o) => (g.pizza && tot > 1 ? `${esc[o.id]}/${tot} ${o.nome}` : `${esc[o.id]! > 1 ? `${esc[o.id]}× ` : ''}${o.nome}`));
    })
    .join(', ');
}

function resumoCombo(p: ProdutoPublico, passos: EscolhaPasso[]): string {
  return passos
    .map((e) => {
      const filho = p.passos?.find((x) => x.id === e.passoId)?.produtos.find((x) => x.id === e.produtoId);
      if (!filho) return '';
      const r = resumoEscolhas(filho, e.escolhas);
      return r ? `${filho.nome} (${r})` : filho.nome;
    })
    .filter(Boolean)
    .join(' + ');
}

export type Prevenda = { entrega: string; texto: string | null };

export function CardapioCliente({ cardapio, agendamento, vitrine, faixasKm = [], prevenda = null }: { cardapio: CardapioPublico; agendamento: AgendamentoPublico; vitrine?: VitrinePublica | null; faixasKm?: FaixaKm[]; prevenda?: Prevenda | null }) {
  const { marca, setores } = cardapio;
  const router = useRouter();
  const chaveCarrinho = `res_carrinho_${marca.slug}`;
  const produtos = useMemo(() => new Map(setores.flatMap((s) => s.produtos.map((p) => [p.id, p] as const))), [setores]);

  const [itens, setItens] = useState<Item[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [abrindo, setAbrindo] = useState<ProdutoPublico | null>(null);
  const [etapa, setEtapa] = useState<'cardapio' | 'carrinho' | 'pedidos' | 'perfil'>('cardapio');
  const [setorVisivel, setSetorVisivel] = useState<string | null>(setores[0]?.id ?? null);
  const [busca, setBusca] = useState('');
  const [info, setInfo] = useState<string | null>(null);

  // carrinho salvo neste aparelho
  useEffect(() => {
    setItens(ler<Item[]>(chaveCarrinho, []));
    setCarregado(true);
  }, [chaveCarrinho]);
  useEffect(() => {
    if (carregado) gravar(chaveCarrinho, itens);
  }, [itens, carregado, chaveCarrinho]);

  // recalcula com o cardápio de agora; o que não vale mais sai
  const calculados: ItemCalculado[] = useMemo(
    () =>
      itens.flatMap((i) => {
        const p = produtos.get(i.produtoId);
        if (!p || p.etiqueta === 'esgotado') return [];
        try {
          if (p.combo) {
            const r = calcularCombo(produtoCore(p), passosPublicosCore(p), i.passos ?? [], MARCA_CORE, 'delivery');
            return [{ ...i, produto: p, unitario: r.unitario, resumo: resumoCombo(p, i.passos ?? []) }];
          }
          const r = calcularItem(produtoCore(p), p.grupos.map(grupoCore), i.escolhas, MARCA_CORE, 'delivery');
          return [{ ...i, produto: p, unitario: r.unitario, resumo: resumoEscolhas(p, i.escolhas) }];
        } catch {
          return [];
        }
      }),
    [itens, produtos],
  );
  const quantidade = calculados.reduce((s, i) => s + i.quantidade, 0);
  const subtotal = calculados.reduce((s, i) => s + i.unitario * i.quantidade, 0);

  const [editando, setEditando] = useState<Item | null>(null);
  const adicionar = (p: ProdutoPublico, escolhas: Escolhas, observacao: string, passos?: EscolhaPasso[], quantidade = 1) => {
    if (editando) {
      setItens((x) => x.map((i) => (i.chave === editando.chave ? { ...i, escolhas, observacao, quantidade, ...(passos ? { passos } : {}) } : i)));
      setEditando(null);
      setAbrindo(null);
      return;
    }
    setItens((x) => [...x, { chave: Date.now(), produtoId: p.id, quantidade, escolhas, observacao, ...(passos ? { passos } : {}) }]);
    rastrear({ tipo: 'add_to_cart', id: p.id, nome: p.nome });
    setAbrindo(null);
  };
  const abrir = (p: ProdutoPublico) => (p.combo || p.grupos.length ? setAbrindo(p) : adicionar(p, {}, ''));
  // link de um produto (D-045): /c/<endereço>?produto=<id> abre direto a montagem
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('produto');
    const p = id ? produtos.get(id) : null;
    if (p && p.etiqueta !== 'esgotado' && (p.combo || p.grupos.length)) setAbrindo(p);
  }, [produtos]);
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      if (abrindo) u.searchParams.set('produto', abrindo.id);
      else u.searchParams.delete('produto');
      window.history.replaceState(null, '', u.toString());
    } catch {}
  }, [abrindo]);
  const termo = busca.trim().toLowerCase();
  const setoresVisiveis = termo
    ? setores.map((s) => ({ ...s, produtos: s.produtos.filter((p) => `${p.nome} ${p.descricao ?? ''}`.toLowerCase().includes(termo)) })).filter((s) => s.produtos.length)
    : setores;
  // "Peça também": produtos das categorias de up-sell que ainda não estão no pedido
  const sugestoes = useMemo(() => {
    const no = new Set(itens.map((i) => i.produtoId));
    return setores.filter((s) => s.upsell).flatMap((s) => s.produtos).filter((p) => !p.combo && p.etiqueta !== 'esgotado' && !no.has(p.id)).slice(0, 6);
  }, [setores, itens]);

  const hoje = diaNoFuso(marca.fuso);
  const horarioHoje = marca.horarios.filter((h) => h.dia === hoje).map((h) => `${h.abre}–${h.fecha}`).join(', ');
  const podeAgendar = agendamento.horarios.length > 0;

  return (
    <div className="pub" style={vitrine?.cor ? ({ ['--primaria' as string]: vitrine.cor, ['--primaria-forte' as string]: `color-mix(in srgb, ${vitrine.cor} 80%, black)`, ['--primaria-fundo' as string]: `color-mix(in srgb, ${vitrine.cor} 12%, white)`, ['--primaria-texto' as string]: '#fff' } as CSSProperties) : undefined}>
      <header className="pv-topo">
        <div className="pv-capa" style={vitrine?.capa_url ? { backgroundImage: `url(${vitrine.capa_url})` } : undefined} />
        <div className="pv-id">
          {vitrine?.logo_url ? <img className="pv-logo" src={vitrine.logo_url} alt={`Logo ${marca.nome}`} /> : <span className="pv-logo pv-logo-letra" aria-hidden>{marca.nome.slice(0, 1)}</span>}
          <div className="grade" style={{ gap: '0.25rem', minWidth: 0 }}>
            <h1>{marca.nome}</h1>
            <div className="pub-linha">
              {prevenda ? (
                <span className="pub-status aberto">🎟️ Pré-venda aberta</span>
              ) : (
                <span className={`pub-status ${marca.aberta ? 'aberto' : 'fechado'}`}>{situacaoHorario(marca.horarios, marca.aberta, marca.fuso)}</span>
              )}
              {vitrine?.loja.cidade && <span className="dica">📍 {vitrine.loja.cidade}</span>}
              <button type="button" className="pv-link" onClick={() => setInfo('sobre')}>Mais informações</button>
            </div>
          </div>
        </div>
        <div className="pub-linha pv-resumo">
          {marca.aceita_entrega && <span className="dica">🛵 Entrega {vitrine ? `${vitrine.loja.prazo_entrega_min - 5}–${vitrine.loja.prazo_entrega_min + 5} min` : ''}</span>}
          {marca.aceita_retirada && <span className="dica">🏪 Retirada ~{marca.tempo_preparo_min} min</span>}
          {marca.pedido_minimo > 0 && <span className="dica">Pedido mínimo {formatarReais(marca.pedido_minimo)}</span>}
          {prevenda && <span className="dica">📅 {marca.aceita_entrega && marca.aceita_retirada ? 'Entrega ou retirada' : marca.aceita_entrega ? 'Entrega' : 'Retirada'} em {rotuloHorario(new Date(prevenda.entrega), marca.fuso)}{prevenda.texto ? ` · ${prevenda.texto}` : ''} · pagamento por Pix</span>}
          {!prevenda && !marca.aberta && podeAgendar && <span className="dica">Agende para {rotuloHorario(new Date(agendamento.horarios[0]!), marca.fuso)} ou depois</span>}
        </div>
        {marca.mensagem && <p className="pub-mensagem">{marca.mensagem}</p>}
      </header>

      {etapa === 'cardapio' && (
        <>
          <div className="pv-barra">
            <select
              aria-label="Categoria"
              value={setorVisivel ?? ''}
              onChange={(e) => {
                setSetorVisivel(e.target.value);
                setBusca('');
                requestAnimationFrame(() => document.getElementById(`s-${e.target.value}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
              }}
            >
              {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
            <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="🔍 Busque por um produto" aria-label="Buscar produto" />
          </div>
          <nav className="pub-setores" aria-label="Categorias">
            {setores.map((s) => (
              <a key={s.id} href={`#s-${s.id}`} aria-current={setorVisivel === s.id ? 'true' : undefined} onClick={() => { setSetorVisivel(s.id); setBusca(''); }}>
                {s.nome}
              </a>
            ))}
          </nav>
          <main className="pub-lista">
            {setores.length === 0 && <p className="dica">O cardápio ainda está sendo montado.</p>}
            {termo && setoresVisiveis.length === 0 && <p className="dica">Nada encontrado para "{busca}".</p>}
            {setoresVisiveis.map((s) => (
              <section key={s.id} id={`s-${s.id}`} aria-label={s.nome}>
                <h2>{s.nome}</h2>
                <div className="pv-grade">
                {s.produtos.map((p) => {
                  const esgotado = p.etiqueta === 'esgotado';
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="pub-produto"
                      disabled={esgotado}
                      onClick={() => abrir(p)}
                    >
                      <span className="pub-produto-texto">
                        <strong>{p.nome}</strong>
                        {p.combo && <span className="selo selo-combo">Combo</span>}
                        {p.preco_original != null && p.preco_original > p.preco && <span className="selo selo-promo">-{Math.round(((p.preco_original - p.preco) / p.preco_original) * 100)}%</span>}
                        {p.etiqueta && <span className="selo">{ETIQUETA[p.etiqueta]}</span>}
                        {p.descricao && <span className="dica">{p.descricao}</span>}
                        <Extras extra={vitrine?.produtos[p.id]} />
                        <span>
                          {!p.combo && p.grupos.length > 0 && p.preco === 0 ? 'Monte o seu' : (!p.combo && p.grupos.length > 0 ? 'A partir de ' : '') + formatarReais(p.preco)}
                          {p.preco_original != null && <s className="dica"> {formatarReais(p.preco_original)}</s>}
                        </span>
                      </span>
                      {p.imagem_url && <img src={p.imagem_url} alt="" loading="lazy" />}
                    </button>
                  );
                })}
                </div>
              </section>
            ))}
          </main>
        </>
      )}

      {etapa === 'carrinho' && (
        <Checkout
          cardapio={cardapio}
          prevenda={prevenda}
          faixasKm={faixasKm}
          agendamento={agendamento}
          itens={calculados}
          subtotal={subtotal}
          sugestoes={sugestoes}
          aoSugerir={abrir}
          alterar={(chave, delta) =>
            setItens((x) => x.flatMap((i) => (i.chave !== chave ? [i] : i.quantidade + delta <= 0 ? [] : [{ ...i, quantidade: Math.min(99, i.quantidade + delta) }])))
          }
          voltar={() => setEtapa('cardapio')}
          editar={(i) => { const p = produtos.get(i.produtoId); if (p && !p.combo) { setEditando(i); setAbrindo(p); } }}
          concluido={(codigo, numero, total) => {
            guardarPedido({ codigo, slug: marca.slug, numero, total, em: new Date().toISOString() });
            setItens([]);
            gravar(chaveCarrinho, []);
            router.push(`/c/${marca.slug}/pedido/${codigo}`);
          }}
        />
      )}

      {etapa === 'cardapio' && quantidade > 0 && (
        <div className="pub-barra cl-acima-nav">
          <button type="button" className="botao-primario" onClick={() => { rastrear({ tipo: 'begin_checkout', valor: subtotal }); setEtapa('carrinho'); }}>
            Ver pedido · {quantidade} {quantidade === 1 ? 'item' : 'itens'} · {formatarReais(subtotal)}
          </button>
        </div>
      )}

      {etapa === 'pedidos' && <MeusPedidos slug={marca.slug} />}
      {etapa === 'perfil' && <PerfilCliente />}
      {etapa !== 'carrinho' && <NavCliente aba={etapa} setAba={(a) => { setEtapa(a); window.scrollTo({ top: 0 }); }} temSacola={quantidade > 0} />}
      {etapa === 'cardapio' && (
        <footer className="pv-rodape">
          <strong>{vitrine?.loja.nome ?? marca.nome}</strong>
          {vitrine?.loja.cnpj && <span>CNPJ {vitrine.loja.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}</span>}
          {vitrine?.loja.endereco && <span>{vitrine.loja.endereco}{vitrine.loja.cidade ? ` · ${vitrine.loja.cidade}` : ''}</span>}
        </footer>
      )}
      {info && <MaisInformacoes aba={info} setAba={setInfo} cardapio={cardapio} vitrine={vitrine ?? null} />}
      {abrindo && !abrindo.combo && (
        <Montador
          key={editando?.chave ?? abrindo.id}
          produto={abrindo}
          extras={vitrine?.opcoes}
          inicial={editando ? { escolhas: editando.escolhas, observacao: editando.observacao, quantidade: editando.quantidade } : undefined}
          aoAdicionar={(p, e, obs, q) => adicionar(p, e, obs, undefined, q)}
          aoFechar={() => { setAbrindo(null); setEditando(null); }}
        />
      )}
      {abrindo?.combo && <MontadorCombo combo={abrindo} extras={vitrine?.opcoes} aoAdicionar={(passos, obs) => adicionar(abrindo, {}, obs, passos)} aoFechar={() => { setAbrindo(null); setEditando(null); }} />}
    </div>
  );
}

/** Escolha das opções dos grupos de um produto (sabores, borda…). */
function useEsc(aoFechar: () => void) {
  useEffect(() => {
    const f = (ev: KeyboardEvent) => ev.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [aoFechar]);
}

/** Combo: em cada passo o cliente escolhe o produto e monta (sabores, borda…). */
function MontadorCombo({ combo, extras, aoAdicionar, aoFechar }: { combo: ProdutoPublico; extras?: VitrinePublica['opcoes']; aoAdicionar: (passos: EscolhaPasso[], obs: string) => void; aoFechar: () => void }) {
  // uma vaga por unidade de cada passo
  const vagas = useMemo(() => (combo.passos ?? []).flatMap((p) => Array.from({ length: p.quantidade }, (_, i) => ({ passo: p, n: i + 1 }))), [combo]);
  const [escolhidos, setEscolhidos] = useState<{ produtoId: string | null; escolhas: Escolhas }[]>(() => vagas.map((v) => ({ produtoId: v.passo.produtos.length === 1 ? v.passo.produtos[0]!.id : null, escolhas: {} })));
  const [obs, setObs] = useState('');
  useEsc(aoFechar);
  const passos: EscolhaPasso[] = vagas.flatMap((v, i) => (escolhidos[i]?.produtoId ? [{ passoId: v.passo.id, produtoId: escolhidos[i]!.produtoId!, escolhas: escolhidos[i]!.escolhas }] : []));
  const calc = (() => {
    try {
      return { r: calcularCombo(produtoCore(combo), passosPublicosCore(combo), passos, MARCA_CORE, 'delivery') };
    } catch (e) {
      return { aviso: e instanceof ErroEscolha ? e.message : 'Escolha incompleta.' };
    }
  })();
  const separado = precoSeparado(passosPublicosCore(combo), MARCA_CORE, 'delivery');
  const mudar = (i: number, x: Partial<{ produtoId: string | null; escolhas: Escolhas }>) => setEscolhidos((es) => es.map((e, j) => (j === i ? { ...e, ...x } : e)));

  return (
    <div className="pub-folha-fundo" onClick={aoFechar}>
      <div className="pub-folha" role="dialog" aria-modal="true" aria-label={combo.nome} onClick={(e) => e.stopPropagation()}>
        <div className="pub-linha" style={{ justifyContent: 'space-between' }}>
          <h2>{combo.nome}</h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar">✕</button>
        </div>
        {combo.imagem_url && <img src={combo.imagem_url} alt="" className="pub-foto" />}
        {combo.descricao && <p className="dica">{combo.descricao}</p>}
        {separado > combo.preco && <p className="pub-economia">Você economiza {formatarReais(separado - combo.preco)} em relação a pedir separado.</p>}
        {vagas.map((v, i) => {
          const atual = escolhidos[i];
          const filho = v.passo.produtos.find((x) => x.id === atual?.produtoId) ?? null;
          return (
            <section key={`${v.passo.id}-${v.n}`} className="pub-passo grade" style={{ gap: '0.45rem' }}>
              <strong>
                {i + 1}. {v.passo.titulo}
                {v.passo.quantidade > 1 ? ` (${v.n} de ${v.passo.quantidade})` : ''}
              </strong>
              {v.passo.produtos.length > 1 && (
                <div className="pub-linha" style={{ gap: '0.4rem' }}>
                  {v.passo.produtos.map((x) => (
                    <button key={x.id} type="button" className={`pub-opcao ${atual?.produtoId === x.id ? 'on' : ''}`} aria-pressed={atual?.produtoId === x.id} onClick={() => mudar(i, { produtoId: x.id, escolhas: {} })}>
                      {x.nome}
                    </button>
                  ))}
                </div>
              )}
              {v.passo.produtos.length === 0 && <span className="dica">Nenhum produto disponível agora.</span>}
              {filho && filho.grupos.length > 0 && (
                <GruposMontagem produto={filho} extras={extras} escolhas={atual!.escolhas} setEscolhas={(f) => setEscolhidos((es) => es.map((e, j) => (j === i ? { ...e, escolhas: f(e.escolhas) } : e)))} />
              )}
            </section>
          );
        })}
        <label>
          Alguma observação?
          <input type="text" maxLength={300} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: sem cebola" />
        </label>
        <button type="button" className="botao-primario pub-cta" disabled={!calc.r} onClick={() => calc.r && aoAdicionar(passos, obs)}>
          {calc.r ? `Adicionar combo · ${formatarReais(calc.r.unitario)}` : calc.aviso}
        </button>
      </div>
    </div>
  );
}

function Checkout({
  cardapio,
  prevenda,
  faixasKm,
  agendamento,
  itens,
  subtotal,
  sugestoes,
  aoSugerir,
  alterar,
  voltar,
  editar,
  concluido,
}: {
  cardapio: CardapioPublico;
  prevenda: Prevenda | null;
  faixasKm: FaixaKm[];
  agendamento: AgendamentoPublico;
  itens: ItemCalculado[];
  subtotal: number;
  sugestoes: ProdutoPublico[];
  aoSugerir: (p: ProdutoPublico) => void;
  alterar: (chave: number, delta: number) => void;
  voltar: () => void;
  editar: (i: ItemCalculado) => void;
  concluido: (codigo: string, numero: number, total: number) => void;
}) {
  const { marca } = cardapio;
  const tiposAceitos = (['entrega', 'retirada'] as const).filter((t) => (t === 'entrega' ? marca.aceita_entrega && (marca.areas.length > 0 || faixasKm.length > 0) : marca.aceita_retirada));
  const [tipo, setTipo] = useState<'entrega' | 'retirada'>(tiposAceitos[0] ?? 'retirada');
  const [cliente, setCliente] = useState({ nome: '', telefone: '' });
  const [endereco, setEndereco] = useState({ logradouro: '', numero: '', complemento: '', bairro: '', referencia: '' });
  const [pagamento, setPagamento] = useState<FormaPagamento>(marca.formas_pagamento[0] ?? 'pix');
  const [trocoTxt, setTrocoTxt] = useState('');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [cupomTxt, setCupomTxt] = useState('');
  const [cupom, setCupom] = useState<{ codigo: string; desconto: number; descricao: string } | null>(null);
  const [cupomErro, setCupomErro] = useState<string | null>(null);
  const [conferindo, iniciarCupom] = useTransition();
  const [usoFid, setUsoFid] = useState<UsoFidelidade>({ cashback: 0, recompensa: null });
  const podeAgendar = agendamento.horarios.length > 0;
  // fechada agora: só agendando
  const [agendar, setAgendar] = useState(!!prevenda || (!marca.aberta && podeAgendar));
  // horários agrupados por dia no fuso da loja
  const dias = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const h of agendamento.horarios) {
      const d = dataNoFuso(new Date(h), marca.fuso);
      (m.get(d) ?? m.set(d, []).get(d)!).push(h);
    }
    return [...m.entries()];
  }, [agendamento.horarios, marca.fuso]);
  const [dia, setDia] = useState(dias[0]?.[0] ?? '');
  const [horario, setHorario] = useState(prevenda?.entrega ?? dias[0]?.[1][0] ?? '');
  const horariosDoDia = dias.find(([d]) => d === dia)?.[1] ?? [];
  const rotuloDia = (d: string) => rotuloHorario(new Date(dias.find(([x]) => x === d)![1][0]!), marca.fuso).replace(/ \d{2}:\d{2}$/, '');

  // dados do cliente lembrados neste aparelho
  useEffect(() => {
    const salvo = ler<{ cliente?: typeof cliente; endereco?: typeof endereco }>('res_cliente', {});
    if (salvo.cliente) setCliente(salvo.cliente);
    if (salvo.endereco) {
      setEndereco(salvo.endereco);
      if (faixasKm.length && salvo.endereco.bairro && taxaDoBairro(marca.areas, salvo.endereco.bairro) === null) setOutroBairro(true);
    }
  }, []);

  const taxaArea = taxaDoBairro(marca.areas, endereco.bairro);
  // bairro fora da lista: faixa de km pelo mapa (D-048)
  const usaKm = faixasKm.length > 0;
  const [outroBairro, setOutroBairro] = useState(false);
  const [km, setKm] = useState<EntregaKm | null>(null);
  const [calculandoKm, setCalculandoKm] = useState(false);
  useEffect(() => {
    if (!usaKm || tipo !== 'entrega' || taxaArea !== null) return setKm(null);
    if (!endereco.logradouro.trim() || endereco.bairro.trim().length < 2) return setKm(null);
    let vivo = true;
    const t = setTimeout(() => {
      setCalculandoKm(true);
      calcularEntregaKm(marca.slug, endereco)
        .then((r) => vivo && setKm(r))
        .catch(() => vivo && setKm({ ok: false, erro: 'Não foi possível calcular a entrega agora.' }))
        .finally(() => vivo && setCalculandoKm(false));
    }, 900);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usaKm, tipo, taxaArea, endereco.logradouro, endereco.numero, endereco.bairro, marca.slug]);
  const taxaKm = km?.ok ? km.taxa : null;
  const area = taxaArea !== null || taxaKm !== null;
  const taxa = tipo === 'entrega' ? taxaArea ?? taxaKm ?? 0 : 0;
  const trocoPara = trocoTxt.trim() ? lerCentavos(trocoTxt) : null;

  const aplicarCupom = (codigo: string) =>
    iniciarCupom(async () => {
      const r = await conferirCupom(marca.slug, codigo, subtotal, taxa, tipo, normalizarTelefone(cliente.telefone));
      if (!r.ok) {
        setCupom(null);
        return setCupomErro(r.erro);
      }
      setCupomErro(null);
      setCupom({ codigo: r.codigo, desconto: r.desconto, descricao: r.descricao });
    });
  // pedido mudou: confere o cupom de novo (o desconto depende do subtotal e da entrega)
  const chaveCupom = `${subtotal}|${taxa}|${tipo}`;
  const [chaveAnterior, setChaveAnterior] = useState(chaveCupom);
  useEffect(() => {
    if (chaveAnterior === chaveCupom) return;
    setChaveAnterior(chaveCupom);
    if (cupom) aplicarCupom(cupom.codigo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveCupom]);
  const desconto = cupom ? Math.min(cupom.desconto, subtotal) : 0;

  const conta = (() => {
    try {
      const t = totalizar(itens.map((i) => ({ unitario: i.unitario, quantidade: i.quantidade })), tipo, taxa, desconto);
      const tr = Number.isNaN(trocoPara) ? null : troco(t.total, pagamento, trocoPara);
      return { t, troco: tr };
    } catch (e) {
      return { erro: e instanceof ErroPedido ? e.message : null };
    }
  })();

  const faltando: string[] = [];
  if (!prevenda && !marca.aberta && !agendar) faltando.push(podeAgendar ? 'escolher um horário' : 'a loja abrir');
  if (agendar && !horario) faltando.push('o horário do agendamento');
  if (itens.length === 0) faltando.push('itens no pedido');
  if (subtotal < marca.pedido_minimo) faltando.push(`pedido mínimo de ${formatarReais(marca.pedido_minimo)}`);
  if (cliente.nome.trim().length < 2) faltando.push('seu nome');
  if (cliente.telefone.replace(/\D/g, '').length < 10) faltando.push('telefone com DDD');
  if (tipo === 'entrega' && (!endereco.logradouro.trim() || !area)) faltando.push('rua e bairro');
  if (Number.isNaN(trocoPara)) faltando.push('valor do troco válido');

  const enviar = () =>
    iniciar(async () => {
      gravar('res_cliente', { cliente, endereco });
      const r = await enviarPedido(marca.slug, {
        tipo,
        cliente: { ...cliente, telefone: normalizarTelefone(cliente.telefone) },
        endereco: tipo === 'entrega' ? endereco : undefined,
        itens: itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade, observacao: i.observacao, escolhas: i.escolhas, ...(i.passos ? { passos: i.passos } : {}) })),
        pagamento,
        trocoPara: Number.isNaN(trocoPara) ? null : trocoPara,
        observacao,
        agendadoPara: agendar ? horario : null,
        cupom: cupom?.codigo ?? null,
        fidelidade: usoFid,
        fidelidadeProva: provaFidelidade(cliente.telefone),
        destino: taxaArea === null && km?.ok ? { lat: km.lat, lng: km.lng } : null,
      });
      if (!r.ok) return setErro(r.erro);
      lembrarPedidoFidelidade(cliente.telefone, r.codigo);
      concluido(r.codigo, r.numero, conta.t?.total ?? subtotal);
    });

  return (
    <main className="pub-lista grade">
      <button type="button" onClick={voltar} style={{ justifySelf: 'start' }}>← Continuar escolhendo</button>
      <h2>Seu pedido</h2>
      <ul className="lista carrinho">
        {itens.map((i) => (
          <li key={i.chave} className="sc-item">
            {i.produto.imagem_url && <img className="sc-foto" src={i.produto.imagem_url} alt="" />}
            <div className="grade" style={{ gap: '0.2rem', minWidth: 0 }}>
              <div className="pub-linha" style={{ justifyContent: 'space-between' }}>
                <strong>{i.produto.nome}</strong>
                <span>{formatarReais(i.unitario * i.quantidade)}</span>
              </div>
              {i.resumo && <span className="dica">{i.resumo}</span>}
              {i.observacao && <span className="dica">Obs.: {i.observacao}</span>}
              <div className="pub-linha" style={{ justifyContent: 'space-between' }}>
                {!i.produto.combo && i.produto.grupos.length > 0 ? (
                  <button type="button" className="mini" onClick={() => editar(i)}>✏️ Editar</button>
                ) : <span />}
                <span className="passo">
                  <button type="button" aria-label={i.quantidade === 1 ? 'Tirar do pedido' : 'Menos um'} onClick={() => alterar(i.chave, -1)}>{i.quantidade === 1 ? '🗑' : '−'}</button>
                  {i.quantidade}
                  <button type="button" aria-label="Mais um" onClick={() => alterar(i.chave, 1)}>+</button>
                </span>
              </div>
            </div>
          </li>
        ))}
        {itens.length === 0 && <li className="dica">Seu pedido está vazio.</li>}
      </ul>

      {sugestoes.length > 0 && (
        <section className="pub-sugestoes" aria-label="Peça também">
          <strong>Peça também</strong>
          <div className="pub-sugestoes-lista">
            {sugestoes.map((p) => (
              <button key={p.id} type="button" onClick={() => aoSugerir(p)}>
                {p.imagem_url && <img src={p.imagem_url} alt="" loading="lazy" />}
                <span>
                  <b>+ {p.nome}</b>
                  <span className="dica">{formatarReais(p.preco)}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {tiposAceitos.length > 1 && (
        <fieldset className="pub-linha">
          <legend>Como você quer receber?</legend>
          <label className="check"><input type="radio" checked={tipo === 'entrega'} onChange={() => setTipo('entrega')} /> Entrega</label>
          <label className="check"><input type="radio" checked={tipo === 'retirada'} onChange={() => setTipo('retirada')} /> Retirar na loja</label>
        </fieldset>
      )}

      {prevenda && (
        <div className="pv-prevenda" role="note">
          <b>🎟️ Pré-venda</b>
          <span>
            Seu pedido é para <b>{rotuloHorario(new Date(prevenda.entrega), marca.fuso)}</b>
            {prevenda.texto ? ` (${prevenda.texto})` : ''}. O pagamento é feito agora, por Pix.
          </span>
        </div>
      )}
      {!prevenda && (podeAgendar || !marca.aberta) && (
        <fieldset className="grade" style={{ gap: '0.5rem' }}>
          <legend>Para quando?</legend>
          {marca.aberta && (
            <div className="pub-linha">
              <label className="check"><input type="radio" checked={!agendar} onChange={() => setAgendar(false)} /> O quanto antes (~{marca.tempo_preparo_min} min)</label>
              <label className="check"><input type="radio" checked={agendar} onChange={() => setAgendar(true)} /> Agendar</label>
            </div>
          )}
          {!marca.aberta && !podeAgendar && <p className="aviso">A loja está fechada e não aceita pedidos agendados agora.</p>}
          {!marca.aberta && podeAgendar && <p className="dica" style={{ margin: 0 }}>A loja está fechada agora, mas você pode agendar seu pedido.</p>}
          {agendar && (
            <div className="pub-linha">
              <label style={{ flex: '1 1 8rem' }}>
                Dia
                <select
                  value={dia}
                  onChange={(e) => {
                    setDia(e.target.value);
                    setHorario(dias.find(([d]) => d === e.target.value)?.[1][0] ?? '');
                  }}
                >
                  {dias.map(([d]) => <option key={d} value={d}>{rotuloDia(d)}</option>)}
                </select>
              </label>
              <label style={{ flex: '1 1 6rem' }}>
                Horário
                <select value={horario} onChange={(e) => setHorario(e.target.value)}>
                  {horariosDoDia.map((h) => <option key={h} value={h}>{horaNoFuso(new Date(h), marca.fuso)}</option>)}
                </select>
              </label>
            </div>
          )}
        </fieldset>
      )}

      <fieldset className="grade" style={{ gap: '0.5rem' }}>
        <legend>Seus dados</legend>
        <label>
          Seu WhatsApp
          <input type="tel" autoComplete="tel" placeholder="(47) 99999-0000" value={cliente.telefone} onChange={(e) => setCliente({ ...cliente, telefone: e.target.value })} />
          <span className="dica">Para avisarmos o andamento do seu pedido.</span>
        </label>
        <label>Nome<input type="text" autoComplete="name" value={cliente.nome} maxLength={120} onChange={(e) => setCliente({ ...cliente, nome: e.target.value })} /></label>
      </fieldset>

      {tipo === 'entrega' && (
        <fieldset className="grade" style={{ gap: '0.5rem' }}>
          <legend>Endereço de entrega</legend>
          <label>
            Bairro
            <select
              value={outroBairro ? '__outro' : endereco.bairro}
              onChange={(e) => {
                const outro = e.target.value === '__outro';
                setOutroBairro(outro);
                setEndereco({ ...endereco, bairro: outro ? '' : e.target.value });
              }}
            >
              <option value="">Escolha o bairro</option>
              {marca.areas.map((a) => (
                <option key={a.bairro} value={a.bairro}>{a.bairro} · entrega {a.taxa ? formatarReais(a.taxa) : 'grátis'}</option>
              ))}
              {usaKm && <option value="__outro">Outro bairro (calcular pela distância)</option>}
            </select>
            {!usaKm && <span className="dica">Seu bairro não está na lista? Ainda não entregamos aí, mas você pode retirar na loja.</span>}
          </label>
          {outroBairro && (
            <label>
              Nome do seu bairro
              <input type="text" value={endereco.bairro} maxLength={80} onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })} />
            </label>
          )}
          <div className="pub-linha">
            <label style={{ flex: '3 1 12rem' }}>Rua<input type="text" autoComplete="address-line1" value={endereco.logradouro} onChange={(e) => setEndereco({ ...endereco, logradouro: e.target.value })} /></label>
            <label style={{ flex: '1 1 5rem' }}>Número<input type="text" value={endereco.numero} onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })} /></label>
          </div>
          <label>Complemento<input type="text" autoComplete="address-line2" value={endereco.complemento} onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })} /></label>
          {outroBairro && (
            <p className={km && !km.ok ? 'erro' : 'dica'} role="status" style={{ margin: 0 }}>
              {calculandoKm
                ? 'Calculando a entrega…'
                : !km
                  ? 'Preencha rua, número e bairro para calcular a entrega.'
                  : km.ok
                    ? `Entrega ${km.taxa ? formatarReais(km.taxa) : 'grátis'} · ${km.km.toFixed(1).replace('.', ',')} km${km.minutosExtra ? ` · +${km.minutosExtra} min no prazo` : ''}${km.aproximado ? ' (pelo centro do bairro)' : ''}`
                    : km.erro}
            </p>
          )}
          <label>Ponto de referência<input type="text" value={endereco.referencia} onChange={(e) => setEndereco({ ...endereco, referencia: e.target.value })} /></label>
        </fieldset>
      )}

      <fieldset className="grade" style={{ gap: '0.5rem' }}>
        <legend>Pagamento na {tipo === 'entrega' ? 'entrega' : 'retirada'}</legend>
        <div className="pub-linha">
          {marca.formas_pagamento.map((f) => (
            <label key={f} className="check"><input type="radio" checked={pagamento === f} onChange={() => setPagamento(f)} /> {PAGAMENTO_ROTULO[f]}</label>
          ))}
        </div>
        {pagamento === 'dinheiro' && (
          <label>Troco para quanto? (deixe vazio se não precisa)<input type="text" inputMode="decimal" placeholder="100,00" value={trocoTxt} onChange={(e) => setTrocoTxt(e.target.value)} /></label>
        )}
      </fieldset>

      <label>Observação do pedido<textarea rows={2} maxLength={500} value={observacao} onChange={(e) => setObservacao(e.target.value)} /></label>

      <div className="grade" style={{ gap: '0.3rem' }}>
        <div className="pub-cupom">
          <label style={{ flex: 1 }}>
            Cupom de desconto
            <input type="text" value={cupom ? cupom.codigo : cupomTxt} disabled={!!cupom} maxLength={30} placeholder="Tem um cupom?" onChange={(e) => setCupomTxt(e.target.value.toUpperCase())} />
          </label>
          {cupom ? (
            <button type="button" onClick={() => { setCupom(null); setCupomTxt(''); }}>Tirar</button>
          ) : (
            <button type="button" disabled={conferindo || cupomTxt.trim().length < 3} onClick={() => aplicarCupom(cupomTxt)}>{conferindo ? 'Conferindo…' : 'Aplicar'}</button>
          )}
        </div>
        {cupom && <span className="dica">✓ {cupom.descricao}</span>}
        {cupomErro && <span className="erro">{cupomErro}</span>}
      </div>

      <FidelidadeCliente slug={marca.slug} telefone={cliente.telefone} aPagar={conta.t?.total ?? 0} uso={usoFid} aoMudar={setUsoFid} />
      {conta.t && (
        <div className="grade" style={{ gap: '0.2rem' }}>
          <div className="pub-linha" style={{ justifyContent: 'space-between' }}><span className="dica">Subtotal</span><span>{formatarReais(conta.t.subtotal)}</span></div>
          {tipo === 'entrega' && <div className="pub-linha" style={{ justifyContent: 'space-between' }}><span className="dica">Entrega</span><span>{area ? (taxa ? formatarReais(taxa) : 'Grátis') : '—'}</span></div>}
          {conta.t.desconto > 0 && <div className="pub-linha" style={{ justifyContent: 'space-between' }}><span className="dica">Cupom {cupom?.codigo}</span><span>−{formatarReais(conta.t.desconto)}</span></div>}
          {agendar && horario && <div className="pub-linha" style={{ justifyContent: 'space-between' }}><span className="dica">Agendado</span><span>{rotuloHorario(new Date(horario), marca.fuso)}</span></div>}
          {usoFid.cashback > 0 && <div className="pub-linha" style={{ justifyContent: 'space-between' }}><span className="dica">Cashback</span><span>−{formatarReais(Math.min(usoFid.cashback, conta.t.total))}</span></div>}
          {usoFid.recompensa && <div className="pub-linha" style={{ justifyContent: 'space-between' }}><span className="dica">Troca de pontos</span><span className="dica">desconto entra ao enviar</span></div>}
          <div className="pub-linha" style={{ justifyContent: 'space-between' }}><strong>Total</strong><span className="total">{formatarReais(Math.max(0, conta.t.total - Math.min(usoFid.cashback, conta.t.total)))}</span></div>
          {conta.troco != null && <div className="pub-linha" style={{ justifyContent: 'space-between' }}><span className="dica">Seu troco</span><span>{formatarReais(conta.troco)}</span></div>}
        </div>
      )}
      {conta.erro && <p className="erro">{conta.erro}</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}
      {faltando.length > 0 && <p className="dica">Para enviar falta: {faltando.join(', ')}.</p>}
      <button type="button" className="botao-primario pub-cta" disabled={pendente || faltando.length > 0 || !!conta.erro} onClick={enviar}>
        {pendente ? 'Enviando…' : agendar ? 'Agendar pedido' : 'Enviar pedido'}
      </button>
    </main>
  );
}

const RESTRICAO: Record<string, string> = { gelado: '❄ Bebida gelada', vegetariano: '🌱 Vegetariano', vegano: '🌿 Vegano', sem_gluten: 'Sem glúten', zero_lactose: 'Zero lactose', sem_acucar: 'Sem açúcar', organico: 'Orgânico', natural: 'Natural' };

function Extras({ extra }: { extra?: { serve: number | null; restricoes: string[] } }) {
  if (!extra || (!extra.serve && !extra.restricoes.length)) return null;
  return (
    <span className="pv-extras">
      {extra.serve ? <span>Serve {extra.serve} {extra.serve === 1 ? 'pessoa' : 'pessoas'}</span> : null}
      {extra.restricoes.map((r) => <span key={r} className="pv-selo">{RESTRICAO[r] ?? r}</span>)}
    </span>
  );
}

/** "Mais informações" (D-045): sobre, horário, pagamento e entrega. */
function MaisInformacoes({ aba, setAba, cardapio, vitrine }: { aba: string; setAba: (a: string | null) => void; cardapio: CardapioPublico; vitrine: VitrinePublica | null }) {
  const { marca } = cardapio;
  useEsc(() => setAba(null));
  const hoje = diaNoFuso(marca.fuso);
  const presencial = marca.formas_pagamento.filter((f) => f !== 'online');
  const ABAS = [['sobre', 'Sobre'], ['horario', 'Horário'], ['pagamento', 'Pagamento'], ['entrega', 'Entrega']] as const;
  return (
    <div className="pub-folha-fundo" onClick={(e) => e.target === e.currentTarget && setAba(null)}>
      <div className="pub-folha pv-info" role="dialog" aria-label="Mais informações">
        <div className="pub-linha" style={{ justifyContent: 'space-between' }}>
          <h2>{marca.nome}</h2>
          <button type="button" className="mini" onClick={() => setAba(null)} aria-label="Fechar">✕</button>
        </div>
        <div className="abas" role="tablist">
          {ABAS.map(([v, r]) => <button key={v} type="button" role="tab" aria-selected={aba === v} onClick={() => setAba(v)}>{r}</button>)}
        </div>
        {aba === 'sobre' && (
          <div className="grade" style={{ gap: '0.6rem' }}>
            {vitrine?.descricao && <p style={{ margin: 0 }}>{vitrine.descricao}</p>}
            <div className="pub-linha">
              {vitrine?.whatsapp && <a className="botao" href={`https://wa.me/55${vitrine.whatsapp.replace(/^55(?=\d{10,11}$)/, '')}`} target="_blank" rel="noopener noreferrer">💬 WhatsApp</a>}
              {vitrine?.instagram && <a className="botao" href={`https://instagram.com/${vitrine.instagram}`} target="_blank" rel="noopener noreferrer">📷 @{vitrine.instagram}</a>}
            </div>
            {vitrine?.loja.endereco && <div><strong>Endereço</strong><div className="dica">{vitrine.loja.endereco}{vitrine.loja.cidade ? ` · ${vitrine.loja.cidade}` : ''}</div></div>}
            <div className="pv-tempos">
              {marca.aceita_entrega && <div><strong>🛵 Entrega</strong><span className="dica">{vitrine ? `${vitrine.loja.prazo_entrega_min - 5}–${vitrine.loja.prazo_entrega_min + 5} min` : '—'}</span></div>}
              {marca.aceita_retirada && <div><strong>🏪 Retirada</strong><span className="dica">~{marca.tempo_preparo_min} min</span></div>}
            </div>
          </div>
        )}
        {aba === 'horario' && (
          <ul className="pub-horarios pv-horarios">
            {DIAS.map((d, i) => {
              const hs = marca.horarios.filter((h) => h.dia === i);
              return (
                <li key={d} className={i === hoje ? 'hoje' : undefined}>
                  <span>{d}</span>
                  <span>{hs.length ? hs.map((h) => `${h.abre} às ${h.fecha}`).join(' · ') : 'Fechado'}</span>
                </li>
              );
            })}
          </ul>
        )}
        {aba === 'pagamento' && (
          <div className="grade" style={{ gap: '0.5rem' }}>
            {presencial.includes('pix') && <><strong>Online</strong><div className="pub-linha"><span className="pv-forma">💠 Pix</span></div></>}
            <strong>Na entrega ou na retirada</strong>
            <div className="pub-linha">{presencial.filter((f) => f !== 'pix').map((f) => <span key={f} className="pv-forma">{PAGAMENTO_ROTULO[f]}</span>)}</div>
          </div>
        )}
        {aba === 'entrega' && (
          <div className="grade" style={{ gap: '0.5rem' }}>
            {marca.aceita_retirada && vitrine?.loja.endereco && <div><strong>Endereço de retirada</strong><div className="dica">{vitrine.loja.endereco}{vitrine.loja.cidade ? ` · ${vitrine.loja.cidade}` : ''}</div></div>}
            {marca.aceita_entrega && (
              <>
                <strong>Bairros onde entregamos</strong>
                {marca.areas.length === 0 ? (
                  <span className="dica">Consulte a loja.</span>
                ) : (
                  <ul className="pv-bairros">
                    {marca.areas.map((a) => <li key={a.bairro}><span>{a.bairro}</span><span>{a.taxa ? formatarReais(a.taxa) : 'Grátis'}</span></li>)}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
