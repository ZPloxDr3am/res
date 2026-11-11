'use client';
import { useState, useTransition } from 'react';
import { validarSenha, validarUsuario } from '@res/core';
import { FUNCOES, gerarSenha, sugerirUsuario, type Papel } from '@/lib/equipe';
import { ligarFicha, salvarFuncionario, type FuncionarioForm } from '@/app/(painel)/gestao/actions';
import { criarUsuarioCaixa } from '@/app/(painel)/lojas/actions';
import { CartaoAcesso, type Cartao } from '@/components/equipe/equipe';
import { salvando } from '@/components/tempo-real';
import { cpfValido, dataBr, formatarCpf, soDigitos, type Funcionario } from '@/lib/gestao';

export type Acesso = { id: string; nome: string; papel: string; ativo: boolean; usuario: string | null };
const novo = (): FuncionarioForm => ({ nome: '', cpf: '', rg: '', ctps: '', pis: '', cargo: '', admissao: '', nascimento: '', telefone: '', endereco: '', ativo: true, membroId: '', tirarAcesso: true });
const doFuncionario = (f: Funcionario): FuncionarioForm => ({
  id: f.id,
  nome: f.nome,
  cpf: formatarCpf(f.cpf),
  rg: f.rg ?? '',
  ctps: f.ctps ?? '',
  pis: f.pis ?? '',
  cargo: f.cargo ?? '',
  admissao: f.admissao ?? '',
  nascimento: f.nascimento ?? '',
  telefone: f.telefone ?? '',
  endereco: f.endereco ?? '',
  ativo: f.ativo,
  membroId: f.membro_id ?? '',
  tirarAcesso: true,
});

/** Cadastro dos funcionários: os dados vão impressos nos termos de falta e advertência. */
type ModoAcesso = 'criar' | 'ligar' | 'nenhum';

