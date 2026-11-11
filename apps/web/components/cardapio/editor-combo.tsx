'use client';
import { useMemo, useState, useTransition } from 'react';
import { formatarReais, paraCentavos, precoSeparado } from '@res/core';
import { passosCore, type Cardapio, type ProdutoRow } from '@/lib/cardapio-dados';
import { salvarCombo, type PassoForm } from '@/app/(painel)/cardapio/actions';
import { salvando } from '@/components/tempo-real';
import { AreaFoto } from './foto-produto';

type Passo = PassoForm & { chave: number; modo: 'categoria' | 'produtos' };

const reais = (v: number | null | undefined) => (v == null ? '' : Number(v).toFixed(2).replace('.', ','));
const lerCentavos = (t: string): number | null => {
  const s = t.trim().replace(/\s|R\$/g, '');
  if (!s) return null;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};

/** Montar combo: nome, foto, preço e o que o cliente escolhe em cada passo (D-022). */
export function EditorCombo({
  cardapio,
  combo,
  marcaId,
  lojaId,
  setorInicial,
  aoFechar,
  aoCriar,
}: {
  cardapio: Cardapio;
  combo: ProdutoRow | null;
  marcaId: string;
  lojaId: string;
  setorInicial: string | null;
  aoFechar: () => void;
  aoCriar: (id: string) => void;
}) {
  const { setores, produtos } = cardapio;
  const vendaveis = useMemo(() => produtos.filter((p) => !p.combo), [produtos]);
  const setorCombos = setores.find((s) => /combo/i.test(s.nome))?.id ?? null;
  const [nome, setNome] = useState(combo?.nome ?? '');
  const [descricao, setDescricao] = useState(combo?.descricao ?? '');
  const [precoTxt, setPrecoTxt] = useState(reais(combo?.preco));
  const [setor, setSetor] = useState<string>(combo ? combo.setor_id ?? '' : setorInicial ?? setorCombos ?? '');
  const [passos, setPassos] = useState<Passo[]>(() =>
    combo && cardapio.passos[combo.id]?.length
      ? cardapio.passos[combo.id]!.map((p, i) => ({ chave: i, titulo: p.titulo, quantidade: p.quantidade, setorId: p.setor_id, produtos: p.produtos, modo: p.setor_id ? 'categoria' : 'produtos' }))
      : [{ chave: 0, titulo: '', quantidade: 1, setorId: null, produtos: [], modo: 'produtos' }],
  );
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const preco = lerCentavos(precoTxt);
  const mudar = (chave: number, x: Partial<Passo>) => setPassos((ps) => ps.map((p) => (p.chave === chave ? { ...p, ...x } : p)));

  // "separado sairia": o mais barato de cada passo
  const separado = useMemo(() => {
    const falso: Cardapio = {
      ...cardapio,
      passos: { x: passos.map((p, i) => ({ id: String(i), combo_id: 'x', ordem: i, titulo: p.titulo, quantidade: p.quantidade, setor_id: p.modo === 'categoria' ? p.setorId : null, produtos: p.modo === 'produtos' ? p.produtos : [] })) },
    };
    return precoSeparado(passosCore(falso, 'x'), marcaId, 'delivery');
  }, [cardapio, passos, marcaId]);
  const economia = preco != null && separado > preco ? separado - preco : 0;
  // pizza no combo sem grupo de sabores: o cliente não escolheria sabor
  const semSabores = [
    ...new Set(
      passos.flatMap((p) =>
        (p.modo === 'produtos' ? vendaveis.filter((x) => p.produtos.includes(x.id)) : vendaveis.filter((x) => x.setor_id === p.setorId))
          .filter((x) => x.produto_grupos.length === 0 && /pizza/i.test(x.nome))
          .map((x) => x.nome),
      ),
    ),
  ];

  const salvar = () =>
    iniciar(async () => {
      setOk(null);
      if (preco == null) return setErro('Informe o preço do combo (ex.: 99,90).');
      const r = await salvando(
        salvarCombo(combo?.id ?? null, {
          nome,
          descricao,
          preco,
          setorId: setor || null,
          passos: passos.map((p) => ({
            titulo: p.titulo,
            quantidade: p.quantidade,
            setorId: p.modo === 'categoria' ? p.setorId : null,
            produtos: p.modo === 'produtos' ? p.produtos : [],
          })),
        }),
      );
      if (!r.ok) return setErro(r.erro);
      setErro(null);
      if (!combo && r.id) return aoCriar(r.id);
      setOk('Combo salvo.');
    });

  return (
    <div className="grade">
      {combo ? (
        <AreaFoto produtoId={combo.id} lojaId={lojaId} atual={combo.imagem_url} grande rotulo={combo.nome} />
      ) : (
        <p className="dica" style={{ margin: 0 }}>Depois de criar, você coloca a foto do combo.</p>
      )}

      <section className="grade cd-secao" style={{ gap: '0.6rem' }}>
        <h3>O combo</h3>
        <label>
          Nome do combo
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={150} placeholder="Ex.: Combo Família" />
        </label>
        <label>
          Descrição <span className="dica">(o cliente vê)</span>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={1000} placeholder="Ex.: Pizza Gigante + Refrigerante 2L à escolha" />
        </label>
        <label>
          Aparece na categoria
          <select value={setor} onChange={(e) => setSetor(e.target.value)}>
            <option value="">Sem categoria</option>
            {setores.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
          {!setorCombos && <span className="dica">Dica: crie uma categoria &quot;Combos&quot; para eles aparecerem juntos no cardápio.</span>}
        </label>
      </section>

      <section className="grade cd-secao" style={{ gap: '0.6rem' }}>
        <h3>O que vem no combo</h3>
        <p className="dica" style={{ margin: 0 }}>Cada linha é uma escolha do cliente. Sabores, bordas e adicionais do produto continuam valendo (o que for cobrado a mais soma no combo).</p>
        {passos.map((p, i) => (
          <div key={p.chave} className="cd-passo">
            <div className="linha" style={{ alignItems: 'center', gap: '0.5rem' }}>
              <span className="cd-passo-n" aria-hidden="true">{i + 1}</span>
              <label style={{ flex: '2 1 12rem' }}>
                <span className="sr">Título da escolha {i + 1}</span>
                <input value={p.titulo} onChange={(e) => mudar(p.chave, { titulo: e.target.value })} maxLength={80} placeholder={i === 0 ? 'Ex.: Escolha a pizza' : 'Ex.: Escolha o refri 2L'} />
              </label>
              <label className="linha" style={{ alignItems: 'center', gap: '0.3rem' }}>
                <span className="dica">Quantos</span>
                <input type="number" min={1} max={10} value={p.quantidade} onChange={(e) => mudar(p.chave, { quantidade: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} style={{ width: '4.5rem' }} />
              </label>
              <button type="button" className="mini" disabled={passos.length === 1} onClick={() => setPassos((ps) => ps.filter((x) => x.chave !== p.chave))}>Tirar</button>
            </div>
            <div className="linha" style={{ gap: '0.5rem', alignItems: 'center' }}>
              <label className="check"><input type="radio" checked={p.modo === 'produtos'} onChange={() => mudar(p.chave, { modo: 'produtos' })} /> Escolher produtos</label>
              <label className="check"><input type="radio" checked={p.modo === 'categoria'} onChange={() => mudar(p.chave, { modo: 'categoria' })} /> Qualquer um da categoria</label>
            </div>
            {p.modo === 'categoria' ? (
              <select value={p.setorId ?? ''} onChange={(e) => mudar(p.chave, { setorId: e.target.value || null })} aria-label="Categoria">
                <option value="">Escolha a categoria</option>
                {setores.map((s) => <option key={s.id} value={s.id}>{s.nome} ({vendaveis.filter((x) => x.setor_id === s.id).length})</option>)}
              </select>
            ) : (
              <div className="cd-passo-produtos">
                {setores.map((s) => {
                  const lista = vendaveis.filter((x) => x.setor_id === s.id);
                  if (lista.length === 0) return null;
                  return (
                    <fieldset key={s.id}>
                      <legend className="dica">{s.nome}</legend>
                      {lista.map((x) => (
                        <label key={x.id} className="check">
                          <input
                            type="checkbox"
                            checked={p.produtos.includes(x.id)}
                            onChange={(e) => mudar(p.chave, { produtos: e.target.checked ? [...p.produtos, x.id] : p.produtos.filter((y) => y !== x.id) })}
                          />
                          {x.nome} <span className="dica">{x.preco == null ? '' : formatarReais(paraCentavos(Number(x.preco)))}</span>
                          {x.produto_grupos.length === 0 && /pizza/i.test(x.nome) && <span className="cd-aviso-mini" title="Esse produto não tem grupo de sabores: no combo o cliente não escolhe sabor">sem sabores</span>}
                        </label>
                      ))}
                    </fieldset>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {semSabores.length > 0 && (
          <p className="aviso" style={{ margin: 0 }}>
            {semSabores.join(', ')} não {semSabores.length === 1 ? 'tem' : 'têm'} grupo de sabores — no combo o cliente não vai escolher o sabor. Aplique o grupo &quot;Sabores&quot; nesses produtos (Cardápio → Grupos de opções → Escolher produtos).
          </p>
        )}
        <button type="button" style={{ justifySelf: 'start' }} disabled={passos.length >= 10} onClick={() => setPassos((ps) => [...ps, { chave: Date.now(), titulo: '', quantidade: 1, setorId: null, produtos: [], modo: 'produtos' }])}>
          + Outra escolha
        </button>
      </section>

      <section className="grade cd-secao cd-combo-preco" style={{ gap: '0.5rem' }}>
        <h3>Preço</h3>
        <div className="linha" style={{ alignItems: 'flex-end' }}>
          <label style={{ flex: '1 1 9rem' }}>
            Preço do combo (R$)
            <input inputMode="decimal" value={precoTxt} onChange={(e) => setPrecoTxt(e.target.value)} placeholder="0,00" className="cd-promo-preco" />
          </label>
          <p style={{ margin: '0 0 0.55rem', flex: '2 1 14rem' }}>
            {separado > 0 && <>Separado sairia a partir de <s className="dica">{formatarReais(separado)}</s>. </>}
            {economia > 0 && <strong>O cliente economiza {formatarReais(economia)}.</strong>}
          </p>
        </div>
      </section>

      {erro && <p className="erro" role="alert">{erro}</p>}
      {ok && <p className="dica" role="status">{ok}</p>}
      <div className="gaveta-acoes">
        <button type="button" className="botao-primario" disabled={pendente} onClick={salvar}>{pendente ? 'Salvando…' : combo ? 'Salvar combo' : 'Criar combo'}</button>
        <button type="button" onClick={aoFechar}>Fechar</button>
      </div>
    </div>
  );
}
