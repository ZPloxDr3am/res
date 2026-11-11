import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { criarClienteServidor } from './supabase/server';

export interface ContextoLoja {
  lojaId: string;
  lojaNome: string;
  papel: string;
  marcas: { id: string; nome: string; slug: string; evento?: boolean }[];
  /** Todas as lojas que a pessoa acessa (para o seletor e as visões "todas as lojas"). */
  lojas: { id: string; nome: string; contaId: string | null }[];
}

/** Loja ativa do usuário (cookie `res_loja`, ou a primeira). Sem loja → aceita convites → onboarding. */
export async function contextoLoja(): Promise<ContextoLoja> {
  const supabase = await criarClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const buscar = () =>
    supabase.from('membros').select('loja_id, papel, lojas(nome, conta_id)').eq('user_id', user.id).eq('ativo', true);
  let { data: membros, error } = await buscar();
  if (error) throw new Error(error.message);
  if (!membros || membros.length === 0) {
    // convidado pela equipe de uma loja? vira membro agora
    const { data: aceitos } = await supabase.rpc('aceitar_convites');
    if (aceitos) ({ data: membros } = await buscar());
    if (!membros || membros.length === 0) redirect('/onboarding');
  }

  const lojas = membros
    .map((m) => {
      const l = m.lojas as unknown as { nome: string; conta_id: string | null } | null;
      return { id: m.loja_id as string, nome: l?.nome ?? '', contaId: l?.conta_id ?? null };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  const preferida = (await cookies()).get('res_loja')?.value;
  const m = membros.find((x) => x.loja_id === preferida) ?? membros.find((x) => x.loja_id === lojas[0]!.id)!;

  const { data: marcas } = await supabase
    .from('marcas')
    .select('id, nome, slug, evento')
    .eq('loja_id', m.loja_id)
    .order('ordem')
    .order('nome');

  return {
    lojaId: m.loja_id,
    lojaNome: lojas.find((l) => l.id === m.loja_id)?.nome ?? '',
    papel: m.papel,
    marcas: marcas ?? [],
    lojas,
  };
}

/** Converte reais (texto "49,90" ou "49.90") em número com 2 casas; vazio → null. */
export function lerReais(valor: FormDataEntryValue | null): number | null {
  const t = String(valor ?? '').trim().replace(/\s|R\$/g, '');
  if (!t) return null;
  const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t);
  if (!Number.isFinite(n) || n < 0) throw new Error('Valor inválido');
  return Math.round(n * 100) / 100;
}
