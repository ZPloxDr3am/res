import { headers } from 'next/headers';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { avisosMerchantOD, eCanalOD, type BaseMerchant } from '@res/core';
import type { ConexaoClientePainel, ConexaoODPainel, PainelApi, PainelAplicativos, PainelCanaisCliente, PainelIfood, PainelOD, PedidoTeste, StatusMp } from '@/lib/aplicativos';
import { clienteAdmin } from '@/lib/supabase/admin';
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
  let od: PainelOD | null = null;
  let clientes: PainelCanaisCliente | null = null;
  if (ctx.papel === 'dono' || ctx.papel === 'gerente') {
    const [lojasMk, itens, prods, peds, saida, painelMk] = await Promise.all([
      supabase.from('marketplace_lojas').select('id, marca_id, merchant_id, modo, ativo, ultimo_evento_em').eq('loja_id', ctx.lojaId).eq('canal', 'ifood'),
      supabase.from('marketplace_itens').select('chave, nome, tipo, produto_id, vezes').eq('loja_id', ctx.lojaId).eq('canal', 'ifood').order('vezes', { ascending: false }).limit(200),
      supabase.from('produtos').select('id, nome').eq('loja_id', ctx.lojaId).order('nome').limit(1000),
      supabase.from('pedidos').select('id, numero, externo_codigo, status, tipo, total, criado_em').eq('loja_id', ctx.lojaId).eq('externo_canal', 'ifood').order('criado_em', { ascending: false }).limit(8),
      supabase.from('marketplace_saida').select('id, acao, situacao, erro, criado_em, pedidos(numero)').eq('loja_id', ctx.lojaId).order('criado_em', { ascending: false }).limit(10),
      supabase.rpc('marketplace_painel', { p_loja: ctx.lojaId }),
    ]);
    type ConexaoPainel = { id: string; canal: string; eventos_com_erro: { id: number; codigo: string; externo_id: string | null; recebido_em: string; erro: string }[] };
    const todasConexoes = (painelMk.data as { conexoes?: ConexaoPainel[] } | null)?.conexoes ?? [];
    const conexoes = todasConexoes.filter((c) => c.canal === 'ifood');
    // Open Delivery (D-116): conexões desta loja (RLS de gestor); avisos do Merchant e "segredo salvo" pelo servidor
    const { data: odLojas, error: odErro } = await supabase.from('marketplace_lojas').select('id, canal, marca_id, merchant_id, modo, estado, config, ultimo_evento_em, ultimo_erro').eq('loja_id', ctx.lojaId).in('canal', ['99food', 'keeta', 'aiqfome']).order('conectado_em');
    if (!odErro) {
      const admin = clienteAdmin();
      const lista: ConexaoODPainel[] = [];
      for (const c of odLojas ?? []) {
        if (!eCanalOD(c.canal as string)) continue;
        let avisos: string[] = [];
        let temSegredo = false;
        if (admin) {
          const [base, cx] = await Promise.all([admin.rpc('od_merchant_base', { p_id: c.id }), admin.rpc('od_conexao', { p_id: c.id })]);
          avisos = base.data ? avisosMerchantOD(base.data as BaseMerchant) : ['Não consegui montar o cardápio para o app (falta a migração 20261114220000?).'];
          temSegredo = !!(cx.data as { segredos?: { client_secret?: string } } | null)?.segredos?.client_secret;
        }
        lista.push({ ...(c as unknown as ConexaoODPainel), config: (c.config ?? {}) as ConexaoODPainel['config'], tem_segredo: temSegredo, avisos, eventos_com_erro: todasConexoes.find((x) => x.id === c.id)?.eventos_com_erro ?? [] });
      }
      // pedidos dos apps em modo teste (simulador; D-117)
      const { data: pt } = await supabase.from('pedidos').select('id, numero, externo_canal, status, marca_id').eq('loja_id', ctx.lojaId).in('externo_canal', ['99food', 'keeta', 'aiqfome', 'deliverymuch', 'rappi']).order('criado_em', { ascending: false }).limit(12);
      const pedidosTeste = (pt ?? []) as PedidoTeste[];
      const marcas = ctx.marcas.filter((m) => !m.evento).map((m) => ({ id: m.id, nome: m.nome }));
      od = { marcas, conexoes: lista, pedidosTeste };
      const { data: cl } = await supabase.from('marketplace_lojas').select('id, canal, marca_id, merchant_id, modo, estado, ultimo_evento_em, ultimo_sinal, ultimo_erro').eq('loja_id', ctx.lojaId).in('canal', ['deliverymuch', 'rappi']).order('conectado_em');
      const conexoesCliente: ConexaoClientePainel[] = [];
      for (const c of cl ?? []) {
        let temLogin = false;
        if (admin && c.canal === 'deliverymuch') {
          const { data: seg } = await admin.rpc('marketplace_segredos_ler', { p_marketplace_loja: c.id });
          temLogin = !!(seg as { usuario?: string; senha?: string } | null)?.senha;
        }
        conexoesCliente.push({ ...(c as unknown as ConexaoClientePainel), tem_login: temLogin, eventos_com_erro: todasConexoes.find((x) => x.id === c.id)?.eventos_com_erro ?? [] });
      }
      clientes = {
        configurado: { deliverymuch: !!(process.env.DELIVERYMUCH_CLIENT_ID && process.env.DELIVERYMUCH_CLIENT_SECRET), rappi: !!(process.env.RAPPI_CLIENT_ID && process.env.RAPPI_CLIENT_SECRET) },
        marcas,
        conexoes: conexoesCliente,
        pedidosTeste,
      };
    }
    if (!lojasMk.error) {
      ifood = {
        configurado: !!process.env.IFOOD_CLIENT_ID && !!process.env.IFOOD_CLIENT_SECRET,
        marcas: ctx.marcas.filter((m) => !m.evento).map((m) => ({ id: m.id, nome: m.nome })),
        lojas: (lojasMk.data ?? []) as PainelIfood['lojas'],
        itens: (itens.data ?? []) as PainelIfood['itens'],
        produtos: (prods.data ?? []) as PainelIfood['produtos'],
        pedidos: (peds.data ?? []).map((p) => ({ ...p, total: Number(p.total) })) as PainelIfood['pedidos'],
        eventosErro: conexoes.flatMap((c) => c.eventos_com_erro).sort((a, b) => b.recebido_em.localeCompare(a.recebido_em)).slice(0, 20),
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
      {error || !data ? <p className="cartao dica">{error?.message ?? 'Sem acesso.'}</p> : <Aplicativos dados={data as PainelAplicativos} origem={origem} api={(api.data as PainelApi | null) ?? null} mp={(mp.data as StatusMp | null) ?? null} ifood={ifood} od={od} clientes={clientes} modulos={modulos} />}
    </div>
  );
}
