import { contextoLoja } from '@/lib/loja';
import { criarClienteServidor } from '@/lib/supabase/server';
import { TempoReal } from '@/components/tempo-real';
import { PainelCaixa, type CadastroCaixa, type Historico, type Membro } from '@/components/caixa/painel-caixa';
import type { MeusCaixas, ResumoCaixa } from '@/lib/caixa';

export const dynamic = 'force-dynamic';

export default async function Caixa() {
  const ctx = await contextoLoja();
  const supabase = await criarClienteServidor();
  const { data, error } = await supabase.rpc('meus_caixas', { p_loja: ctx.lojaId });
  if (error) throw new Error(error.message);
  const meus = data as MeusCaixas | null;
  if (!meus) {
    return (
      <div className="grade">
        <h1>Caixa</h1>
        <p className="cartao dica">Seu acesso não inclui o caixa desta loja. Peça ao dono ou gerente.</p>
      </div>
    );
  }

  const abertas = meus.caixas.filter((c) => c.sessao && (c.pode_operar || meus.ve_valores)).map((c) => c.sessao!.id);
  const [resumosLista, sessoes, cadastro] = await Promise.all([
    Promise.all(abertas.map(async (id) => (await supabase.rpc('resumo_caixa', { p_sessao: id })).data as ResumoCaixa | null)),
    supabase
      .from('caixa_sessoes')
      .select('id, numero, caixa_id, aberto_em, fechado_em, fechado_por, esperado, informado, observacao, caixas(nome)')
      .eq('loja_id', ctx.lojaId)
      .eq('status', 'fechado')
      .order('fechado_em', { ascending: false })
      .limit(30),
    meus.cadastra
      ? Promise.all([
          supabase.from('caixas').select('id, nome, ativo, ordem, caixa_operadores(user_id)').eq('loja_id', ctx.lojaId).order('ordem').order('nome'),
          supabase.from('membros').select('user_id, nome, papel').eq('loja_id', ctx.lojaId).eq('ativo', true).order('nome'),
        ])
      : null,
  ]);
  const resumos: Record<string, ResumoCaixa> = {};
  for (const r of resumosLista) if (r) resumos[r.id] = r;

  // nomes de quem fechou
  const ids = [...new Set((sessoes.data ?? []).map((s) => s.fechado_por as string).filter(Boolean))];
  const { data: nomes } = ids.length
    ? await supabase.from('membros').select('user_id, nome').eq('loja_id', ctx.lojaId).in('user_id', ids)
    : { data: [] as { user_id: string; nome: string }[] };
  const nomeDe = new Map((nomes ?? []).map((n) => [n.user_id as string, n.nome as string]));

  const historico: Historico[] = (sessoes.data ?? []).map((s) => {
    const esp = (s.esperado ?? {}) as Record<string, number>;
    const inf = (s.informado ?? {}) as Record<string, number>;
    const formas = new Set([...Object.keys(esp), ...Object.keys(inf)]);
    const diferenca = [...formas].reduce((t, f) => t + Number(inf[f] ?? 0) - Number(esp[f] ?? 0), 0);
    return {
      id: s.id as string,
      numero: s.numero as number,
      caixa: (s.caixas as unknown as { nome: string } | null)?.nome ?? '—',
      aberto_em: s.aberto_em as string,
      fechado_em: s.fechado_em as string,
      operador: nomeDe.get(s.fechado_por as string) ?? null,
      diferenca: Math.round(diferenca * 100) / 100,
      temObs: !!s.observacao,
    };
  });

  let caixasCadastro: CadastroCaixa[] | null = null;
  let membros: Membro[] = [];
  if (cadastro) {
    const [cx, mb] = cadastro;
    caixasCadastro = (cx.data ?? []).map((c) => ({
      id: c.id as string,
      nome: c.nome as string,
      ativo: c.ativo as boolean,
      operadores: ((c.caixa_operadores as { user_id: string }[] | null) ?? []).map((o) => o.user_id),
    }));
    const { data: logins } = await supabase.from('usuarios_login').select('user_id, usuario').in('user_id', (mb.data ?? []).map((m) => m.user_id));
    const usuarioDe = new Map((logins ?? []).map((u) => [u.user_id as string, u.usuario as string]));
    membros = (mb.data ?? []).map((m) => ({ userId: m.user_id as string, nome: m.nome as string, papel: m.papel as string, usuario: usuarioDe.get(m.user_id as string) ?? null }));
  }

  return (
    <>
      <TempoReal lojaId={ctx.lojaId} tabelas={['pedidos']} reservaMs={30000} />
      <PainelCaixa meus={meus} resumos={resumos} historico={historico} cadastro={caixasCadastro} membros={membros} />
    </>
  );
}
