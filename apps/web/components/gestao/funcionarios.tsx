'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { FUNCOES, type Papel } from '@/lib/equipe';
import { salvarFuncionario, type FuncionarioForm } from '@/app/(painel)/gestao/actions';
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
export function Funcionarios({ inicial, acessos }: { inicial: Funcionario[]; acessos: Acesso[] }) {
  const [editando, setEditando] = useState<FuncionarioForm | null>(null);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const acessoDe = (id: string | null | undefined) => acessos.find((a) => a.id === id);
  const usados = new Set(inicial.map((f) => f.membro_id).filter(Boolean));
  const descrever = (a: Acesso) => `${a.nome} · ${FUNCOES[a.papel as Papel]?.nome ?? a.papel}${a.usuario ? ` · usuário ${a.usuario}` : ''}${a.ativo ? '' : ' (sem acesso)'}`;
  const campo = (k: keyof FuncionarioForm, x: string | boolean) => setEditando((f) => (f ? { ...f, [k]: x } : f));
  const cpfRuim = !!editando && soDigitos(editando.cpf).length > 0 && !cpfValido(editando.cpf);

  const salvar = () => {
    if (!editando) return;
    iniciar(async () => {
      const r = await salvando(salvarFuncionario(editando));
      if (r.ok) setEditando(null);
      setMsg(r.ok ? { tipo: 'ok', texto: 'Funcionário salvo.' } : { tipo: 'erro', texto: r.erro });
    });
  };

  return (
    <div className="grade">
      <p className="dica" style={{ margin: 0 }}>
        Os dados ficam só para o dono e o gerente desta loja e aparecem nos documentos de falta e advertência.
      </p>
      {!editando && (
        <div className="linha">
          <button type="button" className="botao-primario" onClick={() => { setEditando(novo()); setMsg(null); }}>+ Novo funcionário</button>
          {msg && <span className={msg.tipo === 'erro' ? 'erro' : 'dica'} role="status">{msg.texto}</span>}
        </div>
      )}

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
            <label className="gc-largo">
              Acesso ao RES (Lojas e equipe)
              <select value={editando.membroId ?? ''} onChange={(e) => campo('membroId', e.target.value)}>
                <option value="">Sem acesso ligado</option>
                {acessos.filter((a) => a.papel !== 'dono' && (!usados.has(a.id) || a.id === editando.membroId)).map((a) => <option key={a.id} value={a.id}>{descrever(a)}</option>)}
              </select>
              <span className="dica">Liga esta ficha ao usuário que a pessoa usa para entrar. Para criar um acesso novo, salve e use “Criar acesso” na lista.</span>
            </label>
            <label className="gc-check"><input type="checkbox" checked={editando.ativo} onChange={(e) => campo('ativo', e.target.checked)} /> Trabalhando na loja</label>
            {!editando.ativo && editando.membroId && acessoDe(editando.membroId)?.ativo && (
              <label className="gc-check"><input type="checkbox" checked={editando.tirarAcesso ?? true} onChange={(e) => campo('tirarAcesso', e.target.checked)} /> Tirar também o acesso ao RES de {editando.nome.split(' ')[0] || 'quem saiu'}</label>
            )}
          </div>
          <div className="linha">
            <button type="submit" className="botao-primario" disabled={pendente || cpfRuim}>{pendente ? 'Salvando…' : 'Salvar'}</button>
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
                      <Link href={`/lojas?aba=equipe&funcionario=${f.id}`} className="botao mini">+ Criar acesso</Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{f.ativo ? 'Ativo' : 'Desligado'}</td>
                  <td><button type="button" onClick={() => { setEditando(doFuncionario(f)); setMsg(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
