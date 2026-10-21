import { contextoLoja } from '@/lib/loja';
import { carregarCardapio } from '@/lib/cardapio';
import { FormSetor } from '@/components/form-setor';
import { FormProduto } from '@/components/form-produto';
import { TempoReal } from '@/components/tempo-real';
import { SetorCabecalho } from '@/components/setor-cabecalho';
import { ProdutoCartao } from '@/components/produto-cartao';

export const dynamic = 'force-dynamic';

export default async function Cardapio() {
  const ctx = await contextoLoja();
  const { setores, produtos, grupos, usos } = await carregarCardapio(ctx.lojaId);

  const listaSetores = setores.map((s) => ({ id: s.id, nome: s.nome }));
  const gruposDaLoja = Object.values(grupos)
    .map((g) => ({ id: g.id, nome: g.nome, opcoes: g.opcoes.length }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const semSetor = produtos.filter((p) => p.setor_id === null);
  const blocos = [
    ...setores.map((s, i) => ({ setor: s, indice: i, itens: produtos.filter((p) => p.setor_id === s.id) })),
    ...(semSetor.length ? [{ setor: null, indice: -1, itens: semSetor }] : []),
  ];

  return (
    <div className="grade">
      <TempoReal lojaId={ctx.lojaId} />
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Cardápio</h1>
        <span className="dica">
          {setores.length} setores · {produtos.length} produtos · {gruposDaLoja.length} grupos de opções
        </span>
      </div>
      <div className="grade grade-2">
        <aside className="grade" style={{ alignContent: 'start' }}>
          <FormSetor marcas={ctx.marcas} />
          <FormProduto setores={listaSetores} />
        </aside>

        <section className="grade" aria-label="Setores e produtos" style={{ alignContent: 'start' }}>
          {blocos.length === 0 && <p className="cartao dica">Comece criando um setor (ex.: Pizzas) e depois os produtos.</p>}
          {blocos.map(({ setor, indice, itens }) => (
            <div key={setor?.id ?? 'sem-setor'} className="cartao grade">
              {setor ? (
                <SetorCabecalho setor={setor} quantidade={itens.length} marcas={ctx.marcas} primeiro={indice === 0} ultimo={indice === setores.length - 1} />
              ) : (
                <h2>
                  Sem setor <span className="dica">({itens.length})</span>
                </h2>
              )}
              <ul className="lista">
                {itens.map((p, i) => (
                  <ProdutoCartao
                    key={p.id}
                    produto={p}
                    setores={listaSetores}
                    marcas={ctx.marcas}
                    grupos={p.produto_grupos.map((pg) => grupos[pg.grupo_id]).filter((g) => g !== undefined)}
                    usos={usos}
                    gruposDaLoja={gruposDaLoja}
                    lojaId={ctx.lojaId}
                    primeiro={i === 0}
                    ultimo={i === itens.length - 1}
                  />
                ))}
                {itens.length === 0 && <li className="dica">Nenhum produto neste setor.</li>}
              </ul>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
