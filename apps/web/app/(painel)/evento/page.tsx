import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { contextoLoja } from '@/lib/loja';
import { carregarCardapio } from '@/lib/cardapio';
import { criarClienteServidor } from '@/lib/supabase/server';
import { PainelEvento, type EventoInfo, type ProdutoEvento, type ProdutoPrincipal } from '@/components/evento/evento';

export const dynamic = 'force-dynamic';

/** Cardápio de Evento / Aniversário (D-055). */
export default async function Evento() {
  const ctx = await contextoLoja();
  if (ctx.papel !== 'dono' && ctx.papel !== 'gerente') {
    return (
      <div className="grade">
        <h1>Evento / Aniversário</h1>
        <p className="cartao dica">Só o dono ou o gerente montam o cardápio de evento.</p>
      </div>
    );
  }
  const supabase = await criarClienteServidor();
  const [{ data: marcas, error }, cardapio] = await Promise.all([
    supabase.from('marcas').select('id, nome, slug, ativa, evento, evento_inicio, evento_fim, evento_base, mensagem_cardapio, prevenda, prevenda_entrega, prevenda_texto, aceita_entrega, aceita_retirada').eq('loja_id', ctx.lojaId).order('ordem'),
    carregarCardapio(ctx.lojaId),
  ]);
  const h = await headers();
  const origem = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
  const ev = (marcas ?? []).find((m) => m.evento);
  const bases = (marcas ?? []).filter((m) => !m.evento).map((m) => ({ id: m.id as string, nome: m.nome as string, slug: m.slug as string }));

  let evento: EventoInfo | null = null;
  if (ev) {
    const link = `${origem}/c/${ev.slug}`;
    evento = {
      id: ev.id as string,
      nome: ev.nome as string,
      slug: ev.slug as string,
      link,
      qr: await QRCode.toString(link, { type: 'svg', margin: 1, width: 160, errorCorrectionLevel: 'M' }),
      ativa: ev.ativa as boolean,
      inicio: (ev.evento_inicio as string | null) ?? null,
      fim: (ev.evento_fim as string | null) ?? null,
      mensagem: (ev.mensagem_cardapio as string | null) ?? '',
      base: (ev.evento_base as string | null) ?? null,
      prevenda: (ev.prevenda as boolean) ?? false,
      entrega: (ev.prevenda_entrega as string | null) ?? null,
      texto: (ev.prevenda_texto as string | null) ?? '',
      aceitaEntrega: ev.aceita_entrega as boolean,
      aceitaRetirada: ev.aceita_retirada as boolean,
      pix: await (async () => {
        const [{ data: mp }, { data: pix }] = await Promise.all([
          supabase.rpc('mp_status', { p_loja: ctx.lojaId }),
          supabase.from('integracoes').select('ativo').eq('loja_id', ctx.lojaId).eq('tipo', 'pix').maybeSingle(),
        ]);
        return (mp as { conectado?: boolean } | null)?.conectado ? 'mercado_pago' : pix?.ativo ? 'manual' : 'nenhum';
      })(),
    };
  }

  const setorNome = new Map(cardapio.setores.map((s) => [s.id, s.nome_publico || s.nome]));
  const doEvento = ev ? cardapio.produtos.filter((p) => p.produto_marcas.some((m) => m.marca_id === ev.id)) : [];
  const produtosEvento: ProdutoEvento[] = doEvento.map((p) => {
    const pm = p.produto_marcas.find((m) => m.marca_id === ev!.id)!;
    return {
      id: p.id,
      nome: p.nome,
      descricao: p.descricao ?? '',
      preco: Number(p.preco ?? 0),
      imagem: p.imagem_url,
      ativo: pm.ativo,
      categoria: (p.setor_id && setorNome.get(p.setor_id)) || 'Evento',
      grupos: p.produto_grupos
        .map((pg) => cardapio.grupos[pg.grupo_id])
        .filter(Boolean)
        .map((g) => ({
          id: g.id,
          nome: g.nome,
          min: g.min_qtd,
          max: g.max_qtd,
          obrigatorio: g.obrigatorio,
          permite_repetir: g.permite_repetir,
          pizza: g.pizza,
          opcoes: g.opcoes.map((o) => ({ id: o.id, nome: o.nome ?? o.complementos?.nome ?? o.produtos?.nome ?? '—', preco: Number(o.preco ?? 0), ativo: o.ativo })),
        })),
    };
  });

  // cardápio principal para escolher o que vai para o evento (o base, ou todos os que não são do evento)
  const eventoIds = new Set((marcas ?? []).filter((m) => m.evento).map((m) => m.id as string));
  const baseId = evento?.base ?? bases[0]?.id ?? null;
  const { data: copias } = doEvento.length ? await supabase.from('produtos').select('copia_de').in('id', doEvento.map((p) => p.id)) : { data: [] as { copia_de: string | null }[] };
  const jaCopiados = new Set((copias ?? []).map((c) => c.copia_de as string | null).filter(Boolean));
  const principais: ProdutoPrincipal[] = cardapio.produtos
    .filter((p) => !p.combo && p.produto_marcas.some((m) => !eventoIds.has(m.marca_id)) && !p.produto_marcas.every((m) => eventoIds.has(m.marca_id)))
    .filter((p) => !baseId || p.produto_marcas.some((m) => m.marca_id === baseId))
    .map((p) => ({
      id: p.id,
      nome: p.nome,
      categoria: (p.setor_id && setorNome.get(p.setor_id)) || 'Sem categoria',
      preco: Number(p.produto_marcas.find((m) => m.marca_id === baseId)?.preco_delivery ?? p.preco ?? 0),
      imagem: p.imagem_url,
      grupos: p.produto_grupos.length,
      noEvento: jaCopiados.has(p.id),
    }));

  return (
    <PainelEvento
      lojaNome={ctx.lojaNome}
      evento={evento}
      bases={bases}
      produtos={produtosEvento}
      principais={principais}
      origem={origem}
      erro={error?.message.includes('evento') ? 'A atualização do banco desta tela ainda não foi aplicada (migração 0056).' : error?.message ?? null}
    />
  );
}
