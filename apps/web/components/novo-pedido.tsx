'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  calcularCombo,
  calcularItem,
  ErroEscolha,
  ErroPedido,
  formatarReais,
  PAGAMENTO_ROTULO,
  precoBase,
  taxaDoBairro,
  TIPO_ROTULO,
  totalizar,
  troco,
  type EscolhaPasso,
  type Escolhas,
  type FormaPagamento,
  type TipoPedido,
} from '@res/core';
import { nomeOpcao, paraGrupoCore, paraProdutoCore, passosCore, type Cardapio, type GrupoRow, type PassoRow, type ProdutoRow, type SetorRow } from '@/lib/cardapio-dados';
import { autorizarDesconto, criarPedido } from '@/app/(painel)/pedidos/actions';
import { buscarClientes, salvarCliente } from '@/app/(painel)/clientes/actions';
import { enderecoTexto, formatarTelefone, type ClienteBusca, type EnderecoCliente } from '@/lib/clientes';
import { salvando } from '@/components/tempo-real';

type ItemCarrinho = {
  chave: number;
  produto: ProdutoRow;
  quantidade: number;
  escolhas: Record<string, Record<string, number>>;
  unitario: number;
  resumo: string;
  observacao: string;
  /** combo: o que foi escolhido em cada passo */
  passos?: EscolhaPasso[];
};

