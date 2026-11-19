'use client';
import { useId, useMemo, useRef, useState } from 'react';
import type { Insumo } from '@/lib/estoque';

/** Sem acento e em minúsculas: "Açúcar" acha "acucar". */
const simples = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Campo de insumo com busca (ficha técnica): digita parte do nome (ou da categoria) e escolhe na lista.
 * Teclado: ↓/↑ andam, Enter escolhe, Esc fecha. Já escolhidos em outras linhas aparecem marcados.
 */
export function BuscaInsumo({
  insumos,
  valor,
  aoEscolher,
  usados = [],
}: {
  insumos: Insumo[];
  valor: string;
  aoEscolher: (id: string) => void;
  usados?: string[];
}) {
  const id = useId();
  const atual = insumos.find((i) => i.id === valor) ?? null;
  const [texto, setTexto] = useState<string | null>(null); // null = mostrando o escolhido
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const lista = useRef<HTMLUListElement>(null);

  const termo = simples(texto ?? '');
  const achados = useMemo(() => {
    const base = termo
      ? insumos.filter((i) => simples(i.nome).includes(termo) || simples(i.categoria ?? '').includes(termo))
      : insumos;
    // começa com o termo primeiro, depois o resto, cada parte em ordem alfabética
    return [...base]
      .sort((a, b) => Number(!simples(a.nome).startsWith(termo)) - Number(!simples(b.nome).startsWith(termo)) || a.nome.localeCompare(b.nome, 'pt-BR'))
      .slice(0, 50);
  }, [insumos, termo]);

  const escolher = (i: Insumo) => {
    aoEscolher(i.id);
    setTexto(null);
    setAberto(false);
  };
  const mover = (d: number) => {
    const novo = Math.max(0, Math.min(achados.length - 1, ativo + d));
    setAtivo(novo);
    lista.current?.querySelectorAll('li')[novo]?.scrollIntoView({ block: 'nearest' });
  };

  return (
    <div className="busca-insumo" style={{ flex: '1 1 auto', minWidth: 0, position: 'relative' }}>
      <input
        type="text"
        role="combobox"
        aria-label="Insumo"
        aria-expanded={aberto}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        aria-activedescendant={aberto && achados[ativo] ? `${id}-${achados[ativo].id}` : undefined}
        autoComplete="off"
        placeholder="Digite para buscar o insumo…"
        value={texto ?? atual?.nome ?? ''}
        onFocus={(e) => {
          setAberto(true);
          setAtivo(0);
          e.currentTarget.select();
        }}
        onChange={(e) => {
          setTexto(e.target.value);
          setAberto(true);
          setAtivo(0);
          if (e.target.value === '' && valor) aoEscolher('');
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); if (!aberto) setAberto(true); else mover(1); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1); }
          else if (e.key === 'Enter' && aberto) { e.preventDefault(); if (achados[ativo]) escolher(achados[ativo]); }
          else if (e.key === 'Escape') { setAberto(false); setTexto(null); }
        }}
        onBlur={() => {
          // deixa o clique na lista acontecer antes de fechar
          setTimeout(() => { setAberto(false); setTexto(null); }, 120);
        }}
      />
      {aberto && (
        <ul ref={lista} id={`${id}-lista`} role="listbox" aria-label="Insumos encontrados" className="busca-insumo-lista">
          {achados.length === 0 ? (
            <li className="busca-insumo-vazio" aria-disabled="true">Nenhum insumo com “{texto}”. Cadastre em Insumos.</li>
          ) : (
            achados.map((i, k) => (
              <li
                key={i.id}
                id={`${id}-${i.id}`}
                role="option"
                aria-selected={k === ativo}
                className={k === ativo ? 'ativo' : undefined}
                onMouseDown={(e) => { e.preventDefault(); escolher(i); }}
                onMouseEnter={() => setAtivo(k)}
              >
                <span className="busca-insumo-nome">{i.nome}</span>
                <span className="busca-insumo-info">
                  {i.unidade.toLowerCase()}
                  {i.categoria ? ` · ${i.categoria}` : ''}
                  {usados.includes(i.id) && i.id !== valor ? ' · já na ficha' : ''}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
