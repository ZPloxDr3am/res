'use client';
import { useState, useTransition } from 'react';
import { salvarEmpresa } from '@/app/(painel)/gestao/actions';
import { salvando } from '@/components/tempo-real';
import { cnpjValido, formatarCep, formatarCnpj, soDigitos, type Empresa } from '@/lib/gestao';

/** Dados do empregador que saem nos documentos (falta e advertência). */
export function DadosEmpresa({ inicial, lojaNome }: { inicial: Empresa | null; lojaNome: string }) {
  const [e, setE] = useState<Empresa>({
    razao_social: inicial?.razao_social ?? '',
    cnpj: formatarCnpj(inicial?.cnpj ?? ''),
    endereco: inicial?.endereco ?? '',
    cidade: inicial?.cidade ?? '',
    uf: inicial?.uf ?? '',
    cep: formatarCep(inicial?.cep ?? ''),
    responsavel: inicial?.responsavel ?? '',
    cargo_responsavel: inicial?.cargo_responsavel ?? 'Proprietário',
    faturamento_base: inicial?.faturamento_base ?? null,
  });
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);
  const [pendente, iniciar] = useTransition();
  const campo = (k: keyof Empresa, v: string) => {
    setE((x) => ({ ...x, [k]: v }));
    setMsg(null);
  };
  const cnpjRuim = soDigitos(e.cnpj).length > 0 && !cnpjValido(e.cnpj ?? '');

  return (
    <form
      className="cartao grade"
      onSubmit={(ev) => {
        ev.preventDefault();
        iniciar(async () => {
          const r = await salvando(salvarEmpresa(e));
          setMsg(r.ok ? { tipo: 'ok', texto: 'Dados salvos.' } : { tipo: 'erro', texto: r.erro });
        });
      }}
    >
      <div>
        <h2 style={{ margin: 0 }}>Dados da empresa · {lojaNome}</h2>
        <p className="dica" style={{ margin: 0 }}>Saem no topo dos termos de falta e das advertências, como empregador.</p>
      </div>
      <div className="gc-campos">
        <label className="gc-largo">Razão social<input value={e.razao_social ?? ''} maxLength={150} placeholder="Ex.: Pizzaria Exemplo Ltda" onChange={(x) => campo('razao_social', x.target.value)} /></label>
        <label>
          CNPJ
          <input inputMode="numeric" value={e.cnpj ?? ''} placeholder="00.000.000/0000-00" onChange={(x) => campo('cnpj', x.target.value)} onBlur={(x) => campo('cnpj', formatarCnpj(x.target.value))} aria-invalid={cnpjRuim || undefined} />
          {cnpjRuim && <span className="erro">CNPJ inválido</span>}
        </label>
        <label className="gc-largo">Endereço (rua, número, bairro)<input value={e.endereco ?? ''} maxLength={200} onChange={(x) => campo('endereco', x.target.value)} /></label>
        <label>Cidade<input value={e.cidade ?? ''} maxLength={80} onChange={(x) => campo('cidade', x.target.value)} /></label>
        <label>UF<input value={e.uf ?? ''} maxLength={2} style={{ width: '4rem', textTransform: 'uppercase' }} onChange={(x) => campo('uf', x.target.value.toUpperCase())} /></label>
        <label>CEP<input inputMode="numeric" value={e.cep ?? ''} maxLength={9} onChange={(x) => campo('cep', x.target.value)} onBlur={(x) => campo('cep', formatarCep(x.target.value))} /></label>
        <label>Responsável que assina<input value={e.responsavel ?? ''} maxLength={120} onChange={(x) => campo('responsavel', x.target.value)} /></label>
        <label>Cargo do responsável<input value={e.cargo_responsavel ?? ''} maxLength={60} onChange={(x) => campo('cargo_responsavel', x.target.value)} /></label>
      </div>
      <div className="linha">
        <button type="submit" className="botao-primario" disabled={pendente || cnpjRuim}>{pendente ? 'Salvando…' : 'Salvar'}</button>
        {msg && <span className={msg.tipo === 'erro' ? 'erro' : 'dica'} role="status">{msg.texto}</span>}
      </div>
    </form>
  );
}
