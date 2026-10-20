// Recursos de acesso. Mesma lista da tabela public.recursos_acesso (migração 0001).

export const RECURSOS = [
  'cardapio', 'cardapio_visibilidade', 'formas_recebimento', 'mesas_comandas',
  'clientes', 'fiado', 'avaliacoes',
  'cardapio_digital', 'ia',
  'equipe', 'dados_empresa', 'caixas_cadastro', 'historico_alteracoes', 'impressoras', 'plano',
  'fiscal',
  'estoque', 'financeiro', 'whatsapp', 'pagamentos_online', 'integracoes', 'fidelidade',
  'marketing', 'relatorios',
  'pdv', 'historico_vendas', 'mesas', 'caixa', 'pedidos_delivery', 'kds',
] as const;

export type Recurso = (typeof RECURSOS)[number];
export type Papel = 'dono' | 'gerente' | 'funcionario' | 'garcom' | 'entregador';

/** Igual a private.tem_permissao: dono e gerente podem tudo; os demais, o que o grupo liberar. */
export function temPermissao(papel: Papel, permissoesDoGrupo: readonly string[], recurso: Recurso): boolean {
  return papel === 'dono' || papel === 'gerente' || permissoesDoGrupo.includes(recurso);
}
