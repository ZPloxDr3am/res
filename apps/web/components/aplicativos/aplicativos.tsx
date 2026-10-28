'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { normalizarChavePix, pixCopiaECola, type TipoChavePix } from '@res/core';
import { removerIntegracao, salvarIntegracao, salvarLinkGrupo } from '@/app/(painel)/aplicativos/actions';
import { salvando } from '@/components/tempo-real';
import { CATALOGO, type App, type PainelAplicativos, type TipoIntegracao } from '@/lib/aplicativos';

type Filtro = 'todos' | 'ligados' | 'disponiveis' | 'breve';

/** Tela Aplicativos (D-042): o que já vem no RES, o que liga aqui e o que vem por aí. */
export function Aplicativos({ dados, origem }: { dados: PainelAplicativos; origem: string }) {
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [aberto, setAberto] = useState<App | null>(null);
  const ligado = (a: App) =>
    a.tipo === 'nativo' || (a.tipo === 'config' && !!dados.integracoes[a.id as TipoIntegracao]?.ativo) || (a.tipo === 'link' && !!dados.link);
  const situacao = (a: App): { rotulo: string; tom: string } =>
    a.tipo === 'nativo' ? { rotulo: 'Incluso', tom: 'ok' } : ligado(a) ? { rotulo: 'Ligado', tom: 'ok' } : a.tipo === 'breve' ? { rotulo: 'Em breve', tom: 'breve' } : a.tipo === 'depois' ? { rotulo: 'Mais tarde', tom: 'breve' } : dados.integracoes[a.id as TipoIntegracao] ? { rotulo: 'Desligado', tom: 'off' } : { rotulo: 'Disponível', tom: 'livre' };
  const todos = CATALOGO.flatMap((c) => c.apps);
  const casa = (a: App, f: Filtro) =>
    f === 'todos' || (f === 'ligados' && ligado(a)) || (f === 'disponiveis' && (a.tipo === 'config' || a.tipo === 'link') && !ligado(a)) || (f === 'breve' && (a.tipo === 'breve' || a.tipo === 'depois'));
  const conta = (f: Filtro) => todos.filter((a) => casa(a, f)).length;

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(null);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  return (
    <div className="grade">
      <div className="seg-chips" role="tablist" aria-label="Filtrar">
        {([['todos', 'Todos'], ['ligados', 'Ligados'], ['disponiveis', 'Disponíveis'], ['breve', 'Em breve']] as const).map(([v, r]) => (
          <button key={v} type="button" role="tab" className="seg-chip" aria-selected={filtro === v} onClick={() => setFiltro(v)}>
            {r} <span className="seg-n">{conta(v)}</span>
          </button>
        ))}
      </div>
      {CATALOGO.map((c) => {
        const apps = c.apps.filter((a) => casa(a, filtro));
        if (!apps.length) return null;
        return (
          <section key={c.titulo} className="grade" style={{ gap: '0.6rem' }}>
            <h2 style={{ margin: '0.3rem 0 0' }}>{c.titulo}</h2>
            <div className="ap-grade">
              {apps.map((a) => {
                const s = situacao(a);
                const conteudo = (
                  <>
                    <span className="ap-icone" aria-hidden>{a.icone}</span>
                    <span className="ap-texto">
                      <strong>{a.nome}</strong>
                      <span className="dica">{a.desc}</span>
                    </span>
                    <span className="ap-sit" data-tom={s.tom}>{s.rotulo}</span>
                  </>
                );
                return a.tipo === 'nativo' ? (
                  <Link key={a.id} href={a.href!} className="ap-cartao">{conteudo}</Link>
                ) : (
                  <button key={a.id} type="button" className="ap-cartao" data-breve={a.tipo === 'breve' || a.tipo === 'depois' ? 'sim' : undefined} onClick={() => setAberto(a)}>
                    {conteudo}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {aberto && (
        <div className="ap-fundo" onClick={(e) => e.target === e.currentTarget && setAberto(null)}>
          <aside className="ap-folha" role="dialog" aria-label={aberto.nome}>
            <header className="ap-folha-topo">
              <span className="ap-icone" aria-hidden>{aberto.icone}</span>
              <div className="grade" style={{ gap: 0 }}>
                <strong>{aberto.nome}</strong>
                <span className="dica">{aberto.desc}</span>
              </div>
              <button type="button" className="mini" onClick={() => setAberto(null)} aria-label="Fechar">✕</button>
            </header>
            <div className="ap-folha-corpo">
              {aberto.tipo === 'config' && <Config app={aberto} dados={dados} aoFechar={() => setAberto(null)} />}
              {aberto.tipo === 'link' && <LinkGrupo dados={dados} origem={origem} />}
              {(aberto.tipo === 'breve' || aberto.tipo === 'depois') && (
                <div className="grade">
                  <p style={{ margin: 0 }}>{aberto.tipo === 'depois' ? 'Combinado para mais tarde.' : 'Ainda não está disponível no RES.'}</p>
                  {aberto.nota && <p className="dica" style={{ margin: 0 }}>{aberto.nota}</p>}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

const AJUDA: Record<TipoIntegracao, string> = {
  pix: 'O cliente que escolher Pix no cardápio digital vê o QR com o valor exato na página do pedido. O dinheiro cai direto na sua conta; quando o Pix chegar, toque em "Marcar como pago" no pedido. Deixe "Pix" ligado nas formas de pagamento do Delivery.',
  meta_pixel: 'No Gerenciador de Eventos do Meta, abra a sua fonte de dados (Pixel) e copie o ID: só números. Mede visita, item no carrinho, início do pedido e compra (com o valor).',
  google_analytics: 'No Google Analytics: Administrador → Fluxos de dados → Web. Copie o "ID da métrica", que começa com G-.',
  google_ads: 'No Google Ads: Metas → Conversões → a sua ação de compra → Configuração da tag → "Usar Google Tag Manager". Copie o ID da conversão (vira AW-…) e o rótulo da conversão.',
  google_tag_manager: 'Só use se você (ou a sua agência) já configura tudo pelo Tag Manager. Os eventos vão para o dataLayer: add_to_cart, begin_checkout e purchase.',
  google_avaliacao: 'No Perfil da Empresa no Google (Google Meu Negócio), toque em "Pedir avaliações" e copie o link. Ele aparece para o cliente depois que o pedido é entregue.',
};

function Config({ app, dados, aoFechar }: { app: App; dados: PainelAplicativos; aoFechar: () => void }) {
  const tipo = app.id as TipoIntegracao;
  const atual = dados.integracoes[tipo];
  const [ativo, setAtivo] = useState(atual?.ativo ?? true);
  const [cfg, setCfg] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(atual?.config ?? {}).map(([k, v]) => [k, v ?? ''])));
  const [todas, setTodas] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = (k: string) => cfg[k] ?? '';
  const muda = (k: string, v: string) => setCfg((c) => ({ ...c, [k]: v }));

  const chavePix = tipo === 'pix' ? normalizarChavePix(campo('chave'), (campo('tipo_chave') || 'cnpj') as TipoChavePix) : null;
  const pronto = (() => {
    if (tipo === 'pix') return !!chavePix && campo('nome').trim().length >= 2 && campo('cidade').trim().length >= 2;
    if (tipo === 'google_avaliacao') return campo('url').startsWith('https://');
    return campo('id').trim().length > 3;
  })();

  const salvar = () =>
    iniciar(async () => {
      const config = tipo === 'pix' ? { tipo_chave: campo('tipo_chave') || 'cnpj', chave: chavePix!, nome: campo('nome').trim(), cidade: campo('cidade').trim() } : Object.fromEntries(Object.entries(cfg).map(([k, v]) => [k, v.trim() || null]));
      const r = await salvando(salvarIntegracao(tipo, ativo, config, todas));
      setMsg(r.ok ? { ok: true, t: r.lojas > 1 ? `Salvo em ${r.lojas} lojas.` : 'Salvo.' } : { ok: false, t: r.erro });
    });

  return (
    <div className="grade">
      <p className="dica" style={{ margin: 0 }}>{AJUDA[tipo]}</p>
      {tipo === 'pix' && (
        <>
          <div className="linha">
            <label>Tipo de chave
              <select value={campo('tipo_chave') || 'cnpj'} onChange={(e) => muda('tipo_chave', e.target.value)}>
                <option value="cnpj">CNPJ</option>
                <option value="cpf">CPF</option>
                <option value="telefone">Celular</option>
                <option value="email">E-mail</option>
                <option value="aleatoria">Chave aleatória</option>
              </select>
            </label>
            <label style={{ flex: '1 1 14rem' }}>Chave Pix<input value={campo('chave')} onChange={(e) => muda('chave', e.target.value)} placeholder="Ex.: 12.345.678/0001-99" /></label>
          </div>
          {campo('chave') && !chavePix && <span className="erro">Essa chave não parece um {campo('tipo_chave') || 'CNPJ'} válido.</span>}
          <div className="linha">
            <label style={{ flex: '1 1 14rem' }}>Nome de quem recebe<input value={campo('nome')} maxLength={25} onChange={(e) => muda('nome', e.target.value)} placeholder="Como aparece no banco (até 25)" /></label>
            <label>Cidade<input value={campo('cidade')} maxLength={15} onChange={(e) => muda('cidade', e.target.value)} placeholder="Ex.: Pomerode" /></label>
          </div>
          {pronto && <TestePix chave={chavePix!} nome={campo('nome')} cidade={campo('cidade')} />}
        </>
      )}
      {(tipo === 'meta_pixel' || tipo === 'google_analytics' || tipo === 'google_ads' || tipo === 'google_tag_manager') && (
        <div className="linha">
          <label style={{ flex: '1 1 14rem' }}>
            {tipo === 'meta_pixel' ? 'ID do Pixel' : tipo === 'google_analytics' ? 'ID da métrica (G-…)' : tipo === 'google_ads' ? 'ID da conversão (AW-…)' : 'ID do contêiner (GTM-…)'}
            <input value={campo('id')} onChange={(e) => muda('id', e.target.value)} placeholder={tipo === 'meta_pixel' ? '123456789012345' : tipo === 'google_analytics' ? 'G-ABC123XYZ9' : tipo === 'google_ads' ? 'AW-123456789' : 'GTM-ABCD12'} />
          </label>
          {tipo === 'google_ads' && (
            <label style={{ flex: '1 1 12rem' }}>Rótulo da conversão<input value={campo('rotulo')} onChange={(e) => muda('rotulo', e.target.value)} placeholder="AbC_dEf123" /></label>
          )}
        </div>
      )}
      {tipo === 'google_avaliacao' && (
        <label>Link para avaliar<input value={campo('url')} onChange={(e) => muda('url', e.target.value)} placeholder="https://g.page/r/…/review" /></label>
      )}
      {tipo !== 'pix' && tipo !== 'google_avaliacao' && (
        <p className="dica" style={{ margin: 0 }}>O cardápio digital pede o aceite de cookies ao cliente antes de carregar o pixel (LGPD).</p>
      )}
      <label className="check"><input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ligado</label>
      {dados.outras_lojas > 0 && (
        <label className="check"><input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} /> Usar também nas outras {dados.outras_lojas} loja(s) do grupo</label>
      )}
      <div className="linha" style={{ alignItems: 'center' }}>
        <button type="button" className="botao-primario" disabled={pendente || !pronto} onClick={salvar}>{pendente ? 'Salvando…' : 'Salvar'}</button>
        {atual && (
          <button
            type="button"
            className="erro"
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                const r = await salvando(removerIntegracao(tipo));
                if (!r.ok) return setMsg({ ok: false, t: r.erro });
                aoFechar();
              })
            }
          >
            Remover
          </button>
        )}
        {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.t}</span>}
      </div>
    </div>
  );
}

/** QR de R$ 0,01 para o dono conferir no próprio banco que a chave e o nome estão certos. */
function TestePix({ chave, nome, cidade }: { chave: string; nome: string; cidade: string }) {
  const codigo = useMemo(() => pixCopiaECola({ chave, nome, cidade, valor: 1, txid: 'TESTERES' }), [chave, nome, cidade]);
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(codigo, { margin: 1, width: 180 }).then(setQr).catch(() => setQr(null));
  }, [codigo]);
  return (
    <details className="ap-teste">
      <summary>Testar com R$ 0,01</summary>
      <div className="linha" style={{ alignItems: 'center' }}>
        {qr && <img src={qr} alt="QR de teste" width={150} height={150} />}
        <span className="dica" style={{ flex: '1 1 12rem' }}>Leia no app do seu banco: tem que aparecer o seu nome e R$ 0,01. Se aparecer, o cliente vai pagar certo.</span>
      </div>
    </details>
  );
}

function LinkGrupo({ dados, origem }: { dados: PainelAplicativos; origem: string }) {
  const [link, setLink] = useState(dados.link ?? '');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [qr, setQr] = useState<string | null>(null);
  const url = dados.link ? `${origem}/g/${dados.link}` : null;
  useEffect(() => {
    if (url) QRCode.toDataURL(url, { margin: 1, width: 180 }).then(setQr).catch(() => setQr(null));
  }, [url]);
  return (
    <div className="grade">
      <p className="dica" style={{ margin: 0 }}>Um endereço só para a bio do Instagram, Google e WhatsApp: o cliente escolhe a loja e cai no cardápio dela.</p>
      <ul className="dica" style={{ margin: 0, paddingLeft: '1.1rem' }}>
        {dados.cardapios.map((c) => <li key={c.slug}>{c.nome}{c.loja !== c.nome ? ` · ${c.loja}` : ''}</li>)}
      </ul>
      {dados.pode_link ? (
        <div className="linha" style={{ alignItems: 'end' }}>
          <label style={{ flex: '1 1 14rem' }}>Endereço
            <span className="ap-prefixo"><span className="dica">{origem.replace(/^https?:\/\//, '')}/g/</span><input value={link} onChange={(e) => setLink(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="nome-do-grupo" maxLength={40} /></span>
          </label>
          <button
            type="button"
            className="botao-primario"
            disabled={pendente || link === (dados.link ?? '')}
            onClick={() =>
              iniciar(async () => {
                const r = await salvando(salvarLinkGrupo(link));
                setMsg(r.ok ? { ok: true, t: link ? 'Link salvo.' : 'Link removido.' } : { ok: false, t: r.erro });
              })
            }
          >
            Salvar
          </button>
        </div>
      ) : (
        <p className="dica" style={{ margin: 0 }}>Só o titular da conta escolhe o link.</p>
      )}
      {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.t}</span>}
      {url && (
        <div className="linha" style={{ alignItems: 'center' }}>
          {qr && <img src={qr} alt="QR do link do grupo" width={140} height={140} />}
          <div className="grade" style={{ gap: '0.3rem' }}>
            <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
            <button type="button" onClick={() => navigator.clipboard.writeText(url).catch(() => {})}>Copiar link</button>
          </div>
        </div>
      )}
    </div>
  );
}
