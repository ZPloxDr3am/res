'use client';
import { useRef, useState, useTransition } from 'react';
import { formatarReais } from '@res/core';
import { nfeBuscarAgora, nfeIgnorarRecebida, nfeRemoverCertificado, nfeSalvarCertificado, nfeXmlRecebida } from '@/app/(painel)/estoque/actions';
import { salvando } from '@/components/tempo-real';
import type { NotaRecebida, SituacaoCaixaNFe } from '@/lib/estoque';

const cnpjTexto = (c: string | null) => (c && c.length === 14 ? c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : c ?? '—');
const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');
const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
const DIA = 86400_000;

function situacaoDaNota(n: NotaRecebida): { texto: string; tom: 'ok' | 'espera' | 'alerta' | 'neutro' } {
  if (n.situacao === 'cancelada') return { texto: 'Cancelada pelo fornecedor', tom: 'alerta' };
  if (n.situacao === 'denegada') return { texto: 'Denegada na SEFAZ', tom: 'alerta' };
  if (n.status === 'importada') return { texto: 'Já deu entrada', tom: 'neutro' };
  if (n.status === 'ignorada') return { texto: 'Ignorada', tom: 'neutro' };
  if (n.status === 'disponivel') return { texto: 'Pronta para dar entrada', tom: 'ok' };
  if (n.status === 'ciencia') return { texto: 'Pedimos o XML à SEFAZ: chega em até 1 hora', tom: 'espera' };
  if (n.erro) return { texto: `A SEFAZ recusou o pedido do XML (${n.erro}). Importe o arquivo do fornecedor.`, tom: 'alerta' };
  if (n.emissao && Date.now() - Date.parse(n.emissao) > 30 * DIA) return { texto: 'Nota antiga: importe o XML do fornecedor', tom: 'neutro' };
  return { texto: 'Nova: o XML será pedido na próxima busca', tom: 'espera' };
}

