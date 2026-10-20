import { formatarReais, paraCentavos } from '@res/core';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { FormSetor } from '@/components/form-setor';
import { FormProduto } from '@/components/form-produto';
import { FormGrupo } from '@/components/form-grupo';
import { Disponibilidade } from '@/components/disponibilidade';
import { TempoReal } from '@/components/tempo-real';
import { BotaoExcluir } from '@/components/botao-excluir';
import { excluirProduto, excluirSetor } from './actions';

export const dynamic = 'force-dynamic';

type ProdutoLinha = {
  id: string;
  nome: string;
  preco: number | null;
  setor_id: string | null;
  produto_marcas: { marca_id: string; ativo: boolean; delivery: boolean; presencial: boolean; totem: boolean }[];
  produto_grupos: {
    grupo_id: string;
    grupos_opcoes: { id: string; nome: string; formacao: string; obrigatorio: boolean; pizza: boolean; min_qtd: number; max_qtd: number; opcoes: { id: string }[] } | null;
  }[];
};

export default async function Cardapio() {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();

  const [{ data: setores }, { data: produtos }] = await Promise.all([
    supabase
      .from('setores')
      .select('id, nome, nome_publico, delivery, presencial, ordem, setor_marcas(marca_id)')
      .eq('loja_id', ctx.lojaId)
      .order('ordem'),
    supabase
      .from('produtos')
      .select('id, nome, preco, setor_id, produto_marcas(marca_id, ativo, delivery, presencial, totem), produto_grupos(grupo_id, grupos_opcoes(id, nome, formacao, obrigatorio, pizza, min_qtd, max_qtd, opcoes(id)))')
      .eq('loja_id', ctx.lojaId)
      .order('ordem'),
  ]);

  const lista = (produtos ?? []) as unknown as ProdutoLinha[];
  const grupos = [...(setores ?? []).map((s) => ({ ...s, id: s.id as string | null })), { id: null, nome: 'Sem setor', nome_publico: null, delivery: true, presencial: true, ordem: 9999, setor_marcas: [] }];

  return (
    <div className="grade">
      <TempoReal lojaId={ctx.lojaId} />
      <h1>Cardápio</h1>
      <div className="grade grade-2">
        <aside className="grade" style={{ alignContent: 'start' }}>
          <FormSetor marcas={ctx.marcas} />
          <FormProduto setores={(setores ?? []).map((s) => ({ id: s.id, nome: s.nome }))} />
        </aside>

        <section className="grade" aria-label="Setores e produtos">
          {grupos.map((s) => {
            const itens = lista.filter((p) => p.setor_id === s.id);
            if (s.id === null && itens.length === 0) return null;
            return (
              <div key={s.id ?? 'sem-setor'} className="cartao grade">
                <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2>
                    {s.nome}{' '}
                    <span className="dica">({itens.length})</span>
                  </h2>
                  {s.id && (
                    <div className="linha" style={{ alignItems: 'center' }}>
                      {s.delivery && <span className="selo selo-delivery">Delivery</span>}
                      {s.presencial && <span className="selo selo-presencial">Presencial</span>}
                      {!s.delivery && !s.presencial && <span className="selo">Oculto nos canais</span>}
                      <BotaoExcluir
                        rotulo="Excluir setor"
                        confirmacao={`Excluir o setor "${s.nome}"? Os produtos dele ficarão sem setor.`}
                        acao={excluirSetor.bind(null, s.id)}
                      />
                    </div>
                  )}
                </div>
                <ul className="lista">
                  {itens.map((p) => (
                    <li key={p.id} className="item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                      <div className="linha" style={{ justifyContent: 'space-between' }}>
                        <span className="item-titulo">{p.nome}</span>
                        <span>{p.preco == null ? '—' : formatarReais(paraCentavos(Number(p.preco)))}</span>
                      </div>
                      <Disponibilidade produtoId={p.id} marcas={ctx.marcas} estado={p.produto_marcas} />
                      {p.produto_grupos.length > 0 && (
                        <div className="linha">
                          {p.produto_grupos.map(({ grupos_opcoes: g }) =>
                            g ? (
                              <span key={g.id} className={`selo ${g.pizza ? 'selo-pizza' : ''}`}>
                                {g.nome} · {g.min_qtd}–{g.max_qtd} · {g.formacao} · {g.opcoes.length} opções
                              </span>
                            ) : null,
                          )}
                        </div>
                      )}
                      <details>
                        <summary className="dica">Adicionar grupo de opções</summary>
                        <FormGrupo produtoId={p.id} precoProduto={p.preco == null ? 0 : paraCentavos(Number(p.preco))} />
                      </details>
                      <div className="linha" style={{ justifyContent: 'flex-end' }}>
                        <BotaoExcluir
                          rotulo="Excluir produto"
                          confirmacao={`Excluir o produto "${p.nome}"? Esta ação não pode ser desfeita.`}
                          acao={excluirProduto.bind(null, p.id)}
                        />
                      </div>
                    </li>
                  ))}
                  {itens.length === 0 && <li className="dica">Nenhum produto neste setor.</li>}
                </ul>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
