'use client';
import { useEffect, useState, useTransition } from 'react';
import { reais, type ItemFatura, type ModuloRes, type PlanoRes } from '@res/core';
import { contratarAdicional, conferirFatura, escolherPlano, gerarFatura, pagarFatura } from '@/app/(painel)/assinatura/actions';
import type { PixFatura } from '@/lib/cobranca';

export interface FaturaRes {
  id: string;
  inicio: string;
  lojas: number;
  valor: number;
  vence_em: string;
  itens: ItemFatura[];
  status: 'aberta' | 'paga' | 'cancelada';
  forma: string | null;
  pago_em: string | null;
  tem_pix: boolean;
}
export interface DadosAssinatura {
  situacao: 'teste' | 'ativa' | 'suspensa';
  teste_ate: string | null;
  pago_ate: string | null;
  liberada: boolean;
  sem_cobranca: boolean;
  plano: string;
  valor: { plano: string; lojas: number; itens: ItemFatura[]; total: number };
  modulos_ativos: string[];
  planos: PlanoRes[];
  catalogo: ModuloRes[];
  adicionais: { modulo: string; ligado: boolean; cobrar: boolean }[];
  faturas: FaturaRes[];
}

const data = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');

/** Assinatura do restaurante (D-085): situação, valor do mês, fatura com Pix, planos e adicionais. */
export function Assinatura({ d, pixAutomatico }: { d: DadosAssinatura; pixAutomatico: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [pix, setPix] = useState<PixFatura | null>(null);
  const aberta = d.faturas.find((f) => f.status === 'aberta') ?? null;
  const planoAtual = d.planos.find((p) => p.id === d.plano);
  const rodar = (f: () => Promise<{ ok: boolean; erro?: string }>) => {
    setErro(null);
    iniciar(async () => {
      const r = await f();
      if (!r.ok) setErro(r.erro ?? 'Não deu certo.');
    });
  };

  // Pix na tela: confere a cada 5 s até cair
  useEffect(() => {
    if (!aberta || pix?.estado !== 'aguardando') return;
    const t = setInterval(() => void conferirFatura(aberta.id).then((s) => s === 'paga' && setPix({ estado: 'paga' })), 5000);
    return () => clearInterval(t);
  }, [aberta, pix]);

  const situacao = d.sem_cobranca
    ? { rotulo: 'Conta parceira', texto: 'Sem cobrança e com todos os módulos liberados.' }
    : d.situacao === 'teste'
      ? { rotulo: 'Teste grátis', texto: `Tudo liberado até ${data(d.teste_ate)}. Depois segue no plano escolhido abaixo.` }
      : d.situacao === 'suspensa'
        ? { rotulo: 'Suspensa', texto: 'Fale com o time do RES pelo Suporte.' }
        : { rotulo: d.liberada ? 'Ativa' : 'Vencida', texto: d.liberada ? `Paga até ${data(d.pago_ate)}.` : 'Novos pedidos pausados até o pagamento.' };

  const adicionais = d.catalogo.filter((m) => m.cobranca === 'loja' && !planoAtual?.modulos.includes(m.id));
  const nomeModulo = (id: string) => d.catalogo.find((m) => m.id === id)?.nome ?? id;

  return (
    <div className="grade">
      <section className="cartao grade">
        <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="grade" style={{ gap: '0.2rem' }}>
            <span className="plano-selo">{situacao.rotulo}</span>
            <h2 style={{ margin: 0 }}>Plano {planoAtual?.nome ?? d.plano}</h2>
            <span className="dica">{situacao.texto}</span>
          </div>
          {!d.sem_cobranca && (
            <div style={{ textAlign: 'right' }}>
              <div className="plano-preco">{reais(d.valor.total)}<small> /mês</small></div>
              <span className="dica">{d.valor.lojas} loja{d.valor.lojas === 1 ? '' : 's'}</span>
            </div>
          )}
        </div>
        {!d.sem_cobranca && (
          <table className="fatura-itens">
            <tbody>
              {d.valor.itens.map((i) => (
                <tr key={i.descricao}><td>{i.descricao}{i.qtd > 1 ? ` × ${i.qtd}` : ''}</td><td>{reais(i.total)}</td></tr>
              ))}
              <tr><td>Total por mês</td><td>{reais(d.valor.total)}</td></tr>
            </tbody>
          </table>
        )}
      </section>

      {!d.sem_cobranca && (
        <section className="cartao grade">
          <h2 style={{ margin: 0 }}>Fatura</h2>
          {aberta ? (
            <>
              <p style={{ margin: 0 }}>
                <strong>{reais(Number(aberta.valor))}</strong> · vence em {data(aberta.vence_em)} · cobre 1 mês a partir dessa data
              </p>
              {pix?.estado === 'paga' ? (
                <p className="faixa-conta" data-tipo="teste" role="status" style={{ margin: 0 }}><strong>Pagamento confirmado.</strong> Obrigado! A conta já está ativa.</p>
              ) : pix?.estado === 'aguardando' ? (
                <div className="pix-caixa">
                  {pix.qr_base64 && <img src={`data:image/png;base64,${pix.qr_base64}`} alt="QR Code do Pix" />}
                  <span className="dica">Abra o app do banco, escolha Pix e leia o QR, ou copie o código abaixo.</span>
                  <textarea readOnly rows={3} value={pix.qr} onFocus={(e) => e.currentTarget.select()} aria-label="Pix copia e cola" />
                  <button type="button" className="botao" onClick={() => void navigator.clipboard.writeText(pix.qr)}>Copiar código</button>
                  <span className="dica" role="status">Esperando o pagamento… a tela atualiza sozinha.</span>
                </div>
              ) : pix?.estado === 'manual' || !pixAutomatico ? (
                <p className="dica" style={{ margin: 0 }}>Para pagar, fale com o time do RES pelo Suporte (no menu): enviamos o Pix e a conta é liberada assim que cair.</p>
              ) : (
                <>
                  {pix?.estado === 'erro' && <p className="erro" style={{ margin: 0 }}>{pix.mensagem}</p>}
                  <button type="button" className="botao-primario" disabled={pendente} onClick={() => iniciar(async () => setPix(await pagarFatura(aberta.id)))}>
                    {pendente ? 'Gerando Pix…' : 'Pagar com Pix'}
                  </button>
                </>
              )}
            </>
          ) : (
            <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span className="dica">Nenhuma fatura em aberto. A próxima é gerada sozinha 5 dias antes de {d.situacao === 'teste' ? 'o teste acabar' : 'vencer'}.</span>
              <button type="button" className="botao" disabled={pendente} onClick={() => rodar(gerarFatura)}>Pagar adiantado</button>
            </div>
          )}
        </section>
      )}

      <section className="grade">
        <h2 style={{ margin: 0 }}>Planos</h2>
        <div className="plano-grade">
          {d.planos.filter((p) => p.ativo || p.id === d.plano).map((p) => {
            const atual = p.id === d.plano;
            return (
              <article key={p.id} className="plano-cartao" data-atual={atual || undefined}>
                {atual && <span className="plano-selo">Seu plano</span>}
                <h3>{p.nome}</h3>
                <div className="plano-preco">{reais(Number(p.preco_loja))}<small> /loja/mês</small></div>
                <p className="dica" style={{ margin: 0 }}>{p.descricao}</p>
                <ul className="plano-lista">
                  <li>✓ Cardápio digital, pedidos, delivery, impressão e caixa</li>
                  {d.catalogo.filter((m) => m.cobranca === 'loja').map((m) => (
                    <li key={m.id} data-nao={!p.modulos.includes(m.id) || undefined}>{p.modulos.includes(m.id) ? '✓' : '—'} {m.nome}</li>
                  ))}
                  <li data-nao={!p.modulos.includes('marcas') || undefined}>{p.modulos.includes('marcas') ? '✓ Vários cardápios na mesma loja' : '— Cardápio extra à parte'}</li>
                </ul>
                {!atual && !d.sem_cobranca && (confirmar === p.id ? (
                  <div className="linha" style={{ gap: '0.4rem' }}>
                    <button type="button" className="botao-primario" style={{ flex: 1 }} disabled={pendente} onClick={() => rodar(async () => { const r = await escolherPlano(p.id); setConfirmar(null); return r; })}>Confirmar troca</button>
                    <button type="button" className="botao" onClick={() => setConfirmar(null)}>Voltar</button>
                  </div>
                ) : (
                  <button type="button" className="botao" onClick={() => setConfirmar(p.id)}>Mudar para {p.nome}</button>
                ))}
              </article>
            );
          })}
        </div>
        {confirmar && <p className="dica" style={{ margin: 0 }}>A troca vale na hora: as telas do novo plano aparecem já, e a fatura em aberto é recalculada.</p>}
      </section>

      {!d.sem_cobranca && adicionais.length > 0 && (
        <section className="cartao grade">
          <div>
            <h2 style={{ margin: 0 }}>Adicionais</h2>
            <p className="dica" style={{ margin: 0 }}>Só o que falta no seu plano, sem precisar mudar de plano. Valor por loja, por mês.</p>
          </div>
          <table className="mod-matriz">
            <tbody>
              {adicionais.map((m) => {
                const a = d.adicionais.find((x) => x.modulo === m.id);
                const ajustePeloRes = a && (!a.ligado || !a.cobrar);
                const ligado = !!a?.ligado;
                return (
                  <tr key={m.id}>
                    <td><strong>{m.nome}</strong><br /><span className="dica">{m.descricao}</span></td>
                    <td>{reais(Number(m.preco))}</td>
                    <td>
                      {a && ajustePeloRes ? (
                        <span className="dica">{a.ligado ? 'Cortesia do RES' : 'Bloqueado pelo RES'}</span>
                      ) : (
                        <button type="button" className={ligado ? 'botao' : 'botao-primario'} disabled={pendente} onClick={() => rodar(() => contratarAdicional(m.id, !ligado))}>
                          {ligado ? 'Remover' : 'Contratar'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {erro && <p className="erro" role="alert" style={{ margin: 0 }}>{erro}</p>}

      {d.faturas.length > 0 && (
        <section className="cartao grade">
          <h2 style={{ margin: 0 }}>Histórico</h2>
          <table className="mod-matriz">
            <thead><tr><th>Mês a partir de</th><th>Valor</th><th>Situação</th></tr></thead>
            <tbody>
              {d.faturas.map((f) => (
                <tr key={f.id}>
                  <td>{data(f.inicio)}<br /><span className="dica">{f.itens.map((i) => i.descricao).join(' · ')}</span></td>
                  <td>{reais(Number(f.valor))}</td>
                  <td>{f.status === 'paga' ? `Paga em ${data(f.pago_em)}${f.forma === 'pix' ? ' (Pix)' : ''}` : f.status === 'cancelada' ? 'Cancelada' : 'Em aberto'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <p className="dica" style={{ margin: 0 }}>Módulos ligados agora: {d.modulos_ativos.length ? d.modulos_ativos.map(nomeModulo).join(', ') : 'só o básico'}.</p>
    </div>
  );
}
