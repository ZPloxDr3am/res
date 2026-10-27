import type { ReactNode } from 'react';
import Link from 'next/link';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { lerConfig, type PainelFidelidade, type RelatorioFidelidade, type Saldos } from '@/lib/fidelidade';
import { ProgramaFidelidade } from '@/components/fidelidade/programa';
import { SaldosFidelidade } from '@/components/fidelidade/saldos';
import { ResultadosFidelidade } from '@/components/fidelidade/resultados';

export const dynamic = 'force-dynamic';

/** Dia do turno atual (05:00 → 05:00). */
const diaDoTurno = () => new Date(Date.now() - 5 * 3600_000).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const menos = (d: string, n: number) => new Date(Date.parse(`${d}T12:00:00Z`) - n * 86400_000).toISOString().slice(0, 10);

export default async function Fidelidade({ searchParams }: { searchParams: Promise<{ aba?: string; periodo?: string }> }) {
  const sp = await searchParams;
  const aba = sp.aba === 'clientes' ? 'clientes' : sp.aba === 'resultados' ? 'resultados' : 'programa';
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('painel_fidelidade', { p_loja: ctx.lojaId });
  if (error || !data) return <p className="cartao dica">{error?.message ?? 'Sem acesso à fidelidade.'}</p>;
  const painel = data as PainelFidelidade & { config: Record<string, unknown> | null };
  const p: PainelFidelidade = { ...painel, config: lerConfig(painel.config) };

  let conteudo: ReactNode;
  if (aba === 'programa') {
    conteudo = <ProgramaFidelidade painel={p} />;
  } else if (aba === 'clientes') {
    const s = await supabase.rpc('saldos_fidelidade', { p_loja: ctx.lojaId, p_termo: '', p_limite: 50, p_offset: 0 });
    conteudo = <SaldosFidelidade inicial={(s.data as Saldos | null) ?? { total_clientes: 0, total_cashback: 0, total_pontos: 0, clientes: [] }} podeAjustar={p.pode_editar} />;
  } else {
    const periodo = ['7', '31', '90'].includes(sp.periodo ?? '') ? sp.periodo! : '31';
    const hoje = diaDoTurno();
    const r = await supabase.rpc('relatorio_fidelidade', { p_loja: ctx.lojaId, p_de: menos(hoje, Number(periodo) - 1), p_ate: hoje });
    conteudo = <ResultadosFidelidade rel={(r.data as RelatorioFidelidade | null) ?? null} periodo={periodo} erro={r.error?.message ?? null} />;
  }

  const ligado = [p.config?.cashbackAtivo && `cashback ${p.config.cashbackPct}%`, p.config?.pontosAtivo && 'pontos'].filter(Boolean).join(' + ');
  return (
    <div className="grade">
      <div>
        <h1 style={{ marginBottom: 0 }}>Fidelidade</h1>
        <p className="dica" style={{ margin: 0 }}>
          {ligado ? `Ligado: ${ligado}. ` : 'Programa desligado. '}O cliente ganha quando o pedido é concluído e usa nas lojas do grupo, no balcão ou no cardápio digital.
        </p>
      </div>
      <nav className="abas nao-imprimir" aria-label="Fidelidade">
        <Link href="/fidelidade" role="tab" aria-selected={aba === 'programa'} className="aba-link">Programa</Link>
        <Link href="/fidelidade?aba=clientes" role="tab" aria-selected={aba === 'clientes'} className="aba-link">Saldos dos clientes</Link>
        <Link href="/fidelidade?aba=resultados" role="tab" aria-selected={aba === 'resultados'} className="aba-link">Resultados</Link>
      </nav>
      {conteudo}
    </div>
  );
}
