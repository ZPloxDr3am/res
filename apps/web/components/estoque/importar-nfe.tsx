'use client';
import { useRef, useState, useTransition } from 'react';
import { entradaDoItem, ErroNFe, formatarReais, lerNFe, palpiteUnidade, sugerirInsumo, UNIDADES_ESTOQUE, type NFe, type UnidadeEstoque } from '@res/core';
import { importarNFe, vinculosFornecedor, type ItemImportar } from '@/app/(painel)/estoque/actions';
import { salvando } from '@/components/tempo-real';
import { quantidadeTexto, type Insumo, type NotaImportada } from '@/lib/estoque';

type Linha = {
  acao: 'vincular' | 'novo' | 'ignorar';
  insumoId: string;
  novoNome: string;
  novaUnidade: UnidadeEstoque;
  fator: string;
  lembrado: boolean;
  conferir: boolean;
};
const cnpjTexto = (c: string) => (c.length === 14 ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : c);
const dataTexto = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');
const lerFator = (t: string) => Number(t.replace(',', '.'));

/** Entrada por NF-e (D-036): arraste o XML, confira o vínculo de cada item e dê entrada no estoque. */
export function ImportarNFe({ insumos, notas }: { insumos: Insumo[]; notas: NotaImportada[] }) {
  const ref = useRef<HTMLInputElement>(null);
  const [sobre, setSobre] = useState(false);
  const [nfe, setNfe] = useState<NFe | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [lendo, iniciarLeitura] = useTransition();
  const [pendente, iniciar] = useTransition();

  const abrir = (arquivo: File | undefined) =>
    arquivo &&
    iniciarLeitura(async () => {
      setErro(null);
      setOk(null);
      try {
        const n = lerNFe(await arquivo.text());
        if (notas.some((x) => x.chave === n.chave)) return setErro(`A NF ${n.numero} de ${n.emitente.nome} já foi importada.`);
        const vinc = await vinculosFornecedor(n.emitente.cnpj);
        setNfe(n);
        setLinhas(
          n.itens.map((it) => {
            const v = vinc[it.codigo];
            if (v && insumos.some((i) => i.id === v.insumo_id)) return { acao: 'vincular', insumoId: v.insumo_id, novoNome: '', novaUnidade: 'UN', fator: String(Number(v.fator)).replace('.', ','), lembrado: true, conferir: false };
            const p = palpiteUnidade(it.unidade);
            const s = sugerirInsumo(it.descricao, insumos);
            const nome = it.descricao.charAt(0) + it.descricao.slice(1).toLowerCase();
            return s
              ? { acao: 'vincular', insumoId: s.id, novoNome: nome, novaUnidade: p.unidade, fator: String(p.fator), lembrado: false, conferir: p.confirmar }
              : { acao: 'novo', insumoId: '', novoNome: nome, novaUnidade: p.unidade, fator: String(p.fator), lembrado: false, conferir: p.confirmar };
          }),
        );
      } catch (e) {
        setNfe(null);
        setErro(e instanceof ErroNFe ? e.message : 'Não consegui ler o arquivo. Use o XML da NF-e (o arquivo .xml que o fornecedor manda).');
      } finally {
        if (ref.current) ref.current.value = '';
      }
    });

  const muda = (k: number, p: Partial<Linha>) => setLinhas((ls) => ls.map((l, j) => (j === k ? { ...l, ...p } : l)));
  const unidadeDe = (l: Linha) => (l.acao === 'novo' ? l.novaUnidade : insumos.find((i) => i.id === l.insumoId)?.unidade ?? 'UN');
  const problema = linhas.findIndex((l) => l.acao !== 'ignorar' && ((l.acao === 'vincular' && !l.insumoId) || (l.acao === 'novo' && !l.novoNome.trim()) || !(lerFator(l.fator) > 0)));

  const confirmar = () =>
    nfe &&
    iniciar(async () => {
      const itens: ItemImportar[] = nfe.itens.map((it, k) => {
        const l = linhas[k]!;
        return {
          n: it.n,
          codigo: it.codigo,
          descricao: it.descricao,
          unidade: it.unidade,
          quantidade: it.quantidade,
          custo_total: it.custoTotal,
          acao: l.acao,
          insumo_id: l.acao === 'vincular' ? l.insumoId : null,
          novo: l.acao === 'novo' ? { nome: l.novoNome.trim(), unidade: l.novaUnidade } : null,
          fator: lerFator(l.fator),
        };
      });
      const r = await salvando(
        importarNFe({ chave: nfe.chave, numero: nfe.numero, serie: nfe.serie, emissao: nfe.emissao, emitente_cnpj: nfe.emitente.cnpj, emitente_nome: nfe.emitente.nome, valor_total: nfe.valorTotal, itens }),
      );
      if (!r.ok) return setErro(r.erro);
      setOk(`NF ${nfe.numero} importada: ${r.entradas} item(ns) entraram no estoque. Da próxima vez, os itens deste fornecedor já vêm ligados.`);
      setNfe(null);
      setLinhas([]);
    });

  return (
    <div className="grade">
      {!nfe && (
        <button
          type="button"
          className={`nfe-soltar ${sobre ? 'sobre' : ''}`}
          disabled={lendo}
          onClick={() => ref.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setSobre(true);
          }}
          onDragLeave={() => setSobre(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSobre(false);
            abrir(e.dataTransfer.files?.[0]);
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M12 18v-6M9 15l3-3 3 3" />
          </svg>
          <strong>{lendo ? 'Lendo a nota…' : sobre ? 'Solte o XML aqui' : 'Arraste o XML da NF-e aqui'}</strong>
          <span className="dica">ou clique para escolher o arquivo .xml que o fornecedor mandou</span>
        </button>
      )}
      <input ref={ref} type="file" accept=".xml,text/xml,application/xml" hidden onChange={(e) => abrir(e.target.files?.[0])} />
      {erro && <p className="erro" role="alert" style={{ margin: 0 }}>{erro}</p>}
      {ok && <p className="aviso" role="status">✓ {ok}</p>}

      {nfe && (
        <section className="cartao grade" aria-label="Conferir a nota">
          <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'start' }}>
            <div className="grade" style={{ gap: '0.15rem' }}>
              <h2 style={{ margin: 0 }}>NF {nfe.numero} · {nfe.emitente.nome}</h2>
              <span className="dica">
                CNPJ {cnpjTexto(nfe.emitente.cnpj)} · emitida {dataTexto(nfe.emissao)} · {nfe.itens.length} itens · total {formatarReais(nfe.valorTotal)}
                {nfe.destinatario.nome ? ` · para ${nfe.destinatario.nome}` : ''}
              </span>
            </div>
            <button type="button" onClick={() => { setNfe(null); setLinhas([]); }}>Trocar arquivo</button>
          </div>
          <p className="dica" style={{ margin: 0 }}>
            Ligue cada item da nota a um insumo. <strong>Fator</strong> = quantas unidades do insumo vêm em cada unidade da nota (ex.: caixa com 6 kg → 6). O custo já inclui desconto, frete e IPI da nota.
          </p>
          <div className="tabela-rolagem">
            <table className="tabela nfe-itens">
              <thead>
                <tr><th>Item da nota</th><th>Na nota</th><th>Vai para</th><th>Fator</th><th>Entra</th><th>Custo</th></tr>
              </thead>
              <tbody>
                {nfe.itens.map((it, k) => {
                  const l = linhas[k]!;
                  const u = unidadeDe(l);
                  const f = lerFator(l.fator);
                  const e = f > 0 ? entradaDoItem(it, f) : null;
                  return (
                    <tr key={it.n} data-ignorar={l.acao === 'ignorar' || undefined} data-problema={k === problema || undefined}>
                      <td>
                        <strong>{it.descricao}</strong>
                        <span className="dica"> · cód. {it.codigo}</span>
                        {l.lembrado && <span className="nfe-lembrado">ligado da última nota</span>}
                      </td>
                      <td>{quantidadeTexto(it.quantidade, it.unidade)}<br /><span className="dica">{formatarReais(it.custoTotal)}</span></td>
                      <td>
                        <div className="grade" style={{ gap: '0.3rem' }}>
                          <select
                            value={l.acao === 'vincular' ? l.insumoId : l.acao}
                            onChange={(ev) => {
                              const v = ev.target.value;
                              if (v === 'novo' || v === 'ignorar') muda(k, { acao: v, lembrado: false });
                              else muda(k, { acao: 'vincular', insumoId: v, lembrado: false });
                            }}
                            aria-label={`Insumo para ${it.descricao}`}
                          >
                            <option value="novo">+ Criar insumo novo</option>
                            <option value="ignorar">Não entra no estoque</option>
                            {insumos.length > 0 && (
                              <optgroup label="Insumos cadastrados">
                                {insumos.map((i) => <option key={i.id} value={i.id}>{i.nome} ({i.unidade.toLowerCase()})</option>)}
                              </optgroup>
                            )}
                          </select>
                          {l.acao === 'novo' && (
                            <span className="linha" style={{ gap: '0.3rem', flexWrap: 'nowrap' }}>
                              <input value={l.novoNome} maxLength={100} onChange={(ev) => muda(k, { novoNome: ev.target.value })} aria-label="Nome do insumo novo" />
                              <select value={l.novaUnidade} onChange={(ev) => muda(k, { novaUnidade: ev.target.value as UnidadeEstoque })} aria-label="Unidade do insumo novo" style={{ width: '5.5rem' }}>
                                {UNIDADES_ESTOQUE.map((x) => <option key={x.id} value={x.id}>{x.id.toLowerCase()}</option>)}
                              </select>
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {l.acao !== 'ignorar' && (
                          <input inputMode="decimal" value={l.fator} onChange={(ev) => muda(k, { fator: ev.target.value, conferir: false })} aria-label="Fator" style={{ width: '5rem' }} className={l.conferir ? 'nfe-conferir' : undefined}
                            title={l.conferir ? `Quantas ${u.toLowerCase()} vêm em cada ${it.unidade.toLowerCase()}?` : undefined} />
                        )}
                        {l.conferir && l.acao !== 'ignorar' && <span className="dica nfe-dica-fator">quantas {u.toLowerCase()} em 1 {it.unidade.toLowerCase()}?</span>}
                      </td>
                      <td>{l.acao === 'ignorar' ? '—' : e ? quantidadeTexto(e.quantidade, u) : <span className="erro">fator?</span>}</td>
                      <td>{l.acao === 'ignorar' || !e ? '—' : <>{formatarReais(Math.round(e.custoUnitario))}<span className="dica">/{u.toLowerCase()}</span></>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="linha" style={{ alignItems: 'center' }}>
            <button type="button" className="botao-primario" disabled={pendente || problema >= 0} onClick={confirmar}>
              {pendente ? 'Dando entrada…' : `Dar entrada no estoque (${linhas.filter((l) => l.acao !== 'ignorar').length} itens)`}
            </button>
            {problema >= 0 && <span className="dica">Falta escolher o insumo, o nome ou o fator do item {problema + 1}.</span>}
          </div>
        </section>
      )}

      <section className="grade" style={{ gap: '0.5rem' }}>
        <h2 style={{ margin: 0 }}>Notas importadas</h2>
        {notas.length === 0 ? (
          <p className="dica" style={{ margin: 0 }}>Nenhuma ainda.</p>
        ) : (
          <div className="cartao tabela-rolagem" style={{ padding: 0 }}>
            <table className="tabela">
              <thead><tr><th>Nota</th><th>Fornecedor</th><th>Emissão</th><th>Itens</th><th>Valor</th><th>Importada</th></tr></thead>
              <tbody>
                {notas.map((x) => (
                  <tr key={x.id}>
                    <td>NF {x.numero}</td>
                    <td>{x.emitente}</td>
                    <td>{dataTexto(x.emissao)}</td>
                    <td>{x.itens}</td>
                    <td>{formatarReais(x.valor)}</td>
                    <td className="dica">{dataTexto(x.em)} · {x.loja}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
