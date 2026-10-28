'use client';
import { useState, useTransition } from 'react';
import { salvarDetalheOpcao } from '@/app/(painel)/cardapio/actions';
import { salvando } from '@/components/tempo-real';

/** Ingredientes e selo da opção (D-046). "Mais pedido" é automático, pelas vendas. */
export function DetalheOpcao({ opcaoId, descricao, selo }: { opcaoId: string; descricao: string | null; selo: string | null }) {
  const [aberto, setAberto] = useState(false);
  const [d, setD] = useState(descricao ?? '');
  const [s, setS] = useState(selo ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const tem = !!(descricao || selo);
  return (
    <span className="do">
      <button type="button" className="mini" aria-expanded={aberto} title="Ingredientes e selo" onClick={() => setAberto(!aberto)}>{tem ? '📝' : '+ Detalhes'}</button>
      {aberto && (
        <span className="do-caixa">
          <label>Ingredientes<input value={d} maxLength={200} onChange={(e) => setD(e.target.value)} placeholder="mussarela, calabresa, cebola e orégano" /></label>
          <label>Selo
            <select value={s} onChange={(e) => setS(e.target.value)}>
              <option value="">Nenhum</option>
              <option value="recomendado">⭐ Recomendado</option>
              <option value="novo">✨ Novo</option>
            </select>
          </label>
          <span className="dica">"🔥 Mais pedido" aparece sozinho nas 3 opções mais vendidas do grupo.</span>
          <span className="linha" style={{ alignItems: 'center' }}>
            <button
              type="button"
              className="botao-primario mini"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  const r = await salvando(salvarDetalheOpcao(opcaoId, d, s || null));
                  setMsg(r.ok ? 'Salvo.' : r.erro);
                  if (r.ok) setAberto(false);
                })
              }
            >
              Salvar
            </button>
            {msg && <span className="dica">{msg}</span>}
          </span>
        </span>
      )}
    </span>
  );
}
