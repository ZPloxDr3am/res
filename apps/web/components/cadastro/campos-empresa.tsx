'use client';
import { useEffect, useState } from 'react';
import { UFS, cepValido, cnpjValido, formatarCep, formatarCnpj, formatarCpf, formatarTelefone, soDigitos, type DadosReceita, type EnderecoEmpresa } from '@res/core';
import { consultarCep, consultarCnpj } from '@/app/cadastro/actions';

export type CamposEmpresaValor = {
  semCnpj: boolean;
  documento: string;
  razaoSocial: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  telefoneLoja: string;
  emailLoja: string;
  endereco: EnderecoEmpresa;
};

/** CNPJ (preenche pela Receita) ou CPF, razão social, telefones e endereço (CEP preenche) — cadastro e Lojas e equipe (D-077). */
export function CamposEmpresa({ v, onChange, onReceita, dicaCpf }: { v: CamposEmpresaValor; onChange: (f: (x: CamposEmpresaValor) => CamposEmpresaValor) => void; onReceita?: (r: DadosReceita) => void; dicaCpf?: string }) {
  const [receita, setReceita] = useState<{ situacao: string; ativa: boolean; atividade: string } | null | 'buscando' | 'nao'>(null);
  const [cepSit, setCepSit] = useState<'buscando' | 'nao' | null>(null);
  const muda = <K extends keyof CamposEmpresaValor>(k: K, val: CamposEmpresaValor[K]) => onChange((x) => ({ ...x, [k]: val }));
  const mudaEnd = (k: keyof EnderecoEmpresa, val: string) => onChange((x) => ({ ...x, endereco: { ...x.endereco, [k]: val } }));

  useEffect(() => {
    if (v.semCnpj || !cnpjValido(v.documento)) return;
    let vivo = true;
    setReceita('buscando');
    void consultarCnpj(v.documento).then((r) => {
      if (!vivo) return;
      if (!r) return setReceita('nao');
      setReceita({ situacao: r.situacao, ativa: r.ativa, atividade: r.atividade });
      onChange((x) => ({
        ...x,
        razaoSocial: x.razaoSocial || r.razao_social,
        nomeFantasia: x.nomeFantasia || r.nome_fantasia,
        telefoneLoja: x.telefoneLoja || r.telefone,
        emailLoja: x.emailLoja || r.email,
        endereco: x.endereco.cep ? x.endereco : { cep: r.cep, logradouro: r.logradouro, numero: r.numero, complemento: r.complemento, bairro: r.bairro, cidade: r.cidade, uf: r.uf, lat: null, lng: null },
      }));
      onReceita?.(r);
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.documento, v.semCnpj]);

  const buscarCep = (cep: string) => {
    setCepSit('buscando');
    void consultarCep(cep).then((e) => {
      if (!e) return setCepSit('nao');
      setCepSit(null);
      onChange((x) => ({ ...x, endereco: { ...x.endereco, ...e, logradouro: e.logradouro || x.endereco.logradouro, bairro: e.bairro || x.endereco.bairro, cep: formatarCep(cep) } }));
    });
  };

  return (
    <>
      <div className="qp-filtros" role="radiogroup" aria-label="Documento">
        <button type="button" role="radio" aria-checked={!v.semCnpj} className="qp-chip" onClick={() => onChange((x) => ({ ...x, semCnpj: false, documento: x.semCnpj ? '' : x.documento }))}>Tenho CNPJ</button>
        <button type="button" role="radio" aria-checked={v.semCnpj} className="qp-chip" onClick={() => { setReceita(null); onChange((x) => ({ ...x, semCnpj: true, documento: x.semCnpj ? x.documento : '' })); }}>Ainda não tenho CNPJ</button>
      </div>
      {v.semCnpj ? (
        <label>CPF do responsável<input value={v.documento} onChange={(e) => muda('documento', formatarCpf(e.target.value))} inputMode="numeric" placeholder="000.000.000-00" />
          {dicaCpf && <span className="dica">{dicaCpf}</span>}</label>
      ) : (
        <>
          <label>CNPJ<input value={v.documento} onChange={(e) => muda('documento', formatarCnpj(e.target.value))} inputMode="numeric" placeholder="00.000.000/0000-00" aria-describedby="cad-receita" />
            <span id="cad-receita" role="status" className={receita && typeof receita === 'object' && !receita.ativa ? 'erro' : 'dica'}>
              {receita === 'buscando' ? 'Buscando na Receita Federal…'
                : receita === 'nao' ? 'Não achamos os dados agora: preencha abaixo.'
                : receita ? `${receita.ativa ? '✅' : '⚠️'} Situação na Receita: ${receita.situacao}${receita.atividade ? ` · ${receita.atividade}` : ''}`
                : soDigitos(v.documento).length === 14 && !cnpjValido(v.documento) ? 'CNPJ inválido: confira os números.' : 'Preenchemos razão social e endereço pela Receita.'}
            </span>
          </label>
          <label>Razão social<input value={v.razaoSocial} onChange={(e) => muda('razaoSocial', e.target.value)} maxLength={160} /></label>
          <div className="cad-2">
            <label>Nome fantasia<input value={v.nomeFantasia} onChange={(e) => muda('nomeFantasia', e.target.value)} maxLength={120} /></label>
            <label>Inscrição estadual <span className="dica">(opcional)</span><input value={v.inscricaoEstadual} onChange={(e) => muda('inscricaoEstadual', e.target.value)} maxLength={20} placeholder="ou ISENTO" /></label>
          </div>
        </>
      )}
      <div className="cad-2">
        <label>Telefone da loja<input value={v.telefoneLoja} onChange={(e) => muda('telefoneLoja', formatarTelefone(e.target.value))} inputMode="tel" placeholder="(47) 3333-0000" />
          <span className="dica">Se for celular, vira o WhatsApp do cardápio.</span></label>
        <label>E-mail da loja <span className="dica">(opcional)</span><input type="email" value={v.emailLoja} onChange={(e) => muda('emailLoja', e.target.value)} autoCapitalize="none" spellCheck={false} /></label>
      </div>
      <div className="cad-cep">
        <label>CEP<input value={v.endereco.cep} onChange={(e) => { const c = formatarCep(e.target.value); mudaEnd('cep', c); if (cepValido(c)) buscarCep(c); }} inputMode="numeric" placeholder="00000-000" autoComplete="postal-code" />
          {cepSit && <span className="dica" role="status">{cepSit === 'buscando' ? 'Buscando…' : 'CEP não encontrado: preencha à mão.'}</span>}</label>
        <label>UF<select value={v.endereco.uf} onChange={(e) => mudaEnd('uf', e.target.value)}><option value="">—</option>{UFS.map((u) => <option key={u}>{u}</option>)}</select></label>
      </div>
      <label>Cidade<input value={v.endereco.cidade} onChange={(e) => mudaEnd('cidade', e.target.value)} maxLength={80} autoComplete="address-level2" /></label>
      <label>Rua / avenida<input value={v.endereco.logradouro} onChange={(e) => mudaEnd('logradouro', e.target.value)} maxLength={160} autoComplete="address-line1" /></label>
      <div className="cad-3">
        <label>Número<input value={v.endereco.numero} onChange={(e) => mudaEnd('numero', e.target.value)} maxLength={20} placeholder="ou s/n" /></label>
        <label>Complemento <span className="dica">(opcional)</span><input value={v.endereco.complemento} onChange={(e) => mudaEnd('complemento', e.target.value)} maxLength={80} autoComplete="address-line2" /></label>
      </div>
      <label>Bairro<input value={v.endereco.bairro} onChange={(e) => mudaEnd('bairro', e.target.value)} maxLength={80} /></label>
      <span className="dica">O endereço é o ponto de saída das entregas (taxa por km e rota do motoboy).</span>
    </>
  );
}
