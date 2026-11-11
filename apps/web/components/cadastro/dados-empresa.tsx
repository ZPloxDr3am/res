'use client';
import { useState, useTransition } from 'react';
import { salvarDadosEmpresa } from '@/app/(painel)/lojas/actions';
import { salvando } from '@/components/tempo-real';
import { CamposEmpresa, type CamposEmpresaValor } from '@/components/cadastro/campos-empresa';

/** Lojas e equipe → Dados da empresa (D-077). */
export function DadosEmpresa({ lojas, inicial }: { lojas: { id: string; nome: string; valor: CamposEmpresaValor; pode: boolean }[]; inicial: string }) {
  const [lojaId, setLojaId] = useState(inicial);
  const loja = lojas.find((l) => l.id === lojaId) ?? lojas[0]!;
  return (
    <div className="grade" style={{ gap: '0.8rem', maxWidth: 640 }}>
      {lojas.length > 1 && (
        <label>Loja<select value={loja.id} onChange={(e) => setLojaId(e.target.value)}>{lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></label>
      )}
      <FormEmpresa key={loja.id} lojaId={loja.id} inicial={loja.valor} pode={loja.pode} />
    </div>
  );
}

function FormEmpresa({ lojaId, inicial, pode }: { lojaId: string; inicial: CamposEmpresaValor; pode: boolean }) {
  const [v, setV] = useState(inicial);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <form
      className="cartao grade cad-form"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await salvando(salvarDadosEmpresa(lojaId, v));
          setMsg(r.ok ? { ok: true, t: 'Dados da empresa salvos.' } : { ok: false, t: r.erro });
        });
      }}
    >
      <fieldset className="grade" disabled={!pode}>
        <legend>Dados da empresa</legend>
        <CamposEmpresa v={v} onChange={(f) => setV(f)} />
      </fieldset>
      {!pode && <p className="dica" style={{ margin: 0 }}>Só quem tem a permissão “dados da empresa” altera estes dados.</p>}
      {msg && <p className={msg.ok ? 'dica' : 'erro'} role="status" style={{ margin: 0 }}>{msg.t}</p>}
      {pode && <button className="botao-primario" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar'}</button>}
    </form>
  );
}
