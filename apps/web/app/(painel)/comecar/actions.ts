'use server';
import { revalidatePath } from 'next/cache';
import { CARDAPIO_EXEMPLO, DESCRICAO_EXEMPLO, faltaParaAbrir, tipoRestauranteValido, type EstadoPrimeirosPassos } from '@res/core';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';

type R = { ok: true } | { ok: false; erro: string };
const fim = () => {
  revalidatePath('/comecar');
  revalidatePath('/', 'layout');
};

/** Cardápio de exemplo do tipo escolhido (só em loja sem produtos). */
export async function usarCardapioExemplo(tipo: string): Promise<R> {
  if (!tipoRestauranteValido(tipo)) return { ok: false, erro: 'Escolha o tipo de restaurante.' };
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('criar_cardapio_exemplo', { p_loja: ctx.lojaId, p: { descricao: DESCRICAO_EXEMPLO, categorias: CARDAPIO_EXEMPLO[tipo] } });
  if (error) return { ok: false, erro: error.message };
  await supabase.from('lojas').update({ tipo_restaurante: tipo }).eq('id', ctx.lojaId);
  fim();
  return { ok: true };
}

/** Abre o cardápio (passa a seguir os horários). Confere o mínimo antes. */
export async function abrirCardapio(): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data: e, error: e1 } = await supabase.rpc('primeiros_passos', { p_loja: ctx.lojaId, p_descricao_exemplo: DESCRICAO_EXEMPLO });
  if (e1) return { ok: false, erro: e1.message };
  const falta = faltaParaAbrir(e as EstadoPrimeirosPassos);
  if (falta.length) return { ok: false, erro: `Antes de abrir, falta ${falta.join(', ')}.` };
  const { data, error } = await supabase.from('marcas').update({ status_cardapio: 'auto' }).eq('loja_id', ctx.lojaId).eq('status_cardapio', 'fechado').eq('evento', false).select('id');
  if (error) return { ok: false, erro: error.message };
  if (!data?.length) return { ok: false, erro: 'Só o dono ou o gerente pode abrir o cardápio.' };
  fim();
  return { ok: true };
}

/** Tira "Primeiros passos" do menu (dá para voltar pelo endereço /comecar). */
export async function concluirPrimeirosPassos(): Promise<R> {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.from('lojas').update({ primeiros_passos_ocultos: true }).eq('id', ctx.lojaId).select('id');
  if (error) return { ok: false, erro: error.message };
  if (!data?.length) return { ok: false, erro: 'Só o dono pode concluir.' };
  fim();
  return { ok: true };
}
