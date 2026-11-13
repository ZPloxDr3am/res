'use client';
import { useState, useTransition } from 'react';
import { avaliarPedido } from '@/app/c/[slug]/pedido/[codigo]/actions';

const PROBLEMAS: [string, string][] = [
  ['atraso', 'Demorou'],
  ['frio', 'Chegou frio'],
  ['errado', 'Veio errado'],
  ['faltou', 'Faltou item'],
  ['embalagem', 'Embalagem'],
  ['sabor', 'Sabor'],
  ['atendimento', 'Atendimento'],
  ['preco', 'Preço'],
];

/** ⭐ Avaliação depois do pedido (D-111): nota, o que deu errado e comentário; nota alta convida para o Google. */
export function AvaliarPedido({ codigo, marca, google, jaAvaliado }: { codigo: string; marca: string; google: string | null; jaAvaliado: number | null }) {
  const [nota, setNota] = useState(0);
  const [probs, setProbs] = useState<string[]>([]);
  const [comentario, setComentario] = useState('');
  const [fim, setFim] = useState<{ nota: number; google: string | null } | null>(jaAvaliado ? { nota: jaAvaliado, google: jaAvaliado >= 4 ? google : null } : null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  if (fim) {
    return fim.nota >= 4 ? (
      fim.google ? (
        <a className="cartao pub-avaliar" href={fim.google} target="_blank" rel="noopener noreferrer">
          <strong>Obrigado! 🧡 Deixa essas estrelas no Google também?</strong>
          <span className="dica">Leva 10 segundos e ajuda muito a {marca}.</span>
        </a>
      ) : (
        <p className="cartao" style={{ margin: 0 }}>Obrigado pela avaliação! 🧡</p>
      )
    ) : (
      <p className="cartao" style={{ margin: 0 }}>Obrigado por contar. A {marca} vai ver a sua avaliação e pode entrar em contato para resolver.</p>
    );
  }

  return (
    <section className="cartao grade pub-avaliacao" aria-label="Avaliar o pedido">
      <strong>Como foi o seu pedido?</strong>
      <div className="pub-estrelas" role="radiogroup" aria-label="Nota">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={nota === n} aria-label={`${n} estrela${n > 1 ? 's' : ''}`} data-on={n <= nota || undefined} onClick={() => setNota(n)}>★</button>
        ))}
      </div>
      {nota > 0 && nota <= 3 && (
        <div className="linha" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
          <span className="dica" style={{ flexBasis: '100%' }}>O que não foi bem?</span>
          {PROBLEMAS.map(([k, r]) => (
            <button key={k} type="button" className="mini" aria-pressed={probs.includes(k)} onClick={() => setProbs((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))}>{r}</button>
          ))}
        </div>
      )}
      {nota > 0 && (
        <textarea value={comentario} maxLength={500} rows={2} onChange={(e) => setComentario(e.target.value)} placeholder={nota <= 3 ? 'Conte o que aconteceu (opcional)' : 'Quer deixar um elogio? (opcional)'} />
      )}
      {erro && <p className="erro" style={{ margin: 0 }}>{erro}</p>}
      {nota > 0 && (
        <button
          type="button"
          className="botao-primario"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await avaliarPedido(codigo, nota, probs, comentario);
              if (!r.ok) return setErro(r.erro);
              setFim({ nota, google: r.google });
            })
          }
        >
          {pendente ? 'Enviando…' : 'Enviar avaliação'}
        </button>
      )}
    </section>
  );
}
