'use server';
import { revalidatePath } from 'next/cache';
import { criarClienteServidor } from '@/lib/supabase/server';
import { contextoLoja } from '@/lib/loja';
import type { ContaFin, Fornecedor, Taxa, TipoLanc } from '@/lib/financeiro';

type R<T = object> = ({ ok: true } & T) | { ok: false; erro: string };
const msg = (m: string) =>
  /row-level security|permission denied/.test(m) ? 'Só o dono ou o gerente mexem no Financeiro.' : /fin_fornecedores_doc/.test(m) ? 'Já existe um fornecedor com esse CPF/CNPJ.' : /fin_categorias_loja_id_tipo_nome/.test(m) ? 'Já existe uma categoria com esse nome.' : m;
const refrescar = () => revalidatePath('/financeiro');

export interface NovoLancamento {
  tipo: TipoLanc;
  descricao: string;
  valor: number;
  vencimento: string;
  competencia: string;
  categoria: string;
  fornecedor: string;
  conta: string;
  forma: string;
  pago: boolean;
  modo: 'unico' | 'parcelado' | 'recorrente';
  vezes: number;
  observacao: string;
}

export async function criarLancamento(d: NovoLancamento): Promise<R<{ id: string }>> {
  if (!d.descricao.trim()) return { ok: false, erro: 'Escreva uma descrição.' };
  if (!Number.isFinite(d.valor) || d.valor <= 0) return { ok: false, erro: 'Informe o valor.' };
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('criar_lancamento', { p_loja: ctx.lojaId, p_dados: d });
  if (error) return { ok: false, erro: msg(error.message) };
  refrescar();
  return { ok: true, id: data as string };
}

export async function editarLancamento(
  id: string,
  d: { descricao: string; valor: number; vencimento: string; competencia: string; categoria: string; fornecedor: string; conta: string; forma: string; observacao: string },
): Promise<R> {
  if (!d.descricao.trim()) return { ok: false, erro: 'Escreva uma descrição.' };
  if (!Number.isFinite(d.valor) || d.valor <= 0) return { ok: false, erro: 'Informe o valor.' };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from('fin_lancamentos')
    .update({
      descricao: d.descricao.trim(),
      valor: Math.round(d.valor * 100) / 100,
      vencimento: d.vencimento,
      competencia: d.competencia || d.vencimento,
      categoria_id: d.categoria || null,
      fornecedor_id: d.fornecedor || null,
      conta_id: d.conta || null,
      forma: d.forma || null,
      observacao: d.observacao.trim() || null,
    })
    .eq('id', id)
    .select('id');
  if (error) return { ok: false, erro: msg(error.message) };
  if (!data?.length) return { ok: false, erro: 'Lançamento não encontrado.' };
  refrescar();
  return { ok: true };
}

/** Marca como pago (na data informada, ou hoje) ou desfaz. */
export async function marcarPago(id: string, pagoEm: string | null): Promise<R> {
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from('fin_lancamentos').update({ pago_em: pagoEm }).eq('id', id).select('id');
  if (error) return { ok: false, erro: msg(error.message) };
  if (!data?.length) return { ok: false, erro: 'Lançamento não encontrado.' };
  refrescar();
  return { ok: true };
}

/** Exclui um lançamento; com `futuros`, também as próximas parcelas/meses ainda não pagos da mesma série. */
export async function excluirLancamento(id: string, futuros: boolean): Promise<R> {
  const supabase = await criarClienteServidor();
  const { data: l } = await supabase.from('fin_lancamentos').select('serie, vencimento').eq('id', id).maybeSingle();
  if (!l) return { ok: false, erro: 'Lançamento não encontrado.' };
  const q = futuros && l.serie
    ? supabase.from('fin_lancamentos').delete().eq('serie', l.serie).gte('vencimento', l.vencimento).is('pago_em', null)
    : supabase.from('fin_lancamentos').delete().eq('id', id);
  const { error } = await q;
  if (error) return { ok: false, erro: msg(error.message) };
  if (futuros && l.serie) await supabase.from('fin_lancamentos').delete().eq('id', id);
  refrescar();
  return { ok: true };
}