const lerCentavos = (t: string): number | null => {
  const s = t.trim().replace(/\s|R\$/g, '');
  if (!s) return 0;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

/** "2026-10-21T20:00" (datetime-local) a partir de uma data, no horário deste aparelho. */
const paraCampoData = (d: Date) => {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
};

/** Resumo do rascunho para a barra minimizada ("Retomar pedido"). */
export type RascunhoPedido = { itens: number; total: number; cliente: string };

export function NovoPedido({
  marcas,
  areas,
  setores,
  produtos,
  grupos,
  passos = {},
  regrasDesconto = { limitePct: null, gestor: true },
  embutido = false,
  aoConcluir,
  aoMudar,
}: {
  /** Dentro da janela flutuante: sem título próprio e sem trocar de página ao lançar. */
  embutido?: boolean;
  aoConcluir?: (numero: number) => void;
  aoMudar?: (r: RascunhoPedido) => void;
  marcas: { id: string; nome: string }[];
  /** Bairros atendidos por marca (taxa em centavos). */
  areas: Record<string, { bairro: string; taxa: number }[]>;
  setores: SetorRow[];
  produtos: ProdutoRow[];
  grupos: Record<string, GrupoRow>;
  passos?: Record<string, PassoRow[]>;
  regrasDesconto?: { limitePct: number | null; gestor: boolean };
}) {
  const router = useRouter();
  const cardapio: Cardapio = useMemo(() => ({ setores, produtos, grupos, usos: {}, passos }), [setores, produtos, grupos, passos]);
  const [marcaId, setMarcaId] = useState(marcas[0]?.id ?? '');
  const [tipo, setTipo] = useState<TipoPedido>('entrega');
  const canal = tipo === 'balcao' ? 'presencial' : 'delivery';
  const [setorAtivo, setSetorAtivo] = useState<string | null>(null);
  const [montando, setMontando] = useState<ProdutoRow | null>(null);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [cliente, setCliente] = useState({ nome: '', telefone: '' });
  // cadastro de clientes (D-025): busca por telefone ou nome e preenche sozinho
  const [buscaEm, setBuscaEm] = useState<'telefone' | 'nome' | null>(null);
  const [clientesAchados, setClientesAchados] = useState<ClienteBusca[]>([]);
  const [clienteSel, setClienteSel] = useState<ClienteBusca | null>(null);
  const [obsCliente, setObsCliente] = useState('');
  const [obsMsg, setObsMsg] = useState<string | null>(null);
  const [salvandoObs, iniciarObs] = useTransition();
  const [endereco, setEndereco] = useState({ logradouro: '', numero: '', complemento: '', bairro: '', referencia: '' });
  const [taxaTxt, setTaxaTxt] = useState(''); // vazio = taxa do bairro
  const [agendar, setAgendar] = useState(false);
  const [agendaTxt, setAgendaTxt] = useState('');
  const [descontoTxt, setDescontoTxt] = useState('');
  const [motivo, setMotivo] = useState('');
  const [cupomTxt, setCupomTxt] = useState('');
  const [autorizacao, setAutorizacao] = useState<{ id: string; nome: string } | null>(null);
  const [pedindoAut, setPedindoAut] = useState(false);
  const [gerente, setGerente] = useState({ usuario: '', senha: '' });
  const [erroAut, setErroAut] = useState<string | null>(null);
  const [autorizando, iniciarAut] = useTransition();
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
        const r = item.produto.combo
          ? calcularCombo(paraProdutoCore(item.produto), passosCore(cardapio, item.produto.id), item.passos ?? [], novaMarca, c)
          : calcularItem(paraProdutoCore(item.produto), item.produto.produto_grupos.map((pg) => grupos[pg.grupo_id]).filter((g): g is GrupoRow => !!g).map(paraGrupoCore), item.escolhas, novaMarca, c);
        ficam.push({ ...item, unitario: r.unitario });
      } catch {
        saiu++;
      }
    }
    setCarrinho(ficam);
    setErro(saiu ? `${saiu} item(ns) não estão disponíveis nesse canal/marca e saíram do pedido.` : null);
  };

  const adicionar = (produto: ProdutoRow, escolhas: Escolhas, unitario: number, resumo: string, passosEscolhidos?: EscolhaPasso[]) => {
    setCarrinho((c) => [...c, { chave: contador, produto, quantidade: 1, escolhas, unitario, resumo, observacao: '', ...(passosEscolhidos ? { passos: passosEscolhidos } : {}) }]);
    setContador((x) => x + 1);
    setMontando(null);
  };

  // "Peça também": categorias de up-sell, produtos que ainda não estão no pedido
  const sugestoes = produtos
    .filter((p) => !p.combo && disponivel(p) && setoresVisiveis.some((s) => s.upsell && s.id === p.setor_id) && !carrinho.some((i) => i.produto.id === p.id))
    .slice(0, 8);

  const clicarProduto = (p: ProdutoRow) => {
    if (p.combo || gruposDe(p).length) return setMontando(p);
    const unitario = precoBase(paraProdutoCore(p), marcaId, canal) ?? 0;
    adicionar(p, {}, unitario, '');
  };

  useEffect(() => {
    if (!buscaEm) return;
    const termo = buscaEm === 'telefone' ? cliente.telefone : cliente.nome;
    const ok = buscaEm === 'telefone' ? termo.replace(/\D/g, '').length >= 4 : termo.trim().length >= 2;
    if (!ok) return setClientesAchados([]);
    let vivo = true;
    const t = setTimeout(() => {
      buscarClientes(termo).then((r) => vivo && setClientesAchados(r)).catch(() => {});
    }, 250);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [buscaEm, cliente.telefone, cliente.nome]);

  const usarEndereco = (e: EnderecoCliente) =>
    setEndereco({ logradouro: e.logradouro, numero: e.numero ?? '', complemento: e.complemento ?? '', bairro: e.bairro, referencia: e.referencia ?? '' });
  const escolherCliente = (c: ClienteBusca) => {
    setCliente({ nome: c.nome, telefone: formatarTelefone(c.telefone) });
    setClienteSel(c);
    setObsCliente(c.observacoes ?? '');
    setObsMsg(null);
    setClientesAchados([]);
    setBuscaEm(null);
    if (c.enderecos[0]) usarEndereco(c.enderecos[0]);
  };
  const mudarCliente = (campo: 'nome' | 'telefone', valor: string) => {
    setCliente((x) => ({ ...x, [campo]: valor }));
    setBuscaEm(campo);
    if (clienteSel && campo === 'telefone') setClienteSel(null);
  };

  const areasMarca = areas[marcaId] ?? [];
  const taxaAuto = taxaDoBairro(areasMarca, endereco.bairro);
  const taxaManual = taxaTxt.trim() !== '';
  const taxa = taxaManual ? lerCentavos(taxaTxt) : taxaAuto ?? 0;
  const agendadoPara = agendar && agendaTxt ? new Date(agendaTxt) : null;
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

  const subtotalAtual = carrinho.reduce((s, i) => s + i.unitario * i.quantidade, 0);
  const limiteCent = regrasDesconto.limitePct == null || regrasDesconto.gestor ? null : Math.round((subtotalAtual * regrasDesconto.limitePct) / 100);
  const acimaDoLimite = limiteCent != null && (desconto ?? 0) > limiteCent;
  const pedirAutorizacao = () =>
    iniciarAut(async () => {
      const r = await autorizarDesconto(gerente.usuario, gerente.senha);
      setGerente({ usuario: '', senha: '' });
      if (!r.ok) return setErroAut(r.erro);
      setErroAut(null);
      setAutorizacao({ id: r.id, nome: r.nome });
      setPedindoAut(false);
    });

  const faltando: string[] = [];
  if ((desconto ?? 0) > 0 && motivo.trim().length < 3) faltando.push('motivo do desconto');
  if (acimaDoLimite && !autorizacao) faltando.push('autorização do gerente para o desconto');
  if (!cliente.nome.trim()) faltando.push('nome do cliente');
  if (tipo === 'entrega' && (!endereco.logradouro.trim() || !endereco.bairro.trim())) faltando.push('rua e bairro');
  if (carrinho.length === 0) faltando.push('pelo menos um item');
  if (agendar && (!agendadoPara || Number.isNaN(agendadoPara.getTime()) || agendadoPara.getTime() <= Date.now())) faltando.push('data e hora futuras para o agendamento');

  const enviar = () =>
    iniciar(async () => {
      const r = await salvando(
        criarPedido({
          marcaId,
          tipo,
          cliente: { nome: cliente.nome, telefone: cliente.telefone },
          endereco: tipo === 'entrega' ? endereco : undefined,
          itens: carrinho.map((i) => ({ produtoId: i.produto.id, quantidade: i.quantidade, observacao: i.observacao, escolhas: i.escolhas, ...(i.passos ? { passos: i.passos } : {}) })),
          taxaEntrega: tipo === 'entrega' && !taxaManual ? null : taxa ?? 0,
          agendadoPara: agendadoPara ? agendadoPara.toISOString() : null,
          desconto: desconto ?? 0,
          descontoMotivo: motivo,
          autorizacao: acimaDoLimite ? autorizacao?.id ?? null : null,
          cupom: cupomTxt,
          pagamento,
          trocoPara: pagamento === 'dinheiro' ? trocoPara : null,
          observacao,
        }),
      );
      if (!r.ok) {
        if (/autorização do gerente/.test(r.erro)) setAutorizacao(null);
        return setErro(r.erro);
      }
      if (aoConcluir) return aoConcluir(r.numero);
      router.push(`/pedidos?criado=${r.numero}`);
    });

  // avisa a janela flutuante do que já foi digitado (para "Retomar pedido")
  const totalRascunho = resumo.totais?.total ?? carrinho.reduce((s, i) => s + i.unitario * i.quantidade, 0);
  const nItens = carrinho.reduce((s, i) => s + i.quantidade, 0);
  useEffect(() => {
    aoMudar?.({ itens: nItens, total: totalRascunho, cliente: cliente.nome.trim() });
  }, [aoMudar, nItens, totalRascunho, cliente.nome]);

  return (
    <div className="grade">
      {!embutido && <h1>Novo pedido</h1>}
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
                    <strong>{p.combo && <span className="selo selo-combo">Combo</span>} {p.nome}</strong>
                    <span className="dica">
                      {p.combo ? `${formatarReais(base ?? 0)} · montar` : gruposDe(p).length ? `a partir de ${formatarReais(base ?? 0)} · montar` : formatarReais(base ?? 0)}
                    </span>
                  </button>
                );
              })}
              {visiveis.length === 0 && <p className="dica">Nenhum produto disponível neste canal.</p>}
            </div>
          </div>
          {montando?.combo && (
            <MontadorCombo
              key={montando.id + marcaId + canal}
              combo={montando}
              passos={passosCore(cardapio, montando.id)}
              produtos={produtos}
              grupos={grupos}
              marcaId={marcaId}
              canal={canal}
              aoAdicionar={adicionar}
              aoCancelar={() => setMontando(null)}
            />
          )}
          {montando && !montando.combo && (
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
          {carrinho.length > 0 && sugestoes.length > 0 && (
            <div className="np-sugestoes" aria-label="Peça também">
              <span className="dica">Ofereça também:</span>
              {sugestoes.map((p) => (
                <button key={p.id} type="button" className="mini" onClick={() => clicarProduto(p)}>
                  + {p.nome} {formatarReais(precoBase(paraProdutoCore(p), marcaId, canal) ?? 0)}
                </button>
              ))}
            </div>
          )}

          <fieldset className="grade" style={{ gap: '0.5rem' }}>
            <legend>Cliente</legend>
            <div className="linha np-cliente">
              <label style={{ flex: '1 1 9rem' }}>
                Telefone
                <input type="text" inputMode="tel" placeholder="(47) 99999-0000" value={cliente.telefone} autoComplete="off"
                  onChange={(e) => mudarCliente('telefone', e.target.value)} onBlur={() => setTimeout(() => setBuscaEm((b) => (b === 'telefone' ? null : b)), 200)} />
              </label>
              <label style={{ flex: '2 1 12rem' }}>
                Nome
                <input type="text" value={cliente.nome} maxLength={120} autoComplete="off"
                  onChange={(e) => mudarCliente('nome', e.target.value)} onBlur={() => setTimeout(() => setBuscaEm((b) => (b === 'nome' ? null : b)), 200)} />
              </label>
              {buscaEm && clientesAchados.length > 0 && (
                <ul className="np-sugestoes-clientes" role="listbox" aria-label="Clientes encontrados">
                  {clientesAchados.map((c) => (
                    <li key={c.id}>
                      <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => escolherCliente(c)}>
                        <strong>{c.nome}</strong> <span>{formatarTelefone(c.telefone)}</span>
                        <span className="dica">
                          {c.enderecos[0] ? enderecoTexto(c.enderecos[0]) : 'sem endereço salvo'} · {c.pedidos} pedido(s)
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {!clienteSel && cliente.telefone.replace(/\D/g, '').length >= 10 && buscaEm === null && (
              <span className="dica">Cliente novo: fica salvo no cadastro quando o pedido for lançado.</span>
            )}
            {clienteSel && (
              <div className="np-ficha grade" style={{ gap: '0.4rem' }}>
                <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <strong>✓ Cliente cadastrado</strong> · {clienteSel.pedidos} pedido(s)
                    {clienteSel.ultimo_pedido_em && ` · último em ${new Date(clienteSel.ultimo_pedido_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`}
                    {clienteSel.total_gasto > 0 && ` · ${formatarReais(clienteSel.total_gasto)} no total`}
                  </span>
                  <button type="button" className="mini" onClick={() => { setClienteSel(null); setCliente({ nome: '', telefone: '' }); }}>Trocar</button>
                </div>
                {clienteSel.ultimo_item && <span className="dica">Último pedido: {clienteSel.ultimo_item}</span>}
                {clienteSel.enderecos.length > 1 && tipo === 'entrega' && (
                  <div className="linha" style={{ gap: '0.3rem' }}>
                    <span className="dica">Endereços:</span>
                    {clienteSel.enderecos.map((e) => (
                      <button key={e.id} type="button" className="mini" aria-pressed={endereco.logradouro === e.logradouro && endereco.bairro === e.bairro} onClick={() => usarEndereco(e)}>
                        {enderecoTexto(e)}
                      </button>
                    ))}
                  </div>
                )}
                <label>
                  Observações do cliente <span className="dica">(ficam salvas para os próximos pedidos)</span>
                  <textarea rows={2} maxLength={500} value={obsCliente} onChange={(e) => { setObsCliente(e.target.value); setObsMsg(null); }} placeholder="Ex.: não gosta de cebola; portão azul; cliente fiel" />
                </label>
                {obsCliente !== (clienteSel.observacoes ?? '') && (
                  <button
                    type="button"
                    className="mini"
                    style={{ justifySelf: 'start' }}
                    disabled={salvandoObs}
                    onClick={() =>
                      iniciarObs(async () => {
                        const r = await salvarCliente(clienteSel.id, clienteSel.nome, obsCliente);
                        if (!r.ok) return setObsMsg(r.erro);
                        setClienteSel({ ...clienteSel, observacoes: obsCliente || null });
                        setObsMsg('Observação salva.');
                      })
                    }
                  >
                    {salvandoObs ? 'Salvando…' : 'Salvar observação'}
                  </button>
                )}
                {obsMsg && <span className="dica" role="status">{obsMsg}</span>}
              </div>
            )}
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
                  <input type="text" list="bairros-marca" value={endereco.bairro} onChange={(e) => setEndereco({ ...endereco, bairro: e.target.value })} />
                  <datalist id="bairros-marca">
                    {areasMarca.map((a) => <option key={a.bairro} value={a.bairro}>{a.taxa ? formatarReais(a.taxa) : 'grátis'}</option>)}
                  </datalist>
                  {endereco.bairro.trim() && (
                    <span className="dica">
                      {taxaAuto === null ? 'Fora dos bairros cadastrados: informe a taxa.' : `Taxa do bairro: ${taxaAuto ? formatarReais(taxaAuto) : 'grátis'}`}
                    </span>
                  )}
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
                  <input
                    type="text"
                    inputMode="decimal"
                    value={taxaTxt}
                    onChange={(e) => setTaxaTxt(e.target.value)}
                    placeholder={taxaAuto != null ? (taxaAuto / 100).toFixed(2).replace('.', ',') : '0,00'}
                  />
                  {taxaManual && taxaAuto != null && (
                    <button type="button" className="dica" style={{ justifySelf: 'start', padding: 0, border: 0, background: 'none' }} onClick={() => setTaxaTxt('')}>
                      usar a taxa do bairro
                    </button>
                  )}
                </label>
              )}
              <label style={{ flex: '1 1 7rem' }}>
                Desconto (R$)
                <input type="text" inputMode="decimal" value={descontoTxt} onChange={(e) => { setDescontoTxt(e.target.value); setAutorizacao(null); }} placeholder="0,00" />
              </label>
              <label style={{ flex: '1 1 8rem' }}>
                Cupom <span className="dica">(opcional)</span>
                <input type="text" value={cupomTxt} maxLength={30} onChange={(e) => setCupomTxt(e.target.value.toUpperCase())} placeholder="PRIMEIRA10" />
                {cupomTxt.trim() && <span className="dica">O desconto do cupom é conferido e entra ao lançar.</span>}
              </label>
            </div>
            {(desconto ?? 0) > 0 && (
              <label>
                Motivo do desconto
                <input type="text" value={motivo} maxLength={120} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: cliente fiel, pizza atrasou" />
              </label>
            )}
            {acimaDoLimite && (
              <div className="np-autorizacao grade" style={{ gap: '0.4rem' }}>
                {autorizacao ? (
                  <span>✓ Desconto autorizado por <strong>{autorizacao.nome}</strong> (vale para este pedido).</span>
                ) : (
                  <>
                    <span>
                      Desconto acima de <strong>{regrasDesconto.limitePct}%</strong> ({formatarReais(limiteCent ?? 0)}) precisa da autorização de um gerente.
                    </span>
                    {!pedindoAut ? (
                      <button type="button" style={{ justifySelf: 'start' }} onClick={() => setPedindoAut(true)}>Pedir autorização do gerente</button>
                    ) : (
                      <div className="linha" style={{ alignItems: 'flex-end' }}>
                        <label style={{ flex: '1 1 8rem' }}>
                          Usuário do gerente
                          <input type="text" autoComplete="off" value={gerente.usuario} onChange={(e) => setGerente({ ...gerente, usuario: e.target.value })} />
                        </label>
                        <label style={{ flex: '1 1 8rem' }}>
                          Senha
                          <input type="password" autoComplete="new-password" value={gerente.senha} onChange={(e) => setGerente({ ...gerente, senha: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && pedirAutorizacao()} />
                        </label>
                        <button type="button" className="botao-primario" disabled={autorizando} onClick={pedirAutorizacao}>{autorizando ? 'Conferindo…' : 'Autorizar'}</button>
                        <button type="button" onClick={() => setPedindoAut(false)}>Cancelar</button>
                      </div>
                    )}
                    {erroAut && <span className="erro">{erroAut}</span>}
                  </>
                )}
              </div>
            )}
          </fieldset>

          <fieldset className="grade" style={{ gap: '0.4rem' }}>
            <legend>Quando</legend>
            <div className="linha" style={{ alignItems: 'center' }}>
              <label className="check"><input type="radio" checked={!agendar} onChange={() => setAgendar(false)} /> Agora</label>
              <label className="check">
                <input
                  type="radio"
                  checked={agendar}
                  onChange={() => {
                    setAgendar(true);
                    if (!agendaTxt) setAgendaTxt(paraCampoData(new Date(Math.ceil((Date.now() + 3600000) / 900000) * 900000)));
                  }}
                />{' '}
                Agendar para
              </label>
              {agendar && (
                <input type="datetime-local" aria-label="Data e hora do agendamento" value={agendaTxt} min={paraCampoData(new Date())} step={900} onChange={(e) => setAgendaTxt(e.target.value)} />
              )}
            </div>
            {agendar && <span className="dica">Fica em "Agendados" no quadro e entra em "Novo", com alerta, perto da hora de preparar.</span>}
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

/** Seleção das opções dos grupos de um produto (sabores, adicionais…). */
function GruposBalcao({ grupos, canal, escolhas, setEscolhas }: { grupos: GrupoRow[]; canal: 'delivery' | 'presencial'; escolhas: Escolhas; setEscolhas: (f: (e: Escolhas) => Escolhas) => void }) {
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
  return (
    <>
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
    </>
  );
}

function resumoDe(grupos: GrupoRow[], escolhas: Escolhas): string {
  return grupos
    .flatMap((g) => {
      const tot = Object.values(escolhas[g.id] ?? {}).reduce((s, q) => s + q, 0);
      return g.opcoes
        .filter((o) => (escolhas[g.id]?.[o.id] ?? 0) > 0)
        .map((o) => {
          const q = escolhas[g.id]![o.id]!;
          return g.pizza && tot > 1 ? `${q}/${tot} ${nomeOpcao(o)}` : `${q > 1 ? `${q}× ` : ''}${nomeOpcao(o)}`;
        });
    })
    .join(', ');
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
  const calc = (() => {
    try {
      return { r: calcularItem(paraProdutoCore(produto), grupos.map(paraGrupoCore), escolhas, marcaId, canal) };
    } catch (e) {
      return { aviso: e instanceof ErroEscolha ? e.message : 'Escolha incompleta.' };
    }
  })();
  return (
    <div className="cartao grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{produto.nome}</h2>
        <button type="button" onClick={aoCancelar}>Fechar</button>
      </div>
      <GruposBalcao grupos={grupos} canal={canal} escolhas={escolhas} setEscolhas={setEscolhas} />
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        {calc.r ? <span className="total">{formatarReais(calc.r.unitario)}</span> : <span className="dica">{calc.aviso}</span>}
        <button type="button" className="botao-primario" disabled={!calc.r} onClick={() => calc.r && aoAdicionar(produto, escolhas, calc.r.unitario, resumoDe(grupos, escolhas))}>
          Adicionar ao pedido
        </button>
      </div>
    </div>
  );
}

/** Combo no balcão: escolhe o produto de cada passo e monta (sabores…). */
function MontadorCombo({
  combo,
  passos,
  produtos,
  grupos,
  marcaId,
  canal,
  aoAdicionar,
  aoCancelar,
}: {
  combo: ProdutoRow;
  passos: ReturnType<typeof passosCore>;
  produtos: ProdutoRow[];
  grupos: Record<string, GrupoRow>;
  marcaId: string;
  canal: 'delivery' | 'presencial';
  aoAdicionar: (p: ProdutoRow, e: Escolhas, unitario: number, resumo: string, passos: EscolhaPasso[]) => void;
  aoCancelar: () => void;
}) {
  const vagas = passos.flatMap((p) => Array.from({ length: p.quantidade }, (_, n) => ({ passo: p, n: n + 1 })));
  const [esc, setEsc] = useState<{ produtoId: string | null; escolhas: Escolhas }[]>(() => vagas.map((v) => ({ produtoId: v.passo.opcoes.length === 1 ? v.passo.opcoes[0]!.produto.id : null, escolhas: {} })));
  const gruposDoProduto = (id: string) => {
    const p = produtos.find((x) => x.id === id);
    return (p?.produto_grupos ?? []).map((pg) => grupos[pg.grupo_id]).filter((g): g is GrupoRow => !!g && g.ativo && (canal === 'delivery' ? g.delivery : g.presencial));
  };
  const escolhidos: EscolhaPasso[] = vagas.flatMap((v, i) => (esc[i]?.produtoId ? [{ passoId: v.passo.id, produtoId: esc[i]!.produtoId!, escolhas: esc[i]!.escolhas }] : []));
  const calc = (() => {
    try {
      return { r: calcularCombo(paraProdutoCore(combo), passos, escolhidos, marcaId, canal) };
    } catch (e) {
      return { aviso: e instanceof ErroEscolha ? e.message : 'Escolha incompleta.' };
    }
  })();
  const resumo = escolhidos
    .map((e) => {
      const nome = produtos.find((x) => x.id === e.produtoId)?.nome ?? '';
      const r = resumoDe(gruposDoProduto(e.produtoId), e.escolhas);
      return r ? `${nome} (${r})` : nome;
    })
    .join(' + ');
  return (
    <div className="cartao grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2><span className="selo selo-combo">Combo</span> {combo.nome}</h2>
        <button type="button" onClick={aoCancelar}>Fechar</button>
      </div>
      {vagas.map((v, i) => (
        <section key={`${v.passo.id}-${v.n}`} className="grade np-passo" style={{ gap: '0.4rem' }}>
          <strong>{i + 1}. {v.passo.titulo}{v.passo.quantidade > 1 ? ` (${v.n} de ${v.passo.quantidade})` : ''}</strong>
          {v.passo.opcoes.length > 1 && (
            <div className="linha" style={{ gap: '0.35rem' }}>
              {v.passo.opcoes.map((o) => (
                <button key={o.produto.id} type="button" aria-pressed={esc[i]?.produtoId === o.produto.id} className={esc[i]?.produtoId === o.produto.id ? 'botao-primario' : ''}
                  onClick={() => setEsc((es) => es.map((e, j) => (j === i ? { produtoId: o.produto.id, escolhas: {} } : e)))}>
                  {o.produto.nome}
                </button>
              ))}
            </div>
          )}
          {esc[i]?.produtoId && (
            <GruposBalcao
              grupos={gruposDoProduto(esc[i]!.produtoId!)}
              canal={canal}
              escolhas={esc[i]!.escolhas}
              setEscolhas={(f) => setEsc((es) => es.map((e, j) => (j === i ? { ...e, escolhas: f(e.escolhas) } : e)))}
            />
          )}
        </section>
      ))}
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        {calc.r ? <span className="total">{formatarReais(calc.r.unitario)}</span> : <span className="dica">{calc.aviso}</span>}
        <button type="button" className="botao-primario" disabled={!calc.r} onClick={() => calc.r && aoAdicionar(combo, {}, calc.r.unitario, resumo, escolhidos)}>
          Adicionar combo
        </button>
      </div>
    </div>
  );
}
