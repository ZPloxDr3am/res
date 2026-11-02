import type { ContextoLoja } from './loja';
import type { criarClienteServidor } from './supabase/server';

type Supa = Awaited<ReturnType<typeof criarClienteServidor>>;

export interface EscopoFin {
  /** 'loja': financeiro desta loja; 'grupo': um financeiro só para as lojas da conta (D-061). */
  modo: 'loja' | 'grupo';
  contaId: string | null;
  titular: boolean;
  /** Lojas da mesma conta que a pessoa acessa. */
  lojasGrupo: { id: string; nome: string }[];
  /** Dessas, as que a pessoa gere (dono/gerente): para a visão "grupo somado" no modo separado. */
  gestorDoGrupo: string[];
  /** Coluna e valor que donos os registros do financeiro (loja_id = loja, ou grupo_id = conta). */
  dono: { loja_id: string | null; grupo_id: string | null };
}

/** Segue a escolha da Gestão Empresarial (gestao_conta.modo, D-053): cada loja separada ou o grupo todo junto. */
export async function escopoFinanceiro(supabase: Supa, ctx: ContextoLoja): Promise<EscopoFin> {
  const contaId = ctx.lojas.find((l) => l.id === ctx.lojaId)?.contaId ?? null;
  const lojasGrupo = contaId ? ctx.lojas.filter((l) => l.contaId === contaId).map((l) => ({ id: l.id, nome: l.nome })) : [];
  let modo: 'loja' | 'grupo' = 'loja';
  let titular = false;
  let gestorDoGrupo: string[] = [ctx.lojaId];
  if (contaId) {
    const { data: eu } = await supabase.auth.getUser();
    const uid = eu.user?.id ?? '';
    const [{ data: gc }, { data: tit }, { data: ms }] = await Promise.all([
      supabase.from('gestao_conta').select('modo').eq('conta_id', contaId).maybeSingle(),
      supabase.from('contas_titulares').select('conta_id').eq('conta_id', contaId).eq('user_id', uid),
      lojasGrupo.length > 1
        ? supabase.from('membros').select('loja_id, papel').eq('user_id', uid).eq('ativo', true).in('loja_id', lojasGrupo.map((l) => l.id))
        : Promise.resolve({ data: [] as { loja_id: string; papel: string }[] }),
    ]);
    modo = gc?.modo === 'grupo' && lojasGrupo.length > 0 ? 'grupo' : 'loja';
    titular = (tit ?? []).length > 0;
    if (lojasGrupo.length > 1) gestorDoGrupo = (ms ?? []).filter((m) => m.papel === 'dono' || m.papel === 'gerente').map((m) => m.loja_id as string);
  }
  return {
    modo,
    contaId,
    titular,
    lojasGrupo,
    gestorDoGrupo,
    dono: modo === 'grupo' ? { loja_id: null, grupo_id: contaId } : { loja_id: ctx.lojaId, grupo_id: null },
  };
}
