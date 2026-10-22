import { headers } from 'next/headers';
import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { GestaoLojas, type LojaInfo } from '@/components/gestao-lojas';

export const dynamic = 'force-dynamic';

export default async function Lojas() {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const ids = ctx.lojas.map((l) => l.id);
  const [contas, marcas, membros, convites, titular] = await Promise.all([
    supabase.from('contas').select('id, nome, plano, limite_lojas, limite_cardapios'),
    supabase.from('marcas').select('id, loja_id, nome, slug').in('loja_id', ids).order('ordem'),
    supabase.from('membros').select('id, loja_id, user_id, nome, papel, ativo').in('loja_id', ids).order('nome'),
    supabase.from('convites').select('id, loja_id, email, nome, papel, criado_em').in('loja_id', ids).is('aceito_em', null).order('criado_em'),
    supabase.auth.getUser(),
  ]);
  const { data: logins } = await supabase.from('usuarios_login').select('user_id, usuario').in('user_id', (membros.data ?? []).map((m) => m.user_id));
  const usuarioDe = new Map((logins ?? []).map((u) => [u.user_id as string, u.usuario as string]));
  const h = await headers();
  const origem = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
  const { data: cidades } = await supabase.from('lojas').select('id, cidade').in('id', ids);
  const { data: titularDe } = await supabase.from('contas_titulares').select('conta_id').eq('user_id', titular.data.user?.id ?? '');

  const lojas: LojaInfo[] = ctx.lojas.map((l) => ({
    id: l.id,
    nome: l.nome,
    contaId: l.contaId,
    atual: l.id === ctx.lojaId,
    cidade: (cidades ?? []).find((c) => c.id === l.id)?.cidade ?? null,
    marcas: (marcas.data ?? []).filter((m) => m.loja_id === l.id).map((m) => ({ id: m.id, nome: m.nome, link: `${origem}/c/${m.slug}` })),
    equipe: (membros.data ?? []).filter((m) => m.loja_id === l.id).map((m) => ({ id: m.id, userId: m.user_id, usuario: usuarioDe.get(m.user_id) ?? null, nome: m.nome, papel: m.papel, ativo: m.ativo, eu: m.user_id === titular.data.user?.id })),
    convites: (convites.data ?? []).filter((c) => c.loja_id === l.id).map((c) => ({ id: c.id, email: c.email, nome: c.nome, papel: c.papel })),
  }));

  const listaContas = (contas.data ?? []).map((c) => ({
    id: c.id as string,
    nome: c.nome as string,
    plano: c.plano as string,
    limiteLojas: c.limite_lojas as number,
    limiteCardapios: c.limite_cardapios as number | null,
    titular: (titularDe ?? []).some((t) => t.conta_id === c.id),
  }));

  return <GestaoLojas contas={listaContas} lojas={lojas} />;
}
