'use client';
import { useState, useTransition } from 'react';
import { DIAS_CURTOS, descreverSelecao, formatarReais, paraCentavos, percentualDesconto, resumoAgenda } from '@res/core';
import { nomeOpcao, situacaoPromo, type GrupoRow, type ProdutoRow } from '@/lib/cardapio-dados';
import { criarProduto, definirGruposDoProduto, salvarProduto } from '@/app/(painel)/cardapio/actions';
import { salvando } from '@/components/tempo-real';
import { FormGrupo } from '@/components/form-grupo';
import { AreaFoto } from './foto-produto';

type Marca = { id: string; nome: string };

export const ETIQUETAS: { valor: string; rotulo: string }[] = [
  { valor: '', rotulo: 'Nenhuma' },
  { valor: 'novo', rotulo: 'Novo' },
  { valor: 'recomendado', rotulo: 'Recomendado' },
  { valor: 'mais_vendido', rotulo: 'Mais vendido' },
  { valor: 'edicao_limitada', rotulo: 'Edição limitada' },
  { valor: 'esgotado', rotulo: 'Esgotado' },
];
const reais = (v: number | null | undefined) => (v == null ? '' : Number(v).toFixed(2).replace('.', ','));
const FORMACAO: Record<string, string> = { soma: 'soma os preços', maior: 'cobra o maior', proporcional: 'média (meio a meio)', brinde: 'não altera o preço' };

export function resumoGrupo(g: GrupoRow): string {
  return `${descreverSelecao({ nome: g.nome, obrigatorio: g.obrigatorio, minQtd: g.min_qtd, maxQtd: g.max_qtd })} Preço: ${FORMACAO[g.formacao]}.`;
}

/**
 * Editor do produto (painel lateral). Produto novo: salva os dados primeiro e o painel continua
 * aberto para escolher grupos e foto.
 */
