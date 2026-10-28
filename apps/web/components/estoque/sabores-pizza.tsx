'use client';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { formatarReais, UNIDADES_ESTOQUE, type UnidadeEstoque } from '@res/core';
import { salvarFatoresSabor, salvarFichaSabor, salvarInsumo } from '@/app/(painel)/estoque/actions';
import { salvando } from '@/components/tempo-real';
import { fotoOpcao, nomeOpcao, type GrupoRow } from '@/lib/cardapio-dados';
import { n, type Insumo, type ItemFicha } from '@/lib/estoque';

type Pizza = { id: string; nome: string; fator_sabor: number };
type Sabor = { chave: string; nome: string; foto: string | null; opcoes: string[] };
type Linha = { insumo: string; qtd: string };

const num = (t: string) => (t.trim() === '' ? NaN : Number(t.replace(',', '.')));
const diametro = (t: string) => {
  const m = /(\d{2})\s*cm/i.exec(t);
  return m ? Number(m[1]) : null;
};
/** Quantidade como a cozinha fala: kg → g, l → ml. */
const amigavel = (u: UnidadeEstoque) => (u === 'KG' ? { u: 'g', f: 1000 } : u === 'L' ? { u: 'ml', f: 1000 } : { u: u.toLowerCase(), f: 1 });
const fmt = (v: number) => (Math.round(v * 10) / 10).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const pctTexto = (f: number) => `${Math.round(f * 100)}%`;

