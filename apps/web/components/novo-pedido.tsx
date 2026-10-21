'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  calcularItem,
  ErroEscolha,
  ErroPedido,
  formatarReais,
  PAGAMENTO_ROTULO,
  precoBase,
  TIPO_ROTULO,
  totalizar,
  troco,
  type Escolhas,
  type FormaPagamento,
  type TipoPedido,
} from '@res/core';
import { nomeOpcao, paraGrupoCore, paraProdutoCore, type GrupoRow, type ProdutoRow, type SetorRow } from '@/lib/cardapio-dados';
import { criarPedido } from '@/app/(painel)/pedidos/actions';
import { salvando } from '@/components/tempo-real';

type ItemCarrinho = {
  chave: number;
  produto: ProdutoRow;
  quantidade: number;
  escolhas: Record<string, Record<string, number>>;
  unitario: number;
  resumo: string;
  observacao: string;
};

const lerCentavos = (t: string): number | null => {
  const s = t.trim().replace(/\s|R\$/g, '');
  if (!s) return 0;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

export function NovoPedido({
  marcas,
  setores,
  produtos,
  grupos,
}: {
  marcas: { id: string; nome: string }[];
  setores: SetorRow[];
  produtos: ProdutoRow[];
  grupos: Record<string, GrupoRow>;
}) {
  const router = useRouter();
  const [marcaId, setMarcaId] = useState(marcas[0]?.id ?? '');
  const [tipo, setTipo] = useState<TipoPedido>('entrega');
  const canal = tipo === 'balcao' ? 'presencial' : 'delivery';
  const [setorAtivo, setSetorAtivo] = useState<string | null>(null);
  const [montando, setMontando] = useState<ProdutoRow | null>(null);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [cliente, setCliente] = useState({ nome: '', telefone: '' });
  const [endereco, setEndereco] = useState({ logradouro: '', numero: '', complemento: '', bairro: '', referencia: '' });
  const [taxaTxt, setTaxaTxt] = useState('');
  const [descontoTxt, setDescontoTxt] = useState('');
  const [pagamento, setPagamento] = useState<FormaPagamento>('pix');
  const [trocoTxt, setTrocoTxt] = useState('');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [contador, setContador] = useState(1);

  // O que aparece: setor visível no canal e na marca; produto ativo na marca e no canal.
  const setoresVisiveis = setores.filter((s) => (canal === 'delivery' ? s.delivery : s.presencial) && s.setor_marcas.some((m) => m.marca_id === marcaId));
  const disponivel = (p: ProdutoRow) => precoBase(paraProdutoCore(p), marcaId, canal) !== null;
  const visiveis = produtos.filter(
    (p) => disponivel(p) && (p.setor_id === null || setoresVisiveis.some((s) => s.id === p.setor_id)) && (setorAtivo === null || p.setor_id === setorAtivo),
  );
  const gruposDe = (p: ProdutoRow) => p.produto_grupos.map((pg) => grupos[pg.grupo_id]).filter((g): g is GrupoRow => !!g && g.ativo && (canal === 'delivery' ? g.delivery : g.presencial));

  // Ao trocar marca ou tipo, itens que não valem mais saem do carrinho com aviso.
  const recalcular = (novaMarca: string, novoTipo: TipoPedido) => {
    const c = novoTipo === 'balcao' ? 'presencial' : 'delivery';
    const ficam: ItemCarrinho[] = [];
    let saiu = 0;
    for (const item of carrinho) {
      try {
        const r = calcularItem(paraProdutoCore(item.produto), item.produto.produto_grupos.map((pg) => grupos[pg.grupo_id]).filter((g): g is GrupoRow => !!g).map(paraGrupoCore), item.escolhas, novaMarca, c);
        ficam.push({ ...item, unitario: r.unitario });
      } catch {
        saiu++;
      }
    }
    setCarrinho(ficam);
    setErro(saiu ? `${saiu} item(ns) não estão disponíveis nesse canal/marca e saíram do pedido.` : null);
  };

  const adicionar = (produto: ProdutoRow, escolhas: Escolhas, unitario: number, resumo: string) => {
    setCarrinho((c) => [...c, { chave: contador, produto, quantidade: 1, escolhas, unitario, resumo, observacao: '' }]);
    setContador((x) => x + 1);
    setMontando(null);
  };

  const clicarProduto = (p: ProdutoRow) => {
    if (gruposDe(p).length) return setMontando(p);
    const unitario = precoBase(paraProdutoCore(p), marcaId, canal) ?? 0;
    adicionar(p, {}, unitario, '');
  };

  const taxa = lerCentavos(taxaTxt);
  const desconto = lerCentavos(descontoTxt);
  const trocoPara = trocoTxt.trim() ? lerCentavos(trocoTxt) : null;

  const resumo = useMemo(() => {
    if (taxa === null || desconto === null || (trocoTxt.trim() && trocoPara === null)) return { erro: 'Há um valor inválido. Use o formato 49,90.' };
    if (carrinho.length === 0) return { erro: null, totais: null };
    try {
      const totais = totalizar(carrinho.map((i) => ({ unitario: i.unitario, quantidade: i.quantidade })), tipo, taxa, desconto);
      const t = troco(totais.total, pagamento, trocoPara);
      return { erro: null, totais, troco: t };
    } catch (e) {
      return { erro: e instanceof ErroPedido ? e.message : 'Não foi possível calcular.' };
    }
  }, [carrinho, tipo, taxa, desconto, pagamento, trocoPara, trocoTxt]);

  const faltando: string[] = [];
  if (!cliente.nome.trim()) faltando.push('nome do cliente');
  if (tipo === 'entrega' && (!endereco.logradouro.trim() || !endereco.bairro.trim())) faltando.push('rua e bairro');
  if (carrinho.length === 0) faltando.push('pelo menos um item');

  const enviar = () =>
    iniciar(async () => {
      const r = await salvando(
        criarPedido({
          marcaId,
          tipo,
          cliente: { nome: cliente.nome, telefone: cliente.telefone },
          endereco: tipo === 'entrega' ? endereco : undefined,
          itens: carrinho.map((i) => ({ produtoId: i.produto.id, quantidade: i.quantidade, observacao: i.observacao, escolhas: i.escolhas })),
          taxaEntrega: taxa ?? 0,
          desconto: desconto ?? 0,
          pagamento,
          trocoPara: pagamento === 'dinheiro' ? trocoPara : null,
          observacao,
        }),
      );
      if (!r.ok) return setErro(r.erro);
      router.push(`/pedidos?criado=${r.numero}`);
    });

  return (
    <div className="grade">
      <h1>Novo pedido</h1>
      <div className="grade grade-2">
        {/* ---------------- cardápio */}
        <section className="grade" style={{ alignContent: 'start', gridColumn: 'span 1' }}>
          <div className="cartao grade">
            <div className="linha">
              {marcas.length > 1 && (
                <label>
                  Marca
                  <select value={marcaId} onChange={(e) => { setMarcaId(e.target.value); recalcular(e.target.value, tipo); }}>
                    {marcas.map((m) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </label>
              )}
              <fieldset className="linha" style={{ gap: '0.5rem' }}>
                <legend>Tipo</legend>
                {(['entrega', 'retirada', 'balcao'] as TipoPedido[]).map((t) => (
                  <label key={t} className="check">
                    <input type="radio" name="tipo" checked={tipo === t} onChange={() => { setTipo(t); recalcular(marcaId, t); }} /> {TIPO_ROTULO[t]}
                  </label>
                ))}
              </fieldset>
            </div>
            <div className="linha" style={{ gap: '0.35rem' }}>
              <button type="button" aria-pressed={setorAtivo === null} className={setorAtivo === null ? 'botao-primario' : ''} onClick={() => setSetorAtivo(null)}>Todos</button>
              {setoresVisiveis.map((s) => (
                <button key={s.id} type="button" aria-pressed={setorAtivo === s.id} className={setorAtivo === s.id ? 'botao-primario' : ''} onClick={() => setSetorAtivo(s.id)}>
                  {s.nome}
                </button>
              ))}
            </div>
            <div className="produtos-grade">
              {visiveis.map((p) => {
                const base = precoBase(paraProdutoCore(p), marcaId, canal);
                return (
                  <button key={p.id} type="button" className="produto-botao" onClick={() => clicarProduto(p)}>
                    <strong>{p.nome}</strong>
                    <span className="dica">
                      {gruposDe(p).length ? `a partir de ${formatarReais(base ?? 0)} · montar` : formatarReais(base ?? 0)}
                    </span>
                  </button>
                );
              })}
              {visiveis.length === 0 && <p className="dica">Nenhum produto disponível neste canal.</p>}
            </div>
          </div>
          {montando && (
            <Montador
              key={montando.id + marcaId + canal}
              produto={montando}
              grupos={gruposDe(montando)}
              marcaId={marcaId}
              canal={canal}
              aoAdicionar={adicionar}
              aoCancelar={() => setMontando(null)}
            />
          )}
        </section>

        {/* ---------------- pedido */}
        <section className="cartao grade" style={{ alignContent: 'start' }} aria-label="Resumo do pedido">
          <h2>Pedido</h2>
          <ul className="lista carrinho">
            {carrinho.map((i) => (
              <li key={i.chave}>
                <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem' }}>
                  <strong>{i.produto.nome}</strong>
                  <span className="passo">
                    <button type="button" aria-label="Menos um" onClick={() => setCarrinho((c) => c.flatMap((x) => (x.chave !== i.chave ? [x] : x.quantidade > 1 ? [{ ...x, quantidade: x.quantidade - 1 }] : [])))}>−</button>
                    {i.quantidade}
                    <button type="button" aria-label="Mais um" disabled={i.quantidade >= 99} onClick={() => setCarrinho((c) => c.map((x) => (x.chave === i.chave ? { ...x, quantidade: x.quantidade + 1 } : x)))}>+</button>
                  </span>
                  <span>{formatarReais(i.unitario * i.quantidade)}</span>
                </div>
                {i.resumo && <span className="dica">{i.resumo}</span>}
                <input
                  type="text"
                  placeholder="Observação do item (ex.: sem cebola)"
                  value={i.observacao}
                  maxLength={300}
                  onChange={(e) => setCarrinho((c) => c.map((x) => (x.chave === i.chave ? { ...x, observacao: e.target.value } : x)))}
                />
              </li>
            ))}
            {carrinho.length === 0 && <li className="dica">Clique nos produtos para adicionar.</li>}
          </ul>

          <fieldset className="grade" style={{ gap: '0.5rem' }}>
            <legend>Cliente</legend>
            <div className="linha">
              <label style={{ flex: '2 1 12rem' }}>
                Nome
                <input type="text" value={cliente.nome} maxLength={120} onChange={(e) => setCliente({ ...cliente, nome: e.target.value })} />
              </label>
              <label style={{ flex: '1 1 9rem' }}>
                Telefone
                <input type="text" inputMode="tel" placeholder="(48) 99999-0000" value={cliente.telefone} onChange={(e) => setCliente({ ...cliente, telefone: e.target.value })} />
              </label>
            </div>
          </fieldset>

          {tipo === 'entrega' && (
            <fieldset className="grade" style={{ gap: '0.5rem' }}>
              <legend>Endereço de entrega</legend>
              <div className="linha">
                <label style={{ flex: '3 1 12rem' }}>
                  Rua
                  <input type="text" value={endereco.logradouro} onChange={(e) => setEndereco({ ...endereco, logradouro: e.target.value })} />
                </label>
                <label style={{ flex: '1 1 5rem' }}>
                  Número
                  <input type="text" value={endereco.numero} onChange={(e) => setEndereco({ ...endereco, numero: e.target.value })} />
                </label>
              </div>
              <div className="linha">
                <label style={{ flex: '1 1 9rem' }}>
                  Bairro
                  <input type="text" value={endereco.bairro} onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })} />
                </label>
                <label style={{ flex: '1 1 9rem' }}>
                  Complemento
                  <input type="text" value={endereco.complemento} onChange={(e) => setEndereco({ ...endereco, complemento: e.target.value })} />
                </label>
              </div>
              <label>
                Referência
                <input type="text" value={endereco.referencia} onChange={(e) => setEndereco({ ...endereco, referencia: e.target.value })} />
              </label>
            </fieldset>
          )}

          <fieldset className="grade" style={{ gap: '0.5rem' }}>
            <legend>Pagamento</legend>
            <div className="linha">
              <label style={{ flex: '1 1 10rem' }}>
                Forma
                <select value={pagamento} onChange={(e) => setPagamento(e.target.value as FormaPagamento)}>
                  {(Object.keys(PAGAMENTO_ROTULO) as FormaPagamento[]).filter((f) => f !== 'online').map((f) => (
                    <option key={f} value={f}>{PAGAMENTO_ROTULO[f]}</option>
                  ))}
                </select>
              </label>
              {pagamento === 'dinheiro' && (
                <label style={{ flex: '1 1 7rem' }}>
                  Troco para (R$)
                  <input type="text" inputMode="decimal" value={trocoTxt} onChange={(e) => setTrocoTxt(e.target.value)} placeholder="100,00" />
                </label>
              )}
            </div>
            <div className="linha">
              {tipo === 'entrega' && (
                <label style={{ flex: '1 1 7rem' }}>
                  Taxa de entrega (R$)
                  <input type="text" inputMode="decimal" value={taxaTxt} onChange={(e) => setTaxaTxt(e.target.value)} placeholder="0,00" />
                </label>
              )}
              <label style={{ flex: '1 1 7rem' }}>
                Desconto (R$)
                <input type="text" inputMode="decimal" value={descontoTxt} onChange={(e) => setDescontoTxt(e.target.value)} placeholder="0,00" />
              </label>
            </div>
          </fieldset>

          <label>
            Observação do pedido
            <textarea rows={2} maxLength={500} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </label>

          {resumo.totais && (
            <div className="grade" style={{ gap: '0.2rem' }}>
              <div className="linha" style={{ justifyContent: 'space-between' }}><span className="dica">Subtotal</span><span>{formatarReais(resumo.totais.subtotal)}</span></div>
              {resumo.totais.taxaEntrega > 0 && <div className="linha" style={{ justifyContent: 'space-between' }}><span className="dica">Taxa de entrega</span><span>{formatarReais(resumo.totais.taxaEntrega)}</span></div>}
              {resumo.totais.desconto > 0 && <div className="linha" style={{ justifyContent: 'space-between' }}><span className="dica">Desconto</span><span>−{formatarReais(resumo.totais.desconto)}</span></div>}
              <div className="linha" style={{ justifyContent: 'space-between' }}><strong>Total</strong><span className="total">{formatarReais(resumo.totais.total)}</span></div>
              {resumo.troco != null && <div className="linha" style={{ justifyContent: 'space-between' }}><span className="dica">Levar de troco</span><span>{formatarReais(resumo.troco)}</span></div>}
            </div>
          )}
          {resumo.erro && <p className="erro">{resumo.erro}</p>}
          {erro && <p className="erro" role="alert">{erro}</p>}
          {faltando.length > 0 && <p className="dica">Falta: {faltando.join(', ')}.</p>}
          <button type="button" className="botao-primario" disabled={pendente || faltando.length > 0 || !!resumo.erro} onClick={enviar}>
            {pendente ? 'Lançando…' : 'Lançar pedido'}
          </button>
          <p className="dica" style={{ margin: 0 }}>O preço final é conferido no servidor com o cardápio.</p>
        </section>
      </div>
    </div>
  );
}