export function EditorProduto({
  produto,
  setorInicial,
  setores,
  marcas,
  grupos,
  lojaId,
  aoFechar,
  aoCriar,
}: {
  produto: ProdutoRow | null;
  setorInicial: string | null;
  setores: { id: string; nome: string }[];
  marcas: Marca[];
  grupos: GrupoRow[];
  lojaId: string;
  aoFechar: () => void;
  aoCriar: (id: string) => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [selecionados, setSelecionados] = useState<string[]>(() => produto?.produto_grupos.map((pg) => pg.grupo_id) ?? []);
  const [criandoGrupo, setCriandoGrupo] = useState(false);
  const pm = (marca: string) => produto?.produto_marcas.find((m) => m.marca_id === marca);
  const porId = new Map(grupos.map((g) => [g.id, g]));
  const naoUsados = grupos.filter((g) => !selecionados.includes(g.id)).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const gruposMudaram = produto && selecionados.join() !== produto.produto_grupos.map((pg) => pg.grupo_id).join();
  const pmPromo = produto?.produto_marcas.find((m) => m.preco_promocional != null);
  const [precoTxt, setPrecoTxt] = useState(reais(produto?.preco));
  const [promoOn, setPromoOn] = useState(!!pmPromo);
  const [promoTxt, setPromoTxt] = useState(reais(pmPromo?.preco_promocional));
  const [dias, setDias] = useState<number[]>(pmPromo?.promo_dias && pmPromo.promo_dias.length > 0 ? pmPromo.promo_dias : [0, 1, 2, 3, 4, 5, 6]);
  const [horario, setHorario] = useState(!!pmPromo?.promo_inicio);
  const [inicio, setInicio] = useState(pmPromo?.promo_inicio?.slice(0, 5) ?? '18:00');
  const [fim, setFim] = useState(pmPromo?.promo_fim?.slice(0, 5) ?? '23:59');
  const [ate, setAte] = useState(pmPromo?.promo_ate ?? '');
  const num = (t: string) => {
    const n = Number(t.trim().replace(/\s|R\$/g, '').replace(/\./g, '').replace(',', '.'));
    return t.trim() && Number.isFinite(n) ? Math.round(n * 100) : null;
  };
  const de = num(precoTxt);
  const por = num(promoTxt);
  const agendaAgora = { dias: dias.length === 7 ? null : dias, inicio: horario ? inicio : null, fim: horario ? fim : null, ate: ate || null };
  const situacao = pmPromo ? situacaoPromo(pmPromo) : 'sem';

  const salvar = (fd: FormData) =>
    iniciar(async () => {
      setOk(null);
      if (!produto) {
        const r = await salvando(criarProduto(fd));
        if (!r.ok) return setErro(r.erro);
        setErro(null);
        if (r.id) aoCriar(r.id); // reabre já como edição, para foto e grupos
        return;
      }
      const r = await salvando(salvarProduto(fd));
      if (!r.ok) return setErro(r.erro);
      if (gruposMudaram) {
        const g = await salvando(definirGruposDoProduto(produto.id, selecionados));
        if (!g.ok) return setErro(g.erro);
      }
      setErro(null);
      setOk('Produto salvo.');
    });

  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= selecionados.length) return;
    const n = [...selecionados];
    [n[i], n[j]] = [n[j]!, n[i]!];
    setSelecionados(n);
  };

  return (
    <form action={salvar} className="grade">
      {produto && <input type="hidden" name="id" value={produto.id} />}
      {produto ? (
        <AreaFoto produtoId={produto.id} lojaId={lojaId} atual={produto.imagem_url} grande rotulo={produto.nome} />
      ) : (
        <p className="dica" style={{ margin: 0 }}>Depois de criar, você coloca a foto (arrastando ou escolhendo do celular/computador).</p>
      )}
      <section className="grade cd-secao" style={{ gap: '0.6rem' }}>
        <h3>O básico</h3>
        <label>
          Nome do produto
          <input type="text" name="nome" defaultValue={produto?.nome ?? ''} required maxLength={150} placeholder="Ex.: Pizza Grande 35cm" />
        </label>
        <label>
          Descrição
          <textarea name="descricao" rows={2} maxLength={1000} defaultValue={produto?.descricao ?? ''} placeholder="Ex.: 8 fatias, até 3 sabores" />
        </label>
        <div className="linha">
          <label style={{ flex: '2 1 12rem' }}>
            Categoria
            <select name="setor" defaultValue={produto ? produto.setor_id ?? '' : setorInicial ?? ''}>
              <option value="">Sem categoria</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </label>
          <label style={{ flex: '1 1 7rem' }}>
            Preço (R$)
            <input type="text" name="preco" inputMode="decimal" value={precoTxt} onChange={(e) => setPrecoTxt(e.target.value)} placeholder="0,00" />
          </label>
          {produto && (
            <label style={{ flex: '1 1 9rem' }}>
              Etiqueta
              <select name="etiqueta" defaultValue={produto.etiqueta ?? ''}>
                {ETIQUETAS.map((e) => <option key={e.valor} value={e.valor}>{e.rotulo}</option>)}
              </select>
            </label>
          )}
        </div>
        <p className="dica" style={{ margin: 0 }}>Se o preço vem dos sabores (pizza), deixe o preço vazio ou 0 e ponha o valor nos sabores.</p>
      </section>

      {!produto && (
        <>
          {erro && <p className="erro" role="alert">{erro}</p>}
          <div className="linha">
            <button className="botao-primario" disabled={pendente}>{pendente ? 'Criando…' : 'Criar e continuar'}</button>
            <button type="button" onClick={aoFechar}>Cancelar</button>
          </div>
          <p className="dica" style={{ margin: 0 }}>Depois de criar você coloca a foto, a promoção e as escolhas (sabores, bordas…).</p>
        </>
      )}

      {produto && (
        <>
          <section className="grade cd-secao" style={{ gap: '0.5rem' }}>
            <h3>O cliente escolhe <span className="dica">(grupos de opções)</span></h3>
            <p className="dica" style={{ margin: 0 }}>Sabores, bordas, adicionais… Um grupo pode estar em vários produtos: mude uma vez e vale para todos.</p>
            {selecionados.length === 0 && <p className="dica" style={{ margin: 0 }}>Nenhum grupo neste produto.</p>}
            <ul className="lista">
              {selecionados.map((id, i) => {
                const g = porId.get(id);
                if (!g) return null;
                return (
                  <li key={id} className="item" style={{ alignItems: 'flex-start' }}>
                    <span className="grade" style={{ gap: '0.15rem' }}>
                      <strong>{g.nome}{g.pizza && <span className="selo selo-pizza" style={{ marginLeft: 6 }}>pizza</span>}</strong>
                      <span className="dica">{resumoGrupo(g)}</span>
                      <span className="dica">{g.opcoes.map((o) => nomeOpcao(o) + (Number(o.preco) ? ` +${formatarReais(paraCentavos(Number(o.preco)))}` : '')).join(' · ')}</span>
                    </span>
                    <span className="linha" style={{ gap: '0.25rem', flexWrap: 'nowrap' }}>
                      <button type="button" className="mini" aria-label="Subir grupo" disabled={i === 0} onClick={() => mover(i, -1)}>↑</button>
                      <button type="button" className="mini" aria-label="Descer grupo" disabled={i === selecionados.length - 1} onClick={() => mover(i, 1)}>↓</button>
                      <button type="button" className="mini" aria-label={`Tirar ${g.nome}`} onClick={() => setSelecionados(selecionados.filter((x) => x !== id))}>✕</button>
                    </span>
                  </li>
                );
              })}
            </ul>
            {naoUsados.length > 0 && (
              <div className="linha" style={{ gap: '0.4rem' }}>
                {naoUsados.map((g) => (
                  <button key={g.id} type="button" className="chip" onClick={() => setSelecionados([...selecionados, g.id])}>
                    + {g.nome}
                  </button>
                ))}
              </div>
            )}
            {!criandoGrupo ? (
              <button type="button" style={{ justifySelf: 'start' }} onClick={() => setCriandoGrupo(true)}>Criar grupo novo para este produto</button>
            ) : (
              // Enter dentro do grupo não pode enviar o formulário do produto
              <div className="cartao" onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && e.preventDefault()}>
                <FormGrupo
                  produtoId={produto.id}
                  precoProduto={produto.preco == null ? 0 : paraCentavos(Number(produto.preco))}
                  aoTerminar={(id) => {
                    setCriandoGrupo(false);
                    if (id && !selecionados.includes(id)) setSelecionados((s) => [...s, id]);
                  }}
                  aoCancelar={() => setCriandoGrupo(false)}
                />
              </div>
            )}
            {gruposMudaram && <p className="aviso">Mudanças nos grupos: clique em <strong>Salvar produto</strong> para aplicar.</p>}
          </section>

          <section className={`grade cd-secao cd-promo ${promoOn ? 'ligada' : ''}`} style={{ gap: '0.6rem' }}>
            <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Promoção (De / Por)</h3>
              <label className="interruptor forte">
                <input type="checkbox" name="promo_ligada" checked={promoOn} onChange={(e) => setPromoOn(e.target.checked)} /> {promoOn ? 'Ligada' : 'Desligada'}
              </label>
            </div>
            {promoOn && (
              <>
                <div className="linha" style={{ alignItems: 'flex-end' }}>
                  <label style={{ flex: '1 1 9rem' }}>
                    Preço da promoção (R$)
                    <input type="text" name="promo_preco" inputMode="decimal" value={promoTxt} onChange={(e) => setPromoTxt(e.target.value)} placeholder="0,00" className="cd-promo-preco" />
                  </label>
                  <p style={{ margin: '0 0 0.55rem', flex: '2 1 14rem' }}>
                    {de != null && por != null && por < de ? (
                      <>Cliente vê <s className="dica">{formatarReais(de)}</s> <strong>{formatarReais(por)}</strong> · <strong>{percentualDesconto(de, por)}% off</strong></>
                    ) : (
                      <span className="dica">Coloque um valor menor que o preço normal{de != null ? ` (${formatarReais(de)})` : ''}.</span>
                    )}
                  </p>
                </div>
                <div className="grade" style={{ gap: '0.35rem' }}>
                  <span className="dica">Dias da semana</span>
                  <div className="linha" style={{ gap: '0.35rem' }}>
                    {DIAS_CURTOS.map((d, i) => (
                      <label key={d} className={`cd-dia ${dias.includes(i) ? 'on' : ''}`}>
                        <input type="checkbox" name="promo_dia" value={i} checked={dias.includes(i)} onChange={(e) => setDias(e.target.checked ? [...dias, i].sort() : dias.filter((x) => x !== i))} />
                        {d}
                      </label>
                    ))}
                    <button type="button" className="mini" onClick={() => setDias([0, 1, 2, 3, 4, 5, 6])}>Todos</button>
                  </div>
                </div>
                <div className="linha" style={{ alignItems: 'center', gap: '0.5rem' }}>
                  <label className="interruptor">
                    <input type="checkbox" name="promo_horario" checked={horario} onChange={(e) => setHorario(e.target.checked)} /> Só num horário
                  </label>
                  {horario && (
                    <>
                      <input type="time" name="promo_inicio" value={inicio} onChange={(e) => setInicio(e.target.value)} aria-label="Começa às" style={{ width: '7.5rem' }} />
                      <span>às</span>
                      <input type="time" name="promo_fim" value={fim} onChange={(e) => setFim(e.target.value)} aria-label="Termina às" style={{ width: '7.5rem' }} />
                    </>
                  )}
                  <label className="linha" style={{ alignItems: 'center', gap: '0.35rem', marginLeft: 'auto' }}>
                    <span className="dica">Termina em</span>
                    <input type="date" name="promo_ate" value={ate} onChange={(e) => setAte(e.target.value)} style={{ width: '10rem' }} />
                  </label>
                </div>
                <p className="dica" style={{ margin: 0 }}>
                  {resumoAgenda(agendaAgora)}
                  {horario && fim <= inicio && ' (passa da meia-noite)'}
                  {situacao === 'valendo' && ' · valendo agora'}
                  {situacao === 'fora' && ' · fora do horário agora'}
                </p>
              </>
            )}
          </section>

          <details className="cd-secao">
            <summary><strong>Preço diferente no delivery ou no salão</strong> <span className="dica">(opcional)</span></summary>
            <p className="dica" style={{ margin: '0.4rem 0' }}>Vazio = usa o preço normal. A promoção, quando ligada, vale nos dois.</p>
            {marcas.map((m) => (
              <div key={m.id} className="linha">
                <input type="hidden" name="marca" value={m.id} />
                {marcas.length > 1 && <span className="dica" style={{ minWidth: '7rem', alignSelf: 'center' }}>{m.nome}</span>}
                <label style={{ flex: '1 1 6rem' }}>Delivery<input type="text" name={`preco_delivery_${m.id}`} inputMode="decimal" defaultValue={reais(pm(m.id)?.preco_delivery)} /></label>
                <label style={{ flex: '1 1 6rem' }}>Salão<input type="text" name={`preco_presencial_${m.id}`} inputMode="decimal" defaultValue={reais(pm(m.id)?.preco_presencial)} /></label>
              </div>
            ))}
          </details>

          {erro && <p className="erro" role="alert">{erro}</p>}
          {ok && <p className="dica" role="status">{ok}</p>}
          <div className="gaveta-acoes">
            <button className="botao-primario" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar produto'}</button>
            <button type="button" onClick={aoFechar}>Fechar</button>
          </div>
        </>
      )}
    </form>
  );
}