/** Traz os custos fixos da planilha como contas a pagar, mês a mês (não duplica; atualiza valores não pagos). */
export async function gerarContasCustos(mes: string, dia: number, meses: number): Promise<R<{ n: number }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('gerar_contas_custos', { p_loja: ctx.lojaId, p_mes: `${mes}-01`, p_dia: dia, p_meses: meses });
  if (error) return { ok: false, erro: msg(error.message) };
  refrescar();
  return { ok: true, n: Number(data ?? 0) };
}

/** Custos fixos automáticos todo mês (e o dia de vencimento). */
export async function configCustos(auto: boolean, dia: number): Promise<R<{ n: number }>> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('config_custos_financeiro', { p_loja: ctx.lojaId, p_auto: auto, p_dia: dia });
  if (error) return { ok: false, erro: msg(error.message) };
  refrescar();
  return { ok: true, n: Number(data ?? 0) };
}

export async function lancarNfe(nfe: string, vencimento: string, vezes: number, pago: boolean): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('lancar_nfe', { p_loja: ctx.lojaId, p_nfe: nfe, p_vencimento: vencimento, p_vezes: vezes, p_pago: pago });
  if (error) return { ok: false, erro: msg(error.message) };
  refrescar();
  return { ok: true };
}

export async function salvarTaxas(taxas: Taxa[]): Promise<R> {
  const ctx = await contextoLoja();
  for (const t of taxas) {
    if (!(t.percentual >= 0 && t.percentual <= 50) || !(t.fixa >= 0 && t.fixa <= 100) || !(t.dias >= 0 && t.dias <= 60)) return { ok: false, erro: 'Confira as taxas (até 50%, R$ 100 fixos e 60 dias).' };
  }
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from('fin_taxas').upsert(taxas.map((t) => ({ loja_id: ctx.lojaId, forma: t.forma, percentual: t.percentual, fixa: t.fixa, dias: Math.round(t.dias) })));
  if (error) return { ok: false, erro: msg(error.message) };
  refrescar();
  return { ok: true };
}

export async function salvarCategoria(d: { id?: string; tipo: TipoLanc; linha: string; grupo: string; nome: string; ativo: boolean }): Promise<R> {
  if (!d.nome.trim() || !d.grupo.trim()) return { ok: false, erro: 'Preencha o nome e o grupo.' };
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const linha = { tipo: d.tipo, linha: d.linha, grupo: d.grupo.trim(), nome: d.nome.trim(), ativo: d.ativo };
  const { error } = d.id
    ? await supabase.from('fin_categorias').update(linha).eq('id', d.id)
    : await supabase.from('fin_categorias').insert({ ...linha, loja_id: ctx.lojaId, ordem: 999 });
  if (error) return { ok: false, erro: msg(error.message) };
  refrescar();
  return { ok: true };
}

export async function salvarFornecedor(d: Omit<Fornecedor, 'id'> & { id?: string }): Promise<R<{ id: string }>> {
  if (!d.nome.trim()) return { ok: false, erro: 'Informe o nome do fornecedor.' };
  const doc = (d.documento ?? '').replace(/\D/g, '');
  if (doc && doc.length !== 11 && doc.length !== 14) return { ok: false, erro: 'CPF tem 11 números e CNPJ tem 14.' };
  const tel = (d.telefone ?? '').replace(/\D/g, '');
  if (tel && (tel.length < 10 || tel.length > 13)) return { ok: false, erro: 'Confira o telefone (com DDD).' };
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const linha = { nome: d.nome.trim(), documento: doc || null, telefone: tel || null, observacao: d.observacao?.trim() || null, ativo: d.ativo };
  const r = d.id
    ? await supabase.from('fin_fornecedores').update(linha).eq('id', d.id).select('id').single()
    : await supabase.from('fin_fornecedores').insert({ ...linha, loja_id: ctx.lojaId }).select('id').single();
  if (r.error) return { ok: false, erro: msg(r.error.message) };
  refrescar();
  return { ok: true, id: r.data.id as string };
}

export async function salvarContaFin(d: Omit<ContaFin, 'id'> & { id?: string }): Promise<R> {
  if (!d.nome.trim()) return { ok: false, erro: 'Dê um nome para a conta.' };
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const linha = { nome: d.nome.trim(), tipo: d.tipo, ativo: d.ativo };
  const { error } = d.id ? await supabase.from('fin_contas').update(linha).eq('id', d.id) : await supabase.from('fin_contas').insert({ ...linha, loja_id: ctx.lojaId });
  if (error) return { ok: false, erro: msg(error.message) };
  refrescar();
  return { ok: true };
}
