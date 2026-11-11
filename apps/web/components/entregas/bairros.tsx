'use client';
import { useState, useTransition } from 'react';
import { formatarKm, formatarReais, lerCoordenadas } from '@res/core';
import { calcularKmBairro, localizarLoja, salvarAreas, salvarFaixasKm, salvarLocalLoja, type AreaForm, type FaixaForm, salvarPrazoEntrega } from '@/app/(painel)/entregas/actions';
import { salvando } from '@/components/tempo-real';

export type LojaBairros = {
  id: string;
  nome: string;
  cidade: string | null;
  endereco: string | null;
  lat: number | null;
  lng: number | null;
  prazoEntregaMin: number;
  marcas: { id: string; nome: string; areas: AreaForm[]; faixas: FaixaForm[] }[];
};

type Msg = { tipo: 'ok' | 'erro'; texto: string } | null;

const reais = (c: number | null) => (c == null ? '' : (c / 100).toFixed(2).replace('.', ','));
const centavos = (t: string): number | null => {
  const s = t.trim().replace(/\s|R\$/g, '');
  if (!s) return null;
  const n = Number(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};
const lerKm = (t: string): number | null => {
  const s = t.trim().replace(/\s|km/gi, '').replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n < 1000 ? Math.round(n * 100) / 100 : NaN;
};
const espera = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

/** Bairros e preços das lojas do grupo, uma aba por loja. */
export function BairrosEntregas({ lojas, inicial }: { lojas: LojaBairros[]; inicial: string }) {
  const [aba, setAba] = useState(lojas.some((l) => l.id === inicial) ? inicial : lojas[0]?.id);
  const loja = lojas.find((l) => l.id === aba);
  const todasMarcas = lojas.flatMap((l) => l.marcas.map((m) => ({ ...m, lojaId: l.id, loja: l.nome })));
  return (
    <div className="grade">
      {lojas.length > 1 && (
        <div className="abas" role="tablist" aria-label="Loja">
          {lojas.map((l) => (
            <button key={l.id} type="button" role="tab" aria-selected={l.id === aba} onClick={() => setAba(l.id)}>
              {l.nome}
            </button>
          ))}
        </div>
      )}
      {loja && (
        <div key={loja.id} className="grade">
          <LocalLoja loja={loja} />
          {loja.marcas.map((m) => (
            <div key={m.id} className="grade">
              <TabelaBairros loja={loja} marca={m} varias={loja.marcas.length > 1} outras={todasMarcas.filter((x) => x.id !== m.id)} />
              <FaixasKm loja={loja} marca={m} varias={loja.marcas.length > 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LocalLoja({ loja }: { loja: LojaBairros }) {
  const [endereco, setEndereco] = useState(loja.endereco ?? '');
  const [coord, setCoord] = useState(loja.lat != null ? `${loja.lat}, ${loja.lng}` : '');
  const [achado, setAchado] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();
  const p = lerCoordenadas(coord);

  return (
    <section className="cartao grade" aria-label="Localização da loja">
      <h2 style={{ margin: 0 }}>📍 Saída das entregas — {loja.nome}</h2>
      <p className="dica" style={{ margin: 0 }}>
        Daqui o sistema mede o km até cada bairro e até o endereço do cliente.{loja.cidade ? ` Cidade: ${loja.cidade}.` : ' Preencha a cidade da loja em Lojas e equipe.'}
      </p>
      <div className="linha" style={{ gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap' }}>
        <label className="grade" style={{ gap: '0.2rem', flex: '2 1 16rem' }}>
          <span className="dica">Endereço da loja</span>
          <input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua XV de Novembro, 100" maxLength={200} />
        </label>
        <button
          type="button"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              setMsg(null);
              const r = await localizarLoja(loja.id, endereco);
              if (!r.ok) return setMsg({ tipo: 'erro', texto: r.erro });
              setCoord(`${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}`);
              setAchado(r.nome);
            })
          }
        >
          {pendente ? 'Procurando…' : 'Achar no mapa'}
        </button>
        <label className="grade" style={{ gap: '0.2rem', flex: '1 1 12rem' }}>
          <span className="dica">Coordenadas (lat, long)</span>
          <input value={coord} onChange={(e) => { setCoord(e.target.value); setAchado(null); }} placeholder="-26.7409, -49.1765" inputMode="decimal" />
        </label>
        <button
          type="button"
          className="botao-primario"
          disabled={pendente || (coord.trim() !== '' && !p)}
          onClick={() =>
            iniciar(async () => {
              const r = await salvando(salvarLocalLoja(loja.id, endereco, p?.lat ?? null, p?.lng ?? null));
              setMsg(r.ok ? { tipo: 'ok', texto: 'Localização salva.' } : { tipo: 'erro', texto: r.erro });
            })
          }
        >
          Salvar local
        </button>
      </div>
      {achado && <p className="dica" style={{ margin: 0 }}>Achei: {achado}. Confira no mapa antes de salvar.</p>}
      {coord.trim() !== '' && !p && <p className="erro" style={{ margin: 0 }}>Coordenadas inválidas. Formato: -26.7409, -49.1765</p>}
      {p && (
        <a href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`} target="_blank" rel="noreferrer" style={{ justifySelf: 'start' }}>
          Ver o ponto no Google Maps ↗
        </a>
      )}
      <p className="dica" style={{ margin: 0 }}>
        Dica: no Google Maps, clique com o botão direito (ou toque e segure) em cima da loja — os números que aparecem são as coordenadas; cole aqui.
      </p>
      {msg && <p className={msg.tipo === 'ok' ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.texto}</p>}
      <PrazoEntrega loja={loja} />
    </section>
  );
}

/** Em quanto tempo a loja promete entregar (D-028): usado no alerta do quadro, na rota do motoboy e na página do cliente. */
function PrazoEntrega({ loja }: { loja: LojaBairros }) {
  const [min, setMin] = useState(String(loja.prazoEntregaMin));
  const [msg, setMsg] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();
  const n = Number(min);
  const valido = Number.isInteger(n) && n >= 10 && n <= 240;
  return (
    <div className="grade" style={{ gap: '0.3rem', borderTop: '1px solid var(--borda, #e3e3e3)', paddingTop: '0.7rem' }}>
      <strong>⏱ Prazo de entrega</strong>
      <div className="linha" style={{ gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <label className="linha" style={{ gap: '0.4rem', alignItems: 'center' }}>
          <input value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ''))} inputMode="numeric" style={{ width: '5rem' }} aria-label="Prazo de entrega em minutos" />
          <span>minutos depois do pedido</span>
        </label>
        <button
          type="button"
          className="botao-primario"
          disabled={pendente || !valido || n === loja.prazoEntregaMin}
          onClick={() =>
            iniciar(async () => {
              const r = await salvando(salvarPrazoEntrega(loja.id, n));
              setMsg(r.ok ? { tipo: 'ok', texto: 'Prazo salvo.' } : { tipo: 'erro', texto: r.erro });
            })
          }
        >
          Salvar prazo
        </button>
      </div>
      {!valido && <p className="erro" style={{ margin: 0 }}>Use de 10 a 240 minutos.</p>}
      <p className="dica" style={{ margin: 0 }}>
        Vale para pedidos de entrega sem horário agendado. O quadro de pedidos fica laranja quando faltam 10 min e vermelho quando estoura; o app do motoboy prioriza quem está mais perto de estourar; o cliente vê &quot;previsão de entrega: até…&quot;.
      </p>
      {msg && <p className={msg.tipo === 'ok' ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.texto}</p>}
    </div>
  );
}

type Linha = { bairro: string; taxa: string; motoboy: string; km: string; ativo: boolean; auto?: string };
const paraLinha = (a: AreaForm): Linha => ({ bairro: a.bairro, taxa: reais(a.taxa), motoboy: reais(a.valorMotoboy), km: a.km == null ? '' : String(a.km).replace('.', ','), ativo: a.ativo });

function TabelaBairros({
  loja,
  marca,
  varias,
  outras,
}: {
  loja: LojaBairros;
  marca: LojaBairros['marcas'][number];
  varias: boolean;
  outras: { id: string; nome: string; lojaId: string; loja: string; areas: AreaForm[] }[];
}) {
  const [linhas, setLinhas] = useState<Linha[]>(() => [...marca.areas].sort((a, b) => a.bairro.localeCompare(b.bairro, 'pt-BR')).map(paraLinha));
  const [msg, setMsg] = useState<Msg>(null);
  const [mudou, setMudou] = useState(false);
  const [calculando, setCalculando] = useState<string | null>(null);
  const [copiarDe, setCopiarDe] = useState('');
  const [pendente, iniciar] = useTransition();
  const temLocal = loja.lat != null;

  const mudar = (i: number, x: Partial<Linha>) => {
    setLinhas((ls) => ls.map((l, j) => (j === i ? { ...l, ...x } : l)));
    setMudou(true);
  };

  const validar = (): AreaForm[] | null => {
    const out: AreaForm[] = [];
    for (const l of linhas) {
      if (!l.bairro.trim() && !l.taxa.trim()) continue;
      const taxa = centavos(l.taxa);
      const valorMotoboy = centavos(l.motoboy);
      const km = lerKm(l.km);
      if (!l.bairro.trim()) {
        setMsg({ tipo: 'erro', texto: 'Há um bairro sem nome.' });
        return null;
      }
      if (taxa == null || Number.isNaN(taxa) || Number.isNaN(valorMotoboy) || Number.isNaN(km)) {
        setMsg({ tipo: 'erro', texto: `Valor inválido em "${l.bairro}". Use 5,00 para reais e 3,2 para km.` });
        return null;
      }
      out.push({ bairro: l.bairro.trim(), taxa, valorMotoboy, km, ativo: l.ativo });
    }
    return out;
  };

  const salvar = () =>
    iniciar(async () => {
      const areas = validar();
      if (!areas) return;
      const r = await salvando(salvarAreas(marca.id, areas));
      if (r.ok) setMudou(false);
      setMsg(r.ok ? { tipo: 'ok', texto: `${areas.length} bairro(s) salvos.` } : { tipo: 'erro', texto: r.erro });
    });

  const calcularTodos = async (todos: boolean) => {
    setMsg(null);
    let feitos = 0;
    const falhas: string[] = [];
    for (let i = 0; i < linhas.length; i++) {
      const l = linhas[i]!;
      if (!l.bairro.trim() || (!todos && l.km.trim())) continue;
      setCalculando(l.bairro);
      const r = await calcularKmBairro(loja.id, l.bairro);
      if (r.ok) {
        mudar(i, { km: String(r.km).replace('.', ','), auto: r.fonte === 'rota' ? 'pela rua' : 'linha reta' });
        feitos++;
      } else {
        falhas.push(l.bairro);
        if (r.erro.startsWith('Salve primeiro')) {
          setCalculando(null);
          return setMsg({ tipo: 'erro', texto: r.erro });
        }
      }
      await espera(1200); // serviço de mapa gratuito: no máximo 1 consulta por segundo
    }
    setCalculando(null);
    setMsg({
      tipo: falhas.length ? 'erro' : 'ok',
      texto: `${feitos} bairro(s) medidos${falhas.length ? `; não achei no mapa: ${falhas.join(', ')} (digite o km)` : ''}. Confira e clique em Salvar.`,
    });
  };

  const copiar = () => {
    const de = outras.find((o) => o.id === copiarDe);
    if (!de) return;
    // km é da loja de origem: só copia se for a mesma loja
    const mesma = de.lojaId === loja.id;
    setLinhas([...de.areas].sort((a, b) => a.bairro.localeCompare(b.bairro, 'pt-BR')).map((a) => ({ ...paraLinha(a), km: mesma ? paraLinha(a).km : '' })));
    setMudou(true);
    setMsg({ tipo: 'ok', texto: `Copiado de ${de.loja} · ${de.nome}${mesma ? '' : ' (sem o km — meça a partir desta loja)'}. Confira e clique em Salvar.` });
    setCopiarDe('');
  };

  const ativos = linhas.filter((l) => l.ativo && l.bairro.trim());
  return (
    <section className="cartao grade" aria-label={`Bairros de ${marca.nome}`}>
      <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>Bairros e preços{varias ? ` — ${marca.nome}` : ''}</h2>
        <span className="dica">{ativos.length} bairro(s) ativo(s)</span>
      </div>
      <p className="dica" style={{ margin: 0 }}>
        <strong>Taxa do cliente</strong> entra no pedido (cardápio digital e balcão). <strong>Motoboy recebe</strong> é o que vai para o motoboy em cada entrega — vazio = igual à taxa. <strong>Km</strong> é a distância da loja até o bairro (referência para precificar; na entrega o app mede o endereço exato).
      </p>
      <div className="tabela-rolagem">
        <table className="tabela tabela-bairros">
          <thead>
            <tr>
              <th>Bairro</th>
              <th>Taxa do cliente (R$)</th>
              <th>Motoboy recebe (R$)</th>
              <th>Km da loja</th>
              <th>Ativo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i} data-inativo={l.ativo ? undefined : 'sim'}>
                <td><input value={l.bairro} onChange={(e) => mudar(i, { bairro: e.target.value })} placeholder="Nome do bairro" aria-label="Bairro" maxLength={80} /></td>
                <td><input value={l.taxa} onChange={(e) => mudar(i, { taxa: e.target.value })} inputMode="decimal" placeholder="0,00" aria-label={`Taxa do cliente em ${l.bairro}`} className="num" /></td>
                <td><input value={l.motoboy} onChange={(e) => mudar(i, { motoboy: e.target.value })} inputMode="decimal" placeholder={l.taxa ? `= ${l.taxa}` : '= taxa'} aria-label={`Motoboy recebe em ${l.bairro}`} className="num" /></td>
                <td>
                  <input value={l.km} onChange={(e) => mudar(i, { km: e.target.value, auto: undefined })} inputMode="decimal" placeholder="—" aria-label={`Km até ${l.bairro}`} className="num" style={{ width: '5rem' }} />
                  {calculando === l.bairro ? <span className="dica"> medindo…</span> : l.auto ? <span className="dica"> {l.auto}</span> : null}
                </td>
                <td><input type="checkbox" checked={l.ativo} onChange={(e) => mudar(i, { ativo: e.target.checked })} aria-label={`${l.bairro} ativo`} /></td>
                <td><button type="button" className="mini" onClick={() => { setLinhas((ls) => ls.filter((_, j) => j !== i)); setMudou(true); }}>Remover</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {linhas.length === 0 && <p className="aviso" style={{ margin: 0 }}>Nenhum bairro: o cliente só consegue pedir para retirar.</p>}
      <div className="linha" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => { setLinhas((ls) => [...ls, { bairro: '', taxa: '', motoboy: '', km: '', ativo: true }]); setMudou(true); }}>+ Bairro</button>
        <button type="button" disabled={!temLocal || calculando != null || pendente} title={temLocal ? undefined : 'Salve a localização da loja primeiro'} onClick={() => calcularTodos(false)}>
          {calculando ? `Medindo ${calculando}…` : '📏 Medir km dos bairros sem km'}
        </button>
        {linhas.some((l) => l.km.trim()) && (
          <button type="button" className="mini" disabled={!temLocal || calculando != null || pendente} onClick={() => calcularTodos(true)}>Medir todos de novo</button>
        )}
        {outras.length > 0 && (
          <span className="linha" style={{ gap: '0.35rem' }}>
            <select value={copiarDe} onChange={(e) => setCopiarDe(e.target.value)} aria-label="Copiar tabela de">
              <option value="">Copiar tabela de…</option>
              {outras.map((o) => (
                <option key={o.id} value={o.id}>{o.loja} · {o.nome} ({o.areas.length})</option>
              ))}
            </select>
            {copiarDe && <button type="button" className="mini" onClick={copiar}>Copiar (substitui a lista)</button>}
          </span>
        )}
      </div>
      {!temLocal && <p className="dica" style={{ margin: 0 }}>Para medir o km sozinho, salve a localização da loja acima.</p>}
      <div className="linha" style={{ gap: '0.75rem', alignItems: 'center' }}>
        <button type="button" className="botao-primario" disabled={pendente || calculando != null} onClick={salvar}>{pendente ? 'Salvando…' : 'Salvar bairros'}</button>
        {mudou && <span className="dica">Alterações não salvas</span>}
        {msg && <span className={msg.tipo === 'ok' ? 'dica' : 'erro'} role="status">{msg.texto}</span>}
      </div>
      {ativos.length > 0 && (
        <p className="dica" style={{ margin: 0 }}>
          Média: taxa {formatarReais(Math.round(ativos.reduce((s, l) => s + (centavos(l.taxa) || 0), 0) / ativos.length))}
          {ativos.some((l) => lerKm(l.km)) && ` · ${formatarKm(ativos.reduce((s, l) => s + (lerKm(l.km) || 0), 0) / Math.max(1, ativos.filter((l) => lerKm(l.km)).length))} da loja`}
        </p>
      )}
    </section>
  );
}

type LinhaFaixa = { ateKm: string; taxa: string; minutos: string };

/** Taxa por raio em km para quem não está na lista de bairros (D-048). */
function FaixasKm({ loja, marca, varias }: { loja: LojaBairros; marca: { id: string; nome: string; faixas: FaixaForm[] }; varias: boolean }) {
  const [linhas, setLinhas] = useState<LinhaFaixa[]>(() =>
    marca.faixas.map((f) => ({ ateKm: String(f.ateKm).replace('.', ','), taxa: reais(f.taxa), minutos: f.minutosExtra ? String(f.minutosExtra) : '' })),
  );
  const [msg, setMsg] = useState<Msg>(null);
  const [pendente, iniciar] = useTransition();
  const mudar = (i: number, x: Partial<LinhaFaixa>) => setLinhas((l) => l.map((y, j) => (j === i ? { ...y, ...x } : y)));
  const salvar = () => {
    const faixas: FaixaForm[] = [];
    for (const l of linhas) {
      const km = lerKm(l.ateKm);
      const taxa = centavos(l.taxa);
      const min = l.minutos.trim() ? Number(l.minutos) : 0;
      if (km == null || Number.isNaN(km) || km <= 0) return setMsg({ tipo: 'erro', texto: 'Informe o km de cada faixa.' });
      if (taxa == null || Number.isNaN(taxa)) return setMsg({ tipo: 'erro', texto: 'Informe a taxa de cada faixa (0 = grátis).' });
      if (!Number.isInteger(min) || min < 0 || min > 240) return setMsg({ tipo: 'erro', texto: 'Tempo adicional em minutos (0 a 240).' });
      faixas.push({ ateKm: km, taxa, minutosExtra: min });
    }
    faixas.sort((a, b) => a.ateKm - b.ateKm);
    iniciar(async () => {
      const r = await salvando(salvarFaixasKm(marca.id, faixas));
      setMsg(r.ok ? { tipo: 'ok', texto: faixas.length ? `${faixas.length} faixa(s) salvas.` : 'Faixas removidas: só os bairros da lista recebem entrega.' } : { tipo: 'erro', texto: r.erro });
    });
  };
  return (
    <section className="cartao grade" aria-label={`Taxa por km${varias ? ` · ${marca.nome}` : ''}`}>
      <h3 style={{ margin: 0 }}>Taxa por distância (raio em km){varias ? ` · ${marca.nome}` : ''}</h3>
      <p className="dica" style={{ margin: 0 }}>
        Para endereços <strong>fora da lista de bairros</strong>: o cardápio acha o endereço no mapa, mede a distância em linha reta até a loja e cobra a primeira faixa que couber.
        Acima da última faixa, não entrega. Os bairros da lista continuam com o preço deles.
      </p>
      {loja.lat == null && linhas.length > 0 && <p className="erro" style={{ margin: 0 }}>Salve a localização da loja (acima) para as faixas funcionarem.</p>}
      {linhas.length > 0 && (
        <table className="tabela">
          <thead>
            <tr><th>Até (km)</th><th>Taxa (R$)</th><th>Tempo adicional (min)</th><th /></tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={i}>
                <td><input inputMode="decimal" aria-label="Até km" value={l.ateKm} onChange={(e) => mudar(i, { ateKm: e.target.value })} style={{ width: '6rem' }} /></td>
                <td><input inputMode="decimal" aria-label="Taxa" value={l.taxa} onChange={(e) => mudar(i, { taxa: e.target.value })} style={{ width: '7rem' }} /></td>
                <td><input inputMode="numeric" aria-label="Tempo adicional" value={l.minutos} placeholder="0" onChange={(e) => mudar(i, { minutos: e.target.value })} style={{ width: '6rem' }} /></td>
                <td><button type="button" aria-label="Remover faixa" onClick={() => setLinhas((x) => x.filter((_, j) => j !== i))}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="linha" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => {
            const ult = linhas[linhas.length - 1];
            const prox = ult ? (lerKm(ult.ateKm) ?? 0) + 2 : 3;
            setLinhas([...linhas, { ateKm: String(Number.isNaN(prox) ? 3 : prox).replace('.', ','), taxa: '', minutos: '' }]);
          }}
        >
          + Faixa
        </button>
        <button type="button" className="botao-primario" disabled={pendente} onClick={salvar}>
          {pendente ? 'Salvando…' : 'Salvar faixas'}
        </button>
        {msg && <span className={msg.tipo === 'erro' ? 'erro' : 'dica'} role="status">{msg.texto}</span>}
      </div>
    </section>
  );
}