export function Funcionarios({ inicial, acessos, lojaId, lojaNome, meuPapel }: { inicial: Funcionario[]; acessos: Acesso[]; lojaId: string; lojaNome: string; meuPapel: string }) {
  const [editando, setEditando] = useState<FuncionarioForm | null>(null);
  const [modoAcesso, setModoAcesso] = useState<ModoAcesso>('criar');
  const [papel, setPapel] = useState<Papel>('funcionario');
  const [usuario, setUsuario] = useState('');
  const [usuarioMexido, setUsuarioMexido] = useState(false);
  const [senha, setSenha] = useState('');
  const [cartao, setCartao] = useState<Cartao | null>(null);
  const abrir = (f: FuncionarioForm) => {
    setEditando(f);
    setMsg(null);
    setCartao(null);
    setModoAcesso(f.membroId ? 'ligar' : f.id ? 'nenhum' : 'criar');
    setPapel('funcionario');
    setUsuario(f.nome ? sugerirUsuario(f.nome, 'funcionario') : '');
    setUsuarioMexido(false);
    setSenha(gerarSenha());
  };
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const acessoDe = (id: string | null | undefined) => acessos.find((a) => a.id === id);
  const usados = new Set(inicial.map((f) => f.membro_id).filter(Boolean));
  const descrever = (a: Acesso) => `${a.nome} · ${FUNCOES[a.papel as Papel]?.nome ?? a.papel}${a.usuario ? ` · usuário ${a.usuario}` : ''}${a.ativo ? '' : ' (sem acesso)'}`;
  const campo = (k: keyof FuncionarioForm, x: string | boolean) => {
    setEditando((f) => (f ? { ...f, [k]: x } : f));
    if (k === 'nome' && typeof x === 'string' && !usuarioMexido) setUsuario(sugerirUsuario(x, papel));
  };
  const cpfRuim = !!editando && soDigitos(editando.cpf).length > 0 && !cpfValido(editando.cpf);

  const criarAcesso = modoAcesso === 'criar' && !!editando && !editando.membroId && editando.ativo;
  const salvar = () => {
    if (!editando) return;
    if (criarAcesso) {
      const e = validarUsuario(usuario) ?? validarSenha(senha);
      if (e) return setMsg({ tipo: 'erro', texto: e });
    }
    iniciar(async () => {
      const ficha = { ...editando, membroId: modoAcesso === 'ligar' ? editando.membroId : modoAcesso === 'nenhum' && editando.id ? '' : undefined };
      const r = await salvando(salvarFuncionario(ficha));
      if (!r.ok) return setMsg({ tipo: 'erro', texto: r.erro });
      if (!criarAcesso) {
        setEditando(null);
        return setMsg({ tipo: 'ok', texto: 'Funcionário salvo.' });
      }
      // ficha salva: cria o usuário e senha e liga à ficha (D-054)
      const fd = new FormData();
      fd.set('nome', editando.nome.trim());
      fd.set('papel', papel);
      fd.set('usuario', usuario.trim().toLowerCase());
      fd.set('senha', senha);
      const a = await salvando(criarUsuarioCaixa(lojaId, fd));
      if (!a.ok) {
        setEditando({ ...editando, id: r.id });
        return setMsg({ tipo: 'erro', texto: `A ficha foi salva, mas o acesso não: ${a.erro}` });
      }
      const l = a.membroId ? await salvando(ligarFicha(a.membroId, { funcionarioId: r.id })) : { ok: false as const, erro: 'acesso sem identificação' };
      setEditando(null);
      setMsg({ tipo: 'ok', texto: 'Funcionário salvo e acesso criado.' });
      setCartao({ loja: lojaNome, nome: editando.nome.trim(), papel, usuario: usuario.trim().toLowerCase(), senha, aviso: l.ok ? 'Ficha e acesso ligados.' : `O acesso foi criado, mas não ficou ligado à ficha: ${l.erro}` });
    });
  };

  return (
    <div className="grade">
      <p className="dica" style={{ margin: 0 }}>
        Os dados ficam só para o dono e o gerente desta loja e aparecem nos documentos de falta e advertência.
      </p>
      {!editando && (
        <div className="linha">
          <button type="button" className="botao-primario" onClick={() => abrir(novo())}>+ Novo funcionário</button>
          {msg && <span className={msg.tipo === 'erro' ? 'erro' : 'dica'} role="status">{msg.texto}</span>}
        </div>
      )}

      {cartao && <CartaoAcesso c={cartao} fechar={() => setCartao(null)} />}

      {editando && (
        <form
          className="cartao grade"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          <h2 style={{ margin: 0 }}>{editando.id ? 'Editar funcionário' : 'Novo funcionário'}</h2>
          <div className="gc-campos">
            <label className="gc-largo">Nome completo<input required value={editando.nome} maxLength={120} onChange={(e) => campo('nome', e.target.value)} /></label>
            <label>
              CPF
              <input inputMode="numeric" value={editando.cpf} placeholder="000.000.000-00" onChange={(e) => campo('cpf', e.target.value)} onBlur={(e) => campo('cpf', formatarCpf(e.target.value))} aria-invalid={cpfRuim || undefined} />
              {cpfRuim && <span className="erro">CPF inválido</span>}
            </label>
            <label>RG<input value={editando.rg} maxLength={30} onChange={(e) => campo('rg', e.target.value)} /></label>
            <label>CTPS (nº e série)<input value={editando.ctps} maxLength={30} onChange={(e) => campo('ctps', e.target.value)} /></label>
            <label>PIS/NIS<input value={editando.pis} maxLength={20} onChange={(e) => campo('pis', e.target.value)} /></label>
            <label>Cargo / função<input value={editando.cargo} maxLength={60} placeholder="Ex.: Pizzaiolo" onChange={(e) => campo('cargo', e.target.value)} /></label>
            <label>Admissão<input type="date" value={editando.admissao} onChange={(e) => campo('admissao', e.target.value)} /></label>
            <label>Nascimento<input type="date" value={editando.nascimento} onChange={(e) => campo('nascimento', e.target.value)} /></label>
            <label>Telefone<input type="tel" value={editando.telefone} maxLength={20} onChange={(e) => campo('telefone', e.target.value)} /></label>
            <label className="gc-largo">Endereço<input value={editando.endereco} maxLength={200} onChange={(e) => campo('endereco', e.target.value)} /></label>
            <fieldset className="gc-largo eq-modos">
              <legend>Acesso ao RES (usuário e senha para entrar)</legend>
              {!editando.membroId && editando.ativo && (
                <div className="eq-modo" data-escolhido={modoAcesso === 'criar' || undefined}>
                  <input type="radio" id="ac-criar" name="acesso" checked={modoAcesso === 'criar'} onChange={() => setModoAcesso('criar')} />
                  <span>
                    <label htmlFor="ac-criar"><b>Criar o acesso agora</b> <span className="selo">recomendado</span></label>
                    {modoAcesso === 'criar' && (
                      <span className="gc-campos" style={{ marginTop: '0.4rem' }}>
                        <label>
                          Função no RES
                          <select
                            value={papel}
                            onChange={(e) => {
                              const p2 = e.target.value as Papel;
                              setPapel(p2);
                              if (!usuarioMexido) setUsuario(sugerirUsuario(editando.nome, p2));
                            }}
                          >
                            {(['funcionario', 'entregador', 'gerente'] as Papel[])
                              .filter((x) => x !== 'gerente' || meuPapel === 'dono')
                              .map((x) => <option key={x} value={x}>{FUNCOES[x].icone} {FUNCOES[x].nome}</option>)}
                          </select>
                        </label>
                        <label>
                          Usuário
                          <input
                            value={usuario}
                            minLength={3}
                            maxLength={30}
                            autoCapitalize="none"
                            spellCheck={false}
                            placeholder="ana.caixa"
                            onChange={(e) => {
                              setUsuario(e.target.value.toLowerCase());
                              setUsuarioMexido(true);
                            }}
                          />
                        </label>
                        <label>
                          Senha
                          <span className="linha" style={{ gap: '0.3rem', flexWrap: 'nowrap' }}>
                            <input value={senha} minLength={8} maxLength={72} autoComplete="new-password" onChange={(e) => setSenha(e.target.value)} />
                            <button type="button" className="mini" onClick={() => setSenha(gerarSenha())}>Gerar outra</button>
                          </span>
                        </label>
                      </span>
                    )}
                    <span className="dica">{FUNCOES[papel].resumo} Ao salvar, sai o cartão de acesso para imprimir ou mandar no WhatsApp. O que cada função pode fazer está em Lojas e equipe → Funções e permissões.</span>
                  </span>
                </div>
              )}
              <div className="eq-modo" data-escolhido={modoAcesso === 'ligar' || undefined}>
                <input type="radio" id="ac-ligar" name="acesso" checked={modoAcesso === 'ligar'} onChange={() => setModoAcesso('ligar')} />
                <span>
                  <label htmlFor="ac-ligar"><b>{editando.membroId ? 'Acesso ligado' : 'Já tem acesso (ex.: entrou por convite)'}</b></label>
                  {modoAcesso === 'ligar' && (
                    <select aria-label="Acesso" value={editando.membroId ?? ''} onChange={(e) => campo('membroId', e.target.value)}>
                      <option value="">Escolha…</option>
                      {acessos.filter((a) => a.papel !== 'dono' && (!usados.has(a.id) || a.id === editando.membroId)).map((a) => <option key={a.id} value={a.id}>{descrever(a)}</option>)}
                    </select>
                  )}
                </span>
              </div>
              <div className="eq-modo" data-escolhido={modoAcesso === 'nenhum' || undefined}>
                <input type="radio" id="ac-nenhum" name="acesso" checked={modoAcesso === 'nenhum'} onChange={() => setModoAcesso('nenhum')} />
                <span>
                  <label htmlFor="ac-nenhum"><b>Sem acesso ao RES</b></label>
                  <span className="dica">Ex.: cozinheiro ou auxiliar que não usa o sistema.</span>
                </span>
              </div>
            </fieldset>
            <label className="gc-check"><input type="checkbox" checked={editando.ativo} onChange={(e) => campo('ativo', e.target.checked)} /> Trabalhando na loja</label>
            {!editando.ativo && editando.membroId && acessoDe(editando.membroId)?.ativo && (
              <label className="gc-check"><input type="checkbox" checked={editando.tirarAcesso ?? true} onChange={(e) => campo('tirarAcesso', e.target.checked)} /> Tirar também o acesso ao RES de {editando.nome.split(' ')[0] || 'quem saiu'}</label>
            )}
          </div>
          <div className="linha">
            <button type="submit" className="botao-primario" disabled={pendente || cpfRuim}>{pendente ? 'Salvando…' : criarAcesso ? 'Salvar e criar acesso' : 'Salvar'}</button>
            <button type="button" onClick={() => setEditando(null)}>Cancelar</button>
            {msg?.tipo === 'erro' && <span className="erro" role="alert">{msg.texto}</span>}
          </div>
        </form>
      )}

      {inicial.length === 0 ? (
        <p className="cartao dica">Nenhum funcionário cadastrado ainda.</p>
      ) : (
        <div className="cartao tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr><th>Nome</th><th>CPF</th><th>Cargo</th><th>Admissão</th><th>Acesso ao RES</th><th>Situação</th><th /></tr>
            </thead>
            <tbody>
              {inicial.map((f) => (
                <tr key={f.id} style={f.ativo ? undefined : { opacity: 0.6 }}>
                  <td>{f.nome}</td>
                  <td>{formatarCpf(f.cpf) || '—'}</td>
                  <td>{f.cargo ?? '—'}</td>
                  <td>{dataBr(f.admissao) || '—'}</td>
                  <td>
                    {acessoDe(f.membro_id) ? (
                      <span className="dica">{FUNCOES[acessoDe(f.membro_id)!.papel as Papel]?.icone} {acessoDe(f.membro_id)!.usuario ?? 'e-mail'}{acessoDe(f.membro_id)!.ativo ? '' : ' (sem acesso)'}</span>
                    ) : f.ativo ? (
                      <button type="button" className="mini" onClick={() => { abrir({ ...doFuncionario(f), membroId: '' }); setModoAcesso('criar'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>+ Criar acesso</button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{f.ativo ? 'Ativo' : 'Desligado'}</td>
                  <td><button type="button" onClick={() => { abrir(doFuncionario(f)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
