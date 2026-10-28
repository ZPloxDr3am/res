'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { excluirRegistro, salvarRegistro, type RegistroForm } from '@/app/(painel)/gestao/actions';
import { salvando } from '@/components/tempo-real';
import { dataBr, MOTIVOS_ADVERTENCIA, MOTIVOS_FALTA, type Funcionario, type Registro } from '@/lib/gestao';

const hoje = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

/** Faltas ou advertências: registrar e imprimir o documento para o funcionário assinar. */
export function Registros({ tipo, funcionarios, registros, empresaOk }: { tipo: 'falta' | 'advertencia'; funcionarios: Funcionario[]; registros: Registro[]; empresaOk: boolean }) {
  const falta = tipo === 'falta';
  const ativos = funcionarios.filter((f) => f.ativo);
  const nomes = new Map(funcionarios.map((f) => [f.id, f.nome]));
  const motivos = falta ? MOTIVOS_FALTA : MOTIVOS_ADVERTENCIA;
  const vazio = (): RegistroForm => ({ funcionarioId: '', tipo, data: hoje(), dataFim: '', justificada: false, motivo: motivos[0]!, descricao: '', testemunha1: '', testemunha2: '' });
  const [form, setForm] = useState<RegistroForm | null>(null);
  const [outro, setOutro] = useState('');
  const [filtro, setFiltro] = useState('');
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string; id?: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const mudar = (x: Partial<RegistroForm>) => setForm((f) => (f ? { ...f, ...x } : f));

  const salvar = () => {
    if (!form) return;
    const motivo = form.motivo === 'Outro' ? outro.trim() : form.motivo;
    iniciar(async () => {
      const r = await salvando(salvarRegistro({ ...form, motivo }));
      if (r.ok) {
        setForm(null);
        setOutro('');
      }
      setMsg(r.ok ? { tipo: 'ok', texto: falta ? 'Falta registrada.' : 'Advertência registrada.', id: r.id } : { tipo: 'erro', texto: r.erro });
    });
  };
  const excluir = (r: Registro) => {
    if (!window.confirm(`Excluir ${falta ? 'a falta' : 'a advertência'} nº ${r.numero} de ${nomes.get(r.funcionario_id)}? O número não será reaproveitado.`)) return;
    iniciar(async () => {
      const x = await salvando(excluirRegistro(r.id));
      setMsg(x.ok ? { tipo: 'ok', texto: 'Excluído.' } : { tipo: 'erro', texto: x.erro });
    });
  };
  const lista = filtro ? registros.filter((r) => r.funcionario_id === filtro) : registros;

  return (
    <div className="grade">
      {!empresaOk && (
        <p className="cartao erro" style={{ margin: 0 }}>
          Preencha a razão social e o CNPJ em <Link href="/gestao?aba=empresa">Dados da empresa</Link>: eles vão no documento.
        </p>
      )}
      {ativos.length === 0 ? (
        <p className="cartao dica">Cadastre os funcionários primeiro, em <Link href="/gestao?aba=funcionarios">Funcionários</Link>.</p>
      ) : !form ? (
        <div className="linha">
          <button type="button" className="botao-primario" onClick={() => { setForm(vazio()); setMsg(null); }}>
            + Registrar {falta ? 'falta' : 'advertência'}
          </button>
          {msg && (
            <span className={msg.tipo === 'erro' ? 'erro' : 'dica'} role="status">
              {msg.texto}{' '}
              {msg.id && <Link href={`/gestao/documento/${msg.id}`}>Imprimir o documento para assinar →</Link>}
            </span>
          )}
        </div>
      ) : (
        <form
          className="cartao grade"
          onSubmit={(e) => {
            e.preventDefault();
            salvar();
          }}
        >
          <h2 style={{ margin: 0 }}>{falta ? 'Registrar falta' : 'Registrar advertência'}</h2>
          <div className="gc-campos">
            <label className="gc-largo">
              Funcionário
              <select required value={form.funcionarioId} onChange={(e) => mudar({ funcionarioId: e.target.value })}>
                <option value="">Escolha…</option>
                {ativos.map((f) => <option key={f.id} value={f.id}>{f.nome}{f.cargo ? ` · ${f.cargo}` : ''}</option>)}
              </select>
            </label>
            <label>{falta ? 'Dia da falta' : 'Data do ocorrido'}<input type="date" required value={form.data} onChange={(e) => mudar({ data: e.target.value })} /></label>
            {falta && <label>Até (se foi mais de um dia)<input type="date" value={form.dataFim} min={form.data} onChange={(e) => mudar({ dataFim: e.target.value })} /></label>}
            <label>
              Motivo
              <select value={form.motivo} onChange={(e) => mudar({ motivo: e.target.value, ...(falta ? { justificada: e.target.value === 'Atestado médico' } : {}) })}>
                {motivos.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>
            {form.motivo === 'Outro' && <label>Qual?<input required value={outro} maxLength={120} onChange={(e) => setOutro(e.target.value)} /></label>}
            {falta && (
              <label className="gc-check">
                <input type="checkbox" checked={form.justificada} onChange={(e) => mudar({ justificada: e.target.checked })} /> Falta justificada (atestado ou motivo previsto em lei)
              </label>
            )}
            <label className="gc-largo">
              {falta ? 'Observações (opcional)' : 'O que aconteceu (vai escrito na advertência)'}
              <textarea rows={4} maxLength={2000} required={!falta} value={form.descricao} placeholder={falta ? 'Ex.: avisou por mensagem às 18h que não viria.' : 'Ex.: no dia 21/10, chegou às 18h40, com 40 minutos de atraso, sem aviso prévio.'} onChange={(e) => mudar({ descricao: e.target.value })} />
            </label>
            <label>Testemunha 1 (opcional)<input value={form.testemunha1} maxLength={120} onChange={(e) => mudar({ testemunha1: e.target.value })} /></label>
            <label>Testemunha 2 (opcional)<input value={form.testemunha2} maxLength={120} onChange={(e) => mudar({ testemunha2: e.target.value })} /></label>
          </div>
          <p className="dica" style={{ margin: 0 }}>Testemunhas assinam se o funcionário se recusar a assinar. O nome sai impresso; pode deixar em branco e escrever à mão.</p>
          <div className="linha">
            <button type="submit" className="botao-primario" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar e gerar documento'}</button>
            <button type="button" onClick={() => setForm(null)}>Cancelar</button>
            {msg?.tipo === 'erro' && <span className="erro" role="alert">{msg.texto}</span>}
          </div>
        </form>
      )}

      <section className="cartao grade">
        <div className="linha" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>{falta ? 'Faltas registradas' : 'Advertências registradas'}</h2>
          {funcionarios.length > 0 && (
            <label>
              Funcionário
              <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                <option value="">Todos</option>
                {funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            </label>
          )}
        </div>
        {lista.length === 0 ? (
          <p className="dica" style={{ margin: 0 }}>Nada registrado{filtro ? ' para este funcionário' : ''}.</p>
        ) : (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr><th>Nº</th><th>Data</th><th>Funcionário</th><th>Motivo</th>{falta && <th>Situação</th>}<th /></tr>
              </thead>
              <tbody>
                {lista.map((r) => (
                  <tr key={r.id}>
                    <td>{r.numero}</td>
                    <td>{dataBr(r.data)}{r.data_fim ? ` a ${dataBr(r.data_fim)}` : ''}</td>
                    <td>{nomes.get(r.funcionario_id) ?? '—'}</td>
                    <td style={{ whiteSpace: 'normal' }}>{r.motivo}</td>
                    {falta && <td>{r.justificada ? 'Justificada' : 'Sem justificativa'}</td>}
                    <td className="linha" style={{ gap: '0.4rem', flexWrap: 'nowrap' }}>
                      <Link href={`/gestao/documento/${r.id}`} className="botao">🖨 Imprimir</Link>
                      <button type="button" aria-label={`Excluir nº ${r.numero}`} onClick={() => excluir(r)} disabled={pendente}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtro && (
          <p className="dica" style={{ margin: 0 }}>
            {lista.length} {falta ? `falta(s), ${lista.filter((r) => !r.justificada).length} sem justificativa` : 'advertência(s)'} para {nomes.get(filtro)}.
          </p>
        )}
      </section>
    </div>
  );
}
