'use server';
import { criarClienteServidor } from '@/lib/supabase/server';

type ItemMesa = {
  produtoId: string;
  quantidade: number;
  observacao?: string;
  escolhas: Record<string, Record<string, number>>;
  passos?: { passoId: string; produtoId: string; escolhas: Record<string, Record<string, number>> }[];
};

/** Cliente pede pelo QR da mesa (D-099). Sem login: o código da mesa é a chave. */
export async function pedirNaMesa(token: string, slug: string, itens: ItemMesa[], nome: string, obs: string): Promise<{ ok: true; numero: number } | { ok: false; erro: string }> {
  if (!itens.length) return { ok: false, erro: 'Escolha pelo menos um item.' };
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('salao_pedido_qr', {
    p_token: token,
    p_slug: slug,
    p_itens: itens.slice(0, 50).map((i) => ({
      produto_id: i.produtoId,
      quantidade: i.quantidade,
      observacao: i.observacao?.slice(0, 300) || null,
      escolhas: i.passos ? { passos: i.passos.map((x) => ({ passo_id: x.passoId, produto_id: x.produtoId, escolhas: x.escolhas })) } : i.escolhas,
    })),
    p_nome: nome.trim().slice(0, 60) || null,
    p_obs: obs.trim().slice(0, 300) || null,
  });
  if (error) return { ok: false, erro: error.message };
  return { ok: true, numero: data as number };
}

export async function pedirAConta(token: string): Promise<{ ok: true } | { ok: false; erro: string }> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc('salao_qr_pedir_conta', { p_token: token });
  return error ? { ok: false, erro: error.message } : { ok: true };
}
