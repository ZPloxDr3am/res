'use client';
import { useEffect, useState, useTransition } from 'react';
import { formatarReais } from '@res/core';
import { buscarClientes, salvarCliente } from '@/app/(painel)/clientes/actions';
import { enderecoTexto, formatarTelefone, type ClienteBusca } from '@/lib/clientes';

/** Cadastro de clientes do grupo: busca, observações e endereços salvos (D-025). */
export function ListaClientes({ inicial }: { inicial: ClienteBusca[] }) {
  const [termo, setTermo] = useState('');
  const [lista, setLista] = useState(inicial);
  const [aberto, setAberto] = useState<string | null>(null);
  useEffect(() => {
    const t = termo.trim();
    if (t && t.replace(/\D/g, '').length < 4 && t.length < 2) return;
    let vivo = true;
    const id = setTimeout(() => buscarClientes(t, 50).then((r) => vivo && setLista(r)), 250);
    return () => {
      vivo = false;
      clearTimeout(id);
    };
  }, [termo]);

  return (
    <div className="grade">
      <div>
        <h1 style={{ marginBottom: 0 }}>Clientes</h1>
        <p className="dica" style={{ margin: 0 }}>Salvos sozinhos a cada pedido com telefone (balcão e cardápio digital), para as lojas do grupo. No novo pedido, digite o telefone ou o nome e os dados vêm preenchidos.</p>
      </div>
      <input type="search" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar por telefone ou nome…" aria-label="Buscar cliente" style={{ maxWidth: 420 }} />
      {lista.length === 0 && <p className="cartao dica">{termo ? 'Nenhum cliente encontrado.' : 'Nenhum cliente ainda — eles aparecem aqui conforme os pedidos com telefone forem lançados.'}</p>}
      <div className="grade" style={{ gap: '0.5rem' }}>
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
        <span className="dica">
          {c.pedidos} pedido(s){c.total_gasto > 0 ? ` · ${formatarReais(c.total_gasto)}` : ''}
          {c.ultimo_pedido_em ? ` · último ${new Date(c.ultimo_pedido_em).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` : ''}
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
