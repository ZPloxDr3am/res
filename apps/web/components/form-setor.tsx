'use client';
import { salvando } from '@/components/tempo-real';
import { useState, useTransition } from 'react';
import { novoSetor, validarSetor, type SetorForm } from '@res/core';
import { salvarSetor } from '@/app/(painel)/cardapio/actions';

type Marca = { id: string; nome: string };

/** Formulário de setor. R-001: exige ao menos uma marca, sem reselecionar escondido. R-002: nasce em tudo. */
export function FormSetor({ marcas }: { marcas: Marca[] }) {
  const inicial = () => novoSetor(marcas.map((m) => m.id));
  const [s, setS] = useState<SetorForm>(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pendente, iniciar] = useTransition();
  const erros = validarSetor(s);

  const alternarMarca = (id: string) =>
    setS((x) => ({ ...x, marcas: x.marcas.includes(id) ? x.marcas.filter((m) => m !== id) : [...x.marcas, id] }));

  return (
    <form
      className="cartao grade"
      action={(fd) =>
        iniciar(async () => {
          setOk(false);
          const r = await salvando(salvarSetor(fd));
          if (r.ok) {
            setS(inicial());
            setErro(null);
            setOk(true);
          } else setErro(r.erro);
        })
      }
    >
      <h2>Novo setor</h2>
      <label>
        Nome
        <input type="text" name="nome" value={s.nome} onChange={(e) => setS({ ...s, nome: e.target.value })} maxLength={150} required />
      </label>
      <label>
        Nome no cardápio digital <span className="dica">(opcional)</span>
        <input type="text" name="nomePublico" value={s.nomePublico ?? ''} onChange={(e) => setS({ ...s, nomePublico: e.target.value })} maxLength={150} />
      </label>
      <fieldset className="linha">
        <legend>Canais</legend>
        <label className="check">
          <input type="checkbox" name="delivery" checked={s.delivery} onChange={(e) => setS({ ...s, delivery: e.target.checked })} /> Delivery
        </label>
        <label className="check">
          <input type="checkbox" name="presencial" checked={s.presencial} onChange={(e) => setS({ ...s, presencial: e.target.checked })} /> Presencial
        </label>
      </fieldset>
      {!s.delivery && !s.presencial && <p className="dica">Sem canais, o setor fica escondido do cardápio e da tela de pedidos.</p>}
      <fieldset className="linha">
        <legend>Marcas</legend>
        {marcas.map((m) => (
          <label key={m.id} className="check">
            <input type="checkbox" name="marcas" value={m.id} checked={s.marcas.includes(m.id)} onChange={() => alternarMarca(m.id)} /> {m.nome}
          </label>
        ))}
      </fieldset>
      {s.marcas.length === 0 && <p className="erro">O setor precisa estar em pelo menos uma marca.</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}
      {ok && <p className="dica" role="status">Setor criado.</p>}
      <button className="botao-primario" disabled={pendente || erros.length > 0}>
        {pendente ? 'Salvando…' : 'Criar setor'}
      </button>
    </form>
  );
}
