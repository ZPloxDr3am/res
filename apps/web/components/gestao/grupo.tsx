'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { salvarModoGrupo } from '@/app/(painel)/gestao/actions';
import { salvando } from '@/components/tempo-real';
import type { ResumoCustos } from '@/lib/gestao';

const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

/** Escolha do dono com várias lojas: custos de cada loja separada ou do grupo todo junto (D-053). */
export function EscolhaModo({ contaId, modo, titular, lojas, ver }: { contaId: string; modo: 'separado' | 'grupo'; titular: boolean; lojas: string[]; ver: 'loja' | 'grupo' }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();
  const trocar = (m: 'separado' | 'grupo') =>
    iniciar(async () => {
      const r = await salvando(salvarModoGrupo(contaId, m));
      if (!r.ok) return setErro(r.erro);
      setErro(null);
      router.replace('/gestao');
      router.refresh();
    });

  return (
    <section className="cartao grade nao-imprimir" aria-label="Como controlar os custos">
      <div>
        <h2 style={{ margin: 0 }}>Você tem {lojas.length} lojas: como quer controlar os custos?</h2>
        <p className="dica" style={{ margin: 0 }}>{lojas.join(' · ')}</p>
      </div>
      <div className="eq-modos gc-modos">
        <label className="eq-modo" data-escolhido={modo === 'separado' || undefined}>
          <input type="radio" name="modo-grupo" checked={modo === 'separado'} disabled={!titular || pendente} onChange={() => trocar('separado')} />
          <span>
            <b>Cada loja separada</b>
            <span className="dica">Uma planilha por loja, com o faturamento dela. Bom quando cada loja tem aluguel, equipe e contas próprias. Você ainda vê a soma do grupo.</span>
          </span>
        </label>
        <label className="eq-modo" data-escolhido={modo === 'grupo' || undefined}>
          <input type="radio" name="modo-grupo" checked={modo === 'grupo'} disabled={!titular || pendente} onChange={() => trocar('grupo')} />
          <span>
            <b>O grupo todo junto</b>
            <span className="dica">Uma planilha só para as {lojas.length} lojas, com o faturamento somado. Bom quando dividem cozinha, equipe ou contas e é difícil separar.</span>
          </span>
        </label>
      </div>
      {!titular && <p className="dica" style={{ margin: 0 }}>Só o titular da conta muda esta escolha.</p>}
      {erro && <p className="erro" style={{ margin: 0 }}>{erro}</p>}
      {modo === 'separado' && (
        <nav className="abas" aria-label="Ver">
          <Link href="/gestao" role="tab" aria-selected={ver === 'loja'} className="aba-link">Planilha desta loja</Link>
          <Link href="/gestao?ver=grupo" role="tab" aria-selected={ver === 'grupo'} className="aba-link">Soma do grupo</Link>
        </nav>
      )}
      <p className="dica" style={{ margin: 0 }}>Pode trocar quando quiser: nada é apagado, cada planilha fica guardada.</p>
    </section>
  );
}

export type LinhaGrupo = { loja: string; resumo: ResumoCustos; preenchida: boolean };

/** Soma do grupo no modo "cada loja separada": uma linha por loja e o total. */
export function SomaGrupo({ linhas }: { linhas: LinhaGrupo[] }) {
  const t = linhas.reduce(
    (a, l) => ({ faturamento: a.faturamento + l.resumo.faturamento, fixos: a.fixos + l.resumo.fixos, variaveis: a.variaveis + l.resumo.variaveis, lucro: a.lucro + l.resumo.lucro }),
    { faturamento: 0, fixos: 0, variaveis: 0, lucro: 0 },
  );
  const varPct = t.faturamento > 0 ? (t.variaveis / t.faturamento) * 100 : 0;
  const equilibrio = varPct < 100 ? t.fixos / (1 - varPct / 100) : null;
  return (
    <div className="grade">
      <section className="kpis" aria-label="Resumo do grupo">
        <div className="cartao kpi"><span className="dica">Faturamento do grupo</span><strong className="kpi-valor">{brl(t.faturamento)}</strong><span className="dica">soma das lojas</span></div>
        <div className="cartao kpi"><span className="dica">Custos do grupo</span><strong className="kpi-valor">{brl(t.fixos + t.variaveis)}</strong><span className="dica">{brl(t.fixos)} fixos + {brl(t.variaveis)} variáveis</span></div>
        <div className="cartao kpi">
          <span className="dica">{t.lucro >= 0 ? 'Sobra do grupo no mês' : 'Prejuízo do grupo no mês'}</span>
          <strong className="kpi-valor" style={{ color: t.lucro >= 0 ? '#15803d' : 'var(--erro)' }}>{brl(t.lucro)}</strong>
          <span className="dica">{t.faturamento > 0 ? `margem de ${pct((t.lucro / t.faturamento) * 100)}` : 'informe o faturamento nas lojas'}</span>
        </div>
        <div className="cartao kpi"><span className="dica">Ponto de equilíbrio do grupo</span><strong className="kpi-valor">{equilibrio == null ? '—' : brl(equilibrio)}</strong><span className="dica">{equilibrio == null ? 'variáveis acima de 100%' : `${brl(equilibrio / 30)} por dia, somando as lojas`}</span></div>
      </section>
      <section className="cartao tabela-rolagem" aria-label="Por loja">
        <table className="tabela">
          <thead>
            <tr><th>Loja</th><th className="num">Faturamento</th><th className="num">Custos fixos</th><th className="num">Custos variáveis</th><th className="num">Sobra</th><th className="num">Margem</th></tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.loja}>
                <td>{l.loja}{!l.preenchida && <span className="dica"> · planilha em branco</span>}</td>
                <td className="num">{brl(l.resumo.faturamento)}</td>
                <td className="num">{brl(l.resumo.fixos)}</td>
                <td className="num">{brl(l.resumo.variaveis)}</td>
                <td className="num" style={{ color: l.resumo.lucro >= 0 ? undefined : 'var(--erro)' }}>{brl(l.resumo.lucro)}</td>
                <td className="num">{l.resumo.faturamento > 0 ? pct(l.resumo.margemPct) : '—'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Grupo</td>
              <td className="num">{brl(t.faturamento)}</td>
              <td className="num">{brl(t.fixos)}</td>
              <td className="num">{brl(t.variaveis)}</td>
              <td className="num">{brl(t.lucro)}</td>
              <td className="num">{t.faturamento > 0 ? pct((t.lucro / t.faturamento) * 100) : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </section>
      <p className="dica" style={{ margin: 0 }}>
        Cada loja usa o faturamento informado na planilha dela (ou, se estiver em branco, os pedidos concluídos dos últimos 30 dias). Para editar, troque de loja no menu e abra “Planilha desta loja”.
      </p>
    </div>
  );
}
