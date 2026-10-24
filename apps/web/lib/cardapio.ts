import { criarClienteServidor } from './supabase/server';
import type { Cardapio, GrupoRow, PassoRow, ProdutoRow, SetorRow } from './cardapio-dados';

export * from './cardapio-dados';


/** Cardápio inteiro da loja, já ordenado. A RLS garante que só vem o que é da loja do usuário. */
export async function carregarCardapio(lojaId: string): Promise<Cardapio> {
  const supabase = await criarClienteServidor();
  const [s, p, g, cp] = await Promise.all([
    supabase.from('setores').select('id, nome, nome_publico, delivery, presencial, upsell, ordem, setor_marcas(marca_id)').eq('loja_id', lojaId).order('ordem'),
    supabase
      .from('produtos')
      .select('id, nome, descricao, preco, setor_id, etiqueta, imagem_url, ordem, combo, produto_marcas(marca_id, ativo, delivery, presencial, totem, preco_delivery, preco_presencial, preco_promocional, promo_dias, promo_inicio, promo_fim, promo_ate), produto_grupos(grupo_id, ordem)')
      .eq('loja_id', lojaId)
      .order('ordem'),
    supabase
      .from('grupos_opcoes')
      .select('id, nome, formacao, obrigatorio, pizza, min_qtd, max_qtd, permite_repetir, ativo, delivery, presencial, opcoes(id, nome, preco, preco_delivery, preco_presencial, min_qtd, max_qtd, ativo, delivery, presencial, ordem, complementos(nome, preco), produtos(nome, preco))')
      .eq('loja_id', lojaId),
    supabase.from('combo_passos').select('id, combo_id, ordem, titulo, quantidade, setor_id, produtos').eq('loja_id', lojaId).order('ordem'),
  ]);
  for (const r of [s, p, g, cp]) if (r.error) throw new Error(r.error.message);

  const produtos = (p.data ?? []) as unknown as ProdutoRow[];
  for (const prod of produtos) prod.produto_grupos.sort((a, b) => a.ordem - b.ordem);
  const grupos: Record<string, GrupoRow> = {};
  for (const grupo of (g.data ?? []) as unknown as GrupoRow[]) {
    grupo.opcoes.sort((a, b) => a.ordem - b.ordem);
    grupos[grupo.id] = grupo;
  }
  const usos: Record<string, number> = {};
  for (const prod of produtos) for (const pg of prod.produto_grupos) usos[pg.grupo_id] = (usos[pg.grupo_id] ?? 0) + 1;

  const passos: Record<string, PassoRow[]> = {};
  for (const x of (cp.data ?? []) as unknown as PassoRow[]) (passos[x.combo_id] ??= []).push(x);

  return { setores: (s.data ?? []) as unknown as SetorRow[], produtos, grupos, usos, passos };
}
