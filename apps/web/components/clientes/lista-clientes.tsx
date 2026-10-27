'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { formatarReais, SEGMENTOS, telefoneInternacional, type Segmento } from '@res/core';
import { exportarClientes, listarClientes, salvarCliente } from '@/app/(painel)/clientes/actions';
import { enderecoTexto, formatarTelefone, type ClienteBusca, type ClienteExportado, type ListagemClientes } from '@/lib/clientes';

const SEG = new Map(SEGMENTOS.map((x) => [x.id, x]));

/** CSV para Excel (pt-BR: ";" e BOM) com telefone no formato internacional para SMS e anúncios. */
function baixarCsv(lista: ClienteExportado[], nome: string) {
  const esc = (v: string | number | null) => {
    const t = v == null ? '' : String(v);
    return /[";\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const linhas = [
    ['nome', 'telefone', 'telefone_internacional', 'segmento', 'pedidos', 'total_gasto', 'ultimo_pedido', 'dias_sem_pedir', 'bairro'],
    ...lista.map((c) => [
      c.nome,
      formatarTelefone(c.telefone),
      telefoneInternacional(c.telefone),
      c.segmento ? SEG.get(c.segmento)?.rotulo ?? c.segmento : '',
      c.pedidos,
      (c.total_gasto / 100).toFixed(2).replace('.', ','),
      c.ultimo_pedido_em ? new Date(c.ultimo_pedido_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '',
      c.dias,
      c.bairro,
    ]),
  ];
  const blob = new Blob(['\ufeff' + linhas.map((l) => l.map(esc).join(';')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Cadastro de clientes do grupo: segmentos para marketing (D-029), busca, observações e endereços (D-025). */
export function ListaClientes({ inicial }: { inicial: ListagemClientes }) {
  const [termo, setTermo] = useState('');
  const [segmento, setSegmento] = useState<Segmento | null>(null);
  const [dados, setDados] = useState(inicial);
  const [lista, setLista] = useState(inicial.clientes);
  const [aberto, setAberto] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [exportando, iniciarExport] = useTransition();
  const [aviso, setAviso] = useState<string | null>(null);
  const primeira = useRef(true);

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    const t = termo.trim();
    if (t && t.replace(/\D/g, '').length < 4 && t.length < 2) return;
    let vivo = true;
    setCarregando(true);
    const id = setTimeout(
      () =>
        listarClientes(segmento, t)
          .then((r) => {
            if (!vivo || !r) return;
            setDados(r);
            setLista(r.clientes);
          })
          .finally(() => vivo && setCarregando(false)),
      t ? 250 : 0,
    );
    return () => {
      vivo = false;
      clearTimeout(id);
    };
  }, [termo, segmento]);

  const maisClientes = () => {
    setCarregando(true);
    listarClientes(segmento, termo.trim(), lista.length)
      .then((r) => r && setLista((l) => [...l, ...r.clientes]))
      .finally(() => setCarregando(false));
  };

  const exportar = () =>
    iniciarExport(async () => {
      setAviso(null);
      const r = await exportarClientes(segmento);
      if (!r.ok) return setAviso(r.erro);
      if (r.clientes.length === 0) return setAviso('Nenhum cliente neste segmento.');
      const nome = segmento ? SEG.get(segmento)!.rotulo : 'todos';
      baixarCsv(r.clientes, `clientes-${nome.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}-${new Date().toISOString().slice(0, 10)}.csv`);
      setAviso(`${r.clientes.length} cliente(s) exportado(s).`);
    });

  const totalComPedido = Object.values(dados.contagens).reduce((a, n) => a + (n ?? 0), 0);
  const atual = segmento ? SEG.get(segmento) : null;

  return (
    <div className="grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'end', flexWrap: 'wrap', gap: '0.6rem' }}>
        <div>
          <h1 style={{ marginBottom: 0 }}>Clientes</h1>
          <p className="dica" style={{ margin: 0 }}>Salvos sozinhos a cada pedido com telefone, para as lojas do grupo. Os segmentos se atualizam sozinhos a cada pedido.</p>
        </div>
        <button type="button" onClick={exportar} disabled={exportando}>
          {exportando ? 'Exportando…' : `⬇ Exportar ${atual ? atual.rotulo.toLowerCase() : 'todos'} (CSV)`}
        </button>
      </div>

      <div className="seg-chips" role="tablist" aria-label="Segmentos de clientes">
        <button type="button" role="tab" aria-selected={segmento === null} className="seg-chip" data-seg="todos" onClick={() => setSegmento(null)}>
          Todos <span className="seg-n">{totalComPedido + dados.sem_pedido}</span>
        </button>
        {SEGMENTOS.map((x) => (
          <button key={x.id} type="button" role="tab" aria-selected={segmento === x.id} className="seg-chip" data-seg={x.id} title={x.regra} onClick={() => setSegmento(segmento === x.id ? null : x.id)}>
            <span aria-hidden="true">{x.emoji}</span> {x.rotulo} <span className="seg-n">{dados.contagens[x.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {atual && (
        <div className="seg-explica" data-seg={atual.id}>
          <strong>{atual.emoji} {atual.rotulo}</strong>
          <span>{atual.regra}.</span>
          <span className="dica">Sugestão: {atual.acao}</span>
        </div>
      )}
      {aviso && <p className="dica" role="status" style={{ margin: 0 }}>{aviso}</p>}

      <input type="search" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar por telefone ou nome…" aria-label="Buscar cliente" style={{ maxWidth: 420 }} />
      {lista.length === 0 && !carregando && (
        <p className="cartao dica">{termo || segmento ? 'Nenhum cliente encontrado.' : 'Nenhum cliente ainda — eles aparecem aqui conforme os pedidos com telefone forem lançados.'}</p>
      )}
      <div className="grade" style={{ gap: '0.5rem', opacity: carregando ? 0.6 : 1 }}>
        {lista.map((c) => (
          <FichaCliente
            key={c.id}
            c={c}
            aberto={aberto === c.id}
            alternar={() => setAberto(aberto === c.id ? null : c.id)}
            aoSalvar={(n) => setLista((l) => l.map((x) => (x.id === n.id ? n : x)))}
          />
        ))}
      </div>
      {lista.length < dados.total && (
        <button type="button" onClick={maisClientes} disabled={carregando} style={{ justifySelf: 'start' }}>
          {carregando ? 'Carregando…' : `Ver mais (${lista.length} de ${dados.total})`}
        </button>
      )}
    </div>
  );
}

function FichaCliente({ c, aberto, alternar, aoSalvar }: { c: ClienteBusca; aberto: boolean; alternar: () => void; aoSalvar: (c: ClienteBusca) => void }) {
  const [nome, setNome] = useState(c.nome);
  const [obs, setObs] = useState(c.observacoes ?? '');
  const [remover, setRemover] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <article className="cartao grade" style={{ gap: '0.4rem' }}>
      <button type="button" className="cl-topo" onClick={alternar} aria-expanded={aberto}>
        <strong>{c.nome}</strong>
        <span>{formatarTelefone(c.telefone)}</span>
        {c.segmento && <span className="seg-chip seg-mini" data-seg={c.segmento}>{SEG.get(c.segmento)?.emoji} {SEG.get(c.segmento)?.rotulo}</span>}
        <span className="dica">
          {c.pedidos} pedido(s){c.total_gasto > 0 ? ` · ${formatarReais(c.total_gasto)}` : ''}
          {c.ultimo_pedido_em ? ` · último ${new Date(c.ultimo_pedido_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` : ''}
          {c.dias != null && c.dias > 0 ? ` (há ${c.dias} dia${c.dias === 1 ? '' : 's'})` : ''}
        </span>
        {c.observacoes && !aberto && <span className="cl-obs">📝 {c.observacoes}</span>}
      </button>
      {aberto && (
        <div className="grade" style={{ gap: '0.5rem' }}>
          <label>Nome<input value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} /></label>
          <label>Observações<textarea rows={2} maxLength={500} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: não gosta de cebola; portão azul" /></label>
          <div className="grade" style={{ gap: '0.25rem' }}>
            <span className="dica">Endereços salvos</span>
            {c.enderecos.length === 0 && <span className="dica">Nenhum (só pedidos de retirada/balcão).</span>}
            {c.enderecos.map((e) => (
              <label key={e.id} className="check" style={remover.includes(e.id) ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}>
                <input type="checkbox" checked={!remover.includes(e.id)} onChange={(x) => setRemover(x.target.checked ? remover.filter((r) => r !== e.id) : [...remover, e.id])} />
                {enderecoTexto(e)}{e.referencia ? ` (${e.referencia})` : ''}
              </label>
            ))}
          </div>
          {c.ultimo_item && <span className="dica">Último pedido: {c.ultimo_item}</span>}
          <div className="linha" style={{ alignItems: 'center' }}>
            <button
              type="button"
              className="botao-primario"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  const r = await salvarCliente(c.id, nome, obs, remover);
                  setMsg(r.ok ? { ok: true, t: 'Salvo.' } : { ok: false, t: r.erro });
                  if (r.ok) {
                    aoSalvar({ ...c, nome, observacoes: obs || null, enderecos: c.enderecos.filter((e) => !remover.includes(e.id)) });
                    setRemover([]);
                  }
                })
              }
            >
              {pendente ? 'Salvando…' : 'Salvar'}
            </button>
            {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.t}</span>}
          </div>
        </div>
      )}
    </article>
  );
}