/** Monta um item com grupos (sabores da pizza, adicionais…) mostrando o preço na hora. */
function Montador({
  produto,
  grupos,
  marcaId,
  canal,
  aoAdicionar,
  aoCancelar,
}: {
  produto: ProdutoRow;
  grupos: GrupoRow[];
  marcaId: string;
  canal: 'delivery' | 'presencial';
  aoAdicionar: (p: ProdutoRow, e: Escolhas, unitario: number, resumo: string) => void;
  aoCancelar: () => void;
}) {
  const [escolhas, setEscolhas] = useState<Escolhas>({});
  const qtd = (g: string, o: string) => escolhas[g]?.[o] ?? 0;
  const totalGrupo = (g: string) => Object.values(escolhas[g] ?? {}).reduce((s, q) => s + q, 0);

  const alterar = (g: GrupoRow, o: string, delta: number) => {
    setEscolhas((e) => {
      const atual = { ...(e[g.id] ?? {}) };
      const tot = Object.values(atual).reduce((s, q) => s + q, 0);
      const ja = atual[o] ?? 0;
      if (delta > 0) {
        if (g.max_qtd === 1) return { ...e, [g.id]: { [o]: 1 } }; // escolha única: troca a opção
        const limiteOpcao = g.opcoes.find((x) => x.id === o)?.max_qtd ?? 1;
        if (tot >= g.max_qtd || ja >= limiteOpcao || (!g.permite_repetir && ja >= 1)) return e;
      }
      const novo = Math.max(0, ja + delta);
      if (novo === 0) delete atual[o];
      else atual[o] = novo;
      return { ...e, [g.id]: atual };
    });
  };

  const calc = (() => {
    try {
      return { r: calcularItem(paraProdutoCore(produto), grupos.map(paraGrupoCore), escolhas, marcaId, canal) };
    } catch (e) {
      return { aviso: e instanceof ErroEscolha ? e.message : 'Escolha incompleta.' };
    }
  })();

  const resumo = grupos
    .flatMap((g) =>
      g.opcoes
        .filter((o) => qtd(g.id, o.id) > 0)
        .map((o) => {
          const q = qtd(g.id, o.id);
          const tot = totalGrupo(g.id);
          return g.pizza && tot > 1 ? `${q}/${tot} ${nomeOpcao(o)}` : `${q > 1 ? `${q}× ` : ''}${nomeOpcao(o)}`;
        }),
    )
    .join(', ');

  return (
    <div className="cartao grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{produto.nome}</h2>
        <button type="button" onClick={aoCancelar}>Fechar</button>
      </div>
      {grupos.map((g) => (
        <fieldset key={g.id} className="grade" style={{ gap: '0.35rem' }}>
          <legend>
            {g.nome} · {g.obrigatorio ? 'obrigatório' : 'opcional'} · {g.min_qtd === g.max_qtd ? `escolha ${g.max_qtd}` : `até ${g.max_qtd}`} ({totalGrupo(g.id)}/{g.max_qtd})
          </legend>
          {g.opcoes
            .filter((o) => o.ativo && (canal === 'delivery' ? o.delivery : o.presencial))
            .map((o) => {
              const preco = paraGrupoCore(g).opcoes.find((x) => x.id === o.id)!;
              const valor = (canal === 'delivery' ? preco.precoDelivery : preco.precoPresencial) ?? preco.preco ?? preco.precoItem;
              return (
                <div key={o.id} className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    {nomeOpcao(o)} {valor > 0 && <span className="dica">{formatarReais(valor)}</span>}
                  </span>
                  <span className="passo">
                    <button type="button" aria-label={`Menos ${nomeOpcao(o)}`} disabled={qtd(g.id, o.id) === 0} onClick={() => alterar(g, o.id, -1)}>−</button>
                    {qtd(g.id, o.id)}
                    <button type="button" aria-label={`Mais ${nomeOpcao(o)}`} onClick={() => alterar(g, o.id, 1)}>+</button>
                  </span>
                </div>
              );
            })}
        </fieldset>
      ))}
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        {calc.r ? <span className="total">{formatarReais(calc.r.unitario)}</span> : <span className="dica">{calc.aviso}</span>}
        <button type="button" className="botao-primario" disabled={!calc.r} onClick={() => calc.r && aoAdicionar(produto, escolhas, calc.r.unitario, resumo)}>
          Adicionar ao pedido
        </button>
      </div>
    </div>
  );
}
