'use client';
import { useState, useTransition } from 'react';
import { salvarCategoria, salvarContaFin, salvarFornecedor, salvarTaxas } from '@/app/(painel)/financeiro/actions';
import { salvando } from '@/components/tempo-real';
import { DICA_TAXA, FORMAS_VENDA, LINHAS, type Categoria, type ContaFin, type Fornecedor, type Linha, type Taxa } from '@/lib/financeiro';

const num = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

function useSalvar() {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const rodar = (f: () => Promise<{ ok: true } | { ok: false; erro: string }>, ok: string, depois?: () => void) =>
    iniciar(async () => {
      const r = await salvando(f());
      setMsg(r.ok ? { ok: true, t: ok } : { ok: false, t: r.erro });
      if (r.ok) depois?.();
    });
  const aviso = msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.t}</span>;
  return { pendente, rodar, aviso };
}

export function Taxas({ inicial }: { inicial: Taxa[] }) {
  const [t, setT] = useState(() =>
    Object.keys(FORMAS_VENDA).map((f) => {
      const x = inicial.find((i) => i.forma === f);
      return { forma: f, percentual: String(x?.percentual ?? 0).replace('.', ','), fixa: String(x?.fixa ?? 0).replace('.', ','), dias: String(x?.dias ?? 0) };
    }),
  );
  const { pendente, rodar, aviso } = useSalvar();
  const m = (i: number, x: Partial<(typeof t)[number]>) => setT((v) => v.map((r, k) => (k === i ? { ...r, ...x } : r)));
  return (
    <section className="cartao grade">
      <h2 style={{ margin: 0 }}>Taxas das formas de pagamento das vendas</h2>
      <p className="dica" style={{ margin: 0 }}>Com isso o DRE desconta sozinho o que a maquininha, o vale e o pagamento online cobram de cada venda. Veja no extrato da sua maquininha.</p>
      <div className="tabela-rolagem">
        <table className="tabela gc-tabela">
          <thead>
            <tr><th>Forma</th><th>% por venda</th><th>R$ fixo por venda</th><th>Cai em (dias)</th><th /></tr>
          </thead>
          <tbody>
            {t.map((r, i) => (
              <tr key={r.forma}>
                <td>{FORMAS_VENDA[r.forma]}</td>
                <td><input inputMode="decimal" value={r.percentual} onChange={(e) => m(i, { percentual: e.target.value })} style={{ width: '5rem' }} aria-label={`% ${FORMAS_VENDA[r.forma]}`} /></td>
                <td><input inputMode="decimal" value={r.fixa} onChange={(e) => m(i, { fixa: e.target.value })} style={{ width: '5rem' }} aria-label={`Fixo ${FORMAS_VENDA[r.forma]}`} /></td>
                <td><input inputMode="numeric" value={r.dias} onChange={(e) => m(i, { dias: e.target.value })} style={{ width: '4rem' }} aria-label={`Dias ${FORMAS_VENDA[r.forma]}`} /></td>
                <td className="dica">{DICA_TAXA[r.forma]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="linha" style={{ alignItems: 'center' }}>
        <button type="button" className="botao-primario" disabled={pendente} onClick={() => rodar(() => salvarTaxas(t.map((r) => ({ forma: r.forma, percentual: num(r.percentual), fixa: num(r.fixa), dias: num(r.dias) }))), 'Taxas salvas.')}>
          Salvar taxas
        </button>
        {aviso}
      </div>
    </section>
  );
}

export function Categorias({ inicial }: { inicial: Categoria[] }) {
  const [nova, setNova] = useState<{ tipo: 'despesa' | 'receita'; linha: Linha; grupo: string; nome: string } | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const { pendente, rodar, aviso } = useSalvar();
  const grupos = [...new Set(inicial.map((c) => `${c.tipo}|${c.grupo}`))];
  return (
    <section className="cartao grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Categorias</h2>
        <button type="button" className="mini" onClick={() => setNova({ tipo: 'despesa', linha: 'despesas_operacionais', grupo: 'Administrativo', nome: '' })}>+ Nova categoria</button>
      </div>
      <p className="dica" style={{ margin: 0 }}>Cada categoria cai numa linha do DRE. Desative as que não usa; renomeie à vontade.</p>
      {nova && (
        <div className="gc-campos">
          <label>Tipo<select value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value as 'despesa' | 'receita', linha: e.target.value === 'receita' ? 'outras_receitas' : 'despesas_operacionais' })}><option value="despesa">Despesa</option><option value="receita">Receita</option></select></label>
          <label>Linha do DRE<select value={nova.linha} onChange={(e) => setNova({ ...nova, linha: e.target.value as Linha })}>
            {(Object.keys(LINHAS) as Linha[]).filter((l) => (nova.tipo === 'receita') === (l === 'outras_receitas' || l === 'aportes')).map((l) => <option key={l} value={l}>{LINHAS[l]}</option>)}
          </select></label>
          <label>Grupo<input list="fin-grupos" value={nova.grupo} maxLength={60} onChange={(e) => setNova({ ...nova, grupo: e.target.value })} /></label>
          <datalist id="fin-grupos">{[...new Set(inicial.map((c) => c.grupo))].map((g) => <option key={g} value={g} />)}</datalist>
          <label>Nome<input autoFocus value={nova.nome} maxLength={60} onChange={(e) => setNova({ ...nova, nome: e.target.value })} /></label>
          <div className="linha gc-largo">
            <button type="button" className="botao-primario" disabled={pendente} onClick={() => rodar(() => salvarCategoria({ ...nova, ativo: true }), 'Categoria criada.', () => setNova(null))}>Criar</button>
            <button type="button" onClick={() => setNova(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {aviso}
      <div className="fin-cats">
        {grupos.map((g) => {
          const [tipo, grupo] = g.split('|');
          const cs = inicial.filter((c) => c.tipo === tipo && c.grupo === grupo);
          return (
            <div key={g}>
              <strong>{grupo}</strong> <span className="dica">· {tipo === 'receita' ? 'receita' : LINHAS[cs[0]!.linha]}</span>
              <ul>
                {cs.map((c) => (
                  <li key={c.id} data-inativo={!c.ativo || undefined}>
                    {editando === c.id ? (
                      <span className="linha" style={{ gap: '0.3rem' }}>
                        <input value={nome} maxLength={60} onChange={(e) => setNome(e.target.value)} autoFocus />
                        <button type="button" className="mini botao-primario" disabled={pendente} onClick={() => rodar(() => salvarCategoria({ ...c, nome }), 'Renomeada.', () => setEditando(null))}>OK</button>
                      </span>
                    ) : (
                      <>
                        <span>{c.nome}</span>
                        <span className="linha" style={{ gap: '0.25rem' }}>
                          <button type="button" className="mini" onClick={() => { setEditando(c.id); setNome(c.nome); }}>Renomear</button>
                          <button type="button" className="mini" disabled={pendente} onClick={() => rodar(() => salvarCategoria({ ...c, ativo: !c.ativo }), c.ativo ? 'Desativada.' : 'Ativada.')}>{c.ativo ? 'Desativar' : 'Ativar'}</button>
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Fornecedores({ inicial }: { inicial: Fornecedor[] }) {
  const vazio = { nome: '', documento: '', telefone: '', observacao: '', ativo: true };
  const [f, setF] = useState<(typeof vazio & { id?: string }) | null>(null);
  const { pendente, rodar, aviso } = useSalvar();
  return (
    <section className="cartao grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Fornecedores</h2>
        <button type="button" className="mini" onClick={() => setF(vazio)}>+ Novo fornecedor</button>
      </div>
      <p className="dica" style={{ margin: 0 }}>Quem vem de NF-e importada no estoque é cadastrado sozinho, pelo CNPJ.</p>
      {f && (
        <div className="gc-campos">
          <label>Nome<input autoFocus value={f.nome} maxLength={120} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
          <label>CPF ou CNPJ<input inputMode="numeric" value={f.documento} onChange={(e) => setF({ ...f, documento: e.target.value })} /></label>
          <label>Telefone / WhatsApp<input inputMode="tel" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} /></label>
          <label>Observação<input value={f.observacao} maxLength={200} onChange={(e) => setF({ ...f, observacao: e.target.value })} /></label>
          <div className="linha gc-largo">
            <button type="button" className="botao-primario" disabled={pendente} onClick={() => rodar(() => salvarFornecedor(f), 'Fornecedor salvo.', () => setF(null))}>Salvar</button>
            <button type="button" onClick={() => setF(null)}>Cancelar</button>
          </div>
        </div>
      )}
      {aviso}
      {inicial.length === 0 ? (
        <p className="dica" style={{ margin: 0 }}>Nenhum fornecedor ainda.</p>
      ) : (
        <ul className="qp-fila">
          {inicial.map((x) => (
            <li key={x.id} data-pulado={!x.ativo || undefined}>
              <span className="grade" style={{ gap: 0 }}>
                <strong>{x.nome}</strong>
                <span className="dica">{[x.documento, x.telefone, x.observacao].filter(Boolean).join(' · ') || '—'}</span>
              </span>
              <span className="linha" style={{ gap: '0.3rem', flexWrap: 'nowrap' }}>
                {x.telefone && <a className="botao mini" href={`https://wa.me/55${x.telefone}`} target="_blank" rel="noreferrer">💬</a>}
                <button type="button" className="mini" onClick={() => setF({ id: x.id, nome: x.nome, documento: x.documento ?? '', telefone: x.telefone ?? '', observacao: x.observacao ?? '', ativo: x.ativo })}>Editar</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Contas({ inicial }: { inicial: ContaFin[] }) {
  const [nova, setNova] = useState<{ nome: string; tipo: ContaFin['tipo'] } | null>(null);
  const { pendente, rodar, aviso } = useSalvar();
  return (
    <section className="cartao grade">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Contas (caixa e bancos)</h2>
        <button type="button" className="mini" onClick={() => setNova({ nome: '', tipo: 'banco' })}>+ Nova conta</button>
      </div>
      {nova && (
        <div className="linha">
          <input autoFocus placeholder="Ex.: Banco do Brasil, Nubank PJ" value={nova.nome} maxLength={60} onChange={(e) => setNova({ ...nova, nome: e.target.value })} />
          <select value={nova.tipo} onChange={(e) => setNova({ ...nova, tipo: e.target.value as ContaFin['tipo'] })}>
            <option value="banco">Banco</option>
            <option value="caixa">Caixa (dinheiro)</option>
            <option value="carteira">Carteira digital</option>
          </select>
          <button type="button" className="botao-primario" disabled={pendente} onClick={() => rodar(() => salvarContaFin({ ...nova, ativo: true }), 'Conta criada.', () => setNova(null))}>Criar</button>
          <button type="button" onClick={() => setNova(null)}>Cancelar</button>
        </div>
      )}
      {aviso}
      <ul className="qp-fila">
        {inicial.map((c) => (
          <li key={c.id} data-pulado={!c.ativo || undefined}>
            <span><strong>{c.nome}</strong> <span className="dica">· {c.tipo === 'caixa' ? 'caixa' : c.tipo === 'banco' ? 'banco' : 'carteira digital'}</span></span>
            <button type="button" className="mini" disabled={pendente} onClick={() => rodar(() => salvarContaFin({ ...c, ativo: !c.ativo }), c.ativo ? 'Desativada.' : 'Ativada.')}>{c.ativo ? 'Desativar' : 'Ativar'}</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
