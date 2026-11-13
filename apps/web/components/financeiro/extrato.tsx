'use client';
import { useMemo, useState, useTransition } from 'react';
import { contasParecidas, ErroExtrato, lerOFX, sugerirConciliacao, type Extrato as ExtratoOFX } from '@res/core';
import { baixarExtrato, desfazerExtrato, ignorarExtrato, importarExtrato, lancarExtrato } from '@/app/(painel)/financeiro/actions';
import { salvando } from '@/components/tempo-real';
import { brl, dataBr, type Categoria, type ContaFin } from '@/lib/financeiro';

export type LinhaExtrato = {
  id: string;
  conta_id: string | null;
  data: string;
  /** reais; negativo = saída */
  valor: number;
  descricao: string;
  lancamento_id: string | null;
  criou: boolean;
  ignorado: 'venda' | 'transferencia' | 'outro' | null;
  lanc: { descricao: string; valor: number; vencimento: string } | null;
};
export type ContaEmAberto = { id: string; tipo: 'despesa' | 'receita'; descricao: string; valor: number; vencimento: string };

const centavos = (v: number) => Math.round(v * 100);
const IGNORADO: Record<string, string> = { venda: 'Venda (já está no RES)', transferencia: 'Transferência entre contas', outro: 'Ignorado' };

/** O arquivo OFX vem em UTF-8 ou em Windows-1252 (a maioria dos bancos brasileiros). */
async function lerArquivo(f: File): Promise<string> {
  const buf = await f.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buf);
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(buf) : utf8;
}

