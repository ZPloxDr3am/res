import { carregarCardapio } from './cardapio';
import { criarClienteServidor } from './supabase/server';
import type { GrupoRow, ProdutoRow, SetorRow } from './cardapio-dados';

export type DadosNovoPedido = {
  marcas: { id: string; nome: string }[];
  /** Bairros atendidos por marca (taxa em centavos). */
  areas: Record<string, { bairro: string; taxa: number }[]>;
  setores: SetorRow[];
  produtos: ProdutoRow[];
  grupos: Record<string, GrupoRow>;
};

/** Tudo o que a tela de novo pedido precisa da loja: cardápio, marcas e bairros com taxa. */
export async function carregarDadosNovoPedido(lojaId: string, marcas: { id: string; nome: string }[]): Promise<DadosNovoPedido> {
  const supabase = await criarClienteServidor();
  const [{ setores, produtos, grupos }, areasRes] = await Promise.all([
    carregarCardapio(lojaId),
    supabase.from('areas_entrega').select('marca_id, bairro, taxa').eq('loja_id', lojaId).eq('ativo', true).order('bairro'),
  ]);
  const areas: DadosNovoPedido['areas'] = {};
  for (const a of areasRes.data ?? []) (areas[a.marca_id as string] ??= []).push({ bairro: a.bairro as string, taxa: Math.round(Number(a.taxa) * 100) });
  return { marcas: marcas.map((m) => ({ id: m.id, nome: m.nome })), areas, setores, produtos, grupos };
}