/** Caixa de entrada automática de NF-e (D-102): notas que a SEFAZ tem para o CNPJ da loja. */
export function CaixaEntradaNFe({ caixa, abrindo, darEntrada }: { caixa: SituacaoCaixaNFe; abrindo: boolean; darEntrada: (carregar: () => Promise<string>) => void }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [trocar, setTrocar] = useState(false);
  const [verTodas, setVerTodas] = useState(false);
  const [pendente, iniciar] = useTransition();
  const c = caixa.certificado;

  if (!c || trocar) {
    return (
      <section className="cartao grade" aria-label="Receber notas automaticamente">
        <div>
          <h2 style={{ margin: 0 }}>📥 Receber as notas de compra automaticamente</h2>
          <p className="dica" style={{ margin: '0.2rem 0 0' }}>
            Com o <b>certificado digital A1 da empresa (e-CNPJ)</b>, o RES busca sozinho na SEFAZ, a cada hora, as notas que os fornecedores emitiram para o CNPJ desta loja.
            Você só confere e dá entrada no estoque, sem procurar o XML no e-mail.
          </p>
        </div>
        <ul className="dica" style={{ margin: 0, paddingLeft: '1.2rem' }}>
          <li>Para baixar o XML completo, o RES registra na SEFAZ a <b>Ciência da Operação</b> (aviso de que a empresa viu a nota; não confirma nem recusa a compra).</li>
          <li>O certificado e a senha ficam guardados criptografados no servidor e não aparecem mais na tela. Dá para desconectar quando quiser.</li>
          <li>A SEFAZ entrega notas dos últimos 90 dias e só permite uma nova busca a cada hora quando não há novidade.</li>
        </ul>
        {!caixa.pode_configurar ? (
          <p className="aviso" style={{ margin: 0 }}>Peça ao dono ou ao gerente para conectar o certificado A1 aqui.</p>
        ) : !caixa.uf_loja ? (
          <p className="aviso" style={{ margin: 0 }}>Antes, complete o endereço da loja (com a UF) nas configurações da loja.</p>
        ) : (
          <FormCertificado
            cnpjLoja={caixa.cnpj_loja}
            pendente={pendente}
            enviar={(form) =>
              iniciar(async () => {
                setMsg(null);
                const r = await salvando(nfeSalvarCertificado(form));
                setMsg(r.ok ? { ok: true, t: r.mensagem } : { ok: false, t: r.erro });
                if (r.ok) setTrocar(false);
              })
            }
            cancelar={c ? () => setTrocar(false) : undefined}
          />
        )}
        {msg && <p className={msg.ok ? 'aviso' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}
      </section>
    );
  }

  const vence = Date.parse(c.validade) - Date.now();
  const abertas = caixa.notas.filter((n) => n.status !== 'importada' && n.status !== 'ignorada');
  const lista = verTodas ? caixa.notas : abertas;
  const prontas = abertas.filter((n) => n.status === 'disponivel' && n.situacao === 'autorizada').length;
  const podeBuscar = Date.parse(c.proxima_consulta) <= Date.now();

  return (
    <section className="cartao grade" aria-label="Caixa de entrada de notas">
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="grade" style={{ gap: '0.15rem' }}>
          <h2 style={{ margin: 0 }}>📥 Notas recebidas da SEFAZ{prontas ? ` · ${prontas} pronta(s)` : ''}</h2>
          <span className="dica">
            {c.titular ?? 'Certificado'} · CNPJ {cnpjTexto(c.cnpj)} · válido até {data(c.validade)} · última busca {hora(c.ultima_consulta)}
            {!podeBuscar && ` · próxima a partir de ${hora(c.proxima_consulta)}`}
          </span>
        </div>
        <div className="linha" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="botao-primario"
            disabled={pendente}
            title={podeBuscar ? undefined : 'A SEFAZ só permite nova busca 1 hora depois de uma busca sem novidades'}
            onClick={() =>
              iniciar(async () => {
                setMsg(null);
                const r = await salvando(nfeBuscarAgora());
                setMsg(r.ok ? { ok: true, t: r.mensagem } : { ok: false, t: r.erro });
              })
            }
          >
            {pendente ? 'Buscando na SEFAZ…' : '↻ Buscar agora'}
          </button>
          {caixa.pode_configurar && (
            <>
              <button type="button" disabled={pendente} onClick={() => setTrocar(true)}>Trocar certificado</button>
              <button
                type="button"
                className="dica"
                disabled={pendente}
                onClick={() =>
                  iniciar(async () => {
                    const r = await salvando(nfeRemoverCertificado());
                    setMsg(r.ok ? { ok: true, t: 'Certificado removido. A busca automática parou.' } : { ok: false, t: r.erro });
                  })
                }
              >
                Desconectar
              </button>
            </>
          )}
        </div>
      </div>
      {vence < 30 * DIA && <p className={vence < 0 ? 'erro' : 'aviso'} style={{ margin: 0 }}>{vence < 0 ? 'O certificado venceu: envie o novo em "Trocar certificado".' : `O certificado vence em ${Math.ceil(vence / DIA)} dia(s). Renove e envie o novo em "Trocar certificado".`}</p>}
      {c.ultimo_erro && <p className="erro" style={{ margin: 0 }}>Última busca: {c.ultimo_erro}</p>}
      {msg && <p className={msg.ok ? 'aviso' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}

      {lista.length === 0 ? (
        <p className="dica" style={{ margin: 0 }}>{c.ultima_consulta ? 'Nenhuma nota nova para dar entrada.' : 'A primeira busca acontece em instantes; as notas aparecem aqui.'}</p>
      ) : (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr><th>Fornecedor</th><th>Emissão</th><th>Valor</th><th>Situação</th><th /></tr>
            </thead>
            <tbody>
              {lista.map((n) => {
                const s = situacaoDaNota(n);
                const pronta = n.status === 'disponivel' && n.situacao === 'autorizada';
                return (
                  <tr key={n.id}>
                    <td>
                      <strong>{n.emitente_nome ?? 'Fornecedor'}</strong>
                      <br />
                      <span className="dica">CNPJ {cnpjTexto(n.emitente_cnpj)} · nº {Number(n.chave.slice(25, 34))}</span>
                    </td>
                    <td>{data(n.emissao)}</td>
                    <td>{n.valor_total != null ? formatarReais(Math.round(n.valor_total * 100)) : '—'}</td>
                    <td><span className={s.tom === 'alerta' ? 'erro' : s.tom === 'ok' ? '' : 'dica'} style={s.tom === 'ok' ? { fontWeight: 600, color: 'var(--verde, #177a41)' } : undefined}>{s.texto}</span></td>
                    <td>
                      <div className="linha" style={{ gap: '0.3rem', justifyContent: 'flex-end' }}>
                        {pronta && (
                          <button
                            type="button"
                            className="mini botao-primario"
                            disabled={abrindo || pendente}
                            onClick={() =>
                              darEntrada(async () => {
                                const r = await nfeXmlRecebida(n.id);
                                if (!r.ok) {
                                  const e = new Error(r.erro);
                                  e.name = 'ErroCaixa';
                                  throw e;
                                }
                                return r.xml;
                              })
                            }
                          >
                            Dar entrada
                          </button>
                        )}
                        {n.status !== 'importada' && (
                          <button type="button" className="mini dica" disabled={pendente} onClick={() => iniciar(async () => { await salvando(nfeIgnorarRecebida(n.id, n.status !== 'ignorada')); })}>
                            {n.status === 'ignorada' ? 'Voltar' : 'Ignorar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {caixa.notas.length > abertas.length && (
        <button type="button" className="mini dica" style={{ justifySelf: 'start' }} onClick={() => setVerTodas((v) => !v)}>
          {verTodas ? 'Mostrar só as pendentes' : `Ver também as ${caixa.notas.length - abertas.length} já lançadas ou ignoradas`}
        </button>
      )}
    </section>
  );
}

function FormCertificado({ cnpjLoja, pendente, enviar, cancelar }: { cnpjLoja: string | null; pendente: boolean; enviar: (f: FormData) => void; cancelar?: () => void }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={ref}
      className="grade"
      onSubmit={(e) => {
        e.preventDefault();
        enviar(new FormData(e.currentTarget));
        const senha = e.currentTarget.elements.namedItem('senha') as HTMLInputElement | null;
        if (senha) senha.value = '';
      }}
    >
      <div className="cad-2">
        <label>
          Certificado A1 (.pfx ou .p12)
          <input type="file" name="arquivo" accept=".pfx,.p12,application/x-pkcs12" required />
        </label>
        <label>
          Senha do certificado
          <input type="password" name="senha" autoComplete="off" required />
        </label>
      </div>
      <span className="dica">{cnpjLoja ? `Precisa ser o e-CNPJ de ${cnpjTexto(cnpjLoja)} (ou da matriz/filial do mesmo CNPJ).` : 'Precisa ser o e-CNPJ da empresa desta loja.'} O e-CPF do dono não serve.</span>
      <div className="linha" style={{ gap: '0.4rem' }}>
        <button type="submit" className="botao-primario" disabled={pendente}>{pendente ? 'Conferindo e buscando notas…' : 'Conectar e buscar notas'}</button>
        {cancelar && <button type="button" onClick={cancelar}>Cancelar</button>}
      </div>
    </form>
  );
}
