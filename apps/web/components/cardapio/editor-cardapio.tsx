'use client';
import { useMemo, useState, useTransition } from 'react';
import { formatarReais, paraCentavos, percentualDesconto, precoBase, resumoAgenda } from '@res/core';
import { agendaDe, nomeOpcao, paraProdutoCore, situacaoPromo, type Cardapio } from '@/lib/cardapio-dados';
import {
  alterarDisponibilidade,
  duplicarGrupo,
  duplicarProduto,
  duplicarSetor,
  excluirGrupo,
  excluirProduto,
  excluirSetor,
  mover,
  type Resultado,
} from '@/app/(painel)/cardapio/actions';
import { salvando } from '@/components/tempo-real';
import { FormSetor } from '@/components/form-setor';
import { FormGrupo } from '@/components/form-grupo';
import { Gaveta } from './gaveta';
import { EditorProduto, ETIQUETAS, resumoGrupo } from './editor-produto';
import { AplicarGrupo } from './aplicar-grupo';
import { ImportarCardapio } from './importar-cardapio';
import { AreaFoto } from './foto-produto';
import { EditorCombo } from './editor-combo';

type Marca = { id: string; nome: string };
type Painel =
  | { tipo: 'produto'; id: string | null }
  | { tipo: 'combo'; id: string | null }
  | { tipo: 'setor'; id: string | null }
  | { tipo: 'grupo'; id: string | null }
  | { tipo: 'aplicar'; id: string }
  | { tipo: 'importar' }
  | null;

const TODOS = '__todos';
const SEM = '__sem';

