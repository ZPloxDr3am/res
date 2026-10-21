import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { FormDelivery } from '@/components/form-delivery';

export const dynamic = 'force-dynamic';

export default async function Delivery() {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const [marcas, horarios, areas, aberta] = await Promise.all([
    supabase
      .from('marcas')
      .select('id, nome, slug, status_cardapio, pedido_minimo, aceita_entrega, aceita_retirada, formas_pagamento, mensagem_cardapio')
      .eq('loja_id', ctx.lojaId)
      .order('ordem'),
    supabase.from('marca_horarios').select('marca_id, dia_semana, abre, fecha').eq('loja_id', ctx.lojaId).order('dia_semana').order('abre'),
    supabase.from('areas_entrega').select('marca_id, bairro, taxa, ativo').eq('loja_id', ctx.lojaId).order('bairro'),
    Promise.all(ctx.marcas.map(async (m) => [m.slug, await supabase.rpc('cardapio_publico', { p_slug: m.slug })] as const)),
  ]);
  if (marcas.error) throw new Error(marcas.error.message);

  const h = await headers();
  const origem = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
  const abertaPorSlug = new Map(aberta.map(([slug, r]) => [slug, Boolean((r.data as { marca?: { aberta?: boolean } } | null)?.marca?.aberta)]));

  const lista = await Promise.all(
    (marcas.data ?? []).map(async (m) => {
      const link = `${origem}/c/${m.slug}`;
      return {
        id: m.id as string,
        nome: m.nome as string,
        link,
        qr: await QRCode.toString(link, { type: 'svg', margin: 1, width: 180, errorCorrectionLevel: 'M' }),
        abertaAgora: abertaPorSlug.get(m.slug as string) ?? false,
        config: {
          status: m.status_cardapio as 'auto' | 'aberto' | 'fechado',
          pedidoMinimo: Math.round(Number(m.pedido_minimo) * 100),
          aceitaEntrega: m.aceita_entrega as boolean,
          aceitaRetirada: m.aceita_retirada as boolean,
          formasPagamento: m.formas_pagamento as never,
          mensagem: (m.mensagem_cardapio as string | null) ?? '',
          horarios: (horarios.data ?? [])
            .filter((x) => x.marca_id === m.id)
            .map((x) => ({ dia: x.dia_semana as number, abre: String(x.abre).slice(0, 5), fecha: String(x.fecha).slice(0, 5) })),
          areas: (areas.data ?? [])
            .filter((x) => x.marca_id === m.id)
            .map((x) => ({ bairro: x.bairro as string, taxa: Math.round(Number(x.taxa) * 100), ativo: x.ativo as boolean })),
        },
      };
    }),
  );

  return (
    <div className="grade">
      <h1>Delivery e cardápio digital</h1>
      <p className="dica" style={{ margin: 0 }}>
        O cliente abre o link (ou lê o QR), monta o pedido e envia. O pedido cai direto no quadro de Pedidos, com alerta sonoro.
      </p>
      {lista.map((m) => (
        <FormDelivery key={m.id} marcaId={m.id} nome={m.nome} link={m.link} qr={m.qr} abertaAgora={m.abertaAgora} inicial={m.config} />
      ))}
    </div>
  );
}
