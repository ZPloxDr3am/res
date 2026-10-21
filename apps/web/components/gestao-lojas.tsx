'use client';
import { useState, useTransition } from 'react';
import { cancelarConvite, convidar, criarCardapio, criarLoja, definirAtivo, trocarLoja } from '@/app/(painel)/lojas/actions';
import { salvando } from '@/components/tempo-real';

export type LojaInfo = {
  id: string;
  nome: string;
  contaId: string | null;
  atual: boolean;
  marcas: { id: string; nome: string; link: string }[];
  equipe: { id: string; nome: string; papel: string; ativo: boolean; eu: boolean }[];
  convites: { id: string; email: string; nome: string; papel: string }[];
};
type Conta = { id: string; nome: string; plano: string; limiteLojas: number; limiteCardapios: number | null; titular: boolean };

const PAPEL: Record<string, string> = { dono: 'Dono', gerente: 'Gerente', funcionario: 'Funcionário', garcom: 'Garçom', entregador: 'Entregador' };
const PLANO: Record<string, string> = { basico: 'Básico', piloto: 'Piloto', multilojas: 'Multilojas' };
const slugDe = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

function Msg({ r }: { r: { ok: boolean; erro?: string; texto?: string } | null }) {
  if (!r) return null;
  return r.ok ? <span className="dica" role="status">{r.texto ?? 'Pronto.'}</span> : <span className="erro" role="alert">{r.erro}</span>;
}

export function GestaoLojas({ contas, lojas }: { contas: Conta[]; lojas: LojaInfo[] }) {
  return (
    <div className="grade">
      <h1>Lojas e equipe</h1>
      {contas.map((c) => {
        const daConta = lojas.filter((l) => l.contaId === c.id);
        const cardapios = daConta.reduce((s, l) => s + l.marcas.length, 0);
        return (
          <section key={c.id} className="grade">
            <div className="cartao linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="grade" style={{ gap: '0.15rem' }}>
                <strong>{c.nome}</strong>
                <span className="dica">Pacote {PLANO[c.plano] ?? c.plano}</span>
              </div>
              <div className="linha" style={{ gap: '1.25rem' }}>
                <Uso rotulo="Lojas" usado={daConta.length} limite={c.limiteLojas} />
                <Uso rotulo="Cardápios" usado={cardapios} limite={c.limiteCardapios} />
              </div>
            </div>
            <div className="lojas-grade">
              {daConta.map((l) => (
                <CartaoLoja key={l.id} loja={l} podeCardapio={c.limiteCardapios == null || cardapios < c.limiteCardapios} />
              ))}
              {c.titular && (daConta.length < c.limiteLojas ? <NovaLoja contaId={c.id} lojas={daConta.map((l) => ({ id: l.id, nome: l.nome }))} /> : (
                <div className="cartao dica">Seu pacote tem {c.limiteLojas} loja(s), todas em uso. Para abrir outra unidade, fale com a gente para ampliar o pacote.</div>
              ))}
            </div>
          </section>
        );
      })}
      {/* lojas de outras contas em que a pessoa trabalha (sem ser titular) */}
      {lojas.filter((l) => !contas.some((c) => c.id === l.contaId)).map((l) => (
        <CartaoLoja key={l.id} loja={l} podeCardapio={false} />
      ))}
    </div>
  );
}

function Uso({ rotulo, usado, limite }: { rotulo: string; usado: number; limite: number | null }) {
  const pct = limite ? Math.min(100, Math.round((usado / limite) * 100)) : 0;
  return (
    <div className="grade" style={{ gap: '0.2rem', minWidth: '8rem' }}>
      <span className="dica">{rotulo}</span>
      <strong>{usado} {limite ? `de ${limite}` : '(sem limite)'}</strong>
      {limite && <span className="uso"><span style={{ width: `${pct}%` }} /></span>}
    </div>
  );
}

