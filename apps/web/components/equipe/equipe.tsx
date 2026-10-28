'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { alterarFuncao, cancelarConvite, convidar, criarUsuarioCaixa, definirAtivo, trocarSenhaUsuario } from '@/app/(painel)/lojas/actions';
import { ligarFicha } from '@/app/(painel)/gestao/actions';
import { cpfValido, formatarCpf, soDigitos } from '@/lib/gestao';
import { salvando } from '@/components/tempo-real';
import { FUNCOES, gerarSenha, iniciais, ORDEM_FUNCOES, PERMISSOES_EQUIPE, sugerirUsuario, type Papel } from '@/lib/equipe';
import type { LojaInfo } from '@/components/gestao-lojas';

type Res = { ok: boolean; erro?: string; texto?: string } | null;
export type Ficha = { id: string; nome: string; cpf: string | null; cargo: string | null; membroId: string | null; ativo: boolean };
export type LojaEquipe = LojaInfo & { meuPapel: string | null; permissoesCaixa: string[]; fichas: Ficha[] };
export type Cartao = { loja: string; nome: string; papel: Papel; usuario: string; senha: string | null; aviso?: string };

const APK = 'https://github.com/ZPloxDr3am/res/releases/download/motoboy-latest/RES-Motoboy.apk';

