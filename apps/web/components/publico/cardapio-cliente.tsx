'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  calcularItem,
  ErroEscolha,
  ErroPedido,
  formatarReais,
  PAGAMENTO_ROTULO,
  totalizar,
  troco,
  type Escolhas,
  type FormaPagamento,
} from '@res/core';
import {
  DIAS,
  diaNoFuso,
  grupoCore,
  MARCA_CORE,
  produtoCore,
  type CardapioPublico,
  type GrupoPublico,
  type ProdutoPublico,
} from '@/lib/publico';
import { enviarPedido } from '@/app/c/[slug]/actions';

type Item = { chave: number; produtoId: string; quantidade: number; escolhas: Escolhas; observacao: string };
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

export function CardapioCliente({ cardapio }: { cardapio: CardapioPublico }) {
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

  const adicionar = (p: ProdutoPublico, escolhas: Escolhas, observacao: string) => {
    setItens((x) => [...x, { chave: Date.now(), produtoId: p.id, quantidade: 1, escolhas, observacao }]);
    setAbrindo(null);
  };

  const hoje = diaNoFuso(marca.fuso);
  const horarioHoje = marca.horarios.filter((h) => h.dia === hoje).map((h) => `${h.abre}–${h.fecha}`).join(', ');

  return (
    <div className="pub">
      <header className="pub-topo">
        <h1>{marca.nome}</h1>
        <div className="pub-linha">
          <span className={`pub-status ${marca.aberta ? 'aberto' : 'fechado'}`}>{marca.aberta ? 'Aberto agora' : 'Fechado'}</span>
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
                      onClick={() => (p.grupos.length ? setAbrindo(p) : adicionar(p, {}, ''))}
                    >
                      <span className="pub-produto-texto">
                        <strong>{p.nome}</strong>
                        {p.etiqueta && <span className="selo">{ETIQUETA[p.etiqueta]}</span>}
                        {p.descricao && <span className="dica">{p.descricao}</span>}
                        <span>
                          {p.grupos.length > 0 && p.preco === 0 ? 'Monte o seu' : (p.grupos.length > 0 ? 'A partir de ' : '') + formatarReais(p.preco)}
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
          itens={calculados}
          subtotal={subtotal}
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

      {abrindo && <Montador produto={abrindo} aoAdicionar={adicionar} aoFechar={() => setAbrindo(null)} />}
    </div>
  );
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

  const calc = (() => {
    try {
      return { r: calcularItem(produtoCore(produto), produto.grupos.map(grupoCore), escolhas, MARCA_CORE, 'delivery') };
    } catch (e) {
      return { aviso: e instanceof ErroEscolha ? e.message : 'Escolha incompleta.' };
    }
  })();

  // Esc fecha
  useEffect(() => {
    const f = (ev: KeyboardEvent) => ev.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [aoFechar]);

  return (
    <div className="pub-folha-fundo" onClick={aoFechar}>
      <div className="pub-folha" role="dialog" aria-modal="true" aria-label={produto.nome} onClick={(e) => e.stopPropagation()}>
        <div className="pub-linha" style={{ justifyContent: 'space-between' }}>
          <h2>{produto.nome}</h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar">✕</button>
        </div>
        {produto.imagem_url && <img src={produto.imagem_url} alt="" className="pub-foto" />}
        {produto.descricao && <p className="dica">{produto.descricao}</p>}
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

function Checkout({
  cardapio,
  itens,
  subtotal,
  alterar,
  voltar,
  concluido,
}: {
  cardapio: CardapioPublico;
  itens: ItemCalculado[];
  subtotal: number;
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

  // dados do cliente lembrados neste aparelho
  useEffect(() => {
    const salvo = ler<{ cliente?: typeof cliente; endereco?: typeof endereco }>('res_cliente', {});
    if (salvo.cliente) setCliente(salvo.cliente);
    if (salvo.endereco) setEndereco(salvo.endereco);
  }, []);

  const area = marca.areas.find((a) => a.bairro === endereco.bairro);
  const taxa = tipo === 'entrega' ? area?.taxa ?? 0 : 0;
  const trocoPara = trocoTxt.trim() ? lerCentavos(trocoTxt) : null;

  const conta = (() => {
    try {
      const t = totalizar(itens.map((i) => ({ unitario: i.unitario, quantidade: i.quantidade })), tipo, taxa, 0);
      const tr = Number.isNaN(trocoPara) ? null : troco(t.total, pagamento, trocoPara);
      return { t, troco: tr };
    } catch (e) {
      return { erro: e instanceof ErroPedido ? e.message : null };
    }
  })();

  const faltando: string[] = [];
  if (!marca.aberta) faltando.push('a loja abrir');
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
        cliente,
        endereco: tipo === 'entrega' ? endereco : undefined,
        itens: itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade, observacao: i.observacao, escolhas: i.escolhas })),
        pagamento,
        trocoPara: Number.isNaN(trocoPara) ? null : trocoPara,
        observacao,
      });
      if (!r.ok) return setErro(r.erro);
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

      {tiposAceitos.length > 1 && (
        <fieldset className="pub-linha">
          <legend>Como você quer receber?</legend>
          <label className="check"><input type="radio" checked={tipo === 'entrega'} onChange={() => setTipo('entrega')} /> Entrega</label>
          <label className="check"><input type="radio" checked={tipo === 'retirada'} onChange={() => setTipo('retirada')} /> Retirar na loja</label>
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

      {conta.t && (
        <div className="grade" style={{ gap: '0.2rem' }}>
          <div className="pub-linha" style={{ justifyContent: 'space-between' }}><span className="dica">Subtotal</span><span>{formatarReais(conta.t.subtotal)}</span></div>
          {tipo === 'entrega' && <div className="pub-linha" style={{ justifyContent: 'space-between' }}><span className="dica">Entrega</span><span>{area ? (taxa ? formatarReais(taxa) : 'Grátis') : '—'}</span></div>}
          <div className="pub-linha" style={{ justifyContent: 'space-between' }}><strong>Total</strong><span className="total">{formatarReais(conta.t.total)}</span></div>
          {conta.troco != null && <div className="pub-linha" style={{ justifyContent: 'space-between' }}><span className="dica">Seu troco</span><span>{formatarReais(conta.troco)}</span></div>}
        </div>
      )}
      {conta.erro && <p className="erro">{conta.erro}</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}
      {faltando.length > 0 && <p className="dica">Para enviar falta: {faltando.join(', ')}.</p>}
      <button type="button" className="botao-primario pub-cta" disabled={pendente || faltando.length > 0 || !!conta.erro} onClick={enviar}>
        {pendente ? 'Enviando…' : 'Enviar pedido'}
      </button>
    </main>
  );
}
