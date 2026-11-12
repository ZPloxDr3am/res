'use client';
import { useState, useTransition } from 'react';
import { formatarReais } from '@res/core';
import { pedirNaMesa } from '@/app/mesa/[token]/actions';
import type { ItemCalculado } from '@/components/publico/cardapio-cliente';

/** Fim do pedido feito pelo QR da mesa (D-099): só nome e observação; vai para a conta da mesa. */
export function CheckoutMesa({ mesa, slug, itens, subtotal, alterar, voltar, concluido }: {
  mesa: { token: string; rotulo: string };
  slug: string;
  itens: ItemCalculado[];
  subtotal: number;
  alterar: (chave: number, delta: number) => void;
  voltar: () => void;
  concluido: () => void;
}) {
  const [nome, setNome] = useState(() => { try { return localStorage.getItem('res_mesa_nome') ?? ''; } catch { return ''; } });
  const [obs, setObs] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const enviar = () =>
    iniciar(async () => {
      try { localStorage.setItem('res_mesa_nome', nome); } catch { /* sem armazenamento */ }
      const r = await pedirNaMesa(mesa.token, slug, itens.map((i) => ({ produtoId: i.produtoId, quantidade: i.quantidade, observacao: i.observacao, escolhas: i.escolhas, ...(i.passos ? { passos: i.passos } : {}) })), nome, obs);
      if (!r.ok) return setErro(r.erro);
      concluido();
    });
  return (
    <main className="pub-lista grade">
      <button type="button" onClick={voltar} style={{ justifySelf: 'start' }}>← Continuar escolhendo</button>
      <h2>Pedido para a {mesa.rotulo}</h2>
      <ul className="lista carrinho">
        {itens.map((i) => (
          <li key={i.chave} className="sc-item">
            <div className="grade" style={{ gap: '0.2rem', minWidth: 0, width: '100%' }}>
              <div className="pub-linha" style={{ justifyContent: 'space-between' }}>
                <strong>{i.produto.nome}</strong>
                <span>{formatarReais(i.unitario * i.quantidade)}</span>
              </div>
              {i.resumo && <span className="dica">{i.resumo}</span>}
              {i.observacao && <span className="dica">Obs.: {i.observacao}</span>}
              <span className="passo" style={{ justifySelf: 'end' }}>
                <button type="button" aria-label={i.quantidade === 1 ? 'Tirar do pedido' : 'Menos um'} onClick={() => alterar(i.chave, -1)}>{i.quantidade === 1 ? '🗑' : '−'}</button>
                {i.quantidade}
                <button type="button" aria-label="Mais um" onClick={() => alterar(i.chave, 1)}>+</button>
              </span>
            </div>
          </li>
        ))}
        {itens.length === 0 && <li className="dica">Seu pedido está vazio.</li>}
      </ul>
      <label>Seu nome <span className="dica">(opcional)</span><input value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} autoComplete="given-name" /></label>
      <label>Observação para a cozinha<textarea rows={2} maxLength={300} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: sem cebola, bem passado" /></label>
      <div className="pub-linha" style={{ justifyContent: 'space-between' }}><strong>Total desta rodada</strong><strong>{formatarReais(subtotal)}</strong></div>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <button type="button" className="botao-primario" disabled={pendente || itens.length === 0} onClick={enviar}>{pendente ? 'Enviando…' : 'Enviar pedido'}</button>
      <p className="dica" style={{ margin: 0 }}>Vai para a conta da mesa. Você paga no fim, com o garçom ou no caixa.</p>
    </main>
  );
}
