'use client';
import { useState, useTransition } from 'react';
import { salvarPermissoesEquipe } from '@/app/(painel)/lojas/actions';
import { salvando } from '@/components/tempo-real';
import { FUNCOES, PERMISSOES_EQUIPE, type Papel } from '@/lib/equipe';
import type { LojaEquipe } from '@/components/equipe/equipe';

/** Aba Funções e permissões (D-051): o que cada função faz, e o ajuste do Caixa / Atendente. */
export function Funcoes({ lojas, inicial }: { lojas: LojaEquipe[]; inicial: string }) {
  const [lojaId, setLojaId] = useState(lojas.some((l) => l.id === inicial) ? inicial : lojas[0]?.id);
  const loja = lojas.find((l) => l.id === lojaId);
  if (!loja) return null;
  return (
    <div className="grade">
      {lojas.length > 1 && (
        <div className="abas" role="tablist" aria-label="Loja">
          {lojas.map((l) => (
            <button key={l.id} type="button" role="tab" aria-selected={l.id === lojaId} onClick={() => setLojaId(l.id)}>{l.nome}</button>
          ))}
        </div>
      )}
      <QuadroFuncoes permissoes={loja.permissoesCaixa} />
      <AjusteCaixa key={loja.id} loja={loja} />
    </div>
  );
}

function QuadroFuncoes({ permissoes }: { permissoes: string[] }) {
  const linhas: { titulo: string; por: Partial<Record<Papel, boolean | string>> }[] = [
    ...PERMISSOES_EQUIPE.map((p) => ({ titulo: p.titulo, por: { dono: true, gerente: true, funcionario: permissoes.includes(p.chave), entregador: false } })),
    { titulo: 'App de entregas (motoboy)', por: { dono: true, gerente: true, funcionario: false, entregador: true } },
    { titulo: 'Gestão Empresarial', por: { dono: true, gerente: true, funcionario: false, entregador: false } },
    { titulo: 'Criar usuários e mudar funções', por: { dono: true, gerente: 'menos gerentes', funcionario: false, entregador: false } },
    { titulo: 'Novas lojas e cardápios', por: { dono: true, gerente: false, funcionario: false, entregador: false } },
  ];
  const cols: Papel[] = ['dono', 'gerente', 'funcionario', 'entregador'];
  return (
    <section className="cartao grade" aria-label="O que cada função pode fazer">
      <div>
        <h2 style={{ margin: 0 }}>O que cada função pode fazer</h2>
        <p className="dica" style={{ margin: 0 }}>Na dúvida, dê menos acesso: dá para liberar mais a qualquer momento.</p>
      </div>
      <div className="tabela-rolagem">
        <table className="tabela eq-quadro">
          <thead>
            <tr>
              <th />
              {cols.map((c) => <th key={c} className="eq-col">{FUNCOES[c].icone}<br />{FUNCOES[c].nome}</th>)}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.titulo}>
                <td>{l.titulo}</td>
                {cols.map((c) => {
                  const v = l.por[c];
                  return <td key={c} className="eq-col">{v === true ? <span className="eq-sim" aria-label="sim">✔</span> : v ? <span className="dica">{v}</span> : <span className="eq-nao" aria-label="não">—</span>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="dica" style={{ margin: 0 }}>🍽️ Garçom chega junto com Mesas e comandas.</p>
    </section>
  );
}

function AjusteCaixa({ loja }: { loja: LojaEquipe }) {
  const [sel, setSel] = useState<string[]>(loja.permissoesCaixa.filter((p) => PERMISSOES_EQUIPE.some((x) => x.chave === p)));
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const gestor = loja.meuPapel === 'dono' || loja.meuPapel === 'gerente';
  const qtd = loja.equipe.filter((m) => m.papel === 'funcionario' && m.ativo).length;
  const mudou = sel.slice().sort().join() !== loja.permissoesCaixa.filter((p) => PERMISSOES_EQUIPE.some((x) => x.chave === p)).sort().join();

  return (
    <section className="cartao grade" aria-label="Ajustar o Caixa / Atendente">
      <div>
        <h2 style={{ margin: 0 }}>🧾 O que o Caixa / Atendente pode fazer em {loja.nome}</h2>
        <p className="dica" style={{ margin: 0 }}>
          Vale para {qtd === 1 ? 'a pessoa' : `as ${qtd} pessoas`} com essa função nesta loja. Gerente e dono sempre podem tudo.
        </p>
      </div>
      <div className="eq-permissoes">
        {PERMISSOES_EQUIPE.map((p) => (
          <label key={p.chave} className="eq-permissao" data-marcado={sel.includes(p.chave) || undefined}>
            <input
              type="checkbox"
              disabled={!gestor}
              checked={sel.includes(p.chave)}
              onChange={(e) => {
                setSel((s) => (e.target.checked ? [...s, p.chave] : s.filter((x) => x !== p.chave)));
                setMsg(null);
              }}
            />
            <span>
              <b>{p.titulo}</b>
              <span className="dica">{p.ajuda}</span>
            </span>
          </label>
        ))}
      </div>
      <p className="dica" style={{ margin: 0 }}>Nunca liberado para o Caixa / Atendente: Gestão Empresarial, criar usuários, dados da empresa e plano.</p>
      {gestor ? (
        <div className="linha">
          <button
            type="button"
            className="botao-primario"
            disabled={pendente || !mudou}
            onClick={() =>
              iniciar(async () => {
                const r = await salvando(salvarPermissoesEquipe(loja.id, sel));
                setMsg(r.ok ? { ok: true, texto: 'Permissões salvas. Valem a partir do próximo clique da pessoa.' } : { ok: false, texto: r.erro });
              })
            }
          >
            {pendente ? 'Salvando…' : 'Salvar permissões'}
          </button>
          {msg && <span className={msg.ok ? 'dica' : 'erro'} role="status">{msg.texto}</span>}
        </div>
      ) : (
        <p className="dica" style={{ margin: 0 }}>Só o dono ou o gerente mudam as permissões.</p>
      )}
    </section>
  );
}
