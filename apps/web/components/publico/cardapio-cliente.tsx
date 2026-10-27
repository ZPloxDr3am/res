'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
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
} from '@/lib/publico';
import { conferirCupom, enviarPedido } from '@/app/c/[slug]/actions';

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

export function CardapioCliente({ cardapio, agendamento }: { cardapio: CardapioPublico; agendamento: AgendamentoPublico }) {
  const { marca, setores } = cardapio;
  const router = useRouter();
  const chaveCarrinho = `res_carrinho_${marca.slug}`;
  const produtos = useMemo(() => new Map(setores.flatMap((s) => s.produtos.map((p) => [p.id, p] as const))), [setores]);

  const [itens, setItens] = useState<Item[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [abrindo, setAbrindo] = useState<ProdutoPublico | null>(null);
  const [etapa, setEtapa] = useState<'cardapio' | 'carrinho'>('cardapio');
  const [setorVisivel, setSetorVisivel] = useState<string | null>(setores[0]?.id ?? null);

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

  const adicionar = (p: ProdutoPublico, escolhas: Escolhas, observacao: string, passos?: EscolhaPasso[]) => {
    setItens((x) => [...x, { chave: Date.now(), produtoId: p.id, quantidade: 1, escolhas, observacao, ...(passos ? { passos } : {}) }]);
    setAbrindo(null);
  };
  const abrir = (p: ProdutoPublico) => (p.combo || p.grupos.length ? setAbrindo(p) : adicionar(p, {}, ''));
  // "Peça também": produtos das categorias de up-sell que ainda não estão no pedido
  const sugestoes = useMemo(() => {
    const no = new Set(itens.map((i) => i.produtoId));
    return setores.filter((s) => s.upsell).flatMap((s) => s.produtos).filter((p) => !p.combo && p.etiqueta !== 'esgotado' && !no.has(p.id)).slice(0, 6);
  }, [setores, itens]);

  const hoje = diaNoFuso(marca.fuso);
  const horarioHoje = marca.horarios.filter((h) => h.dia === hoje).map((h) => `${h.abre}–${h.fecha}`).join(', ');
  const podeAgendar = agendamento.horarios.length > 0;

  return (
    <div className="pub">
      <header className="pub-topo">
        <h1>{marca.nome}</h1>
        <div className="pub-linha">
          <span className={`pub-status ${marca.aberta ? 'aberto' : 'fechado'}`}>{marca.aberta ? 'Aberto agora' : 'Fechado'}</span>
          {!marca.aberta && podeAgendar && (
            <span className="dica">Agende para {rotuloHorario(new Date(agendamento.horarios[0]!), marca.fuso)} ou depois</span>
          )}
          {horarioHoje && <span className="dica">Hoje: {horarioHoje}</span>}
          <span className="dica">Preparo ~{marca.tempo_preparo_min} min</span>
          {marca.pedido_minimo > 0 && <span className="dica">Pedido mínimo {formatarReais(marca.pedido_minimo)}</span>}
        </div>
        {marca.mensagem && <p className="pub-mensagem">{marca.mensagem}</p>}
        {!marca.aberta && (
          <details className="dica">
            <summary>Ver horários</summary>
            <ul className="pub-horarios">
              {DIAS.map((d, i) => {
                const hs = marca.horarios.filter((h) => h.dia === i);
                return (
                  <li key={d} className={i === hoje ? 'hoje' : undefined}>
                    <span>{d}</span>
                    <span>{hs.length ? hs.map((h) => `${h.abre}–${h.fecha}`).join(', ') : 'Fechado'}</span>
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </header>

      {etapa === 'cardapio' && (
        <>
          <nav className="pub-setores" aria-label="Categorias">
            {setores.map((s) => (
              <a
                key={s.id}
                href={`#s-${s.id}`}
                aria-current={setorVisivel === s.id ? 'true' : undefined}
                onClick={() => setSetorVisivel(s.id)}
              >
                {s.nome}
              </a>
            ))}
          </nav>
          <main className="pub-lista">
            {setores.length === 0 && <p className="dica">O cardápio ainda está sendo montado.</p>}
            {setores.map((s) => (
              <section key={s.id} id={`s-${s.id}`} aria-label={s.nome}>
                <h2>{s.nome}</h2>
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
                        <span>
                          {!p.combo && p.grupos.length > 0 && p.preco === 0 ? 'Monte o seu' : (!p.combo && p.grupos.length > 0 ? 'A partir de ' : '') + formatarReais(p.preco)}
                          {p.preco_original != null && <s className="dica"> {formatarReais(p.preco_original)}</s>}
                        </span>
                      </span>
                      {p.imagem_url && <img src={p.imagem_url} alt="" loading="lazy" />}
                    </button>
                  );
                })}
              </section>
            ))}
          </main>
        </>
      )}

      {etapa === 'carrinho' && (
        <Checkout
          cardapio={cardapio}
          agendamento={agendamento}
          itens={calculados}
          subtotal={subtotal}
          sugestoes={sugestoes}
          aoSugerir={abrir}
          alterar={(chave, delta) =>
            setItens((x) => x.flatMap((i) => (i.chave !== chave ? [i] : i.quantidade + delta <= 0 ? [] : [{ ...i, quantidade: Math.min(99, i.quantidade + delta) }])))
          }
          voltar={() => setEtapa('cardapio')}
          concluido={(codigo) => {
            setItens([]);
            gravar(chaveCarrinho, []);
            router.push(`/c/${marca.slug}/pedido/${codigo}`);
          }}
        />
      )}

      {etapa === 'cardapio' && quantidade > 0 && (
        <div className="pub-barra">
          <button type="button" className="botao-primario" onClick={() => setEtapa('carrinho')}>
            Ver pedido · {quantidade} {quantidade === 1 ? 'item' : 'itens'} · {formatarReais(subtotal)}
          </button>
        </div>
      )}

      {abrindo && !abrindo.combo && <Montador produto={abrindo} aoAdicionar={adicionar} aoFechar={() => setAbrindo(null)} />}
      {abrindo?.combo && <MontadorCombo combo={abrindo} aoAdicionar={(passos, obs) => adicionar(abrindo, {}, obs, passos)} aoFechar={() => setAbrindo(null)} />}
    </div>
  );
}

/** Escolha das opções dos grupos de um produto (sabores, borda…). */
function EscolhaGrupos({ produto, escolhas, setEscolhas }: { produto: ProdutoPublico; escolhas: Escolhas; setEscolhas: (f: (e: Escolhas) => Escolhas) => void }) {
  const qtd = (g: string, o: string) => escolhas[g]?.[o] ?? 0;
  const tot = (g: string) => Object.values(escolhas[g] ?? {}).reduce((s, q) => s + q, 0);
  const alterar = (g: GrupoPublico, o: string, delta: number) =>
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
  return (
    <>
      {produto.grupos.map((g) => (
        <fieldset key={g.id} className="grade" style={{ gap: '0.35rem' }}>
          <legend>
            <strong>{g.nome}</strong>{' '}
            <span className="dica">
              {g.obrigatorio ? 'Obrigatório' : 'Opcional'} · {g.min === g.max ? `escolha ${g.max}` : `até ${g.max}`}
              {g.pizza && g.max > 1 ? ' (sabores dividem a pizza)' : ''} · {tot(g.id)}/{g.max}
            </span>
          </legend>
          {g.opcoes.map((o) => (
            <div key={o.id} className="pub-linha" style={{ justifyContent: 'space-between' }}>
              <span>
                {o.nome} {o.preco > 0 && <span className="dica">{formatarReais(o.preco)}</span>}
              </span>
              <span className="passo">
                <button type="button" aria-label={`Menos ${o.nome}`} disabled={qtd(g.id, o.id) === 0} onClick={() => alterar(g, o.id, -1)}>−</button>
                <span aria-live="polite">{qtd(g.id, o.id)}</span>
                <button type="button" aria-label={`Mais ${o.nome}`} onClick={() => alterar(g, o.id, 1)}>+</button>
              </span>
            </div>
          ))}
        </fieldset>
      ))}
    </>
  );
}

function useEsc(aoFechar: () => void) {
  useEffect(() => {
    const f = (ev: KeyboardEvent) => ev.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [aoFechar]);
}

function Montador({
  produto,
  aoAdicionar,
  aoFechar,
}: {
  produto: ProdutoPublico;
  aoAdicionar: (p: ProdutoPublico, e: Escolhas, obs: string) => void;
  aoFechar: () => void;
}) {
  const [escolhas, setEscolhas] = useState<Escolhas>({});
  const [obs, setObs] = useState('');
  useEsc(aoFechar);

  const calc = (() => {
    try {
      return { r: calcularItem(produtoCore(produto), produto.grupos.map(grupoCore), escolhas, MARCA_CORE, 'delivery') };
    } catch (e) {
      return { aviso: e instanceof ErroEscolha ? e.message : 'Escolha incompleta.' };
    }
  })();

  return (
    <div className="pub-folha-fundo" onClick={aoFechar}>
      <div className="pub-folha" role="dialog" aria-modal="true" aria-label={produto.nome} onClick={(e) => e.stopPropagation()}>
        <div className="pub-linha" style={{ justifyContent: 'space-between' }}>
          <h2>{produto.nome}</h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar">✕</button>
        </div>
        {produto.imagem_url && <img src={produto.imagem_url} alt="" className="pub-foto" />}
        {produto.descricao && <p className="dica">{produto.descricao}</p>}
        <EscolhaGrupos produto={produto} escolhas={escolhas} setEscolhas={setEscolhas} />
        <label>
          Alguma observação?
          <input type="text" maxLength={300} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: sem cebola" />
        </label>
        <button type="button" className="botao-primario pub-cta" disabled={!calc.r} onClick={() => calc.r && aoAdicionar(produto, escolhas, obs)}>
          {calc.r ? `Adicionar · ${formatarReais(calc.r.unitario)}` : calc.aviso}
        </button>
      </div>
    </div>
  );
}

/** Combo: em cada passo o cliente escolhe o produto e monta (sabores, borda…). */
function MontadorCombo({ combo, aoAdicionar, aoFechar }: { combo: ProdutoPublico; aoAdicionar: (passos: EscolhaPasso[], obs: string) => void; aoFechar: () => void }) {
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
                <EscolhaGrupos produto={filho} escolhas={atual!.escolhas} setEscolhas={(f) => setEscolhidos((es) => es.map((e, j) => (j === i ? { ...e, escolhas: f(e.escolhas) } : e)))} />
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
  agendamento,
  itens,
  subtotal,
  sugestoes,
  aoSugerir,
  alterar,
  voltar,
  concluido,
}: {
  cardapio: CardapioPublico;
  agendamento: AgendamentoPublico;
  itens: ItemCalculado[];
  subtotal: number;
  sugestoes: ProdutoPublico[];
  aoSugerir: (p: ProdutoPublico) => void;
  alterar: (chave: number, delta: number) => void;
  voltar: () => void;
  concluido: (codigo: string) => void;
}) {
  const { marca } = cardapio;
  const tiposAceitos = (['entrega', 'retirada'] as const).filter((t) => (t === 'entrega' ? marca.aceita_entrega && marca.areas.length > 0 : marca.aceita_retirada));
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
  const [agendar, setAgendar] = useState(!marca.aberta && podeAgendar);
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
  const [horario, setHorario] = useState(dias[0]?.[1][0] ?? '');
  const horariosDoDia = dias.find(([d]) => d === dia)?.[1] ?? [];
  const rotuloDia = (d: string) => rotuloHorario(new Date(dias.find(([x]) => x === d)![1][0]!), marca.fuso).replace(/ \d{2}:\d{2}$/, '');

  // dados do cliente lembrados neste aparelho
  useEffect(() => {
    const salvo = ler<{ cliente?: typeof cliente; endereco?: typeof endereco }>('res_cliente', {});
    if (salvo.cliente) setCliente(salvo.cliente);
    if (salvo.endereco) setEndereco(salvo.endereco);
  }, []);

  const taxaArea = taxaDoBairro(marca.areas, endereco.bairro);
  const area = taxaArea !== null;
  const taxa = tipo === 'entrega' ? taxaArea ?? 0 : 0;
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
  if (!marca.aberta && !agendar) faltando.push(podeAgendar ? 'escolher um horário' : 'a loja abrir');
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
      });
      if (!r.ok) return setErro(r.erro);
      lembrarPedidoFidelidade(cliente.telefone, r.codigo);
      concluido(r.codigo);
    });

  return (
    <main className="pub-lista grade">
      <button type="button" onClick={voltar} style={{ justifySelf: 'start' }}>← Continuar escolhendo</button>
      <h2>Seu pedido</h2>
      <ul className="lista carrinho">
        {itens.map((i) => (
          <li key={i.chave}>
            <div className="pub-linha" style={{ justifyContent: 'space-between' }}>
              <strong>{i.produto.nome}</strong>
              <span>{formatarReais(i.unitario * i.quantidade)}</span>
            </div>
            {i.resumo && <span className="dica">{i.resumo}</span>}
            {i.observacao && <span className="dica">Obs.: {i.observacao}</span>}
            <span className="passo">
              <button type="button" aria-label="Menos um" onClick={() => alterar(i.chave, -1)}>−</button>
              {i.quantidade}
              <button type="button" aria-label="Mais um" onClick={() => alterar(i.chave, 1)}>+</button>
            </span>
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

      {(podeAgendar || !marca.aberta) && (
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
        <label>Nome<input type="text" autoComplete="name" value={cliente.nome} maxLength={120} onChange={(e) => setCliente({ ...cliente, nome: e.target.value })} /></label>
        <label>Telefone (WhatsApp)<input type="tel" autoComplete="tel" placeholder="(48) 99999-0000" value={cliente.telefone} onChange={(e) => setCliente({ ...cliente, telefone: e.target.value })} /></label>
      </fieldset>

      {tipo === 'entrega' && (
        <fieldset className="grade" style={{ gap: '0.5rem' }}>
          <legend>Endereço de entrega</legend>
          <label>
            Bairro
            <select value={endereco.bairro} onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })}>
              <option value="">Escolha o bairro</option>
              {marca.areas.map((a) => (
                <option key={a.bairro} value={a.bairro}>{a.bairro} · entrega {a.taxa ? formatarReais(a.taxa) : 'grátis'}</option>
              ))}
            </select>
            <span className="dica">Seu bairro não está na lista? Ainda não entregamos aí, mas você pode retirar na loja.</span>
          </label>
          <div className="pub-linha">
            <label style={{ flex: '3 1 12rem' }}>Rua<input type="text" autoComplete="address-line1" value={endereco.logradouro} onChange={(e) => setEndereco({ ...endereco, logradouro: e.target.value })} /></label>
            <label style={{ flex: '1 1 5rem' }}>Número<input type="text" value={endereco.numero} onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })} /></label>
          </div>
          <label>Complemento<input type="text" autoComplete="address-line2" value={endereco.complemento} onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })} /></label>
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
