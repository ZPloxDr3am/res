'use client';
import { useState, useTransition } from 'react';
import { excluirSetor, mover } from '@/app/(painel)/cardapio/actions';
import { salvando } from '@/components/tempo-real';
import { FormSetor } from '@/components/form-setor';
import { BotaoExcluir } from '@/components/botao-excluir';
import type { SetorRow } from '@/lib/cardapio-dados';

export function SetorCabecalho({
  setor,
  quantidade,
  marcas,
  primeiro,
  ultimo,
}: {
  setor: SetorRow;
  quantidade: number;
  marcas: { id: string; nome: string }[];
  primeiro: boolean;
  ultimo: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const subirDescer = (d: -1 | 1) =>
    iniciar(async () => {
      const r = await salvando(mover('setores', setor.id, d));
      setErro(r.ok ? null : r.erro);
    });

  return (
    <div className="grade" style={{ gap: '0.5rem' }}>
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>
          {setor.nome} <span className="dica">({quantidade})</span>
          {setor.nome_publico && <span className="dica"> · no cardápio: {setor.nome_publico}</span>}
        </h2>
        <div className="linha" style={{ alignItems: 'center', gap: '0.35rem' }}>
          {setor.delivery && <span className="selo selo-delivery">Delivery</span>}
          {setor.presencial && <span className="selo selo-presencial">Presencial</span>}
          {!setor.delivery && !setor.presencial && <span className="selo">Oculto nos canais</span>}
          <button type="button" className="mini" aria-label="Subir setor" disabled={primeiro || pendente} onClick={() => subirDescer(-1)}>↑</button>
          <button type="button" className="mini" aria-label="Descer setor" disabled={ultimo || pendente} onClick={() => subirDescer(1)}>↓</button>
          <button type="button" onClick={() => setEditando(!editando)}>{editando ? 'Fechar' : 'Editar setor'}</button>
          <BotaoExcluir
            rotulo="Excluir setor"
            confirmacao={`Excluir o setor "${setor.nome}"? Os produtos dele ficarão sem setor.`}
            acao={() => excluirSetor(setor.id)}
          />
        </div>
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}
      {editando && (
        <div className="cartao">
          <FormSetor
            marcas={marcas}
            inicial={{
              id: setor.id,
              nome: setor.nome,
              nomePublico: setor.nome_publico,
              delivery: setor.delivery,
              presencial: setor.presencial,
              marcas: setor.setor_marcas.map((m) => m.marca_id),
            }}
            aoTerminar={() => setEditando(false)}
          />
        </div>
      )}
    </div>
  );
}
