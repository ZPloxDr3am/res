// Cadastro de clientes (D-025): tipos do JSON de public.buscar_clientes (valores em centavos).
export type EnderecoCliente = { id: string; logradouro: string; numero: string | null; complemento: string | null; bairro: string; referencia: string | null };
export type ClienteBusca = {
  id: string;
  nome: string;
  telefone: string;
  observacoes: string | null;
  ultimo_pedido_em: string | null;
  criado_em: string;
  enderecos: EnderecoCliente[];
  pedidos: number;
  total_gasto: number;
  ultimo_item: string | null;
};

/** "47991234567" → "(47) 99123-4567" */
export function formatarTelefone(t: string): string {
  const d = t.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t;
}

export const enderecoTexto = (e: EnderecoCliente) => `${e.logradouro}${e.numero ? `, ${e.numero}` : ''}${e.complemento ? ` - ${e.complemento}` : ''} · ${e.bairro}`;
