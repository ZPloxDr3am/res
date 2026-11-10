'use client';
import { useEffect, useState, useTransition } from 'react';
import { reais, type ItemFatura, type ModuloRes, type PlanoRes } from '@res/core';
import { contratarAdicional, contratarAparelhos, conferirFatura, definirCiclo, escolherPlano, gerarFatura, pagarFatura } from '@/app/(painel)/assinatura/actions';
import type { PixFatura } from '@/lib/cobranca';

export interface FaturaRes {
  id: string;
  inicio: string;
  lojas: number;
  valor: number;
  vence_em: string;
  itens: ItemFatura[];
  meses?: number;
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
  ciclo?: 'mensal' | 'anual';
  desconto_anual?: number;
  valor: { plano: string; lojas: number; cardapios?: number; meses?: number; itens: ItemFatura[]; total: number; total_periodo?: number };
  modulos_ativos: string[];
  aparelhos_extra?: Record<string, number>;
  aparelhos_uso?: Record<string, number>;
  planos: PlanoRes[];
  catalogo: ModuloRes[];
  adicionais: { modulo: string; ligado: boolean; cobrar: boolean }[];
  faturas: FaturaRes[];
}

const data = (iso: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '—');

/** Assinatura do restaurante (D-085, formato D-090): plano por operação, ciclo mensal/anual, adicionais, aparelhos, fatura com Pix. */
export function Assinatura({ d, pixAutomatico }: { d: DadosAssinatura; pixAutomatico: boolean }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [pix, setPix] = useState<PixFatura | null>(null);
  const aberta = d.faturas.find((f) => f.status === 'aberta') ?? null;
  const planoAtual = d.planos.find((p) => p.id === d.plano);
  const anual = d.ciclo === 'anual';
  const desconto = d.desconto_anual ?? 20;
  const fator = anual ? 1 - desconto / 100 : 1;
  const comCiclo = (v: number) => Math.round(v * fator * 100) / 100;
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

  const recursos = d.catalogo.filter((m) => m.cobranca === 'conta' || m.cobranca === 'loja');
  const adicionais = recursos.filter((m) => !planoAtual?.modulos.includes(m.id));
  const aparelhos = d.catalogo.filter((m) => m.cobranca === 'aparelho');
  const extraCard = d.catalogo.find((m) => m.id === 'marcas');
  const nomeModulo = (id: string) => d.catalogo.find((m) => m.id === id)?.nome ?? id;

  return (
    <div className="grade">
      <section className="cartao grade">
        <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div className="grade" style={{ gap: '0.2rem' }}>
            <span className="plano-selo">{situacao.rotulo}</span>
            <h2 style={{ margin: 0 }}>Plano {planoAtual?.nome ?? d.plano}{anual ? ' · anual' : ''}</h2>
            <span className="dica">{situacao.texto}</span>
          </div>
          {!d.sem_cobranca && (
            <div style={{ textAlign: 'right' }}>
              <div className="plano-preco">{reais(d.valor.total)}<small> /mês</small></div>
              <span className="dica">{anual ? `${reais(d.valor.total_periodo ?? d.valor.total * 12)} por ano (−${desconto}%)` : 'cobrança mensal'}</span>
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
                <strong>{reais(Number(aberta.valor))}</strong> · vence em {data(aberta.vence_em)} · cobre {aberta.meses === 12 ? '12 meses' : '1 mês'} a partir dessa data
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
        <div className="linha" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ margin: 0 }}>Planos</h2>
          {!d.sem_cobranca && (
            <div className="abas" role="radiogroup" aria-label="Ciclo de cobrança">
              <button type="button" role="radio" aria-checked={!anual} disabled={pendente} onClick={() => anual && rodar(() => definirCiclo('mensal'))}>Mensal</button>
              <button type="button" role="radio" aria-checked={anual} disabled={pendente} onClick={() => !anual && rodar(() => definirCiclo('anual'))}>Anual −{desconto}%</button>
            </div>
          )}
        </div>
        <div className="plano-grade">
          {d.planos.filter((p) => p.ativo || p.id === d.plano).map((p) => {
            const atual = p.id === d.plano;
            const inclusos = Object.entries(p.incluidos ?? {}).filter(([, n]) => n > 0);
            return (
              <article key={p.id} className="plano-cartao" data-atual={atual || undefined}>
                {atual && <span className="plano-selo">Seu plano</span>}
                <h3>{p.nome}</h3>
                <div className="plano-preco">{reais(comCiclo(Number(p.preco_loja)))}<small> /mês</small></div>
                {anual && <span className="dica" style={{ marginTop: '-0.5rem' }}><s>{reais(Number(p.preco_loja))}</s> no mensal</span>}
                <p className="dica" style={{ margin: 0 }}>{p.descricao}</p>
                {inclusos.length > 0 && (
                  <p style={{ margin: 0, fontSize: 'var(--t-sm)' }}><b>Grátis no plano:</b> {inclusos.map(([m, n]) => `${n} ${nomeModulo(m)}`).join(' · ')}</p>
                )}
                <ul className="plano-lista">
                  <li>✓ Cardápio digital, pedidos, delivery, impressão e caixa</li>
                  {recursos.filter((m) => m.id !== 'marcas').map((m) => (
                    <li key={m.id} data-nao={!p.modulos.includes(m.id) || undefined}>{p.modulos.includes(m.id) ? '✓' : '—'} {m.nome}</li>
                  ))}
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
        <p className="dica" style={{ margin: 0 }}>
          O plano cobre 1 loja com 1 cardápio.{extraCard ? ` Cada loja ou cardápio a mais: ${reais(comCiclo(Number(extraCard.preco)))}/mês` : ''}
          {d.valor.cardapios && d.valor.cardapios > 1 ? ` (você tem ${d.valor.cardapios}).` : '.'}
          {confirmar ? ' A troca vale na hora: as telas do novo plano aparecem já, e a fatura em aberto é recalculada.' : ''}
        </p>
      </section>

      {!d.sem_cobranca && adicionais.length > 0 && (
        <section className="cartao grade">
          <div>
            <h2 style={{ margin: 0 }}>Adicionais</h2>
            <p className="dica" style={{ margin: 0 }}>O que falta no seu plano, sem precisar mudar de plano. Valor único por mês, para a conta toda.</p>
          </div>
          <table className="mod-matriz">
            <tbody>
              {adicionais.filter((m) => m.id !== 'marcas').map((m) => {
                const a = d.adicionais.find((x) => x.modulo === m.id);
                const ajustePeloRes = a && (!a.ligado || !a.cobrar);
                const ligado = !!a?.ligado;
                return (
                  <tr key={m.id}>
                    <td><strong>{m.nome}</strong><br /><span className="dica">{m.descricao}</span></td>
                    <td>{reais(comCiclo(Number(m.preco)))}</td>
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

      {!d.sem_cobranca && aparelhos.length > 0 && (
        <section className="cartao grade">
          <div>
            <h2 style={{ margin: 0 }}>Aparelhos</h2>
            <p className="dica" style={{ margin: 0 }}>Quantos celulares de motoboy e garçom a sua equipe pode usar. A quantidade é o que o plano permite, não quantos estão conectados agora.</p>
          </div>
          <table className="mod-matriz">
            <thead><tr><th>Aparelho</th><th>Em uso</th><th>Grátis no plano</th><th>Extras ({reais(comCiclo(Number(aparelhos[0]!.preco)))} cada)</th></tr></thead>
            <tbody>
              {aparelhos.map((m) => {
                const incl = planoAtual?.incluidos?.[m.id] ?? 0;
                const extra = d.aparelhos_extra?.[m.id] ?? 0;
                const uso = d.aparelhos_uso?.[m.id] ?? 0;
                return (
                  <tr key={m.id}>
                    <td><strong>{m.nome}</strong><br /><span className="dica">{m.descricao}</span></td>
                    <td>{uso} de {incl + extra}</td>
                    <td>{incl}</td>
                    <td>
                      <div className="linha" style={{ gap: '0.3rem', justifyContent: 'center' }}>
                        <button type="button" className="mini" disabled={pendente || extra === 0} aria-label={`Menos ${m.nome}`} onClick={() => rodar(() => contratarAparelhos(m.id, extra - 1))}>−</button>
                        <b style={{ minWidth: '1.5rem' }}>{extra}</b>
                        <button type="button" className="mini" disabled={pendente} aria-label={`Mais ${m.nome}`} onClick={() => rodar(() => contratarAparelhos(m.id, extra + 1))}>+</button>
                      </div>
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
            <thead><tr><th>A partir de</th><th>Valor</th><th>Situação</th></tr></thead>
            <tbody>
              {d.faturas.map((f) => (
                <tr key={f.id}>
                  <td>{data(f.inicio)}{f.meses === 12 ? ' (anual)' : ''}<br /><span className="dica">{f.itens.map((i) => i.descricao).join(' · ')}</span></td>
                  <td>{reais(Number(f.valor))}</td>
                  <td>{f.status === 'paga' ? `Paga em ${data(f.pago_em)}${f.forma === 'pix' ? ' (Pix)' : ''}` : f.status === 'cancelada' ? 'Cancelada' : 'Em aberto'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      <p className="dica" style={{ margin: 0 }}>Módulos ligados agora: {d.modulos_ativos.length ? d.modulos_ativos.filter((m) => !m.startsWith('app_')).map(nomeModulo).join(', ') : 'só o básico'}.</p>
    </div>
  );
}
