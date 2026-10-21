'use client';
import { useMemo, useState, useTransition } from 'react';
import type { GrupoRow, ProdutoRow, SetorRow } from '@/lib/cardapio-dados';
import { definirProdutosDoGrupo } from '@/app/(painel)/cardapio/actions';
import { salvando } from '@/components/tempo-real';

/** Marca em quais produtos o grupo aparece, com atalho "todos da categoria". */
export function AplicarGrupo({
  grupo,
  setores,
  produtos,
  aoFechar,
}: {
  grupo: GrupoRow;
  setores: SetorRow[];
  produtos: ProdutoRow[];
  aoFechar: () => void;
}) {
  const inicial = useMemo(() => new Set(produtos.filter((p) => p.produto_grupos.some((pg) => pg.grupo_id === grupo.id)).map((p) => p.id)), [produtos, grupo.id]);
  const [marcados, setMarcados] = useState<Set<string>>(() => new Set(inicial));
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const blocos = [
    ...setores.map((s) => ({ id: s.id, nome: s.nome, itens: produtos.filter((p) => p.setor_id === s.id) })),
    { id: 'sem', nome: 'Sem categoria', itens: produtos.filter((p) => p.setor_id === null) },
  ]
    .map((b) => ({ ...b, itens: b.itens.filter((p) => !busca.trim() || p.nome.toLowerCase().includes(busca.trim().toLowerCase())) }))
    .filter((b) => b.itens.length > 0);

  const alternar = (id: string) => setMarcados((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const todos = (ids: string[], marcar: boolean) => setMarcados((m) => { const n = new Set(m); for (const id of ids) if (marcar) n.add(id); else n.delete(id); return n; });

  const entram = [...marcados].filter((id) => !inicial.has(id)).length;
  const saem = [...inicial].filter((id) => !marcados.has(id)).length;

  return (
    <div className="grade">
      <p className="dica" style={{ margin: 0 }}>Marque os produtos que devem ter <strong>{grupo.nome}</strong>. Use "todos" para aplicar na categoria inteira.</p>
      <input type="search" placeholder="Buscar produto…" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar produto" />
      {blocos.map((b) => {
        const ids = b.itens.map((p) => p.id);
        const todosMarcados = ids.every((id) => marcados.has(id));
        return (
          <fieldset key={b.id} className="grade" style={{ gap: '0.3rem' }}>
            <legend className="linha" style={{ gap: '0.5rem', alignItems: 'center' }}>
              <strong>{b.nome}</strong>
              <button type="button" className="mini" onClick={() => todos(ids, !todosMarcados)}>{todosMarcados ? 'desmarcar todos' : 'marcar todos'}</button>
            </legend>
            {b.itens.map((p) => (
              <label key={p.id} className="check">
                <input type="checkbox" checked={marcados.has(p.id)} onChange={() => alternar(p.id)} /> {p.nome}
              </label>
            ))}
          </fieldset>
        );
      })}
      {erro && <p className="erro" role="alert">{erro}</p>}
      <div className="gaveta-acoes">
        <button
          type="button"
          className="botao-primario"
          disabled={pendente || (entram === 0 && saem === 0)}
          onClick={() =>
            iniciar(async () => {
              const r = await salvando(definirProdutosDoGrupo(grupo.id, [...marcados]));
              if (!r.ok) return setErro(r.erro);
              aoFechar();
            })
          }
        >
          {pendente ? 'Aplicando…' : `Aplicar${entram ? ` · +${entram}` : ''}${saem ? ` · −${saem}` : ''}`}
        </button>
        <button type="button" onClick={aoFechar}>Cancelar</button>
        <span className="dica">{marcados.size} produto(s) com este grupo</span>
      </div>
    </div>
  );
}
