// Resumo no topo do quadro (D-087): pedidos ativos, tempo médio de preparo e de entrega e
// pedidos passando do prazo, por loja e no total. Usa os pedidos que o quadro já carregou (últimas 12 h).

export interface PedidoResumo {
  loja_id: string;
  status: 'novo' | 'em_preparo' | 'pronto' | 'em_entrega' | 'concluido' | 'cancelado';
  tipo: 'entrega' | 'retirada' | 'balcao';
  criado_em: string;
  agendado_para: string | null;
  aceito_em: string | null;
  pronto_em: string | null;
  saiu_em: string | null;
  concluido_em: string | null;
}
export interface ResumoLoja {
  ativos: number;
  novos: number;
  /** minutos, média de aceito → pronto (null sem dado) */
  preparoMin: number | null;
  /** minutos, média de saiu → entregue (só entrega) */
  entregaMin: number | null;
  /** em aberto há mais que o prazo (preparo + entrega quando é entrega) */
  atrasados: number;
}

const min = (a: string | null, b: string | null) => (a && b ? (Date.parse(b) - Date.parse(a)) / 60000 : null);
const media = (xs: (number | null)[]) => {
  // descarta lixo (negativo ou mais de 4 h: pedido esquecido aberto)
  const v = xs.filter((x): x is number => x != null && x >= 0 && x <= 240);
  return v.length ? Math.round(v.reduce((t, x) => t + x, 0) / v.length) : null;
};
const ATIVOS = new Set(['novo', 'em_preparo', 'pronto', 'em_entrega']);

export function resumoQuadro(pedidos: PedidoResumo[], opts: { agora?: number; prazoMin: (lojaId: string, tipo: PedidoResumo['tipo']) => number }): { total: ResumoLoja; porLoja: Record<string, ResumoLoja> } {
  const agora = opts.agora ?? Date.now();
  const calc = (lista: PedidoResumo[]): ResumoLoja => {
    // agendado para mais tarde ainda não conta como ativo
    const ativos = lista.filter((p) => ATIVOS.has(p.status) && !(p.agendado_para && Date.parse(p.agendado_para) > agora + 60 * 60000));
    return {
      ativos: ativos.length,
      novos: ativos.filter((p) => p.status === 'novo').length,
      preparoMin: media(lista.map((p) => min(p.aceito_em, p.pronto_em))),
      entregaMin: media(lista.filter((p) => p.tipo === 'entrega').map((p) => min(p.saiu_em, p.concluido_em))),
      atrasados: ativos.filter((p) => {
        const base = p.agendado_para ? Date.parse(p.agendado_para) : Date.parse(p.criado_em) + opts.prazoMin(p.loja_id, p.tipo) * 60000;
        return agora > base;
      }).length,
    };
  };
  const porLoja: Record<string, ResumoLoja> = {};
  for (const id of new Set(pedidos.map((p) => p.loja_id))) porLoja[id] = calc(pedidos.filter((p) => p.loja_id === id));
  return { total: calc(pedidos), porLoja };
}
