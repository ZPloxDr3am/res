import type { FormaPagamento, StatusPedido, TipoPedido } from '@res/core';
import { criarClienteServidor } from './supabase/server';

export type PedidoRow = {
  id: string;
  loja_id: string;
  numero: number;
  status: StatusPedido;
  tipo: TipoPedido;
  origem: string;
  marca_id: string;
  cliente_nome: string;
  cliente_telefone: string | null;
  endereco: { logradouro: string; numero?: string; complemento?: string; bairro: string; referencia?: string } | null;
  subtotal: number;
  taxa_entrega: number;
  desconto: number;
  total: number;
  pagamento: FormaPagamento;
  troco_para: number | null;
  observacao: string | null;
  motivo_cancelamento: string | null;
  criado_em: string;
  agendado_para: string | null;
  aceito_em: string | null;
  pronto_em: string | null;
  saiu_em: string | null;
  concluido_em: string | null;
  cancelado_em: string | null;
  pedido_itens: {
    id: string;
    nome: string;
    quantidade: number;
    total: number;
    observacao: string | null;
    ordem: number;
    pedido_item_opcoes: { grupo_nome: string; nome: string; quantidade: number; fracao: number | null }[];
  }[];
};

/** Pedidos em aberto (inclusive agendados para outro dia) e os encerrados nas últimas 12 horas, do mais antigo para o mais novo. Uma ou várias lojas. */
export async function carregarQuadro(lojaIds: string[], lojaPrincipal: string) {
  const supabase = await criarClienteServidor();
  const desde = new Date(Date.now() - 12 * 3600 * 1000).toISOString();
  const [pedidos, loja, fila] = await Promise.all([
    supabase
      .from('pedidos')
      .select(
        'id, loja_id, numero, status, tipo, origem, marca_id, cliente_nome, cliente_telefone, endereco, subtotal, taxa_entrega, desconto, total, pagamento, troco_para, observacao, motivo_cancelamento, criado_em, agendado_para, aceito_em, pronto_em, saiu_em, concluido_em, cancelado_em, pedido_itens(id, nome, quantidade, total, observacao, ordem, pedido_item_opcoes(grupo_nome, nome, quantidade, fracao))',
      )
      .in('loja_id', lojaIds)
      .or(`status.not.in.(concluido,cancelado),criado_em.gte.${desde}`)
      .order('criado_em', { ascending: true })
      .limit(500),
    supabase.from('lojas').select('aceite_automatico, tempo_preparo_min, fuso_horario').eq('id', lojaPrincipal).single(),
    supabase
      .from('impressoes')
      .select('id', { count: 'exact', head: true })
      .eq('loja_id', lojaPrincipal)
      .in('status', ['pendente', 'erro'])
      .gte('criado_em', new Date(Date.now() - 24 * 3600 * 1000).toISOString()),
  ]);
  if (pedidos.error) throw new Error(pedidos.error.message);
  const lista = (pedidos.data ?? []) as unknown as PedidoRow[];
  for (const p of lista) p.pedido_itens.sort((a, b) => a.ordem - b.ordem);
  return {
    pedidos: lista,
    aceiteAutomatico: loja.data?.aceite_automatico ?? false,
    tempoPreparo: loja.data?.tempo_preparo_min ?? 30,
    fuso: (loja.data?.fuso_horario as string | undefined) ?? 'America/Sao_Paulo',
    filaImpressao: fila.count ?? 0,
  };
}
