'use client';
import { useState, useTransition } from 'react';
import { adicionarEquipe, definirModo, removerEquipe } from '@/app/empresa/actions';
import { salvando } from '@/components/tempo-real';

export function ConfigEmpresa({ modo, equipe, eu, integracoes }: { modo: 'convite' | 'aberto'; equipe: { user_id: string; email: string; criado_em: string }[]; eu: string; integracoes: { nome: string; ok: boolean; como: string }[] }) {
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [email, setEmail] = useState('');
  const [pendente, iniciar] = useTransition();
  const fazer = (p: Promise<{ ok: true } | { ok: false; erro: string }>, ok: string, depois?: () => void) =>
    iniciar(async () => {
      const r = await salvando(p);
      setMsg(r.ok ? { ok: true, t: ok } : { ok: false, t: r.erro });
      if (r.ok) depois?.();
    });
  return (
    <div className="grade">
      {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}

      <section className="cartao grade">
        <h2 style={{ margin: 0 }}>Quem pode se cadastrar</h2>
        <div className="qp-visao" role="radiogroup" aria-label="Quem pode se cadastrar" style={{ justifySelf: 'start' }}>
          <button type="button" role="radio" aria-checked={modo === 'convite'} disabled={pendente} onClick={() => fazer(definirModo('convite'), 'Cadastro só com convite.')}>Só com convite</button>
          <button type="button" role="radio" aria-checked={modo === 'aberto'} disabled={pendente} onClick={() => fazer(definirModo('aberto'), 'Cadastro aberto para todos.')}>Aberto para todos</button>
        </div>
        <p className="dica" style={{ margin: 0 }}>{modo === 'convite' ? 'Só entra quem recebe um convite da equipe. Recomendado até a cobrança automática existir.' : 'Qualquer pessoa com o link cria conta e ganha 14 dias de teste.'}</p>
      </section>

      <section className="cartao grade">
        <h2 style={{ margin: 0 }}>Equipe RES</h2>
        <p className="dica" style={{ margin: 0 }}>Quem acessa este painel: cria convites, ativa e suspende contas. A pessoa precisa ter entrado no RES pelo menos uma vez.</p>
        <ul className="emp-equipe">
          {equipe.map((p) => (
            <li key={p.user_id}>
              <span>{p.email}{p.user_id === eu && <span className="dica"> (você)</span>}</span>
              <span className="dica">desde {new Date(p.criado_em).toLocaleDateString('pt-BR')}</span>
              {p.user_id !== eu && <button type="button" className="mini dica" disabled={pendente} onClick={() => fazer(removerEquipe(p.user_id), `${p.email} saiu da equipe.`)}>Tirar</button>}
            </li>
          ))}
        </ul>
        <form
          className="linha"
          style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}
          onSubmit={(e) => {
            e.preventDefault();
            fazer(adicionarEquipe(email), `${email} agora é da equipe RES.`, () => setEmail(''));
          }}
        >
          <label style={{ flex: '1 1 260px' }}>E-mail de login<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoCapitalize="none" spellCheck={false} /></label>
          <button className="botao-primario" disabled={pendente || !email}>Incluir na equipe</button>
        </form>
      </section>

      <section className="cartao grade">
        <h2 style={{ margin: 0 }}>Ligado na plataforma</h2>
        <ul className="emp-equipe">
          {integracoes.map((i) => (
            <li key={i.nome}>
              <span>{i.ok ? '✅' : '⚪'} {i.nome}</span>
              <span className="dica" style={{ gridColumn: 'span 2' }}>{i.ok ? 'Configurado' : `Falta: ${i.como}`}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