/** Sabores de pizza (D-040): a ficha do sabor é escrita uma vez, na pizza de 100%, e vale para todos os tamanhos. */
export function SaboresPizza({ pizzas, grupos, insumos: insumosIniciais, fichas }: { pizzas: Pizza[]; grupos: GrupoRow[]; insumos: Insumo[]; fichas: ItemFicha[] }) {
  const [insumos, setInsumos] = useState(insumosIniciais);
  const [aberto, setAberto] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const ref = pizzas.find((p) => Math.abs(n(p.fator_sabor) - 1) < 0.001 && pizzas.some((q) => n(q.fator_sabor) < 0.999)) ?? null;

  const sabores = useMemo(() => {
    const m = new Map<string, Sabor>();
    for (const g of grupos.filter((x) => x.pizza && x.ativo))
      for (const o of g.opcoes.filter((x) => x.ativo)) {
        const nome = nomeOpcao(o).trim();
        const k = nome.toLowerCase();
        const s = m.get(k) ?? m.set(k, { chave: k, nome, foto: null, opcoes: [] }).get(k)!;
        s.opcoes.push(o.id);
        s.foto ??= fotoOpcao(o);
      }
    return [...m.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [grupos]);

  const fichaDe = (s: Sabor) => {
    // a ficha de qualquer tamanho serve (são iguais); fica a que tem mais itens
    let melhor: ItemFicha[] = [];
    let diferentes = false;
    const assinatura = (l: ItemFicha[]) => l.map((f) => `${f.insumo_id}:${n(f.quantidade)}`).sort().join('|');
    for (const id of s.opcoes) {
      const l = fichas.filter((f) => f.opcao_id === id);
      if (melhor.length && l.length && assinatura(l) !== assinatura(melhor)) diferentes = true;
      if (l.length > melhor.length) melhor = l;
    }
    const semFicha = s.opcoes.some((id) => !fichas.some((f) => f.opcao_id === id));
    return { itens: melhor, diferentes: diferentes || (melhor.length > 0 && semFicha) };
  };
  const custo100 = (s: Sabor) => fichaDe(s).itens.reduce((t, f) => t + n(f.quantidade) * n(insumos.find((i) => i.id === f.insumo_id)?.custo_medio), 0);
  const lista = sabores.filter((s) => !busca.trim() || s.nome.toLowerCase().includes(busca.trim().toLowerCase()));
  const comFicha = sabores.filter((s) => fichaDe(s).itens.length).length;

  if (sabores.length === 0) {
    return <p className="cartao dica" style={{ margin: 0 }}>Nenhum grupo de sabores de pizza no cardápio desta loja. Em Cardápio → Grupos de opções, marque o grupo como pizza.</p>;
  }

  return (
    <div className="grade">
      <Como />
      <Tamanhos pizzas={pizzas} />
      <section className="cartao grade">
        <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="grade" style={{ gap: '0.1rem' }}>
            <h2 style={{ margin: 0 }}>Sabores</h2>
            <span className="dica">{comFicha} de {sabores.length} com ficha · quantidades para a pizza de 100%{ref ? ` (${ref.nome})` : ''}</span>
          </div>
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar sabor…" aria-label="Buscar sabor" />
        </div>
        <ul className="sb-lista">
          {lista.map((s) => {
            const f = fichaDe(s);
            const k = s.chave;
            return (
              <li key={k}>
                <button type="button" className="sb-item" aria-expanded={aberto === k} onClick={() => setAberto(aberto === k ? null : k)}>
                  {s.foto ? <img src={s.foto} alt="" loading="lazy" /> : <span className="me-sem-foto" aria-hidden>{s.nome.slice(0, 1)}</span>}
                  <span className="sb-nome">
                    <strong>{s.nome}</strong>
                    <span className="dica">
                      {f.itens.length ? f.itens.map((x) => `${x.insumo} ${fmt(n(x.quantidade) * amigavel(x.unidade).f)} ${amigavel(x.unidade).u}`).join(' · ') : 'sem ficha'}
                    </span>
                  </span>
                  {f.itens.length ? <span className="fichas-custo">{formatarReais(Math.round(custo100(s)))}</span> : <span className="est-sit" data-est="baixo">Montar</span>}
                </button>
                {aberto === k && (
                  <EditorSabor
                    key={k}
                    sabor={s}
                    atual={f.itens}
                    diferentes={f.diferentes}
                    pizzas={pizzas}
                    insumos={insumos}
                    sabores={sabores}
                    fichaDe={(x) => fichaDe(x).itens}
                    aoCriarInsumo={(i) => setInsumos((l) => [...l, i].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')))}
                    aoSalvar={() => setAberto(null)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Como() {
  return (
    <details className="cartao sb-como">
      <summary><strong>Como montar a ficha de uma pizzaria</strong> <span className="dica">em 3 passos</span></summary>
      <ol>
        <li><strong>Tamanhos</strong> (uma vez): diga quanto cada pizza é da maior. Pelo diâmetro, a Broto 25 cm leva 39% de recheio da Gigante 40 cm, a Média 30 cm 56% e a Grande 35 cm 77%. O botão calcula sozinho.</li>
        <li><strong>Sabor</strong>: o recheio daquele sabor numa pizza de 100%. Ex.: Calabresa → calabresa 100 g, cebola 40 g, azeitona 15 g. Os outros tamanhos saem da conta.</li>
        <li><strong>Produto</strong> (em Produtos): o que vai em toda pizza daquele tamanho, qualquer sabor. Ex.: Pizza Gigante 40 cm → massa 1 un, molho 120 g, mussarela 350 g, caixa 40 cm 1 un.</li>
      </ol>
      <p className="dica" style={{ margin: 0 }}>Na venda: Gigante meio Calabresa, meio Portuguesa baixa a ficha da Gigante + metade da Calabresa + metade da Portuguesa. Uma Broto Calabresa baixa a ficha da Broto + 39% da Calabresa.</p>
    </details>
  );
}

function Tamanhos({ pizzas }: { pizzas: Pizza[] }) {
  const router = useRouter();
  const comDiam = pizzas.map((p) => ({ ...p, d: diametro(p.nome) }));
  const maior = Math.max(0, ...comDiam.map((p) => p.d ?? 0));
  const pelaArea = (d: number | null) => (d && maior ? Math.round((d / maior) ** 2 * 100) : 100);
  const todosUm = pizzas.every((p) => Math.abs(n(p.fator_sabor) - 1) < 0.001);
  const sugerir = todosUm && pizzas.length > 1 && maior > 0;
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(comDiam.map((p) => [p.id, String(sugerir ? pelaArea(p.d) : Math.round(n(p.fator_sabor) * 100))])),
  );
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(sugerir ? { ok: true, t: 'Sugestão pelo diâmetro: confira e salve.' } : null);
  const [pendente, iniciar] = useTransition();
  const mudou = sugerir || comDiam.some((p) => num(valores[p.id] ?? '') !== Math.round(n(p.fator_sabor) * 100));
  const validos = comDiam.every((p) => num(valores[p.id] ?? '') > 0 && num(valores[p.id] ?? '') <= 1000);

  if (pizzas.length === 0) return null;
  return (
    <section className="cartao grade">
      <div className="grade" style={{ gap: '0.1rem' }}>
        <h2 style={{ margin: 0 }}>Tamanhos</h2>
        <span className="dica">Quanto de recheio cada pizza leva, comparada com a de 100%. Vale para todos os sabores.</span>
      </div>
      <div className="sb-tamanhos">
        {comDiam
          .slice()
          .sort((a, b) => (a.d ?? 0) - (b.d ?? 0))
          .map((p) => (
            <label key={p.id}>
              <span>{p.nome}</span>
              <span className="sb-pct">
                <input inputMode="numeric" value={valores[p.id] ?? ''} onChange={(e) => setValores({ ...valores, [p.id]: e.target.value })} aria-label={`Tamanho de ${p.nome} em %`} />%
              </span>
            </label>
          ))}
      </div>
      <div className="linha" style={{ alignItems: 'center' }}>
        <button
          type="button"
          className="botao-primario"
          disabled={pendente || !mudou || !validos}
          onClick={() =>
            iniciar(async () => {
              const r = await salvando(salvarFatoresSabor(Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, num(v) / 100]))));
              setMsg(r.ok ? { ok: true, t: 'Tamanhos salvos. As próximas vendas já usam.' } : { ok: false, t: r.erro });
              if (r.ok) router.refresh();
            })
          }
        >
          {pendente ? 'Salvando…' : 'Salvar tamanhos'}
        </button>
        {maior > 0 && (
          <button type="button" onClick={() => setValores(Object.fromEntries(comDiam.map((p) => [p.id, String(pelaArea(p.d))])))}>
            Calcular pelo diâmetro
          </button>
        )}
        {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.t}</span>}
      </div>
    </section>
  );
}

function EditorSabor({
  sabor,
  atual,
  diferentes,
  pizzas,
  insumos,
  sabores,
  fichaDe,
  aoCriarInsumo,
  aoSalvar,
}: {
  sabor: Sabor;
  atual: ItemFicha[];
  diferentes: boolean;
  pizzas: Pizza[];
  insumos: Insumo[];
  sabores: Sabor[];
  fichaDe: (s: Sabor) => ItemFicha[];
  aoCriarInsumo: (i: Insumo) => void;
  aoSalvar: () => void;
}) {
  const router = useRouter();
  const paraLinhas = (l: { insumo_id: string; quantidade: number }[]) =>
    l.map((f) => {
      const i = insumos.find((x) => x.id === f.insumo_id);
      return { insumo: f.insumo_id, qtd: fmt(n(f.quantidade) * (i ? amigavel(i.unidade).f : 1)) };
    });
  const [linhas, setLinhas] = useState<Linha[]>(() => (atual.length ? paraLinhas(atual) : [{ insumo: '', qtd: '' }]));
  const [novo, setNovo] = useState<{ linha: number; nome: string; unidade: UnidadeEstoque } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const ins = (id: string) => insumos.find((i) => i.id === id);
  const qtdBase = (l: Linha) => {
    const i = ins(l.insumo);
    const q = num(l.qtd);
    return i && q > 0 ? q / amigavel(i.unidade).f : 0;
  };
  const custo = linhas.reduce((t, l) => t + qtdBase(l) * n(ins(l.insumo)?.custo_medio), 0);
  const validas = linhas.filter((l) => l.insumo && num(l.qtd) > 0);
  const invalida = linhas.some((l) => (l.insumo || l.qtd) && !(l.insumo && num(l.qtd) > 0));
  const muda = (k: number, p: Partial<Linha>) => setLinhas(linhas.map((x, j) => (j === k ? { ...x, ...p } : x)));
  const tamanhos = pizzas.slice().sort((a, b) => n(a.fator_sabor) - n(b.fator_sabor));

  return (
    <div className="sb-editor grade">
      {diferentes && <p className="cmv-aviso" data-tom="alerta">Os tamanhos deste sabor estavam com fichas diferentes. Ao salvar, todos ficam com esta (ajustada pelo tamanho na venda).</p>}
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>Recheio de {sabor.nome} numa pizza de 100%</strong>
        <select value="" onChange={(e) => { const s = sabores.find((x) => x.chave === e.target.value); if (s) setLinhas(paraLinhas(fichaDe(s).map((f) => ({ insumo_id: f.insumo_id, quantidade: n(f.quantidade) })))); }} aria-label="Copiar de outro sabor">
          <option value="">Copiar de outro sabor…</option>
          {sabores.filter((s) => s.chave !== sabor.chave && fichaDe(s).length).map((s) => <option key={s.chave} value={s.chave}>{s.nome}</option>)}
        </select>
      </div>
      {linhas.map((l, k) => {
        const i = ins(l.insumo);
        return (
          <div key={k} className="grade" style={{ gap: '0.35rem' }}>
            <div className="linha" style={{ alignItems: 'center', flexWrap: 'nowrap' }}>
              <select
                value={l.insumo}
                onChange={(e) => (e.target.value === '+novo' ? setNovo({ linha: k, nome: '', unidade: 'KG' }) : muda(k, { insumo: e.target.value }))}
                aria-label="Ingrediente"
                style={{ flex: '1 1 auto', minWidth: 0 }}
              >
                <option value="">Ingrediente…</option>
                {insumos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}
                <option value="+novo">+ Cadastrar ingrediente novo…</option>
              </select>
              <input inputMode="decimal" value={l.qtd} onChange={(e) => muda(k, { qtd: e.target.value })} placeholder="0" aria-label="Quantidade" style={{ width: '5.5rem', textAlign: 'right' }} />
              <span className="dica" style={{ width: '1.8rem' }}>{i ? amigavel(i.unidade).u : ''}</span>
              <span className="dica" style={{ width: '5rem', textAlign: 'right' }}>{qtdBase(l) && n(i?.custo_medio) ? formatarReais(Math.round(qtdBase(l) * n(i?.custo_medio))) : ''}</span>
              <button type="button" className="mini" aria-label="Tirar ingrediente" onClick={() => setLinhas(linhas.length > 1 ? linhas.filter((_, j) => j !== k) : [{ insumo: '', qtd: '' }])}>×</button>
            </div>
            {novo?.linha === k && (
              <div className="linha sb-novo" style={{ alignItems: 'center' }}>
                <input value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} placeholder="Nome (ex.: Calabresa fatiada)" autoFocus style={{ flex: '1 1 12rem' }} />
                <select value={novo.unidade} onChange={(e) => setNovo({ ...novo, unidade: e.target.value as UnidadeEstoque })} aria-label="Unidade de estoque">
                  {UNIDADES_ESTOQUE.map((u) => <option key={u.id} value={u.id}>{u.rotulo}</option>)}
                </select>
                <button
                  type="button"
                  className="botao-primario"
                  disabled={pendente || !novo.nome.trim()}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await salvando(salvarInsumo(null, { nome: novo.nome.trim(), unidade: novo.unidade }));
                      if (!r.ok) return setMsg({ ok: false, t: r.erro });
                      aoCriarInsumo({ id: r.id, nome: novo.nome.trim(), unidade: novo.unidade, categoria: null, custo_medio: 0, saldo: 0, minimo: null, controla: true, aceita_negativo: true });
                      muda(k, { insumo: r.id });
                      setNovo(null);
                    })
                  }
                >
                  Criar
                </button>
                <button type="button" onClick={() => setNovo(null)}>Cancelar</button>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" style={{ justifySelf: 'start' }} onClick={() => setLinhas([...linhas, { insumo: '', qtd: '' }])}>+ Ingrediente</button>

      {validas.length > 0 && tamanhos.length > 0 && (
        <div className="tabela-rolagem">
          <table className="tabela sb-previa">
            <thead>
              <tr>
                <th>Na venda</th>
                {validas.map((l) => <th key={l.insumo}>{ins(l.insumo)?.nome}</th>)}
                <th>Custo</th>
              </tr>
            </thead>
            <tbody>
              {tamanhos.map((p) => {
                const f = n(p.fator_sabor);
                return (
                  <tr key={p.id}>
                    <td>{p.nome} <span className="dica">{pctTexto(f)}</span></td>
                    {validas.map((l) => <td key={l.insumo}>{fmt(num(l.qtd) * f)} {amigavel(ins(l.insumo)!.unidade).u}</td>)}
                    <td>{custo ? formatarReais(Math.round(custo * f)) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <span className="dica">Pizza inteira deste sabor. No meio a meio, metade; com 3 sabores, um terço.</span>
        </div>
      )}

      <div className="linha" style={{ alignItems: 'center' }}>
        <button
          type="button"
          className="botao-primario"
          disabled={pendente || invalida}
          onClick={() =>
            iniciar(async () => {
              const r = await salvando(salvarFichaSabor(sabor.opcoes, validas.map((l) => ({ insumo_id: l.insumo, quantidade: Math.round(qtdBase(l) * 10000) / 10000 }))));
              if (!r.ok) return setMsg({ ok: false, t: r.erro });
              router.refresh();
              aoSalvar();
            })
          }
        >
          {pendente ? 'Salvando…' : validas.length ? 'Salvar ficha do sabor' : 'Tirar a ficha'}
        </button>
        {sabor.opcoes.length > 1 && <span className="dica">vale para os {sabor.opcoes.length} grupos de tamanho onde {sabor.nome} aparece</span>}
        {invalida && <span className="dica">Complete o ingrediente e a quantidade de cada linha.</span>}
        {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.t}</span>}
      </div>
    </div>
  );
}
