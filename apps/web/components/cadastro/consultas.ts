'use client';
import { cepValido, cnpjValido, dadosDaReceita, enderecoDoCep, soDigitos, type DadosReceita, type EnderecoEmpresa } from '@res/core';
import { consultarCep, consultarCnpj } from '@/app/cadastro/actions';

// A BrasilAPI recusa a consulta de CNPJ vinda do servidor (Vercel), mas responde ao navegador (CORS liberado).
// Por isso a busca é feita daqui e o servidor fica de reserva (D-077).
async function json(url: string, ms: number): Promise<Record<string, unknown> | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(ms) });
    if (!r.ok) return null;
    const j = (await r.json()) as Record<string, unknown>;
    return j && !j.erro ? j : null;
  } catch {
    return null;
  }
}

export async function buscarCnpj(cnpj: string): Promise<DadosReceita | null> {
  const d = soDigitos(cnpj);
  if (!cnpjValido(d)) return null;
  const j = await json(`https://brasilapi.com.br/api/cnpj/v1/${d}`, 8000);
  if (j && (j.razao_social || j.nome_fantasia)) return dadosDaReceita(j);
  return consultarCnpj(d).catch(() => null);
}

export async function buscarCep(cep: string): Promise<Omit<EnderecoEmpresa, 'numero' | 'complemento'> | null> {
  const d = soDigitos(cep);
  if (!cepValido(d)) return null;
  for (const url of [`https://brasilapi.com.br/api/cep/v2/${d}`, `https://viacep.com.br/ws/${d}/json/`]) {
    const j = await json(url, 6000);
    if (j) {
      const e = enderecoDoCep(j);
      if (e.cidade) return e;
    }
  }
  return consultarCep(d).catch(() => null);
}
