'use server';
import { revalidatePath } from 'next/cache';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';

type R = { ok: true } | { ok: false; erro: string };
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function agenda(d: { dias: number[]; inicio: string | null; fim: string | null; ate: string | null }): { erro: string } | { dias: number[] | null; promo_inicio: string | null; promo_fim: string | null } {
  const dias = [...new Set(d.dias.filter((x) => Number.isInteger(x) && x >= 0 && x <= 6))].sort();
  if (dias.length === 0) return { erro: 'Escolha pelo menos um dia.' };
  if ((d.inicio && !HORA.test(d.inicio)) || (d.fim && !HORA.test(d.fim)) || (!!d.inicio !== !!d.fim)) return { erro: 'Horário inválido (use 18:00 e 23:59).' };
  if (d.inicio && d.inicio === d.fim) return { erro: 'O horário começa e termina na mesma hora.' };
  if (d.ate && !DATA.test(d.ate)) return { erro: 'Data final inválida.' };
  return { dias: dias.length === 7 ? null : dias, promo_inicio: d.inicio || null, promo_fim: d.fim || null };
}

const fim = (): R => {
  revalidatePath('/promocoes');
  revalidatePath('/cardapio');
  return { ok: true };
};

export type PromoCategoriaForm = { id: string | null; setorId: string; percentual: number; dias: number[]; inicio: string | null; fim: string | null; ate: string | null; ativo: boolean };

export async function salvarPromoCategoria(f: PromoCategoriaForm): Promise<R> {
  if (!f.setorId) return { ok: false, erro: 'Escolha a categoria.' };
  if (!(f.percentual > 0 && f.percentual <= 90)) return { ok: false, erro: 'O desconto vai de 1% a 90%.' };
  const a = agenda(f);
  if ('erro' in a) return { ok: false, erro: a.erro };
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const linha = { loja_id: ctx.lojaId, setor_id: f.setorId, percentual: f.percentual, ...a, promo_ate: f.ate || null, ativo: f.ativo };
  const { error } = f.id ? await supabase.from('promocoes_categoria').update(linha).eq('id', f.id) : await supabase.from('promocoes_categoria').insert(linha);
  return error ? { ok: false, erro: error.message } : fim();
}

export async function excluirPromoCategoria(id: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from('promocoes_categoria').delete().eq('id', id);
  return error ? { ok: false, erro: error.message } : fim();
}

export type CupomForm = {
  id: string | null;
  codigo: string;
  descricao: string;
  tipo: 'percentual' | 'valor' | 'frete';
  /** % (percentual) ou centavos (valor) */
  valor: number;
  pedidoMinimo: number; // centavos
  primeiraCompra: boolean;
  limitePorCliente: number | null;
  limiteTotal: number | null;
  dias: number[];
  validoAte: string | null;
  ativo: boolean;
};

/** Cria ou atualiza o cupom; na criação pode copiar para outras lojas do grupo. */
export async function salvarCupom(f: CupomForm, outrasLojas: string[] = []): Promise<R> {
  const codigo = f.codigo.trim().toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9_-]{3,30}$/.test(codigo)) return { ok: false, erro: 'Código com 3 a 30 letras/números, sem espaço (ex.: PRIMEIRA10).' };
  if (f.tipo === 'percentual' && !(f.valor > 0 && f.valor <= 100)) return { ok: false, erro: 'O % vai de 1 a 100.' };
  if (f.tipo === 'valor' && !(f.valor > 0)) return { ok: false, erro: 'Informe o valor do desconto.' };
  const dias = [...new Set(f.dias)].filter((x) => x >= 0 && x <= 6).sort();
  if (dias.length === 0) return { ok: false, erro: 'Escolha pelo menos um dia.' };
  if (f.validoAte && !DATA.test(f.validoAte)) return { ok: false, erro: 'Data de validade inválida.' };
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const linha = {
    codigo,
    descricao: f.descricao.trim() || null,
    tipo: f.tipo,
    valor: f.tipo === 'percentual' ? f.valor : f.tipo === 'valor' ? f.valor / 100 : 0,
    pedido_minimo: f.pedidoMinimo / 100,
    primeira_compra: f.primeiraCompra,
    limite_por_cliente: f.limitePorCliente,
    limite_total: f.limiteTotal,
    dias: dias.length === 7 ? null : dias,
    valido_ate: f.validoAte || null,
    ativo: f.ativo,
  };
  if (f.id) {
    const { error } = await supabase.from('cupons').update(linha).eq('id', f.id);
    if (error) return { ok: false, erro: error.code === '23505' ? `Já existe o cupom ${codigo} nesta loja.` : error.message };
    return fim();
  }
  const lojas = [ctx.lojaId, ...outrasLojas.filter((l) => l !== ctx.lojaId && ctx.lojas.some((x) => x.id === l))];
  const { error } = await supabase.from('cupons').insert(lojas.map((loja_id) => ({ ...linha, loja_id })));
  if (error) return { ok: false, erro: error.code === '23505' ? `Já existe o cupom ${codigo} em uma das lojas.` : error.message };
  return fim();
}

export async function alternarCupom(id: string, ativo: boolean): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from('cupons').update({ ativo }).eq('id', id);
  return error ? { ok: false, erro: error.message } : fim();
}

export async function excluirCupom(id: string): Promise<R> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from('cupons').delete().eq('id', id);
  return error ? { ok: false, erro: error.message } : fim();
}

/** Limite de desconto no balcão para quem não é dono/gerente (null = sem limite). */
export async function salvarLimiteDesconto(pct: number | null): Promise<R> {
  if (pct != null && !(pct >= 0 && pct <= 100)) return { ok: false, erro: 'O limite vai de 0% a 100%.' };
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from('lojas').update({ limite_desconto_pct: pct }).eq('id', ctx.lojaId).select('id');
  if (error) return { ok: false, erro: error.message };
  if (!data?.length) return { ok: false, erro: 'Só quem cuida dos dados da empresa pode mudar o limite.' };
  revalidatePath('/promocoes');
  return { ok: true };
}
