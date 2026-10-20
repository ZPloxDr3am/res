import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { criarClienteServidor } from './supabase/server';

export interface ContextoLoja {
  lojaId: string;
  lojaNome: string;
  papel: string;
  marcas: { id: string; nome: string; slug: string }[];
}

/** Loja ativa do usuário (cookie `res_loja`, ou a primeira). Sem loja → onboarding. */
export async function contextoLoja(): Promise<ContextoLoja> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: membros, error } = await supabase
    .from('membros')
    .select('loja_id, papel, lojas(nome)')
    .eq('user_id', user.id)
    .eq('ativo', true);
  if (error) throw new Error(error.message);
  if (!membros || membros.length === 0) redirect('/onboarding');

  const preferida = (await cookies()).get('res_loja')?.value;
  const m = membros.find((x) => x.loja_id === preferida) ?? membros[0]!;
  const loja = m.lojas as unknown as { nome: string } | null;

  const { data: marcas } = await supabase
    .from('marcas')
    .select('id, nome, slug')
    .eq('loja_id', m.loja_id)
    .order('ordem')
    .order('nome');

  return { lojaId: m.loja_id, lojaNome: loja?.nome ?? '', papel: m.papel, marcas: marcas ?? [] };
}

/** Converte reais (texto "49,90" ou "49.90") em número com 2 casas; vazio → null. */
export function lerReais(valor: FormDataEntryValue | null): number | null {
  const t = String(valor ?? '').trim().replace(/\s|R\$/g, '');
  if (!t) return null;
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  if (!Number.isFinite(n) || n < 0) throw new Error('Valor inválido');
  return Math.round(n * 100) / 100;
}
