'use client';
import { useState, useTransition } from 'react';
import { descreverSelecao, formatarReais, paraCentavos } from '@res/core';
import { nomeOpcao, type GrupoRow, type ProdutoRow } from '@/lib/cardapio-dados';
import { criarProduto, definirGruposDoProduto, salvarProduto } from '@/app/(painel)/cardapio/actions';
import { salvando } from '@/components/tempo-real';
import { FormGrupo } from '@/components/form-grupo';
import { FotoProduto } from './foto-produto';

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
      <section className="grade" style={{ gap: '0.6rem' }}>
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
            <input type="text" name="preco" inputMode="decimal" defaultValue={reais(produto?.preco)} placeholder="0,00" />
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
          <p className="dica" style={{ margin: 0 }}>Depois de criar você escolhe os grupos de opções, a foto e os preços por canal.</p>
        </>
      )}

      {produto && (
        <>
          <section className="grade" style={{ gap: '0.5rem' }}>
            <h3>Grupos de opções</h3>
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

          <section className="grade" style={{ gap: '0.5rem' }}>
            <h3>Preços por canal {marcas.length > 1 ? 'e marca' : ''} <span className="dica">(opcional)</span></h3>
            <p className="dica" style={{ margin: 0 }}>Vazio = usa o preço acima. O promocional vale em todos os canais.</p>
            {marcas.map((m) => (
              <div key={m.id} className="linha">
                <input type="hidden" name="marca" value={m.id} />
                {marcas.length > 1 && <span className="dica" style={{ minWidth: '7rem', alignSelf: 'center' }}>{m.nome}</span>}
                <label style={{ flex: '1 1 6rem' }}>Delivery<input type="text" name={`preco_delivery_${m.id}`} inputMode="decimal" defaultValue={reais(pm(m.id)?.preco_delivery)} /></label>
                <label style={{ flex: '1 1 6rem' }}>Salão<input type="text" name={`preco_presencial_${m.id}`} inputMode="decimal" defaultValue={reais(pm(m.id)?.preco_presencial)} /></label>
                <label style={{ flex: '1 1 6rem' }}>Promoção<input type="text" name={`preco_promocional_${m.id}`} inputMode="decimal" defaultValue={reais(pm(m.id)?.preco_promocional)} /></label>
              </div>
            ))}
          </section>

          <FotoProduto produtoId={produto.id} lojaId={lojaId} atual={produto.imagem_url} />

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