/** Aba Equipe (D-051): quem está na equipe, por função, e o passo a passo para adicionar alguém. */
export function Equipe({ lojas, inicial, fichaInicial }: { lojas: LojaEquipe[]; inicial: string; fichaInicial?: string }) {
  const [lojaId, setLojaId] = useState(lojas.some((l) => l.id === inicial) ? inicial : lojas[0]?.id);
  const loja = lojas.find((l) => l.id === lojaId);
  const [assistente, setAssistente] = useState(!!fichaInicial);
  const [cartao, setCartao] = useState<Cartao | null>(null);
  if (!loja) return <p className="cartao dica">Nenhuma loja.</p>;
  const gestor = loja.meuPapel === 'dono' || loja.meuPapel === 'gerente';

  return (
    <div className="grade">
      {lojas.length > 1 && (
        <div className="abas" role="tablist" aria-label="Loja">
          {lojas.map((l) => (
            <button key={l.id} type="button" role="tab" aria-selected={l.id === lojaId} onClick={() => { setLojaId(l.id); setAssistente(false); setCartao(null); }}>
              {l.nome}
            </button>
          ))}
        </div>
      )}

      <section className="cartao eq-intro">
        <div>
          <h2 style={{ margin: 0 }}>Equipe de {loja.nome}</h2>
          <p className="dica" style={{ margin: '0.25rem 0 0' }}>
            Cada pessoa tem o próprio acesso, e a <b>função</b> decide o que ela vê. Assim você sabe quem fez o quê e tira o acesso de quem sair, sem trocar a sua senha.
          </p>
        </div>
        {gestor && !assistente && !cartao && (
          <button type="button" className="botao-primario" onClick={() => setAssistente(true)}>+ Adicionar pessoa</button>
        )}
      </section>

      {cartao && <CartaoAcesso c={cartao} fechar={() => setCartao(null)} />}
      {assistente && (
        <Assistente
          loja={loja}
          fichaInicial={fichaInicial}
          fechar={() => setAssistente(false)}
          criado={(c) => {
            setAssistente(false);
            setCartao(c);
          }}
        />
      )}

      <Lista loja={loja} gestor={gestor} verCartao={(c) => { setCartao(c); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />

      {!gestor && <p className="dica">Só o dono ou o gerente adicionam pessoas e mudam funções nesta loja.</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- lista por função */

function Lista({ loja, gestor, verCartao }: { loja: LojaEquipe; gestor: boolean; verCartao: (c: Cartao) => void }) {
  const [r, setR] = useState<Res>(null);
  const [pendente, iniciar] = useTransition();
  const [senhaDe, setSenhaDe] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [funcaoDe, setFuncaoDe] = useState<string | null>(null);
  const souDono = loja.meuPapel === 'dono';

  const fazer = (acao: () => Promise<{ ok: boolean; erro?: string }>, texto: string, depois?: () => void) =>
    iniciar(async () => {
      const res = await salvando(acao());
      setR(res.ok ? { ok: true, texto } : res);
      if (res.ok) depois?.();
    });

  const ativos = loja.equipe.filter((m) => m.ativo);
  return (
    <div className="grade">
      <div className="eq-contagem" aria-label="Resumo da equipe">
        {ORDEM_FUNCOES.filter((p) => loja.equipe.some((m) => m.papel === p)).map((p) => (
          <span key={p} className="selo">{FUNCOES[p].icone} {ativos.filter((m) => m.papel === p).length} {ativos.filter((m) => m.papel === p).length === 1 ? FUNCOES[p].nome : FUNCOES[p].plural}</span>
        ))}
        {loja.equipe.some((m) => !m.ativo) && <span className="selo">🚫 {loja.equipe.filter((m) => !m.ativo).length} sem acesso</span>}
      </div>
      {r && <p className={r.ok ? 'dica' : 'erro'} role={r.ok ? 'status' : 'alert'} style={{ margin: 0 }}>{r.ok ? r.texto : r.erro}</p>}

      {ORDEM_FUNCOES.map((p) => {
        const pessoas = loja.equipe.filter((m) => m.papel === p);
        if (!pessoas.length) return null;
        const f = FUNCOES[p];
        return (
          <section key={p} className="cartao grade eq-grupo" aria-label={f.plural}>
            <div>
              <h3 style={{ margin: 0 }}>{f.icone} {f.plural}</h3>
              <p className="dica" style={{ margin: 0 }}>{f.resumo}</p>
            </div>
            <ul className="eq-lista">
              {pessoas.map((m) => {
                const mexe = gestor && !m.eu && m.papel !== 'dono' && (souDono || m.papel !== 'gerente');
                return (
                  <li key={m.id} className="eq-pessoa" data-inativo={!m.ativo || undefined}>
                    <span className="eq-avatar" aria-hidden>{iniciais(m.nome)}</span>
                    <span className="eq-info">
                      <strong>{m.nome}{m.eu && <span className="dica"> (você)</span>}</strong>
                      <span className="dica">
                        {m.usuario ? <>Entra com o usuário <b>{m.usuario}</b></> : 'Entra com e-mail e senha próprios'}
                        {!m.ativo && ' · sem acesso'}
                      </span>
                      {gestor && m.papel !== 'dono' && <SeloFicha ficha={loja.fichas.find((f) => f.membroId === m.id)} />}
                    </span>
                    <span className="eq-acoes">
                      {m.usuario && m.ativo && (
                        <button type="button" className="mini" onClick={() => verCartao({ loja: loja.nome, nome: m.nome, papel: m.papel as Papel, usuario: m.usuario!, senha: null })}>Cartão de acesso</button>
                      )}
                      {mexe && m.usuario && <button type="button" className="mini" disabled={pendente} onClick={() => { setSenhaDe(m.userId); setNovaSenha(gerarSenha()); setFuncaoDe(null); setR(null); }}>Trocar senha</button>}
                      {mexe && <button type="button" className="mini" disabled={pendente} onClick={() => { setFuncaoDe(m.id); setSenhaDe(null); setR(null); }}>Mudar função</button>}
                      {mexe && (
                        <button
                          type="button"
                          className="mini"
                          disabled={pendente}
                          onClick={() => {
                            if (m.ativo && !window.confirm(`Tirar o acesso de ${m.nome}? Ela(e) não consegue mais entrar. Dá para devolver depois.`)) return;
                            fazer(() => definirAtivo(m.id, !m.ativo), m.ativo ? `${m.nome} não entra mais.` : `${m.nome} voltou a ter acesso.`);
                          }}
                        >
                          {m.ativo ? 'Tirar acesso' : 'Devolver acesso'}
                        </button>
                      )}
                    </span>
                    {senhaDe === m.userId && (
                      <form
                        className="eq-subform"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const senha = novaSenha;
                          fazer(() => trocarSenhaUsuario(loja.id, m.userId, senha), `Senha de ${m.nome} trocada.`, () => {
                            setSenhaDe(null);
                            verCartao({ loja: loja.nome, nome: m.nome, papel: m.papel as Papel, usuario: m.usuario!, senha });
                          });
                        }}
                      >
                        <label style={{ flex: '1 1 12rem' }}>
                          Nova senha para {m.nome.split(' ')[0]}
                          <span className="linha" style={{ gap: '0.3rem', flexWrap: 'nowrap' }}>
                            <input type="text" minLength={8} maxLength={72} required value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoComplete="new-password" />
                            <button type="button" className="mini" onClick={() => setNovaSenha(gerarSenha())}>Gerar outra</button>
                          </span>
                        </label>
                        <button className="mini botao-primario" disabled={pendente}>Salvar e ver cartão</button>
                        <button type="button" className="mini" onClick={() => setSenhaDe(null)}>Cancelar</button>
                      </form>
                    )}
                    {funcaoDe === m.id && (
                      <form
                        className="eq-subform"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const p2 = String(new FormData(e.currentTarget).get('papel'));
                          fazer(() => alterarFuncao(m.id, p2), `${m.nome} agora é ${FUNCOES[p2 as Papel].nome}.`, () => setFuncaoDe(null));
                        }}
                      >
                        <label style={{ flex: '1 1 12rem' }}>
                          Nova função de {m.nome.split(' ')[0]}
                          <select name="papel" defaultValue={m.papel}>
                            {(['gerente', 'funcionario', 'entregador', 'garcom'] as Papel[])
                              .filter((x) => souDono || x !== 'gerente')
                              .map((x) => <option key={x} value={x}>{FUNCOES[x].icone} {FUNCOES[x].nome}</option>)}
                          </select>
                        </label>
                        <button className="mini botao-primario" disabled={pendente}>Mudar</button>
                        <button type="button" className="mini" onClick={() => setFuncaoDe(null)}>Cancelar</button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {loja.convites.length > 0 && (
        <section className="cartao grade eq-grupo" aria-label="Convites pendentes">
          <div>
            <h3 style={{ margin: 0 }}>✉️ Convites esperando a pessoa entrar</h3>
            <p className="dica" style={{ margin: 0 }}>A pessoa precisa criar a conta (ou entrar) no RES com este e-mail. Ao entrar, ela já cai nesta loja.</p>
          </div>
          <ul className="eq-lista">
            {loja.convites.map((c) => (
              <li key={c.id} className="eq-pessoa">
                <span className="eq-avatar" aria-hidden>{iniciais(c.nome)}</span>
                <span className="eq-info">
                  <strong>{c.nome}</strong>
                  <span className="dica">{c.email} · {FUNCOES[c.papel as Papel]?.nome ?? c.papel}</span>
                </span>
                {gestor && (
                  <span className="eq-acoes">
                    <button type="button" className="mini" disabled={pendente} onClick={() => fazer(() => cancelarConvite(c.id), 'Convite cancelado.')}>Cancelar convite</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- assistente */

function Assistente({ loja, fechar, criado, fichaInicial }: { loja: LojaEquipe; fechar: () => void; criado: (c: Cartao) => void; fichaInicial?: string }) {
  const souDono = loja.meuPapel === 'dono';
  const [passo, setPasso] = useState<1 | 2 | 3>(1);
  const [papel, setPapel] = useState<Papel | null>(null);
  const [modo, setModo] = useState<'usuario' | 'email'>('usuario');
  const livres = loja.fichas.filter((f) => !f.membroId && f.ativo);
  const fichaPre = livres.find((f) => f.id === fichaInicial);
  const [nome, setNome] = useState(fichaPre?.nome ?? '');
  const [fichaModo, setFichaModo] = useState<'existente' | 'nova' | 'nenhuma'>(fichaPre ? 'existente' : 'nova');
  const [fichaId, setFichaId] = useState(fichaPre?.id ?? '');
  const [cpf, setCpf] = useState('');
  const [cargo, setCargo] = useState('');
  const [admissao, setAdmissao] = useState('');
  const [usuario, setUsuario] = useState('');
  const [usuarioMexido, setUsuarioMexido] = useState(false);
  const [senha, setSenha] = useState('');
  const [email, setEmail] = useState('');
  const [r, setR] = useState<Res>(null);
  const [pendente, iniciar] = useTransition();
  useEffect(() => setSenha(gerarSenha()), []);

  const escolher = (p: Papel) => {
    setPapel(p);
    setModo(FUNCOES[p].entrada === 'email' ? 'email' : 'usuario');
    if (!usuarioMexido && nome) setUsuario(sugerirUsuario(nome, p));
    setPasso(2);
  };
  const enviar = () => {
    if (!papel) return;
    const fd = new FormData();
    fd.set('nome', nome.trim());
    fd.set('papel', papel);
    iniciar(async () => {
      if (modo === 'usuario') {
        if (fichaModo === 'existente' && !fichaId) return setR({ ok: false, erro: 'Escolha a ficha do funcionário (ou marque outra opção).' });
        if (fichaModo === 'nova' && soDigitos(cpf) && !cpfValido(cpf)) return setR({ ok: false, erro: 'Confira o CPF.' });
        fd.set('usuario', usuario.trim().toLowerCase());
        fd.set('senha', senha);
        const res = await salvando(criarUsuarioCaixa(loja.id, fd));
        if (!res.ok) return setR(res);
        let aviso: string | undefined;
        if (res.membroId && fichaModo !== 'nenhuma') {
          const l = await salvando(
            ligarFicha(res.membroId, fichaModo === 'existente' ? { funcionarioId: fichaId } : { novo: { nome: nome.trim(), cpf, cargo: cargo || FUNCOES[papel].nome, admissao } }),
          );
          aviso = l.ok ? (fichaModo === 'existente' ? 'Ligado à ficha do funcionário na Gestão Empresarial.' : 'Ficha criada em Gestão Empresarial → Funcionários.') : `O acesso foi criado, mas a ficha não: ${l.erro}`;
        }
        criado({ loja: loja.nome, nome: nome.trim(), papel, usuario: usuario.trim().toLowerCase(), senha, aviso });
      } else {
        fd.set('email', email.trim());
        const res = await salvando(convidar(loja.id, fd));
        if (!res.ok) return setR(res);
        setR({ ok: true, texto: `Convite criado. Avise ${nome.split(' ')[0]} para criar a conta no RES com o e-mail ${email.trim()}: ao entrar, já cai nesta loja.` });
        setPasso(3);
      }
    });
  };

  const f = papel ? FUNCOES[papel] : null;
  return (
    <section className="cartao grade eq-assistente" aria-label="Adicionar pessoa">
      <div className="linha" style={{ justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Adicionar pessoa à equipe</h2>
        <ol className="eq-passos" aria-label="Passos">
          {['Função', 'Como entra', 'Pronto'].map((t, i) => (
            <li key={t} aria-current={passo === i + 1 ? 'step' : undefined} data-feito={passo > i + 1 || undefined}>{i + 1}. {t}</li>
          ))}
        </ol>
      </div>

      {passo === 1 && (
        <>
          <p style={{ margin: 0 }}><b>Qual vai ser a função?</b> Ela define o que a pessoa vê e faz. Dá para mudar depois.</p>
          <div className="eq-funcoes">
            {(['funcionario', 'entregador', 'gerente', 'garcom'] as Papel[]).map((p) => {
              const x = FUNCOES[p];
              const bloqueado = !!x.emBreve || (p === 'gerente' && !souDono);
              const pode = p === 'funcionario' ? PERMISSOES_EQUIPE.filter((q) => loja.permissoesCaixa.includes(q.chave)).map((q) => q.titulo) : x.pode;
              return (
                <button key={p} type="button" className="eq-funcao" disabled={bloqueado} aria-pressed={papel === p} onClick={() => escolher(p)}>
                  <span className="eq-funcao-icone" aria-hidden>{x.icone}</span>
                  <strong>{x.nome}</strong>
                  <span className="dica">{x.resumo}</span>
                  {x.emBreve ? (
                    <span className="selo">Em breve · {x.emBreve}</span>
                  ) : p === 'gerente' && !souDono ? (
                    <span className="selo">Só o dono cria gerentes</span>
                  ) : (
                    <>
                      {pode.length > 0 && <span className="eq-pode">✔ {p === 'funcionario' ? `Pode: ${pode.join(', ')}` : pode.join(' · ')}</span>}
                      {x.naoPode.length > 0 && <span className="eq-naopode">✖ {x.naoPode.join(' · ')}</span>}
                    </>
                  )}
                </button>
              );
            })}
          </div>
          <p className="dica" style={{ margin: 0 }}>
            O que o Caixa / Atendente pode fazer você ajusta em <Link href="/lojas?aba=funcoes">Funções e permissões</Link>.
          </p>
          <div className="linha"><button type="button" onClick={fechar}>Cancelar</button></div>
        </>
      )}

      {passo === 2 && f && (
        <form
          className="grade"
          onSubmit={(e) => {
            e.preventDefault();
            enviar();
          }}
        >
          <p style={{ margin: 0 }}>
            <span className="selo">{f.icone} {f.nome}</span> <button type="button" className="mini" onClick={() => setPasso(1)}>trocar</button>
          </p>
          <label>
            Nome da pessoa
            <input
              required
              maxLength={120}
              value={nome}
              placeholder="Ex.: Ana Souza"
              onChange={(e) => {
                setNome(e.target.value);
                if (!usuarioMexido && papel) setUsuario(sugerirUsuario(e.target.value, papel));
              }}
            />
          </label>

          <fieldset className="eq-modos">
            <legend>Como ela vai entrar no RES?</legend>
            <label className="eq-modo" data-escolhido={modo === 'usuario' || undefined}>
              <input type="radio" name="modo" checked={modo === 'usuario'} onChange={() => setModo('usuario')} />
              <span>
                <b>Com usuário e senha que você cria agora</b> {f.entrada !== 'email' && <span className="selo">recomendado</span>}
                <span className="dica">Não precisa de e-mail. Você entrega o cartão de acesso impresso ou manda pelo WhatsApp.</span>
              </span>
            </label>
            <label className="eq-modo" data-escolhido={modo === 'email' || undefined}>
              <input type="radio" name="modo" checked={modo === 'email'} onChange={() => setModo('email')} />
              <span>
                <b>Por convite no e-mail dela</b>
                <span className="dica">Ela cria a própria senha. Bom para gerente ou quem já usa o RES em outra loja.</span>
              </span>
            </label>
          </fieldset>

          {modo === 'usuario' ? (
            <div className="gc-campos">
              <label>
                Usuário (para entrar)
                <input
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[A-Za-z0-9][A-Za-z0-9._\-]{2,29}"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={usuario}
                  placeholder="ana.caixa"
                  onChange={(e) => {
                    setUsuario(e.target.value.toLowerCase());
                    setUsuarioMexido(true);
                  }}
                />
                <span className="dica">Letras sem acento, números, ponto ou hífen.</span>
              </label>
              <label>
                Senha
                <span className="linha" style={{ gap: '0.3rem', flexWrap: 'nowrap' }}>
                  <input required minLength={8} maxLength={72} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
                  <button type="button" className="mini" onClick={() => setSenha(gerarSenha())}>Gerar outra</button>
                </span>
                <span className="dica">Mínimo 8 caracteres. Já sugerimos uma fácil de ditar.</span>
              </label>
            </div>
          ) : (
            <label>
              E-mail da pessoa
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@email.com" />
            </label>
          )}

          {modo === 'usuario' && (
            <fieldset className="eq-modos">
              <legend>Ficha do funcionário (Gestão Empresarial)</legend>
              <p className="dica" style={{ margin: 0 }}>Para os documentos de falta e advertência. Preenchendo aqui, não precisa digitar de novo.</p>
              {livres.length > 0 && (
                <label className="eq-modo" data-escolhido={fichaModo === 'existente' || undefined}>
                  <input type="radio" name="ficha" checked={fichaModo === 'existente'} onChange={() => setFichaModo('existente')} />
                  <span>
                    <b>Já tem ficha</b>
                    <select
                      value={fichaId}
                      onChange={(e) => {
                        setFichaId(e.target.value);
                        setFichaModo('existente');
                        const f2 = livres.find((x) => x.id === e.target.value);
                        if (f2 && !nome.trim()) {
                          setNome(f2.nome);
                          if (!usuarioMexido && papel) setUsuario(sugerirUsuario(f2.nome, papel));
                        }
                      }}
                    >
                      <option value="">Escolha…</option>
                      {livres.map((f2) => <option key={f2.id} value={f2.id}>{f2.nome}{f2.cargo ? ` · ${f2.cargo}` : ''}</option>)}
                    </select>
                  </span>
                </label>
              )}
              <div className="eq-modo" data-escolhido={fichaModo === 'nova' || undefined}>
                <input type="radio" id="ficha-nova" name="ficha" checked={fichaModo === 'nova'} onChange={() => setFichaModo('nova')} />
                <span>
                  <label htmlFor="ficha-nova"><b>Criar a ficha agora</b></label>
                  {fichaModo === 'nova' && (
                    <span className="gc-campos" style={{ marginTop: '0.35rem' }}>
                      <label>CPF<input inputMode="numeric" value={cpf} placeholder="000.000.000-00" onChange={(e) => setCpf(e.target.value)} onBlur={(e) => setCpf(formatarCpf(e.target.value))} aria-invalid={(soDigitos(cpf).length > 0 && !cpfValido(cpf)) || undefined} /></label>
                      <label>Cargo<input value={cargo} maxLength={60} placeholder={papel ? FUNCOES[papel].nome : ''} onChange={(e) => setCargo(e.target.value)} /></label>
                      <label>Admissão<input type="date" value={admissao} onChange={(e) => setAdmissao(e.target.value)} /></label>
                    </span>
                  )}
                  <span className="dica">RG, CTPS e endereço você completa depois em Gestão Empresarial → Funcionários.</span>
                </span>
              </div>
              <label className="eq-modo" data-escolhido={fichaModo === 'nenhuma' || undefined}>
                <input type="radio" name="ficha" checked={fichaModo === 'nenhuma'} onChange={() => setFichaModo('nenhuma')} />
                <span><b>Agora não</b><span className="dica">Ex.: sócio, freelancer ou motoboy terceirizado.</span></span>
              </label>
            </fieldset>
          )}
          {modo === 'email' && <p className="dica" style={{ margin: 0 }}>Depois que a pessoa aceitar o convite, ligue o acesso à ficha dela em Gestão Empresarial → Funcionários.</p>}

          {papel === 'entregador' && (
            <p className="dica eq-aviso" style={{ margin: 0 }}>
              🛵 O motoboy entra pelo celular e cai direto no app de entregas. No Android, o melhor é instalar o <a href={APK}>app RES Motoboy</a>. Antes, confira a <b>cidade</b> da loja em Lojas e cardápios (completa o endereço no Maps).
            </p>
          )}
          {papel === 'funcionario' && (
            <p className="dica eq-aviso" style={{ margin: 0 }}>🧾 Se ela for operar o caixa, depois vá em <b>Caixa</b> e defina qual caixa ela usa.</p>
          )}

          {r && !r.ok && <p className="erro" role="alert" style={{ margin: 0 }}>{r.erro}</p>}
          <div className="linha">
            <button className="botao-primario" disabled={pendente}>{pendente ? 'Criando…' : modo === 'usuario' ? 'Criar acesso e ver o cartão' : 'Enviar convite'}</button>
            <button type="button" onClick={() => setPasso(1)}>Voltar</button>
            <button type="button" onClick={fechar}>Cancelar</button>
          </div>
        </form>
      )}

      {passo === 3 && (
        <div className="grade">
          <p className="dica" role="status" style={{ margin: 0 }}>✅ {r?.texto}</p>
          <div className="linha"><button type="button" className="botao-primario" onClick={fechar}>Concluir</button></div>
        </div>
      )}
    </section>
  );
}

/* ---------------------------------------------------------------- cartão de acesso */

export function CartaoAcesso({ c, fechar }: { c: Cartao; fechar: () => void }) {
  const [qr, setQr] = useState('');
  const [copiado, setCopiado] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/login` : '/login';
  const f = FUNCOES[c.papel];
  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 1, width: 150, errorCorrectionLevel: 'M' }).then(setQr).catch(() => setQr(''));
  }, [url]);
  const texto =
    `Olá, ${c.nome.split(' ')[0]}! Seu acesso ao RES (${c.loja}):\n` +
    `Entre em: ${url}\nUsuário: ${c.usuario}\n` +
    (c.senha ? `Senha: ${c.senha}\n` : '') +
    (c.papel === 'entregador' ? `No Android, instale o app RES Motoboy: ${APK}\n` : '') +
    'Não passe a senha para ninguém.';
  const imprimir = () => {
    document.body.classList.add('imprimindo-cartao');
    const tirar = () => {
      document.body.classList.remove('imprimindo-cartao');
      window.removeEventListener('afterprint', tirar);
    };
    window.addEventListener('afterprint', tirar);
    window.print();
  };

  return (
    <section className="grade eq-cartao-area" aria-label="Cartão de acesso">
      {c.aviso && <p className={c.aviso.startsWith('O acesso foi criado') ? 'erro nao-imprimir' : 'dica nao-imprimir'} style={{ margin: 0 }}>📋 {c.aviso}</p>}
      {c.senha && <p className="dica nao-imprimir" role="status" style={{ margin: 0 }}>✅ Acesso de {c.nome} pronto. <b>Anote ou imprima agora:</b> a senha não aparece de novo (se perder, é só trocar).</p>}
      <div className="eq-cartao-acesso">
        <div className="eq-cartao-topo">
          <span className="marca-res">RES</span>
          <span>{c.loja}</span>
        </div>
        <div className="eq-cartao-corpo">
          <div className="grade" style={{ gap: '0.35rem' }}>
            <strong style={{ fontSize: '1.15rem' }}>{c.nome}</strong>
            <span className="selo">{f.icone} {f.nome}</span>
            <dl className="eq-dados">
              <dt>Entre em</dt>
              <dd>{url.replace(/^https?:\/\//, '')}</dd>
              <dt>Usuário</dt>
              <dd><b>{c.usuario}</b></dd>
              <dt>Senha</dt>
              <dd>{c.senha ? <b>{c.senha}</b> : '(a que foi combinada)'}</dd>
            </dl>
          </div>
          {qr && <span className="eq-qr" aria-label="QR para abrir a página de entrada" dangerouslySetInnerHTML={{ __html: qr }} />}
        </div>
        <ol className="eq-como">
          <li>Aponte a câmera para o QR (ou digite o endereço).</li>
          <li>Digite o usuário e a senha. Não precisa de e-mail.</li>
          <li>{c.papel === 'entregador' ? 'O app de entregas abre sozinho. No Android, prefira o app RES Motoboy.' : 'Você cai direto no painel da loja.'}</li>
        </ol>
        <p className="eq-cartao-rodape">Acesso pessoal: não passe para ninguém. Se esquecer a senha, peça para o gerente trocar.</p>
      </div>
      <div className="linha nao-imprimir">
        <button type="button" className="botao-primario" onClick={imprimir}>🖨 Imprimir cartão</button>
        <a className="botao" href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noreferrer">Mandar pelo WhatsApp</a>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(texto).then(() => setCopiado(true)).catch(() => {});
          }}
        >
          {copiado ? 'Copiado ✓' : 'Copiar texto'}
        </button>
        <button type="button" onClick={fechar}>Fechar</button>
      </div>
    </section>
  );
}

function SeloFicha({ ficha }: { ficha?: Ficha }) {
  if (!ficha) return <Link href="/gestao?aba=funcionarios" className="eq-ficha dica">📋 Sem ficha na Gestão Empresarial</Link>;
  return (
    <Link href="/gestao?aba=funcionarios" className="eq-ficha dica">
      📋 Ficha: {ficha.cargo ?? 'sem cargo'}{ficha.cpf ? ` · CPF ${formatarCpf(ficha.cpf)}` : ' · sem CPF'}
    </Link>
  );
}