function CartaoLoja({ loja, podeCardapio }: { loja: LojaInfo; podeCardapio: boolean }) {
  const [abrir, setAbrir] = useState<'cardapio' | 'convite' | null>(null);
  const [r, setR] = useState<{ ok: boolean; erro?: string; texto?: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [nomeCardapio, setNomeCardapio] = useState('');
  const [slug, setSlug] = useState('');
  const [slugMexido, setSlugMexido] = useState(false);

  const fazer = (acao: () => Promise<{ ok: boolean; erro?: string }>, texto: string, depois?: () => void) =>
    iniciar(async () => {
      const res = await salvando(acao());
      setR(res.ok ? { ok: true, texto } : res);
      if (res.ok) depois?.();
    });

  return (
    <article className="cartao grade" style={{ gap: '0.75rem' }}>
      <div className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{loja.nome}</h2>
        {loja.atual ? <span className="selo selo-presencial">Loja aberta no painel</span> : (
          <form action={trocarLoja.bind(null, loja.id, '/pedidos')}><button className="mini">Abrir esta loja</button></form>
        )}
      </div>

      <div className="grade" style={{ gap: '0.35rem' }}>
        <h3>Cardápios (marcas)</h3>
        {loja.marcas.map((m) => (
          <div key={m.id} className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{m.nome}</span>
            <a href={m.link} target="_blank" rel="noreferrer" className="dica" style={{ wordBreak: 'break-all' }}>{m.link.replace(/^https?:\/\//, '')}</a>
          </div>
        ))}
        {podeCardapio && abrir !== 'cardapio' && <button type="button" className="mini" style={{ justifySelf: 'start' }} onClick={() => { setAbrir('cardapio'); setR(null); }}>+ Novo cardápio nesta loja</button>}
        {abrir === 'cardapio' && (
          <form className="grade" style={{ gap: '0.4rem' }} action={(fd) => fazer(() => criarCardapio(loja.id, fd), 'Cardápio criado.', () => { setAbrir(null); setNomeCardapio(''); setSlug(''); setSlugMexido(false); })}>
            <label>Nome da marca<input type="text" name="nome" required maxLength={120} value={nomeCardapio} placeholder="Ex.: Burger da Casa"
              onChange={(e) => { setNomeCardapio(e.target.value); if (!slugMexido) setSlug(slugDe(e.target.value)); }} /></label>
            <label>Endereço do link<input type="text" name="slug" required value={slug} onChange={(e) => { setSlug(e.target.value); setSlugMexido(true); }} />
              <span className="dica">…/c/{slug || 'endereco'}</span></label>
            {loja.marcas.length > 0 && (
              <label>Começar com
                <select name="base" defaultValue="">
                  <option value="">Cardápio vazio</option>
                  {loja.marcas.map((m) => <option key={m.id} value={m.id}>Mesmas categorias e produtos de {m.nome}</option>)}
                </select>
                <span className="dica">Compartilhado: produto novo aparece nas duas; preços e liga/desliga são de cada marca.</span>
              </label>
            )}
            <div className="linha"><button className="botao-primario" disabled={pendente}>Criar cardápio</button><button type="button" onClick={() => setAbrir(null)}>Cancelar</button></div>
          </form>
        )}
        {!podeCardapio && loja.contaId && <span className="dica">Limite de cardápios do pacote atingido.</span>}
      </div>

      <div className="grade" style={{ gap: '0.35rem' }}>
        <h3>Equipe</h3>
        <ul className="lista" style={{ gap: '0.25rem' }}>
          {loja.equipe.map((m) => (
            <li key={m.id} className="linha" style={{ justifyContent: 'space-between', alignItems: 'center', opacity: m.ativo ? 1 : 0.55 }}>
              <span>{m.nome}{m.eu && <span className="dica"> (você)</span>} <span className="selo">{PAPEL[m.papel] ?? m.papel}</span>{!m.ativo && <span className="dica"> · sem acesso</span>}</span>
              {!m.eu && m.papel !== 'dono' && (
                <button type="button" className="mini" disabled={pendente} onClick={() => fazer(() => definirAtivo(m.id, !m.ativo), m.ativo ? 'Acesso removido.' : 'Acesso devolvido.')}>
                  {m.ativo ? 'Tirar acesso' : 'Devolver acesso'}
                </button>
              )}
            </li>
          ))}
          {loja.convites.map((c) => (
            <li key={c.id} className="linha" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{c.nome} <span className="dica">{c.email} · convite pendente · {PAPEL[c.papel]}</span></span>
              <button type="button" className="mini" disabled={pendente} onClick={() => fazer(() => cancelarConvite(c.id), 'Convite cancelado.')}>Cancelar convite</button>
            </li>
          ))}
        </ul>
        {abrir !== 'convite' && <button type="button" className="mini" style={{ justifySelf: 'start' }} onClick={() => { setAbrir('convite'); setR(null); }}>+ Convidar pessoa</button>}
        {abrir === 'convite' && (
          <form className="grade" style={{ gap: '0.4rem' }} action={(fd) => fazer(() => convidar(loja.id, fd), 'Convite criado. Peça para a pessoa criar a conta (ou entrar) com esse e-mail.', () => setAbrir(null))}>
            <div className="linha">
              <label style={{ flex: '2 1 12rem' }}>E-mail<input type="email" name="email" required /></label>
              <label style={{ flex: '1 1 8rem' }}>Nome<input type="text" name="nome" required maxLength={120} /></label>
              <label style={{ flex: '1 1 8rem' }}>Função
                <select name="papel" defaultValue="funcionario">
                  <option value="funcionario">Funcionário</option>
                  <option value="gerente">Gerente</option>
                  <option value="garcom">Garçom</option>
                  <option value="entregador">Entregador</option>
                </select>
              </label>
            </div>
            <p className="dica" style={{ margin: 0 }}>A pessoa só vê esta loja. Gerente tem acesso completo à loja; funcionário vê pedidos, cardápio e caixa, sem relatórios.</p>
            <div className="linha"><button className="botao-primario" disabled={pendente}>Convidar</button><button type="button" onClick={() => setAbrir(null)}>Cancelar</button></div>
          </form>
        )}
      </div>
      <Msg r={r} />
    </article>
  );
}

function NovaLoja({ contaId, lojas }: { contaId: string; lojas: { id: string; nome: string }[] }) {
  const [aberto, setAberto] = useState(false);
  const [r, setR] = useState<{ ok: boolean; erro?: string; texto?: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [marca, setMarca] = useState('');
  const [slug, setSlug] = useState('');
  const [mexido, setMexido] = useState(false);
  if (!aberto) {
    return (
      <div className="grade" style={{ gap: '0.4rem', alignContent: 'start' }}>
        <button type="button" className="cartao nova-loja" onClick={() => { setAberto(true); setR(null); }}>
          <strong>+ Nova loja</strong>
          <span className="dica">Outra unidade, com endereço, horários, equipe e cardápio próprios.</span>
        </button>
        <Msg r={r} />
      </div>
    );
  }
  return (
    <form
      className="cartao grade"
      action={(fd) =>
        iniciar(async () => {
          const res = await salvando(criarLoja(contaId, fd));
          setR(res.ok ? { ok: true, texto: 'Loja criada. Use "Abrir esta loja" para ver o cardápio dela.' } : res);
          if (res.ok) setAberto(false);
        })
      }
    >
      <h2 style={{ margin: 0 }}>Nova loja</h2>
      <label>Nome da loja (unidade)<input type="text" name="nome" required maxLength={120} placeholder="Ex.: Unidade Trindade" /></label>
      <label>Primeiro cardápio (marca)<input type="text" name="marca" required maxLength={120} value={marca} onChange={(e) => { setMarca(e.target.value); if (!mexido) setSlug(slugDe(e.target.value)); }} /></label>
      <label>Endereço do link<input type="text" name="slug" required value={slug} onChange={(e) => { setSlug(e.target.value); setMexido(true); }} /><span className="dica">…/c/{slug || 'endereco'}</span></label>
      <label>Cardápio inicial
        <select name="copiarDe" defaultValue={lojas[0]?.id ?? ''}>
          <option value="">Começar vazio</option>
          {lojas.map((l) => <option key={l.id} value={l.id}>Copiar categorias e produtos de {l.nome}</option>)}
        </select>
        <span className="dica">Cópia independente (com fotos, preços e grupos de opções): depois cada loja muda o seu sem afetar a outra.</span>
      </label>
      <p className="dica" style={{ margin: 0 }}>Horários, bairros e taxas a loja nova configura na tela Delivery (ou use "Replicar para todas as lojas do grupo"). Você e os outros titulares da conta entram como donos.</p>
      <div className="linha"><button className="botao-primario" disabled={pendente}>{pendente ? 'Criando…' : 'Criar loja'}</button><button type="button" onClick={() => setAberto(false)}>Cancelar</button></div>
      <Msg r={r} />
    </form>
  );
}
