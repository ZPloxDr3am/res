'use client';
import { useRef, useState, useTransition } from 'react';
import { criarProduto } from '@/app/(painel)/cardapio/actions';

export function FormProduto({ setores }: { setores: { id: string; nome: string }[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  return (
    <form
      ref={ref}
      className="cartao grade"
      action={(fd) =>
        iniciar(async () => {
          const r = await criarProduto(fd);
          if (r.ok) {
            ref.current?.reset();
            setErro(null);
          } else setErro(r.erro);
        })
      }
    >
      <h2>Novo produto</h2>
      <label>
        Nome
        <input type="text" name="nome" required maxLength={150} />
      </label>
      <label>
        Setor
        <select name="setor" defaultValue={setores[0]?.id ?? ''}>
          <option value="">Sem setor</option>
          {setores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
      </label>
      <label>
        Preço (R$)
        <input type="text" name="preco" inputMode="decimal" placeholder="49,90" />
        <span className="dica">Deixe vazio se o preço vem só das opções (ex.: pizza por sabores).</span>
      </label>
      <label>
        Descrição <span className="dica">(opcional)</span>
        <textarea name="descricao" rows={2} maxLength={1000} />
      </label>
      <p className="dica">O produto nasce ativo em todas as marcas e canais. Ajuste depois na lista.</p>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <button className="botao-primario" disabled={pendente}>
        {pendente ? 'Salvando…' : 'Criar produto'}
      </button>
    </form>
  );
}
