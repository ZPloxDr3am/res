'use client';
import { useEffect, useState } from 'react';
import { cashbackUsavel, formatarReais, ganhoFidelidade, normalizarTelefone } from '@res/core';
import { programaFidelidade, saldoFidelidade } from '@/app/c/[slug]/actions';
import type { ProgramaPublico } from '@/lib/fidelidade';
import type { UsoFidelidade } from './balcao';

const CHAVE = 'res_fidelidade';
const ler = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
};
/** Guarda o código do pedido (a "prova" de que este aparelho é do cliente) para usar o saldo depois. */
export function lembrarPedidoFidelidade(telefone: string, codigo: string) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ ...ler(), [normalizarTelefone(telefone)]: codigo }));
  } catch {
    /* sem armazenamento: usa no balcão */
  }
}
export const provaFidelidade = (telefone: string) => ler()[normalizarTelefone(telefone)] ?? null;

/** Cardápio digital (D-031): quanto o pedido gera, saldo e uso (só no aparelho do último pedido). */
export function FidelidadeCliente({ slug, telefone, aPagar, uso, aoMudar }: { slug: string; telefone: string; aPagar: number; uso: UsoFidelidade; aoMudar: (u: UsoFidelidade) => void }) {
  const [prog, setProg] = useState<ProgramaPublico | null>(null);
  const [saldo, setSaldo] = useState<{ cashback: number; pontos: number } | null>(null);
  const tel = normalizarTelefone(telefone);

  useEffect(() => {
    programaFidelidade(slug).then(setProg).catch(() => {});
  }, [slug]);
  useEffect(() => {
    setSaldo(null);
    aoMudar({ cashback: 0, recompensa: null });
    const prova = tel.length >= 10 ? provaFidelidade(tel) : null;
    if (!prova || !prog) return;
    let vivo = true;
    saldoFidelidade(slug, tel, prova).then((s) => vivo && setSaldo(s)).catch(() => {});
    return () => {
      vivo = false;
    };
  }, [tel, prog, slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const dia = new Date().getDay();
  const usavel = prog && saldo ? cashbackUsavel(prog.config, saldo.cashback, aPagar, dia, 'cardapio_digital') : 0;
  useEffect(() => {
    if (uso.cashback > 0 && usavel !== uso.cashback) aoMudar({ ...uso, cashback: usavel });
  }, [usavel]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!prog) return null;
  const c = prog.config;
  const ganho = ganhoFidelidade(c, { total: Math.max(0, aPagar - uso.cashback), taxaEntrega: 0, dia, canal: 'cardapio_digital', primeiro: false });
  const trocaveis = c.pontosAtivo && saldo ? prog.recompensas.filter((r) => r.pontos <= saldo.pontos) : [];

  return (
    <section className="fid-balcao" aria-label="Programa de fidelidade">
      <strong>
        {c.cashbackAtivo && `💰 ${c.cashbackPctDia[dia] ?? c.cashbackPct}% de volta`}
        {c.cashbackAtivo && c.pontosAtivo && ' · '}
        {c.pontosAtivo && '⭐ Junte pontos'}
      </strong>
      {(ganho.cashback > 0 || ganho.pontos > 0) && (
        <span>
          Este pedido te dá <strong>{[ganho.cashback > 0 && formatarReais(ganho.cashback), ganho.pontos > 0 && `${ganho.pontos} pontos`].filter(Boolean).join(' e ')}</strong> para usar no próximo, quando for entregue.
        </span>
      )}
      {saldo && (saldo.cashback > 0 || saldo.pontos > 0) && (
        <span>Seu saldo: {[saldo.cashback > 0 && formatarReais(saldo.cashback), saldo.pontos > 0 && `${saldo.pontos} pontos`].filter(Boolean).join(' e ')}</span>
      )}
      {usavel > 0 && (
        <label className="check">
          <input type="checkbox" checked={uso.cashback > 0} onChange={(e) => aoMudar({ ...uso, cashback: e.target.checked ? usavel : 0 })} />
          Usar {formatarReais(usavel)} do meu cashback
        </label>
      )}
      {trocaveis.length > 0 && (
        <label>
          Trocar pontos
          <select value={uso.recompensa ?? ''} onChange={(e) => aoMudar({ ...uso, recompensa: e.target.value || null })}>
            <option value="">Agora não</option>
            {trocaveis.map((r) => <option key={r.id} value={r.id}>{r.nome} — {r.pontos} pontos{r.tipo === 'produto' ? ' (coloque o produto no pedido)' : ''}</option>)}
          </select>
        </label>
      )}
      {tel.length >= 10 && !saldo && <span className="dica">Já tem saldo? Ele aparece aqui no celular em que você fez o último pedido. Em outro aparelho, peça pelo telefone da loja.</span>}
    </section>
  );
}
