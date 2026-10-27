import Link from 'next/link';

export type Relatorio = {
  pedidos: number;
  entregas: number;
  atrasados: number;
  atraso_medio: number | null;
  tempos: { aceite: number | null; preparo: number | null; expedicao: number | null; rua: number | null; total: number | null };
  por_dia: { dia: string; entregas: number; atrasados: number; total: number | null }[];
  por_bairro: { bairro: string; entregas: number; atrasados: number; atraso_medio: number | null; rua: number | null }[];
  por_motoboy: { motoboy: string; entregas: number; atrasados: number; rua: number | null }[];
  por_loja: { loja: string; pedidos: number; preparo: number | null; entregas: number; atrasados: number }[];
};

const PERIODOS = [
  { v: 'hoje', r: 'Hoje' },
  { v: 'ontem', r: 'Ontem' },
  { v: '7', r: '7 dias' },
  { v: '30', r: '30 dias' },
];
const min = (v: number | null | undefined) => (v == null ? '—' : `${v} min`);
const pct = (a: number, t: number) => (t ? Math.round((a / t) * 100) : 0);
const diaCurto = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });

/** Tempos de cada etapa e atrasos (D-028). */
export function TemposEntregas({ rel, periodo, prazos, erro }: { rel: Relatorio | null; periodo: string; prazos: string; erro: string | null }) {
  const etapas = rel
    ? [
        { r: 'Aceitar', v: rel.tempos.aceite, d: 'do pedido chegar até entrar em preparo' },
        { r: 'Preparo', v: rel.tempos.preparo, d: 'de entrar em preparo até ficar pronto' },
        { r: 'Esperando motoboy', v: rel.tempos.expedicao, d: 'de pronto até sair' },
        { r: 'Na rua', v: rel.tempos.rua, d: 'de sair até entregar' },
      ]
    : [];
  const maior = Math.max(1, ...etapas.map((e) => e.v ?? 0));
  const gargalo = etapas.reduce<(typeof etapas)[number] | null>((g, e) => ((e.v ?? 0) > (g?.v ?? 0) ? e : g), null);
  const maxDia = Math.max(1, ...(rel?.por_dia ?? []).map((d) => d.entregas));

  return (
    <div className="grade">
      <nav className="linha" style={{ gap: '0.4rem' }} aria-label="Período">
        {PERIODOS.map((p) => (
          <Link key={p.v} href={`/entregas?aba=tempos&periodo=${p.v}`} className={`aba-link ${periodo === p.v ? 'botao-primario' : ''}`} aria-current={periodo === p.v ? 'page' : undefined}>
            {p.r}
          </Link>
        ))}
      </nav>
      {erro && <p className="erro">{erro}</p>}
      {rel && (
        <>
          <section className="cartao grade">
            <div className="tp-kpis">
              <div><span className="dica">Entregas concluídas</span><strong>{rel.entregas}</strong></div>
              <div><span className="dica">No prazo</span><strong>{pct(rel.entregas - rel.atrasados, rel.entregas)}%</strong></div>
              <div><span className="dica">Atrasadas</span><strong className={rel.atrasados ? 'erro' : undefined}>{rel.atrasados}</strong>{rel.atraso_medio != null && <span className="dica">em média {rel.atraso_medio} min</span>}</div>
              <div><span className="dica">Pedido → entregue</span><strong>{min(rel.tempos.total)}</strong><span className="dica">média, sem agendados</span></div>
            </div>
            <p className="dica" style={{ margin: 0 }}>Prazo: {prazos}. Agendados contam pelo horário marcado.</p>
          </section>

          <section className="cartao grade">
            <h2 style={{ margin: 0 }}>Onde o tempo vai</h2>
            {etapas.map((e) => (
              <div key={e.r} className="tp-barra" title={e.d}>
                <span>{e.r}</span>
                <span className="tp-trilho"><span style={{ width: `${((e.v ?? 0) / maior) * 100}%` }} data-gargalo={gargalo === e && (e.v ?? 0) > 0 ? 'sim' : undefined} /></span>
                <strong>{min(e.v)}</strong>
              </div>
            ))}
            {gargalo && (gargalo.v ?? 0) > 0 && <p className="dica" style={{ margin: 0 }}>Etapa mais longa: <strong>{gargalo.r.toLowerCase()}</strong> ({gargalo.d}).</p>}
          </section>

          {rel.por_dia.length > 1 && (
            <section className="cartao grade">
              <h2 style={{ margin: 0 }}>Por dia</h2>
              {rel.por_dia.map((d) => (
                <div key={d.dia} className="tp-barra">
                  <span>{diaCurto(d.dia)}</span>
                  <span className="tp-trilho">
                    <span style={{ width: `${((d.entregas - d.atrasados) / maxDia) * 100}%` }} />
                    <span className="atr" style={{ width: `${(d.atrasados / maxDia) * 100}%` }} />
                  </span>
                  <span>{d.entregas} · <span className={d.atrasados ? 'erro' : 'dica'}>{d.atrasados} atrasadas</span></span>
                </div>
              ))}
            </section>
          )}

          <div className="tp-duas">
            <section className="cartao grade">
              <h2 style={{ margin: 0 }}>Bairros que mais atrasam</h2>
              <table className="tabela">
                <thead><tr><th>Bairro</th><th>Entregas</th><th>Atrasadas</th><th>Na rua</th></tr></thead>
                <tbody>
                  {rel.por_bairro.map((b) => (
                    <tr key={b.bairro}>
                      <td>{b.bairro}</td>
                      <td>{b.entregas}</td>
                      <td className={b.atrasados ? 'erro' : undefined}>{b.atrasados}{b.atrasados ? ` (${pct(b.atrasados, b.entregas)}%)` : ''}</td>
                      <td>{min(b.rua)}</td>
                    </tr>
                  ))}
                  {rel.por_bairro.length === 0 && <tr><td colSpan={4} className="dica">Sem entregas no período.</td></tr>}
                </tbody>
              </table>
            </section>
            <section className="cartao grade">
              <h2 style={{ margin: 0 }}>Motoboys</h2>
              <table className="tabela">
                <thead><tr><th>Motoboy</th><th>Entregas</th><th>Atrasadas</th><th>Na rua (média)</th></tr></thead>
                <tbody>
                  {rel.por_motoboy.map((m) => (
                    <tr key={m.motoboy}>
                      <td>{m.motoboy}</td>
                      <td>{m.entregas}</td>
                      <td className={m.atrasados ? 'erro' : undefined}>{m.atrasados}</td>
                      <td>{min(m.rua)}</td>
                    </tr>
                  ))}
                  {rel.por_motoboy.length === 0 && <tr><td colSpan={4} className="dica">Sem entregas no período.</td></tr>}
                </tbody>
              </table>
            </section>
          </div>

          {rel.por_loja.length > 1 && (
            <section className="cartao grade">
              <h2 style={{ margin: 0 }}>Por loja</h2>
              <table className="tabela">
                <thead><tr><th>Loja</th><th>Pedidos</th><th>Preparo (média)</th><th>Entregas</th><th>Atrasadas</th></tr></thead>
                <tbody>
                  {rel.por_loja.map((l) => (
                    <tr key={l.loja}>
                      <td>{l.loja}</td>
                      <td>{l.pedidos}</td>
                      <td>{min(l.preparo)}</td>
                      <td>{l.entregas}</td>
                      <td className={l.atrasados ? 'erro' : undefined}>{l.atrasados}{l.atrasados ? ` (${pct(l.atrasados, l.entregas)}%)` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}
    </div>
  );
}
