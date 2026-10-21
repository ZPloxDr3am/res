'use client';
import { useState, useTransition } from 'react';
import { novoSetor, validarSetor, type SetorForm } from '@res/core';
import { salvarSetor } from '@/app/(painel)/cardapio/actions';
import { salvando } from '@/components/tempo-real';

type Marca = { id: string; nome: string };

/** Formulário de setor (criar ou editar). R-001: exige ao menos uma marca, sem reselecionar escondido. R-002: nasce em tudo. */
export function FormSetor({
  marcas,
  inicial,
  aoTerminar,
}: {
  marcas: Marca[];
  inicial?: SetorForm & { id: string };
  aoTerminar?: () => void;
}) {
  const novo = () => novoSetor(marcas.map((m) => m.id));
  const [s, setS] = useState<SetorForm>(() => (inicial ? { ...inicial } : novo()));
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pendente, iniciar] = useTransition();
  const erros = validarSetor(s);

  const alternarMarca = (id: string) =>
    setS((x) => ({ ...x, marcas: x.marcas.includes(id) ? x.marcas.filter((m) => m !== id) : [...x.marcas, id] }));

  return (
    <form
      className="grade"
      action={(fd) =>
        iniciar(async () => {
          setOk(false);
          const r = await salvando(salvarSetor(fd));
          if (!r.ok) return setErro(r.erro);
          setErro(null);
          if (!inicial) {
            setS(novo());
            setOk(true);
          }
          aoTerminar?.();
        })
      }
    >
      {inicial && <input type="hidden" name="id" value={inicial.id} />}
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
      {!s.delivery && !s.presencial && <p className="dica">Sem canais, a categoria fica escondida do cardápio e da tela de pedidos.</p>}
      <fieldset className="linha">
        <legend>Marcas</legend>
        {marcas.map((m) => (
          <label key={m.id} className="check">
            <input type="checkbox" name="marcas" value={m.id} checked={s.marcas.includes(m.id)} onChange={() => alternarMarca(m.id)} /> {m.nome}
          </label>
        ))}
      </fieldset>
      {s.marcas.length === 0 && <p className="erro">A categoria precisa estar em pelo menos uma marca.</p>}
      {erro && <p className="erro" role="alert">{erro}</p>}
      {ok && <p className="dica" role="status">Categoria criada.</p>}
      <div className="linha">
        <button className="botao-primario" disabled={pendente || erros.length > 0}>
          {pendente ? 'Salvando…' : inicial ? 'Salvar categoria' : 'Criar categoria'}
        </button>
        {aoTerminar && (
          <button type="button" onClick={aoTerminar} disabled={pendente}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
