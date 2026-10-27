import Link from 'next/link';
import { faixaRoi, formatarReais, recomendacaoDia, roi } from '@res/core';
import type { RelatorioFidelidade } from '@/lib/fidelidade';

const PERIODOS = [
  { v: '7', r: '7 dias' },
  { v: '31', r: '31 dias' },
  { v: '90', r: '90 dias' },
];
const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const FAIXA = { excelente: '5x+ excelente', bom: '2 a 5x bom', ok: '1 a 2x ok', atencao: 'abaixo de 1x: atenção' } as const;
const REC = {
  criar: { t: 'Criar ação do dia', d: 'dia fraco: cupom do dia ou cashback maior neste dia' },
  revisar: { t: 'Revisar desconto', d: 'o desconto quase não volta em venda' },
  explorar: { t: 'Explorar', d: 'dia forte com pouca fidelidade: bom para testar cupom novo' },
  manter: { t: 'Manter', d: 'equilibrado' },
} as const;
const MEC = { cupom: 'Cupom', cashback: 'Cashback', pontos: 'Pontos' } as const;
const PERFIL = { novo: 'Clientes novos', recorrente: 'Recorrentes', sem_cliente: 'Sem telefone' } as const;
const ORIGEM: Record<string, string> = { cardapio_digital: 'Cardápio digital', painel: 'Balcão / telefone', ifood: 'iFood', whatsapp: 'WhatsApp' };
const x = (v: number | null) => (v == null ? '—' : `${v.toFixed(2).replace('.', ',')}x`);
const pct = (a: number, t: number) => (t ? Math.round((a / t) * 100) : 0);

