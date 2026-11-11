import { carregarCardapio } from './cardapio';
import { criarClienteServidor } from './supabase/server';
import type { GrupoRow, PassoRow, ProdutoRow, SetorRow } from './cardapio-dados';

export type DadosNovoPedido = {
  marcas: { id: string; nome: string }[];
  /** Bairros atendidos por marca (taxa em centavos). */
  areas: Record<string, { bairro: string; taxa: number }[]>;
  setores: SetorRow[];
  produtos: ProdutoRow[];
  grupos: Record<string, GrupoRow>;
  /** combo → passos (D-022) */
  passos: Record<string, PassoRow[]>;
  /** desconto no balcão (D-023): limite da loja para quem não é dono/gerente */
  regrasDesconto: { limitePct: number | null; gestor: boolean };
};

/** Tudo o que a tela de novo pedido precisa da loja: cardápio, marcas e bairros com taxa. */
export async function carregarDadosNovoPedido(lojaId: string, marcas: { id: string; nome: string }[], papel = ''): Promise<DadosNovoPedido> {
  const supabase = await criarClienteServidor();
  const [{ setores, produtos, grupos, passos }, lojaRes, areasRes] = await Promise.all([
    carregarCardapio(lojaId),
    supabase.from('lojas').select('limite_desconto_pct').eq('id', lojaId).single(),
    supabase.from('areas_entrega').select('marca_id, bairro, taxa').eq('loja_id', lojaId).eq('ativo', true).order('bairro'),
  ]);
  const areas: DadosNovoPedido['areas'] = {};
  for (const a of areasRes.data ?? []) (areas[a.marca_id as string] ??= []).push({ bairro: a.bairro as string, taxa: Math.round(Number(a.taxa) * 100) });
  return { marcas: marcas.map((m) => ({ id: m.id, nome: m.nome })), areas, setores, produtos, grupos, passos,
    regrasDesconto: {
      limitePct: lojaRes.data?.limite_desconto_pct == null ? null : Number(lojaRes.data.limite_desconto_pct),
      gestor: papel === 'dono' || papel === 'gerente',
    },
  };
}
