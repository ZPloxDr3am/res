'use client';
import { useEffect, useState, useTransition } from 'react';
import { importarDe, listarCardapioDe, type CategoriaOrigem } from '@/app/(painel)/cardapio/actions';
import { salvando } from '@/components/tempo-real';

/** Traz categorias (com produtos, fotos, preços e grupos de opções) de outra loja do grupo. */
export function ImportarCardapio({ lojas, aoFechar }: { lojas: { id: string; nome: string }[]; aoFechar: () => void }) {
  const [origem, setOrigem] = useState(lojas[0]?.id ?? '');
  const [categorias, setCategorias] = useState<CategoriaOrigem[] | null>(null);
  const [marcas, setMarcas] = useState<{ id: string; nome: string }[]>([]);
  const [marca, setMarca] = useState('');
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const [carregando, iniciarCarga] = useTransition();
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    if (!origem) return;
    setCategorias(null);
    setFeito(null);
    iniciarCarga(async () => {
      const r = await listarCardapioDe(origem);
      if (!r.ok) return setErro(r.erro);
      setErro(null);
      setCategorias(r.categorias);
      setMarcas(r.marcas);
      setMarca(r.marcas[0]?.id ?? '');
      setMarcadas(new Set(r.categorias.map((c) => c.id)));
    });
  }, [origem]);

  const alternar = (id: string) => setMarcadas((m) => { const n = new Set(m); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const total = (categorias ?? []).filter((c) => marcadas.has(c.id)).reduce((s, c) => s + c.produtos.length, 0);

  return (
    <div className="grade">
      <p className="dica" style={{ margin: 0 }}>
        Copia as categorias escolhidas para esta loja, com produtos, fotos, preços e grupos de opções. É uma cópia: depois cada loja muda o seu.
        Nada é barrado: se já existir categoria ou produto com o mesmo nome aqui, ele entra como "NOME-Cópia" para você revisar.
      </p>
      <div className="linha">
        <label style={{ flex: '1 1 12rem' }}>De qual loja
          <select value={origem} onChange={(e) => setOrigem(e.target.value)}>
            {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </label>
        {marcas.length > 1 && (
          <label style={{ flex: '1 1 12rem' }}>Usar preços da marca
            <select value={marca} onChange={(e) => setMarca(e.target.value)}>
              {marcas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </label>
        )}
      </div>
      {carregando && <p className="dica">Carregando…</p>}
      {categorias && categorias.length === 0 && <p className="dica">Essa loja ainda não tem categorias.</p>}
      {categorias && categorias.length > 0 && (
        <fieldset className="grade" style={{ gap: '0.35rem' }}>
          <legend className="linha" style={{ gap: '0.5rem', alignItems: 'center' }}>
            <strong>Categorias</strong>
            <button type="button" className="mini" onClick={() => setMarcadas(marcadas.size === categorias.length ? new Set() : new Set(categorias.map((c) => c.id)))}>
              {marcadas.size === categorias.length ? 'desmarcar todas' : 'marcar todas'}
            </button>
          </legend>
          {categorias.map((c) => (
            <label key={c.id} className="check" style={{ alignItems: 'flex-start' }}>
              <input type="checkbox" checked={marcadas.has(c.id)} onChange={() => alternar(c.id)} />
              <span className="grade" style={{ gap: '0.1rem' }}>
                <span>{c.nome} <span className="dica">({c.produtos.length})</span></span>
                {c.produtos.length > 0 && <span className="dica">{c.produtos.slice(0, 6).join(' · ')}{c.produtos.length > 6 ? ` · e mais ${c.produtos.length - 6}` : ''}</span>}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {erro && <p className="erro" role="alert">{erro}</p>}
      {feito && <p className="aviso" role="status">{feito}</p>}
      <div className="gaveta-acoes">
        <button
          type="button"
          className="botao-primario"
          disabled={pendente || carregando || marcadas.size === 0}
          onClick={() =>
            iniciar(async () => {
              const todas = categorias && marcadas.size === categorias.length;
              const r = await salvando(importarDe(origem, todas ? null : [...marcadas], marca || null));
              if (!r.ok) return setErro(r.erro);
              setErro(null);
              setFeito(
                `Pronto: ${r.produtos} produto(s) importado(s)` +
                  (r.categorias ? `, ${r.categorias} categoria(s) nova(s)` : '') +
                  (r.grupos ? `, ${r.grupos} grupo(s) de opções` : '') +
                  (r.renomeados ? `. ${r.renomeados} já existia(m) com o mesmo nome e entrou(aram) como "-Cópia"` : '') + '.',
              );
            })
          }
        >
          {pendente ? 'Importando…' : `Importar ${marcadas.size} categoria(s) · ${total} produto(s)`}
        </button>
        <button type="button" onClick={aoFechar}>{feito ? 'Fechar' : 'Cancelar'}</button>
      </div>
    </div>
  );
}
