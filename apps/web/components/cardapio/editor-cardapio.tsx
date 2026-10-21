'use client';
import { useMemo, useState, useTransition } from 'react';
import { formatarReais, paraCentavos } from '@res/core';
import { nomeOpcao, type Cardapio } from '@/lib/cardapio-dados';
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

type Marca = { id: string; nome: string };
type Painel =
  | { tipo: 'produto'; id: string | null }
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
  const contagem = (id: string) => produtos.filter((p) => p.setor_id === id).length;
  const listaSetores = setores.map((s) => ({ id: s.id, nome: s.nome }));

  const produtoEditando = painel?.tipo === 'produto' && painel.id ? produtos.find((p) => p.id === painel.id) ?? null : null;
  const setorEditando = painel?.tipo === 'setor' && painel.id ? setores.find((s) => s.id === painel.id) : null;
  const grupoEditando = (painel?.tipo === 'grupo' || painel?.tipo === 'aplicar') && painel.id ? grupos[painel.id] : undefined;

  return (
    <div className="grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Cardápio</h1>
        <div className="linha" style={{ alignItems: 'center', gap: '0.5rem' }}>
        {outrasLojas.length > 0 && (
          <button type="button" onClick={() => setPainel({ tipo: 'importar' })}>Importar de outra loja</button>
        )}
        <div className="abas" role="tablist">
          <button role="tab" aria-selected={aba === 'produtos'} onClick={() => setAba('produtos')}>Produtos <span className="dica">{produtos.length}</span></button>
          <button role="tab" aria-selected={aba === 'grupos'} onClick={() => setAba('grupos')}>Grupos de opções <span className="dica">{listaGrupos.length}</span></button>
        </div>
        </div>
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}

      {aba === 'produtos' && (
        <div className="cd">
          {/* ------------------------------------------------ categorias */}
          <aside className="cd-categorias" aria-label="Categorias">
            <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>Categorias</h2>
              <button type="button" className="botao-primario mini" onClick={() => setPainel({ tipo: 'setor', id: null })}>+ Nova</button>
            </div>
            <ul className="lista" style={{ gap: '0.2rem' }}>
              <li>
                <button type="button" className="cd-cat" aria-current={setorSel === TODOS && !termo ? 'true' : undefined} onClick={() => { setSetorSel(TODOS); setBusca(''); }}>
                  <span>Todos os produtos</span><span className="dica">{produtos.length}</span>
                </button>
              </li>
              {setores.map((s, i) => (
                <li key={s.id}>
                  <button type="button" className="cd-cat" aria-current={setorSel === s.id && !termo ? 'true' : undefined} onClick={() => { setSetorSel(s.id); setBusca(''); }}>
                    <span>
                      {s.nome}
                      {!s.delivery && !s.presencial && <span className="dica"> · oculta</span>}
                    </span>
                    <span className="dica">{contagem(s.id)}</span>
                  </button>
                  {setorSel === s.id && !termo && (
                    <div className="cd-cat-acoes">
                      <button type="button" className="mini" onClick={() => setPainel({ tipo: 'setor', id: s.id })}>Editar</button>
                      <button type="button" className="mini" disabled={pendente} onClick={() => executar(() => duplicarSetor(s.id), (id) => id && setSetorSel(id))}>Duplicar</button>
                      <button type="button" className="mini" aria-label="Subir categoria" disabled={i === 0 || pendente} onClick={() => executar(() => mover('setores', s.id, -1))}>↑</button>
                      <button type="button" className="mini" aria-label="Descer categoria" disabled={i === setores.length - 1 || pendente} onClick={() => executar(() => mover('setores', s.id, 1))}>↓</button>
                      <button type="button" className="mini" onClick={() => setConfirmar({ texto: `Excluir a categoria "${s.nome}"? Os ${contagem(s.id)} produtos dela ficam sem categoria (não são apagados).`, acao: () => excluirSetor(s.id) })}>Excluir</button>
                    </div>
                  )}
                </li>
              ))}
              {semCategoria.length > 0 && (
                <li>
                  <button type="button" className="cd-cat" aria-current={setorSel === SEM && !termo ? 'true' : undefined} onClick={() => { setSetorSel(SEM); setBusca(''); }}>
                    <span>Sem categoria</span><span className="dica">{semCategoria.length}</span>
                  </button>
                </li>
              )}
            </ul>
          </aside>

          {/* ------------------------------------------------ produtos */}
          <section className="cd-produtos" aria-label="Produtos">
            <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{termo ? `Busca: "${busca}"` : setorSel === TODOS ? 'Todos os produtos' : setorSel === SEM ? 'Sem categoria' : setorAtual?.nome}</h2>
              <div className="linha" style={{ alignItems: 'center', gap: '0.5rem' }}>
                <input type="search" placeholder="Buscar produto…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar produto" />
                {marcas.length > 1 && (
                  <select value={marcaSel} onChange={(e) => setMarcaSel(e.target.value)} aria-label="Marca">
                    {marcas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                )}
                <button type="button" className="botao-primario" onClick={() => setPainel({ tipo: 'produto', id: null })}>+ Novo produto</button>
              </div>
            </div>

            {visiveis.length === 0 && (
              <div className="cartao dica">
                {setores.length === 0 ? (outrasLojas.length ? 'Cardápio vazio. Crie uma categoria em "+ Nova" ou traga tudo pronto em "Importar de outra loja".' : 'Comece criando uma categoria (ex.: Pizzas, Bebidas) no botão "+ Nova".') : termo ? 'Nenhum produto com esse nome.' : 'Nenhum produto nesta categoria ainda. Use "+ Novo produto".'}
              </div>
            )}
            <ul className="lista">
              {visiveis.map((p) => {
                const pm = p.produto_marcas.find((m) => m.marca_id === marcaSel);
                const irmaos = produtos.filter((x) => x.setor_id === p.setor_id);
                const pos = irmaos.findIndex((x) => x.id === p.id);
                const podeMover = !termo && setorSel !== TODOS;
                const toggle = (campo: 'ativo' | 'delivery' | 'presencial', valor: boolean) => executar(() => alterarDisponibilidade(p.id, marcaSel, campo, valor));
                return (
                  <li key={p.id} className={`cd-produto ${pm && !pm.ativo ? 'inativo' : ''}`}>
                    <button type="button" className="cd-produto-principal" onClick={() => setPainel({ tipo: 'produto', id: p.id })}>
                      {p.imagem_url ? <img src={p.imagem_url} alt="" className="miniatura" /> : <span className="miniatura vazia" aria-hidden="true" />}
                      <span className="grade" style={{ gap: '0.1rem' }}>
                        <strong>
                          {p.nome}
                          {p.etiqueta && <span className="selo" style={{ marginLeft: 6 }}>{ETIQUETAS.find((e) => e.valor === p.etiqueta)?.rotulo}</span>}
                        </strong>
                        <span className="dica">
                          {p.produto_grupos.length
                            ? p.produto_grupos.map((pg) => grupos[pg.grupo_id]?.nome).filter(Boolean).join(' · ')
                            : 'Sem grupos de opções'}
                          {termo && p.setor_id && ` — ${setores.find((s) => s.id === p.setor_id)?.nome}`}
                        </span>
                      </span>
                      <span className="cd-preco">{p.preco == null ? '—' : formatarReais(paraCentavos(Number(p.preco)))}</span>
                    </button>
                    <div className="cd-produto-acoes">
                      {pm && (
                        <>
                          <label className="interruptor" title="Produto ativo">
                            <input type="checkbox" checked={pm.ativo} onChange={(e) => toggle('ativo', e.target.checked)} disabled={pendente} /> Ativo
                          </label>
                          <label className="interruptor" title="Aparece no delivery">
                            <input type="checkbox" checked={pm.delivery} onChange={(e) => toggle('delivery', e.target.checked)} disabled={pendente || !pm.ativo} /> Delivery
                          </label>
                          <label className="interruptor" title="Aparece no salão">
                            <input type="checkbox" checked={pm.presencial} onChange={(e) => toggle('presencial', e.target.checked)} disabled={pendente || !pm.ativo} /> Salão
                          </label>
                        </>
                      )}
                      <span className="cd-sep" />
                      {podeMover && (
                        <>
                          <button type="button" className="mini" aria-label="Subir" disabled={pos === 0 || pendente} onClick={() => executar(() => mover('produtos', p.id, -1))}>↑</button>
                          <button type="button" className="mini" aria-label="Descer" disabled={pos === irmaos.length - 1 || pendente} onClick={() => executar(() => mover('produtos', p.id, 1))}>↓</button>
                        </>
                      )}
                      <button type="button" className="mini" disabled={pendente} onClick={() => executar(() => duplicarProduto(p.id), (id) => id && setPainel({ tipo: 'produto', id }))}>Duplicar</button>
                      <button type="button" className="mini" onClick={() => setConfirmar({ texto: `Excluir o produto "${p.nome}"? Não dá para desfazer.`, acao: () => excluirProduto(p.id) })}>Excluir</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
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
        <Gaveta titulo={produtoEditando ? produtoEditando.nome : 'Novo produto'} aoFechar={() => setPainel(null)}>
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
      {painel?.tipo === 'setor' && (
        <Gaveta titulo={setorEditando ? `Categoria: ${setorEditando.nome}` : 'Nova categoria'} aoFechar={() => setPainel(null)} largura={460}>
          <FormSetor
            key={setorEditando?.id ?? 'nova'}
            marcas={marcas}
            inicial={setorEditando ? { id: setorEditando.id, nome: setorEditando.nome, nomePublico: setorEditando.nome_publico, delivery: setorEditando.delivery, presencial: setorEditando.presencial, marcas: setorEditando.setor_marcas.map((m) => m.marca_id) } : undefined}
            aoTerminar={() => setPainel(null)}
          />
        </Gaveta>
      )}
      {painel?.tipo === 'grupo' && (
        <Gaveta titulo={grupoEditando ? `Grupo: ${grupoEditando.nome}` : 'Novo grupo de opções'} aoFechar={() => setPainel(null)}>
          <FormGrupo
            key={grupoEditando?.id ?? 'novo'}
            usos={grupoEditando ? usos[grupoEditando.id] ?? 0 : 0}
            inicial={grupoEditando ? {
              id: grupoEditando.id, nome: grupoEditando.nome, formacao: grupoEditando.formacao, obrigatorio: grupoEditando.obrigatorio,
              minQtd: grupoEditando.min_qtd, maxQtd: grupoEditando.max_qtd, pizza: grupoEditando.pizza, permiteRepetir: grupoEditando.permite_repetir,
              opcoes: grupoEditando.opcoes.map((o) => ({ id: o.id, nome: nomeOpcao(o), preco: o.preco == null ? null : Number(o.preco) })),
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
