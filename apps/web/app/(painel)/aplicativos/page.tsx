import { headers } from 'next/headers';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import type { PainelApi, PainelAplicativos, PainelIfood, StatusMp } from '@/lib/aplicativos';
import { Aplicativos } from '@/components/aplicativos/aplicativos';

export const dynamic = 'force-dynamic';

export default async function PaginaAplicativos() {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const [{ data, error }, api, mp] = await Promise.all([
    supabase.rpc('aplicativos_painel', { p_loja: ctx.lojaId }),
    supabase.rpc('api_painel', { p_loja: ctx.lojaId }),
    supabase.rpc('mp_status', { p_loja: ctx.lojaId }),
  ]);
  const { data: mods } = await supabase.rpc('meus_modulos', { p_loja: ctx.lojaId });
  const modulos = (mods as { modulos?: string[] } | null)?.modulos ?? null;
  // iFood (D-074): só para dono/gerente; sem a migração, fica nulo
  let ifood: PainelIfood | null = null;
  if (ctx.papel === 'dono' || ctx.papel === 'gerente') {
    const [lojasMk, itens, prods, peds, saida] = await Promise.all([
      supabase.from('marketplace_lojas').select('id, marca_id, merchant_id, modo, ativo, ultimo_evento_em').eq('loja_id', ctx.lojaId).eq('canal', 'ifood'),
      supabase.from('marketplace_itens').select('chave, nome, tipo, produto_id, vezes').eq('loja_id', ctx.lojaId).eq('canal', 'ifood').order('vezes', { ascending: false }).limit(200),
      supabase.from('produtos').select('id, nome').eq('loja_id', ctx.lojaId).order('nome').limit(1000),
      supabase.from('pedidos').select('id, numero, externo_codigo, status, tipo, total, criado_em').eq('loja_id', ctx.lojaId).eq('externo_canal', 'ifood').order('criado_em', { ascending: false }).limit(8),
      supabase.from('marketplace_saida').select('id, acao, situacao, erro, criado_em, pedidos(numero)').eq('loja_id', ctx.lojaId).order('criado_em', { ascending: false }).limit(10),
    ]);
    if (!lojasMk.error) {
      ifood = {
        configurado: !!process.env.IFOOD_CLIENT_ID && !!process.env.IFOOD_CLIENT_SECRET,
        marcas: ctx.marcas.filter((m) => !m.evento).map((m) => ({ id: m.id, nome: m.nome })),
        lojas: (lojasMk.data ?? []) as PainelIfood['lojas'],
        itens: (itens.data ?? []) as PainelIfood['itens'],
        produtos: (prods.data ?? []) as PainelIfood['produtos'],
        pedidos: (peds.data ?? []).map((p) => ({ ...p, total: Number(p.total) })) as PainelIfood['pedidos'],
        saida: (saida.data ?? []).map((s) => ({ id: s.id as number, acao: s.acao as string, situacao: s.situacao as string, erro: (s.erro as string | null) ?? null, criado_em: s.criado_em as string, pedido_numero: ((s.pedidos as unknown as { numero: number } | null)?.numero) ?? null })),
      };
    }
  }
  const h = await headers();
  const origem = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('host') ?? 'res-iqzs.vercel.app'}`;
  return (
    <div className="grade">
      <div>
        <h1 style={{ marginBottom: 0 }}>Aplicativos</h1>
        <p className="dica" style={{ margin: 0 }}>Integrações de {ctx.lojaNome}: ligue o que fizer sentido para a sua operação.</p>
      </div>
      {error || !data ? <p className="cartao dica">{error?.message ?? 'Sem acesso.'}</p> : <Aplicativos dados={data as PainelAplicativos} origem={origem} api={(api.data as PainelApi | null) ?? null} mp={(mp.data as StatusMp | null) ?? null} ifood={ifood} modulos={modulos} />}
    </div>
  );
}