/** Extrato do banco (D-105): importa o OFX, sugere a conta que cada saída pagou e confere em um clique. */
export function ExtratoBanco({ linhas, abertas, categorias, contas }: { linhas: LinhaExtrato[]; abertas: ContaEmAberto[]; categorias: Categoria[]; contas: ContaFin[] }) {
  const [ver, setVer] = useState<'conferir' | 'feitos'>('conferir');
  const [arquivo, setArquivo] = useState<{ nome: string; ex: ExtratoOFX } | null>(null);
  const [conta, setConta] = useState(contas.find((c) => c.ativo && c.tipo === 'banco')?.id ?? '');
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  const pendentes = linhas.filter((l) => !l.lancamento_id && !l.ignorado).sort((a, b) => a.data.localeCompare(b.data));
  const feitos = linhas.filter((l) => l.lancamento_id || l.ignorado).sort((a, b) => b.data.localeCompare(a.data));
  const abertasC = useMemo(() => abertas.map((c) => ({ ...c, valor: centavos(c.valor) })), [abertas]);
  const porId = useMemo(() => new Map(abertas.map((c) => [c.id, c])), [abertas]);
  const sugestoes = useMemo(() => sugerirConciliacao(pendentes.map((l) => ({ id: l.id, data: l.data, valor: centavos(l.valor) })), abertasC), [pendentes, abertasC]);
  const nomeConta = useMemo(() => new Map(contas.map((c) => [c.id, c.nome])), [contas]);

  const rodar = (f: () => Promise<{ ok: true } | { ok: false; erro: string }>, sucesso?: string) =>
    iniciar(async () => {
      const r = await salvando(f());
      setAviso(r.ok ? (sucesso ? { ok: true, texto: sucesso } : null) : { ok: false, texto: r.erro });
    });

  const abrir = async (f: File | undefined) => {
    setAviso(null);
    setArquivo(null);
    if (!f) return;
    if (f.size > 5_000_000) return setAviso({ ok: false, texto: 'Arquivo grande demais. Exporte um período menor (um ou dois meses).' });
    try {
      const ex = lerOFX(await lerArquivo(f));
      if (!ex.transacoes.length) return setAviso({ ok: false, texto: 'O extrato não tem lançamentos nesse período.' });
      setArquivo({ nome: f.name, ex });
    } catch (e) {
      setAviso({ ok: false, texto: e instanceof ErroExtrato ? e.message : 'Não consegui ler este arquivo. Exporte de novo no formato OFX.' });
    }
  };
  const importar = () =>
    arquivo &&
    iniciar(async () => {
      const r = await salvando(importarExtrato(conta, arquivo.ex.transacoes));
      if (!r.ok) return setAviso({ ok: false, texto: r.erro });
      setArquivo(null);
      setVer('conferir');
      setAviso({ ok: true, texto: `${r.novas} lançamento${r.novas === 1 ? '' : 's'} novo${r.novas === 1 ? '' : 's'} do extrato${r.repetidas ? ` · ${r.repetidas} já estava${r.repetidas === 1 ? '' : 'm'} importado${r.repetidas === 1 ? '' : 's'}` : ''}.` });
    });

  const confirmarTodas = () => {
    const pares = [...sugestoes].map(([extrato, lancamento]) => ({ extrato, lancamento }));
    rodar(async () => {
      const r = await baixarExtrato(pares);
      return r.ok ? { ok: true } : r;
    }, `${pares.length} conta${pares.length === 1 ? '' : 's'} com baixa pelo extrato.`);
  };

  return (
    <div className="grade">
      <div className="cartao grade" style={{ gap: '0.6rem' }}>
        <h2 style={{ margin: 0 }}>🏦 Importar extrato do banco</h2>
        <p className="dica" style={{ margin: 0 }}>
          No app ou site do banco, procure <b>Extrato → Exportar → OFX</b> (às vezes chamado de &quot;Money&quot; ou &quot;arquivo para conciliação&quot;). O RES lê o arquivo e
          sugere qual conta a pagar cada saída pagou. Pode importar o mesmo período de novo: o que já entrou não duplica.
        </p>
        <div className="linha" style={{ gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap' }}>
          <label>
            Conta do banco
            <select value={conta} onChange={(e) => setConta(e.target.value)}>
              <option value="">— sem conta —</option>
              {contas.filter((c) => c.ativo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
          <label>
            Arquivo OFX
            <input type="file" accept=".ofx,.OFX,application/x-ofx,text/plain" onChange={(e) => { void abrir(e.target.files?.[0]); e.target.value = ''; }} />
          </label>
        </div>
        {arquivo && (
          <div className="fin-extrato-previa">
            <span>
              <b>{arquivo.nome}</b> · {arquivo.ex.inicio ? `${dataBr(arquivo.ex.inicio)} a ${dataBr(arquivo.ex.fim)}` : ''} · {arquivo.ex.transacoes.length} lançamentos
              {' '}({arquivo.ex.transacoes.filter((t) => t.valor < 0).length} saídas, {arquivo.ex.transacoes.filter((t) => t.valor > 0).length} entradas)
              {arquivo.ex.saldo != null && <> · saldo no banco {brl(arquivo.ex.saldo / 100)}</>}
            </span>
            <span className="linha" style={{ gap: '0.4rem' }}>
              <button type="button" className="mini" onClick={() => setArquivo(null)}>Cancelar</button>
              <button type="button" className="botao-primario" disabled={pendente} onClick={importar}>{pendente ? 'Importando…' : 'Importar'}</button>
            </span>
          </div>
        )}
      </div>

      {aviso && <p className={aviso.ok ? 'cartao fin-ok' : 'erro'} role={aviso.ok ? 'status' : 'alert'} style={{ margin: 0 }}>{aviso.texto}</p>}

      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
        <div className="abas-metrica" role="group" aria-label="Ver">
          <button type="button" aria-pressed={ver === 'conferir'} onClick={() => setVer('conferir')}>Para conferir ({pendentes.length})</button>
          <button type="button" aria-pressed={ver === 'feitos'} onClick={() => setVer('feitos')}>Conferidos ({feitos.length})</button>
        </div>
        {ver === 'conferir' && sugestoes.size > 0 && (
          <button type="button" className="botao-primario" disabled={pendente} onClick={confirmarTodas}>
            ✓ Confirmar as {sugestoes.size} sugest{sugestoes.size === 1 ? 'ão' : 'ões'}
          </button>
        )}
      </div>

      {ver === 'conferir' ? (
        pendentes.length === 0 ? (
          <p className="cartao dica" style={{ margin: 0 }}>{linhas.length ? 'Tudo conferido. 🎉' : 'Nenhum extrato importado ainda.'}</p>
        ) : (
          <div className="grade" style={{ gap: '0.5rem' }}>
            {pendentes.map((l) => (
              <LinhaConferir
                key={l.id}
                l={l}
                sugestao={porId.get(sugestoes.get(l.id) ?? '') ?? null}
                parecidas={contasParecidas({ id: l.id, data: l.data, valor: centavos(l.valor) }, abertasC).map((c) => porId.get(c.id)!)}
                categorias={categorias.filter((c) => c.ativo && c.tipo === (l.valor < 0 ? 'despesa' : 'receita'))}
                conta={l.conta_id ? nomeConta.get(l.conta_id) ?? null : null}
                pendente={pendente}
                rodar={rodar}
              />
            ))}
          </div>
        )
      ) : feitos.length === 0 ? (
        <p className="cartao dica" style={{ margin: 0 }}>Nada conferido ainda.</p>
      ) : (
        <div className="tabela-rolagem cartao" style={{ padding: 0 }}>
          <table className="tabela fin-tabela">
            <thead>
              <tr>
                <th>Data</th>
                <th>No banco</th>
                <th className="num">Valor</th>
                <th>Conferido como</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {feitos.slice(0, 300).map((l) => (
                <tr key={l.id}>
                  <td>{dataBr(l.data)}</td>
                  <td style={{ whiteSpace: 'normal' }}>{l.descricao}</td>
                  <td className="num" style={{ color: l.valor > 0 ? 'var(--fin-receita)' : undefined }}>{l.valor > 0 ? '+' : '−'} {brl(Math.abs(l.valor))}</td>
                  <td style={{ whiteSpace: 'normal' }}>
                    {l.ignorado ? <span className="dica">{IGNORADO[l.ignorado]}</span> : l.lanc ? <>{l.criou ? 'Lançado: ' : 'Baixa em: '}<b>{l.lanc.descricao}</b></> : <span className="dica">conta apagada</span>}
                  </td>
                  <td>
                    <button type="button" className="mini" disabled={pendente} onClick={() => rodar(() => desfazerExtrato(l.id))}>Desfazer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function LinhaConferir({
  l,
  sugestao,
  parecidas,
  categorias,
  conta,
  pendente,
  rodar,
}: {
  l: LinhaExtrato;
  sugestao: ContaEmAberto | null;
  parecidas: ContaEmAberto[];
  categorias: Categoria[];
  conta: string | null;
  pendente: boolean;
  rodar: (f: () => Promise<{ ok: true } | { ok: false; erro: string }>, sucesso?: string) => void;
}) {
  const saida = l.valor < 0;
  const [modo, setModo] = useState<'baixa' | 'lancar' | null>(null);
  const [escolhida, setEscolhida] = useState(sugestao?.id ?? parecidas[0]?.id ?? '');
  const [cat, setCat] = useState('');
  const [desc, setDesc] = useState(l.descricao);
  const baixar = (id: string) =>
    rodar(async () => {
      const r = await baixarExtrato([{ extrato: l.id, lancamento: id }]);
      return r.ok ? { ok: true } : r;
    });
  const escolhidaC = parecidas.find((c) => c.id === escolhida);

  return (
    <div className="cartao fin-extrato-linha" data-saida={saida || undefined}>
      <div className="fin-extrato-topo">
        <span className="dica">{dataBr(l.data)}{conta ? ` · ${conta}` : ''}</span>
        <strong className="fin-extrato-desc">{l.descricao}</strong>
        <strong className="fin-extrato-valor">{saida ? '−' : '+'} {brl(Math.abs(l.valor))}</strong>
      </div>
      {sugestao && !modo && (
        <div className="fin-extrato-sugestao">
          <span>
            Pagou <b>{sugestao.descricao}</b> <span className="dica">(vence {dataBr(sugestao.vencimento)})</span>
          </span>
          <button type="button" className="mini botao-primario" disabled={pendente} onClick={() => baixar(sugestao.id)}>✓ Confirmar</button>
        </div>
      )}
      {modo === 'baixa' && (
        <div className="linha" style={{ gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={escolhida} onChange={(e) => setEscolhida(e.target.value)} aria-label="Conta" style={{ maxWidth: '24rem' }}>
            {parecidas.map((c) => (
              <option key={c.id} value={c.id}>{dataBr(c.vencimento)} · {c.descricao} · {brl(c.valor)}</option>
            ))}
          </select>
          <button type="button" className="mini botao-primario" disabled={pendente || !escolhida} onClick={() => baixar(escolhida)}>Dar baixa</button>
          <button type="button" className="mini" onClick={() => setModo(null)}>Voltar</button>
          {escolhidaC && centavos(escolhidaC.valor) !== centavos(Math.abs(l.valor)) && (
            <span className="dica" style={{ flexBasis: '100%' }}>A conta é de {brl(escolhidaC.valor)}: fica com o valor que saiu do banco ({brl(Math.abs(l.valor))}), e o original vai para a observação.</span>
          )}
        </div>
      )}
      {modo === 'lancar' && (
        <div className="linha" style={{ gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={desc} maxLength={120} onChange={(e) => setDesc(e.target.value)} aria-label="Descrição" style={{ maxWidth: '18rem' }} />
          <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
            <option value="">— categoria —</option>
            {[...new Set(categorias.map((c) => c.grupo))].map((g) => (
              <optgroup key={g} label={g}>
                {categorias.filter((c) => c.grupo === g).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </optgroup>
            ))}
          </select>
          <button type="button" className="mini botao-primario" disabled={pendente} onClick={() => rodar(() => lancarExtrato(l.id, cat, desc))}>
            Lançar {saida ? 'despesa paga' : 'receita recebida'}
          </button>
          <button type="button" className="mini" onClick={() => setModo(null)}>Voltar</button>
        </div>
      )}
      {!modo && (
        <div className="linha" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
          {parecidas.length > 0 && <button type="button" className="mini" onClick={() => setModo('baixa')}>{sugestao ? 'Era outra conta' : `Dar baixa numa conta a ${saida ? 'pagar' : 'receber'}`}</button>}
          <button type="button" className="mini" onClick={() => setModo('lancar')}>Lançar como {saida ? 'despesa' : 'receita'}</button>
          {!saida && <button type="button" className="mini" disabled={pendente} onClick={() => rodar(() => ignorarExtrato(l.id, 'venda'))}>É venda (já está no RES)</button>}
          <button type="button" className="mini" disabled={pendente} onClick={() => rodar(() => ignorarExtrato(l.id, 'transferencia'))}>Transferência entre contas</button>
          <button type="button" className="mini" disabled={pendente} onClick={() => rodar(() => ignorarExtrato(l.id, 'outro'))}>Ignorar</button>
        </div>
      )}
    </div>
  );
}
