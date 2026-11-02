import { contextoLoja } from '@/lib/loja';
import { carregarCardapio } from '@/lib/cardapio';
import { criarClienteServidor } from '@/lib/supabase/server';
import { PainelPromocoes, type CupomLinha, type FreteGratisLinha, type PromoCategoriaLinha, type PromoProdutoLinha, type UsoCupom } from '@/components/promocoes/painel-promocoes';
import { agendaDe, situacaoPromo } from '@/lib/cardapio-dados';

export const dynamic = 'force-dynamic';

const c = (v: unknown) => (v == null ? null : Math.round(Number(v) * 100));

export default async function Promocoes({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const { aba } = await searchParams;
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const [cardapio, cats, cupons, usos, loja, fretes, areas] = await Promise.all([
    carregarCardapio(ctx.lojaId, { semEvento: true }),
    supabase.from('promocoes_categoria').select('id, setor_id, percentual, dias, promo_inicio, promo_fim, promo_ate, ativo').eq('loja_id', ctx.lojaId).order('criado_em'),
    supabase.from('cupons').select('id, codigo, descricao, tipo, valor, pedido_minimo, primeira_compra, limite_por_cliente, limite_total, dias, valido_ate, ativo, bairros, km_max, produtos').eq('loja_id', ctx.lojaId).order('criado_em'),
    supabase
      .from('pedidos')
      .select('id, numero, cupom_id, cliente_nome, cliente_telefone, desconto, total, criado_em, status')
      .eq('loja_id', ctx.lojaId)
      .not('cupom_id', 'is', null)
      .order('criado_em', { ascending: false })
      .limit(1000),
    supabase.from('lojas').select('limite_desconto_pct').eq('id', ctx.lojaId).single(),
    supabase.from('frete_gratis').select('id, nome, marca_id, pedido_minimo, bairros, km_max, produtos, dias, valido_ate, ativo').eq('loja_id', ctx.lojaId).order('criado_em'),
    supabase.from('areas_entrega').select('bairro, marca_id').in('marca_id', ctx.marcas.map((m) => m.id)),
  ]);
  const bairros = [...new Set((areas.data ?? []).map((a) => (a.bairro as string).trim()))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const produtosLista = cardapio.produtos.filter((p) => !p.combo).map((p) => ({ id: p.id, nome: p.nome })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const produtosPromo: PromoProdutoLinha[] = cardapio.produtos.flatMap((p) => {
    const pm = p.produto_marcas.find((m) => m.preco_promocional != null);
    if (!pm) return [];
    return [{ id: p.id, nome: p.nome, de: c(pm.preco_delivery ?? p.preco), por: c(pm.preco_promocional)!, agenda: agendaDe(pm), situacao: situacaoPromo(pm) }];
  });

  const conta = ctx.lojas.find((l) => l.id === ctx.lojaId)?.contaId ?? null;
  const outrasLojas = ctx.lojas.filter((l) => l.id !== ctx.lojaId && conta && l.contaId === conta).map((l) => ({ id: l.id, nome: l.nome }));

  return (
    <PainelPromocoes
      aba={aba === 'categoria' || aba === 'cupons' || aba === 'balcao' || aba === 'frete' ? aba : 'produto'}
      bairros={bairros}
      produtosLista={produtosLista}
      marcas={ctx.marcas.filter((m) => !m.evento).map((m) => ({ id: m.id, nome: m.nome }))}
      fretes={(fretes.data ?? []).map((x) => ({
        id: x.id as string,
        nome: x.nome as string,
        marcaId: (x.marca_id as string | null) ?? null,
        pedidoMinimo: c(x.pedido_minimo)!,
        bairros: (x.bairros as string[] | null) ?? [],
        kmMax: x.km_max == null ? null : Number(x.km_max),
        produtos: (x.produtos as string[] | null) ?? [],
        dias: (x.dias as number[] | null) ?? [0, 1, 2, 3, 4, 5, 6],
        validoAte: (x.valido_ate as string | null) ?? null,
        ativo: x.ativo as boolean,
      })) satisfies FreteGratisLinha[]}
      lojaNome={ctx.lojaNome}
      setores={cardapio.setores.map((s) => ({ id: s.id, nome: s.nome }))}
      produtosPromo={produtosPromo}
      categorias={(cats.data ?? []).map((x) => ({
        id: x.id as string,
        setorId: x.setor_id as string,
        percentual: Number(x.percentual),
        dias: (x.dias as number[] | null) ?? [0, 1, 2, 3, 4, 5, 6],
        inicio: (x.promo_inicio as string | null)?.slice(0, 5) ?? null,
        fim: (x.promo_fim as string | null)?.slice(0, 5) ?? null,
        ate: (x.promo_ate as string | null) ?? null,
        ativo: x.ativo as boolean,
      })) satisfies PromoCategoriaLinha[]}
      cupons={(cupons.data ?? []).map((x) => ({
        id: x.id as string,
        codigo: x.codigo as string,
        descricao: (x.descricao as string | null) ?? '',
        tipo: x.tipo as CupomLinha['tipo'],
        valor: x.tipo === 'percentual' ? Number(x.valor) : c(x.valor)!,
        pedidoMinimo: c(x.pedido_minimo)!,
        primeiraCompra: x.primeira_compra as boolean,
        limitePorCliente: (x.limite_por_cliente as number | null) ?? null,
        limiteTotal: (x.limite_total as number | null) ?? null,
        dias: (x.dias as number[] | null) ?? [0, 1, 2, 3, 4, 5, 6],
        validoAte: (x.valido_ate as string | null) ?? null,
        ativo: x.ativo as boolean,
        bairros: (x.bairros as string[] | null) ?? [],
        kmMax: x.km_max == null ? null : Number(x.km_max),
        produtos: (x.produtos as string[] | null) ?? [],
      }))}
      usos={(usos.data ?? []).map((u) => ({
        id: u.id as string,
        numero: u.numero as number,
        cupomId: u.cupom_id as string,
        cliente: (u.cliente_nome as string) || '—',
        telefone: (u.cliente_telefone as string | null) ?? null,
        desconto: c(u.desconto)!,
        total: c(u.total)!,
        criadoEm: u.criado_em as string,
        cancelado: u.status === 'cancelado',
      })) satisfies UsoCupom[]}
      limiteDesconto={loja.data?.limite_desconto_pct == null ? null : Number(loja.data.limite_desconto_pct)}
      outrasLojas={outrasLojas}
    />
  );
}
