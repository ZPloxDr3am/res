'use server';
import { revalidatePath } from 'next/cache';
import { criarClienteServidor } from '@/lib/supabase/server';
import { contextoLoja } from '@/lib/loja';
import { cnpjValido, cpfValido, soDigitos, type Custo, type Empresa } from '@/lib/gestao';

type R<T = object> = ({ ok: true } & T) | { ok: false; erro: string };
const vazio = (t: string | null | undefined) => (t ?? '').trim() || null;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

async function lojaGestor() {
  const ctx = await contextoLoja();
  if (ctx.papel !== 'dono' && ctx.papel !== 'gerente') throw new Error('Só o dono ou o gerente acessam a Gestão Empresarial.');
  return ctx.lojaId;
}

/** Grava a planilha inteira de uma vez (linhas novas, alteradas e removidas). */
export async function salvarCustos(linhas: Custo[], removidos: string[], faturamentoBase: number | null): Promise<R> {
  const loja = await lojaGestor();
  for (const l of linhas) {
    if (!l.nome.trim()) return { ok: false, erro: 'Há um custo sem nome.' };
    if (!Number.isFinite(l.valor) || l.valor < 0) return { ok: false, erro: `Valor inválido em "${l.nome}".` };
    if (l.forma === 'percentual' && (l.tipo !== 'variavel' || l.valor > 100)) return { ok: false, erro: `"${l.nome}": percentual vai de 0 a 100 e só nos custos variáveis.` };
  }
  const supabase = await criarClienteServidor();
  if (removidos.length) {
    const { error } = await supabase.from('custos').delete().eq('loja_id', loja).in('id', removidos);
    if (error) return { ok: false, erro: error.message };
  }
  const dados = linhas.map((l, i) => ({
    ...(l.id ? { id: l.id } : {}),
    loja_id: loja,
    tipo: l.tipo,
    nome: l.nome.trim().slice(0, 80),
    forma: l.forma,
    valor: Math.round(l.valor * 100) / 100,
    observacao: vazio(l.observacao)?.slice(0, 200) ?? null,
    ordem: i + 1,
  }));
  const novos = dados.filter((d) => !('id' in d));
  const velhos = dados.filter((d) => 'id' in d);
  if (velhos.length) {
    const { error } = await supabase.from('custos').upsert(velhos);
    if (error) return { ok: false, erro: error.message };
  }
  if (novos.length) {
    const { error } = await supabase.from('custos').insert(novos);
    if (error) return { ok: false, erro: error.message };
  }
  const { error } = await supabase.from('gestao_empresa').update({ faturamento_base: faturamentoBase, atualizado_em: new Date().toISOString() }).eq('loja_id', loja);
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/gestao');
  return { ok: true };
}

export async function salvarEmpresa(e: Empresa): Promise<R> {
  const loja = await lojaGestor();
  const cnpj = soDigitos(e.cnpj);
  if (cnpj && !cnpjValido(cnpj)) return { ok: false, erro: 'Confira o CNPJ.' };
  const cep = soDigitos(e.cep);
  if (cep && cep.length !== 8) return { ok: false, erro: 'O CEP tem 8 números.' };
  const uf = (e.uf ?? '').trim().toUpperCase();
  if (uf && !/^[A-Z]{2}$/.test(uf)) return { ok: false, erro: 'UF com 2 letras (ex.: SC).' };
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from('gestao_empresa').upsert({
    loja_id: loja,
    razao_social: vazio(e.razao_social),
    cnpj: cnpj || null,
    endereco: vazio(e.endereco),
    cidade: vazio(e.cidade),
    uf: uf || null,
    cep: cep || null,
    responsavel: vazio(e.responsavel),
    cargo_responsavel: vazio(e.cargo_responsavel),
    atualizado_em: new Date().toISOString(),
  });
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/gestao');
  return { ok: true };
}

export type FuncionarioForm = {
  id?: string;
  nome: string;
  cpf: string;
  rg: string;
  ctps: string;
  pis: string;
  cargo: string;
  admissao: string;
  nascimento: string;
  telefone: string;
  endereco: string;
  ativo: boolean;
};

export async function salvarFuncionario(f: FuncionarioForm): Promise<R<{ id: string }>> {
  const loja = await lojaGestor();
  if (f.nome.trim().length < 2) return { ok: false, erro: 'Informe o nome completo.' };
  const cpf = soDigitos(f.cpf);
  if (cpf && !cpfValido(cpf)) return { ok: false, erro: 'Confira o CPF.' };
  for (const d of [f.admissao, f.nascimento]) if (d && !DATA.test(d)) return { ok: false, erro: 'Data inválida.' };
  const supabase = await criarClienteServidor();
  const linha = {
    loja_id: loja,
    nome: f.nome.trim().slice(0, 120),
    cpf: cpf || null,
    rg: vazio(f.rg),
    ctps: vazio(f.ctps),
    pis: vazio(f.pis),
    cargo: vazio(f.cargo),
    admissao: f.admissao || null,
    nascimento: f.nascimento || null,
    telefone: vazio(f.telefone),
    endereco: vazio(f.endereco),
    ativo: f.ativo,
  };
  const q = f.id ? supabase.from('funcionarios').update(linha).eq('id', f.id).eq('loja_id', loja).select('id').single() : supabase.from('funcionarios').insert(linha).select('id').single();
  const { data, error } = await q;
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/gestao');
  return { ok: true, id: data.id as string };
}

export type RegistroForm = {
  funcionarioId: string;
  tipo: 'falta' | 'advertencia';
  data: string;
  dataFim: string;
  justificada: boolean;
  motivo: string;
  descricao: string;
  testemunha1: string;
  testemunha2: string;
};

export async function salvarRegistro(r: RegistroForm): Promise<R<{ id: string }>> {
  const loja = await lojaGestor();
  if (!r.funcionarioId) return { ok: false, erro: 'Escolha o funcionário.' };
  if (!DATA.test(r.data)) return { ok: false, erro: 'Informe a data.' };
  if (r.dataFim && (!DATA.test(r.dataFim) || r.dataFim < r.data)) return { ok: false, erro: 'A data final vem depois da inicial.' };
  if (r.motivo.trim().length < 2) return { ok: false, erro: 'Informe o motivo.' };
  if (r.tipo === 'advertencia' && r.descricao.trim().length < 5) return { ok: false, erro: 'Descreva o que aconteceu (vai no documento).' };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from('funcionario_registros')
    .insert({
      loja_id: loja,
      funcionario_id: r.funcionarioId,
      tipo: r.tipo,
      data: r.data,
      data_fim: r.tipo === 'falta' && r.dataFim && r.dataFim !== r.data ? r.dataFim : null,
      justificada: r.tipo === 'falta' ? r.justificada : null,
      motivo: r.motivo.trim().slice(0, 120),
      descricao: vazio(r.descricao)?.slice(0, 2000) ?? null,
      testemunha1: vazio(r.testemunha1),
      testemunha2: vazio(r.testemunha2),
    })
    .select('id')
    .single();
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/gestao');
  return { ok: true, id: data.id as string };
}

export async function excluirRegistro(id: string): Promise<R> {
  const loja = await lojaGestor();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from('funcionario_registros').delete().eq('id', id).eq('loja_id', loja);
  if (error) return { ok: false, erro: error.message };
  revalidatePath('/gestao');
  return { ok: true };
}