export function EditorCardapio({ cardapio, marcas, lojaId, outrasLojas = [] }: { cardapio: Cardapio; marcas: Marca[]; lojaId: string; outrasLojas?: { id: string; nome: string }[] }) {
  const { setores, produtos, grupos, usos } = cardapio;
  const listaGrupos = useMemo(() => Object.values(grupos).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')), [grupos]);
  const [aba, setAba] = useState<'produtos' | 'grupos'>('produtos');
  const [setorSel, setSetorSel] = useState<string>(setores[0]?.id ?? TODOS);
  const [busca, setBusca] = useState('');
  const [marcaSel, setMarcaSel] = useState(marcas[0]?.id ?? '');
  const [painel, setPainel] = useState<Painel>(null);
  const [confirmar, setConfirmar] = useState<{ texto: string; acao: () => Promise<Resultado> } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const executar = (acao: () => Promise<Resultado & { id?: string }>, depois?: (id?: string) => void) =>
    iniciar(async () => {
      const r = await salvando(acao());
      setErro(r.ok ? null : r.erro);
      if (r.ok) depois?.(r.id);
    });

  const semCategoria = produtos.filter((p) => p.setor_id === null);
  const termo = busca.trim().toLowerCase();
  const visiveis = produtos.filter(
    (p) =>
      (termo ? p.nome.toLowerCase().includes(termo) : setorSel === TODOS || (setorSel === SEM ? p.setor_id === null : p.setor_id === setorSel)),
  );
  const setorAtual = setores.find((s) => s.id === setorSel);
  const semFoto = visiveis.filter((p) => !p.imagem_url).length;
  const promosValendo = produtos.filter((p) => p.desconto_pct || p.produto_marcas.some((m) => situacaoPromo(m) === 'valendo')).length;
  const contagem = (id: string) => produtos.filter((p) => p.setor_id === id).length;
  const listaSetores = setores.map((s) => ({ id: s.id, nome: s.nome }));

  const produtoEditando = painel?.tipo === 'produto' && painel.id ? produtos.find((p) => p.id === painel.id) ?? null : null;
  const setorEditando = painel?.tipo === 'setor' && painel.id ? setores.find((s) => s.id === painel.id) : null;
  const grupoEditando = (painel?.tipo === 'grupo' || painel?.tipo === 'aplicar') && painel.id ? grupos[painel.id] : undefined;

  return (
    <div className="grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: 0 }}>Cardápio</h1>
          <p className="dica" style={{ margin: 0 }}>{produtos.length} produto(s) · {promosValendo} promoção(ões) valendo agora</p>
        </div>
        <div className="linha" style={{ alignItems: 'center', gap: '0.5rem' }}>
        {outrasLojas.length > 0 && (
          <button type="button" onClick={() => setPainel({ tipo: 'importar' })}>Importar de outra loja</button>
        )}
        {aba === 'produtos' && setores.length > 0 && <button type="button" className="cdn-combo-btn" onClick={() => setPainel({ tipo: 'combo', id: null })}>+ Novo combo</button>}
        {aba === 'produtos' && <button type="button" className="botao-primario" onClick={() => setPainel({ tipo: 'produto', id: null })}>+ Novo produto</button>}
        <div className="abas" role="tablist">
          <button role="tab" aria-selected={aba === 'produtos'} onClick={() => setAba('produtos')}>Produtos <span className="dica">{produtos.length}</span></button>
          <button role="tab" aria-selected={aba === 'grupos'} onClick={() => setAba('grupos')}>Grupos de opções <span className="dica">{listaGrupos.length}</span></button>
        </div>
        </div>
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}

      {aba === 'produtos' && (
        <div className="grade cdn">
          {/* ------------------------------------------------ categorias (chips) */}
          <nav className="cdn-cats" aria-label="Categorias">
            <button type="button" className="cdn-cat" aria-pressed={setorSel === TODOS && !termo} onClick={() => { setSetorSel(TODOS); setBusca(''); }}>
              Todos <span>{produtos.length}</span>
            </button>
            {setores.map((s) => (
              <button key={s.id} type="button" className="cdn-cat" aria-pressed={setorSel === s.id && !termo} onClick={() => { setSetorSel(s.id); setBusca(''); }}>
                {s.nome} <span>{contagem(s.id)}</span>
                {s.upsell && <em> · up-sell</em>}
                {!s.delivery && !s.presencial && <em> · oculta</em>}
              </button>
            ))}
            {semCategoria.length > 0 && (
              <button type="button" className="cdn-cat" aria-pressed={setorSel === SEM && !termo} onClick={() => { setSetorSel(SEM); setBusca(''); }}>
                Sem categoria <span>{semCategoria.length}</span>
              </button>
            )}
            <button type="button" className="cdn-cat nova" onClick={() => setPainel({ tipo: 'setor', id: null })}>+ Categoria</button>
            <label className="cdn-busca">
              <span className="sr">Buscar produto</span>
              <input type="search" placeholder="Buscar produto…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            </label>
            {marcas.length > 1 && (
              <select value={marcaSel} onChange={(e) => setMarcaSel(e.target.value)} aria-label="Cardápio (marca)">
                {marcas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            )}
          </nav>

          {setorAtual && !termo && (
            <div className="cdn-cat-acoes">
              <strong>{setorAtual.nome}</strong>
              <button type="button" className="mini" onClick={() => setPainel({ tipo: 'setor', id: setorAtual.id })}>Editar categoria</button>
              <button type="button" className="mini" disabled={pendente} onClick={() => executar(() => duplicarSetor(setorAtual.id), (id) => id && setSetorSel(id))}>Duplicar</button>
              <button type="button" className="mini" aria-label="Mover categoria para a esquerda" disabled={setores[0]?.id === setorAtual.id || pendente} onClick={() => executar(() => mover('setores', setorAtual.id, -1))}>←</button>
              <button type="button" className="mini" aria-label="Mover categoria para a direita" disabled={setores[setores.length - 1]?.id === setorAtual.id || pendente} onClick={() => executar(() => mover('setores', setorAtual.id, 1))}>→</button>
              <button type="button" className="mini texto-perigo" onClick={() => setConfirmar({ texto: `Excluir a categoria "${setorAtual.nome}"? Os ${contagem(setorAtual.id)} produtos dela ficam sem categoria (não são apagados).`, acao: () => excluirSetor(setorAtual.id) })}>Excluir</button>
            </div>
          )}

          {semFoto > 0 && (
            <p className="cdn-aviso">
              <strong>{semFoto === 1 ? '1 produto sem foto.' : `${semFoto} produtos sem foto.`}</strong> Produto com foto vende mais no cardápio digital — arraste a foto em cima do card.
            </p>
          )}

          {visiveis.length === 0 && (
            <div className="cartao dica">
              {setores.length === 0 ? (outrasLojas.length ? 'Cardápio vazio. Crie uma categoria em "+ Categoria" ou traga tudo pronto em "Importar de outra loja".' : 'Comece criando uma categoria (ex.: Pizzas, Bebidas) em "+ Categoria".') : termo ? 'Nenhum produto com esse nome.' : 'Nenhum produto nesta categoria ainda.'}
            </div>
          )}
          <div className="cdn-grade">
            {visiveis.map((p) => {
              const pm = p.produto_marcas.find((m) => m.marca_id === marcaSel);
              const irmaos = produtos.filter((x) => x.setor_id === p.setor_id);
              const pos = irmaos.findIndex((x) => x.id === p.id);
              const podeMover = !termo && setorSel !== TODOS;
              const toggle = (campo: 'ativo' | 'delivery' | 'presencial', valor: boolean) => executar(() => alterarDisponibilidade(p.id, marcaSel, campo, valor));
              const precoNormal = pm?.preco_delivery ?? p.preco;
              const promoPropria = situacaoPromo(pm);
              const de = precoNormal == null ? null : paraCentavos(Number(precoNormal));
              const efetivo = pm ? precoBase(paraProdutoCore({ ...p, produto_marcas: [{ ...pm, ativo: true, delivery: true }] }), pm.marca_id, 'delivery') : null;
              const por = de != null && efetivo != null && efetivo < de ? efetivo : null;
              const promo = por != null ? 'valendo' : promoPropria === 'fora' ? 'fora' : 'sem';
              const ativo = pm?.ativo ?? false;
              return (
                <article key={p.id} className={`cdn-card ${ativo ? '' : 'pausado'}`}>
                  <div className="cdn-card-foto">
                    <AreaFoto produtoId={p.id} lojaId={lojaId} atual={p.imagem_url} rotulo={p.nome} />
                    {promo === 'valendo' && de != null && por != null && <span className="cdn-selo promo">PROMO -{percentualDesconto(de, por)}%</span>}
                    {promo === 'fora' && <span className="cdn-selo agendada" title={pm ? resumoAgenda(agendaDe(pm)) : undefined}>Promo agendada</span>}
                    {p.combo && promo !== 'valendo' && <span className="cdn-selo combo">COMBO</span>}
                    {p.etiqueta && <span className="cdn-selo etiqueta">{ETIQUETAS.find((e) => e.valor === p.etiqueta)?.rotulo}</span>}
                  </div>
                  <button type="button" className="cdn-card-corpo" onClick={() => setPainel({ tipo: p.combo ? 'combo' : 'produto', id: p.id })}>
                    <strong className="cdn-nome">{p.nome}</strong>
                    <span className="cdn-desc">
                      {p.descricao || (p.combo ? (cardapio.passos[p.id] ?? []).map((x) => x.titulo).join(' + ') : '') || (p.produto_grupos.length ? p.produto_grupos.map((pg) => grupos[pg.grupo_id]?.nome).filter(Boolean).join(' · ') : 'Sem descrição')}
                      {termo && p.setor_id && ` — ${setores.find((s) => s.id === p.setor_id)?.nome}`}
                    </span>
                    <span className="cdn-preco">
                      {promo === 'valendo' && por != null ? (
                        <>
                          {de != null && <s>{formatarReais(de)}</s>} <b className="promo">{formatarReais(por)}</b>
                        </>
                      ) : (
                        <b>{de == null ? 'Preço nos sabores' : formatarReais(de)}</b>
                      )}
                    </span>
                  </button>
                  <div className="cdn-card-rodape">
                    {pm ? (
                      <label className="cdn-venda">
                        <input type="checkbox" checked={ativo} onChange={(e) => toggle('ativo', e.target.checked)} disabled={pendente} />
                        {ativo ? 'À venda' : 'Pausado'}
                      </label>
                    ) : (
                      <span className="dica">Fora deste cardápio</span>
                    )}
                    <button type="button" className="mini botao-primario" onClick={() => setPainel({ tipo: p.combo ? 'combo' : 'produto', id: p.id })}>Editar</button>
                    <details className="cdn-mais">
                      <summary aria-label={`Mais ações de ${p.nome}`}>⋯</summary>
                      <div className="cdn-mais-menu">
                        {pm && (
                          <>
                            <label className="interruptor"><input type="checkbox" checked={pm.delivery} onChange={(e) => toggle('delivery', e.target.checked)} disabled={pendente || !pm.ativo} /> Vende no delivery</label>
                            <label className="interruptor"><input type="checkbox" checked={pm.presencial} onChange={(e) => toggle('presencial', e.target.checked)} disabled={pendente || !pm.ativo} /> Vende no salão</label>
                          </>
                        )}
                        {podeMover && (
                          <span className="linha" style={{ gap: '0.3rem' }}>
                            <button type="button" className="mini" disabled={pos === 0 || pendente} onClick={() => executar(() => mover('produtos', p.id, -1))}>← Antes</button>
                            <button type="button" className="mini" disabled={pos === irmaos.length - 1 || pendente} onClick={() => executar(() => mover('produtos', p.id, 1))}>Depois →</button>
                          </span>
                        )}
                        <button type="button" className="mini" disabled={pendente} onClick={() => executar(() => duplicarProduto(p.id), (id) => id && setPainel({ tipo: 'produto', id }))}>Duplicar</button>
                        <button type="button" className="mini texto-perigo" onClick={() => setConfirmar({ texto: `Excluir o produto "${p.nome}"? Não dá para desfazer.`, acao: () => excluirProduto(p.id) })}>Excluir</button>
                      </div>
                    </details>
                  </div>
                </article>
              );
            })}
            {setores.length > 0 && !termo && (
              <button type="button" className="cdn-novo" onClick={() => setPainel({ tipo: 'produto', id: null })}>
                <span aria-hidden="true">+</span> Adicionar produto
              </button>
            )}
          </div>
        </div>
      )}

      {aba === 'grupos' && (
        <section className="grade">
          <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="dica" style={{ margin: 0, maxWidth: 640 }}>
              Crie cada grupo uma vez (ex.: <em>Sabores</em>, <em>Borda</em>, <em>Adicionais</em>) e escolha em quais produtos ele aparece. Mudou o preço de um sabor? Muda aqui e vale para todos os tamanhos.
            </p>
            <button type="button" className="botao-primario" onClick={() => setPainel({ tipo: 'grupo', id: null })}>+ Novo grupo</button>
          </div>
          {listaGrupos.length === 0 && <div className="cartao dica">Nenhum grupo ainda.</div>}
          <div className="cd-grupos">
            {listaGrupos.map((g) => (
              <article key={g.id} className="cartao grade" style={{ gap: '0.4rem' }}>
                <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>{g.nome}{g.pizza && <span className="selo selo-pizza" style={{ marginLeft: 6 }}>pizza</span>}</h3>
                  <span className="dica">em {usos[g.id] ?? 0} produto(s)</span>
                </div>
                <span className="dica">{resumoGrupo(g)}</span>
                <span style={{ fontSize: '0.9rem' }}>
                  {g.opcoes.slice(0, 8).map((o) => nomeOpcao(o) + (Number(o.preco) ? ` (+${formatarReais(paraCentavos(Number(o.preco)))})` : '')).join(' · ')}
                  {g.opcoes.length > 8 && <span className="dica"> · e mais {g.opcoes.length - 8}</span>}
                </span>
                <div className="linha" style={{ gap: '0.35rem' }}>
                  <button type="button" className="botao-primario mini" onClick={() => setPainel({ tipo: 'aplicar', id: g.id })}>Escolher produtos</button>
                  <button type="button" className="mini" onClick={() => setPainel({ tipo: 'grupo', id: g.id })}>Editar</button>
                  <button type="button" className="mini" disabled={pendente} onClick={() => executar(() => duplicarGrupo(g.id), (id) => id && setPainel({ tipo: 'grupo', id }))}>Duplicar</button>
                  <button type="button" className="mini" onClick={() => setConfirmar({ texto: `Excluir o grupo "${g.nome}"? Ele sai de ${usos[g.id] ?? 0} produto(s).`, acao: () => excluirGrupo(g.id) })}>Excluir</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ------------------------------------------------ painéis */}
      {painel?.tipo === 'produto' && painel.id && !produtoEditando && (
        <Gaveta titulo="Abrindo…" aoFechar={() => setPainel(null)}>
          <p className="dica">Carregando o produto…</p>
        </Gaveta>
      )}
      {painel?.tipo === 'produto' && (!painel.id || produtoEditando) && (
        <Gaveta titulo={produtoEditando ? produtoEditando.nome : 'Novo produto'} aoFechar={() => setPainel(null)} largura={720}>
          <EditorProduto
            key={produtoEditando?.id ?? 'novo'}
            produto={produtoEditando}
            setorInicial={setorSel !== TODOS && setorSel !== SEM ? setorSel : null}
            setores={listaSetores}
            marcas={marcas}
            grupos={listaGrupos}
            lojaId={lojaId}
            aoFechar={() => setPainel(null)}
            aoCriar={(id) => setPainel({ tipo: 'produto', id })}
          />
        </Gaveta>
      )}
      {painel?.tipo === 'combo' && (painel.id ? produtos.some((x) => x.id === painel.id) : true) && (
        <Gaveta titulo={painel.id ? `Combo: ${produtos.find((x) => x.id === painel.id)?.nome ?? ''}` : 'Novo combo'} aoFechar={() => setPainel(null)} largura={720}>
          <EditorCombo
            key={painel.id ?? 'novo'}
            cardapio={cardapio}
            combo={painel.id ? produtos.find((x) => x.id === painel.id) ?? null : null}
            marcaId={marcaSel}
            lojaId={lojaId}
            setorInicial={setorSel !== TODOS && setorSel !== SEM ? setorSel : null}
            aoFechar={() => setPainel(null)}
            aoCriar={(id) => setPainel({ tipo: 'combo', id })}
          />
        </Gaveta>
      )}
      {painel?.tipo === 'combo' && painel.id && !produtos.some((x) => x.id === painel.id) && (
        <Gaveta titulo="Abrindo…" aoFechar={() => setPainel(null)}>
          <p className="dica">Carregando o combo…</p>
        </Gaveta>
      )}
      {painel?.tipo === 'setor' && (
        <Gaveta titulo={setorEditando ? `Categoria: ${setorEditando.nome}` : 'Nova categoria'} aoFechar={() => setPainel(null)} largura={460}>
          <FormSetor
            key={setorEditando?.id ?? 'nova'}
            marcas={marcas}
            inicial={setorEditando ? { id: setorEditando.id, nome: setorEditando.nome, nomePublico: setorEditando.nome_publico, delivery: setorEditando.delivery, presencial: setorEditando.presencial, upsell: setorEditando.upsell, marcas: setorEditando.setor_marcas.map((m) => m.marca_id) } : undefined}
            aoTerminar={() => setPainel(null)}
          />
        </Gaveta>
      )}
      {painel?.tipo === 'grupo' && (
        <Gaveta titulo={grupoEditando ? `Grupo: ${grupoEditando.nome}` : 'Novo grupo de opções'} aoFechar={() => setPainel(null)}>
          <FormGrupo
            key={grupoEditando?.id ?? 'novo'}
            usos={grupoEditando ? usos[grupoEditando.id] ?? 0 : 0}
            lojaId={lojaId}
            inicial={grupoEditando ? {
              id: grupoEditando.id, nome: grupoEditando.nome, formacao: grupoEditando.formacao, obrigatorio: grupoEditando.obrigatorio,
              minQtd: grupoEditando.min_qtd, maxQtd: grupoEditando.max_qtd, pizza: grupoEditando.pizza, permiteRepetir: grupoEditando.permite_repetir,
              opcoes: grupoEditando.opcoes.map((o) => ({ id: o.id, nome: nomeOpcao(o), preco: o.preco == null ? null : Number(o.preco), imagem_url: o.imagem_url ?? null, descricao: o.descricao ?? null, selo: o.selo ?? null })),
            } : undefined}
            aoTerminar={(id) => (grupoEditando || !id ? setPainel(null) : setPainel({ tipo: 'aplicar', id }))}
            aoCancelar={() => setPainel(null)}
          />
        </Gaveta>
      )}
      {painel?.tipo === 'aplicar' && grupoEditando && (
        <Gaveta titulo={`Onde aparece "${grupoEditando.nome}"`} aoFechar={() => setPainel(null)}>
          <AplicarGrupo grupo={grupoEditando} setores={setores} produtos={produtos} aoFechar={() => setPainel(null)} />
        </Gaveta>
      )}
      {painel?.tipo === 'importar' && (
        <Gaveta titulo="Importar de outra loja" aoFechar={() => setPainel(null)}>
          <ImportarCardapio lojas={outrasLojas} aoFechar={() => setPainel(null)} />
        </Gaveta>
      )}
      {confirmar && (
        <Gaveta titulo="Confirmar" aoFechar={() => setConfirmar(null)} largura={420}>
          <p>{confirmar.texto}</p>
          <div className="gaveta-acoes">
            <button type="button" className="botao-perigo" disabled={pendente} onClick={() => executar(confirmar.acao, () => setConfirmar(null))}>
              {pendente ? 'Excluindo…' : 'Excluir'}
            </button>
            <button type="button" onClick={() => setConfirmar(null)}>Cancelar</button>
          </div>
        </Gaveta>
      )}
    </div>
  );
}
