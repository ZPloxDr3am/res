import { promoVale } from '@res/core';
import { criarClienteServidor } from './supabase/server';
import type { Cardapio, GrupoRow, PassoRow, ProdutoRow, SetorRow } from './cardapio-dados';

export * from './cardapio-dados';


/** Cardápio inteiro da loja, já ordenado. A RLS garante que só vem o que é da loja do usuário. */
export async function carregarCardapio(lojaId: string, opcoes: { semEvento?: boolean } = {}): Promise<Cardapio> {
  const supabase = await criarClienteServidor();
  const [s, p, g, cp, pc, ev] = await Promise.all([
    supabase.from('setores').select('id, nome, nome_publico, delivery, presencial, upsell, ordem, setor_marcas(marca_id)').eq('loja_id', lojaId).order('ordem'),
    supabase
      .from('produtos')
      .select('id, nome, descricao, preco, setor_id, etiqueta, imagem_url, ordem, combo, produto_marcas(marca_id, ativo, delivery, presencial, totem, preco_delivery, preco_presencial, preco_promocional, promo_dias, promo_inicio, promo_fim, promo_ate), produto_grupos(grupo_id, ordem)')
      .eq('loja_id', lojaId)
      .order('ordem'),
    supabase
      .from('grupos_opcoes')
      .select('id, nome, formacao, obrigatorio, pizza, min_qtd, max_qtd, permite_repetir, ativo, delivery, presencial, opcoes(id, nome, preco, preco_delivery, preco_presencial, min_qtd, max_qtd, ativo, delivery, presencial, ordem, imagem_url, descricao, selo, complementos(nome, preco), produtos(nome, preco, imagem_url))')
      .eq('loja_id', lojaId),
    supabase.from('combo_passos').select('id, combo_id, ordem, titulo, quantidade, setor_id, produtos').eq('loja_id', lojaId).order('ordem'),
    supabase.from('promocoes_categoria').select('setor_id, percentual, dias, promo_inicio, promo_fim, promo_ate').eq('loja_id', lojaId).eq('ativo', true),
    opcoes.semEvento ? supabase.from('marcas').select('id').eq('loja_id', lojaId).eq('evento', true) : Promise.resolve({ data: [] as { id: string }[], error: null }),
  ]);
  for (const r of [s, p, g, cp, pc]) if (r.error) throw new Error(r.error.message);

  let produtos = (p.data ?? []) as unknown as ProdutoRow[];
  let setores = (s.data ?? []) as unknown as SetorRow[];
  // cardápio de evento (D-055): as cópias dele ficam fora do editor principal
  const eventos = new Set((ev.data ?? []).map((x) => x.id as string));
  if (eventos.size) {
    const soEvento = (ms: { marca_id: string }[]) => ms.length > 0 && ms.every((m) => eventos.has(m.marca_id));
    setores = setores.filter((x) => !soEvento(x.setor_marcas)).map((x) => ({ ...x, setor_marcas: x.setor_marcas.filter((m) => !eventos.has(m.marca_id)) }));
    produtos = produtos.filter((x) => !soEvento(x.produto_marcas)).map((x) => ({ ...x, produto_marcas: x.produto_marcas.filter((m) => !eventos.has(m.marca_id)) }));
  }
  // % da categoria valendo agora (D-023): o maior por categoria
  const agora = new Date();
  const pct = new Map<string, number>();
  for (const x of pc.data ?? []) {
    if (!promoVale({ dias: x.dias as number[] | null, inicio: x.promo_inicio as string | null, fim: x.promo_fim as string | null, ate: x.promo_ate as string | null }, agora)) continue;
    pct.set(x.setor_id as string, Math.max(pct.get(x.setor_id as string) ?? 0, Number(x.percentual)));
  }
  for (const prod of produtos) {
    prod.produto_grupos.sort((a, b) => a.ordem - b.ordem);
    prod.desconto_pct = prod.setor_id ? pct.get(prod.setor_id) ?? null : null;
  }
  const grupos: Record<string, GrupoRow> = {};
  const usados = new Set(produtos.flatMap((x) => x.produto_grupos.map((y) => y.grupo_id)));
  const todosUsados = new Set(((p.data ?? []) as unknown as ProdutoRow[]).flatMap((x) => x.produto_grupos.map((y) => y.grupo_id)));
  for (const grupo of (g.data ?? []) as unknown as GrupoRow[]) {
    if (eventos.size && todosUsados.has(grupo.id) && !usados.has(grupo.id)) continue; // grupo só das cópias do evento
    grupo.opcoes.sort((a, b) => a.ordem - b.ordem);
    grupos[grupo.id] = grupo;
  }
  const usos: Record<string, number> = {};
  for (const prod of produtos) for (const pg of prod.produto_grupos) usos[pg.grupo_id] = (usos[pg.grupo_id] ?? 0) + 1;

  const passos: Record<string, PassoRow[]> = {};
  for (const x of (cp.data ?? []) as unknown as PassoRow[]) (passos[x.combo_id] ??= []).push(x);

  return { setores, produtos, grupos, usos, passos };
}