/** Resultados da fidelidade: quanto cada R$ 1 de desconto trouxe de venda (D-031). */
export function ResultadosFidelidade({ rel, periodo, erro }: { rel: RelatorioFidelidade | null; periodo: string; erro: string | null }) {
  const nav = (
    <nav className="linha" style={{ gap: '0.4rem' }} aria-label="Período">
      {PERIODOS.map((p) => (
        <Link key={p.v} href={`/fidelidade?aba=resultados&periodo=${p.v}`} className={`aba-link ${periodo === p.v ? 'botao-primario' : ''}`} aria-current={periodo === p.v ? 'page' : undefined}>
          Últimos {p.r}
        </Link>
      ))}
    </nav>
  );
  if (!rel) return <div className="grade">{nav}<p className="erro">{erro ?? 'Não consegui carregar.'}</p></div>;

  const desconto = rel.desconto_cupom + rel.desconto_cashback + rel.desconto_pontos;
  const roiGeral = roi(rel.faturamento_fid, desconto);
  const media = rel.por_dia_semana.length ? rel.por_dia_semana.reduce((s, d) => s + d.faturamento, 0) / 7 : 0;
  const dias = [0, 1, 2, 3, 4, 5, 6].map((dow) => rel.por_dia_semana.find((d) => d.dow === dow) ?? { dow, vendas: 0, faturamento: 0, fat_cupom: 0, desc_cupom: 0, fat_fid: 0, desc_fid: 0 });
  const maxDia = Math.max(1, ...dias.map((d) => d.faturamento));
  const forte = [...dias].sort((a, b) => b.faturamento - a.faturamento)[0];
  const fraco = [...dias].filter((d) => d.vendas > 0).sort((a, b) => a.faturamento - b.faturamento)[0];

  return (
    <div className="grade">
      {nav}
      <section className="cartao grade">
        <div className="tp-kpis">
          <div><span className="dica">Vendas com fidelidade</span><strong>{rel.vendas_fid}</strong><span className="dica">{pct(rel.vendas_fid, rel.vendas)}% das {rel.vendas} vendas</span></div>
          <div><span className="dica">Desconto dado</span><strong>{formatarReais(desconto)}</strong><span className="dica">cupom {formatarReais(rel.desconto_cupom)} · cashback {formatarReais(rel.desconto_cashback)} · pontos {formatarReais(rel.desconto_pontos)}</span></div>
          <div><span className="dica">Vendas que usaram</span><strong>{formatarReais(rel.faturamento_fid)}</strong><span className="dica">{pct(rel.faturamento_fid, rel.faturamento)}% do faturamento</span></div>
          <div><span className="dica">Retorno (ROI)</span><strong className={`fid-roi ${faixaRoi(roiGeral) ?? ''}`}>{x(roiGeral)}</strong><span className="dica">{roiGeral != null ? `cada R$ 1 de desconto veio com ${formatarReais(Math.round(roiGeral * 100))} de venda` : 'sem desconto no período'}</span></div>
          <div><span className="dica">Ticket médio</span><strong>{rel.ticket_fid != null ? formatarReais(rel.ticket_fid) : '—'}</strong><span className="dica">com fidelidade · sem: {rel.ticket_sem != null ? formatarReais(rel.ticket_sem) : '—'}</span></div>
          <div><span className="dica">Cashback gerado</span><strong>{formatarReais(rel.cashback_gerado)}</strong><span className="dica">vencido {formatarReais(rel.cashback_vencido)}</span></div>
          <div><span className="dica">Pontos</span><strong>{rel.pontos_gerados.toLocaleString('pt-BR')}</strong><span className="dica">gerados · {rel.pontos_usados.toLocaleString('pt-BR')} trocados</span></div>
        </div>
        <p className="dica" style={{ margin: 0 }}>O ROI compara a venda inteira com o desconto dado nela; não mede se o cliente compraria sem o desconto.</p>
      </section>

      <section className="cartao grade">
        <h2 style={{ margin: 0 }}>Retorno por mecânica</h2>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead><tr><th>Mecânica</th><th>Usos</th><th>Desconto</th><th>Vendas</th><th>Ticket médio</th><th>ROI</th></tr></thead>
            <tbody>
              {rel.mecanicas.map((m, k) => {
                const r = roi(m.faturamento, m.desconto);
                return (
                  <tr key={k}>
                    <td><strong>{m.nome}</strong> <span className="dica">{MEC[m.tipo]}</span></td>
                    <td>{m.usos}</td>
                    <td>{formatarReais(m.desconto)} <span className="dica">({pct(m.desconto, desconto)}%)</span></td>
                    <td>{formatarReais(m.faturamento)}</td>
                    <td>{formatarReais(Math.round(m.faturamento / Math.max(1, m.usos)))}</td>
                    <td><span className={`fid-roi ${faixaRoi(r) ?? ''}`}>{x(r)}</span></td>
                  </tr>
                );
              })}
              {rel.mecanicas.length === 0 && <tr><td colSpan={6} className="dica">Nenhum cupom, cashback ou pontos usados no período.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="dica" style={{ margin: 0 }}>Faixas: {Object.values(FAIXA).join(' · ')}.</p>
      </section>

      <section className="cartao grade">
        <h2 style={{ margin: 0 }}>Dia da semana × fidelidade</h2>
        {forte && fraco && forte.dow !== fraco.dow && (
          <p className="dica" style={{ margin: 0 }}>
            Mais forte: <strong>{DIAS[forte.dow]}</strong> ({formatarReais(forte.faturamento)}). Mais fraco: <strong>{DIAS[fraco.dow]}</strong> ({formatarReais(fraco.faturamento)}): bom dia para cashback maior (dá para pôr % por dia em Programa).
          </p>
        )}
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead><tr><th>Dia</th><th>Vendas</th><th>Faturamento</th><th>Com fidelidade</th><th>ROI</th><th>Sugestão</th></tr></thead>
            <tbody>
              {dias.map((d) => {
                const descDia = d.desc_cupom + d.desc_fid;
                const fatDia = d.fat_cupom + d.fat_fid;
                const r = roi(fatDia, descDia);
                const rec = REC[recomendacaoDia(d.faturamento, media, r, pct(fatDia, d.faturamento))];
                return (
                  <tr key={d.dow}>
                    <td>{DIAS[d.dow]}</td>
                    <td>{d.vendas}</td>
                    <td>
                      <span className="tp-trilho" style={{ display: 'inline-flex', width: '6rem', verticalAlign: 'middle', marginRight: '0.4rem' }}>
                        <span style={{ width: `${(d.faturamento / maxDia) * 100}%` }} />
                      </span>
                      {formatarReais(d.faturamento)}
                    </td>
                    <td>{fatDia ? `${formatarReais(fatDia)} (${pct(fatDia, d.faturamento)}%)` : '—'}</td>
                    <td>{x(r)}</td>
                    <td title={rec.d}>{rec.t}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="tp-duas">
        <section className="cartao grade">
          <h2 style={{ margin: 0 }}>Novos × recorrentes</h2>
          <p className="dica" style={{ margin: 0 }}>Quem usou desconto: atraiu gente nova ou segurou quem já comprava? Na hora, sem esperar processamento.</p>
          <table className="tabela">
            <thead><tr><th>Perfil</th><th>Vendas</th><th>Faturamento</th><th>Desconto</th></tr></thead>
            <tbody>
              {(['novo', 'recorrente', 'sem_cliente'] as const).map((p) => {
                const l = rel.por_perfil.find((y) => y.perfil === p);
                return <tr key={p}><td>{PERFIL[p]}</td><td>{l?.vendas ?? 0}</td><td>{formatarReais(l?.faturamento ?? 0)}</td><td>{formatarReais(l?.desconto ?? 0)}</td></tr>;
              })}
            </tbody>
          </table>
        </section>
        <section className="cartao grade">
          <h2 style={{ margin: 0 }}>Por origem</h2>
          <table className="tabela">
            <thead><tr><th>Canal</th><th>Vendas</th><th>Faturamento</th><th>Desconto</th></tr></thead>
            <tbody>
              {rel.por_origem.map((o) => <tr key={o.origem}><td>{ORIGEM[o.origem] ?? o.origem}</td><td>{o.vendas}</td><td>{formatarReais(o.faturamento)}</td><td>{formatarReais(o.desconto)}</td></tr>)}
              {rel.por_origem.length === 0 && <tr><td colSpan={4} className="dica">Sem uso no período.</td></tr>}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
